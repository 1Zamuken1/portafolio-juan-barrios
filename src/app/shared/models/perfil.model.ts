/**
 * Los datos de cabecera del perfil, en un solo sitio.
 *
 * Antes estaban escritos a mano en seis lugares --dos plantillas, dos
 * componentes, el index y el documento de perfil-- asi que cambiar el estado
 * laboral era buscar la frase por todo el proyecto y confiar en no dejarse
 * ninguna. De hecho se quedaron tres desactualizadas durante meses,
 * anunciando que se buscaba una etapa productiva que ya estaba en marcha.
 *
 * `estado` esta pensado para cambiar: al terminar las practicas basta con
 * reescribir esa linea. `estadoVisible` permite quitarlo del todo sin
 * inventarse un texto de relleno.
 */
export interface Perfil {
  nombre: string;
  titular: string;
  especialidad: string;
  formacion: string;
  ubicacion: string;

  estado: string;
  estadoVisible: boolean;

  correo: string;
  github: string;
  linkedin: string;
}
