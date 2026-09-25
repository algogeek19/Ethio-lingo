---
name: Ethio-Lingo Editorial System
colors:
  surface: '#fff8f6'
  surface-dim: '#e4d7d4'
  surface-bright: '#fff8f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fef1ed'
  surface-container: '#f8ebe7'
  surface-container-high: '#f2e5e2'
  surface-container-highest: '#ece0dc'
  on-surface: '#201a18'
  on-surface-variant: '#55433d'
  inverse-surface: '#362f2d'
  inverse-on-surface: '#fbeeea'
  outline: '#88726c'
  outline-variant: '#dbc1ba'
  surface-tint: '#99452b'
  primary: '#752b12'
  on-primary: '#ffffff'
  primary-container: '#934127'
  on-primary-container: '#ffc4b2'
  inverse-primary: '#ffb59f'
  secondary: '#9f4124'
  on-secondary: '#ffffff'
  secondary-container: '#ff8b68'
  on-secondary-container: '#752307'
  tertiary: '#573e00'
  on-tertiary: '#ffffff'
  tertiary-container: '#755400'
  on-tertiary-container: '#f9ca70'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbd0'
  primary-fixed-dim: '#ffb59f'
  on-primary-fixed: '#3a0a00'
  on-primary-fixed-variant: '#7a2f16'
  secondary-fixed: '#ffdbd1'
  secondary-fixed-dim: '#ffb59f'
  on-secondary-fixed: '#3a0a00'
  on-secondary-fixed-variant: '#7f2a0e'
  tertiary-fixed: '#ffdea4'
  tertiary-fixed-dim: '#eec067'
  on-tertiary-fixed: '#261900'
  on-tertiary-fixed-variant: '#5d4200'
  background: '#fff8f6'
  on-background: '#201a18'
  surface-variant: '#ece0dc'
typography:
  display-hero:
    fontFamily: Playfair Display
    fontSize: 64px
    fontWeight: '400'
    lineHeight: 72px
    letterSpacing: -0.02em
  display-hero-mobile:
    fontFamily: Playfair Display
    fontSize: 40px
    fontWeight: '400'
    lineHeight: 48px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 40px
    fontWeight: '500'
    lineHeight: 48px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 30px
    fontWeight: '500'
    lineHeight: 38px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Playfair Display
    fontSize: 28px
    fontWeight: '500'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.04em
  label-mono:
    fontFamily: Space Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.08em
  caption:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 3rem
  margin-mobile: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.75rem
  space-xl: 3rem
---

## Brand & Style
This design system pairs the structural cadence of Swiss avant-garde publication layouts with the micro-mechanical precision of haute horlogerie. Built for linguistic scholarship, dialectology, and cultural preservation, it treats language acquisition as an exacting, premium pursuit.

### Aesthetic Principles
- **Editorial Tension & Asymmetry:** Dynamic focal points balancing massive display typography against high-density lexicographical annotations, avoiding formulaic card cascades.
- **Horological Precision:** Razor-sharp geometry, hairline dividers, precision numerals, monospaced metadata callouts, and meticulous micro-labels.
- **Warm Archival Materiality:** Tactile warmth via alabaster parchment, rich burnt terracotta ink tones, and subtle bronze illumination—eschewing clinical cold grays.
- **Academic Serenity:** Generous margins, disciplined reading rhythms, and intentional negative space that invite scholarly contemplation.

## Colors
The palette evokes ancient parchment manuscripts, terracotta clays of the Rift Valley, and patinated bronze instruments.

### Palette Architecture
- **Primary (`#934127` - Burnt Terracotta):** Used for focal action points, structural accents, and high-emphasis typographic anchors.
- **Secondary (`#B85435` - Raw Sienna):** Secondary emphasis, state transitions, interactive hovers, and philological tagging.
- **Tertiary (`#C49A45` - Horological Bronze):** Precision indicators, badge highlights, pronunciation indicators, and fine border glints.
- **Neutral Dark (`#201A18` - Obsidian Umber):** High-contrast display headlines, body reading text, and framing structures.
- **Canvas Base (`#FCFBF8` - Warm Alabaster Parchment):** The foundation in light mode, soft on eyes during extended reading sessions.

### Dark Mode Adaptation
- Background shifts to Obsidian Ink (`#12100E`), with card surfaces elevated to Bronzed Basalt (`#1A1715`).
- Terracotta brightens to `#C25E3E` for contrast; Bronze illuminates to `#E0B662` to deliver subtle warm halos against dark planes.

## Typography
Typographic pairings counterpoise classical high-contrast serifs with geometric, humanized sans-serifs and monospaced technical apparatus labels.

### Typographic Roles
- **Headlines (`Playfair Display`):** Conveys academic authority, literary prestige, and classical beauty. Italic styles are reserved for Ge'ez transcriptions, etymological root stems, and editorial callouts.
- **Body (`Plus Jakarta Sans`):** Provides immaculate legibility at sustained reading scales. Its geometric clarity balances the expressive display serif.
- **Indices & Chronographs (`Space Mono`):** Applied to IPA phonetic transcriptions, grammar metadata, verse counters, audio timestamps, and lexical tier classification.

