import { loadFont as loadFraunces } from '@remotion/google-fonts/Fraunces';
import { loadFont as loadSora } from '@remotion/google-fonts/Sora';
import { loadFont as loadPlexMono } from '@remotion/google-fonts/IBMPlexMono';

// Mirrors the app's design tokens (src/index.css, light theme). Keep in sync if the app changes.
export const COLORS = {
  paper: '#F6F4EF',
  surface: '#FFFDF9',
  line: '#E6E1D6',
  ink: '#1C2B3A',
  inkSoft: '#5F6C75',
  ember: '#C73B20',
  emberBright: '#E8472A',
  emberTint: '#FBE7DF',
  moss: '#3E6259',
  gold: '#C7962E',
  goldTint: '#F5EBD0',
  night: '#12191F',
  cream: '#F6F4EF',
} as const;

export const RADIUS = { control: 12, card: 16, sheet: 24 } as const;

export const FONTS = {
  display: loadFraunces().fontFamily,
  ui: loadSora().fontFamily,
  mono: loadPlexMono().fontFamily,
};

export const FPS = 30;
