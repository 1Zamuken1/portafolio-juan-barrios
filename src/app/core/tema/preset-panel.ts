import Aura from '@primeng/themes/aura';
import { definePreset } from '@primeng/themes';

/**
 * Lo mismo para los dos temas: cada token apunta a una variable --admin-* que
 * cambia de valor con [data-theme] (styles/admin-tema.css). Asi el claro y el
 * oscuro se deciden en un solo sitio, en CSS, y aqui solo se dice que pieza
 * de PrimeNG toma que papel.
 */
const ESQUEMA_PANEL = {
  primary: {
    color: 'var(--admin-primario)',
    contrastColor: 'var(--admin-sobre-primario)',
    hoverColor: 'var(--admin-primario-hover)',
    activeColor: 'var(--admin-primario-hover)'
  },
  highlight: {
    background: 'var(--admin-resalte)',
    focusBackground: 'var(--admin-resalte-foco)',
    color: 'var(--admin-texto)',
    focusColor: 'var(--admin-texto)'
  },
  mask: { background: 'var(--admin-velo)', color: 'var(--admin-texto)' },
  formField: {
    background: 'var(--admin-campo)',
    disabledBackground: 'var(--admin-campo-off)',
    filledBackground: 'var(--admin-campo)',
    filledHoverBackground: 'var(--admin-campo)',
    filledFocusBackground: 'var(--admin-campo)',
    borderColor: 'var(--admin-borde)',
    hoverBorderColor: 'var(--admin-borde-hover)',
    focusBorderColor: 'var(--admin-acento)',
    invalidBorderColor: 'var(--admin-fallo)',
    color: 'var(--admin-texto)',
    disabledColor: 'var(--admin-texto-tenue)',
    placeholderColor: 'var(--admin-texto-tenue)',
    invalidPlaceholderColor: 'var(--admin-fallo)',
    floatLabelColor: 'var(--admin-texto-tenue)',
    floatLabelFocusColor: 'var(--admin-acento)',
    floatLabelActiveColor: 'var(--admin-texto-tenue)',
    floatLabelInvalidColor: 'var(--admin-fallo)',
    iconColor: 'var(--admin-texto-tenue)',
    shadow: 'none'
  },
  text: {
    color: 'var(--admin-texto)',
    hoverColor: 'var(--admin-texto)',
    mutedColor: 'var(--admin-texto-tenue)',
    hoverMutedColor: 'var(--admin-texto-suave)'
  },
  content: {
    background: 'var(--admin-superficie)',
    hoverBackground: 'var(--admin-superficie-hover)',
    borderColor: 'var(--admin-borde)',
    color: 'var(--admin-texto)',
    hoverColor: 'var(--admin-texto)'
  },
  overlay: {
    select: { background: 'var(--admin-flotante)', borderColor: 'var(--admin-borde)', color: 'var(--admin-texto)' },
    popover: { background: 'var(--admin-flotante)', borderColor: 'var(--admin-borde)', color: 'var(--admin-texto)' },
    modal: { background: 'var(--admin-flotante)', borderColor: 'var(--admin-borde)', color: 'var(--admin-texto)' }
  },
  list: {
    option: {
      focusBackground: 'var(--admin-superficie-hover)',
      selectedBackground: 'var(--admin-resalte)',
      selectedFocusBackground: 'var(--admin-resalte-foco)',
      color: 'var(--admin-texto-suave)',
      focusColor: 'var(--admin-texto)',
      selectedColor: 'var(--admin-acento)',
      selectedFocusColor: 'var(--admin-acento)',
      icon: { color: 'var(--admin-texto-tenue)', focusColor: 'var(--admin-texto)' }
    },
    optionGroup: { background: 'transparent', color: 'var(--admin-texto-tenue)' }
  },
  navigation: {
    item: {
      focusBackground: 'var(--admin-superficie-hover)',
      activeBackground: 'var(--admin-resalte)',
      color: 'var(--admin-texto-suave)',
      focusColor: 'var(--admin-texto)',
      activeColor: 'var(--admin-texto)',
      icon: { color: 'var(--admin-texto-tenue)', focusColor: 'var(--admin-texto)', activeColor: 'var(--admin-acento)' }
    }
  }
};

