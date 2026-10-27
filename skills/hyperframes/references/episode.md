# Educational episodes (4-15 minutes)

The production layer above the contract for a narrated explainer, science or engineering deep dive,
history-of-a-technology, or technical documentary. The render contract, format, motion, look, sound
and review rules stay in the files this one links; this file adds what a long episode needs: truth
discipline, one thesis and one spine, episode timing, captions, QA gates and YouTube packaging.

The type craft is `types/explainer.md`; read it first. A 30-90 second Short runs the same pipeline
with one idea, one payoff and no chapters. A launch film, product promo or pure motion graphic uses
the matching `types/*` file instead.

## The pipeline and its gates

Work in an episode project (one directory per video). Each stage writes an artifact; the next stage
starts only when the gate passes.

| # | Stage | Artifact | Gate |
|---|---|---|---|
| 0 | Commission | `BRIEF.md` | One-sentence promise, audience, prior knowledge, length, sources |
| 1 | Truth | `SOURCES.md` + claim ledger | Every number and mechanism maps to a source or is labelled illustrative |
| 2 | Spine | `SPEC.md` + `STORYLINES.md` | One thesis in the viewer's words; one concrete example travels the whole film |
| 3 | Script | `SCRIPT.md` + `beats/*.txt` | Reads aloud at 150-165 wpm; every beat advances the thesis |
| 4 | Board | `episode.json` + `STORYBOARD.md` | Beats own narration; shots own picture time; `compile` writes the board |
| 5 | Voice | `assets/voice/<beat>.wav` | Per-beat audio exists; duration measured |
| 5b | Timing | `episode.json`, `assets/timeline.json` | `sync` recomputes every shot, audio clip, caption host and chapter |
| 6 | Build | `index.html`, `compositions/*.html` | `check` 0 errors; deterministic; one scene per shot |
| 7 | Captions | `assets/voice/captions.srt` + timed caption clips | Word-accurate, 2 lines max, safe area, reading speed at most 20 characters/second |
| 8 | Mix | music, SFX and audio in the root | Voice intelligible; music -18 to -22 LUFS under the voice; master -14 LUFS / -1 dBTP |
| 9 | Review | `REVIEW.md` + snapshots | Every scene midpoint and seam inspected; contrast, overflow, static and motion faults fixed |
| 10 | Deliver | `renders/<slug>.mp4` | H.264, 1920x1080, 30 fps, AAC 320k, faststart; QA passes |
| 11 | Package | `publish/youtube.md`, `publish/thumbnail.png` | Title, description, chapters, tags and thumbnail meet `youtube-specs.md` |

## 0-1. Commission and truth

`BRIEF.md` (template: `../templates/BRIEF.md`) before any HTML: the promise, audience and prior
knowledge, length, why now, the payoff shot, the spine, the visual world, constraints, out of scope.

Research rules:

- 3-7 primary or high-quality sources: papers, official docs, standards, primary data, engineer
  write-ups. A video is not a source.
- `SOURCES.md` ledger (template: `../templates/SOURCES.md`): `C1 | claim | exact quote or number |
  URL | accessed | confidence`. Every on-screen number carries a claim id.
- Keep facts and creative choices separate. Never derive a claim the source did not make; "40 min to
  2 min" is not "20x faster".
- Mark estimates and illustrative numbers on screen as illustrative. Show uncertainty where the
  science has it; do not flatten a debate into a verdict.
- Check units, scale, dates and causality twice. A beautiful wrong diagram is worse than no diagram.
- If a claim cannot be verified, cut it or say "we don't know" on screen. Never invent a number to
  make a chart.

## 2. One idea, one spine

- Thesis: one sentence, 15 words or fewer, in the viewer's words. If you cannot say it, the film is
  not ready.
- Spine: one concrete object, example, dataset, machine, place or person travels from the first
  frame to the payoff. The abstract idea enters as the thing that explains it.
- Open on a question the viewer already has, or a concrete situation they recognise. Never open on a
  logo, a black frame, a roadmap, or "in this video".
- Three storylines in `STORYLINES.md`, each a different world, device and form (`story.md`).
  Recommend one; build only after the pick unless the person asked for no stops.
