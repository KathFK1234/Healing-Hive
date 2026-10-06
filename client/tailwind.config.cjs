// Colours are CSS variables defined in src/index.css, so light and dark mode
// share one set of class names. Use these names, not raw hex values.
const token = (name) => `hsl(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    container: {
      center: true,
      padding: '1.25rem',
      screens: { xl: '1040px' },
    },
    extend: {
      colors: {
        background: token('background'),
        foreground: token('foreground'),
        card: token('card'),
        muted: token('muted'),
        'muted-foreground': token('muted-foreground'),
        border: token('border'),
        // teal: the main action colour
        primary: token('primary'),
        'primary-foreground': token('primary-foreground'),
        'primary-soft': token('primary-soft'),
        // honey: the brand colour, for highlights
        honey: token('honey'),
        'honey-foreground': token('honey-foreground'),
        'honey-soft': token('honey-soft'),
        calm: token('calm'),
        'calm-soft': token('calm-soft'),
        warmth: token('warmth'),
        'warmth-soft': token('warmth-soft'),
        danger: token('danger'),
        'danger-soft': token('danger-soft'),
      },
      fontFamily: {
        sans: ['"Nunito Variable"', 'Nunito', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
    },
  },
  plugins: [],
};
