/**
 * Utilidades para los retos de escritura de frases y párrafos.
 *
 * La comparación es amable con niños que todavía no dominan las tildes o la Ñ:
 * primero se intenta una coincidencia exacta (mayúsculas, tildes y Ñ incluidas)
 * y, si no, una coincidencia "doblegada" que ignora mayúsculas y acentos para
 * no bloquear el avance. La interfaz muestra un recordatorio educativo cuando
 * se usa la coincidencia amable.
 */

/** Colapsa espacios repetidos y quita espacios al inicio y al final. */
export function normalizeParagraph(text) {
  return String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Versión tolerante: sin mayúsculas, sin tildes y con Ñ tratada como N. */
export function foldParagraph(text) {
  return normalizeParagraph(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-CO');
}

/**
 * Cantidad de caracteres consecutivos que el niño lleva bien escritos.
 * Se compara en modo tolerante para que una tilde olvidada no detenga el
 * resaltado de la frase.
 */
export function paragraphPrefixLength(input, target) {
  const typed = Array.from(foldParagraph(input));
  const expected = Array.from(foldParagraph(target));
  let index = 0;
  while (index < typed.length && index < expected.length && typed[index] === expected[index]) {
    index += 1;
  }
  return index;
}

/**
 * Estado completo de un párrafo: texto normalizado, avance, primer carácter
 * distinto y si la coincidencia fue exacta o amable.
 */
export function paragraphStatus(input, target) {
  const expectedText = normalizeParagraph(target);
  const inputText = normalizeParagraph(input);
  const expectedChars = Array.from(expectedText);
  const inputChars = Array.from(inputText);
  const prefix = paragraphPrefixLength(inputText, expectedText);
  const exact = inputText === expectedText;
  const friendly = !exact && foldParagraph(inputText) === foldParagraph(expectedText);
  const completed = exact || friendly;
  const total = expectedChars.length;
  const mismatch =
    !completed && prefix < inputChars.length && prefix < expectedChars.length
      ? inputChars[prefix]
      : null;
  const expected = completed ? null : expectedChars[prefix] ?? null;
  return {
    target: expectedText,
    input: inputText,
    rawInput: String(input ?? ''),
    exact,
    friendly,
    completed,
    prefix,
    total,
    typed: inputChars.length,
    expected,
    mismatch,
    progress: total > 0 ? Math.min(1, prefix / total) : 0,
  };
}

/** Texto corto para burbujas, HUD y avisos. */
export function paragraphKind(text) {
  return normalizeParagraph(text).length > 60 ? 'párrafo' : 'frase';
}
