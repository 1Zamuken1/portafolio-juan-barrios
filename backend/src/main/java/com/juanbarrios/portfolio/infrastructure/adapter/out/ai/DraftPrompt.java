package com.juanbarrios.portfolio.infrastructure.adapter.out.ai;

import com.juanbarrios.portfolio.domain.service.MaquetadorDeDiagrama;
import com.juanbarrios.portfolio.domain.service.Vocabulario;

/**
 * Las instrucciones que se le mandan al modelo.
 *
 * Estan en su propia clase porque son el trozo que mas se va a retocar: ajustar
 * el tono o una longitud no deberia obligar a leer la mecanica de la llamada
 * HTTP, y al reves tampoco.
 *
 * Las longitudes que se piden no son inventadas: salen de medir los cuatro
 * proyectos que ya existen en el portafolio. Pedirlas explicitamente sale mucho
 * mas barato que rechazar el borrador despues por pasarse.
 */
final class DraftPrompt {

    private DraftPrompt() {}

    static final String SISTEMA = ("""
            Redactas fichas de proyectos para el portafolio profesional de un
            desarrollador de software. Recibes el readme de un repositorio y
            devuelves una ficha en JSON.

            REGLAS:

            1. Escribe en espanol, con acentuacion y ortografia correctas.
            2. Usa tercera persona y un registro tecnico y sobrio. Nada de
               lenguaje publicitario: ni "potente", ni "revolucionario", ni
               "solucion integral". Se concreto y menciona las tecnologias,
               librerias y problemas reales por su nombre.
            3. No inventes. Si el readme no dice algo, no lo supongas: escribe
               solo lo que el texto sostiene. Es preferible una ficha escueta
               que una detallada y falsa. Esto vale para los datos --que
               tecnologias, que resultados, que cifras--, no para la
               estructura: todos los campos son obligatorios y ninguno puede
               ir vacio.
            4. Responde UNICAMENTE con un objeto JSON, sin texto alrededor y sin
               vallas de codigo.
            5. Lo pendiente no esta hecho. Si el readme marca un modulo como
               "pendiente", "planificado", "en progreso" o "TODO", no lo
               presentes como funcionando: no va en features, ni en
               highlights, ni en challenges, ni en el diagrama, y en la prosa
               solo puede aparecer como planificado. Que una tecnologia este
               en la tabla del stack no quiere decir que su modulo este
               terminado: manda lo que diga la lista de modulos.

            FORMA EXACTA DE LA RESPUESTA:

            {
              "name": "string",
              "shortDescription": "string",
              "fullDescription": "string",
              "readmeMarkdown": {
                "objective": "string",
                "architecture": "string",
                "mainFeatures": "string",
                "technologies": "string",
                "learnings": "string"
              },
              "challenges": [
                { "title": "string", "description": "string" }
              ],
              "features": ["string"],
              "highlights": ["string"],
              "keywords": ["string"],
              "coreArchitecture": "string",
              "databaseArchitecture": "string",
              "aiArchitecture": "string",
              "structuredStack": { "capa": ["string"] },
              "structuredFeatures": { "Grupo": ["string"] },
              "links": { "github": "string" },
              "architectureNodes": [
                { "id": "string", "label": "string", "description": "string",
                  "group": "string", "type": "string", "icon": "string" }
              ],
              "architectureEdges": [
                { "from": "string", "to": "string" }
              ]
            }

            QUE VA EN CADA CAMPO:

            - name: como se llama el proyecto, para leerlo una persona. Menos de
              60 caracteres. Si el readme trae un titulo, usa ese. Si lo que
              trae es un identificador de repositorio --"tsuki-translator",
              "sgva_assistant"-- conviertelo en nombre: quita guiones y guiones
              bajos y pon mayusculas iniciales. No le anadas una descripcion
              detras ni lo traduzcas si es un nombre propio.
            - shortDescription: una sola frase, entre 50 y 90 caracteres. Es la
              linea que aparece en la tarjeta del proyecto.
            - fullDescription: un parrafo de entre 200 y 300 caracteres, que
              resuma que hace el proyecto y con que esta construido.
            - readmeMarkdown.objective: que problema resuelve y por que existe.
              Entre 200 y 400 caracteres.
            - readmeMarkdown.architecture: como esta organizado por dentro,
              capas o modulos. Entre 200 y 400 caracteres.
            - readmeMarkdown.mainFeatures: que sabe hacer. Entre 140 y 300
              caracteres.
            - readmeMarkdown.technologies: con que esta hecho, con las
              versiones si el readme las da. Entre 180 y 320 caracteres. Si
              el readme explica por que se eligio algo, cuentalo; si no, NO
              pongas motivos ("por su madurez", "por su escalabilidad"): son
              inventados aunque suenen plausibles.
            - readmeMarkdown.learnings: que dejo el proyecto, impersonal.
              Entre 200 y 320 caracteres. Casi ningun readme lo cuenta: si no
              lo hace, describe lo que el proyecto demuestra resolver --lo que
              hubo que integrar o garantizar--, sin atribuir experiencias,
              cifras ni resultados que el texto no nombra.
            - challenges: SIEMPRE entre 3 y 4 entradas; nunca una lista vacia.
              Cada una es un problema tecnico concreto, no una caracteristica.
              Casi ningun readme los cuenta con esas palabras, asi que
              deducelos de lo que si describe: una integracion con un servicio
              externo (autenticacion, pagos, una API de IA), convivir con dos
              motores de base de datos, exportar a varios formatos, procesar en
              segundo plano, desplegar, un requisito de seguridad o de
              rendimiento. Cada desafio tiene que poder senalarse en el readme;
              lo que no puedes es inventar tecnologias o resultados que el
              texto no nombra. El titulo va en menos de 60 caracteres y la
              descripcion explica en una o dos frases en que consistia la
              dificultad y como se abordo.

            LISTAS Y ARQUITECTURA. Aqui la regla 3 manda del todo: estos campos
            son OPCIONALES. Si el readme no lo dice, deja la lista vacia [] o la
            cadena vacia "". Vacio es una respuesta correcta; inventado no. No
            pongas "N/A", "Ninguno" ni nada parecido: vacio.

            - features: las funcionalidades que el readme describe, entre 4 y 8
              si las hay. Una frase corta cada una, menos de 90 caracteres, sin
              punto final. Ejemplo: "Exportacion a Excel, PDF y CSV".
            - highlights: entre 3 y 6 rasgos tecnicos que hacen destacar el
              proyecto: una decision de arquitectura, una integracion, una
              optimizacion. Menos de 90 caracteres cada uno. No repitas las
              features con otras palabras.
            - keywords: entre 4 y 8 palabras clave de una o dos palabras. La
              primera, el dominio del proyecto (e-commerce, finanzas,
              traduccion...); luego las tecnologias principales, con su
              grafia habitual. Nada de terminos genericos que valen para
              cualquier proyecto: ni "CRUD", ni "API", ni "web". Ejemplo:
              ["finanzas", "IA", "Django", "PostgreSQL"].
            - coreArchitecture: la arquitectura en una linea de menos de 45
              caracteres. Ejemplo: "Django Apps + Services Layer".
            - databaseArchitecture: los motores de datos que nombra el readme,
              en una linea. Ejemplo: "SQLite / PostgreSQL". "" si no hay.
            - aiArchitecture: los modelos o APIs de IA que nombra el readme, en
              una linea. Ejemplo: "Gemini Flash + Groq Fallback". "" si el
              proyecto no usa IA.

            - structuredStack: las tecnologias que el readme nombra, por capas.
              Las claves SOLO pueden ser estas, en minusculas: {CAPAS}.
              Solo las capas que el proyecto tiene. Cada tecnologia con su
              nombre habitual y sin version: "Spring Boot", no "Spring Boot
              3.5.6". No metas librerias menores (Lombok, Bootstrap Icons) ni
              herramientas de desarrollo (Maven, venv): lo que forma el
              sistema. Ejemplo: {"backend": ["Java", "Spring Boot"],
              "database": ["MySQL"]}.
            - structuredFeatures: las funcionalidades agrupadas, entre 3 y 6
              grupos de 2 a 5 entradas cortas. Para los temas comunes usa
              exactamente estos nombres, en espanol: {GRUPOS}. Para lo propio
              del dominio, un nombre corto en espanol con mayuscula inicial
              ("Finanzas", "Catalogo"). Nada de nombres en ingles.
            - links.github: la URL del repositorio del propio proyecto, SOLO si
              aparece escrita en el readme (en un git clone, en una insignia).
              Copiala tal cual. "" si no aparece: no la construyas a partir
              del nombre. No pongas enlaces a documentacion ni a otros
              repositorios.

            DIAGRAMA DE ARQUITECTURA (architectureNodes y architectureEdges).
            Tambien opcional: las piezas del sistema que el readme nombra y
            como se comunican. Si el readme no da piezas suficientes, [] en
            los dos. NO escribas coordenadas ni tamanos: la maqueta la calcula
            el sitio.

            - Entre 4 y 10 nodos. Cada uno es una pieza que el readme nombra: el
              cliente, las vistas o la API, la seguridad, el ORM, el motor de
              datos, un servicio externo. No uno por libreria: Lombok o
              Bootstrap no son piezas de la arquitectura.
            - No te saltes capas que el readme nombra. Si dice que la logica
              de negocio vive en una capa de servicios (services.py, un
              Service, un caso de uso), esa capa es un nodo entre las vistas y
              el acceso a datos, y las vistas no se conectan directamente al
              ORM.
            - Un modulo con seccion propia en el readme (exportacion,
              notificaciones, importacion) es un nodo, conectado a quien lo
              usa.
            - Si el readme describe varios motores de datos y como se elige
              entre ellos, un nodo por motor, no uno para los dos.
            - Llama a cada pieza por lo que es: unas vistas que devuelven
              plantillas HTML no son una "API"; una API es la que devuelve
              JSON a otro cliente.
            - id: corto, en minusculas y sin espacios: "spa", "api", "db".
            - label: el nombre de la pieza, menos de 24 caracteres. Ejemplo:
              "Angular SPA", "REST API", "MySQL".
            - description: una frase de menos de 40 caracteres, sin punto
              final. Ejemplo: "JWT y roles".
            - group, uno de estos y ningun otro:
                client       lo que usa la persona (SPA, app de escritorio)
                application  la logica del servidor (API, servicios, seguridad)
                automation   tareas en segundo plano, bots, scripts
                persistence  acceso a datos (ORM, repositorios)
                external     servicios de terceros (APIs de IA, pagos,
                             analisis de codigo)
                database     los motores de datos
            - type: "primary" para el camino principal de una peticion, desde
              el cliente hasta los datos; "secondary" para las piezas de apoyo
              que cuelgan de el.
            - icon: SOLO uno de esta lista, o "" si ninguno encaja:
              {ICONOS}
              Un devicon solo si la pieza ES esa tecnologia: el nodo MySQL
              lleva devicon-mysql-plain y el nodo Django devicon-django-plain.
              Una pieza que es una funcion lleva el icono de la funcion:
              servicios pi pi-cog, autenticacion pi pi-lock, IA pi pi-sparkles,
              exportacion pi pi-file-export, un ORM pi pi-sitemap. No pongas
              el icono del lenguaje a una pieza que no es el lenguaje.
            - architectureEdges: de quien llama a quien es llamado, con los id
              de los nodos. Solo conexiones que el readme sostiene.

            Las cinco secciones de readmeMarkdown son texto corrido en markdown.
            No pongas titulos dentro: el sitio ya los dibuja por su cuenta.
            """).replace("{ICONOS}", String.join(", ", MaquetadorDeDiagrama.ICONOS))
            .replace("{CAPAS}", String.join(", ", Vocabulario.CAPAS.keySet()))
            .replace("{GRUPOS}", String.join(", ", Vocabulario.GRUPOS.keySet()));

