import { Injectable } from '@angular/core';
import { BlueprintNode } from '../../../../shared/models/blueprint.model';
import { BLUEPRINT_COLOR_PALETTE } from '../utils/blueprint-constants';

@Injectable({
  providedIn: 'root'
})
export class BlueprintColorService {
  
  getNodeFill(node: BlueprintNode, theme: 'light' | 'dark'): string {
    const group = node.group || 'default';
    const groupColors = (BLUEPRINT_COLOR_PALETTE.groups as any)[group] || BLUEPRINT_COLOR_PALETTE.groups['default'];
    return groupColors[theme].fill;
  }
  
  getNodeStroke(node: BlueprintNode, theme: 'light' | 'dark'): string {
    const group = node.group || 'default';
    const groupColors = (BLUEPRINT_COLOR_PALETTE.groups as any)[group] || BLUEPRINT_COLOR_PALETTE.groups['default'];
    return groupColors[theme].stroke;
  }
  
  getNodeTextColor(node: BlueprintNode, theme: 'light' | 'dark'): string {
    const group = node.group || 'default';
    const groupColors = (BLUEPRINT_COLOR_PALETTE.groups as any)[group] || BLUEPRINT_COLOR_PALETTE.groups['default'];
    return groupColors[theme].text;
  }
  
  getConnectorColor(highlighted: boolean, theme: 'light' | 'dark'): string {
    if (highlighted) {
      return BLUEPRINT_COLOR_PALETTE.connectors[theme].hover;
    }
    return BLUEPRINT_COLOR_PALETTE.connectors[theme].default;
  }
  
  getNodeStrokeWidth(node: BlueprintNode): number {
    const type = node.type || 'primary';
    const typeConfig = (BLUEPRINT_COLOR_PALETTE.types as any)[type] || BLUEPRINT_COLOR_PALETTE.types['primary'];
    return typeConfig.strokeWidth;
  }

  getNodeGlowColor(node: BlueprintNode, theme: 'light' | 'dark'): string {
    // Retornamos el mismo color de stroke para el glow
    return this.getNodeStroke(node, theme);
  }
}
