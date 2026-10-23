// Colors and the font for the whole game, in one place. Shapes use numbers
// (0xrrggbb); text uses CSS strings, made with css().

export const COLORS = {
  bgTop: 0x1e2436, // the background fades from this at the top...
  bgBottom: 0x11141e, // ...to this at the bottom
  panel: 0x232a3d, // cards and buttons
  panelBorder: 0x3a4360,
  panelHover: 0x2c344b, // a highlighted table row
  line: 0x323a54, // walls and the center line
  text: 0xe9ecf5,
  muted: 0x8a93ad,
  accent: 0x7aa2ff, // the highlighted button
  accentText: 0x10142a,
  left: 0x6ea8ff, // left paddle, and the solo paddle
  right: 0xff7a90, // right paddle
  ball: 0xffffff,
  spark: 0xc9d4ff, // sparks off the walls
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export const css = (color) => `#${color.toString(16).padStart(6, '0')}`;

// Makes the colors and font available to style.css too, as var(--accent) and so on
export function shareWithCss() {
  const root = document.documentElement.style;
  for (const [name, color] of Object.entries(COLORS)) root.setProperty(`--${name}`, css(color));
  root.setProperty('--font', FONT);
}
