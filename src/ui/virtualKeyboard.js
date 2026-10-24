import { getLayout, keyIsHighlighted } from '../input/layouts.js';

const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

/**
 * Teclado virtual doméstico, reutilizable en tutoriales, retos y práctica.
 * Coincide con la distribución elegida y resalta por carácter o posición.
 */
export function renderVirtualKeyboard(
  container,
  {
    layout = 'latam',
    targets = [],
    inputMode = 'char',
    interactive = false,
    onKey = null,
    compact = false,
    animate = false,
    showArrows = true,
    className = '',
  } = {},
) {
  if (!container) return;
  const l = getLayout(layout);
  const rows = showArrows ? l.rows : l.rows.filter((row) => !row.some((k) => k.kind === 'arrow'));
  const activeTargets = targets.filter(Boolean);
  container.innerHTML = `
    <div class="vkb ${compact ? 'vkb--compact' : ''} ${animate ? 'vkb--demo' : ''} ${escapeHtml(className)}"
         role="${interactive ? 'group' : 'img'}"
         aria-label="Teclado virtual ${escapeHtml(l.name)}">
      ${rows
        .map((row, rowIndex) => {
          const isArrow = row.some((k) => k.kind === 'arrow');
          return `
        <div class="vkb__row ${isArrow ? 'vkb__row--arrows' : ''}">
          ${isArrow ? '<span class="vkb__spacer"></span>' : ''}
          ${row
            .map((key) => {
              const highlighted = keyIsHighlighted(key, activeTargets, inputMode);
              const special = key.kind !== 'key';
              const classes = [
                'vkb__key',
                special ? `vkb__key--${key.kind}` : '',
                highlighted ? 'is-target' : '',
                interactive ? 'is-interactive' : '',
              ]
                .filter(Boolean)
                .join(' ');
              const char = key.char === 'ESPACIO' ? ' ' : key.char;
              return `<button type="button" class="${classes}"
                style="flex:${key.width || 1} 1 0"
                data-code="${escapeHtml(key.code)}"
                data-char="${escapeHtml(char)}"
                data-label="${escapeHtml(key.label)}"
                ${interactive ? '' : 'tabindex="-1"'}
                aria-label="${escapeHtml(key.label === 'ESPACIO' ? 'Espacio' : key.label)}"
                ${highlighted ? 'aria-current="true"' : ''}
                >${escapeHtml(key.label)}</button>`;
            })
            .join('')}
        </div>`;
        })
        .join('')}
    </div>
  `;
  if (interactive && onKey) {
    container.querySelectorAll('.vkb__key.is-interactive').forEach((button) => {
      button.addEventListener('click', () => {
        const label = button.dataset.label;
        const char = button.dataset.char;
        const code = button.dataset.code;
        let key = char;
        let eventCode = code;
        if (label === 'ESPACIO') {
          key = ' ';
          eventCode = 'Space';
        } else if (label === 'ENTER') {
          key = 'Enter';
          eventCode = 'Enter';
        } else if (label === '⌫') {
          key = 'Backspace';
          eventCode = 'Backspace';
        } else if (label === '←' || label === '↑' || label === '→' || label === '↓') {
          key = label;
        }
        onKey({ key, code: eventCode, label, char });
      });
    });
  }
}

export function layoutName(id) {
  return getLayout(id).name;
}

export function layoutNote(id) {
  return getLayout(id).note;
}
