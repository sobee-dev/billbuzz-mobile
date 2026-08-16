---
name: BillBuzz Design System
colors:
  surface: '#fbf8fd'
  surface-dim: '#dbd9de'
  surface-bright: '#fbf8fd'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f8'
  surface-container: '#efedf2'
  surface-container-high: '#e9e7ec'
  surface-container-highest: '#e4e2e6'
  on-surface: '#1b1b1f'
  on-surface-variant: '#45464f'
  inverse-surface: '#303034'
  inverse-on-surface: '#f2f0f5'
  outline: '#757680'
  outline-variant: '#c5c6d0'
  surface-tint: '#4b5d8f'
  primary: '#011848'
  on-primary: '#ffffff'
  primary-container: '#1b2e5e'
  on-primary-container: '#8597cd'
  inverse-primary: '#b3c5fe'
  secondary: '#795900'
  on-secondary: '#ffffff'
  secondary-container: '#fece65'
  on-secondary-container: '#755700'
  tertiary: '#2f1500'
  on-tertiary: '#ffffff'
  tertiary-container: '#4d2700'
  on-tertiary-container: '#c68c5c'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b3c5fe'
  on-primary-fixed: '#011848'
  on-primary-fixed-variant: '#334576'
  secondary-fixed: '#ffdf9f'
  secondary-fixed-dim: '#eec058'
  on-secondary-fixed: '#261a00'
  on-secondary-fixed-variant: '#5b4300'
  tertiary-fixed: '#ffdcc2'
  tertiary-fixed-dim: '#f9b985'
  on-tertiary-fixed: '#2e1500'
  on-tertiary-fixed-variant: '#683c13'
  background: '#fbf8fd'
  on-background: '#1b1b1f'
  surface-variant: '#e4e2e6'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: '700'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-padding: 1rem
  gutter: 1rem
  stack-sm: 0.5rem
  stack-md: 1rem
  stack-lg: 1.5rem
---

## Brand & Style
The design system is engineered for a high-utility B2B SaaS environment, specifically tailored for business management on the move. The brand personality is **authoritative, efficient, and reliable**. It balances a traditional corporate backbone with modern mobile-first agility.

The visual style follows a **Corporate Modern** aesthetic with a lean toward **Minimalism**. It prioritizes data density and legibility over decorative flourishes. The interface relies on clear structural hierarchies, intentional whitespace, and a high-contrast palette to ensure that critical business data—like invoice statuses and payment totals—is digestible at a glance.

## Colors
The palette is anchored by a deep **Navy Primary**, evoking trust and stability, complemented by an **Amber Accent** used sparingly for calls to action and critical warnings. 

A neutral **Off-White Background** provides a soft canvas for **Pure White Surfaces**, creating a subtle distinction between the application frame and interactive content cards. Status indicators utilize a semantic color logic:
- **Navy/Gray**: Neutral states (Draft, Confirmed).
- **Green**: Positive states (Paid).
- **Amber**: Pending/Caution states (Unpaid).
- **Red**: Negative states (Cancelled, Error).

## Typography
This design system utilizes **Inter** for all roles to maximize legibility and maintain a systematic, utilitarian feel. 

- **Headlines**: Use heavy weights (600-700) with slight negative letter spacing to feel compact and "news-like."
- **Body Text**: Standardized at 14px for density on mobile, moving to 16px for primary reading experiences.
- **Labels**: Small, uppercase, and slightly tracked out (letter spacing) to differentiate them from interactive body text, perfect for table headers and status chips.

## Layout & Spacing
The layout follows a **Fixed Grid** logic for desktop (centered 12-column) and a **Fluid** model for mobile.

- **Mobile Margins**: A strict 16px (1rem) side padding is maintained across all screens to ensure content does not hit the edge of the device.
- **Vertical Rhythm**: A base-8 unit system is used. Most vertical gaps between related items are 8px, while distinct sections are separated by 16px or 24px.
- **Data Tables**: On mobile, data tables should reflow into card stacks to maintain readability without horizontal scrolling.

## Elevation & Depth
Depth is created through **Tonal Layering** supplemented by **Ambient Shadows**.

- **Level 0 (Background)**: #F8F9FA.
- **Level 1 (Cards/Surfaces)**: #FFFFFF with a very soft, diffused shadow (0px 2px 4px rgba(27, 46, 94, 0.05)). This separates the content from the background without feeling heavy.
- **Level 2 (Modals/Overlays)**: Higher contrast shadows (0px 8px 16px rgba(27, 46, 94, 0.1)) to indicate temporary interaction layers.
- **Outlines**: Use 1px borders in a soft gray (#E9ECEF) for card-internal dividers or to define input fields.

## Shapes
The shape language is professional and approachable, using varied radii to distinguish between containers and controls.

- **Cards**: A 12px radius provides a modern, friendly container for groups of data.
- **Inputs & Buttons**: An 8px radius creates a tighter, more precise look for interactive elements, signaling their function as tools.
- **Status Chips**: Fully pill-shaped (100px) to distinguish them from clickable buttons or static data containers.

## Components

### Buttons
- **Primary**: Navy (#1B2E5E) background with White text. Bold, 8px radius.
- **Secondary**: Amber (#D4A843) background for key conversion points like "Send Invoice."
- **Ghost**: Transparent background with Navy border/text for secondary actions like "Cancel."

### Status Chips
Small, pill-shaped badges using the status colors defined in the palette. Backgrounds should be at 10-15% opacity of the color, with the text at 100% opacity for maximum legibility (e.g., "Paid" has a light green tint background with dark green text).

### Input Fields
- **Height**: 48px for mobile tap-friendliness.
- **Radius**: 8px.
- **Border**: 1px solid #DEE2E6, changing to Primary Navy on focus.
- **Label**: Positioned above the field in Label-MD style.

### Cards
All primary information blocks (Invoices, Clients, Reports) are housed in White (#FFFFFF) cards with a 12px radius and a 16px internal padding.

### Lists
Lists should feature "Divided Rows" with a 1px #E9ECEF bottom border. Each row should have a minimum height of 56px to accommodate thumb taps.