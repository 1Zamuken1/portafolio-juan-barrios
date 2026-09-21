import { Injectable } from '@angular/core';

export interface ObstacleRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

type Point = { x: number; y: number };

/** Separacion entre la ruta y el borde del nodo que esquiva. */
const LANE_GAP = 34;

/** Tramo recto que sale del puerto antes de girar hacia el carril de desvio. */
const PORT_STUB = 32;

/** Holgura al comprobar si un tramo entra en un nodo: evita falsos positivos en los bordes. */
const HIT_TOLERANCE = 2;

/** Separacion entre carriles paralelos cuando dos rutas comparten corredor. */
const CHANNEL_SPACING = 14;

/** Desplazamientos que se prueban al buscar carril libre, en orden. */
const CHANNEL_TRIES = [0, 1, -1, 2, -2, 3, -3, 4, -4];

@Injectable({
  providedIn: 'root'
})
export class BlueprintPathCalculator {

  calculatePath(
    startPoint: Point,
    endPoint: Point,
    fromSide: string,
    toSide: string,
    routeType: 'orthogonal' | 'curved' | 'straight' = 'orthogonal',
    channelOffset: number = 0,
    obstacles: ObstacleRect[] = []
  ): string {
    if (routeType === 'curved') {
      return this.buildCurvedPath(startPoint, endPoint, fromSide, toSide);
    } else if (routeType === 'straight') {
      return this.buildStraightPath(startPoint, endPoint);
    }

    return this.buildOrthogonalPath(startPoint, endPoint, fromSide, toSide, channelOffset, obstacles);
  }

  /**
   * Igual que calculatePath pero devuelve los vertices, para poder
   * post-procesar las rutas antes de serializarlas.
   */
  calculateRoutePoints(
    startPoint: Point,
    endPoint: Point,
    fromSide: string,
    toSide: string,
    channelOffset: number = 0,
    obstacles: ObstacleRect[] = []
  ): Point[] {
    const candidates = this.buildCandidates(startPoint, endPoint, fromSide, toSide, channelOffset);
    if (!obstacles.length) return candidates[0];

    let best = candidates[0];
    let bestHits = Infinity;
    for (const points of candidates) {
      const hits = this.countCollisions(points, obstacles);
      if (hits === 0) return points;
      if (hits < bestHits) {
        bestHits = hits;
        best = points;
      }
    }
    return best;
  }

  /**
   * Reparte en carriles paralelos los tramos que dos rutas distintas comparten.
   *
   * El offset por par de nodos no basta: dos aristas sin relacion pueden
   * coincidir en el mismo corredor y dibujarse una encima de la otra. Aqui se
   * recorren los tramos interiores y, si el carril ya esta ocupado, se desplaza
   * al primero libre que no choque con ningun nodo.
   *
   * Solo se mueven tramos interiores: el primero y el ultimo estan anclados al
   * puerto y no pueden despegarse del borde del nodo.
   */
  separateChannels(routes: Array<Point[] | null>, obstaclesPerRoute: ObstacleRect[][]): void {
    // carril ocupado -> intervalos [min, max] ya reservados
    const lanes = new Map<string, Array<[number, number]>>();

    const reserve = (key: string, min: number, max: number) => {
      const list = lanes.get(key);
      if (list) list.push([min, max]);
      else lanes.set(key, [[min, max]]);
    };

    const libre = (key: string, min: number, max: number) => {
      const list = lanes.get(key);
      if (!list) return true;
      return !list.some(([a, b]) => Math.min(max, b) - Math.max(min, a) > 1);
    };

    routes.forEach((points, routeIndex) => {
      if (!points || points.length < 3) return;
      const obstacles = obstaclesPerRoute[routeIndex] ?? [];

      for (let i = 1; i < points.length - 2; i++) {
        const a = points[i];
        const b = points[i + 1];

        const horizontal = Math.abs(a.y - b.y) < 0.001;
        const vertical = Math.abs(a.x - b.x) < 0.001;
        if (!horizontal && !vertical) continue;

        const axis = horizontal ? 'h' : 'v';
        const base = horizontal ? a.y : a.x;
        const min = horizontal ? Math.min(a.x, b.x) : Math.min(a.y, b.y);
        const max = horizontal ? Math.max(a.x, b.x) : Math.max(a.y, b.y);

        let elegido = base;
        for (const paso of CHANNEL_TRIES) {
          const candidato = base + paso * CHANNEL_SPACING;
          const key = `${axis}:${Math.round(candidato)}`;
          if (!libre(key, min, max)) continue;

          // Un carril libre no sirve si atraviesa una tarjeta.
          const probeA = horizontal ? { x: a.x, y: candidato } : { x: candidato, y: a.y };
          const probeB = horizontal ? { x: b.x, y: candidato } : { x: candidato, y: b.y };
          if (obstacles.some(r => this.segmentHitsRect(probeA, probeB, r))) continue;

          elegido = candidato;
          break;
        }

        if (horizontal) {
          a.y = elegido;
          b.y = elegido;
        } else {
          a.x = elegido;
          b.x = elegido;
        }
        reserve(`${axis}:${Math.round(elegido)}`, min, max);
      }
    });
  }

