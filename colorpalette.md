# Zero Leak AI — Color Palette & Color Theory

## Overview

The color palette is derived directly from the **`/public/logo-zeroleakai.webp`** brand mark. All UI colors are either extracted from the logo, or are mathematically derived from those hues using established color theory principles to ensure a cohesive, premium feel.

---

## Brand Source Colors (from logo)

These are the two primary hues present in the logo illustration.

| Role | Name | Hex | RGB | Where in Logo |
|---|---|---|---|---|
| Primary | **Brand Navy** | `#2d4055` | 45, 64, 85 | Gear body, pipe fitting, structural elements |
| Primary Dark | **Brand Navy Dark** | `#1a2a3a` | 26, 42, 58 | Deepest shadows, wordmark text |
| Secondary | **Brand Cyan** | `#00cce0` | 0, 204, 224 | Circuit trace lines, center LED glow |
| Secondary Dark | **Brand Cyan Dark** | `#009eb0` | 0, 158, 176 | Darker cyan for contrast/hover states |

### CSS Variables
```css
--brand-navy:       #2d4055;
--brand-navy-dark:  #1a2a3a;
--brand-navy-light: rgba(45, 64, 85, 0.08);   /* tint for backgrounds/highlights */
--brand-cyan:       #00cce0;
--brand-cyan-dark:  #009eb0;
--brand-cyan-light: rgba(0, 204, 224, 0.10);  /* tint for backgrounds/highlights */
```

---

## Color Theory Framework

### 1. Hue Family — Analogous Cool Palette

Both logo colors (navy `#2d4055` and cyan `#00cce0`) sit in the **blue-teal quadrant** of the HSL color wheel:

- Navy: HSL ≈ **210°, 31%, 25%**
- Cyan: HSL ≈ **187°, 100%, 44%**

These hues are only ~23° apart on the wheel, making them **analogous** — naturally harmonious, low tension, professional, and calm. This is ideal for a B2B SaaS product where trust and precision are the brand values.

```
Color Wheel Position (simplified)
─────────────────────────────────
         0° Red
        /
  300° Magenta       60° Yellow
      |                   |
  240° Blue ──── 180° Cyan ──── 120° Green
      |
  210° Navy (brand)
  187° Cyan (brand)
        ↑ analogous zone (~23° apart)
```

### 2. Backgrounds — Low-Saturation Tints of Brand Navy

Rather than using a neutral grey (which reads as warm against a cool palette), backgrounds are **very low-saturation tints of the brand navy hue**. This technique — known as **tinted neutrals** — ensures the entire UI feels cohesive and cool-toned.

```
Brand Navy HSL: 210°, 31%, 25%
↓ reduce saturation to ~15-20%, raise lightness to 95-97%
Background:     210°, 18%, 95%  → #eef4f7
Card:           210°, 18%, 97%  → #f8fbfd
Subtle:         210°, 18%, 92%  → #e2edf3
```

This is why the backgrounds feel "cool" without looking blue — the saturation is almost imperceptible but directionally correct.

### 3. Text Colors — Navy-Shifted Dark Tones

Text colors follow the same principle: instead of pure warm blacks (`#0d0d12`), they are shifted slightly toward the navy hue, keeping the eye in the same color family throughout the full value range (light → dark).

| Role | Hex | HSL approx | Notes |
|---|---|---|---|
| Primary text | `#0d1a26` | 210°, 50%, 10% | Navy-shifted near-black |
| Secondary text | `#4a5f72` | 210°, 21%, 36% | Mid-tone navy-grey |
| Muted text | `#9898b0` | 240°, 10%, 65% | Subtle lavender-grey |

### 4. Accent Blue — Functional Contrast

The interactive accent (`#2e62ff`) is a **bright pure blue** positioned at ~220° on the color wheel — adjacent to the navy hue. It is intentionally more saturated than the brand navy to create clear **figure-ground contrast** for interactive elements (buttons, links, focus rings) while staying within the cool hue family.

```
Navy:   210°, 31%, 25%   (structural — "the logo")
Accent: 220°, 100%, 60%  (interactive — "click here")
```

The accent is deliberately NOT cyan, so it doesn't compete with the logo's glow effect.

---

## Full CSS Variable Reference

