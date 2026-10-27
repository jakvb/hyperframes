---
version: alpha
name: Field Manual - educational technical video look
description: >
  A warm putty ground, near-black ink, condensed Oswald display, Lato reading text and IBM Plex
  Mono only for measurements. One vermilion accent carries the thing that matters; a deep teal
  secondary carries structure. The unit is the 1920x1080 frame. No glow, no gradients, no floating
  cards, no serif pastiche.
unit: the frame - 1920x1080 primary; 9:16 and 1:1 documented
principle: the subject's own material · one accent per frame · the mechanism carries the argument
colors:
  bg: "#d8cfbf"
  ink: "#171512"
  ink-muted: "#5f574b"
  accent: "#cf431c"
  secondary: "#124b46"
  line: "#9c9180"
  paper-light: "#e7dfd2"
  paper-dark: "#c2b7a4"
  positive: "#2f6b4f"
  negative: "#a32a1c"
typography:
  display:   { fontFamily: "Oswald", weight: 600, cqw: 5.2, lineHeight: 0.96, tracking: "-0.015em", color: "ink" }
  title:     { fontFamily: "Oswald", weight: 500, cqw: 3.2, lineHeight: 1.0, tracking: "-0.01em", color: "ink" }
  subtitle:  { fontFamily: "Lato", weight: 400, cqw: 1.35, lineHeight: 1.35, color: "ink-muted" }
  body:      { fontFamily: "Lato", weight: 400, cqw: 1.05, lineHeight: 1.5, color: "ink" }
  label:     { fontFamily: "Lato", weight: 700, px: 24, tracking: "0.08em", upper: true, color: "secondary" }
  data:      { fontFamily: "IBM Plex Mono", weight: 500, cqw: 1.5, lineHeight: 1.1, color: "ink" }
  data-hero: { fontFamily: "IBM Plex Mono", weight: 600, cqw: 3.6, lineHeight: 1.0, color: "accent" }
spacing:
  margin-x: "5cqw"
  margin-y: "5cqw"
  safe-action: "90%"
  safe-title: "80%"
  grid: "12 columns, 2cqw gutter"
  rule: "1px {colors.line}"
components:
  ground:
    backgroundColor: "{colors.bg}"
    texture: "pre-rendered paper grain PNG, 2-3% opacity"
    description: "Flat putty ground; no gradient, no vignette."
  headline:
    typography: "{typography.display}"
    color: "{colors.ink}"
    description: "Condensed, left-aligned, max 2 lines, one accent word."
  data-plate:
    backgroundColor: "{colors.paper-light}"
    border: "1px solid {colors.line}"
    description: "A measurement sits on a light plate with a mono number and a small unit label."
  callout:
    borderLeft: "6px solid {colors.accent}"
    backgroundColor: "rgba(207,67,28,0.06)"
    description: "One per frame; the thing the viewer must remember."
  diagram-line:
    stroke: "{colors.ink}"
    strokeWidth: "6px"
    description: "Structural lines are ink; the animated path is accent."
  annotation:
    typography: "{typography.label}"
    color: "{colors.secondary}"
    description: "Direct label on the part; no legend."
  progress:
    backgroundColor: "{colors.ink}"
    fill: "{colors.accent}"
    size: "4px"
    description: "Optional chapter progress at the bottom edge."
---

# Field Manual - educational technical video look

## Overview

This is a working notebook blown up to 1920x1080: warm putty stock, dense black ink, and one
vermilion mark that shows what matters now. It should feel like a page an engineer actually marked
up, not a design system demo. The medium is paper and ink, so the motion is cutting, stamping,
drawing and revealing - not glowing, floating or fading.

## Do

- Keep the ground flat and the grain low (2-3%). Paper is a surface, not a texture demo.
- Use Oswald for the one sentence that must land. Use Lato for everything read at length.
- Use IBM Plex Mono only for numbers, units, coordinates and code. Never for body copy.
- One accent element per frame: the measured part, the route, the number that changed.
- Let diagrams be drawn, not assembled from cards. Lines are ink; the active path is vermilion.
- Put labels on the part they name, with a leader line when the part is small.
- Let the frame breathe: 5cqw margins, a 12-column grid, one hero object.
- Cut between worlds with a cause: an object becomes the next shot.

## Don't

- Don't use a dark void, glow, bloom, particles, glass cards or purple gradients.
- Don't put the display face in italic, or pair the putty ground with a serif.
- Don't make three cards in a row, a KPI grid, or a bullet slide.
- Don't fade and slide up every element; don't let a landed title drift.
- Don't put the logo in a corner; the mark lands once, at the end, if the channel needs it.
- Don't let the accent cover more than one idea per frame.
- Don't put small text on the paper grain without checking contrast at 1080p.

## Motion

- Entrances: draw-on for paths, a stamp for data plates, per-word blur for headlines (6px -> 0,
  0.13s, 0.067s apart). No uniform fade-and-slide.
- A landed headline is dead still. Move the diagram, the camera or the next part instead.
- One hero move per shot; secondary moves travel 50-70% as far and start 100-200ms later.
- Cuts happen on the fastest frame of a move; at most a third of scene seams are hard cuts.
- Holds: 0.5s + 0.3s per word for read text; last line at least 2s.

## Video facts

- A full-screen linear gradient on a mid-tone ground bands under H.264; use flat fill plus grain.
- Accents below 15% opacity vanish in compression; atmosphere at 15-25%, focal accents full.
- 1px rules survive; 0.5px hairlines do not. Use 2px for structural lines at 1080p.
- Text smaller than 28px is not readable on a phone; cut words instead.

## Re-brand

Declare the palette and fonts as root variables and point every scene at them, so a series can be
re-skinned without editing each composition.