/**
 * El tema de PrimeNG, que en este proyecto solo usa el panel.
 *
 * <p>Parte de Aura y lo lleva a Material sobre vidrio: esquinas mas redondas,
 * botones en pastilla, campos con la etiqueta dentro (floatlabel "in"), foco
 * con el violeta de la IA y superficies translucidas. Los colores no se
 * escriben aqui: salen de las variables --admin-* de styles/admin-tema.css,
 * que se declaran en la raiz precisamente para que estos tokens las alcancen.
 *
 * <p>La unica excepcion son las escalas {@code surface}, que tienen que ser
 * colores concretos porque PrimeNG las usa para derivar otros (el boton
 * secundario, los botones de texto). Son la escala de Shades of Purple en
 * oscuro y una de lavanda en claro, las mismas del tema del panel.
 */
export const PresetPanel = definePreset(Aura, {
  primitive: {
    borderRadius: { none: '0', xs: '4px', sm: '8px', md: '12px', lg: '16px', xl: '24px' }
  },
  semantic: {
    focusRing: { width: '2px', style: 'solid', color: 'var(--admin-acento)', offset: '2px', shadow: 'none' },
    formField: {
      paddingX: '0.95rem',
      paddingY: '0.7rem',
      borderRadius: '{border.radius.md}',
      focusRing: {
        width: '0', style: 'none', color: 'transparent', offset: '0',
        shadow: '0 0 0 4px color-mix(in srgb, var(--admin-acento) 16%, transparent)'
      }
    },
    overlay: {
      select: { borderRadius: '{border.radius.lg}', shadow: 'var(--elev-3)' },
      popover: { borderRadius: '{border.radius.lg}', padding: '0.75rem', shadow: 'var(--elev-3)' },
      modal: { borderRadius: '{border.radius.xl}', padding: '1.5rem', shadow: 'var(--elev-3)' },
      navigation: { shadow: 'var(--elev-3)' }
    },
    list: { option: { padding: '0.6rem 0.8rem', borderRadius: '{border.radius.sm}' } },
    colorScheme: {
      light: {
        surface: {
          0: '#ffffff', 50: '#f7f6fc', 100: '#efedf8', 200: '#e1ddf1', 300: '#c9c3e3', 400: '#a39bc9',
          500: '#7d75a8', 600: '#5e5890', 700: '#463f73', 800: '#2f2a55', 900: '#1e1b3a', 950: '#120f26'
        },
        ...ESQUEMA_PANEL
      },
      dark: {
        surface: {
          0: '#ffffff', 50: '#f4f2ff', 100: '#e6e2ff', 200: '#cfc8f5', 300: '#b3aae6', 400: '#a599e9',
          500: '#7e74c2', 600: '#5b5299', 700: '#3c3775', 800: '#2d2b55', 900: '#1e1e3f', 950: '#191830'
        },
        ...ESQUEMA_PANEL
      }
    }
  },
  components: {
    // Botones en pastilla y con la etiqueta en seminegrita, como Material.
    button: {
      root: {
        borderRadius: '999px',
        roundedBorderRadius: '999px',
        paddingX: '1.15rem',
        paddingY: '0.62rem',
        label: { fontWeight: '600' }
      }
    },
    // Las pestanas de Material: sin fondo y con la barra de tinta debajo de
    // la activa, algo mas gruesa que la de Aura para que se vea.
    tabs: {
      tablist: { background: 'transparent', borderColor: 'var(--admin-borde)' },
      tab: { activeColor: 'var(--admin-acento)', activeBorderColor: 'var(--admin-acento)', padding: '0.85rem 1.2rem' },
      activeBar: { height: '3px', background: 'var(--admin-acento)' }
    },
    tag: { root: { fontSize: '0.72rem', fontWeight: '600', padding: '0.2rem 0.6rem', roundedBorderRadius: '999px' } },
    toast: { root: { borderRadius: '{border.radius.lg}' } }
  }
});
