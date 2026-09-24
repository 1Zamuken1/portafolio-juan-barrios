/**
 * El slug de un proyecto a partir de su nombre: minusculas, sin acentos, con
 * guiones. "Salsamentaría 2" -> "salsamentaria-2".
 *
 * El slug no sale en ninguna URL (esas van por id), pero es lo que usa el
 * espejo para emparejar la base con el JSON y conservar el id de cada
 * proyecto entre volcados. Dos proyectos sin slug se emparejaban entre si:
 * paso con el primero que se publico desde el panel sin rellenarlo.
 */
export function aSlug(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
