package com.juanbarrios.portfolio.application.support;

import java.lang.reflect.Field;
import java.lang.reflect.Modifier;

/**
 * Fusiona lo que llega sobre lo que ya existe, conservando los campos que el
 * cliente no envia.
 *
 * Una actualizacion reemplazaba el registro entero, asi que cualquier cliente
 * que conociera menos campos que el modelo borraba el resto en silencio. El
 * formulario del panel de administracion conoce 13 de los 31 campos de un
 * proyecto: guardar desde ahi habria borrado los diagramas de arquitectura,
 * las secciones del readme, el stack estructurado y las metricas. Lo mismo con
 * categoryColor en los skills.
 *
 * Se resuelve aqui y no en el formulario a proposito: protege frente a
 * cualquier cliente incompleto, presente o futuro, en vez de depender de que
 * cada uno se acuerde de enviarlo todo.
 *
 * <p><b>Limitacion conocida:</b> con esta semantica no se puede vaciar un campo
 * enviandolo a null, porque null significa "no lo toques". Para vaciarlo hay
 * que editarlo en el JSON y subirlo con el espejo. Los campos primitivos
 * (int, boolean) quedan fuera de la fusion: no pueden ser null, asi que no hay
 * forma de distinguir "no enviado" de "enviado con su valor por defecto".
 */
public final class PartialMerge {

    private PartialMerge() {}

    /**
     * Copia sobre {@code existente} los campos no nulos de {@code entrante} y
     * devuelve el resultado.
     *
     * @param existente el registro tal como esta guardado
     * @param entrante  lo que envio el cliente
     */
    public static <T> T merge(T existente, T entrante) {
        if (existente == null) return entrante;
        if (entrante == null) return existente;

        for (Field campo : entrante.getClass().getDeclaredFields()) {
            if (Modifier.isStatic(campo.getModifiers()) || Modifier.isFinal(campo.getModifiers())) {
                continue;
            }
            // Los primitivos nunca son null: no se puede saber si el cliente
            // los envio o si Jackson los dejo en su valor por defecto.
            if (campo.getType().isPrimitive()) continue;

            campo.setAccessible(true);
            try {
                Object valor = campo.get(entrante);
                if (valor != null) {
                    campo.set(existente, valor);
                }
            } catch (IllegalAccessException e) {
                throw new IllegalStateException(
                        "No se pudo fusionar el campo " + campo.getName(), e);
            }
        }
        return existente;
    }
}
