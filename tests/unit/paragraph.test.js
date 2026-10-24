import { describe, expect, it } from 'vitest';
import {
  foldParagraph,
  normalizeParagraph,
  paragraphKind,
  paragraphPrefixLength,
  paragraphStatus,
} from '../../src/input/paragraph.js';

describe('escritura de frases y párrafos', () => {
  it('normaliza espacios sin cambiar letras, tildes ni mayúsculas', () => {
    expect(normalizeParagraph('  El   sol   brilla.  ')).toBe('El sol brilla.');
    expect(normalizeParagraph('La niña\ncome   pan.')).toBe('La niña come pan.');
    expect(normalizeParagraph(null)).toBe('');
  });

  it('dobla mayúsculas, tildes y la Ñ para una comparación amable', () => {
    expect(foldParagraph('El niño comió piña.')).toBe('el nino comio pina.');
    expect(foldParagraph('ÁÉÍÓÚ Ü')).toBe('aeiou u');
    expect(foldParagraph('  TILO   Y   SUS   AMIGOS ')).toBe('tilo y sus amigos');
  });

  it('calcula el prefijo correcto y se detiene en el primer error', () => {
    expect(paragraphPrefixLength('El sol', 'El sol brilla.')).toBe(6);
    expect(paragraphPrefixLength('El sl', 'El sol brilla.')).toBe(4);
    expect(paragraphPrefixLength('el sol', 'El sol brilla.')).toBe(6);
    expect(paragraphPrefixLength('El niño', 'El nino come.')).toBe(7);
  });

  it('acepta una coincidencia exacta con tildes y mayúsculas', () => {
    const status = paragraphStatus('El niño comió piña.', 'El niño comió piña.');
    expect(status.completed).toBe(true);
    expect(status.exact).toBe(true);
    expect(status.friendly).toBe(false);
    expect(status.prefix).toBe(status.total);
    expect(status.expected).toBe(null);
  });

  it('acepta una coincidencia amable sin tildes, con minúsculas o sin Ñ', () => {
    const status = paragraphStatus('el nino comio pina.', 'El niño comió piña.');
    expect(status.completed).toBe(true);
    expect(status.exact).toBe(false);
    expect(status.friendly).toBe(true);
  });

  it('señala el carácter esperado y el escrito cuando hay un error', () => {
    const status = paragraphStatus('El sl', 'El sol brilla.');
    expect(status.completed).toBe(false);
    expect(status.prefix).toBe(4);
    expect(status.expected).toBe('o');
    expect(status.mismatch).toBe('l');
    expect(status.progress).toBeGreaterThan(0);
    expect(status.progress).toBeLessThan(1);
  });

  it('ignora espacios repetidos al comparar y clasifica frases y párrafos', () => {
    const status = paragraphStatus('El   sol   brilla.', 'El sol brilla.');
    expect(status.exact).toBe(true);
    expect(paragraphKind('El sol brilla.')).toBe('frase');
    expect(paragraphKind('Una frase larga que necesita más de sesenta caracteres para ser un párrafo pequeño.')).toBe('párrafo');
  });
});
