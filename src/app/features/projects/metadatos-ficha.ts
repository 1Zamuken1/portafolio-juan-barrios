import { Project } from '../../shared/models/project.model';

/** Un dato de la cabecera de la ficha. */
export interface MetadatoFicha {
  etiqueta: string;
  valor: string;
}

/** Lo que se escribe en un campo para decir que no hay nada. */
const VACIOS = new Set(['', 'n/a', 'na', 'ninguno', 'ninguna', '-', '—']);

/**
 * Los datos de la cabecera de la ficha que existen, en su orden.
 *
 * Antes se pintaban las diez etiquetas siempre, y un proyecto sin rol ni IA
 * enseñaba "Rol:" e "IA:" con nada detrás, o "N/A". Un hueco se lee como un
 * fallo de la página y un "N/A" como un dato; lo honesto es no ponerlo.
 */
export function metadatosFicha(p: Project): MetadatoFicha[] {
  const equipo = p.teamSize
    ? `${p.teamSize} ${p.teamSize === 1 ? 'desarrollador' : 'desarrolladores'}`
    : '';
  const filas: [string, unknown][] = [
    ['Rol', p.role],
    ['Proyecto', p.type],
    ['Año', p.year],
    ['Estado', p.status],
    ['Equipo', equipo],
    ['Backend', p.structuredStack?.['backend']?.join(' / ')],
    ['Frontend', p.structuredStack?.['frontend']?.join(' + ')],
    ['Base de datos', p.databaseArchitecture],
    ['IA', p.aiArchitecture],
    ['Arquitectura', p.coreArchitecture]
  ];
  return filas
    .map(([etiqueta, v]) => ({ etiqueta, valor: v == null ? '' : String(v).trim() }))
    .filter((m) => !VACIOS.has(m.valor.toLowerCase()));
}
