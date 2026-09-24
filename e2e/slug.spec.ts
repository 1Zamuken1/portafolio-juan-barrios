import { test, expect } from '@playwright/test';
import { aSlug } from '../src/app/shared/utils/slug';

test('el slug sale del nombre: minusculas, sin acentos y con guiones', () => {
  expect(aSlug('Salsamentaría 2')).toBe('salsamentaria-2');
  expect(aSlug('Taller Calidad Software — Salsamentaria')).toBe('taller-calidad-software-salsamentaria');
  expect(aSlug('  GastuApp  ')).toBe('gastuapp');
});
