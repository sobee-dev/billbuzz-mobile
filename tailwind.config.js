/** @type {import('tailwindcss').Config} */
module.exports = {
  // Scan all source files for class names
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],

  theme: {
    extend: {
      // ── Colors ─────────────────────────────────────────────────────────────
      colors: {
        // Surfaces
        surface:            '#fbf8fd',
        background:         '#fbf8fd',
        'on-surface':       '#1b1b1f',
        'on-surface-variant': '#45464f',

        // Outlines
        outline:            '#757680',
        gray:               '#c5c6d0',

        // Primary
        'surface-tint':     '#4b5d8f',
        primary:            '#0a1f4d',
        'on-primary':       '#ffffff',
        'primary-container':'#1b2e5e',
        'light-blue':       '#334576',

        // Secondary (Amber)
        secondary:               '#795900',
        'on-secondary':          '#ffffff',
        'secondary-container':   '#fece65',
        'on-secondary-container':'#755700',
        'secondary-fixed':       '#ffdf9f',
        'secondary-fixed-dim':   '#eec058',
        'on-secondary-fixed':    '#261a00',
        'on-secondary-fixed-variant': '#5b4300',

        // Tertiary
        tertiary:                '#2f1500',
        'on-tertiary':           '#ffffff',
        'tertiary-container':    '#4d2700',
        'on-tertiary-container': '#c68c5c',
        'tertiary-fixed':        '#ffdcc2',
        'tertiary-fixed-dim':    '#f9b985',
        'on-tertiary-fixed':     '#2e1500',
        'on-tertiary-fixed-variant': '#683c13',

        // Error
        error:               '#ba1a1a',
        'on-error':          '#ffffff',
        'error-container':   '#ffdad6',
        'on-error-container':'#93000a',

        // Semantic status
        'status-paid-bg':       '#e6f4ea',
        'status-paid-fg':       '#1e7e34',
        'status-unpaid-bg':     '#fff8e1',
        'status-unpaid-fg':     '#795900',
        'status-draft-bg':      '#f0f0f4',
        'status-draft-fg':      '#45464f',
        'status-cancelled-bg':  '#ffdad6',
        'status-cancelled-fg':  '#93000a',
      },

      // ── Font family ────────────────────────────────────────────────────────
      fontFamily: {
        inter: ['Inter'],
        sans:  ['Inter'],   // make Inter the default sans
      },

      // ── Font sizes (with paired line-height & letter-spacing) ──────────────
      fontSize: {
        'headline-lg':        ['32px', { lineHeight: '38px', letterSpacing: '-0.64px' }],
        'headline-md':        ['24px', { lineHeight: '31px', letterSpacing: '-0.24px' }],
        'headline-sm':        ['20px', { lineHeight: '28px'                           }],
        'body-lg':            ['16px', { lineHeight: '24px'                           }],
        'body-md':            ['14px', { lineHeight: '21px'                           }],
        'label-md':           ['12px', { lineHeight: '12px', letterSpacing:  '0.6px' }],
        'headline-lg-mobile': ['26px', { lineHeight: '31px', letterSpacing: '-0.52px' }],
      },

      // ── Shadows (Level-1 card / Level-2 modal) ─────────────────────────────
      boxShadow: {
        card:  '0px 2px 4px rgba(27, 46, 94, 0.05)',
        modal: '0px 8px 16px rgba(27, 46, 94, 0.10)',
      },

      // ── Border radius ──────────────────────────────────────────────────────
      // Tailwind defaults already match the design scale perfectly:
      //   rounded    = 4px  (radius.sm)
      //   rounded-lg = 8px  (inputs & buttons)
      //   rounded-xl = 12px (cards)
      //   rounded-2xl= 16px (radius.lg)
      //   rounded-3xl= 24px (radius.xl  — action-sheet top corners)
      //   rounded-full       (status chips)
      // No overrides needed.

      // ── Spacing extras ─────────────────────────────────────────────────────
      // Default Tailwind scale covers all design tokens:
      //   1  =  4px  (xs)
      //   2  =  8px  (sm / stackSm)
      //   4  = 16px  (md / stackMd / containerPadding)
      //   6  = 24px  (lg / stackLg)
      //   8  = 32px  (xl)
      //  12  = 48px  (xxl)
      //  14  = 56px  (min list-row height)
      // No overrides needed.
    },
  },

  plugins: [],
};
