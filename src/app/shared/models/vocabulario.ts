import vocabulario from '../../../assets/data/vocabulario.json';

/**
 * El vocabulario de los campos estructurados de una ficha.
 *
 * Vive en src/assets/data/vocabulario.json porque lo leen tres sitios: la
 * ficha publica (los rotulos), las pruebas (que los datos lo cumplan) y el
 * backend (que el redactor no se salga de el; su copia en Java se compara con
 * este fichero en VocabularioTest).
 *
 * Antes cada proyecto usaba sus claves: convivian "Arquitectura" y
 * "Architecture", "IA" y "Artificial Intelligence", y tres "Formatos de
 * exportacion" que solo cambiaban en idioma y mayusculas. Por eso el redactor
 * no generaba estos campos: habria heredado el desorden.
 */

/** Las capas de structuredStack, en el orden en que se ensenan. */
export const CAPAS_STACK: ReadonlyArray<{ clave: string; titulo: string }> =
  vocabulario.stack.map(({ clave, titulo }) => ({ clave, titulo }));

/** Los grupos de structuredFeatures que valen para cualquier proyecto. Los
 *  del dominio (Finanzas, Catalogo...) son libres. */
export const GRUPOS_COMUNES: ReadonlyArray<string> = vocabulario.caracteristicas.map((c) => c.titulo);

const TITULO_CAPA = new Map(CAPAS_STACK.map((c) => [c.clave, c.titulo]));

/** El rotulo de una capa del stack; una clave desconocida sale tal cual. */
export function tituloCapa(clave: string): string {
  return TITULO_CAPA.get(clave) ?? clave;
}
