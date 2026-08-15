export const BLUEPRINT_COLOR_PALETTE = {
  // Modos: light/dark (responder a sistema)
  modes: {
    light: {
      background: '#FFFFFF',
      gridLine: 'rgba(0, 0, 0, 0.05)',
      text: '#1E1E1E',
    },
    dark: {
      background: '#1E1E1E',
      gridLine: 'rgba(255, 255, 255, 0.08)',
      text: '#E0E0E0',
    }
  },

  // Colores por grupo
  groups: {
    'client': {
      light: { fill: '#E3F2FD', stroke: '#1976D2', text: '#0D47A1' },
      dark: { fill: '#0D47A1', stroke: '#90CAF9', text: '#E3F2FD' }
    },
    'input': {
      light: { fill: '#F3E5F5', stroke: '#7B1FA2', text: '#4A148C' },
      dark: { fill: '#4A148C', stroke: '#CE93D8', text: '#F3E5F5' }
    },
    'application': {
      light: { fill: '#FCE4EC', stroke: '#C2185B', text: '#880E4F' },
      dark: { fill: '#880E4F', stroke: '#F48FB1', text: '#FCE4EC' }
    },
    'core': {
      light: { fill: '#FFF3E0', stroke: '#F57C00', text: '#E65100' },
      dark: { fill: '#E65100', stroke: '#FFB74D', text: '#FFF3E0' }
    },
    'automation': {
      light: { fill: '#E8F5E9', stroke: '#388E3C', text: '#1B5E20' },
      dark: { fill: '#1B5E20', stroke: '#81C784', text: '#E8F5E9' }
    },
    'persistence': {
      light: { fill: '#E0F2F1', stroke: '#00796B', text: '#004D40' },
      dark: { fill: '#004D40', stroke: '#80DEEA', text: '#E0F2F1' }
    },
    'database': {
      light: { fill: '#EDE7F6', stroke: '#512DA8', text: '#311B92' },
      dark: { fill: '#311B92', stroke: '#B39DDB', text: '#EDE7F6' }
    },
    'external': {
      light: { fill: '#FFE0B2', stroke: '#D84315', text: '#BF360C' },
      dark: { fill: '#BF360C', stroke: '#FFCC80', text: '#FFE0B2' }
    },
    'export': {
      light: { fill: '#F1F8E9', stroke: '#558B2F', text: '#33691E' },
      dark: { fill: '#33691E', stroke: '#AED581', text: '#F1F8E9' }
    },
    'default': {
      light: { fill: '#F5F5F5', stroke: '#616161', text: '#212121' },
      dark: { fill: '#424242', stroke: '#BDBDBD', text: '#F5F5F5' }
    }
  },

  // Tipo de nodo (primary/secondary)
  types: {
    'primary': { strokeWidth: 2.5, opacity: 1 },
    'secondary': { strokeWidth: 1.5, opacity: 0.85 }
  },

  // Estados de interacción
  states: {
    hover: { glowRadius: 16, glowOpacity: 0.4 },
    active: { glowRadius: 20, glowOpacity: 0.6 },
    dimmed: { opacity: 0.3 }
  },

  // Conectores
  connectors: {
    light: {
      default: '#666666',
      hover: '#FFD700',
      dimmed: 'rgba(100, 100, 100, 0.2)'
    },
    dark: {
      default: '#CCCCCC',
      hover: '#FFD700',
      dimmed: 'rgba(200, 200, 200, 0.2)'
    }
  }
};

export const BLUEPRINT_SPACING = {
  nodeWidth: 250,           // Ancho default de nodos
  nodeHeight: 96,           // Alto default de nodos
  nodePadding: { x: 12, y: 10 },  // Padding interno
  
  portMargin: 12,           // Margen mínimo desde borde al puerto
  portSpacing: undefined,   // Calculado dinámicamente
  
  gridSize: 40,             // Tamaño de la grilla visual
  
  canvasMinWidth: 2000,
  canvasMinHeight: 1600,
  
  minZoom: 0.4,
  maxZoom: 3,
  defaultZoom: 1,
  
  arrowheadSize: 8,
  connectorStrokeWidth: 2,
  connectorStrokeDasharray: '6 4',  // Dashed default
};
