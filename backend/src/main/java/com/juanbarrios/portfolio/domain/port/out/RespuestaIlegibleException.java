package com.juanbarrios.portfolio.domain.port.out;

/**
 * El redactor respondio, pero lo que devolvio no se puede leer como un
 * borrador: vino vacio, se corto antes de escribir la ficha, o no era JSON.
 *
 * <p>Es un {@link DrafterNoDisponibleException} para que todo lo que ya sabe
 * tratar un fallo del proveedor lo siga tratando igual. Lo que la distingue es
 * que <b>vale la pena reintentarla</b>: el proveedor esta en pie y el modelo
 * fallo en esta respuesta concreta, que es justo lo que un segundo intento
 * suele arreglar. Un 401, un 429 o un corte de red, en cambio, saldrian igual
 * la segunda vez y solo gastarian cuota.
 */
public class RespuestaIlegibleException extends DrafterNoDisponibleException {

    public RespuestaIlegibleException(String mensaje) {
        super(mensaje);
    }

    public RespuestaIlegibleException(String mensaje, Throwable causa) {
        super(mensaje, causa);
    }
}
