import {
  Component,
  input,
  signal,
  computed,
  effect,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { BlueprintNode, BlueprintEdge, BlueprintLayout } from '../../models/blueprint.model';

interface PositionedNode extends BlueprintNode {
  x: number;
  y: number;
}

interface Connector {
  from: PositionedNode;
  to: PositionedNode;
  points: { x: number; y: number }[];
  type: 'orthogonal';
}

@Component({
  selector: 'app-blueprint-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './blueprint-viewer.component.html',
  styleUrl: './blueprint-viewer.component.css',
})
export class BlueprintViewerComponent {
  private platformId = inject(PLATFORM_ID);

  /** Project definition feeding the blueprint. Pure configuration, no project-specific logic. */
  readonly nodes = input<BlueprintNode[]>([]);
  readonly edges = input<BlueprintEdge[]>([]);

  /** Optional layout hints. `auto` infers the best orientation from the graph. */
  readonly layout = input<BlueprintLayout | undefined>(undefined);

  /** HUD metadata (purely presentational). */
  readonly version = input<string>('v2.1');
  readonly platform = input<string>('Desktop');

  /** Interaction state */
  readonly zoom = signal(1);
  readonly offsetX = signal(0);
  readonly offsetY = signal(0);
  readonly highlightedNodeId = signal<string | null>(null);

  private isBrowser = isPlatformBrowser(this.platformId);
  viewBoxWidth = signal(0);
  viewBoxHeight = signal(0);

  /** Computed positionned nodes + connectors derived from inputs */
  readonly positionedNodes = computed(() => this.computePositions());
  readonly connectors = computed(() => this.computeConnectors(this.positionedNodes()));
  readonly zoomPercent = computed(() => Math.round(this.zoom() * 100));
  readonly interactiveEnabled = computed(() => this.isBrowser);

  constructor() {
    effect(() => {
      const nodes = this.nodes();
      const positioned = this.positionedNodes();
      let w = 0;
      let h = 0;
      for (const n of positioned) {
        w = Math.max(w, (n.x ?? 0) + 260);
        h = Math.max(h, (n.y ?? 0) + 120);
      }
      this.viewBoxWidth.set(Math.max(w, 800));
      this.viewBoxHeight.set(Math.max(h, 600));
      // Reset zoom/offset whenever the dataset changes
      this.zoom.set(1);
      this.offsetX.set(0);
      this.offsetY.set(0);
      this.highlightedNodeId.set(null);
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // Layout engine
  // ═══════════════════════════════════════════════════════════════

  private computePositions(): PositionedNode[] {
    const inputNodes = this.nodes() ?? [];
    const inputEdges = this.edges() ?? [];
    const layout = this.layout() ?? { orientation: 'auto' };

    if (inputNodes.length === 0) return [];

    const nodeMap = new Map<string, BlueprintNode>();
    for (const n of inputNodes) nodeMap.set(n.id, n);

    // degree maps
    const inDegree = new Map<string, number>();
    const outDegree = new Map<string, number>();
    for (const n of inputNodes) { inDegree.set(n.id, 0); outDegree.set(n.id, 0); }
    for (const e of inputEdges) {
      if (!nodeMap.has(e.from) || !nodeMap.has(e.to)) continue;
      inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1);
      outDegree.set(e.from, (outDegree.get(e.from) ?? 0) + 1);
    }

    // Longest-path layering (depth = longest path from a root)
    const depth = new Map<string, number>();
    const visit = (id: string): number => {
      if (depth.has(id)) return depth.get(id)!;
      const incoming = inputEdges.filter(e => e.to === id && nodeMap.has(e.from));
      if (incoming.length === 0) {
        depth.set(id, 0);
        return 0;
      }
      let max = 0;
      for (const e of incoming) {
        max = Math.max(max, visit(e.from) + 1);
      }
      depth.set(id, max);
      return max;
    };
    for (const n of inputNodes) visit(n.id);

    // Group into ranks
    const rankMap = new Map<number, string[]>();
    for (const n of inputNodes) {
      const r = depth.get(n.id) ?? 0;
      if (!rankMap.has(r)) rankMap.set(r, []);
      rankMap.get(r)!.push(n.id);
    }
    const ranks = Array.from({ length: rankMap.size }, () => [] as string[]);
    for (const [r, ids] of rankMap.entries()) {
      // stable order within rank: preserve input order
      ranks[r] = ids.sort((a, b) => inputNodes.indexOf(nodeMap.get(a)!) - inputNodes.indexOf(nodeMap.get(b)!));
    }

    // Decide orientation
    const hasBranch = Array.from(outDegree.values()).some(d => d > 1);
    const orientation = layout.orientation === 'auto'
      ? (hasBranch ? 'horizontal' : 'pipeline')
      : layout.orientation;

    const nodeW = 250;
    const nodeH = 96;
    const gapX = 260;
    const gapY = 150;

    const positioned: PositionedNode[] = [];
    if (orientation === 'horizontal' || orientation === 'tree' || orientation === 'pipeline') {
      // layers = columns (left to right)
      const cols = ranks.length;
      const maxHeight = cols - 1;
      for (let c = 0; c < ranks.length; c++) {
        const col = ranks[c];
        const totalH = Math.max(col.length - 1, 0) * gapY;
        col.forEach((id, i) => {
          const n = nodeMap.get(id)!;
          const x = c * gapX;
          const y = (maxHeight * gapY) / 2 - totalH / 2 + i * gapY;
          positioned.push({ ...n, x, y });
        });
      }
    } else {
      // vertical: layers = rows (top to bottom)
      const rows = ranks.length;
      for (let r = 0; r < ranks.length; r++) {
        const row = ranks[r];
        const totalW = Math.max(row.length - 1, 0) * gapX;
        const centerX = (this.maxHeight(ranks) * gapX) / 2;
        row.forEach((id, i) => {
          const n = nodeMap.get(id)!;
          const x = centerX - totalW / 2 + i * gapX;
          const y = r * gapY;
          positioned.push({ ...n, x, y });
        });
      }
    }

    return positioned;
  }

  private maxHeight(ranks: string[][]): number {
    return Math.max(...ranks.map(r => Math.max(r.length - 1, 0)));
  }

  /** Build orthogonal (90°) connector polylines between positioned nodes */
  private computeConnectors(nodes: PositionedNode[]): Connector[] {
    const inputEdges = this.edges() ?? [];
    const byId = new Map(nodes.map(n => [n.id, n] as const));
    const nodeW = 250;
    const nodeH = 96;
    const orientation = this.resolvedOrientation();

    const result: Connector[] = [];
    for (const e of inputEdges) {
      const from = byId.get(e.from);
      const to = byId.get(e.to);
      if (!from || !to) continue;

      const conn = this.buildOrthogonalPath(from, to, nodeW, nodeH, orientation);
      result.push({ from, to, points: conn.points, type: 'orthogonal' });
    }
    return result;
  }

  private resolvedOrientation(): 'horizontal' | 'vertical' {
    const o = this.layout()?.orientation ?? 'auto';
    if (o === 'auto') {
      // infer from node arrangement: if any edge goes left->right, treat as horizontal
      return 'horizontal';
    }
    // map layout hints to a rendering orientation
    if (o === 'tree' || o === 'horizontal' || o === 'pipeline') return 'horizontal';
    if (o === 'vertical') return 'vertical';
    return 'horizontal';
  }

  /** Compute an orthogonal (90°-elbow) polyline between two axis-aligned nodes. */
  private buildOrthogonalPath(
    from: PositionedNode,
    to: PositionedNode,
    nodeW: number,
    nodeH: number,
    orientation: 'horizontal' | 'vertical',
  ): { points: { x: number; y: number }[] } {
    const fx = from.x + nodeW / 2;
    const fy = from.y + nodeH / 2;
    const tx = to.x + nodeW / 2;
    const ty = to.y + nodeH / 2;

    // Same column (vertical stacking) -> straight vertical line
    if (Math.abs(fx - tx) < nodeW / 2) {
      return { points: [{ x: fx, y: from.y + nodeH }, { x: tx, y: to.y }] };
    }

    // Horizontal flow -> right edge of source to left edge of target with a 90° elbow
    const sx = from.x + nodeW; // right edge
    const ex = to.x;           // left edge
    const midY = (fy + ty) / 2;
    return {
      points: [
        { x: sx, y: fy },
        { x: ex, y: fy },
        { x: ex, y: ty },
      ],
    };
  }

  connectorPath(conn: Connector): string {
    const pts = conn.points;
    if (pts.length === 0) return '';
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) d += ` L ${pts[i].x} ${pts[i].y}`;
    return d;
  }

  // ═══════════════════════════════════════════════════════════════
  // Interaction
  // ═══════════════════════════════════════════════════════════════

  onNodeClick(node: BlueprintNode) {
    this.highlightedNodeId.update(id => (id === node.id ? null : node.id));
  }

  onNodeHover(node: BlueprintNode, entering: boolean) {
    if (entering) {
      this.highlightedNodeId.set(node.id);
    } else {
      this.highlightedNodeId.update(id => (id === node.id ? null : id));
    }
  }

  isNodeHighlighted(node: BlueprintNode): boolean {
    const h = this.highlightedNodeId();
    // nothing highlighted -> show all fully
    if (!h) return true;
    return this.isConnectedTo(node.id, h);
  }

  /** Whether target is connected to root (ancestor/descendant) via BFS over the graph */
  private isConnectedTo(target: string, root: string): boolean {
    if (target === root) return true;
    const inputEdges = this.edges() ?? [];
    const visited = new Set<string>();
    const queue = [root];
    while (queue.length) {
      const cur = queue.shift()!;
      if (visited.has(cur)) continue;
      visited.add(cur);
      for (const e of inputEdges) {
        if (e.from === cur && e.to === target) return true;
        if (e.to === cur && e.from === target) return true;
        if (e.from === cur) queue.push(e.to);
        if (e.to === cur) queue.push(e.from);
      }
    }
    return false;
  }

  isConnectorHighlighted(conn: Connector): boolean {
    const h = this.highlightedNodeId();
    if (!h) return true;
    return this.isConnectedTo(conn.from.id, h) && this.isConnectedTo(conn.to.id, h);
  }

  onWheel(event: WheelEvent, viewportEl: HTMLElement) {
    if (!this.isBrowser) return;
    event.preventDefault();
    const delta = -event.deltaY;
    const factor = 0.0008;
    const next = Math.min(Math.max(this.zoom() + delta * factor, 0.4), 3);
    if (next === this.zoom()) return;

    // Zoom toward the cursor (keeps the point under the mouse fixed in place).
    if (viewportEl) {
      const rect = viewportEl.getBoundingClientRect();
      const cx = event.clientX - rect.left;
      const cy = event.clientY - rect.top;
      const z = this.zoom();
      const scale = next / z;
      // transform model: translate(tx,ty) scale(z)  ->  px -> tx + z*px
      // keep screen[cursor] fixed: tx' = cx - scale*(cx - tx)
      this.offsetX.set(cx - scale * (cx - this.offsetX()));
      this.offsetY.set(cy - scale * (cy - this.offsetY()));
    }
    this.zoom.set(next);
  }

  panBy(deltaX: number, deltaY: number) {
    this.offsetX.update(v => v + deltaX);
    this.offsetY.update(v => v + deltaY);
  }

  resetZoom() {
    this.zoom.set(1);
    this.offsetX.set(0);
    this.offsetY.set(0);
    this.highlightedNodeId.set(null);
  }

  fitScreen() {
    this.resetZoom();
  }

  trackById(index: number, n: PositionedNode): string {
    return n.id;
  }

  /** Normalize an icon class into a renderable icon. Supports both PrimeIcons (pi pi-*) and devicon classes. */
  nodeIconClass(icon: string): string {
    if (!icon) return 'pi pi-circle';
    // devicon classes come without a prefix marker; primeicons always start with 'pi'
    return icon;
  }

  panStartX = signal(0);
  panStartY = signal(0);
  startOffsetX = signal(0);
  startOffsetY = signal(0);
  isPanning = signal(false);

  onPanStart(event: MouseEvent) {
    if (!this.isBrowser) return;
    if (event.button !== 0) return; // left click only
    this.panStartX.set(event.clientX);
    this.panStartY.set(event.clientY);
    this.startOffsetX.set(this.offsetX());
    this.startOffsetY.set(this.offsetY());
    this.isPanning.set(true);
    event.preventDefault();
  }

  onPanMove(event: MouseEvent) {
    if (!this.isPanning()) return;
    const dx = event.clientX - this.panStartX();
    const dy = event.clientY - this.panStartY();
    this.panBy(dx, dy);
  }

  onPanEnd() {
    this.isPanning.set(false);
  }
}
