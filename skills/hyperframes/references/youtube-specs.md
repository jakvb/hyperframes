# YouTube delivery and packaging specs

## Master file

| Property | Value |
|---|---|
| Container | MP4 (moov atom at front / faststart) |
| Video | H.264 High profile, `yuv420p`, 1920x1080, 30 fps constant |
| Video quality | CRF 16-18, or 12-16 Mbps for a delivery master |
| Audio | AAC-LC, 48 kHz, stereo, 320 kbps |
| Loudness | -14 LUFS integrated, true peak <= -1 dBTP |
| Colour | SDR / BT.709 unless the whole pipeline is HDR |
| 4K | 3840x2160 only when the source detail earns it |
| 60 fps | Only for fast motion or game capture; not for diagrams |

## Thumbnail

| Property | Value |
|---|---|
| Size | 1280x720 (16:9), < 2 MB, JPG/PNG |
| Text | 3-4 words, >= 60 px at 1280 wide, readable at 320x180 |
| Contrast | >= 4.5:1 for text; one focal object |
| Safe area | Keep text out of the bottom-right duration badge |
| Rule | Thumbnail and title must not say the same thing |

## Title

- <= 60 characters visible.
- Concrete subject + curiosity gap. Specific nouns beat adjectives.
- No ALL CAPS, no more than one punctuation mark, no emoji unless the channel uses them.
- The promise must be paid in the first 30 seconds and at the payoff.

## Description

```text
<125-character hook with the concrete promise>

<Paragraph 1: what the viewer will understand and why it matters.>
<Paragraph 2: the surprising part, the evidence, what remains uncertain.>

Sources:
- <title> - <url>
- ...

Chapters:
00:00 <Question>
00:42 <Context>
...

Credits:
Narration: <voice>
Music: <track> (<licence>)
Footage / 3D: <source> (<licence>)
```

## Chapters

- First chapter exactly `00:00`.
- At least 3 chapters; each >= 10 seconds.
- Name by question or payoff, not "Part 1".
- Chapter timestamps must match the rendered file, not the storyboard plan.

## Tags and hashtags

- 5-10 tags: subject, field, technique, audience.
- 3 hashtags max; the first is the topic.
- No competitor names, no unrelated trending terms.

## End screen

- Last 20 seconds; no critical information.
- One next-video slot and one subscribe slot.
- Leave the final answer line visible for at least 2 seconds before the end screen.

## Pre-upload checklist

- [ ] Render QA passed (`node harness/cli.mjs qa <slug>`)
- [ ] First 30 seconds watched at 1x
- [ ] Payoff watched at 1x
- [ ] Audio checked on phone speaker and headphones
- [ ] Captions uploaded or burned in correctly
- [ ] Sources in description match `SOURCES.md`
- [ ] Thumbnail readable at 320x180
- [ ] Title <= 60 characters
- [ ] Chapters match the final timestamps
- [ ] No unlicensed music, footage or font
- [ ] End screen has no critical information
