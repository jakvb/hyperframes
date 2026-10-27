# Educational deep dives (4-15 minutes)

The production layer above the contract for a narrated deep dive: a science or engineering
explanation, the history of an idea or a technology, or a technical documentary. A deep dive is a
story about understanding something, not a thesis recited with evidence: an idea is shown working,
shown failing, then rebuilt from first principles in front of the viewer.

That is different from a short explainer. A 30-90 second Short states one idea and pays it off; a
deep dive earns the idea through a narrative with a low point and a high point. Do not stretch the
short's shape to ten minutes: ten minutes of "here is the thesis, here are the facts" is a slide deck
with a voice.

The type craft is `types/explainer.md`; read it first. A launch film, product promo or pure motion
graphic uses the matching `types/*` file instead.

## What a deep dive is

The through-line is a **question**, not a thesis. The viewer should be able to ask it in the first
fifteen seconds and want the answer for the rest of the film. Around it run six movements:

| # | Movement | Share | Job | After it, the viewer believes |
|---|---|---|---|---|
| 1 | Question | 0-10% | an observation that does not fit, or a result nobody can explain yet; the stakes and the first image | "something here doesn't add up" |
| 2 | Old picture | 10-30% | how people explained it before: the assumptions, the instruments, the first principles they had; it should look convincing | "that seems to work" |
| 3 | Crack | 30-50% | the anomaly, failed experiment, argument or rival that breaks it; the low point, the cost of being wrong | "the old answer cannot be right" |
| 4 | Rebuild | 50-75% | derive the new idea from premises the viewer already accepts, one visible step at a time; no leap, no hand-wave | "I can see why it has to be this way" |
| 5 | Test | 75-90% | the decisive prediction, measurement or use that only the new idea gets right; the high point | "it is true, and here is the proof" |
| 6 | Consequence | 90-100% | what changed because of it, what it still cannot explain, the return to the opening image and question | "I can explain it, including its limits" |

The shares scale with the length; a 10-minute film is roughly 1 / 2 / 2 / 2.5 / 1.5 / 1 minutes. A
30-90 second Short keeps only Question, one proof and the answer.

**The story needs both directions.** The crack is a real low: a wrong prediction, a public failure, a
dead end, a person who lost years. The test is a real high: the number lands, the machine works, the
prediction is confirmed. Without them the film is a tour, and a tour has nothing to root for.

**First principles, not verdicts.** The rebuild is the centre of the film. State the premise in words
the viewer already accepts, show the consequence, then the next premise. Every step must follow from
the one before, and the viewer should be able to guess the next step just before it lands. "Then
scientists discovered..." is a cut, not an explanation.

**One question, one changing world.** A deep dive may use several people, experiments, places and
numbers; none of them is a second spine. They are turns in the same argument. The visual world
builds once and changes as understanding changes: the same instrument, diagram or place is corrected,
extended or broken, not replaced by a new slide for each fact.

## The pipeline and its gates

Work in an episode project (one directory per video). Each stage writes an artifact; the next stage
starts only when the gate passes.

| # | Stage | Artifact | Gate |
|---|---|---|---|
| 0 | Commission | `BRIEF.md` | Promise, through-line question, stakes, audience, length, belief ladder |
| 1 | Truth | `SOURCES.md` + claim ledger | Every fact, date, quote and mechanism maps to a source, a derivation or an illustrative label |
| 2 | Arc | `STORYLINES.md` + `SPEC.md` | Three narrative routes; one through-line question; six movements with a low and a high; `frame.md` filled |
| 3 | Script | `SCRIPT.md` + `beats/*.txt` | Reads at 150-165 wpm; every beat changes belief or stakes; every rebuild step follows |
| 4 | Board | `episode.json` + `STORYBOARD.md` | Beats own narration; shots own picture time; `compile` writes the board |
| 5 | Voice | `assets/voice/<beat>.wav` | Per-beat audio exists; duration measured |
| 5b | Timing | `episode.json`, `assets/timeline.json` | `sync` recomputes every shot, audio clip, caption host and chapter |
| 6 | Build | `index.html`, `compositions/*.html` | `check` 0 errors; deterministic; one scene per shot |
| 7 | Captions | `assets/voice/captions.srt` + timed caption clips | Word-accurate, 2 lines max, safe area, reading speed at most 20 characters/second |
| 8 | Mix | music, SFX and audio in the root | Voice intelligible; music -18 to -22 LUFS under the voice; master -14 LUFS / -1 dBTP |
| 9 | Review | `REVIEW.md` + snapshots | Every scene midpoint and seam inspected; story beats land; contrast, overflow, static and motion faults fixed |
| 10 | Deliver | `renders/<slug>.mp4` | H.264, 1920x1080, 30 fps, AAC 320k, faststart; QA passes |
| 11 | Package | `publish/youtube.md`, `publish/thumbnail.png` | Title, description, chapters, tags and thumbnail meet `youtube-specs.md` |

