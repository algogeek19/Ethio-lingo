# Ethio-Lingo Editorial Design Brief (UI Restyle)

Translate the current page to the **Ethio-Lingo Editorial System** look. Do NOT copy demo content.

## Golden rules

1. **Preserve ALL logic.** State, handlers, API calls (`src/services/api`), routing, translation (`t()`), auth, wallet/Chapa, chat, PDF report code — never remove or alter behavior. Only change markup/classes/structure/visual copy.
2. **No fake demo content.** No "Dawit Kebede", no "Addis Ababa Clearing House", no fake balances/avatars, no "protocol sandbox simulator" UI. Use real data from context/state/props.
3. **Dark mode must work.** Use design tokens (below); never hardcode light-only colors like `bg-white`, `text-stone-900` for text on light surfaces. Prefer `bg-surface-lowest`, `text-on-surface`, etc.
4. Verify with `npx vite build` in the repo root at the end; fix any errors you introduced.

## Available tokens (all already defined in src/index.css)

Surfaces (light / dark handled automatically):
`bg-canvas` `bg-surface-lowest` `bg-surface-low` `bg-surface-card` `bg-surface-container` `bg-surface-high` `bg-surface-container-high` `bg-surface-container-highest` `bg-surface-soft` `bg-surface-dark`

Text/lines:
`text-on-surface` `text-on-surface-variant` `text-text-muted` `border-hairline` (also `border-hairline/60` `border-hairline/50`)
`text-primary` `bg-primary` `text-primary-coral` `bg-primary-coral` (same as primary) `text-primary-hover` `bg-primary-hover`
`bg-primary-container` `text-primary-fixed-dim` `bg-primary-fixed-dim` `text-on-primary` `bg-on-primary`ish (on-primary is a color: `text-on-primary` on primary buttons)
`text-tertiary` `bg-tertiary` `text-tertiary-fixed-dim` `bg-tertiary-container`/15
`text-error` `bg-error` `text-destructive-red` `text-success-green` `text-warning-amber` `text-streak-orange`

## Font & micro-details (the "little details")

- Headlines: use `font-cormorant` (Cormorant Garamond). Replace old `font-serif font-bold text-X` headings with `font-cormorant text-X font-normal` (occasionally `font-medium`). Serif mastheads read better slightly lighter weight.
- Signature accent: italic Cormorant accent inside headings → `<span className="calligraphic-italic text-primary">Word</span>`.
- Micro-labels/eyebrows: `font-mono text-[9px] or text-[10px] tracking-[0.2em] uppercase text-primary` (a `.mono-micro-label` helper exists too).
- Secondary type: Plus Jakarta Sans (`font-sans` default); monospace for numbers/codes (`font-mono`, `tabular-nums`).
- Buttons: **pill** `rounded-full`. Primary: `rounded-full bg-primary text-on-primary text-xs tracking-wider uppercase font-semibold px-5 py-2.5 hover:bg-primary-container transition-all`. Secondary: `rounded-full bg-surface-container text-on-surface border border-hairline ... hover:bg-surface-container-high`.
- Cards: `bg-surface-container-lowest rounded-2xl border border-hairline/60 shadow-sm p-6 (or p-8)`.
- Status chips: `font-mono text-[9px] px-2 py-0.5 rounded uppercase tracking-wider` with `bg-surface-container text-on-surface-variant` or `bg-primary/10 text-primary`.
- Amounts/metrics: `font-cormorant text-3xl md:text-4xl` (with `text-primary` for the hero amount).
- Page headers: eyebrow mono label + Cormorant `h1/h2 text-4xl md:text-5xl font-normal`, section divided by `border-b border-hairline/50 pb-6`, right-aligned pill buttons with `gap-3`.
- Icons: keep lucide-react; swap any Material Symbol-ish styling to small lucide icons (size 16-20).

## Layout language

- Generous spacing: `px-6 lg:px-12`, `py-10`, `gap-8/10`, `max-w-7xl mx-auto`.
- Dark blocks (rare): `bg-surface-dark` with `text-stone-300/400` + `font-mono` notes and `border-stone-800`.
- Tables/ledger rows: `text-xs font-mono`, header row `font-mono text-[10px] uppercase tracking-widest text-text-muted`, rows bordered `border-t border-hairline/50`.
- Modals: `bg-surface-container-lowest max-w-md w-full p-8 rounded-2xl shadow-2xl border border-hairline` inside `bg-stone-900/60 backdrop-blur-sm` overlay; heading `font-cormorant text-2xl`; inputs `w-full bg-surface-container-low text-xs px-3.5 py-2.5 rounded-xl border border-hairline outline-none`.

## Speed

This is a styling pass on markup + classNames. Restyle the entire page consistently, keep motion/framer usage light (existing patterns fine), and report exactly which files you changed + a 1-line summary of notable class changes. If a build error appears, fix it.