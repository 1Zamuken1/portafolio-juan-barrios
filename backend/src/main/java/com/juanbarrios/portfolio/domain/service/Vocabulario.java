package com.juanbarrios.portfolio.domain.service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * El vocabulario de structuredStack y structuredFeatures.
 *
 * <p>Antes cada proyecto usaba sus claves --"Arquitectura" y "Architecture",
 * "IA" y "Artificial Intelligence"-- y el redactor no generaba estos campos
 * porque habria heredado el desorden. Ahora hay una lista cerrada de capas del
 * stack y otra de grupos comunes de caracteristicas, y lo que el modelo
 * escriba como sinonimo se lleva a su nombre sin gastar un reintento.
 *
 * <p>Es la copia en Java de src/assets/data/vocabulario.json, que es el que
 * leen la ficha publica y las pruebas del frontend. {@code VocabularioTest}
 * compara las dos cuando el frontend esta al lado; aqui no se lee el JSON
 * porque Render construye solo la carpeta backend/.
 */
public final class Vocabulario {

    /** Las capas del stack, en el orden en que se ensenan: clave y sinonimos. */
    public static final Map<String, List<String>> CAPAS = ordenado(
            "backend", List.of("server", "servidor"),
            "frontend", List.of("client", "cliente", "ui"),
            "desktop", List.of("platform", "plataforma", "escritorio"),
            "database", List.of("persistence", "persistencia", "datos", "db", "storage"),
            "authentication", List.of("auth", "autenticacion", "autenticación", "security", "seguridad"),
            "ai", List.of("ia", "artificial intelligence", "inteligencia artificial"),
            "automation", List.of("automatizacion", "automatización", "scraping"),
            "export", List.of("exportacion", "exportación", "reports", "reportes"),
            "quality", List.of("audit", "auditoria", "auditoría", "calidad", "testing", "tests"));

    /** Los grupos de caracteristicas que valen para cualquier proyecto. Los del
     *  dominio (Finanzas, Catalogo...) son libres. */
    public static final Map<String, List<String>> GRUPOS = ordenado(
            "Arquitectura", List.of("architecture"),
            "Seguridad", List.of("security", "autenticación", "autenticacion", "authentication"),
            "IA", List.of("ai", "artificial intelligence", "inteligencia artificial"),
            "Automatización", List.of("automation", "automatizacion"),
            "Datos", List.of("persistence", "persistencia", "data"),
            "Exportación", List.of("export", "exportacion"),
            "Reportes", List.of("reporting", "reports", "informes"),
            "Rendimiento", List.of("performance"),
            "Interfaz", List.of("user interface", "ui", "interfaz de usuario"));

    private Vocabulario() {}

    /** La capa canonica de una clave del stack, o null si no es de ninguna. */
    public static String capa(String clave) {
        if (clave == null) return null;
        String c = clave.trim().toLowerCase(Locale.ROOT);
        for (var e : CAPAS.entrySet()) {
            if (e.getKey().equals(c) || e.getValue().contains(c)) return e.getKey();
        }
        return null;
    }

    /** El nombre de un grupo de caracteristicas: el comun si es un sinonimo, y
     *  si no, el suyo con la inicial en mayuscula. */
    public static String grupo(String nombre) {
        String n = nombre == null ? "" : nombre.trim();
        String bajo = n.toLowerCase(Locale.ROOT);
        for (var e : GRUPOS.entrySet()) {
            if (e.getKey().toLowerCase(Locale.ROOT).equals(bajo) || e.getValue().contains(bajo)) return e.getKey();
        }
        return n.isEmpty() ? n : n.substring(0, 1).toUpperCase(Locale.ROOT) + n.substring(1);
    }

    /**
     * El stack con sus claves canonicas y en su orden. Dos claves que son la
     * misma capa se juntan sin repetir. Las que no son ninguna capa se quedan
     * como vinieron: decidir si eso invalida el borrador es del caso de uso.
     */
    public static Map<String, List<String>> normalizarStack(Map<String, List<String>> stack) {
        if (stack == null) return null;
        Map<String, List<String>> juntas = new LinkedHashMap<>();
        for (var e : stack.entrySet()) {
            String capa = capa(e.getKey());
            String clave = capa != null ? capa : e.getKey();
            List<String> destino = juntas.computeIfAbsent(clave, k -> new ArrayList<>());
            for (String x : e.getValue() == null ? List.<String>of() : e.getValue()) {
                if (x != null && !x.isBlank() && !destino.contains(x.trim())) destino.add(x.trim());
            }
        }
        Map<String, List<String>> ordenado = new LinkedHashMap<>();
        for (String c : CAPAS.keySet()) {
            if (juntas.containsKey(c) && !juntas.get(c).isEmpty()) ordenado.put(c, juntas.remove(c));
        }
        juntas.forEach((k, v) -> { if (!v.isEmpty()) ordenado.put(k, v); });
        return ordenado;
    }

    /** Las caracteristicas con los grupos comunes por su nombre. */
    public static Map<String, List<String>> normalizarCaracteristicas(Map<String, List<String>> grupos) {
        if (grupos == null) return null;
        Map<String, List<String>> salida = new LinkedHashMap<>();
        for (var e : grupos.entrySet()) {
            List<String> destino = salida.computeIfAbsent(grupo(e.getKey()), k -> new ArrayList<>());
            for (String x : e.getValue() == null ? List.<String>of() : e.getValue()) {
                if (x != null && !x.isBlank() && !destino.contains(x.trim())) destino.add(x.trim());
            }
        }
        salida.values().removeIf(List::isEmpty);
        return salida;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, List<String>> ordenado(Object... pares) {
        Map<String, List<String>> m = new LinkedHashMap<>();
        for (int i = 0; i < pares.length; i += 2) m.put((String) pares[i], (List<String>) pares[i + 1]);
        return java.util.Collections.unmodifiableMap(m);
    }
}