## 0-1. Commission and truth

`BRIEF.md` (template: `../templates/BRIEF.md`) before any HTML: the promise, the through-line
question, why the answer matters, the audience and prior knowledge, length, the payoff shot, the
visual through-line, the belief ladder and what is out of scope.

Research rules:

- 4-12 primary or high-quality sources for a deep dive: papers, official docs, standards, primary
  data, engineer write-ups, letters, archives, biographies, contemporary accounts. A video is not a
  source.
- `SOURCES.md` ledger (template: `../templates/SOURCES.md`): `C1 | claim | exact quote or number |
  URL | accessed | confidence`. A row covers every factual assertion: a number, a date, a quote, a
  priority claim ("who had the idea first"), or a mechanism step taken from a source.
- Derive nothing the source did not establish. If the film works a step out on screen, label it
  `derivation` and name the premises it starts from; if it rounds or illustrates a value, label it
  `illustrative` or `arithmetic`.
- Keep facts and creative choices separate. "40 min to 2 min" is not "20x faster". A dramatised
  scene may invent weather, a room or a gesture, never a fact, a quote or a result.
- Mark estimates and illustrative numbers on screen as illustrative. Show uncertainty where the
  science has it; do not flatten a live debate into a verdict.
- Check units, scale, dates and causality twice. A beautiful wrong diagram is worse than no diagram.
- If a claim cannot be verified, cut it or say "we don't know" on screen. Never invent a number to
  make a chart.
- **Numbers are evidence at the turns, not the texture of the film.** One decisive number per
  movement is usually enough; a second only if it changes what the viewer believes. If a number
  decorates the narration instead of turning it, cut it.

## 2. The arc: a question that changes

- **Through-line question**: one sentence, 15 words or fewer, in the viewer's words. It must be
  genuinely open at the start and answered by the film: "Why did the theory predict the wrong
  answer?", "How did anyone build this before they had the tool?". A statement is not a question:
  "Relativity is the correction" has nowhere to go.
- **Stakes**: what the old picture promised, who needed the answer, and what it cost to be wrong.
  Stakes are concrete (a mission, a patient, a factory, a reputation), not "it matters for science".
- **Three narrative routes** in `STORYLINES.md`, each a different film, not three titles on one
  film: the origin (the people and the problem), the mystery (the anomaly and the clues) and the
  first-principles build (the machine assembled from what the viewer accepts). Recommend one; build
  only after the pick unless the person asked for no stops.
- **Belief ladder**: write one line per beat: what the viewer now thinks. No two consecutive rungs
  may say the same thing. If a beat does not move the ladder or raise the stakes, cut it or merge it.
  The crack must lower confidence; the test must raise it.
- **Visual through-line**: one recurring world, object, instrument or diagram that the film
  corrects, extends and finally completes. New evidence changes the existing picture; it does not
  start a new one. Pick the world from the subject's own medium (instrument, archive, lab,
  blueprint, terminal, map), not a default dark void (`look.md`).
- **`SPEC.md`** turns every adjective into a number: ground hex, ink, one accent, display face,
  weight, size, tracking, body face, grid, margins, shadow, grain, eases, shot lengths. Add the six
  movements and what changes in the viewer's belief at each (`spec.md`).
