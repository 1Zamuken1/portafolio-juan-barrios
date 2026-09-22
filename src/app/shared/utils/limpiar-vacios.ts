/**
 * Quita de un objeto todo lo que está vacío, antes de enviarlo a la API.
 *
 * El backend hace una actualización parcial: lo que no llega se conserva. Eso
 * solo protege si lo que no se quiere tocar **no se envía**. Mandar una cadena
 * vacía no es "no lo toques", es "déjalo vacío", y así es como se perdió el
 * contenido del portafolio dos veces desde este formulario.
 *
 * **Tiene que ser recursivo.** Una primera versión solo miraba el primer nivel
 * y dejaba pasar `links: { github: '', live: '' }` entero, porque un objeto no
 * es una cadena vacía. El resultado, comprobado sobre un proyecto real, fue
 * guardar `"live": ""` en tres proyectos donde ese campo sencillamente no
 * existía — ruido que habría acabado en `projects.json` en el siguiente
 * `mirror:pull`.
 *
 * Reglas:
 *
 * - `''`, `null` y `undefined` se quitan.
 * - Un array vacío se quita. Mandar `[]` borraría la lista del otro lado.
 * - Un objeto se limpia por dentro; si se queda sin claves, se quita entero.
 * - **Un array con contenido se deja intacto**, sin entrar en sus elementos.
 *   Los desafíos son pares título/descripción y limpiarlos por dentro dejaría
 *   a medias los que solo tuvieran uno de los dos, que es peor que enviarlos
 *   tal cual y dejar que el backend decida.
 *
 * Nota sobre los grupos anidados: la fusión parcial del backend trabaja campo a
 * campo del proyecto, así que `links` se reemplaza entero. Enviar
 * `{ github: '...' }` sin `live` no conserva el `live` anterior, lo elimina.
 * Es lo que se quiere: permite borrar un enlace vaciando su casilla, mientras
 * que un grupo entero vacío ni se envía y no toca nada.
 */
export function limpiarVacios<T>(valor: T): T | undefined {
  if (valor === '' || valor === null || valor === undefined) return undefined;

  if (Array.isArray(valor)) {
    return valor.length === 0 ? undefined : valor;
  }

  // Solo objetos planos. Un Date o cualquier otra instancia se deja pasar.
  if (typeof valor === 'object' && Object.getPrototypeOf(valor) === Object.prototype) {
    const limpio: Record<string, unknown> = {};
    for (const [clave, dentro] of Object.entries(valor as Record<string, unknown>)) {
      const resultado = limpiarVacios(dentro);
      if (resultado !== undefined) limpio[clave] = resultado;
    }
    return Object.keys(limpio).length === 0 ? undefined : (limpio as T);
  }

  return valor;
}
