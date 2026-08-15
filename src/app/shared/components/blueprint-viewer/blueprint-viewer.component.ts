import { Component, input, signal, computed, inject, PLATFORM_ID, ElementRef, OnDestroy, viewChild, effect } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { BlueprintNode, BlueprintEdge, BlueprintLayout, ComputedNodeLayout } from '../../models/blueprint.model';
import { BlueprintPositioningService } from './services/blueprint-positioning.service';
import { BlueprintPathCalculator } from './services/blueprint-path-calculator';
import { BlueprintColorService } from './services/blueprint-color.service';
import { BlueprintLayoutService } from './services/blueprint-layout.service';

export interface ComputedConnector {
  id: string;
  from: string;
  to: string;
  path: string;
  label?: string;
  labelX: number;
  labelY: number;
  strokeWidth: number;
  strokeDasharray: string;
}

export type ExtendedBlueprintNode = BlueprintNode & ComputedNodeLayout;

@Component({
  selector: 'app-blueprint-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './blueprint-viewer.component.html',
  styleUrl: './blueprint-viewer.component.css',
})
export class BlueprintViewerComponent implements OnDestroy {
  // Inputs
  readonly nodes = input<BlueprintNode[]>([]);
  readonly edges = input<BlueprintEdge[]>([]);
  readonly layout = input<BlueprintLayout | undefined>(undefined);
  readonly version = input<string>('v3.0');
  
  // Platform check
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
  readonly canvasEl = viewChild<ElementRef<HTMLElement>>('canvas');

  // Services
  private positioningService = inject(BlueprintPositioningService);
  private pathCalculator = inject(BlueprintPathCalculator);
  private colorService = inject(BlueprintColorService);
  private layoutService = inject(BlueprintLayoutService);

  // Computed Layouts
  readonly layoutNodes = computed(() => {
    const nodes = this.nodes() ?? [];
    if (!nodes.length) return [];
    
    const validated = nodes.map(n => this.layoutService.calculateNodeLayout(n));
    
    const withPorts = validated.map(n => ({
      ...n,
      ports: this.positioningService.calculatePorts(n, this.edges() ?? [])
    }));
    
    return nodes.map(originalNode => {
      const computedLayout = withPorts.find(l => l.nodeId === originalNode.id)!;
      return {
        ...originalNode,
        ...computedLayout
      } as ExtendedBlueprintNode;
    });
  });
  
  readonly computedConnectors = computed(() => {
    const edges = this.edges() ?? [];
    const nodes = this.layoutNodes();
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    
    let channelIndex = 0;
    const usedPorts = new Map<string, number>();

    const getPort = (nodeId: string, side: string, node: ExtendedBlueprintNode) => {
      const key = `${nodeId}-${side}`;
      const count = usedPorts.get(key) || 0;
      usedPorts.set(key, count + 1);
      return (node.ports as any)[side]?.[count] || { x: node.centerX, y: node.centerY };
    };

    return edges.map(edge => {
      const fromNode = nodeMap.get(edge.from);
      const toNode = nodeMap.get(edge.to);
      if (!fromNode || !toNode) return null;
      
      const fromSide = edge.fromPort && edge.fromPort !== 'auto' 
          ? edge.fromPort 
          : this.positioningService.autoDetectPort(fromNode, toNode, true);
          
      const toSide = edge.toPort && edge.toPort !== 'auto' 
          ? edge.toPort 
          : this.positioningService.autoDetectPort(fromNode, toNode, false);

      const fromPort = getPort(edge.from, fromSide, fromNode);
      const toPort = getPort(edge.to, toSide, toNode);
      
      // Calculate offset based on how many edges share these two nodes
      const segmentKey = [edge.from, edge.to].sort().join('-');
      const segmentCount = usedPorts.get(segmentKey) || 0;
      usedPorts.set(segmentKey, segmentCount + 1);
      
      const offset = segmentCount * 12;

      const path = this.pathCalculator.calculatePath(
        fromPort, toPort,
        fromSide, toSide,
        edge.routeType ?? 'orthogonal',
        offset
      );
      
      return {
        id: `${edge.from}→${edge.to}`,
        from: edge.from,
        to: edge.to,
        path,
        label: edge.label,
        labelX: (fromPort.x + toPort.x) / 2,
        labelY: (fromPort.y + toPort.y) / 2,
        strokeWidth: edge.strokeWidth ?? 2,
        strokeDasharray: edge.strokeDasharray ?? '6 4',
      };
    }).filter(c => c !== null) as ComputedConnector[];
  });
  
  private detectTheme(): 'light' | 'dark' {
    if (!this.isBrowser) return 'dark';
    const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return isDark ? 'dark' : 'light'; 
  }
  
  readonly currentTheme = signal<'light' | 'dark'>('dark');

  private themeMediaQuery: MediaQueryList | null = null;
  private themeHandler = (e: MediaQueryListEvent) => {
    this.currentTheme.set(e.matches ? 'dark' : 'light');
  };

  // Interactivity state
  readonly zoom = signal(1);
  readonly offsetX = signal(0);
  readonly offsetY = signal(0);
  readonly highlightedNodeId = signal<string | null>(null);
  readonly isPanning = signal(false);
  readonly showPorts = signal(false); // Can be toggled for debugging
  
  private panStartX = 0;
  private panStartY = 0;