- `SPEC.md` turns every adjective into a number: ground hex, ink, one accent, display face, weight,
  size, tracking, body face, grid, margins, shadow, grain, eases, shot lengths. Pick the look from
  the subject's own world (instrument, archive, lab, blueprint, terminal, map), not a default dark
  void (`look.md`, `spec.md`).

## 3. Script and narration

Write for the ear, not the page.

- 150-165 words per minute, about 2.5-2.75 words per second. A 10-minute episode is about 1500-1650
  words of narration, not 3000.
- Sentences 8-18 words, one clause each. Read the whole script aloud; if you stumble, rewrite.
- Beats: 45-90 seconds each. Each beat has one job: hook, context, tension, mechanism step,
  evidence, complication, payoff, implication.
- First 15 seconds: the question, the stakes and the first concrete image. No throat-clearing.
- Keep an open loop: ask a sharper question every 30-60 seconds, answer part of it, hold the full
  answer until 60-80% through.
- One new thing every 2-4 seconds on screen; one diagram grows rather than a finished diagram
  dropped in.
- Narrated lines do not repeat the on-screen text word for word. The voice says the argument; the
  screen shows the evidence.
- Numbers: round for speech, keep exact values on screen, give units, compare to something known
  ("the mass of a teaspoon of water").
- Ban "In this video", "Let's dive in", "But here's the thing", "game-changer", "seamless", "unlock",
  "revolutionary", "mind-blowing", unless the source or the person used them.
- End on the one idea in one line, then the implication. No recap montage, no "thanks for watching"
  padding.

`beats/01-hook.txt`, `beats/02-context.txt`, ... hold the exact narration for each beat, plain text
only. `SCRIPT.md` holds the beat table: `id | target duration | narration file | visual | viewer
reads | claim ids`. TTS reads the `.txt` files, so no Markdown, timestamps or speaker labels in them.

## 4. Episode manifest and storyboard

`episode.json` is the machine source of truth for a long episode. A beat owns narration, audio and
claims; one or more shots split the beat's picture time. Keep beats 45-90 seconds and shots 5-15
seconds. Start from `../templates/episode.json`.

```json
{
  "version": 1,
  "slug": "003-example",
  "title": "…",
  "fps": 30,
  "width": 1920,
  "height": 1080,
  "tailSeconds": 0.3,
  "beats": [
    {
      "id": "02-mechanism",
      "title": "Mechanism",
      "narration": "beats/02-mechanism.txt",
      "audio": "assets/voice/02-mechanism.wav",
      "claims": ["C3", "C4"],
      "shots": [
        { "id": "02a", "title": "The part", "src": "compositions/frames/02a.html", "seconds": 8 },
        { "id": "02b", "title": "It moves", "src": "compositions/frames/02b.html" }
      ]
    }
  ],
  "chapters": [{ "title": "How it works", "beats": ["02-mechanism"] }]
}
```

- `seconds` on a shot is optional; `compile` gives the remainder of the beat to the last unspecified
  shot. Re-voicing scales shots to the new narration duration.
- `compile` generates `STORYBOARD.md`, `SCRIPT.md`, `publish/youtube.md`, `assets/timeline.json`,
  hosts and audio in `index.html`, and `publish/chapters.json`. Never hand-edit generated durations.
- `STORYBOARD.md` stays in the official format (`storyboard-format.md`). Keep the narrative prose;
  the metadata is generated. `frame.md` is the token source, `SPEC.md` the director's brief.

Storyboard frame:

```markdown
---
format: 1920x1080
duration: 8m
message: "<thesis>"
arc: Question -> Context -> Mechanism -> Evidence -> Complication -> Payoff -> Implication
audience: "<who>"
---

## Frame 1 - Hook
- scene: <one-line contact-sheet caption>
- duration: 6s
- transition_in: cut
- status: outline
- voiceover: "<the narration guide>"
- reads: "<what lands, with windows>"
- sound: "<bed, effects, silence>"
- src: compositions/frames/01-hook.html
```

- `reads` windows never overlap and are long enough for the words: 0.5 s plus 0.3 s per word.
- `sound` names the bed, the effect on each visible action, or silence.
- One scene per shot; a beat may own several shots, so narration and picture re-time independently.
- After TTS, `sync` replaces every shot duration with narration plus tail, and rewrites the root
  `data-duration`, scene hosts, audio clips, caption host and chapters.

