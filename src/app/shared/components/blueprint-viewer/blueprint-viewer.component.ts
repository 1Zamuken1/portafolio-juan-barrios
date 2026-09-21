import { Component, input, signal, computed, inject, PLATFORM_ID, ElementRef, OnDestroy, viewChild, effect } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { BlueprintNode, BlueprintEdge, BlueprintLayout, ComputedNodeLayout } from '../../models/blueprint.model';
import { BlueprintPositioningService } from './services/blueprint-positioning.service';
import { BlueprintPathCalculator } from './services/blueprint-path-calculator';
import { BlueprintColorService } from './services/blueprint-color.service';
import { BlueprintLayoutService } from './services/blueprint-layout.service';
import { BLUEPRINT_SPACING } from './utils/blueprint-constants';
import { ThemeService } from '../../../core/services/theme.service';

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

/** Margen en unidades del viewBox que autoFit deja alrededor del contenido. */
const AUTOFIT_PADDING = 60;

/** Tope de zoom del encuadre automatico, para no agrandar en exceso diagramas pequenos. */
const AUTOFIT_MAX_ZOOM = 2;

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
  private themeService = inject(ThemeService);

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

    // 1. Resolver el lado de salida y de entrada de cada arista.
    const resolved = edges
      .map(edge => {
        const fromNode = nodeMap.get(edge.from);
        const toNode = nodeMap.get(edge.to);
        if (!fromNode || !toNode) return null;

        const fromSide = edge.fromPort && edge.fromPort !== 'auto'
          ? edge.fromPort
          : this.positioningService.autoDetectPort(fromNode, toNode, true);

        const toSide = edge.toPort && edge.toPort !== 'auto'
          ? edge.toPort
          : this.positioningService.autoDetectPort(fromNode, toNode, false);

        return { edge, fromNode, toNode, fromSide, toSide };
      })
      .filter(r => r !== null) as Array<{
        edge: BlueprintEdge;
        fromNode: ExtendedBlueprintNode;
        toNode: ExtendedBlueprintNode;
        fromSide: string;
        toSide: string;
      }>;

    const esVertical = (side: string) => side === 'top' || side === 'bottom';
    const conRuta = (e: BlueprintEdge) => !e.bendPoints?.length;

    // 2. Contar conexiones por lado. Las aristas con bendPoints no reservan
    //    puerto: su recorrido es literal y no pasa por el reparto.
    const sideTotals = new Map<string, number>();
    const bump = (key: string) => sideTotals.set(key, (sideTotals.get(key) ?? 0) + 1);
    for (const r of resolved) {
      if (!conRuta(r.edge)) continue;
      bump(`${r.edge.from}-${r.fromSide}`);
      bump(`${r.edge.to}-${r.toSide}`);
    }

    // 3. Ordenar los puertos de cada lado por la posicion del otro extremo.
    //    Sin esto el reparto sigue el orden de declaracion del JSON, que es
    //    arbitrario, y dos aristas del mismo lado pueden salir cruzadas.
    const ordenPuerto = new Map<string, number>();
    const grupos = new Map<string, Array<{ idx: number; clave: number; lejania: number }>>();

    resolved.forEach((r, i) => {
      if (!conRuta(r.edge)) return;
      const ejeDe = (n: ExtendedBlueprintNode, side: string) => esVertical(side) ? n.centerX : n.centerY;
      const dist = Math.hypot(r.toNode.centerX - r.fromNode.centerX, r.toNode.centerY - r.fromNode.centerY);

      for (const [key, clave] of [
        [`${r.edge.from}-${r.fromSide}`, ejeDe(r.toNode, r.fromSide)],
        [`${r.edge.to}-${r.toSide}`, ejeDe(r.fromNode, r.toSide)]
      ] as Array<[string, number]>) {
        const lista = grupos.get(key) ?? [];
        lista.push({ idx: i, clave, lejania: dist });
        grupos.set(key, lista);
      }
    });

    for (const [key, lista] of grupos) {
      // A igual posicion del destino, el mas cercano primero.
      lista.sort((a, b) => a.clave - b.clave || a.lejania - b.lejania);
      lista.forEach((item, orden) => ordenPuerto.set(`${key}#${item.idx}`, orden));
    }

    // Obstaculos de cada arista: todos los nodos menos sus dos extremos.
    const obstaclesFor = (edge: BlueprintEdge) => nodes
      .filter(n => n.id !== edge.from && n.id !== edge.to)
      .map(n => ({ x: n.x, y: n.y, width: n.width, height: n.height }));

    // 4. Trazado.
    const segmentUsed = new Map<string, number>();

    const trazos = resolved.map(({ edge, fromNode, toNode, fromSide, toSide }, i) => {
      const fromKey = `${edge.from}-${fromSide}`;
      const toKey = `${edge.to}-${toSide}`;

      const fromPort = this.positioningService.portPosition(
        fromNode, fromSide, ordenPuerto.get(`${fromKey}#${i}`) ?? 0, sideTotals.get(fromKey) ?? 1
      );
      const toPort = this.positioningService.portPosition(
        toNode, toSide, ordenPuerto.get(`${toKey}#${i}`) ?? 0, sideTotals.get(toKey) ?? 1
      );

      const obstacles = obstaclesFor(edge);

      // Los bendPoints del JSON mandan sobre el calculo automatico. Son el
      // escape para los casos en que el trazado automatico no queda limpio.
      if (edge.bendPoints?.length) {
        const puntos = edge.bendPoints;
        return {
          edge, obstacles, points: null,
          fromPort: puntos[0],
          toPort: puntos[puntos.length - 1],
          path: this.pathCalculator.buildPathFromPoints(puntos)
        };
      }

      // Separacion entre aristas paralelas que unen el mismo par de nodos.
      const segmentKey = [edge.from, edge.to].sort().join('-');
      const segmentCount = segmentUsed.get(segmentKey) ?? 0;
      segmentUsed.set(segmentKey, segmentCount + 1);
      const offset = segmentCount * 12;

      const routeType = edge.routeType ?? 'orthogonal';
      if (routeType !== 'orthogonal') {
        return {
          edge, fromPort, toPort, obstacles, points: null,
          path: this.pathCalculator.calculatePath(fromPort, toPort, fromSide, toSide, routeType, offset, obstacles)
        };
      }

      return {
        edge, fromPort, toPort, obstacles,
        points: this.pathCalculator.calculateRoutePoints(fromPort, toPort, fromSide, toSide, offset, obstacles),
        path: ''
      };
    });

    // 6. Repartir en carriles los tramos que varias rutas comparten, para que
    //    no se dibujen una encima de otra.
    this.pathCalculator.separateChannels(
      trazos.map(t => t.points),
      trazos.map(t => t.obstacles)
    );

    return trazos.map(({ edge, fromPort, toPort, points, path }) => ({
      id: `${edge.from}→${edge.to}`,
      from: edge.from,
      to: edge.to,
      path: points ? this.pathCalculator.buildPathFromPoints(points) : path,
      label: edge.label,
      labelX: (fromPort.x + toPort.x) / 2,
      labelY: (fromPort.y + toPort.y) / 2,
      strokeWidth: edge.strokeWidth ?? 2,
      strokeDasharray: edge.strokeDasharray ?? '6 4',
    })) as ComputedConnector[];
  });

  /** Tema activo de la aplicacion. Sigue a ThemeService, no al sistema operativo. */
  readonly currentTheme = this.themeService.theme;

  // Interactivity state
  readonly zoom = signal(1);
  readonly offsetX = signal(0);
  readonly offsetY = signal(0);
  readonly highlightedNodeId = signal<string | null>(null);
  readonly isPanning = signal(false);
  readonly showPorts = signal(false); // Can be toggled for debugging
  
  private panStartX = 0;
  private panStartY = 0;

  private resizeObserver?: ResizeObserver;

  constructor() {
    // Reencuadra cuando cambian los datos del diagrama.
    effect(() => {
      this.layoutNodes();
      this.layout();
      if (!this.isBrowser) return;
      // El DOM aun no refleja los nodos nuevos en este tick.
      setTimeout(() => this.autoFit(), 50);
    });

    // Reencuadra cuando cambia el tamano del contenedor: rotacion del movil,
    // colapso del explorer o redimension de la ventana.
    effect(() => {
      const viewport = this.canvasEl()?.nativeElement.parentElement;
      if (!this.isBrowser || !viewport) return;

      this.resizeObserver?.disconnect();
      this.resizeObserver = new ResizeObserver(() => this.autoFit());
      this.resizeObserver.observe(viewport);
    });
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

  /** Color del grupo: banda lateral e icono de la tarjeta. */
  getNodeAccent(node: ExtendedBlueprintNode): string {
    return this.colorService.getNodeAccent(node, this.currentTheme());
  }

  /** Etiqueta accesible del diagrama completo. */
  getDiagramLabel(): string {
    return `Diagrama de arquitectura: ${this.layoutNodes().length} componentes y ${this.computedConnectors().length} conexiones`;
  }

  /**
   * Descripcion larga para lectores de pantalla y rastreadores: enumera las
   * relaciones, que de otro modo solo existen como trazos SVG.
   */
  getDiagramDescription(): string {
    const nombres = new Map(this.layoutNodes().map(n => [n.id, n.label]));
    const relaciones = this.computedConnectors()
      .map(c => `${nombres.get(c.from) ?? c.from} conecta con ${nombres.get(c.to) ?? c.to}`)
      .join('. ');
    return relaciones ? `${relaciones}.` : '';
  }

  /** Etiqueta accesible de un nodo: nombre, grupo y descripcion. */
  getNodeLabel(node: ExtendedBlueprintNode): string {
    const partes = [node.label];
    if (node.group) partes.push(`grupo ${node.group}`);
    if (node.description) partes.push(node.description);
    return partes.join('. ');
  }

  /** Siglas del grupo para la esquina de la tarjeta. */
  getGroupTag(node: ExtendedBlueprintNode): string {
    return (node.group ?? '').slice(0, 3).toUpperCase();
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
    const size = this.layout()?.canvas?.gridSize ?? BLUEPRINT_SPACING.gridSize;
    return `M ${size} 0 L 0 0 0 ${size}`;
  }

  getGridMinorSize(): number {
    return this.layout()?.canvas?.gridSize ?? BLUEPRINT_SPACING.gridSize;
  }

  getGridMajorSize(): number {
    return BLUEPRINT_SPACING.gridMajorSize;
  }

  getGridMajorPath(): string {
    const size = this.getGridMajorSize();
    return `M ${size} 0 L 0 0 0 ${size}`;
  }

  /**
   * Marco de lamina con coordenadas, al estilo de un plano: numeros en el eje
   * horizontal y letras en el vertical, una marca cada celda de rejilla mayor.
   */
  readonly sheetFrame = computed(() => {
    const w = this.layout()?.canvas?.width ?? BLUEPRINT_SPACING.canvasMinWidth;
    const h = this.layout()?.canvas?.height ?? BLUEPRINT_SPACING.canvasMinHeight;
    const m = BLUEPRINT_SPACING.sheetMargin;
    const step = BLUEPRINT_SPACING.gridMajorSize;

    const innerW = w - m * 2;
    const innerH = h - m * 2;

    const cols: Array<{ label: string; center: number; tick: number }> = [];
    for (let i = 0; i * step < innerW; i++) {
      const start = m + i * step;
      const end = Math.min(start + step, m + innerW);
      cols.push({ label: String(i + 1), center: (start + end) / 2, tick: end });
    }

    const rows: Array<{ label: string; center: number; tick: number }> = [];
    for (let i = 0; i * step < innerH; i++) {
      const start = m + i * step;
      const end = Math.min(start + step, m + innerH);
      rows.push({
        label: String.fromCharCode(65 + i),
        center: (start + end) / 2,
        tick: end
      });
    }

    return { x: m, y: m, width: innerW, height: innerH, margin: m, cols, rows };
  });

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

  /**
   * Encuadra el diagrama completo dentro del viewport.
   *
   * El SVG ya encaja el lienzo de diseno en el contenedor mediante
   * `viewBox` + `preserveAspectRatio="xMidYMid meet"`, aplicando una escala
   * base y un centrado propios. El zoom y el desplazamiento del stage se
   * calculan **encima** de esa transformacion, no en pixeles crudos: por eso
   * hay que reproducir aqui la escala base para situar el contenido.
   */
  autoFit() {
    const nodes = this.layoutNodes();
    if (!this.isBrowser || !nodes.length) return;

    const viewport = this.canvasEl()?.nativeElement.parentElement;
    if (!viewport) return;

    const vpW = viewport.clientWidth;
    const vpH = viewport.clientHeight;
    if (!vpW || !vpH) return;

    // Caja envolvente del contenido, en unidades del viewBox.
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const node of nodes) {
      const nx = node.x ?? 0;
      const ny = node.y ?? 0;
      const nw = node.width ?? BLUEPRINT_SPACING.nodeWidth;
      const nh = node.height ?? BLUEPRINT_SPACING.nodeHeight;
      if (nx < minX) minX = nx;
      if (ny < minY) minY = ny;
      if (nx + nw > maxX) maxX = nx + nw;
      if (ny + nh > maxY) maxY = ny + nh;
    }
    if (!Number.isFinite(minX)) return;

    minX -= AUTOFIT_PADDING;
    minY -= AUTOFIT_PADDING;
    maxX += AUTOFIT_PADDING;
    maxY += AUTOFIT_PADDING;

    const contentW = maxX - minX;
    const contentH = maxY - minY;
    if (contentW <= 0 || contentH <= 0) return;

    // Escala y centrado que aplica el propio viewBox.
    const canvasW = this.layout()?.canvas?.width ?? BLUEPRINT_SPACING.canvasMinWidth;
    const canvasH = this.layout()?.canvas?.height ?? BLUEPRINT_SPACING.canvasMinHeight;
    const baseScale = Math.min(vpW / canvasW, vpH / canvasH);
    if (!baseScale) return;
    const baseX = (vpW - canvasW * baseScale) / 2;
    const baseY = (vpH - canvasH * baseScale) / 2;

    // Zoom necesario para que el contenido llene el viewport.
    const zoom = Math.min(
      Math.max(
        Math.min(vpW / (contentW * baseScale), vpH / (contentH * baseScale)),
        BLUEPRINT_SPACING.minZoom
      ),
      AUTOFIT_MAX_ZOOM
    );

    this.zoom.set(zoom);
    this.offsetX.set((vpW - zoom * baseScale * contentW) / 2 - zoom * (baseX + baseScale * minX));
    this.offsetY.set((vpH - zoom * baseScale * contentH) / 2 - zoom * (baseY + baseScale * minY));
  }

  resetZoom() {
    this.autoFit();
    this.highlightedNodeId.set(null);
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
  }
}
