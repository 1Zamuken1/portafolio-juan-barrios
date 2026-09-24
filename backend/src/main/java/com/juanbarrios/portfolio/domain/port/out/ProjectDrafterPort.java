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
     * @param aviso  por donde va la redaccion; ver {@link AvisoDeEtapa}
     * @return el borrador tal como lo devolvio el proveedor, sin validar
     * @throws DrafterNoDisponibleException si no se pudo obtener respuesta
     */
    ProjectDraft draft(String nombre, String readme, AvisoDeEtapa aviso);

    /**
     * Redacta sin avisar de nada.
     *
     * El metodo con avisos es el que hay que implementar, y este es el atajo, y
     * no al reves. Si el atajo fuera el obligatorio, una implementacion podria
     * ignorar los avisos sin enterarse y el panel se quedaria mudo sin que nada
     * lo dijera.
     */
    default ProjectDraft draft(String nombre, String readme) {
        return draft(nombre, readme, AvisoDeEtapa.NINGUNO);
    }

    /**
     * Lo mismo, diciendole al redactor por que se rechazo el intento anterior.
     *
     * La implementacion por defecto ignora la correccion: los dobles de las
     * pruebas y cualquier redactor que no sepa usarla siguen funcionando, solo
     * que el reintento sale igual que el primero.
     *
     * @param correccion el motivo del rechazo anterior, tal como lo dio la
     *                   validacion; null en el primer intento.
     */
    default ProjectDraft draft(String nombre, String readme, AvisoDeEtapa aviso, String correccion) {
        return draft(nombre, readme, aviso);
    }
}
