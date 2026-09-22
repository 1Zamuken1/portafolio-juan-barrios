package com.juanbarrios.portfolio.application.usecase;

/**
 * El redactor respondio, pero lo que devolvio no sirve para rellenar el
 * formulario: le faltan campos, los dejo vacios o se desvio del formato.
 *
 * El mensaje dice que campo fallo, porque el destinatario es la persona que
 * esta usando el panel y su siguiente paso es volver a intentarlo o mejorar el
 * readme de entrada.
 */
public class BorradorInvalidoException extends RuntimeException {

    public BorradorInvalidoException(String mensaje) {
        super(mensaje);
    }
}