## Layout & Spacing
The layout follows an asymmetrical 12-column editorial broadsheet grid, utilizing deliberate tension between expansive negative white space and ultra-dense data ribbons.

### Responsive Breakpoints & Composition
- **Desktop (1200px+):** 12 columns with 3rem outer margins. Typical compositions use a 7:5 ratio (7 columns for primary literary text and translation, 5 columns for etymology, morphology tools, and glosses) or a 3:9 configuration for lexical index exploration.
- **Tablet (768px - 1199px):** 8 columns with 2rem margins, shifting sidebar data panels into contextual expandable margins beneath sections.
- **Mobile (< 768px):** 4 columns with 1.25rem margins. Stacked hierarchy with sticky bottom-anchored transliteration controls and swipeable grammatical cards.

## Elevation & Depth
Elevation eschews blurry, diffuse drop shadows in favor of razor-sharp spatial delineation, tonal layering, and hair-thin metallic boundaries.

### Depth Mechanics
- **The Ground Plain:** Inactive surfaces rest on the Warm Alabaster (`#FCFBF8`) background.
- **Subtle Offset Borders:** Hairline borders (`1px solid rgba(147, 65, 39, 0.12)`) establish structural containment. In dark mode, lines transition to `rgba(196, 154, 69, 0.18)` providing an architectural bronze armature.
- **Warm Parchment Glow:** Elevated drawers and context panels float with a directional ambient cast: `0 8px 32px -4px rgba(32, 26, 24, 0.05), 0 2px 6px 0 rgba(147, 65, 39, 0.03)`.
- **Active / Dial Focus:** Active linguistic nodes and recording controls project an ultra-fine 1px ring coupled with an outer 3px warm amber diffusion (`0 0 0 3px rgba(184, 84, 53, 0.15)`).

## Shapes
To reinforce the horological precision and literary printing-press discipline, elements adhere to crisp, razor-sharp rectangular geometry (`roundedness: 0`). 

No rounded bubbly forms exist within this system; corners are clean, mathematically pure 90-degree joins. Pill shapes and rounded tokens are discarded in favor of beveled edge indicators, framed corners, and hairline structural boxing.

## Components

### Buttons & Interactive Triggers
- **Primary Action:** Solid Burnt Terracotta (`#934127`) fill, sharp 90-degree corners, text set in `label-lg` uppercase letter-spaced with white ink (`#FFFFFF`). Zero border radius. On hover, background shifts to Raw Sienna (`#B85435`) with an instantaneous crisp 120ms transition.
- **Scholarly Secondary:** Transparent background, framed by a 1px border in Terracotta (`#934127`). Ink color matches border. Hovering initiates an inverted fill state.
- **Monastic Text Triggers:** Understated inline text triggers featuring an offset bottom border (1px solid `#C49A45`) that animates outward from center on hover.

### Chips & Dialect Badges
- Set strictly in `label-mono` with uppercase styling.
- Compact dimensions: `2px 8px` internal padding, razor corners.
- Tinted background in Alabaster Umber (`rgba(32, 26, 24, 0.04)`) enclosed in a hairline border of Bronze (`#C49A45`). Used for language variants: `GE'EZ`, `AMHARIC`, `TIGRINYA`, `OROMO`.

### Form Inputs & Philological Search
- Framed with bottom-only 1.5px architectural rules or complete hairline perimeter boxes.
- Background remains pristine `#FFFFFF` (Light) or `#1A1715` (Dark).
- Focus states do not use heavy system outlines; they illuminate via a crisp 1px stroke of Terracotta paired with a micro-tag indicator in `label-mono` indicating input mode (e.g., `FIDEL INPUT [ON]`).

### Lexical & Grammatical Cards
- Bordered in hairline bronze-parchment rules (`1px solid rgba(147, 65, 39, 0.15)`).
- Cards omit drop shadows, distinguishing themselves purely via tonal surface shifts and asymmetric internal padding (`space-lg` top/bottom, `space-xl` lateral).
- Section headers within cards feature a monospaced catalog ID (e.g., `[ET-AM-0428]`) positioned in the upper right quadrant.

### Checkboxes, Radios & Precision Selectors
- Checkboxes: 16x16px razor-sharp squares. Active state fills with `#934127` displaying an architecturally drawn tick mark.
- Dialect Selectors: Diamond-rotated indicators (45-degree angled squares) for radio items, invoking classic mechanical watch hands.

### Bespoke Domain Components
- **Pronunciation Waveform Track:** Hairline audio frequency meters rendered in Raw Sienna with bronze current-position needles.
- **Etymological Root Tree:** Connecting lines rendered as ultra-fine dotted rules (`1px dotted #B85435`) linking modern vocabulary back to classical Ge'ez roots.
- **Vocabulary Progress Vernier:** Inspired by horological power-reserve indicators, presenting mastery percentages via engraved linear rules rather than common rounded progress bars.