### Backgrounds & Surfaces
```css
--bg-color:   #eef4f7;   /* page background — cool blue-grey tint */
--bg-card:    #f8fbfd;   /* card surfaces — near-white, cool breath */
--bg-subtle:  #e2edf3;   /* inset / hover areas — slightly deeper cool grey */
```

### Text
```css
--text-primary:   #0d1a26;   /* navy-shifted near-black */
--text-secondary: #4a5f72;   /* mid-tone navy-grey */
--text-muted:     #9898b0;   /* de-emphasized, lavender-grey */
```

### Interactive Accent
```css
--accent:        #2e62ff;              /* bright blue for CTAs and links */
--accent-hover:  #1e4de0;              /* darkened for hover state */
--accent-light:  rgba(46, 98, 255, 0.08);  /* for focus rings / subtle tints */
```

### Borders
```css
--border-color:  #cddbe6;   /* cool blue-grey — default borders */
--border-strong: #aac2d1;   /* stronger borders for emphasis */
```

### Shadows
```css
--shadow-sm: 0 1px 4px rgba(0,0,0,0.06), 0 0 1px rgba(0,0,0,0.04);
--shadow-md: 0 4px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05);
--shadow-lg: 0 12px 40px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06);
```

### Brand Colors (from logo)
```css
--brand-navy:       #2d4055;
--brand-navy-dark:  #1a2a3a;
--brand-navy-light: rgba(45, 64, 85, 0.08);
--brand-cyan:       #00cce0;
--brand-cyan-dark:  #009eb0;
--brand-cyan-light: rgba(0, 204, 224, 0.10);
```

---

## Gradient Usage

### Hero Headline (`h1`)
```css
background: linear-gradient(120deg,
  var(--brand-navy-dark) 0%,   /* #1a2a3a — dark navy anchor */
  var(--brand-navy)      50%,  /* #2d4055 — mid navy */
  var(--brand-cyan)      100%  /* #00cce0 — cyan burst */
);
```
Reads left-to-right as "depth to energy" — mimics the logo's structural-to-glowing aesthetic.

### Logo Divider Bar
```css
background: linear-gradient(90deg,
  var(--brand-cyan),   /* #00cce0 */
  var(--brand-navy)    /* #2d4055 */
);
```
A compact horizontal gradient that anchors the logo lockup visually.

---

## Semantic / Status Colors

These colors are used for system feedback and are intentionally **desaturated and darkened** compared to raw web-safe values so they don't clash with the cool palette.

| Meaning | Hex | Usage |
|---|---|---|
| Success / Contacted | `#16a34a` | Contacted lead badge, copy-success state |
| Error / Urgent | `#dc2626` | Timer overdue badge, error messages |
| Focus ring | `rgba(46, 98, 255, 0.12)` | Input focus state (accent-based) |

> **Note:** The leads dashboard formerly used `#E50914` (Netflix red) for card hover states. This was replaced with `var(--brand-navy)` as it was visually jarring against the cool palette and not semantically meaningful on hover.

---

## Do's and Don'ts

| ✅ Do | ❌ Don't |
|---|---|
| Use brand navy / cyan for decorative accents | Use warm greys (`#f4f4f4`) — they read as red-tinted |
| Keep backgrounds in the 210° cool hue family | Introduce warm yellows or reds outside of semantic status contexts |
| Use `--accent` (`#2e62ff`) for all interactive elements | Use brand cyan for interactive CTAs — it's reserved for the logo glow |
| Use `--brand-navy-light` / `--brand-cyan-light` for subtle tints | Use full-saturation brand colors as backgrounds |
| Keep shadows with near-zero color (rgba black) | Tint shadows with cyan/blue unless intentional (glow effect) |

---

## Design System Philosophy

The palette follows a **monochromatic + accent** structure built on a single hue family (210–187° blue-teal), with one high-saturation outlier (the `#2e62ff` interactive accent). This creates:

1. **Visual calm** — no competing warm/cool tension across the page.
2. **Brand coherence** — every UI element references the logo's own colors.
3. **Clear hierarchy** — dark text → mid surfaces → light backgrounds, all within the same hue family.
4. **Accessibility** — the navy-on-white and cyan-on-navy pairings all maintain sufficient contrast for WCAG AA compliance at their intended sizes.