## 5. Voice

Local, deterministic and free:

```bash
export HYPERFRAMES_PYTHON="$HOME/.local/share/hyperframes/tts-venv/bin/python"
npx hyperframes tts beats/01-hook.txt -o assets/voice/01-hook.wav --voice af_heart --speed 1.0 --json
```

- Voices: `af_heart` (warm female), `am_michael` (calm male), `bf_emma` (British female),
  `bm_george` (British male). Pick one per series and keep it.
- Speed 0.95-1.05. Faster than 1.1 sounds rushed on technical content.
- Generate per beat so a re-record does not shift the whole film.
- Every beat gets a 0.25-0.4 s tail before the cut; the next beat may start on the previous tail for
  a natural hand-off.
- If `kokoro-onnx` is missing: `python3 -m venv ~/.local/share/hyperframes/tts-venv` then
  `~/.local/share/hyperframes/tts-venv/bin/pip install kokoro-onnx soundfile`.

## 6. Build

Follow the contract in `SKILL.md` and `format.md` exactly; this stage adds only the episode layout.

- `index.html` is the root: `data-duration` is the film length, one scene host per shot, audio clips,
  variables. One sub-composition per shot under `compositions/frames/`.
- Search the registry before hand-building: `npx hyperframes catalog --query "<thing>" --json`.
- Use the storyboard `src` paths so the board and the build cannot drift.
- One hero move per shot; one scene builds one idea. Content stays inside the 90% action-safe box;
  captions and key text inside 80% title-safe (`format.md`).

## 7. Captions

```bash
npx hyperframes transcribe assets/voice/01-hook.wav --to srt -o assets/voice/01-hook.srt --json
```

- Word-level timings come from Parakeet by default; keep them.
- Group into 1-2 lines, 42 characters per line at most, 1.0-6.0 s per cue, at most 20
  characters/second, 80 ms minimum gap.
- Captions sit in the bottom title-safe band, never over a face, a chart axis or the hero object.
- Use the composition's caption host (`data-track-kind="captions"`); one host holds every group.
- On-screen captions are not a transcript: fix ASR homophones, casing, symbols and units by hand.
- For silent or ambient sections, do not leave a stale caption (`captions.md`).

## 8. Sound

- Voice is the clock: cut picture to the voice, not the reverse (`sound.md`).
- Music bed at -18 to -22 LUFS under the voice; duck 6-9 dB with 150 ms attack and 300 ms release;
  restore on pauses.
- SFX only on visible actions, -12 to -18 LUFS, short; no whooshes on every cut.
- Master: -14 LUFS integrated, true peak at most -1 dBTP, stereo, 48 kHz.
- Measure with `npx hyperframes audio assets/voice/*.wav`, then
  `npx hyperframes normalize-audio --target <element-id> --lufs -14 --write`.
- Check on phone speakers and headphones; the voice must survive both. No music under the thesis
  line unless it is the point.

## 9. Review and QA

```bash
node <this-skill>/harness/cli.mjs check <slug>
node <this-skill>/harness/cli.mjs snapshot <slug> --review
node <this-skill>/harness/cli.mjs render <slug> --quality delivery
node <this-skill>/harness/cli.mjs qa <slug>
```

The QA gate checks:

- `check --json`: 0 errors, contrast at least 4.5:1 for text, no overflow, no static sweep failure.
- Duration: `ffprobe` duration within 0.1 s of the root `data-duration`.
- Streams: 1920x1080 (or declared), 30 fps constant, H.264 High/yuv420p, AAC 48 kHz.
- Loudness: integrated between -15.5 and -13.0 LUFS; true peak at most -1 dBTP.
- Visual: contact sheet of every scene midpoint and five frames around each seam; no black or frozen
  scene.
- Captions: file exists, cue count above 0, no cue longer than 6 s, no line longer than 42 characters.
- File: non-empty, moov atom present (`ffprobe`), size sane for the length.

A passing `check` does not prove it looks right. Look at the snapshots and the contact sheet before
delivery (`review.md`).

## 10. Delivery render

```bash
npx hyperframes render --quality delivery --output renders/<slug>.mp4
```

- 1920x1080, 30 fps, H.264, CRF 16-18, `yuv420p`, AAC 320 kbps, 48 kHz, faststart
  (`youtube-specs.md`).
