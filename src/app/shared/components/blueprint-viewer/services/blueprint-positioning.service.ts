import { Injectable } from '@angular/core';
import { BlueprintEdge, ComputedNodeLayout } from '../../../../shared/models/blueprint.model';
import { BLUEPRINT_SPACING } from '../utils/blueprint-constants';

@Injectable({
  providedIn: 'root'
})
export class BlueprintPositioningService {
  
  calculatePorts(node: ComputedNodeLayout, edges: BlueprintEdge[]): ComputedNodeLayout['ports'] {
    const { x, y, width, height } = node;
    const margin = BLUEPRINT_SPACING.portMargin;
    
    const ports = { top: [], bottom: [], left: [], right: [] } as any;
    const sides = ['top', 'bottom', 'left', 'right'] as const;
    
    for (const side of sides) {
      // Count edges that specifically use this side as a port
      const sideEdges = edges.filter(e => {
        // Check if this edge starts from this node on this side
        const isFrom = e.from === node.nodeId && (e.fromPort === side);
        // Check if this edge arrives to this node on this side
        const isTo = e.to === node.nodeId && (e.toPort === side);
        return isFrom || isTo;
      });
      
      for (let i = 0; i < sideEdges.length; i++) {
        const port = this.calculatePortPosition(x, y, width, height, side, i, sideEdges.length, margin);
        ports[side].push(port);
      }
    }
    
    // Also handle edges with no explicit port (auto-detect) - add center ports for those
    const autoEdges = edges.filter(e =>
      (e.from === node.nodeId && !e.fromPort) ||
      (e.to === node.nodeId && !e.toPort)
    );
    
    for (const edge of autoEdges) {
      if (edge.from === node.nodeId && !edge.fromPort) {
        // Will use auto-detect at render time, but we need a port entry
        // Add a center port to the auto-detected side (placeholder)
        // The actual side is determined in computedConnectors
      }
      if (edge.to === node.nodeId && !edge.toPort) {
        // Same for incoming auto edges
      }
    }
    
    return ports;
  }
  
  private calculatePortPosition(x: number, y: number, w: number, h: number, side: string, index: number, total: number, margin: number): { x: number; y: number } {
    const step = (side === 'top' || side === 'bottom')
      ? (w - margin * 2) / Math.max(total - 1, 1)
      : (h - margin * 2) / Math.max(total - 1, 1);
      
    // Si hay una sola conexión, usar el centro del lado
    if (total === 1 || (total - 1) === 0) {
      if (side === 'top') return { x: x + w/2, y: y };
      if (side === 'bottom') return { x: x + w/2, y: y + h };
      if (side === 'left') return { x: x, y: y + h/2 };
      if (side === 'right') return { x: x + w, y: y + h/2 };
    }
    
    switch (side) {
      case 'top': return { x: x + margin + index * step, y: y };
      case 'bottom': return { x: x + margin + index * step, y: y + h };
      case 'left': return { x: x, y: y + margin + index * step };
      case 'right': return { x: x + w, y: y + margin + index * step };
      default: return { x: x + w/2, y: y + h/2 };
    }
  }

  autoDetectPort(fromNode: ComputedNodeLayout, toNode: ComputedNodeLayout, isSource: boolean): 'top' | 'bottom' | 'left' | 'right' {
    const dx = toNode.centerX - fromNode.centerX;
    const dy = toNode.centerY - fromNode.centerY;
    
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    
    if (isSource) {
      // Puerto de salida
      if (absDx > absDy) return dx > 0 ? 'right' : 'left';
      return dy > 0 ? 'bottom' : 'top';
    } else {
      // Puerto de entrada
      if (absDx > absDy) return dx > 0 ? 'left' : 'right';
      return dy > 0 ? 'top' : 'bottom';
    }
  }
}
