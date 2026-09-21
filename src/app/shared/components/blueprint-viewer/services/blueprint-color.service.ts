import { Injectable } from '@angular/core';
import { BlueprintNode } from '../../../../shared/models/blueprint.model';
import { BLUEPRINT_COLOR_PALETTE } from '../utils/blueprint-constants';

type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class BlueprintColorService {

  /** Relleno de la tarjeta: un lavado de tinta, no un bloque de color. */
  getNodeFill(node: BlueprintNode, theme: Theme): string {
    const mode = BLUEPRINT_COLOR_PALETTE.modes[theme];
    return node.type === 'secondary' ? mode.nodeFill : mode.nodeFillStrong;
  }

  /** Contorno: siempre tinta del plano. */
  getNodeStroke(node: BlueprintNode, theme: Theme): string {
    return BLUEPRINT_COLOR_PALETTE.modes[theme].ink;
  }

  getNodeTextColor(node: BlueprintNode, theme: Theme): string {
    return BLUEPRINT_COLOR_PALETTE.modes[theme].ink;
  }

  /** Color del grupo, unico punto de color del plano. */
  getNodeAccent(node: BlueprintNode, theme: Theme): string {
    const group = node.group || 'default';
    const accent = BLUEPRINT_COLOR_PALETTE.accents[group] ?? BLUEPRINT_COLOR_PALETTE.accents['default'];
    return accent[theme];
  }

  getConnectorColor(highlighted: boolean, theme: Theme): string {
    const connectors = BLUEPRINT_COLOR_PALETTE.connectors[theme];
    return highlighted ? connectors.hover : connectors.default;
  }

  getNodeStrokeWidth(node: BlueprintNode): number {
    const type = node.type || 'primary';
    const typeConfig = (BLUEPRINT_COLOR_PALETTE.types as any)[type] || BLUEPRINT_COLOR_PALETTE.types.primary;
    return typeConfig.strokeWidth;
  }

  getNodeGlowColor(node: BlueprintNode, theme: Theme): string {
    return this.getNodeAccent(node, theme);
  }
}