- 4K only when the source imagery or the channel needs it; 60 fps only for fast motion. Both cost
  render time and add nothing to a talking diagram.
- Use `--docker --strict` when the render must be byte-reproducible.
- Watch the first 30 seconds and the payoff at 1x after every render; verify the audio sync on the
  first and last spoken word.

## 11. YouTube packaging

Title, thumbnail, description, chapters and end screen follow `youtube-specs.md`. The rules that
matter most:

- Title 60 characters or fewer, concrete subject plus curiosity gap, and the video must pay the
  promise. Specific beats vague: "Why GPS clocks run 38 microseconds fast", not "The incredible
  truth about time".
- Thumbnail 1280x720, under 2 MB, one focal object or face, 3-4 words, readable at 320x180, and it
  must not repeat the title.
- Description: first 125 characters carry the hook and the promise; 2-3 short paragraphs; sources
  with links, illustrative figures marked; chapters starting at `00:00`, at least 3, each at least
  10 s; credits; 5-10 tags; 3 hashtags.
- End screen in the last 20 s with no critical information: one next-video slot, one subscribe slot.

## Retention structure for long form

| Position | Job |
|---|---|
| 0-15 s | Question, stakes and first concrete image; no intro |
| 15-60 s | Context the viewer needs, as a story or a demonstration |
| 1-3 min | Mechanism, step by step; one new part per beat |
| 3-6 min | Evidence and complication: the number, the experiment, the failure, the debate |
| 60-80% | Payoff: the biggest visual moment, once, at normal speed |
| Last 30-60 s | Implication and the one idea in one line; next question |

Cut anything that does not change what the viewer believes or feels. A fact that is true but does not
advance the thesis belongs in the description, not the film.

## Failure modes

- **Slide deck with narration**: bullet lists, three cards in a row, icons in circles. Replace with
  one diagram that grows or one object that acts.
- **Beautiful wrong diagram**: the science was not checked before animation. Check the mechanism
  against the source first.
- **Narration outruns the picture**: the scene reveals a part after the voice named it. Reveal
  across the back half of the beat, when the voice says it.
- **TTS monotony**: long paragraphs and no per-beat files. Split into beats and add pauses.
- **Captions as an afterthought**: ASR errors left in, lines over 42 characters, captions over the
  hero. Fix before render.
- **Loudness war**: music pushed up to feel energetic. The voice must win at every moment.
- **Default look**: dark void, glow, floating particles, cream-paper serif with mono labels. Name it
  and replace it with the subject's medium (`look.md`).
- **Padding for length**: recaps, repeated claims, slow title holds. A tight 6 minutes beats a loose
  12.

## The episode harness

`../harness/cli.mjs` (with `episode.mjs` and `lib.mjs`) drives the stages above. Run it from the
episode project root; `AHF_ROOT` overrides the project root when the harness lives outside it.

```bash
node <this-skill>/harness/cli.mjs new <slug> --title "..."   # scaffold the project from ../templates
node <this-skill>/harness/cli.mjs compile <slug>             # episode.json -> board, script, youtube, hosts
node <this-skill>/harness/cli.mjs timeline <slug> [--json]   # computed beat and shot times
node <this-skill>/harness/cli.mjs tts <slug> [--voice af_heart] [--speed 1.0]
node <this-skill>/harness/cli.mjs sync <slug> [--tail 0.3]   # shots, hosts, audio clips, chapters
node <this-skill>/harness/cli.mjs captions <slug>            # word-timed captions + WER report
node <this-skill>/harness/cli.mjs lint-script <slug> [--strict]
node <this-skill>/harness/cli.mjs check <slug> [--strict]
node <this-skill>/harness/cli.mjs snapshot <slug> --review
node <this-skill>/harness/cli.mjs render <slug> --quality delivery
node <this-skill>/harness/cli.mjs qa <slug> [--strict]
node <this-skill>/harness/cli.mjs thumbnail <slug> [--at 9]
node <this-skill>/harness/cli.mjs package <slug>
node <this-skill>/harness/cli.mjs agents [slug]              # rewrite per-video agent context shims
```

`episode.json` stays the machine source of truth; the harness writes the Markdown views. The
templates in `../templates/` are the starting documents for every stage.
