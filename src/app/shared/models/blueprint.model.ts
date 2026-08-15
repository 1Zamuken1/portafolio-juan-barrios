export interface BlueprintNode {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  group?: string; // Solo para categorización visual (color)
  type?: 'primary' | 'secondary';

  // === NUEVOS CAMPOS POSICIÓN ===
  x?: number;       // Coordenada X absoluta en el canvas SVG
  y?: number;       // Coordenada Y absoluta en el canvas SVG
  width?: number;  // Ancho del nodo (default: 250)
  height?: number; // Alto del nodo (default: 96)
}

export interface BlueprintCanvasConfig {
  width: number;      // Ancho del SVG viewBox (default: 2000)
  height: number;     // Alto del SVG viewBox (default: 1600)
  gridSize?: number;  // Tamaño de grilla visual (default: 40)
  showGrid?: boolean; // Mostrar grilla de fondo (default: true)
}

export interface BlueprintLayout {
  orientation?: 'swimlanes' | 'freeform' | 'hierarchical' | 'circular';
  canvas?: BlueprintCanvasConfig;
  
  // Metadata de zoom/pan inicial
  initialZoom?: number;       // default: 1
  initialPanX?: number;       // default: 0
  initialPanY?: number;       // default: 0
}

export interface BlueprintEdge {
  from: string;
  to: string;
  
  // Control de routing
  fromPort?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  toPort?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  routeType?: 'orthogonal' | 'curved' | 'straight';  // default: 'orthogonal'
  
  // Control de aparencia
  strokeWidth?: number;  // default: 2
  strokeDasharray?: string;  // "6 4" para dashed, "" para solid
  
  // Puntos de flexión explícitos (opcional, para override)
  bendPoints?: Array<{ x: number; y: number }>;
  
  // Metadata
  label?: string;  // Etiqueta en la ruta
}

export interface NodePort {
  nodeId: string;
  side: 'top' | 'bottom' | 'left' | 'right';
  index?: number;  // Cuál puerto si hay múltiples en el mismo side
}

export interface ComputedNodeLayout {
  nodeId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  ports: {
    top: Array<{ x: number; y: number }>;
    bottom: Array<{ x: number; y: number }>;
    left: Array<{ x: number; y: number }>;
    right: Array<{ x: number; y: number }>;
  };
}
