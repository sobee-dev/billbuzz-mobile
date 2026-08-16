// ─────────────────────────────────────────────────────────────────────────────
// globals.ts — BillBuzz design tokens + NativeWind class strings
//
// Raw value exports (colors / spacing / radius / shadows) are kept for the
// rare cases where a JS value is required instead of a class name — e.g.
// LinearGradient colors[], shadowColor, or programmatic calculations.
//
// Component styles are exported as the `tw` object: plain class-name strings
// consumed via NativeWind's `className` prop.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Raw color tokens ────────────────────────────────────────────────────────
// Use these wherever a hex string is required (LinearGradient, StatusBar, etc.)
// For className-based styling use the Tailwind utilities (bg-primary, etc.)

export const colors = {
  surface:                  '#fbf8fd',
  background:               '#fbf8fd',
  onSurface:                '#1b1b1f',
  onSurfaceVariant:         '#45464f',
  outline:                  '#757680',
  gray:                     '#c5c6d0',
  surfaceTint:              '#4b5d8f',
  primary:                  '#0a1f4d',
  onPrimary:                '#ffffff',
  primaryContainer:         '#1b2e5e',
  lightBlue:                '#334576',
  secondary:                '#795900',
  onSecondary:              '#ffffff',
  secondaryContainer:       '#fece65',
  onSecondaryContainer:     '#755700',
  secondaryFixed:           '#ffdf9f',
  secondaryFixedDim:        '#eec058',
  onSecondaryFixed:         '#261a00',
  onSecondaryFixedVariant:  '#5b4300',
  tertiary:                 '#2f1500',
  onTertiary:               '#ffffff',
  tertiaryContainer:        '#4d2700',
  onTertiaryContainer:      '#c68c5c',
  tertiaryFixed:            '#ffdcc2',
  tertiaryFixedDim:         '#f9b985',
  onTertiaryFixed:          '#2e1500',
  onTertiaryFixedVariant:   '#683c13',
  error:                    '#ba1a1a',
  onError:                  '#ffffff',
  errorContainer:           '#ffdad6',
  onErrorContainer:         '#93000a',
  white:                    '#ffffff',
  statusPaidBg:             '#e6f4ea',
  statusPaidFg:             '#1e7e34',
  statusUnpaidBg:           '#fff8e1',
  statusUnpaidFg:           '#795900',
  statusDraftBg:            '#f0f0f4',
  statusDraftFg:            '#45464f',
  statusCancelledBg:        '#ffdad6',
  statusCancelledFg:        '#93000a',
} as const;

// ─── Raw spacing tokens (px) ─────────────────────────────────────────────────
// Use for numeric props that don't accept className (e.g. gap={spacing.sm})

export const spacing = {
  containerPadding: 16,
  gutter:           16,
  stackSm:           8,
  stackMd:          16,
  stackLg:          24,
  xs:                4,
  sm:                8,
  md:               16,
  lg:               24,
  xl:               32,
  xxl:              48,
} as const;

// ─── Raw radius tokens (px) ──────────────────────────────────────────────────

export const radius = {
  sm:      4,    // rounded
  default: 8,    // rounded-lg  — inputs & buttons
  md:      12,   // rounded-xl  — cards
  lg:      16,   // rounded-2xl
  xl:      24,   // rounded-3xl — action-sheet top corners
  full:    9999, // rounded-full
} as const;

// ─── Raw shadow tokens ───────────────────────────────────────────────────────
// Use these when you need exact native shadow props (shadowColor, elevation…)
// For web / className use shadow-card / shadow-modal from tailwind.config.js

export const shadows = {
  card: {
    shadowColor:   '#1b2e5e',
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius:  4,
    elevation:     2,
  },
  modal: {
    shadowColor:   '#1b2e5e',
    shadowOffset:  { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius:  16,
    elevation:     8,
  },
} as const;

// ─── NativeWind class-name strings ───────────────────────────────────────────
// Apply via the `className` prop:  <View className={tw.card} />

export const tw = {

  // ── Layout ────────────────────────────────────────────────────────────────
  screen:    'flex-1 bg-background',
  container: 'flex-1 bg-background px-4',
  safeArea:  'flex-1 bg-background',

  // ── Typography ────────────────────────────────────────────────────────────
  // Text-only classes — compose with a color class on the element itself
  type: {
    headlineLg:       'font-inter text-headline-lg font-bold',
    headlineMd:       'font-inter text-headline-md font-semibold',
    headlineSm:       'font-inter text-headline-sm font-semibold',
    bodyLg:           'font-inter text-body-lg font-normal',
    bodyMd:           'font-inter text-body-md font-normal',
    labelMd:          'font-inter text-label-md font-semibold uppercase',
    headlineLgMobile: 'font-inter text-headline-lg-mobile font-bold',
  },

  // ── Cards ─────────────────────────────────────────────────────────────────
  card:            'bg-white rounded-xl p-4 shadow-card',
  cardCompact:     'bg-white rounded-xl px-4 py-3 shadow-card',

  // ── Buttons ───────────────────────────────────────────────────────────────
  btn: {
    // Primary — Navy fill
    primary:      'h-12 bg-primary-container rounded-lg items-center justify-center px-6',
    primaryText:  'font-inter text-body-lg font-bold text-white',

    // Secondary — Amber fill
    secondary:    'h-12 bg-secondary-container rounded-lg items-center justify-center px-6',
    secondaryText:'font-inter text-body-lg font-semibold text-on-secondary-container',

    // Ghost — transparent with navy border
    ghost:        'h-12 bg-transparent border border-primary-container rounded-lg items-center justify-center px-6',
    ghostText:    'font-inter text-body-lg font-semibold text-primary-container',
  },

  // ── Input fields ──────────────────────────────────────────────────────────
  input: {
    label:        'font-inter text-label-md font-semibold uppercase text-on-surface-variant mb-1',
    field:        'h-12 rounded-lg border border-[#dee2e6] bg-white px-4 font-inter text-body-md text-on-surface',
    fieldFocused: 'border-primary-container',
  },

  // ── Status chips ──────────────────────────────────────────────────────────
  chip: {
    base:          'rounded-full px-2 py-1 self-start',
    paid:          'bg-status-paid-bg',
    paidText:      'font-inter text-label-md font-semibold uppercase text-status-paid-fg',
    unpaid:        'bg-status-unpaid-bg',
    unpaidText:    'font-inter text-label-md font-semibold uppercase text-status-unpaid-fg',
    draft:         'bg-status-draft-bg',
    draftText:     'font-inter text-label-md font-semibold uppercase text-status-draft-fg',
    cancelled:     'bg-status-cancelled-bg',
    cancelledText: 'font-inter text-label-md font-semibold uppercase text-status-cancelled-fg',
  },

  // ── List rows ─────────────────────────────────────────────────────────────
  list: {
    row:        'min-h-[56px] flex-row items-center px-4 border-b border-[#e9ecef] bg-white',
    rowContent: 'flex-1 py-2',
  },

  // ── Divider ───────────────────────────────────────────────────────────────
  divider: 'h-px bg-[#e9ecef]',

  // ── Section header ────────────────────────────────────────────────────────
  sectionHeader: 'font-inter text-label-md font-semibold uppercase text-on-surface-variant py-2 px-4 bg-background',

  // ── Modal / bottom sheet ──────────────────────────────────────────────────
  modal: {
    overlay: 'flex-1 bg-[rgba(27,46,94,0.4)] justify-end',
    sheet:   'bg-white rounded-t-3xl p-6 shadow-modal',
  },

} as const;
