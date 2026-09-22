package com.juanbarrios.portfolio.domain.model;

/**
 * Enlaces del proyecto.
 *
 * Los tres pueden faltar y significan cosas distintas:
 *
 * <ul>
 *   <li>{@code github}: el repositorio.
 *   <li>{@code live}: el proyecto funcionando en algun sitio. La mayoria no lo
 *       tiene: son de clonar y desplegar.
 *   <li>{@code download}: un ejecutable publicado, normalmente una release de
 *       GitHub. Es para las aplicaciones de escritorio, que no se pueden
 *       "visitar" pero si instalar.
 * </ul>
 *
 * La ficha publica muestra {@code live} si existe y {@code download} si no. No
 * son la misma cosa con distinto nombre: uno abre una pagina y el otro baja un
 * instalador de varios cientos de megas, y el boton debe decir cual de las dos
 * va a pasar antes de que la persona lo pulse.
 */
public record ProjectLinks(String github, String live, String download) {}