  /** Construye una ruta a partir de puntos de flexion explicitos del JSON. */
  buildPathFromPoints(points: Point[]): string {
    if (!points.length) return '';
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }

  /**
   * Ruta ortogonal entre dos puertos.
   *
   * Cuando se pasan obstaculos, se generan rutas alternativas que rodean los
   * nodos intermedios y se elige la primera sin cruces. Sin obstaculos el
   * comportamiento es el de siempre: una Z o una L directa.
   */
  buildOrthogonalPath(
    startPoint: Point,
    endPoint: Point,
    fromSide: string,
    toSide: string,
    channelOffset: number = 0,
    obstacles: ObstacleRect[] = []
  ): string {
    const candidates = this.buildCandidates(startPoint, endPoint, fromSide, toSide, channelOffset);

    if (!obstacles.length) {
      return this.buildPathFromPoints(candidates[0]);
    }

    let best = candidates[0];
    let bestHits = Infinity;

    for (const points of candidates) {
      const hits = this.countCollisions(points, obstacles);
      if (hits === 0) return this.buildPathFromPoints(points);
      if (hits < bestHits) {
        bestHits = hits;
        best = points;
      }
    }

    // Ninguna alternativa queda limpia: se usa la que menos nodos cruza.
    return this.buildPathFromPoints(best);
  }

  /**
   * Rutas candidatas, de la mas directa a la mas rodeada. El orden importa:
   * se devuelve la primera sin colisiones.
   */
  private buildCandidates(
    start: Point,
    end: Point,
    fromSide: string,
    toSide: string,
    channelOffset: number
  ): Point[][] {
    const { x: sx, y: sy } = start;
    const { x: ex, y: ey } = end;

    const vertical = (fromSide === 'top' || fromSide === 'bottom') &&
                     (toSide === 'top' || toSide === 'bottom');
    const horizontal = (fromSide === 'right' || fromSide === 'left') &&
                       (toSide === 'right' || toSide === 'left');

    if (horizontal) {
      const midX = sx + (ex - sx) / 2 + channelOffset;
      const direct: Point[] = [
        { x: sx, y: sy }, { x: midX, y: sy }, { x: midX, y: ey }, { x: ex, y: ey }
      ];
      // Desvios por encima y por debajo del bloque de nodos intermedios.
      return [direct, ...this.sideDetours(start, end, fromSide, 'horizontal')];
    }

    if (vertical) {
      const midY = sy + (ey - sy) / 2 + channelOffset;
      const direct: Point[] = [
        { x: sx, y: sy }, { x: sx, y: midY }, { x: ex, y: midY }, { x: ex, y: ey }
      ];
      return [direct, ...this.sideDetours(start, end, fromSide, 'vertical')];
    }

    // Mixto: L simple, con la alternativa de girar en el otro orden.
    if (fromSide === 'right' || fromSide === 'left') {
      return [
        [{ x: sx, y: sy }, { x: ex, y: sy }, { x: ex, y: ey }],
        [{ x: sx, y: sy }, { x: sx, y: ey }, { x: ex, y: ey }]
      ];
    }

    return [
      [{ x: sx, y: sy }, { x: sx, y: ey }, { x: ex, y: ey }],
      [{ x: sx, y: sy }, { x: ex, y: sy }, { x: ex, y: ey }]
    ];
  }

