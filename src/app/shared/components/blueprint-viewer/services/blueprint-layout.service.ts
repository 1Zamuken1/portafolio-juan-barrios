import { Injectable } from '@angular/core';
import { BlueprintNode, ComputedNodeLayout } from '../../../../shared/models/blueprint.model';
import { BlueprintMathUtils } from '../utils/blueprint-math.utils';

@Injectable({
  providedIn: 'root'
})
export class BlueprintLayoutService {
  calculateNodeLayout(node: BlueprintNode): ComputedNodeLayout {
    const width = node.width ?? 250;
    const height = node.height ?? 96;
    const x = node.x ?? 0;
    const y = node.y ?? 0;
    
    return {
      nodeId: node.id,
      x,
      y,
      width,
      height,
      centerX: x + width / 2,
      centerY: y + height / 2,
      ports: { top: [], bottom: [], left: [], right: [] } // Se llenará en el positioning service
    };
  }

  validatePositions(nodes: BlueprintNode[]): boolean {
    // Validar que todos los nodos tengan coordenadas (x,y)
    return nodes.every(n => n.x !== undefined && n.y !== undefined);
  }
}
