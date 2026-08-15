import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class BlueprintPathCalculator {
  
  calculatePath(
    startPoint: { x: number; y: number },
    endPoint: { x: number; y: number },
    fromSide: string,
    toSide: string,
    routeType: 'orthogonal' | 'curved' | 'straight' = 'orthogonal',
    channelOffset: number = 0
  ): string {
    if (routeType === 'curved') {
      return this.buildCurvedPath(startPoint, endPoint, fromSide, toSide);
    } else if (routeType === 'straight') {
      return this.buildStraightPath(startPoint, endPoint);
    }
    
    return this.buildOrthogonalPath(startPoint, endPoint, fromSide, toSide, channelOffset);
  }
  
  buildOrthogonalPath(
    startPoint: { x: number; y: number },
    endPoint: { x: number; y: number },
    fromSide: string,
    toSide: string,
    channelOffset: number = 0
  ): string {
    const sx = startPoint.x;
    const sy = startPoint.y;
    const ex = endPoint.x;
    const ey = endPoint.y;
    
    // Si ambos son horizontales (right/left)
    if ((fromSide === 'right' || fromSide === 'left') &&
        (toSide === 'right' || toSide === 'left')) {
      const midX = sx + (ex - sx) / 2 + channelOffset;
      return `M ${sx} ${sy} L ${midX} ${sy} L ${midX} ${ey} L ${ex} ${ey}`;
    }
    
    // Si ambos son verticales (top/bottom)
    if ((fromSide === 'top' || fromSide === 'bottom') &&
        (toSide === 'top' || toSide === 'bottom')) {
      const midY = sy + (ey - sy) / 2 + channelOffset;
      return `M ${sx} ${sy} L ${sx} ${midY} L ${ex} ${midY} L ${ex} ${ey}`;
    }
    
    // Mixto: L-shape simple
    if (fromSide === 'right' || fromSide === 'left') {
      return `M ${sx} ${sy} L ${ex} ${sy} L ${ex} ${ey}`;
    }
    
    return `M ${sx} ${sy} L ${sx} ${ey} L ${ex} ${ey}`;
  }
  
  buildCurvedPath(
    startPoint: { x: number; y: number },
    endPoint: { x: number; y: number },
    fromSide: string,
    toSide: string
  ): string {
    const sx = startPoint.x;
    const sy = startPoint.y;
    const ex = endPoint.x;
    const ey = endPoint.y;
    
    const distX = Math.abs(ex - sx);
    const controlDist = Math.min(distX / 3, 100) || 50;
    
    let cpx1 = sx;
    let cpy1 = sy;
    let cpx2 = ex;
    let cpy2 = ey;
    
    if (fromSide === 'right') cpx1 = sx + controlDist;
    if (fromSide === 'left') cpx1 = sx - controlDist;
    if (fromSide === 'bottom') cpy1 = sy + controlDist;
    if (fromSide === 'top') cpy1 = sy - controlDist;
    
    if (toSide === 'right') cpx2 = ex + controlDist;
    if (toSide === 'left') cpx2 = ex - controlDist;
    if (toSide === 'bottom') cpy2 = ey + controlDist;
    if (toSide === 'top') cpy2 = ey - controlDist;
    
    return `M ${sx} ${sy} C ${cpx1} ${cpy1} ${cpx2} ${cpy2} ${ex} ${ey}`;
  }
  
  buildStraightPath(
    startPoint: { x: number; y: number },
    endPoint: { x: number; y: number }
  ): string {
    return `M ${startPoint.x} ${startPoint.y} L ${endPoint.x} ${endPoint.y}`;
  }
}
