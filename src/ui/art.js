/** Tilo, mascota original de Tecladoaventura. Ilustración SVG local. */
export function mascotSVG(className = '') {
  return `
  <svg class="${className}" viewBox="0 0 240 260" role="img" aria-label="Tilo, el zorro explorador de las teclas">
    <defs>
      <linearGradient id="tiloFur" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffb45e"/>
        <stop offset="1" stop-color="#f08a2e"/>
      </linearGradient>
      <linearGradient id="tiloScarf" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#4ee0c4"/>
        <stop offset="1" stop-color="#1b9482"/>
      </linearGradient>
      <radialGradient id="tiloGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0" stop-color="#fff2a8" stop-opacity="0.9"/>
        <stop offset="1" stop-color="#fff2a8" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <ellipse cx="120" cy="238" rx="72" ry="14" fill="rgba(20,10,40,0.28)"/>
    <circle cx="120" cy="150" r="104" fill="url(#tiloGlow)" opacity="0.55"/>
    <!-- cola -->
    <path d="M72 190 C30 200 18 150 40 116 C56 90 84 104 78 128 C74 144 58 148 58 160 C58 178 74 176 88 168 Z"
          fill="url(#tiloFur)" stroke="#b8651c" stroke-width="4" stroke-linejoin="round"/>
    <ellipse cx="48" cy="127" rx="16" ry="20" transform="rotate(28 48 127)" fill="#fff1cf"/>
    <!-- piernas -->
    <rect x="88" y="196" width="20" height="36" rx="9" fill="#e07b28"/>
    <rect x="132" y="196" width="20" height="36" rx="9" fill="#e07b28"/>
    <ellipse cx="96" cy="232" rx="18" ry="9" fill="#46281b"/>
    <ellipse cx="144" cy="232" rx="18" ry="9" fill="#46281b"/>
    <!-- cuerpo -->
    <ellipse cx="120" cy="158" rx="50" ry="56" fill="url(#tiloFur)" stroke="#b8651c" stroke-width="4"/>
    <ellipse cx="120" cy="166" rx="31" ry="40" fill="#fff1cf"/>
    <!-- brazos -->
    <path d="M74 146 C56 154 48 172 54 184" fill="none" stroke="#e07b28" stroke-width="17" stroke-linecap="round"/>
    <path d="M166 146 C184 154 192 172 186 184" fill="none" stroke="#e07b28" stroke-width="17" stroke-linecap="round"/>
    <!-- bufanda -->
    <path d="M84 120 Q120 138 156 120 L154 136 Q120 154 86 136 Z" fill="url(#tiloScarf)" stroke="#157465" stroke-width="4"/>
    <path d="M150 130 L178 158 L156 166 L140 140 Z" fill="url(#tiloScarf)" stroke="#157465" stroke-width="4" stroke-linejoin="round"/>
    <!-- orejas -->
    <path d="M76 78 L64 28 L104 52 Z" fill="url(#tiloFur)" stroke="#b8651c" stroke-width="4" stroke-linejoin="round"/>
    <path d="M164 78 L176 28 L136 52 Z" fill="url(#tiloFur)" stroke="#b8651c" stroke-width="4" stroke-linejoin="round"/>
    <path d="M78 68 L72 42 L94 54 Z" fill="#ffd9b0"/>
    <path d="M162 68 L168 42 L146 54 Z" fill="#ffd9b0"/>
    <!-- cabeza -->
    <circle cx="120" cy="92" r="52" fill="url(#tiloFur)" stroke="#b8651c" stroke-width="4"/>
    <ellipse cx="120" cy="102" rx="31" ry="25" fill="#fff1cf"/>
    <!-- mejillas -->
    <ellipse cx="86" cy="106" rx="10" ry="6" fill="#ff8f9e" opacity="0.6"/>
    <ellipse cx="154" cy="106" rx="10" ry="6" fill="#ff8f9e" opacity="0.6"/>
    <!-- ojos -->
    <ellipse cx="101" cy="88" rx="7.5" ry="9.5" fill="#46281b"/>
    <ellipse cx="139" cy="88" rx="7.5" ry="9.5" fill="#46281b"/>
    <circle cx="103.5" cy="84.5" r="2.8" fill="#fff"/>
    <circle cx="141.5" cy="84.5" r="2.8" fill="#fff"/>
    <!-- nariz y sonrisa -->
    <ellipse cx="120" cy="102" rx="6" ry="4.5" fill="#46281b"/>
    <path d="M108 112 Q120 123 132 112" fill="none" stroke="#46281b" stroke-width="3.5" stroke-linecap="round"/>
    <!-- llave mágica -->
    <circle cx="120" cy="139" r="7" fill="#ffd23f" stroke="#b87b12" stroke-width="2.5"/>
    <rect x="117" y="141" width="6" height="14" rx="2" fill="#ffd23f" stroke="#b87b12" stroke-width="2"/>
    <rect x="122" y="148" width="6" height="4" rx="1.5" fill="#ffd23f" stroke="#b87b12" stroke-width="1.5"/>
  </svg>`;
}

export function crownSVG(className = '') {
  return `
  <svg class="${className}" viewBox="0 0 200 150" role="img" aria-label="Corona del Reino de las Teclas">
    <defs>
      <linearGradient id="crownGold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fff3a8"/>
        <stop offset="0.55" stop-color="#ffd23f"/>
        <stop offset="1" stop-color="#f0a000"/>
      </linearGradient>
    </defs>
    <path d="M30 112 L18 46 L62 76 L100 24 L138 76 L182 46 L170 112 Z"
          fill="url(#crownGold)" stroke="#a86b08" stroke-width="6" stroke-linejoin="round"/>
    <rect x="30" y="112" width="140" height="24" rx="8" fill="url(#crownGold)" stroke="#a86b08" stroke-width="5"/>
    <circle cx="62" cy="94" r="9" fill="#ff6b9d" stroke="#8f2f55" stroke-width="3"/>
    <circle cx="100" cy="88" r="11" fill="#7bffe0" stroke="#1b9482" stroke-width="3"/>
    <circle cx="138" cy="94" r="9" fill="#b28dff" stroke="#5b3ea8" stroke-width="3"/>
    <circle cx="100" cy="24" r="9" fill="#fff" stroke="#a86b08" stroke-width="3"/>
  </svg>`;
}
