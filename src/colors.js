const COLORS = {
  black: '#1c1c1e',
  'jet black': '#0a0a0a',
  'space black': '#2c2c2e',
  'space gray': '#6e6e73',
  'space grey': '#6e6e73',
  graphite: '#54524f',
  midnight: '#1f2a3c',
  'midnight black': '#16181c',
  'phantom black': '#1a1a1c',
  'prism black': '#1a1a1c',
  starlight: '#f0e5d3',
  white: '#f5f5f7',
  silver: '#c9c9cc',
  gray: '#8e8e93',
  grey: '#8e8e93',
  gold: '#e3c58d',
  'rose gold': '#e6b8a8',
  'natural titanium': '#b7b1a8',
  'black titanium': '#3b3b3d',
  'white titanium': '#e4e2dc',
  'desert titanium': '#bfa48f',
  'blue titanium': '#4d5b6e',
  titanium: '#b7b1a8',
  red: '#d62d2d',
  coral: '#ff7f6e',
  orange: '#f28c28',
  yellow: '#f6d94a',
  green: '#4c9a6a',
  'alpine green': '#4e5b4a',
  'midnight green': '#4e5851',
  'sage green': '#9db38f',
  teal: '#2f9c9c',
  blue: '#3d6fd6',
  'sierra blue': '#9bb5ce',
  'pacific blue': '#2e596d',
  'sky blue': '#87c4ee',
  'ultramarine': '#4a5bd0',
  purple: '#8a63c5',
  'deep purple': '#5f4b78',
  lavender: '#c7b8e6',
  violet: '#8b6fc7',
  pink: '#f2a7c0',
  'cosmic orange': '#e98433',
  brown: '#7a5538',
  bronze: '#a67b4b',
  cream: '#f3ead3',
  beige: '#d9c9ac',
};

const BY_LENGTH = Object.keys(COLORS).sort((a, b) => b.length - a.length);

// Exact match first, then the longest known colour name found inside the text
// ("Pacific Blue 128GB" -> "pacific blue"; "Cosmic Black" -> "black").
export function colorSwatch(name) {
  const text = String(name ?? '').toLowerCase().replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return null;
  if (COLORS[text]) return COLORS[text];
  const found = BY_LENGTH.find((c) => new RegExp(`\\b${c}\\b`).test(text));
  return found ? COLORS[found] : null;
}
