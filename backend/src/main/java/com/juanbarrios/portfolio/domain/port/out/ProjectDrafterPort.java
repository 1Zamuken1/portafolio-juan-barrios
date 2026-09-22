package com.juanbarrios.portfolio.domain.port.out;

import com.juanbarrios.portfolio.domain.model.ProjectDraft;

/**
 * Puerto de salida hacia quien sepa redactar un borrador a partir de un readme.
 *
 * El dominio no sabe que detras hay un modelo de lenguaje, ni cual. Eso permite
 * dos cosas: cambiar de proveedor sin tocar el caso de uso, y probar el caso de
 * uso en CI, que no tiene clave de API ni debe gastar llamadas de pago.
 */
public interface ProjectDrafterPort {

    /**
     * @param nombre nombre del proyecto, para orientar la redaccion
     * @param readme texto fuente del que se extrae el contenido
     * @return el borrador tal como lo devolvio el proveedor, sin validar
     * @throws DrafterNoDisponibleException si no se pudo obtener respuesta
     */
    ProjectDraft draft(String nombre, String readme);
}
