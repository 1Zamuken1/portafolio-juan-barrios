package com.juanbarrios.portfolio.domain.port.out;

/**
 * No se pudo obtener respuesta del redactor: falta la clave, el proveedor no
 * responde, agoto la cuota o devolvio algo que no es JSON.
 *
 * Se distingue de un borrador invalido porque la accion del usuario es otra:
 * aqui no hay nada que revisar, hay que reintentar o revisar la configuracion.
 */
public class DrafterNoDisponibleException extends RuntimeException {

    public DrafterNoDisponibleException(String mensaje) {
        super(mensaje);
    }

    public DrafterNoDisponibleException(String mensaje, Throwable causa) {
        super(mensaje, causa);
    }
}
