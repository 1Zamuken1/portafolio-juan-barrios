import { BlueprintEdge, BlueprintNode, ComputedNodeLayout } from '../../../models/blueprint.model';
import { BlueprintLayoutService } from './blueprint-layout.service';
import { BlueprintPathCalculator } from './blueprint-path-calculator';
import { BlueprintPositioningService } from './blueprint-positioning.service';

export interface ComputedConnector {
  id: string;
  from: string;
  to: string;
  path: string;
  label?: string;
  labelX: number;
  labelY: number;
  strokeWidth: number;
  strokeDasharray: string;
}

export type ExtendedBlueprintNode = BlueprintNode & ComputedNodeLayout;

/** Los servicios que usa el trazado. Se pasan para poder probarlo sin Angular. */
export interface ServiciosTrazado {
  layout: BlueprintLayoutService;
  positioning: BlueprintPositioningService;
  path: BlueprintPathCalculator;
}

export function serviciosPorDefecto(): ServiciosTrazado {
  return {
    layout: new BlueprintLayoutService(),
    positioning: new BlueprintPositioningService(),
    path: new BlueprintPathCalculator()
  };
}

/**
 * Los nodos con su caja calculada.
 *
 * Estaba dentro del componente, como un computed(), junto con el trazado de
 * los conectores: toda la logica del router del visor sin poder probarse sin
 * montar Angular. Aqui es una funcion pura, y el componente solo la llama.
 */
export function colocarNodos(
  nodes: BlueprintNode[], edges: BlueprintEdge[], s: ServiciosTrazado = serviciosPorDefecto()
): ExtendedBlueprintNode[] {
  if (!nodes.length) return [];
  const validated = nodes.map(n => s.layout.calculateNodeLayout(n));
  const withPorts = validated.map(n => ({ ...n, ports: s.positioning.calculatePorts(n, edges) }));
  return nodes.map(originalNode => {
    const computedLayout = withPorts.find(l => l.nodeId === originalNode.id)!;
    return { ...originalNode, ...computedLayout } as ExtendedBlueprintNode;
  });
}

