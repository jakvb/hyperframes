---
name: video-design
description: Read before choosing a look or composing a scene for video. Video-first design: subject-derived palette and type, one focal idea, readable type at 1080, and none of the web-page patterns such as cards, carousels, navigation, eyebrow labels or tiny mono labels.
license: Derived from the frontend-design skill; Apache-2.0 terms in LICENSE.txt.
---

# Video design

A video frame is a stage seen for a few seconds, not a page a person scrolls, hovers and reads at
their own pace. Design the frame as one composition with one focal thing. The web skill is the
source for taste; this file removes the parts of web design that do not survive a cut.

## What transfers

- The subject's own material, era and vernacular decide the palette, type and ground.
- One clear hierarchy: one focal object, one statement, one piece of evidence.
- Restraint: one accent, generous negative space, nothing decorative that does not carry meaning.
- A grid and consistent margins; alignment is information.
- A deliberate type system: one display face, one reading face, one mono for measurements.
- Critique the work as a picture, not as a spec.

## What does not transfer

- Responsive breakpoints, hover, focus, scroll, sticky headers, forms, navigation, buttons, CTAs.
- Page sections, hero bands, footers, sidebars, testimonial grids, pricing tables, dashboards.
- Cards, carousels, tabs, accordions, pills, chips, badges, avatars.
- Page-load choreography where every section fades and slides up.
- Copy written for a page: paragraphs, captions under images, meta strings, legal footnotes.

## Website tells to remove

These read as a website screenshot, not a film frame:

- a tracked-out all-caps eyebrow above every title;
- meta strings joined with middle dots (`A · B · C`);
- labels built as `WORD — fragment` with a spaced dash;
- small monospace labels for every value, unit and annotation;
- identical rounded cards with the same soft shadow, repeated in a row or grid;
- three cards, a KPI row, a carousel strip, a dashboard;
- a logo docked in a corner, a nav bar, a footer;
- a title over a dimmed screenshot, a chat bubble, a form field.

If a frame needs one of these to work, it is a UI, not a shot. Remove it and let the mechanism or the
object carry the composition.

## Type at 1080

Text is for reading, not texture.

- Text meant to be read is at least 28 px at 1920x1080. Body 30–34 px; a statement 44–72 px;
  the display number or word 72–176 px.
- A label is at least 24 px and only if the viewer needs it. If it is 11–17 px, it is decoration:
  remove it. This is the commonest failure in generated scenes.
- One title and one data line per shot. At most two text blocks. About 12 words on screen at once.
- No paragraphs, no side notes, no legends, no footnotes, no captions repeating the voice.
- Read the frame at 50% size. If a word is not legible there, it will not be legible on a phone.

## Composition

- One focal object, large enough to read. The mechanism is the layout; do not put it in a card.
- Use the frame: a plane, a rule, a change of scale, a cutaway, the object itself. Cards are a last
  resort and usually a web habit.
- One accent per frame, on the thing that must be remembered.
- Keep the text off the mechanism. Label the part, with a leader line if needed.
- Leave negative space. An empty area is composition, not a missing component.
- No centre-aligned paragraphs in the void; no three-column layout unless the content is genuinely
  three parallel things, and then make it one object, not three cards.

## Motion

- Motion is timeline, not interaction. One orchestrated entrance per shot beats an effect on every
  element.
- One hero move; secondary moves travel 50–70% as far and start 100–200 ms later.
- A landed title is still. Do not fade and slide every element.
- Cut on cause: an object becomes the next shot, not a new page.

## Process for one shot

1. Write the shot's one job in one sentence.
2. Name the medium the subject is made of: instrument, archive, lab, blueprint, map, terminal.
3. Choose the focal object and the one text line that must be read.
4. Block the frame in three rough compositions: object left, object centred, object filling the
   frame. No cards, no carousel, no dashboard.
5. Add text only where it names a part or delivers the one number. Delete every other label.
6. Screenshot at 50%. Cut one accessory, then cut one more label.

## Review before render

- Would a still from this shot read as a website? If yes, remove the cards, labels or chrome.
- Can every word be read in one second? If not, cut words, never shrink type.
- Is any label below 24 px? Remove it or make it 24 px.
- Is there more than one accent, one title or one data block? Cut.
- Does the frame still work if the smallest text disappears? It should.

## Inherit

The render contract, format and review rules stay in `/hyperframes`; the look tokens stay in
`frame.md`; the banned defaults are in `/hyperframes/references/spec.md`. This skill only governs
how the frame is composed and how much text it carries.
