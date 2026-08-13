import {
  Component,
  input,
  signal,
  computed,
  effect,
  inject,
  PLATFORM_ID,
  viewChildren,
  ElementRef,
  afterNextRender,
  OnDestroy,
  viewChild
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { BlueprintNode, BlueprintEdge, BlueprintLayout } from '../../models/blueprint.model';

interface ZoneGroup {
  name: string;
  nodes: BlueprintNode[];
}

interface SVGConnector {
  fromId: string;
  toId: string;
  path: string;
}

@Component({
  selector: 'app-blueprint-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './blueprint-viewer.component.html',
  styleUrl: './blueprint-viewer.component.css',
})
export class BlueprintViewerComponent implements OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
  private resizeObserver: ResizeObserver | null = null;

  readonly nodes = input<BlueprintNode[]>([]);
  readonly edges = input<BlueprintEdge[]>([]);
  readonly layout = input<BlueprintLayout | undefined>(undefined);
  readonly version = input<string>('v2.1');
  readonly platform = input<string>('Desktop');

  readonly zoom = signal(1);
  readonly offsetX = signal(0);
  readonly offsetY = signal(0);
  readonly highlightedNodeId = signal<string | null>(null);
  
  readonly isPanning = signal(false);
  private panStartX = 0;
  private panStartY = 0;

  // View queries for DOM elements to draw edges
  readonly nodeEls = viewChildren<ElementRef<HTMLElement>>('nodeEl');
  readonly canvasEl = viewChild<ElementRef<HTMLElement>>('canvas');

  // Calculated SVG Paths
  readonly connectors = signal<SVGConnector[]>([]);

  // Logical sorting order for zones
  private readonly zoneOrder = [
    'client', 'input', 'application', 'core', 'automation', 
    'persistence', 'database', 'external', 'export'
  ];

  readonly groupedNodes = computed<ZoneGroup[]>(() => {
    const allNodes = this.nodes() ?? [];
    if (!allNodes.length) return [];

    const map = new Map<string, BlueprintNode[]>();
    for (const n of allNodes) {
      const g = n.group || 'default';
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(n);
    }

    const groups: ZoneGroup[] = [];
    for (const [name, nodes] of map.entries()) {
      groups.push({ name, nodes });
    }

    groups.sort((a, b) => {
      let idxA = this.zoneOrder.indexOf(a.name.toLowerCase());
      let idxB = this.zoneOrder.indexOf(b.name.toLowerCase());
      if (idxA === -1) idxA = 999;
      if (idxB === -1) idxB = 999;
      return idxA - idxB;
    });

    return groups;
  });

  constructor() {
    afterNextRender(() => {
      if (!this.isBrowser) return;
      // Setup resize observer on the canvas to redraw paths
      const canvas = this.canvasEl()?.nativeElement;
      if (canvas) {
        this.resizeObserver = new ResizeObserver(() => {
          this.recalculatePaths();
        });
        this.resizeObserver.observe(canvas);
      }
    });

    effect(() => {
      // Trigger path recalculation when nodes or zoom change
      this.nodes();
      this.edges();
      if (this.isBrowser) {
        setTimeout(() => this.recalculatePaths(), 50);
      }
    });
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
  }

  // ═══════════════════════════════════════════════════════════════
  // Path Routing Engine (DOM based)
  // ═══════════════════════════════════════════════════════════════
  
  private recalculatePaths() {
    if (!this.isBrowser) return;
    const canvas = this.canvasEl()?.nativeElement;
    const nodeElements = this.nodeEls();
    const currentEdges = this.edges();
    if (!canvas || !nodeElements.length || !currentEdges.length) return;

    const canvasRect = canvas.getBoundingClientRect();
    const domMap = new Map<string, DOMRect>();
    
    nodeElements.forEach(elRef => {
      const el = elRef.nativeElement;
      const id = el.getAttribute('data-node-id');
      if (id) {
        domMap.set(id, el.getBoundingClientRect());
      }
    });

    // Track how many connections depart/arrive at each side of each node
    // so we can fan out attachment points and avoid stacking
    const portCounters = new Map<string, number>(); // "nodeId-side" -> count
    const getPort = (nodeId: string, side: 'left' | 'right' | 'top' | 'bottom'): number => {
      const key = `${nodeId}-${side}`;
      const count = portCounters.get(key) ?? 0;
      portCounters.set(key, count + 1);
      return count;
    };

    // Pre-scan to count total ports per side for centering
    const portTotals = new Map<string, number>();
    for (const edge of currentEdges) {
      const rectA = domMap.get(edge.from);
      const rectB = domMap.get(edge.to);
      if (!rectA || !rectB) continue;
      
      const sides = this.decideSides(rectA, rectB, canvasRect);
      const keyFrom = `${edge.from}-${sides.fromSide}`;
      const keyTo = `${edge.to}-${sides.toSide}`;
      portTotals.set(keyFrom, (portTotals.get(keyFrom) ?? 0) + 1);
      portTotals.set(keyTo, (portTotals.get(keyTo) ?? 0) + 1);
    }

    // Track used midpoint channels to offset parallel routes
    let channelIndex = 0;

    const newConnectors: SVGConnector[] = [];

    for (const edge of currentEdges) {
      const rectA = domMap.get(edge.from);
      const rectB = domMap.get(edge.to);
      if (!rectA || !rectB) continue;

      const ax = rectA.left - canvasRect.left;
      const ay = rectA.top - canvasRect.top;
      const aw = rectA.width;
      const ah = rectA.height;

      const bx = rectB.left - canvasRect.left;
      const by = rectB.top - canvasRect.top;
      const bw = rectB.width;
      const bh = rectB.height;

      const sides = this.decideSides(rectA, rectB, canvasRect);
      
      // Get port indices for fanning
      const fromPortIdx = getPort(edge.from, sides.fromSide);
      const toPortIdx = getPort(edge.to, sides.toSide);
      const fromTotal = portTotals.get(`${edge.from}-${sides.fromSide}`) ?? 1;
      const toTotal = portTotals.get(`${edge.to}-${sides.toSide}`) ?? 1;

      // Calculate attachment points with fan-out
      const startPt = this.getAttachmentPoint(ax, ay, aw, ah, sides.fromSide, fromPortIdx, fromTotal);
      const endPt = this.getAttachmentPoint(bx, by, bw, bh, sides.toSide, toPortIdx, toTotal);

      // Check if this connection skips a column to route it via a "bus"
      // Si la distancia horizontal es mayor a 1 columna + 1 gap (aprox 1.5 anchos de nodo)
      const isLongJump = Math.abs(startPt.x - endPt.x) > (aw * 1.5);

      // Build orthogonal path with unique channel offset
      const offset = channelIndex * 12;
      channelIndex++;
      
      const path = this.buildOrthogonalPath(startPt, endPt, sides.fromSide, sides.toSide, offset, isLongJump);
      
      newConnectors.push({ fromId: edge.from, toId: edge.to, path });
    }

    this.connectors.set(newConnectors);
  }

  /** Decide which sides of two rects to connect */
  private decideSides(
    rectA: DOMRect, rectB: DOMRect, canvasRect: DOMRect
  ): { fromSide: 'left' | 'right' | 'top' | 'bottom'; toSide: 'left' | 'right' | 'top' | 'bottom' } {
    const ax = rectA.left - canvasRect.left;
    const ay = rectA.top - canvasRect.top;
    const aw = rectA.width;
    const ah = rectA.height;
    const bx = rectB.left - canvasRect.left;
    const by = rectB.top - canvasRect.top;
    const bw = rectB.width;
    const bh = rectB.height;
    
    const acx = ax + aw / 2;
    const acy = ay + ah / 2;
    const bcx = bx + bw / 2;
    const bcy = by + bh / 2;

    // Check if vertically aligned (same column)
    if (Math.abs(acx - bcx) < Math.max(aw, bw) / 2) {
      return bcy > acy
        ? { fromSide: 'bottom', toSide: 'top' }
        : { fromSide: 'top', toSide: 'bottom' };
    }
    
    // Horizontal flow
    return bcx > acx
      ? { fromSide: 'right', toSide: 'left' }
      : { fromSide: 'left', toSide: 'right' };
  }

  /** Get an attachment point on a node's edge, fanned out evenly among multiple ports */
  private getAttachmentPoint(
    x: number, y: number, w: number, h: number,
    side: 'left' | 'right' | 'top' | 'bottom',
    portIndex: number, portTotal: number
  ): { x: number; y: number } {
    const margin = 12; // inset from corners
    
    switch (side) {
      case 'right': {
        const usableH = h - margin * 2;
        const step = portTotal > 1 ? usableH / (portTotal - 1) : usableH / 2;
        const py = portTotal > 1 ? y + margin + portIndex * step : y + h / 2;
        return { x: x + w, y: py };
      }
      case 'left': {
        const usableH = h - margin * 2;
        const step = portTotal > 1 ? usableH / (portTotal - 1) : usableH / 2;
        const py = portTotal > 1 ? y + margin + portIndex * step : y + h / 2;
        return { x: x, y: py };
      }
      case 'bottom': {
        const usableW = w - margin * 2;
        const step = portTotal > 1 ? usableW / (portTotal - 1) : usableW / 2;
        const px = portTotal > 1 ? x + margin + portIndex * step : x + w / 2;
        return { x: px, y: y + h };
      }
      case 'top': {
        const usableW = w - margin * 2;
        const step = portTotal > 1 ? usableW / (portTotal - 1) : usableW / 2;
        const px = portTotal > 1 ? x + margin + portIndex * step : x + w / 2;
        return { x: px, y: y };
      }
    }
  }

  /** Build an orthogonal (right-angle) path between two points with a unique channel offset */
  private buildOrthogonalPath(
    start: { x: number; y: number },
    end: { x: number; y: number },
    fromSide: string,
    toSide: string,
    offset: number,
    isLongJump: boolean
  ): string {
    const s = start;
    const e = end;

    if (isLongJump) {
      // Enrutar por un "Bus" superior o inferior para evitar cruzar nodos intermedios
      // Subimos/bajamos a una Y libre. Usaremos un bus inferior si el origen está bajo, sino superior.
      const goUp = Math.min(s.y, e.y) < 200;
      const busY = goUp ? Math.min(s.y, e.y) - 60 - (offset * 1.5) : Math.max(s.y, e.y) + 60 + (offset * 1.5);
      
      let path = `M ${s.x} ${s.y}`;
      // Salir del nodo
      if (fromSide === 'right') path += ` L ${s.x + 20} ${s.y} L ${s.x + 20} ${busY}`;
      else if (fromSide === 'left') path += ` L ${s.x - 20} ${s.y} L ${s.x - 20} ${busY}`;
      else path += ` L ${s.x} ${busY}`;
      
      // Viajar por el bus horizontal
      path += ` L ${e.x} ${busY}`;
      
      // Entrar al destino
      if (toSide === 'right') path += ` L ${e.x + 20} ${busY} L ${e.x + 20} ${e.y} L ${e.x} ${e.y}`;
      else if (toSide === 'left') path += ` L ${e.x - 20} ${busY} L ${e.x - 20} ${e.y} L ${e.x} ${e.y}`;
      else path += ` L ${e.x} ${e.y}`;
      
      return path;
    }

    // If both horizontal (right→left or left→right), use a vertical midpoint
    if ((fromSide === 'right' && toSide === 'left') || (fromSide === 'left' && toSide === 'right')) {
      const midX = s.x + (e.x - s.x) / 2 + offset;
      return `M ${s.x} ${s.y} L ${midX} ${s.y} L ${midX} ${e.y} L ${e.x} ${e.y}`;
    }
    
    // If both vertical (bottom→top or top→bottom), use a horizontal midpoint
    if ((fromSide === 'bottom' && toSide === 'top') || (fromSide === 'top' && toSide === 'bottom')) {
      const midY = s.y + (e.y - s.y) / 2 + offset;
      return `M ${s.x} ${s.y} L ${s.x} ${midY} L ${e.x} ${midY} L ${e.x} ${e.y}`;
    }

    // Mixed sides (right→top, bottom→left, etc.) — use an L-shape
    if (fromSide === 'right' || fromSide === 'left') {
      return `M ${s.x} ${s.y} L ${e.x} ${s.y} L ${e.x} ${e.y}`;
    }
    
    return `M ${s.x} ${s.y} L ${s.x} ${e.y} L ${e.x} ${e.y}`;
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
    if (!h) return false;
    return this.isConnectedTo(node.id, h);
  }

  isNodeDimmed(node: BlueprintNode): boolean {
    const h = this.highlightedNodeId();
    if (!h) return false;
    return !this.isConnectedTo(node.id, h);
  }

  isConnectorHighlighted(conn: SVGConnector): boolean {
    const h = this.highlightedNodeId();
    if (!h) return false;
    return this.isConnectedTo(conn.fromId, h) && this.isConnectedTo(conn.toId, h);
  }

  isConnectorDimmed(conn: SVGConnector): boolean {
    const h = this.highlightedNodeId();
    if (!h) return false;
    return !(this.isConnectedTo(conn.fromId, h) && this.isConnectedTo(conn.toId, h));
  }

  private isConnectedTo(target: string, root: string): boolean {
    if (target === root) return true;
    const inputEdges = this.edges() ?? [];
    
    // Solo resaltar vecinos directos (padres e hijos) para evitar que todo el grafo se ilumine
    for (const e of inputEdges) {
      if (e.from === root && e.to === target) return true;
      if (e.to === root && e.from === target) return true;
    }
    
    return false;
  }

  nodeIconClass(icon: string): string {
    if (!icon) return 'pi pi-circle';
    return icon;
  }

  onWheel(event: WheelEvent) {
    if (!this.isBrowser) return;
    event.preventDefault();
    const delta = -event.deltaY;
    const factor = 0.0008;
    const next = Math.min(Math.max(this.zoom() + delta * factor, 0.4), 3);
    if (next === this.zoom()) return;

    const canvas = this.canvasEl()?.nativeElement;
    if (canvas) {
      const rect = canvas.parentElement!.getBoundingClientRect();
      const cx = event.clientX - rect.left;
      const cy = event.clientY - rect.top;
      const z = this.zoom();
      const scale = next / z;
      
      this.offsetX.update(x => cx - scale * (cx - x));
      this.offsetY.update(y => cy - scale * (cy - y));
    }
    this.zoom.set(next);
  }

  onPanStart(event: MouseEvent) {
    if (!this.isBrowser) return;
    if (event.button !== 0) return; 
    this.panStartX = event.clientX - this.offsetX();
    this.panStartY = event.clientY - this.offsetY();
    this.isPanning.set(true);
    event.preventDefault();
  }

  onPanMove(event: MouseEvent) {
    if (!this.isPanning()) return;
    this.offsetX.set(event.clientX - this.panStartX);
    this.offsetY.set(event.clientY - this.panStartY);
  }

  onPanEnd() {
    this.isPanning.set(false);
  }

  // --- Touch Events (Mobile) ---
  private pinchStartDist = 0;
  private pinchStartZoom = 1;

  onTouchStart(event: TouchEvent) {
    if (!this.isBrowser) return;
    if (event.touches.length === 1) {
      this.panStartX = event.touches[0].clientX - this.offsetX();
      this.panStartY = event.touches[0].clientY - this.offsetY();
      this.isPanning.set(true);
    } else if (event.touches.length === 2) {
      this.pinchStartDist = this.getTouchDistance(event);
      this.pinchStartZoom = this.zoom();
    }
  }

  onTouchMove(event: TouchEvent) {
    if (!this.isBrowser) return;
    
    // Bloquear el scroll nativo dentro de este componente
    if (event.cancelable) {
      event.preventDefault();
    }

    if (event.touches.length === 1 && this.isPanning()) {
      this.offsetX.set(event.touches[0].clientX - this.panStartX);
      this.offsetY.set(event.touches[0].clientY - this.panStartY);
    } else if (event.touches.length === 2) {
      const dist = this.getTouchDistance(event);
      if (this.pinchStartDist > 0) {
        const scale = dist / this.pinchStartDist;
        const nextZoom = Math.min(Math.max(this.pinchStartZoom * scale, 0.4), 3);
        this.zoom.set(nextZoom);
      }
    }
  }

  onTouchEnd(event?: TouchEvent) {
    if (event && event.touches.length > 0) {
      // Si todavía quedan dedos en pantalla, resetear los anclajes de pan
      this.panStartX = event.touches[0].clientX - this.offsetX();
      this.panStartY = event.touches[0].clientY - this.offsetY();
    } else {
      this.isPanning.set(false);
    }
  }

  private getTouchDistance(event: TouchEvent): number {
    const dx = event.touches[0].clientX - event.touches[1].clientX;
    const dy = event.touches[0].clientY - event.touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  resetZoom() {
    this.zoom.set(1);
    this.offsetX.set(0);
    this.offsetY.set(0);
    this.highlightedNodeId.set(null);
  }
}
