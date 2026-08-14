---
name: Lumina Enterprise
colors:
  surface: '#fcf8ff'
  surface-dim: '#dbd8e4'
  surface-bright: '#fcf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f2fe'
  surface-container: '#efecf8'
  surface-container-high: '#e9e6f3'
  surface-container-highest: '#e4e1ed'
  on-surface: '#1b1b23'
  on-surface-variant: '#464554'
  inverse-surface: '#303038'
  inverse-on-surface: '#f2effb'
  outline: '#767586'
  outline-variant: '#c7c4d7'
  surface-tint: '#494bd6'
  primary: '#4648d4'
  on-primary: '#ffffff'
  primary-container: '#6063ee'
  on-primary-container: '#fffbff'
  inverse-primary: '#c0c1ff'
  secondary: '#8127cf'
  on-secondary: '#ffffff'
  secondary-container: '#9c48ea'
  on-secondary-container: '#fffbff'
  tertiary: '#904900'
  on-tertiary: '#ffffff'
  tertiary-container: '#b55d00'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#f0dbff'
  secondary-fixed-dim: '#ddb7ff'
  on-secondary-fixed: '#2c0051'
  on-secondary-fixed-variant: '#6900b3'
  tertiary-fixed: '#ffdcc5'
  tertiary-fixed-dim: '#ffb783'
  on-tertiary-fixed: '#301400'
  on-tertiary-fixed-variant: '#703700'
  background: '#fcf8ff'
  on-background: '#1b1b23'
  surface-variant: '#e4e1ed'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  title-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
  container-max: 1440px
  gutter: 24px
---

## Brand & Style

The design system is engineered for a high-performance employee recognition environment. It balances "Corporate Professionalism" with a "Tech-Forward Pulse," ensuring the platform feels like a premium tool rather than a utility. 

The aesthetic is rooted in **Modern Glassmorphism**. This approach uses translucency and background blurs to create a sense of depth and hierarchy without the heavy visual weight of traditional shadows. The interface should feel breathable, airy, and sophisticated. 

**Core Principles:**
- **Clarity over Clutter:** Use whitespace and structural alignment to guide the user’s eye.
- **Dynamic Feedback:** Micro-interactions and subtle transitions reinforce the "Kudos" aspect of the platform.
- **Enterprise Reliability:** Despite the modern glass effects, the layout remains strictly organized to support data-heavy HR workflows.

## Colors

The palette is anchored by a sophisticated **Zinc** neutral scale, providing a grounded foundation for the vibrant **Indigo** (Primary) and **Violet** (Secondary) accents. 

- **Primary (Indigo-600):** Used for main call-to-actions, progress indicators, and active states.
- **Secondary (Violet-500):** Reserved for celebratory moments, badges, and high-tier recognition rewards.
- **Glass Surfaces:** In light mode, surfaces are semi-transparent white (`rgba(255, 255, 255, 0.7)`) with a 12px backdrop blur. In dark mode, they utilize a deep zinc (`rgba(24, 24, 27, 0.6)`) with the same blur intensity.
- **Semantic Colors:** Emerald, Rose, and Amber follow a standard functional pattern but use a high-saturation variant to pop against the neutral backgrounds.

## Typography

**Plus Jakarta Sans** is the sole typeface for this design system. Its geometric yet slightly soft apertures provide the "techie" feel while remaining highly legible for enterprise dashboards.

- **Headlines:** Use Bold (700) or ExtraBold (800) for high-impact recognition titles.
- **Body:** Regular (400) for general text to maintain a clean, airy feel.
- **Labels:** SemiBold (600) with increased letter spacing and uppercase styling for small metadata or table headers.
- **Scale:** Maintain a strict 4px or 8px baseline grid to ensure vertical rhythm.

## Layout & Spacing

The layout utilizes a **12-column fluid grid** for desktop, transitioning to an **8-column grid** for tablet and a **4-column grid** for mobile.

- **Margins:** 24px on mobile, 48px on desktop to allow the glassmorphic surfaces to "float" over the canvas.
- **Gutter:** Fixed 24px gutter to maintain clear separation between card-based content.
- **Safe Zones:** Use 16px internal padding (MD) for standard cards and 24px (LG) for high-level summary dashboards.
- **Rhythm:** All spacing must be a multiple of the 4px base unit.

## Elevation & Depth

Elevation is achieved through a combination of transparency and ultra-soft, wide-diffusion shadows.

1.  **Level 0 (Canvas):** The base background layer (Zinc-50 in light, Zinc-950 in dark).
2.  **Level 1 (Cards/Surfaces):** Backdrop-filter: blur(12px) with a 1px solid stroke (White 40% in light, White 10% in dark). This creates the glass edge.
3.  **Level 2 (Modals/Popovers):** Higher blur (20px) and a subtle shadow: `0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)`.
4.  **Tinting:** Shadows in dark mode should be slightly tinted with the Primary color (`rgba(99, 102, 241, 0.15)`) to maintain a "glowing" tech aesthetic.

## Shapes

The design system uses a **Rounded** corner strategy (0.5rem base) to echo the friendly nature of a recognition platform while staying within professional boundaries.

- **Buttons & Small Inputs:** 8px (0.5rem).
- **Cards & Modals:** 16px (1rem).
- **Badges/Chips:** Full pill-shape (999px) to distinguish them from interactive buttons.
- **Avatars:** Circular (100%) to emphasize the human element of the platform.

## Components

### Buttons
- **Primary:** Solid Indigo-600 background with white text. 8px radius.
- **Secondary:** Translucent background (Glass effect) with Indigo-600 text and a 1px Indigo border.
- **Ghost:** No background or border; Indigo text. Used for low-priority actions in tables.

### Cards
- **Structure:** 1px glass border, 16px corner radius, 12px backdrop blur.
- **Usage:** Used for "Kudos" posts, reward items, and user profiles. Headers within cards should have a subtle bottom border (`1px solid`).

### Tables
- **Header:** Zinc-100 (light) or Zinc-900 (dark) background, Label-MD typography.
- **Rows:** Transparent backgrounds with a 1px divider. On hover, apply a 5% opacity primary color tint.

### Input Fields
- **Default State:** 1px Zinc-200 border, white/dark-zinc background.
- **Focus State:** 2px Indigo-600 border with a soft Indigo outer glow (4px spread).

### Badges/Chips
- **Status:** Light background tint of the semantic color (e.g., 10% Emerald) with 100% saturation text of the same color. 
- **Rewards:** Use a gradient background (Indigo to Violet) for "Premium" reward tags.

### Modals
- Centralized with a heavy backdrop blur (`blur(8px)`) on the content behind it. The modal container itself should have the Level 2 elevation and 24px internal padding.