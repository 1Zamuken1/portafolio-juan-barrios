/**
 * Paleta del visor de arquitectura, con estetica de plano tecnico.
 *
 * - `dark`  -> blueprint clasico: tinta blanca sobre papel cian.
 * - `light` -> whiteprint: tinta cian sobre papel claro, el negativo del anterior.
 *
 * Todo el trazo es monocromo. La unica concesion al color es `accent`, que
 * identifica el grupo de cada nodo en la banda lateral y en el icono, en tonos
 * pastel elegidos para no romper la lectura del plano.
 */

const BLUEPRINT_DARK = {
  paper: '#0e6a7d',
  paperDeep: '#0a5464',
  gridMinor: 'rgba(255, 255, 255, 0.13)',
  gridMajor: 'rgba(255, 255, 255, 0.28)',
  ink: '#FFFFFF',
  inkSoft: 'rgba(255, 255, 255, 0.95)',
  inkFaint: 'rgba(255, 255, 255, 0.85)',
  nodeFill: 'rgba(255, 255, 255, 0.07)',
  nodeFillStrong: 'rgba(255, 255, 255, 0.13)'
};

const BLUEPRINT_LIGHT = {
  paper: '#EEF5F7',
  paperDeep: '#DDEAEE',
  gridMinor: 'rgba(13, 95, 112, 0.12)',
  gridMajor: 'rgba(13, 95, 112, 0.30)',
  ink: '#08414E',
  inkSoft: 'rgba(8, 65, 78, 0.92)',
  inkFaint: 'rgba(8, 65, 78, 0.72)',
  nodeFill: 'rgba(255, 255, 255, 0.70)',
  nodeFillStrong: 'rgba(255, 255, 255, 0.92)'
};

/** Acento por grupo. Pastel sobre el plano oscuro, saturado sobre el claro. */
const GROUP_ACCENTS: Record<string, { dark: string; light: string }> = {
  client:      { dark: '#A4DDFF', light: '#1565C0' },
  input:       { dark: '#E3CDFF', light: '#6A1B9A' },
  application: { dark: '#FFC6D7', light: '#AD1457' },
  core:        { dark: '#FFD59E', light: '#E65100' },
  automation:  { dark: '#B4E7C4', light: '#2E7D32' },
  persistence: { dark: '#9EE8DC', light: '#00796B' },
  database:    { dark: '#DAD0FA', light: '#4527A0' },
  external:    { dark: '#FFCBA7', light: '#D84315' },
  export:      { dark: '#DCEFA6', light: '#558B2F' },
  default:     { dark: '#FFFFFF', light: '#0D5F70' }
};

export const BLUEPRINT_COLOR_PALETTE = {
  modes: {
    light: BLUEPRINT_LIGHT,
    dark: BLUEPRINT_DARK
  },

  accents: GROUP_ACCENTS,

  // Tipo de nodo (primary/secondary): en un plano la jerarquia se expresa con
  // el grosor del trazo, no con el color.
  types: {
    primary: { strokeWidth: 2, opacity: 1 },
    secondary: { strokeWidth: 1.25, opacity: 0.9 }
  },

  states: {
    hover: { glowRadius: 16, glowOpacity: 0.4 },
    active: { glowRadius: 20, glowOpacity: 0.6 },
    dimmed: { opacity: 0.45 }
  },

  connectors: {
    light: {
      default: 'rgba(13, 95, 112, 0.65)',
      hover: '#B8860B',
      dimmed: 'rgba(13, 95, 112, 0.18)'
    },
    dark: {
      default: 'rgba(255, 255, 255, 0.72)',
      hover: '#FFE082',
      dimmed: 'rgba(255, 255, 255, 0.18)'
    }
  }
};

export const BLUEPRINT_SPACING = {
  nodeWidth: 250,
  nodeHeight: 96,
  nodePadding: { x: 12, y: 10 },

  portMargin: 12,
  portSpacing: undefined,

  gridSize: 40,          // Rejilla menor
  gridMajorSize: 200,    // Rejilla mayor, cada 5 celdas

  /** Margen entre el borde del lienzo y el marco con coordenadas. */
  sheetMargin: 44,

  canvasMinWidth: 2000,
  canvasMinHeight: 1600,

  minZoom: 0.4,
  maxZoom: 3,
  defaultZoom: 1,

  arrowheadSize: 8,
  connectorStrokeWidth: 1.5,
  connectorStrokeDasharray: '7 5'
};
