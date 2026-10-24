import { describe, expect, it } from 'vitest';
import {
  LAYOUT_LIST,
  getLayout,
  makeTarget,
  matchesTarget,
  eventChar,
  keyIsHighlighted,
  humanKeys,
} from '../../src/input/layouts.js';

const ev = (key, code) => ({ key, code });

describe('objetivos de teclado', () => {
  it('reconoce letras, números y teclas especiales', () => {
    expect(makeTarget('a')).toMatchObject({ char: 'A', display: 'A', code: 'KeyA' });
    expect(makeTarget('ñ')).toMatchObject({ char: 'Ñ', display: 'Ñ', code: 'Semicolon' });
    expect(makeTarget('Ñ').code).toBe('Semicolon');
    expect(makeTarget('7')).toMatchObject({ char: '7', display: '7', code: 'Digit7' });
    expect(makeTarget('ESPACIO')).toMatchObject({ char: ' ', code: 'Space' });
    expect(makeTarget('espacio').code).toBe('Space');
    expect(makeTarget('ENTER')).toMatchObject({ char: 'Enter', code: 'Enter' });
    expect(makeTarget('RETROCESO')).toMatchObject({ char: 'Backspace', code: 'Backspace' });
    expect(makeTarget('→')).toMatchObject({ char: '→', code: 'ArrowRight' });
    expect(makeTarget('ARRIBA').code).toBe('ArrowUp');
    expect(humanKeys(['A', 'ESPACIO', 'Ñ'])).toEqual(['A', 'ESPACIO', 'Ñ']);
  });

  it('conserva un objetivo que ya viene como objeto', () => {
    const target = { char: 'X', display: 'X', code: 'KeyX' };
    expect(makeTarget(target)).toEqual(target);
    expect(makeTarget(target)).not.toBe(target);
  });

  it('acepta mayúsculas y minúsculas en modo carácter', () => {
    const a = makeTarget('A');
    expect(matchesTarget(ev('a', 'KeyA'), a, 'char')).toBe(true);
    expect(matchesTarget(ev('A', 'KeyA'), a, 'char')).toBe(true);
    expect(matchesTarget(ev('b', 'KeyB'), a, 'char')).toBe(false);
  });

  it('acepta la Ñ en su tecla latinoamericana y en la posición US', () => {
    const enye = makeTarget('Ñ');
    expect(matchesTarget(ev('ñ', 'Semicolon'), enye, 'char')).toBe(true);
    expect(matchesTarget(ev(';', 'Semicolon'), enye, 'char')).toBe(true);
    expect(matchesTarget(ev('Ñ', 'Semicolon'), enye, 'position')).toBe(true);
    expect(matchesTarget(ev('x', 'Semicolon'), enye, 'position')).toBe(true);
    expect(matchesTarget(ev('n', 'KeyN'), enye, 'char')).toBe(false);
  });

  it('distingue carácter y posición física', () => {
    const target = makeTarget('A');
    expect(matchesTarget(ev('q', 'KeyA'), target, 'char')).toBe(false);
    expect(matchesTarget(ev('q', 'KeyA'), target, 'position')).toBe(true);
    expect(matchesTarget(ev('a', 'KeyQ'), target, 'position')).toBe(false);
  });

  it('reconoce espacio, Enter y Retroceso', () => {
    expect(matchesTarget(ev(' ', 'Space'), makeTarget('ESPACIO'), 'char')).toBe(true);
    expect(matchesTarget(ev('Espacio', 'Space'), makeTarget('ESPACIO'), 'position')).toBe(true);
    expect(matchesTarget(ev('Enter', 'Enter'), makeTarget('ENTER'), 'char')).toBe(true);
    expect(matchesTarget(ev('Backspace', 'Backspace'), makeTarget('RETROCESO'), 'char')).toBe(true);
    expect(matchesTarget(ev('a', 'KeyA'), makeTarget('ENTER'), 'char')).toBe(false);
  });

  it('ignora la tecla muerta y normaliza tildes compuestas', () => {
    expect(eventChar(ev('Dead', 'Quote'))).toBe('DEAD');
    expect(matchesTarget(ev('Dead', 'Quote'), makeTarget('A'), 'char')).toBe(false);
    // En LATAM la tecla muerta produce ´ y después la vocal Á.
    expect(eventChar(ev('á', 'KeyA'))).toBe('Á');
    expect(matchesTarget(ev('á', 'KeyA'), makeTarget('Á'), 'char')).toBe(true);
  });

  it('ilumina la tecla correcta del teclado virtual', () => {
    const keyA = { code: 'KeyA', char: 'A' };
    const keyEnye = { code: 'Semicolon', char: 'Ñ' };
    const keySpace = { code: 'Space', char: 'ESPACIO' };
    expect(keyIsHighlighted(keyA, [makeTarget('A')], 'char')).toBe(true);
    expect(keyIsHighlighted(keyEnye, [makeTarget('Ñ')], 'char')).toBe(true);
    expect(keyIsHighlighted(keySpace, [makeTarget('ESPACIO')], 'char')).toBe(true);
    expect(keyIsHighlighted(keyA, [makeTarget('A')], 'position')).toBe(true);
    expect(keyIsHighlighted({ code: 'KeyQ', char: 'Q' }, [makeTarget('A')], 'position')).toBe(false);
  });

  it('ofrece las tres distribuciones y usa latinoamericana por defecto', () => {
    expect(LAYOUT_LIST.map((l) => l.id)).toEqual(['latam', 'es', 'us']);
    expect(getLayout('inexistente').id).toBe('latam');
    expect(getLayout('us').rows[2].some((k) => k.code === 'Semicolon' && k.label === ';')).toBe(true);
    expect(getLayout('latam').rows[2].some((k) => k.code === 'Semicolon' && k.label === 'Ñ')).toBe(true);
  });
});
