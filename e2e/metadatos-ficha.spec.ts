import { test, expect } from '@playwright/test';
import { metadatosFicha } from '../src/app/features/projects/metadatos-ficha';
import { Project } from '../src/app/shared/models/project.model';

/**
 * La cabecera de la ficha publica. Un proyecto redactado con la IA no trae
 * rol, tipo ni stack estructurado, y la plantilla enseñaba "Rol:" e "IA:" con
 * nada detras, y "1 desarrolladores".
 */

const base = { id: 1, name: 'x', shortDescription: '', fullDescription: '', year: 2026, status: 'Completed' } as Project;

test('lo que no hay no sale, tampoco un "N/A"', () => {
  const m = metadatosFicha({ ...base, role: '', aiArchitecture: 'N/A', databaseArchitecture: 'MySQL' });
  const etiquetas = m.map((x) => x.etiqueta);
  expect(etiquetas).toEqual(['Año', 'Estado', 'Base de datos']);
});

test('el equipo concuerda en numero', () => {
  expect(metadatosFicha({ ...base, teamSize: 1 }).find((x) => x.etiqueta === 'Equipo')?.valor).toBe('1 desarrollador');
  expect(metadatosFicha({ ...base, teamSize: 4 }).find((x) => x.etiqueta === 'Equipo')?.valor).toBe('4 desarrolladores');
});