- **The look is a decision, not a default.** `new` writes a neutral `frame.md` marked
  `LOOK-NOT-CHOSEN`; fill it from the subject's medium, or copy a preset's `FRAME.md` when the person
  names one. Compile and lint fail while the marker remains. Field Manual is a preset, not the
  fallback.
- **Design the frame, not a page.** Read `/video-design` before the first scene. No cards, carousels,
  navigation, eyebrow labels or small mono labels; text meant to be read is at least 28 px, and a
  label below 24 px is removed rather than shrunk.
- A deep dive may use worked examples, but "one concrete example" is not the spine. The question is
  the spine; examples are how the rebuild is made visible.

## 3. Script and narration

Write for the ear, and write scenes, not claims.

- 150-165 words per minute, about 2.5-2.75 words per second. A 10-minute episode is about 1500-1650
  words of narration, not 3000.
- Sentences 8-18 words, one clause each. Read the whole script aloud; if you stumble, rewrite.
- Beats: 45-90 seconds each. Each beat has one job: ask, explain the old picture, turn, derive one
  step, test, pay off, or close. Keep beats under a movement; a 10-minute film has 8-12 beats.
- **Write the story, not the summary**: a person, a place, an instrument, a failure, a decision.
  Concrete nouns and verbs; dates only when a date changes the story. A parade of years and names is
  not history, it is a timeline read aloud.
- **Names**: the first mention uses the full name with the symbol or abbreviation in parentheses
  ("mercury-198 (¹⁹⁸Hg)"), then the short form. No unexplained abbreviations, no label-only jargon.
  Define each term on first use; a viewer who knows nothing about the topic must be able to follow.
- **Text on screen**: as little as possible. No side notes, no legends, no captions repeating the
  voice. If a word does not need to be read, it is not on screen.
- **No metaphor as the mechanism**: describe what the thing actually does. A comparison is allowed
  only when it maps exactly and the source uses it; otherwise it teaches the wrong picture.
- **No judgement**: state what an idea claimed and what the evidence showed. Do not call people or
  ideas stupid, do not moralise, do not hand down a verdict.
- **First 15 seconds**: the anomaly or question, the stakes and the first concrete image. No
  throat-clearing, no "since the dawn of time", no roadmap.
- **Open loops**: sharpen the question every 30-60 seconds, answer part of it, and hold the how and
  why until the rebuild. Let the viewer predict a step and confirm or correct it.
- **First-principles rebuild**: state the premise, show its consequence, then the next premise. Use
  the viewer's own experience ("a clock that moves must tick slower if light's speed is fixed") before
  naming the formal result. The maths or mechanism appears after the viewer can see why it must be.
- **Turn, don't announce**: the crack is shown as a failed prediction, a measurement that will not
  fit, a machine that will not work, or an argument that collapses. Do not say "this was
  revolutionary"; show what stopped working.
- **Numbers**: one decisive number per movement, rounded for speech, exact on screen, with a unit and
  a comparison to something known. No number quota per beat and no statistic stacking. The number
  that lands at the test is the one the film was built to earn.
- Narrated lines do not repeat the on-screen text word for word. The voice carries the argument; the
  screen shows the evidence and the mechanism.
- Ban "In this video", "Let's dive in", "But here's the thing", "game-changer", "seamless", "unlock",
  "revolutionary", "mind-blowing", unless the source or the person used them.
- End by answering the opening question in one line, then name what the answer still cannot explain.
  No recap montage, no "thanks for watching" padding.

`beats/01-question.txt`, `beats/02-old-picture.txt`, ... hold the exact narration for each beat,
plain text only. `SCRIPT.md` holds the beat table: `id | target duration | narration file | visual
job | viewer reads | belief after | claims`. TTS reads the `.txt` files, so no Markdown, timestamps
or speaker labels in them.

## 4. Episode manifest and storyboard