/** Los conectores de un diagrama: por donde va cada arista. */
export function trazarConectores(
  edges: BlueprintEdge[], nodes: ExtendedBlueprintNode[], s: ServiciosTrazado = serviciosPorDefecto()
): ComputedConnector[] {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // 1. Resolver el lado de salida y de entrada de cada arista.
  const resolved = edges
    .map(edge => {
      const fromNode = nodeMap.get(edge.from);
      const toNode = nodeMap.get(edge.to);
      if (!fromNode || !toNode) return null;

      const fromSide = edge.fromPort && edge.fromPort !== 'auto'
        ? edge.fromPort
        : s.positioning.autoDetectPort(fromNode, toNode, true);

      const toSide = edge.toPort && edge.toPort !== 'auto'
        ? edge.toPort
        : s.positioning.autoDetectPort(fromNode, toNode, false);

      return { edge, fromNode, toNode, fromSide, toSide };
    })
    .filter(r => r !== null) as Array<{
      edge: BlueprintEdge;
      fromNode: ExtendedBlueprintNode;
      toNode: ExtendedBlueprintNode;
      fromSide: string;
      toSide: string;
    }>;

  const esVertical = (side: string) => side === 'top' || side === 'bottom';
  const conRuta = (e: BlueprintEdge) => !e.bendPoints?.length;

  // 2. Contar conexiones por lado. Las aristas con bendPoints no reservan
  //    puerto: su recorrido es literal y no pasa por el reparto.
  const sideTotals = new Map<string, number>();
  const bump = (key: string) => sideTotals.set(key, (sideTotals.get(key) ?? 0) + 1);
  for (const r of resolved) {
    if (!conRuta(r.edge)) continue;
    bump(`${r.edge.from}-${r.fromSide}`);
    bump(`${r.edge.to}-${r.toSide}`);
  }

  // 3. Ordenar los puertos de cada lado por la posicion del otro extremo.
  //    Sin esto el reparto sigue el orden de declaracion del JSON, que es
  //    arbitrario, y dos aristas del mismo lado pueden salir cruzadas.
  const ordenPuerto = new Map<string, number>();
  const grupos = new Map<string, Array<{ idx: number; clave: number; lejania: number }>>();

  resolved.forEach((r, i) => {
    if (!conRuta(r.edge)) return;
    const ejeDe = (n: ExtendedBlueprintNode, side: string) => esVertical(side) ? n.centerX : n.centerY;
    const dist = Math.hypot(r.toNode.centerX - r.fromNode.centerX, r.toNode.centerY - r.fromNode.centerY);

    for (const [key, clave] of [
      [`${r.edge.from}-${r.fromSide}`, ejeDe(r.toNode, r.fromSide)],
      [`${r.edge.to}-${r.toSide}`, ejeDe(r.fromNode, r.toSide)]
    ] as Array<[string, number]>) {
      const lista = grupos.get(key) ?? [];
      lista.push({ idx: i, clave, lejania: dist });
      grupos.set(key, lista);
    }
  });

  for (const [key, lista] of grupos) {
    // A igual posicion del destino, el mas cercano primero.
    lista.sort((a, b) => a.clave - b.clave || a.lejania - b.lejania);
    lista.forEach((item, orden) => ordenPuerto.set(`${key}#${item.idx}`, orden));
  }

  // Obstaculos de cada arista: todos los nodos menos sus dos extremos.
  const obstaclesFor = (edge: BlueprintEdge) => nodes
    .filter(n => n.id !== edge.from && n.id !== edge.to)
    .map(n => ({ x: n.x, y: n.y, width: n.width, height: n.height }));

  // 4. Trazado.
  const segmentUsed = new Map<string, number>();

  const trazos = resolved.map(({ edge, fromNode, toNode, fromSide, toSide }, i) => {
    const fromKey = `${edge.from}-${fromSide}`;
    const toKey = `${edge.to}-${toSide}`;

    const fromPort = s.positioning.portPosition(
      fromNode, fromSide, ordenPuerto.get(`${fromKey}#${i}`) ?? 0, sideTotals.get(fromKey) ?? 1
    );
    const toPort = s.positioning.portPosition(
      toNode, toSide, ordenPuerto.get(`${toKey}#${i}`) ?? 0, sideTotals.get(toKey) ?? 1
    );

    const obstacles = obstaclesFor(edge);

    // Los bendPoints del JSON mandan sobre el calculo automatico. Son el
    // escape para los casos en que el trazado automatico no queda limpio.
    if (edge.bendPoints?.length) {
      const puntos = edge.bendPoints;
      return {
        edge, obstacles, points: null,
        fromPort: puntos[0],
        toPort: puntos[puntos.length - 1],
        path: s.path.buildPathFromPoints(puntos)
      };
    }

    // Separacion entre aristas paralelas que unen el mismo par de nodos.
    const segmentKey = [edge.from, edge.to].sort().join('-');
    const segmentCount = segmentUsed.get(segmentKey) ?? 0;
    segmentUsed.set(segmentKey, segmentCount + 1);
    const offset = segmentCount * 12;

    const routeType = edge.routeType ?? 'orthogonal';
    if (routeType !== 'orthogonal') {
      return {
        edge, fromPort, toPort, obstacles, points: null,
        path: s.path.calculatePath(fromPort, toPort, fromSide, toSide, routeType, offset, obstacles)
      };
    }

    return {
      edge, fromPort, toPort, obstacles,
      points: s.path.calculateRoutePoints(fromPort, toPort, fromSide, toSide, offset, obstacles),
      path: ''
    };
  });

  // 5. Repartir en carriles los tramos que varias rutas comparten, para que
  //    no se dibujen una encima de otra.
  s.path.separateChannels(
    trazos.map(t => t.points),
    trazos.map(t => t.obstacles)
  );

  return trazos.map(({ edge, fromPort, toPort, points, path }) => ({
    id: `${edge.from}→${edge.to}`,
    from: edge.from,
    to: edge.to,
    path: points ? s.path.buildPathFromPoints(points) : path,
    label: edge.label,
    labelX: (fromPort.x + toPort.x) / 2,
    labelY: (fromPort.y + toPort.y) / 2,
    strokeWidth: edge.strokeWidth ?? 2,
    strokeDasharray: edge.strokeDasharray ?? '6 4',
  }));
}
