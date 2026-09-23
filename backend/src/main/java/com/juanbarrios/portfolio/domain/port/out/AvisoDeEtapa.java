package com.juanbarrios.portfolio.domain.port.out;

/**
 * Por donde va la redaccion de un borrador, mientras ocurre.
 *
 * <p>Redactar tarda unos ocho segundos y casi todos son la llamada al modelo.
 * Con una sola respuesta al final, quien esta delante del panel ve un boton
 * girando y no sabe si esta pensando, si se colgo, o si va a fallar. Estos
 * avisos existen para que se vea en que paso esta.
 *
 * <p>No son decoracion: cada uno lleva el dato que solo se conoce en ese
 * momento y que despues se pierde. Que modelo respondio de la lista, si hubo que
 * bajar al de reserva porque retiraron el primero, cuanto tardo, cuanto texto
 * volvio. Eso mismo es lo que hizo falta el dia que Groq retiro
 * {@code llama-3.3-70b-versatile} y el sintoma visible era un 404 a secas.
 *
 * <p>Es un puerto de salida y no un logger a proposito: el dominio no decide si
 * esto acaba en la consola del servidor, en una respuesta en streaming o en
 * ningun sitio. Quien llama al caso de uso lo decide.
 */
@FunctionalInterface
public interface AvisoDeEtapa {

    /**
     * @param etapa clave estable de la etapa: {@code entrada}, {@code modelo},
     *              {@code respuesta}, {@code parseo} o {@code validacion}.
     *              Estable porque la interfaz la usa para saber que pintar; el
     *              detalle es para leer, la clave es para decidir.
     * @param detalle una linea en lenguaje llano con el dato del momento
     */
    void avisar(String etapa, String detalle);

    /**
     * No avisar de nada.
     *
     * Lo usa la llamada normal, la que responde de una vez. Asi el caso de uso
     * tiene un unico camino y no dos que puedan separarse con el tiempo.
     */
    AvisoDeEtapa NINGUNO = (etapa, detalle) -> { };
}