`episode.json` is the machine source of truth for a long episode. A beat owns narration, audio, the
belief change and claims; one or more shots split the beat's picture time. Keep beats 45-90 seconds
and shots 5-15 seconds. Start from `../templates/episode.json`.

```json
{
  "version": 1,
  "slug": "003-example",
  "title": "…",
  "fps": 30,
  "width": 1920,
  "height": 1080,
  "tailSeconds": 0.3,
  "message": "Why did the prediction come out wrong?",
  "arc": "Question -> Old picture -> Crack -> Rebuild -> Test -> Consequence",
  "beats": [
    {
      "id": "03-crack",
      "title": "The measurement that would not fit",
      "narration": "beats/03-crack.txt",
      "audio": "assets/voice/03-crack.wav",
      "belief": "the old picture cannot be right",
      "claims": ["C3", "C4"],
      "shots": [
        { "id": "03a", "title": "The reading", "src": "compositions/frames/03a.html", "seconds": 8 },
        { "id": "03b", "title": "It will not fit", "src": "compositions/frames/03b.html" }
      ]
    }
  ],
  "chapters": [{ "title": "The crack", "beats": ["03-crack"] }]
}
```

- `seconds` on a shot is optional; `compile` gives the remainder of the beat to the last unspecified
  shot. Re-voicing scales shots to the new narration duration.
- `belief` is optional but expected on every beat of a deep dive; `compile` prints it in `SCRIPT.md`.
- `compile` generates `STORYBOARD.md`, `SCRIPT.md`, `publish/youtube.md`, `assets/timeline.json`,
  hosts and audio in `index.html`, and `publish/chapters.json`. Never hand-edit generated durations.
- `STORYBOARD.md` stays in the official format (`storyboard-format.md`). Keep the narrative prose;
  the metadata is generated. `frame.md` is the token source, `SPEC.md` the director's brief.

Storyboard frame:

```markdown
---
format: 1920x1080
duration: 8m
message: "<through-line question>"
arc: Question -> Old picture -> Crack -> Rebuild -> Test -> Consequence
audience: "<who>"
---

## Frame 1 - The question
- scene: <one-line contact-sheet caption>
- duration: 6s
- transition_in: cut
- status: outline
- voiceover: "<the narration guide>"
- reads: "<what lands, with windows>"
- sound: "<bed, effects, silence>"
- src: compositions/frames/01-question.html
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
npx hyperframes tts beats/01-question.txt -o assets/voice/01-question.wav --voice af_heart --speed 1.0 --json
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
- Build the visual through-line once, then change it: the old picture and the new one share the same
  world, so the correction is visible as a change, not a new diagram.

## 7. Captions

```bash
npx hyperframes transcribe assets/voice/01-question.wav --to srt -o assets/voice/01-question.srt --json
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
- Check on phone speakers and headphones; the voice must survive both. No music under the answer
  line unless it is the point. Let the crack breathe: pull the bed down, or drop it, at the low point.

## 9. Review and QA

```bash
node <this-skill>/harness/cli.mjs mix <slug> [--gap 18]
node <this-skill>/harness/cli.mjs audit <slug>
node <this-skill>/harness/cli.mjs check <slug>
node <this-skill>/harness/cli.mjs snapshot <slug> --review
node <this-skill>/harness/cli.mjs render <slug> --quality delivery
node <this-skill>/harness/cli.mjs qa <slug>
```

The QA gate checks:

- `check --json`: 0 errors, contrast at least 4.5:1 for text, no overflow, no static sweep failure.
- `mix`: every voice, music and SFX source measured on its own, not only the mixed master; the music
  is at least `--gap` dB under the loudest voice (default 15) and `data-volume` matches `MUSIC.md`.
- `audit`: no text rule under 24 px, no web-page chrome, no pixel `transformOrigin` on an SVG
  candidate; warnings are reviewed, `--strict` turns them into a failure.
- Duration: `ffprobe` duration within 0.1 s of the root `data-duration`.
- Streams: 1920x1080 (or declared), 30 fps constant, H.264 High/yuv420p, AAC 48 kHz.
- Loudness: integrated between -15.5 and -13.0 LUFS; true peak at most -1 dBTP.
- Visual: contact sheet of every scene midpoint and five frames around each seam; no black or frozen
  scene.
