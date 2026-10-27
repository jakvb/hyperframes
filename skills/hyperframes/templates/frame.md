---
version: alpha
name: "LOOK-NOT-CHOSEN"
description: >
  Neutral template. It intentionally carries no palette, type family, material or motion
  language. Replace every value with the look the subject earns before the first scene,
  then delete the LOOK-NOT-CHOSEN marker. The lint fails while the marker remains.
unit: the frame - 1920x1080 primary; 9:16 and 1:1 documented
principle: the subject's own material · one accent per frame · the mechanism carries the argument
colors:
  bg: ""
  ink: ""
  ink-muted: ""
  accent: ""
  secondary: ""
  line: ""
  surface: ""
  surface-strong: ""
  positive: ""
  negative: ""
typography:
  display:   { fontFamily: "", weight: 600, cqw: 5.2, lineHeight: 0.96, tracking: "-0.015em", color: "ink" }
  title:     { fontFamily: "", weight: 500, cqw: 3.2, lineHeight: 1.0, tracking: "-0.01em", color: "ink" }
  subtitle:  { fontFamily: "", weight: 400, cqw: 1.35, lineHeight: 1.35, color: "ink-muted" }
  body:      { fontFamily: "", weight: 400, cqw: 1.05, lineHeight: 1.5, color: "ink" }
  label:     { fontFamily: "", weight: 700, px: 24, tracking: "0.08em", upper: true, color: "secondary" }
  data:      { fontFamily: "", weight: 500, cqw: 1.5, lineHeight: 1.1, color: "ink" }
  data-hero: { fontFamily: "", weight: 600, cqw: 3.6, lineHeight: 1.0, color: "accent" }
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
    texture: ""
    description: ""
  headline:
    typography: "{typography.display}"
    color: "{colors.ink}"
    description: ""
  data-plate:
    backgroundColor: "{colors.surface}"
    border: "1px solid {colors.line}"
    description: ""
  callout:
    borderLeft: "6px solid {colors.accent}"
    description: ""
  diagram-line:
    stroke: "{colors.ink}"
    strokeWidth: ""
    description: ""
  annotation:
    typography: "{typography.label}"
    color: "{colors.secondary}"
    description: ""
---

# Look not chosen

This file is a contract with holes, not a look. It exists so every episode decides its
medium before it draws a frame.

## Choose the medium

Take the look from the subject's own world: its material, its era, the place it happens,
the instrument that measures it, the way it was printed or displayed. A particle detector
is not paper; a 1970s terminal is not newsprint; an ocean current is not a stationery
catalogue. Write the choice in `SPEC.md` as numbers, not adjectives.

If the person named a brand, a reference film or a preset, that wins. Otherwise choose,
and say why in one clause.

## Fill the tokens

- `colors`: ground, ink, one accent and at most one secondary. `surface` is a raised plate
  or band; `line` is the hairline. Remove `LOOK-NOT-CHOSEN` when these are real.
- `typography`: display, title, body, label and data. Use a bundled face or ship the font
  files in `assets/fonts/`.
- `spacing`: keep the safe areas and grid unless the film has a reason to change them.
- `components`: name the one elevation, the one accent gesture, how lines are drawn, how
  labels sit on the part. These are the rules the scenes reuse.

## Do

- Let the material determine the motion: paper is cut and stamped, ink is printed, glass
  refracts, clay is pressed, a terminal types.
- One accent per frame, on the thing that must be remembered.
- Put labels on the part they name, with a leader line when the part is small.
- Keep the ground flat; texture is a surface, not a demo.

## Don't

- Don't leave a value empty and let a scene fall back to the browser default.
- Don't default to a dark void with glow, or to cream paper with a serif and mono labels.
- Don't use a look just because it is easy to render; use it because the subject is made
  of that material.
- Don't put three cards in a row or a bullet slide on the paper.
- Don't import web-page chrome: navigation, buttons, pills, carousels, card grids, dashboards,
  eyebrow labels, or labels below 24 px. Text meant to be read is at least 28 px.

## Motion

- Pick the entrance language from the medium, not from a preset.
- One hero move per shot; everything else holds.
- A landed title is still; move the diagram, the camera or the next part.

## Video facts

- Flat fills and low grain survive H.264; gradients on mid-tones band.
- 0.5px hairlines disappear; 2px structural lines survive at 1080p.
- Text below 28px is not readable on a phone; cut words, never shrink type.

## Re-brand

Declare the palette and fonts as root variables and point every scene at them, so the
series can be re-skinned without editing each composition.
