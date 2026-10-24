/**
 * Distribuciones de teclado soportadas.
 * `char` es lo que produce la tecla; `code` es su posición física.
 * La distribución latinoamericana ISO es la opción por defecto.
 */

const K = (code, label, char, width = 1, kind = 'key') => ({ code, label, char, width, kind });

const digitRow = (quoteLabel = "'", quoteChar = "'") => [
  K('Digit1', '1', '1'),
  K('Digit2', '2', '2'),
  K('Digit3', '3', '3'),
  K('Digit4', '4', '4'),
  K('Digit5', '5', '5'),
  K('Digit6', '6', '6'),
  K('Digit7', '7', '7'),
  K('Digit8', '8', '8'),
  K('Digit9', '9', '9'),
  K('Digit0', '0', '0'),
  K('Quote', quoteLabel, quoteChar),
  K('Backspace', '⌫', 'RETROCESO', 2, 'special'),
];

const qRow = (acuteLabel = '´') => [
  K('KeyQ', 'Q', 'Q'),
  K('KeyW', 'W', 'W'),
  K('KeyE', 'E', 'E'),
  K('KeyR', 'R', 'R'),
  K('KeyT', 'T', 'T'),
  K('KeyY', 'Y', 'Y'),
  K('KeyU', 'U', 'U'),
  K('KeyI', 'I', 'I'),
  K('KeyO', 'O', 'O'),
  K('KeyP', 'P', 'P'),
  K('BracketLeft', acuteLabel, '´'),
  K('BracketRight', '+', '+'),
];

const aRow = (enyeLabel = 'Ñ') => [
  K('KeyA', 'A', 'A'),
  K('KeyS', 'S', 'S'),
  K('KeyD', 'D', 'D'),
  K('KeyF', 'F', 'F'),
  K('KeyG', 'G', 'G'),
  K('KeyH', 'H', 'H'),
  K('KeyJ', 'J', 'J'),
  K('KeyK', 'K', 'K'),
  K('KeyL', 'L', 'L'),
  K('Semicolon', enyeLabel, enyeLabel === 'Ñ' ? 'Ñ' : ';'),
  K('Quote', '{', '{'),
  K('Backslash', '}', '}'),
];

const zRow = () => [
  K('ShiftLeft', 'Shift', 'SHIFT', 1.6, 'special'),
  K('KeyZ', 'Z', 'Z'),
  K('KeyX', 'X', 'X'),
  K('KeyC', 'C', 'C'),
  K('KeyV', 'V', 'V'),
  K('KeyB', 'B', 'B'),
  K('KeyN', 'N', 'N'),
  K('KeyM', 'M', 'M'),
  K('Comma', ',', ','),
  K('Period', '.', '.'),
  K('Slash', '-', '-'),
];

const spaceRow = () => [
  K('ControlLeft', 'Ctrl', 'CTRL', 1.3, 'special'),
  K('AltLeft', 'Alt', 'ALT', 1.2, 'special'),
  K('Space', 'ESPACIO', 'ESPACIO', 5.2, 'space'),
  K('AltRight', 'AltGr', 'ALTGR', 1.3, 'special'),
  K('Enter', 'ENTER', 'ENTER', 1.8, 'special'),
];

const arrowRow = () => [
  K('ArrowLeft', '←', '←', 1.2, 'arrow'),
  K('ArrowUp', '↑', '↑', 1.2, 'arrow'),
  K('ArrowDown', '↓', '↓', 1.2, 'arrow'),
  K('ArrowRight', '→', '→', 1.2, 'arrow'),
];

export const LAYOUTS = {
  latam: {
    id: 'latam',
    name: 'Latinoamérica (ISO)',
    note: 'La Ñ tiene su propia tecla a la derecha de la L. Las tildes se hacen con la tecla ´ y luego la vocal.',
    accentHint: 'Pulsa la tecla ´ (tecla muerta), suéltala y luego pulsa la vocal. Ejemplo: ´ + A = Á.',
    enyeHint: 'La Ñ está a la derecha de la L. Pulsa esa tecla directamente.',
    rows: [digitRow(), qRow(), aRow(), zRow(), spaceRow(), arrowRow()],
    accentKey: { label: '´', char: '´' },
  },
  es: {
    id: 'es',
    name: 'España (ISO)',
    note: 'La Ñ está a la derecha de la L. Las tildes se hacen con la tecla ´ y luego la vocal.',
    accentHint: 'Pulsa la tecla ´ (tecla muerta), suéltala y luego pulsa la vocal. Ejemplo: ´ + E = É.',
    enyeHint: 'La Ñ está a la derecha de la L.',
    rows: [digitRow(), qRow(), aRow(), zRow(), spaceRow(), arrowRow()],
    accentKey: { label: '´', char: '´' },
  },
  us: {
    id: 'us',
    name: 'Estados Unidos (QWERTY)',
    note: 'En esta distribución la Ñ no tiene tecla propia. En Windows puedes usar Alt + N y luego N, o cambiar a la distribución latinoamericana.',
    accentHint: 'Con distribución internacional, pulsa ´ y luego la vocal. Si no funciona, usa la alternativa en pantalla del taller.',
    enyeHint: 'La Ñ no está en este teclado físico. Usa el botón Ñ del taller o cambia la distribución.',
    rows: [
      digitRow(),
      qRow("'"),
      aRow(';'),
      zRow(),
      spaceRow(),
      arrowRow(),
    ],
    accentKey: { label: "'", char: "´" },
  },
};