- Captions: file exists, cue count above 0, no cue longer than 6 s, no line longer than 42 characters.
- File: non-empty, moov atom present (`ffprobe`), size sane for the length.

A passing `check` does not prove the story works. Watch the film once at 1x before delivery and ask:
is the question asked in the first 15 seconds, does the crack land as a loss, can the viewer predict
each rebuild step, and does the ending answer the opening? Then check the snapshots and the contact
sheet (`review.md`).

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

- Title 60 characters or fewer, concrete subject plus the open question, and the video must answer
  it. Specific beats vague: "Why GPS clocks run 38 microseconds fast", not "The incredible truth
  about time".
- Thumbnail 1280x720, under 2 MB, one focal object or face, 3-4 words, readable at 320x180, and it
  must not repeat the title.
- Description: first 125 characters carry the question and the promise; 2-3 short paragraphs;
  sources with links, illustrative figures marked; chapters named by movement or question, starting
  at `00:00`, at least 3, each at least 10 s; credits; 5-10 tags; 3 hashtags.
- End screen in the last 20 s with no critical information: one next-video slot, one subscribe slot.

## Retention structure for long form

| Position | Movement | Job | Belief |
|---|---|---|---|
| 0-10% | Question | observation, stakes, first image, the question | something does not add up |
| 10-30% | Old picture | the previous explanation, working; its premises and instruments | that seems to work |
| 30-50% | Crack | anomaly, failure, argument, rival; the low point | the old answer cannot be right |
| 50-75% | Rebuild | derive the new idea step by step from accepted premises | I can see why it must be so |
| 75-90% | Test | decisive prediction, measurement or use; the high point | it is true |
| 90-100% | Consequence | what changed, what remains unexplained, return to the opening | I can explain it and its limits |

Cut anything that does not change what the viewer believes or feels. A fact that is true but does not
turn the story belongs in the description, not the film. A second example that repeats the first
turn is not depth; a new objection that the rebuild must answer is.

## Failure modes

- **Thesis recital**: the film states its conclusion in the first minute and spends the rest
  defending it. There is nothing to discover and no reason to stay.
- **Fact conveyor**: each beat is another number, date or study with no turn. The viewer learns
  trivia and feels nothing. Replace with a scene, a decision or a failed attempt.
- **Number texture**: statistics in every sentence to sound rigorous. Keep the one number that
  turns the movement, source it, and let the mechanism carry the rest.
- **Skipped first principles**: "then the breakthrough happened" or a formula dropped from nowhere.
  Show the premise, the consequence and the next step.
- **No low point**: the old picture is a strawman, or the crack is announced rather than felt. Show
  what worked about the old idea and what it cost to lose it.
- **Slide deck with narration**: bullet lists, three cards in a row, icons in circles. Replace with
  one world that changes or one object that acts.
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
workspace root that owns `videos/`; `AHF_ROOT` pins the workspace when the harness lives outside it.

```bash
node <this-skill>/harness/cli.mjs new <slug> --title "..."   # scaffold the project from ../templates
node <this-skill>/harness/cli.mjs compile <slug>             # episode.json -> board, script, youtube, hosts
node <this-skill>/harness/cli.mjs timeline <slug> [--json]   # computed beat and shot times
node <this-skill>/harness/cli.mjs tts <slug> [--voice af_heart] [--speed 1.0]
node <this-skill>/harness/cli.mjs sync <slug> [--tail 0.3]   # shots, hosts, audio clips, chapters
node <this-skill>/harness/cli.mjs captions <slug>            # word-timed captions + WER report
node <this-skill>/harness/cli.mjs lint-script <slug> [--strict]
node <this-skill>/harness/cli.mjs audit <slug>               # small text, web chrome, SVG origins
node <this-skill>/harness/cli.mjs mix <slug> [--gap 18]      # per-source loudness, music vs voice
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
