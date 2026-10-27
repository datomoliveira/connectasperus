---
name: Asperus Cast
description: Smart TV Web Slideshow & Wireless Mobile Remote
colors:
  primary: "#f8fafc"
  primary-deep: "#cbd5e1"
  neutral-bg: "#06070a"
  surface-glass: "rgba(30, 36, 50, 0.72)"
  surface-border: "rgba(226, 232, 240, 0.22)"
typography:
  display:
    fontFamily: "'Syne', sans-serif"
    fontSize: "2rem"
    fontWeight: 900
    lineHeight: 1.1
    letterSpacing: "0.04em"
  body:
    fontFamily: "'Outfit', 'Space Grotesk', sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "14px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral-bg}"
    rounded: "{rounded.md}"
    padding: "14px 24px"
---

# Design System: Asperus Cast

## Overview

**Creative North Star: "The Polished Liquid Chrome Deck"**

Asperus Cast pairs high-fidelity dark metal surfaces with crisp, readable silver typography and fluid feedback. It avoids generic flat panels in favor of tactile glass layers with realistic specular highlights, deep shadows, and subtle ambient light.

Key Characteristics:
- High-contrast metallic silver against obsidian black backgrounds (`#06070a`).
- High-legibility typography using Syne for confident headers, Outfit for clean body reading, and Space Mono for status tokens and timings.
- Elimination of decorative AI gradient text in favor of solid, intentional weights.
- Zero-lag tactile touch targets built specifically for one-handed mobile control.

## Colors

The palette is rooted in refined liquid metals, silver chrome highlights, and deep cosmic darks.

### Primary
- **Liquid Silver High** (`#f8fafc`): Primary actions, active play state, and confident display titles.
- **Chrome Mid** (`#cbd5e1`): Secondary buttons, labels, and borders.

### Neutral
- **Obsidian Core** (`#06070a`): Global application canvas background.
- **Liquid Glass Panel** (`rgba(30, 36, 50, 0.72)`): Container fill for floating controls and cards.
- **Specular Glass Border** (`rgba(226, 232, 240, 0.22)`): 1px border conveying physical glass edges.

### Named Rules
**The Solid Typography Rule.** Headings and room codes never use gradient fills or decorative clipping masks; authority and clarity come from font weight, tracking, and contrast.

## Typography

**Display Font:** Syne (fallback: sans-serif)  
**Body Font:** Outfit / Space Grotesk  
**Mono Font:** Space Mono  

### Hierarchy
- **Display** (Weight 900, 2rem to 3rem, letter-spacing +0.04em): Brand headers and pair titles.
- **Headline** (Weight 800, 1.25rem, tracking +0.02em): Section and card titles.
- **Body** (Weight 400, 0.875rem, line-height 1.5): Instructions and file lists.
- **Label / Token** (Weight 700, 0.75rem, uppercase, mono): Room codes and timer chips.

## Layout

Strict viewport constraint:
- **TV Display**: 16:9 widescreen layout with 2-column pairing view that guarantees zero scrollbars on television browsers.
- **Mobile Remote**: Single-column vertical thumb-zone layout, maximum container width of 448px (`max-w-md`), sticky safe-area headers and bottom-padded scrolling for smooth navigation.

## Elevation & Depth

Surfaces rely on multi-layer glass panels with soft blur (`backdrop-filter: blur(28px)`) coupled with multi-stop box shadows that ground elements against the background mesh.

### Vocabulary
- **Card Glass**: `box-shadow: 0 16px 40px -10px rgba(0, 0, 0, 0.8), inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.4)`
- **Button Chrome**: `box-shadow: 0 4px 14px -2px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.35)`

## Shapes

- Containers use a consistent corner radius of 16px (`rounded-2xl`).
- Buttons and touch targets use 12px (`rounded-xl`).
- Micro-badges and status pills use 8px (`rounded-lg`) or fully rounded capsules (`rounded-full`).

## Components

### Buttons
- **Shape**: 12px border radius.
- **Primary Play / Upload**: Bright liquid white with dark obsidian text on active, giving maximum visual pop.
- **Secondary / Action**: Liquid glass with specular border and active scale tap feedback (`active:scale-95`).

### Media Queue Items
- High-contrast list row featuring a 44x44px preview thumbnail, uppercase type badge ("FOTO" / "VÍDEO"), item title, and immediate reorder/delete actions.

## Do's and Don'ts

### Do:
- **Do** maintain crisp, solid text contrast (≥ 4.5:1 ratio) on all interactive controls.
- **Do** test widescreen 16:9 TV viewports to ensure QR codes are fully contained in the quiet zone.
- **Do** preserve immediate tactile feedback (`active:scale-95`) on mobile remote buttons.

### Don't:
- **Don't** apply decorative multi-color gradients across text headings.
- **Don't** use bulky nested cards inside other cards.
- **Don't** let modal viewfinders use clashing thick borders on rounded frames.