  /**
   * Desvios laterales: sale del puerto, se aparta a un carril libre, recorre la
   * distancia y vuelve a entrar de frente al puerto destino.
   */
  private sideDetours(start: Point, end: Point, fromSide: string, axis: 'vertical' | 'horizontal'): Point[][] {
    const { x: sx, y: sy } = start;
    const { x: ex, y: ey } = end;
    const routes: Point[][] = [];

    if (axis === 'vertical') {
      const stubDir = fromSide === 'bottom' ? 1 : -1;
      const stubY = sy + stubDir * PORT_STUB;
      const approachY = ey - stubDir * PORT_STUB;
      const span = Math.max(Math.abs(ex - sx), 0) / 2 + LANE_GAP + 125;

      for (const dir of [1, -1]) {
        const laneX = (sx + ex) / 2 + dir * span;
        routes.push([
          { x: sx, y: sy },
          { x: sx, y: stubY },
          { x: laneX, y: stubY },
          { x: laneX, y: approachY },
          { x: ex, y: approachY },
          { x: ex, y: ey }
        ]);
      }
      return routes;
    }

    const stubDir = fromSide === 'right' ? 1 : -1;
    const stubX = sx + stubDir * PORT_STUB;
    const approachX = ex - stubDir * PORT_STUB;
    const span = Math.max(Math.abs(ey - sy), 0) / 2 + LANE_GAP + 48;

    for (const dir of [1, -1]) {
      const laneY = (sy + ey) / 2 + dir * span;
      routes.push([
        { x: sx, y: sy },
        { x: stubX, y: sy },
        { x: stubX, y: laneY },
        { x: approachX, y: laneY },
        { x: approachX, y: ey },
        { x: ex, y: ey }
      ]);
    }
    return routes;
  }

  /** Numero de nodos que algun tramo de la ruta atraviesa. */
  private countCollisions(points: Point[], obstacles: ObstacleRect[]): number {
    let hits = 0;
    for (const rect of obstacles) {
      for (let i = 0; i < points.length - 1; i++) {
        if (this.segmentHitsRect(points[i], points[i + 1], rect)) {
          hits++;
          break;
        }
      }
    }
    return hits;
  }

  private segmentHitsRect(a: Point, b: Point, rect: ObstacleRect): boolean {
    const left = rect.x + HIT_TOLERANCE;
    const right = rect.x + rect.width - HIT_TOLERANCE;
    const top = rect.y + HIT_TOLERANCE;
    const bottom = rect.y + rect.height - HIT_TOLERANCE;

    // Tramo horizontal
    if (Math.abs(a.y - b.y) < 0.001) {
      if (a.y <= top || a.y >= bottom) return false;
      return Math.max(Math.min(a.x, b.x), left) < Math.min(Math.max(a.x, b.x), right);
    }

    // Tramo vertical
    if (Math.abs(a.x - b.x) < 0.001) {
      if (a.x <= left || a.x >= right) return false;
      return Math.max(Math.min(a.y, b.y), top) < Math.min(Math.max(a.y, b.y), bottom);
    }

    return false;
  }

  buildCurvedPath(
    startPoint: Point,
    endPoint: Point,
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
    startPoint: Point,
    endPoint: Point
  ): string {
    return `M ${startPoint.x} ${startPoint.y} L ${endPoint.x} ${endPoint.y}`;
  }
}