export const LAYOUT_LIST = Object.values(LAYOUTS);

export function getLayout(id) {
  return LAYOUTS[id] || LAYOUTS.latam;
}

const SPECIAL_KEYS = {
  ESPACIO: { char: ' ', display: 'ESPACIO', code: 'Space', label: 'ESPACIO' },
  ENTER: { char: 'Enter', display: 'ENTER', code: 'Enter', label: 'ENTER' },
  RETROCESO: { char: 'Backspace', display: 'RETROCESO', code: 'Backspace', label: 'RETROCESO' },
  ARRIBA: { char: '↑', display: '↑', code: 'ArrowUp', label: '↑' },
  ABAJO: { char: '↓', display: '↓', code: 'ArrowDown', label: '↓' },
  IZQUIERDA: { char: '←', display: '←', code: 'ArrowLeft', label: '←' },
  DERECHA: { char: '→', display: '→', code: 'ArrowRight', label: '→' },
  '←': { char: '←', display: '←', code: 'ArrowLeft', label: '←' },
  '→': { char: '→', display: '→', code: 'ArrowRight', label: '→' },
  '↑': { char: '↑', display: '↑', code: 'ArrowUp', label: '↑' },
  '↓': { char: '↓', display: '↓', code: 'ArrowDown', label: '↓' },
};

/** Convierte 'A', 'ñ', '7', 'ESPACIO'… en un objetivo con posición y carácter. */
export function makeTarget(raw) {
  if (typeof raw === 'object' && raw !== null) return { ...raw };
  const key = String(raw);
  const upper = key.length === 1 ? key.toLocaleUpperCase('es-CO') : key.toUpperCase();
  if (SPECIAL_KEYS[upper]) return { ...SPECIAL_KEYS[upper] };
  if (/^[0-9]$/.test(upper)) {
    return { char: upper, display: upper, code: `Digit${upper}`, label: upper };
  }
  if (upper === 'Ñ') {
    return { char: 'Ñ', display: 'Ñ', code: 'Semicolon', label: 'Ñ' };
  }
  return {
    char: upper,
    display: upper,
    code: `Key${upper}`,
    label: upper,
  };
}

export function targetList(keys) {
  return (keys || []).map(makeTarget);
}

export function nextKeyLabel(gate) {
  if (!gate) return '';
  const target = makeTarget(gate.keys[gate.progress]);
  return target.display;
}

/** Normaliza una tecla del evento para comparar por carácter. */
export function eventChar(event) {
  const k = event.key;
  if (k === ' ' || event.code === 'Space') return ' ';
  if (k === 'Enter') return 'Enter';
  if (k === 'Backspace') return 'Backspace';
  if (k === 'Dead') return 'DEAD';
  if (typeof k === 'string' && k.length === 1) return k.toLocaleUpperCase('es-CO');
  return k;
}

/** Compara un evento con un objetivo según el modo de aprendizaje. */
export function matchesTarget(event, target, inputMode = 'char') {
  if (inputMode === 'position') {
    return event.code === target.code;
  }
  const char = eventChar(event);
  if (char === 'DEAD') return false;
  if (target.code === 'Space') return char === ' ' || event.key === ' ';
  if (target.code === 'Enter') return char === 'Enter';
  if (target.code === 'Backspace') return char === 'Backspace';
  if (target.char === ' ') return char === ' ';
  // En una distribución US no existe la Ñ física. Aceptamos la tecla que
  // ocupa su lugar (a la derecha de la L) para no bloquear el avance.
  if (target.char === 'Ñ' && event.code === 'Semicolon') return true;
  return char === target.char.toLocaleUpperCase('es-CO');
}

export function keyIsHighlighted(key, targets, inputMode) {
  const active = targets.filter(Boolean);
  return active.some((t) => {
    if (inputMode === 'position') return key.code === t.code;
    if (t.code === 'Space') return key.code === 'Space';
    if (t.code === 'Enter') return key.code === 'Enter';
    if (t.code === 'Backspace') return key.code === 'Backspace';
    if (t.char === 'Ñ' && key.code === 'Semicolon') return true;
    return key.char === t.char || (key.char || '').toLocaleUpperCase('es-CO') === t.char;
  });
}

export function humanKeys(keys) {
  return targetList(keys).map((t) => t.display);
}