  constructor() {
    // Initialize theme detection
    if (this.isBrowser) {
      this.currentTheme.set(this.detectTheme());
      this.themeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.themeMediaQuery.addEventListener('change', this.themeHandler);
    }

    // Apply initial layout settings when they change
    effect(() => {
      const lay = this.layout();
      if (lay) {
        if (lay.initialZoom !== undefined) {
          this.zoom.set(lay.initialZoom);
          this.offsetX.set(lay.initialPanX ?? 0);
          this.offsetY.set(lay.initialPanY ?? 0);
        } else {
          // If no initial zoom, autofit the diagram to the screen
          setTimeout(() => this.autoFit(), 50);
        }
      }
    }, { allowSignalWrites: true });
  }

  ngOnDestroy() {
    if (this.themeMediaQuery) {
      this.themeMediaQuery.removeEventListener('change', this.themeHandler);
    }
  }

  // --- Public methods for template ---
  getNodeFill(node: ExtendedBlueprintNode): string {
    return this.colorService.getNodeFill(node, this.currentTheme());
  }
  
  getNodeStroke(node: ExtendedBlueprintNode): string {
    return this.colorService.getNodeStroke(node, this.currentTheme());
  }
  
  getNodeTextColor(node: ExtendedBlueprintNode): string {
    return this.colorService.getNodeTextColor(node, this.currentTheme());
  }
  
  getNodeStrokeWidth(node: ExtendedBlueprintNode): number {
    return this.colorService.getNodeStrokeWidth(node);
  }

  getNodeGlowColor(node: ExtendedBlueprintNode): string {
    return this.colorService.getNodeGlowColor(node, this.currentTheme());
  }
  
  getConnectorMarker(conn: ComputedConnector): string {
    return this.isConnectorHighlighted(conn) ? 'hover' : 'default';
  }
  
  getViewBox(): string {
    const w = this.layout()?.canvas?.width ?? 2000;
    const h = this.layout()?.canvas?.height ?? 1600;
    return `0 0 ${w} ${h}`;
  }
  
  getTransformStyle(): string {
    return `translate(${this.offsetX()}px, ${this.offsetY()}px) scale(${this.zoom()})`;
  }
  
  getGridPath(): string {
    const size = this.layout()?.canvas?.gridSize ?? 40;
    return `M ${size} 0 L 0 0 0 ${size}`;
  }

  getIconChar(icon?: string): string {
    return icon ?? ''; 
  }

  truncateText(text: string | undefined, max: number): string {
    if (!text) return '';
    return text.length > max ? text.substring(0, max) + '...' : text;
  }
  
  // --- Interaction ---
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

  isConnectorHighlighted(conn: ComputedConnector): boolean {
    const h = this.highlightedNodeId();
    if (!h) return false;
    return conn.from === h || conn.to === h;
  }

  isConnectorDimmed(conn: ComputedConnector): boolean {
    const h = this.highlightedNodeId();
    if (!h) return false;
    return !(conn.from === h || conn.to === h);
  }

  private isConnectedTo(target: string, root: string): boolean {
    if (target === root) return true;
    const inputEdges = this.edges() ?? [];
    for (const e of inputEdges) {
      if ((e.from === root && e.to === target) || (e.to === root && e.from === target)) {
        return true;
      }
    }
    return false;
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
    if (event.cancelable) event.preventDefault();

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

  autoFit() {
    const nodes = this.layoutNodes();
    if (!nodes || nodes.length === 0 || !this.isBrowser || !this.canvasEl()) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const node of nodes) {
      const nx = node.x ?? 0;
      const ny = node.y ?? 0;
      const nw = node.width ?? 250;
      const nh = node.height ?? 96;
      if (nx < minX) minX = nx;
      if (ny < minY) minY = ny;
      if (nx + nw > maxX) maxX = nx + nw;
      if (ny + nh > maxY) maxY = ny + nh;
    }

    if (minX === Infinity) return;

    // Add some padding around the bounding box
    const padding = 60;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const contentW = maxX - minX;
    const contentH = maxY - minY;

    const canvasElement = this.canvasEl()!.nativeElement;
    const viewport = canvasElement.parentElement;
    if (!viewport) return;

    const vpW = viewport.clientWidth;
    const vpH = viewport.clientHeight;
    if (vpW === 0 || vpH === 0) return;

    const scaleX = vpW / contentW;
    const scaleY = vpH / contentH;
    
    // Fit to the smallest scale so it fits entirely, clamp to sensible values
    let newZoom = Math.min(scaleX, scaleY);
    newZoom = Math.min(Math.max(newZoom, 0.4), 1.3);
    
    // Center it
    const newOffsetX = (vpW - contentW * newZoom) / 2 - minX * newZoom;
    const newOffsetY = (vpH - contentH * newZoom) / 2 - minY * newZoom;

    this.zoom.set(newZoom);
    this.offsetX.set(newOffsetX);
    this.offsetY.set(newOffsetY);
  }

  resetZoom() {
    const lay = this.layout();
    if (lay?.initialZoom !== undefined) {
      this.zoom.set(lay.initialZoom);
      this.offsetX.set(lay.initialPanX ?? 0);
      this.offsetY.set(lay.initialPanY ?? 0);
    } else {
      this.autoFit();
    }
    this.highlightedNodeId.set(null);
  }
}