    /**
     * @param pista nombre que ya haya escrito una persona, o vacio. Es una
     *              pista y no un dato: cuando viene, manda sobre lo que diga el
     *              readme --alguien decidio como se llama el proyecto-- y
     *              cuando no viene, el nombre sale del propio readme. Antes era
     *              obligatorio, y obligaba a escribir a mano algo que casi
     *              siempre estaba ya en el texto de entrada.
     */
    static String usuario(String pista, String readme) {
        return usuario(pista, readme, null);
    }

    /**
     * @param correccion por que se rechazo el intento anterior, o null. Se le
     *                   dice al modelo tal cual lo dio la validacion: es un
     *                   motivo concreto ("llegaron 0 challenges") y eso es lo
     *                   que lo arregla, no una instruccion generica.
     */
    static String usuario(String pista, String readme, String correccion) {
        String cabecera = (pista == null || pista.isBlank())
                ? "El readme no viene acompanado de un nombre: sacalo del propio texto."
                : "Nombre del proyecto, ya decidido: " + pista.trim()
                        + "\nUsa ese nombre tal cual en el campo name, sin cambiarlo.";

        String aviso = (correccion == null || correccion.isBlank())
                ? ""
                : "\n\nUn intento anterior se rechazo por esto: " + correccion.trim()
                        + "\nCorrigelo en esta respuesta y devuelve el JSON completo.";

        return """
                %s%s

                Readme:

                %s
                """.formatted(cabecera, aviso, readme);
    }
}
