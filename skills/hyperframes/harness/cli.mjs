#!/usr/bin/env node
import { cpSync, existsSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import {
  ROOT,
  TEMPLATES,
  VIDEOS,
  assertSlug,
  beatFiles,
  chapterTime,
  ensureDir,
  fail,
  hf,
  hfEnv,
  hfJSON,
  info,
  listVideos,
  loudness,
  ok,
  parseSrt,
  parseStoryboard,
  probeSummary,
  readJSON,
  rootDuration,
  run,
  runOrThrow,
  toSrt,
  videoConfig,
  videoDir,
  videoContextMarkdown,
  writeJSON,
  writeVideoContext,
  VIDEO_CONTEXT_FILES,
} from "./lib.mjs";
import {
  buildTimeline,
  ensureHostMarkers,
  episodeFile,
  failOnEpisodeErrors,
  groupWordsForBeat,
  hostMapFromHtml,
  numericClaims,
  parseClaims,
  parseScriptClaims,
  parseWords,
  readEpisode,
  timelineToOtio,
  validateEpisode,
  wordErrorRate,
  writeCompiled,
  youtubeMarkdown,
} from "./episode.mjs";

const args = process.argv.slice(2);
const command = args.shift();
const flags = {};
const positional = [];
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg.startsWith("--")) {
    const key = arg.slice(2);
    const next = args[i + 1];
    if (next && !next.startsWith("--")) {
      flags[key] = next;
      i++;
    } else {
      flags[key] = true;
    }
  } else {
    positional.push(arg);
  }
}

function requireSlug() {
  const slug = positional[0] ?? flags.slug;
  if (!slug) fail("Missing video slug. Example: node harness/cli.mjs check my-video");
  return assertSlug(slug);
}

function printHelp() {
  console.log(`ahyper-frames harness

Usage: node harness/cli.mjs <command> [slug] [flags]

Commands:
  new <slug> [--title "..."]     Scaffold videos/<slug> with a HyperFrames project
  agents [slug]                  (Re)write per-video AGENTS.md/CLAUDE.md shims that point at
                                 ../../AGENTS.md and the episode pipeline
  list                           List videos
  migrate <slug> [--force]       Build episode.json from existing beats + STORYBOARD
  compile <slug> [--no-html] [--check]
                                 Generate STORYBOARD.md, SCRIPT.md, youtube.md, hosts and timeline
  timeline <slug> [--json]       Print the computed beat/shot/chapter timeline
  otio <slug>                    Write publish/<slug>.otio for NLE interchange
  tts <slug> [--voice af_heart] [--speed 1.0] [--beat id] [--force]
                                 Generate per-beat narration with local Kokoro
  lint-script <slug> [--strict]  Check beats, storyboard, claims, sources and narration pace
  sync <slug> [--tail 0.3]       Recompute timings, hosts, audio clips, chapters and Markdown
  captions <slug> [--force]      Transcribe beats and write word-timed captions + WER report
  check <slug> [--strict]        Run lint + browser check
  snapshot <slug> [--review] [--at 1,3,5] [--range 2,6] [--frames 5]
                                 Capture frames for visual review
  render <slug> [--quality delivery|looks|draft] [--output path] [--workers auto]
                                 [--browser-gpu] [--gpu] [--docker] [--no-master]
                                 Render MP4, master audio and write render telemetry
  cloud <slug> [--quality high] [--resolution 1080p] [--dry-run]
                                 Render through HyperFrames Cloud (long-form delivery)
  master <slug> [--file renders/x.mp4]
                                 Normalize the render audio to -14 LUFS / -1 dBTP
  qa <slug> [--file renders/x.mp4] [--skip-captions] [--no-chapters] [--strict]
                                 Verify duration, streams, loudness, freeze, chapters, captions
  thumbnail <slug> [--at 4]       Capture a caption-free 1280x720 thumbnail
  package <slug> [--thumb-time 0.5]
                                 Write publish/youtube.md, chapters and publish/thumbnail.jpg
  doctor                         Check HyperFrames, Chrome, FFmpeg, Blender, TTS
`);
}

async function cmdNew() {
  const slug = requireSlug();
  const title = flags.title ?? slug.replace(/-/g, " ");
  const dir = videoDir(slug);
  if (existsSync(dir)) fail(`videos/${slug} already exists`);

  ensureDir(VIDEOS);
  info(`Scaffolding videos/${slug} ...`);
  runOrThrow(
    "npx",
    [
      "--yes",
      `hyperframes@0.8.200`,
      "init",
      `videos/${slug}`,
      "--non-interactive",
      "--skip-skills",
    ],
    {
      cwd: ROOT,
      env: hfEnv({ HYPERFRAMES_SKIP_SKILLS: "1" }),
    },
  );

  for (const sub of [
    "beats",
    "compositions/frames",
    "assets/voice",
    "assets/music",
    "assets/sfx",
    "assets/images",
    "assets/fonts",
    "assets/models",
    "assets/data",
    "assets/vendor",
    "renders",
    "publish",
  ]) {
    ensureDir(path.join(dir, sub));
  }

  const copies = {
    "BRIEF.md": "BRIEF.md",
    "SOURCES.md": "SOURCES.md",
    "SCRIPT.md": "SCRIPT.md",
    "STORYBOARD.md": "STORYBOARD.md",
    "SPEC.md": "SPEC.md",
    "STORYLINES.md": "STORYLINES.md",
    "frame.md": "frame.md",
    "ASSETS.md": "ASSETS.md",
    "VOICE.md": "VOICE.md",
    "MUSIC.md": "MUSIC.md",
    "REVIEW.md": "REVIEW.md",
  };
  for (const [from, to] of Object.entries(copies)) {
    const src = path.join(TEMPLATES, from);
    const dst = path.join(dir, to);
    if (existsSync(src) && !existsSync(dst)) cpSync(src, dst);
  }

  writeJSON(path.join(dir, "episode.json"), {
    version: 1,
    slug,
    title,
    fps: 30,
    width: 1920,
    height: 1080,
    voice: "af_heart",
    speed: 1.0,
    tailSeconds: 0.3,
    message: "",
    arc: "Question -> Old picture -> Crack -> Rebuild -> Test -> Consequence",
    audience: "",
    beats: [],
  });

  const indexFile = path.join(dir, "index.html");
  if (existsSync(indexFile)) {
    const html = readFileSync(indexFile, "utf8");
    const marked = ensureHostMarkers(html);
    if (marked !== html) writeFileSync(indexFile, marked);
  }

  writeJSON(path.join(dir, "video.json"), {
    slug,
    title,
    createdAt: new Date().toISOString(),
    fps: 30,
    width: 1920,
    height: 1080,
    voice: "af_heart",
    speed: 1.0,
    tailSeconds: 0.3,
  });

  // hyperframes init writes its own AGENTS.md/CLAUDE.md; replace with the workspace shim so
  // agents landing in the project dir still follow ../../AGENTS.md and the episode pipeline.
  writeVideoContext(dir, slug);

  ok(`videos/${slug}`);
  info(`
Next:
  1. Fill videos/${slug}/BRIEF.md and SOURCES.md
  2. Write SPEC.md, STORYLINES.md, beats/*.txt
  3. Fill episode.json (beats -> shots); then: node harness/cli.mjs compile ${slug}
  4. Voice: node harness/cli.mjs tts ${slug}
  5. Retime: node harness/cli.mjs sync ${slug}
  6. Build scenes, then: node harness/cli.mjs check ${slug}
  7. Review frames: node harness/cli.mjs snapshot ${slug} --review
  8. Render: node harness/cli.mjs render ${slug} --quality delivery
  9. Verify: node harness/cli.mjs qa ${slug}`);
}

async function cmdAgents() {
  const slug = positional[0] ?? flags.slug;
  const targets = slug ? [assertSlug(slug)] : listVideos().map((v) => v.slug);
  if (!targets.length) return info("No videos yet. Run: node harness/cli.mjs new my-video");
  for (const name of targets) {
    const dir = videoDir(name);
    if (!existsSync(path.join(dir, "video.json"))) fail(`No video at videos/${name}`);
    const written = writeVideoContext(dir, name);
    info(
      `${name.padEnd(32)} ${written.length ? `wrote ${written.join(", ")}` : "already current"}`,
    );
  }
  ok(`${targets.length} video context file set(s)`);
}

async function cmdList() {
  const videos = listVideos();
  if (!videos.length) return info("No videos yet. Run: node harness/cli.mjs new my-video");
  for (const v of videos) info(`${v.slug.padEnd(32)} ${v.title ?? ""}`);
}

function markdownSection(text, name) {
  const safe = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^##\\s+${safe}\\s*$([\\s\\S]*?)(?=^##\\s+|(?![\\s\\S]))`, "m");
  return text.match(pattern)?.[1]?.trim() ?? "";
}

function parseYoutubeFile(dir) {
  const file = path.join(dir, "publish/youtube.md");
  if (!existsSync(file)) return null;
  const text = readFileSync(file, "utf8");
  const titleOptions = markdownSection(text, "Title options")
    .split("\n")
    .map((line) => line.replace(/^-\s*/, "").trim())
    .filter(Boolean);
  const description = markdownSection(text, "Description")
    .split(/\nSources:|\nChapters:/)[0]
    .trim();
  const tags = markdownSection(text, "Tags")
    .split(/[,\n]/)
    .map((tag) => tag.trim())
    .filter((tag) => tag && !tag.startsWith("("));
  const hashtags = markdownSection(text, "Hashtags")
    .split(/\s+/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.startsWith("#"));
  const creditsText =
    markdownSection(text, "Credits") ||
    text.match(/^Credits:\s*\n([\s\S]*?)(?=^##\s+|(?![\s\S]))/m)?.[1]?.trim() ||
    "";
  const credits = creditsText
    .split("\n")
    .map((line) => line.replace(/^-\s*/, "").trim())
    .filter(Boolean);
  const thumbnail = markdownSection(text, "Thumbnail").split("\n")[0]?.trim() ?? "";
  const endScreen = markdownSection(text, "End screen").split("\n")[0]?.trim() ?? "";
  return {
    titleOptions,
    description,
    tags,
    hashtags,
    credits,
    ...(thumbnail ? { thumbnail } : {}),
    ...(endScreen ? { endScreen } : {}),
  };
}

function legacyEpisode(dir, cfg) {
  const beats = beatFiles(dir);
  const timing = readJSON(path.join(dir, "assets/voice/timing.json"));
  const boardFile = path.join(dir, "STORYBOARD.md");
  if (!beats.length || !timing?.beats?.length || !existsSync(boardFile)) return null;
  const board = parseStoryboard(boardFile);
  const html = existsSync(path.join(dir, "index.html"))
    ? readFileSync(path.join(dir, "index.html"), "utf8")
    : "";
  const hosts = hostMapFromHtml(html);
  const claims = parseScriptClaims(dir);
  const timingById = new Map(timing.beats.map((beat) => [beat.id, beat.seconds]));
  return {
    version: 1,
    slug: cfg.slug,
    title: cfg.title ?? cfg.slug,
    fps: cfg.fps ?? 30,
    width: cfg.width ?? 1920,
    height: cfg.height ?? 1080,
    voice: cfg.voice ?? "af_heart",
    speed: cfg.speed ?? 1,
    tailSeconds: cfg.tailSeconds ?? 0.3,
    message: board.frontmatter.message ?? "",
    arc: board.frontmatter.arc ?? "",
    audience: board.frontmatter.audience ?? "",
    ...(parseYoutubeFile(dir) ? { youtube: parseYoutubeFile(dir) } : {}),
    beats: beats.map((beat, index) => {
      const frame = board.frames[index] ?? null;
      const src = frame?.src ?? `compositions/frames/${beat.id}.html`;
      const host = hosts.get(src);
      return {
        id: beat.id,
        title: frame?.title ?? beat.id,
        narration: `beats/${beat.id}.txt`,
        audio: `assets/voice/${beat.id}.wav`,
        claims: claims.get(beat.id) ?? [],
        shots: [
          {
            id: beat.id,
            title: frame?.title ?? beat.id,
            src,
            hostId: host?.id ?? `scene-${beat.id}`,
            compositionId: host?.compositionId ?? beat.id,
            scene: frame?.scene ?? "",
            reads: frame?.meta?.reads ?? "",
            sound: frame?.meta?.sound ?? "",
            transition_in: frame?.transition ?? "cut",
            poster: frame?.meta?.poster ? Number(frame.meta.poster) : 0,
            narrative: frame?.narrative ?? "",
            seconds: frame?.duration ?? (timingById.get(beat.id) ?? 0) + (cfg.tailSeconds ?? 0.3),
          },
        ],
      };
    }),
  };
}

function loadEpisode(dir, cfg, { allowLegacy = false } = {}) {
  try {
    const episode = readEpisode(dir);
    if (episode) {
      const timing = readJSON(path.join(dir, "assets/voice/timing.json"));
      return { episode, timeline: buildTimeline(episode, timing, cfg), source: "episode" };
    }
    if (allowLegacy) {
      const legacy = legacyEpisode(dir, cfg);
      if (legacy) {
        const timing = readJSON(path.join(dir, "assets/voice/timing.json"));
        return { episode: legacy, timeline: buildTimeline(legacy, timing, cfg), source: "legacy" };
      }
    }
  } catch (error) {
    fail(error.message);
  }
  return null;
}

async function cmdMigrate() {
  const slug = requireSlug();
  const cfg = videoConfig(slug);
  const dir = videoDir(slug);
  const file = episodeFile(dir);
  if (existsSync(file) && !flags.force) {
    fail(`videos/${slug}/episode.json already exists. Use --force to rebuild it.`);
  }
  const episode = legacyEpisode(dir, cfg);
  if (!episode) {
    fail(`Cannot migrate ${slug}: needs beats/*.txt, STORYBOARD.md and assets/voice/timing.json.`);
  }
  const errors = validateEpisode(episode);
  failOnEpisodeErrors(errors);
  writeJSON(file, episode);
  ok(`episode.json written: ${episode.beats.length} beat(s)`);
  await cmdCompile();
}

async function cmdCompile() {
  const slug = requireSlug();
  const cfg = videoConfig(slug);
  const dir = videoDir(slug);
  const episode = readEpisode(dir);
  if (!episode)
    fail(`Missing videos/${slug}/episode.json. Run: node harness/cli.mjs migrate ${slug}`);
  const errors = validateEpisode(episode);
  failOnEpisodeErrors(errors);
  let effective = episode;
  if (flags.tail != null) effective = { ...episode, tailSeconds: Number(flags.tail) };
  const timing = readJSON(path.join(dir, "assets/voice/timing.json"));
  let timeline;
  try {
    timeline = buildTimeline(effective, timing, cfg);
  } catch (error) {
    fail(error.message);
  }
  const existingBoard = existsSync(path.join(dir, "STORYBOARD.md"))
    ? parseStoryboard(path.join(dir, "STORYBOARD.md"))
    : null;
  const brief = existsSync(path.join(dir, "BRIEF.md"))
    ? readFileSync(path.join(dir, "BRIEF.md"), "utf8")
    : "";
  const sources = sourcesFrom(path.join(dir, "SOURCES.md"));
  writeCompiled(dir, effective, timeline, {
    markdown: true,
    html: flags.html !== false && flags["no-html"] !== true,
    existingBoard,
    brief,
    sources,
    cfg,
  });
  for (const warning of timeline.warnings) info(`  warning: ${warning}`);
  ok(
    `${timeline.shots.length} shot(s), ${timeline.beats.length} beat(s), ${timeline.chapters.length} chapter(s), ${timeline.duration.toFixed(2)}s`,
  );
  info(`  timeline  assets/timeline.json`);
  info(`  board     STORYBOARD.md`);
  info(`  script    SCRIPT.md`);
  info(`  youtube   publish/youtube.md`);
  if (flags.check) await cmdCheck();
}

async function cmdTimeline() {
  const slug = requireSlug();
  const cfg = videoConfig(slug);
  const dir = videoDir(slug);
  const loaded = loadEpisode(dir, cfg, { allowLegacy: true });
  if (!loaded) fail(`No episode.json or legacy beats/timing in videos/${slug}.`);
  if (flags.json) {
    console.log(JSON.stringify(loaded.timeline, null, 2));
    return;
  }
  info(
    `${loaded.timeline.slug ?? slug}  ${loaded.timeline.duration.toFixed(3)}s  ${loaded.timeline.shots.length} shots  ${loaded.timeline.chapters.length} chapters  [${loaded.source}]`,
  );
  for (const beat of loaded.timeline.beats) {
    info(
      `  ${chapterTime(beat.start)}  ${beat.id.padEnd(24)} ${beat.duration.toFixed(2)}s  audio ${beat.audioDuration.toFixed(2)}s  ${beat.shots.length} shot(s)`,
    );
    for (const shot of beat.shots) {
      info(
        `       ${chapterTime(shot.start)} +${shot.duration.toFixed(2)}s  ${shot.id}  ${shot.src}`,
      );
    }
  }
  for (const chapter of loaded.timeline.chapters) {
    info(
      `chapter ${chapterTime(chapter.start)}  ${chapter.duration.toFixed(2)}s  ${chapter.title}`,
    );
  }
  for (const warning of loaded.timeline.warnings) info(`  warning: ${warning}`);
}

async function cmdOtio() {
  const slug = requireSlug();
  const cfg = videoConfig(slug);
  const dir = videoDir(slug);
  const loaded = loadEpisode(dir, cfg, { allowLegacy: true });
  if (!loaded) fail(`No episode.json or legacy timeline in videos/${slug}.`);
  ensureDir(path.join(dir, "publish"));
  const out = path.join(dir, "publish", `${slug}.otio`);
  writeJSON(out, timelineToOtio(loaded.timeline));
  ok(
    `OTIO timeline ${out} (${loaded.timeline.shots.length} video clips, ${loaded.timeline.beats.length} audio clips)`,
  );
}

async function cmdTts() {
  const slug = requireSlug();
  const cfg = videoConfig(slug);
  const dir = videoDir(slug);
  const beats = beatFiles(dir);
  if (!beats.length) fail(`No beats/*.txt in videos/${slug}`);

  const voice = flags.voice ?? cfg.voice ?? "af_heart";
  const speed = String(flags.speed ?? cfg.speed ?? 1.0);
  if (flags.voice || flags.speed) {
    writeJSON(path.join(dir, "video.json"), { ...cfg, voice, speed: Number(speed) });
  }
  const onlyBeat = flags.beat ? String(flags.beat) : null;
  const selected = onlyBeat ? beats.filter((beat) => beat.id === onlyBeat) : beats;
  if (!selected.length) fail(`No beat ${onlyBeat} in videos/${slug}/beats`);
  const previous = readJSON(path.join(dir, "assets/voice/timing.json"), { beats: [] });
  const previousSeconds = new Map((previous.beats ?? []).map((beat) => [beat.id, beat.seconds]));
  const cacheFile = path.join(dir, "assets/voice/.cache.json");
  const cache = readJSON(cacheFile, {});
  const timing = { voice, speed, beats: [], totalSeconds: 0 };

  for (const beat of beats) {
    const out = path.join(dir, "assets/voice", `${beat.id}.wav`);
    ensureDir(path.dirname(out));
    const text = readFileSync(beat.file, "utf8").trim();
    const key = createHash("sha256").update(`${voice}|${speed}|${text}`).digest("hex");
    const cached = cache[beat.id];
    const shouldSpeak = selected.some((item) => item.id === beat.id);
    const stale = cached?.key && cached.key !== key;
    if (shouldSpeak && (!existsSync(out) || flags.force || stale)) {
      info(`TTS ${beat.id} ...`);
      const result = hf(
        ["tts", beat.file, "-o", out, "--voice", voice, "--speed", speed, "--json"],
        { cwd: dir },
      );
      const payload = `${result.stdout ?? ""}`.trim();
      const start = payload.lastIndexOf("{");
      if (result.status !== 0 || start === -1) {
        fail(`TTS failed for ${beat.id}\n${payload}\n${result.stderr ?? ""}`);
      }
      const data = JSON.parse(payload.slice(start));
      if (!data.ok) fail(`TTS failed for ${beat.id}: ${data.error ?? "unknown error"}`);
    }
    if (existsSync(out)) {
      cache[beat.id] = {
        key,
        voice,
        speed: Number(speed),
        chars: text.length,
        file: path.relative(dir, out),
        generatedAt:
          cached?.key === key && cached.generatedAt ? cached.generatedAt : new Date().toISOString(),
      };
    }
    const probe = existsSync(out) ? probeSummary(out) : null;
    const seconds = probe?.duration ?? previousSeconds.get(beat.id) ?? 0;
    timing.beats.push({ id: beat.id, audio: path.relative(dir, out), seconds });
    timing.totalSeconds += seconds;
    if (shouldSpeak)
      info(
        `  ${beat.id.padEnd(24)} ${seconds.toFixed(2)}s${cached?.key === key && !flags.force ? " (cached)" : ""}`,
      );
  }
  writeJSON(cacheFile, cache);

  timing.suggestedDuration = Number(
    (timing.totalSeconds + beats.length * (cfg.tailSeconds ?? 0.3)).toFixed(3),
  );
  writeJSON(path.join(dir, "assets/voice/timing.json"), timing);
  ok(
    `Narration ${timing.totalSeconds.toFixed(2)}s; suggested root duration ${timing.suggestedDuration.toFixed(2)}s`,
  );
  info(
    onlyBeat
      ? "Re-voiced one beat. Run sync to retime shots, hosts and chapters."
      : "Run sync to retime all shots, hosts, audio clips, chapters and the root data-duration.",
  );
}

async function cmdSync() {
  const slug = requireSlug();
  const cfg = videoConfig(slug);
  const dir = videoDir(slug);
  const timing = readJSON(path.join(dir, "assets/voice/timing.json"));
  if (!timing?.beats?.length) fail("No assets/voice/timing.json beats. Run tts first.");
  const loaded = loadEpisode(dir, cfg, { allowLegacy: true });
  if (!loaded)
    fail(
      `No episode.json and no legacy beats + STORYBOARD.md in videos/${slug}. Run migrate first.`,
    );
  let episode = loaded.episode;
  if (flags.tail != null) episode = { ...episode, tailSeconds: Number(flags.tail) };
  let timeline;
  try {
    timeline = buildTimeline(episode, timing, cfg);
  } catch (error) {
    fail(error.message);
  }
  if (loaded.source === "legacy" || flags.tail != null) {
    writeJSON(episodeFile(dir), episode);
  }
  const existingBoard = existsSync(path.join(dir, "STORYBOARD.md"))
    ? parseStoryboard(path.join(dir, "STORYBOARD.md"))
    : null;
  const brief = existsSync(path.join(dir, "BRIEF.md"))
    ? readFileSync(path.join(dir, "BRIEF.md"), "utf8")
    : "";
  const sources = sourcesFrom(path.join(dir, "SOURCES.md"));
  writeCompiled(dir, episode, timeline, {
    markdown: true,
    html: true,
    existingBoard,
    brief,
    sources,
    cfg,
  });
  for (const warning of timeline.warnings) info(`  warning: ${warning}`);
  ok(
    `${timeline.beats.length} beat(s), ${timeline.shots.length} shot(s), ${timeline.chapters.length} chapter(s), root ${timeline.duration.toFixed(3)}s`,
  );
  info("  storyboard, script, youtube, hosts, audio clips and chapters written. Re-run captions.");
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function writeCaptionsComposition(dir, cues, filmDuration) {
  const file = path.join(dir, "compositions/captions.html");
  const marker = "<!-- generated by ahyper-frames harness; edit the template, not this file -->";
  if (existsSync(file) && !flags.force) {
    const current = readFileSync(file, "utf8");
    if (!current.includes(marker)) {
      info(
        `captions composition: keeping custom ${path.relative(dir, file)} (run with --force to regenerate)`,
      );
      return file;
    }
  }
  const clips = cues
    .map((cue, index) => {
      const lines = cue.text
        .split("\n")
        .map((line) => escapeHtml(line))
        .join("<br>");
      const duration = Math.max(0.2, cue.end - cue.start);
      return `    <div id="cap-${index}" class="clip cap" data-start="${cue.start.toFixed(3)}" data-duration="${duration.toFixed(3)}" data-track-index="99">${lines}</div>`;
    })
    .join("\n");
  const html = `<template>
${marker}
  <style>
    #root {
      position: absolute;
      inset: 0;
      pointer-events: none;
      font-family: "Lato", sans-serif;
    }
    .cap {
      position: absolute;
      left: 50%;
      bottom: 10%;
      transform: translateX(-50%);
      max-width: 78%;
      padding: 12px 28px 14px;
      background: rgba(23, 21, 18, 0.86);
      color: #f4efe6;
      font-size: 38px;
      font-weight: 700;
      line-height: 1.28;
      text-align: center;
      letter-spacing: 0.01em;
      border-left: 6px solid #cf431c;
      box-sizing: border-box;
      z-index: 50;
    }
  </style>
  <div id="root" data-composition-id="captions" data-width="1920" data-height="1080">
${clips}
  </div>
  <script>
    window.__timelines = window.__timelines || {};
    window.__timelines["captions"] = gsap.timeline({ paused: true });
  </script>
</template>
`;
  ensureDir(path.dirname(file));
  writeFileSync(file, html);
  info(
    `captions composition: ${path.relative(dir, file)} (mount it at data-start="0" for ${filmDuration.toFixed(2)}s)`,
  );
  return file;
}

async function cmdCaptions() {
  const slug = requireSlug();
  const cfg = videoConfig(slug);
  const dir = videoDir(slug);
  const loaded = loadEpisode(dir, cfg, { allowLegacy: true });
  if (!loaded) fail(`No episode.json and no legacy beats + STORYBOARD.md in videos/${slug}.`);
  const timeline = loaded.timeline;
  const cues = [];
  const qa = [];

  for (const beat of timeline.beats) {
    const wav = path.join(dir, "assets/voice", `${beat.id}.wav`);
    if (!existsSync(wav)) fail(`Missing ${path.relative(dir, wav)}. Run tts first.`);
    const srt = path.join(dir, "assets/voice", `${beat.id}.srt`);
    const transcriptJson = path.join(dir, "assets/voice", `${beat.id}.transcript.json`);
    const audioMtime = existsSync(wav) ? statSync(wav).mtimeMs : 0;
    const transcriptMtime = existsSync(transcriptJson) ? statSync(transcriptJson).mtimeMs : 0;
    const srtMtime = existsSync(srt) ? statSync(srt).mtimeMs : 0;
    const stale = audioMtime > Math.max(transcriptMtime, srtMtime) + 1000;
    if (!existsSync(srt) || !existsSync(transcriptJson) || stale || flags.force) {
      info(`Transcribing ${beat.id}${stale ? " (audio changed)" : ""} ...`);
      const result = hf(["transcribe", wav, "--to", "srt", "-o", srt, "-d", dir, "--json"], {
        cwd: dir,
      });
      if (result.status !== 0 || !existsSync(srt)) {
        fail(`Transcription failed for ${beat.id}\n${result.stdout ?? ""}\n${result.stderr ?? ""}`);
      }
      const produced = path.join(dir, "transcript.json");
      if (existsSync(produced)) renameSync(produced, transcriptJson);
    }

    const words = parseWords(transcriptJson);
    const scriptText = readFileSync(path.join(dir, "beats", `${beat.id}.txt`), "utf8");
    if (words.length) {
      const local = groupWordsForBeat(words, beat.start, beat.duration);
      for (const cue of local) {
        cues.push({
          ...cue,
          text: cue.text.trim(),
          beat: beat.id,
          source: "words",
        });
      }
      const transcriptText = words.map((word) => word.text).join(" ");
      const wer = wordErrorRate(scriptText, transcriptText);
      qa.push({
        beat: beat.id,
        words: words.length,
        scriptWords: scriptText.trim().split(/\s+/).filter(Boolean).length,
        wer: Number(wer.toFixed(4)),
        start: beat.start,
        end: beat.end,
        ok: wer <= 0.12,
      });
      if (wer > 0.12)
        info(`  warning: ${beat.id} WER ${(wer * 100).toFixed(1)}% (check numerals/names)`);
    } else if (existsSync(srt)) {
      const local = parseSrt(readFileSync(srt, "utf8"));
      for (const cue of local) {
        const start = beat.start + Math.max(0, cue.start);
        const end = Math.min(beat.end, beat.start + cue.end);
        if (end - start < 0.05) continue;
        cues.push({
          start,
          end,
          text: cue.text.trim(),
          beat: beat.id,
          source: "srt",
        });
      }
      qa.push({
        beat: beat.id,
        words: 0,
        scriptWords: scriptText.trim().split(/\s+/).filter(Boolean).length,
        wer: null,
        start: beat.start,
        end: beat.end,
        ok: false,
      });
      info(`  warning: ${beat.id} has no word timings; using SRT cue timing`);
    } else {
      fail(`No transcript or SRT for ${beat.id}`);
    }
  }

  let normalized = cues
    .filter((cue) => cue.end - cue.start >= 0.2)
    .sort((a, b) => a.start - b.start);
  let previousEnd = -1;
  for (const cue of normalized) {
    if (cue.start < previousEnd + 0.02) cue.start = previousEnd + 0.02;
    if (cue.end - cue.start < 0.2) cue.end = cue.start + 0.2;
    previousEnd = cue.end;
  }
  normalized = normalized.filter((cue) => cue.end > cue.start);

  const combined = path.join(dir, "assets/voice/captions.srt");
  writeFileSync(combined, toSrt(normalized));
  writeJSON(path.join(dir, "assets/voice/captions.json"), {
    generatedAt: new Date().toISOString(),
    duration: timeline.duration,
    cues: normalized,
  });
  writeJSON(path.join(dir, "assets/voice/transcript-qa.json"), {
    generatedAt: new Date().toISOString(),
    threshold: 0.12,
    beats: qa,
    ok: qa.every((item) => item.ok || item.wer == null),
  });
  writeCaptionsComposition(dir, normalized, timeline.duration);

  const longLines = normalized.filter((cue) =>
    cue.text.split("\n").some((line) => line.length > 42),
  );
  const longCues = normalized.filter((cue) => cue.end - cue.start > 6);
  const fast = normalized.filter(
    (cue) => cue.text.length / Math.max(0.1, cue.end - cue.start) > 20,
  );
  const badWer = qa.filter((item) => item.wer != null && item.wer > 0.12);
  ok(
    `${normalized.length} caption cues across ${qa.length} beats, ${timeline.duration.toFixed(2)}s total`,
  );
  if (longLines.length) info(`  ${longLines.length} cue(s) with a line over 42 characters`);
  if (longCues.length) info(`  ${longCues.length} cue(s) longer than 6s`);
  if (fast.length) info(`  ${fast.length} cue(s) over 20 characters/second`);
  if (badWer.length) info(`  ${badWer.length} beat(s) above 12% WER`);
  if (flags.strict && (longLines.length || longCues.length || fast.length || badWer.length)) {
    fail("caption strict check failed");
  }
}

async function cmdLintScript() {
  const slug = requireSlug();
  const cfg = videoConfig(slug);
  const dir = videoDir(slug);
  const beats = beatFiles(dir);
  const claims = parseClaims(dir);
  const scriptClaims = parseScriptClaims(dir);
  const errors = [];
  const warnings = [];
  if (!beats.length) errors.push("no beats/*.txt");
  if (!claims.size) warnings.push("SOURCES.md has no claim-table rows (| C1 | ... |)");

  const banned = [
    "in this video",
    "let's dive in",
    "let us dive in",
    "but here's the thing",
    "game-changer",
    "game changer",
    "seamless",
    "unlock",
    "revolutionary",
    "mind-blowing",
    "in seconds",
  ];
  let totalWords = 0;
  const beatWords = [];
  for (const beat of beats) {
    const text = readFileSync(beat.file, "utf8").trim();
    const words = text ? text.split(/\s+/).length : 0;
    totalWords += words;
    beatWords.push({ id: beat.id, words });
    if (!text) errors.push(`${beat.id}.txt is empty`);
    const sentences = text
      .split(/[.!?]+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);
    for (const sentence of sentences) {
      const count = sentence.split(/\s+/).length;
      if (count > 25)
        warnings.push(`${beat.id}: ${count}-word sentence: "${sentence.slice(0, 70)}..."`);
    }
    const lower = text.toLowerCase();
    for (const phrase of banned) {
      if (lower.includes(phrase)) warnings.push(`${beat.id}: banned phrase "${phrase}"`);
    }
    const beatClaims = scriptClaims.get(beat.id) ?? [];
    const numbers = numericClaims(text);
    const labelled = beatClaims.some((claim) =>
      /implementation fact|illustrative|arithmetic/i.test(claim),
    );
    if (numbers.length && !beatClaims.length) {
      warnings.push(
        `${beat.id}: has numeric claims (${numbers.slice(0, 4).join(", ")}) but no claims column`,
      );
    }
    if (
      numbers.length &&
      beatClaims.length &&
      !labelled &&
      !beatClaims.some((claim) => claims.has(claim))
    ) {
      warnings.push(`${beat.id}: claims ${beatClaims.join(", ")} do not resolve to SOURCES.md`);
    }
    for (const claim of beatClaims) {
      if (/^C\d+$/i.test(claim) && !claims.has(claim)) {
        errors.push(`${beat.id}: claim ${claim} is not in SOURCES.md`);
      }
    }
  }

  const timingFile = path.join(dir, "assets/voice/timing.json");
  const timing = readJSON(timingFile);
  if (timing?.beats) {
    for (const [index, beat] of timing.beats.entries()) {
      const words = beatWords[index]?.words ?? 0;
      const expected = words / 2.58;
      if (beat.seconds > 0 && Math.abs(beat.seconds - expected) / Math.max(expected, 0.1) > 0.3) {
        warnings.push(
          `${beat.id}: ${beat.seconds.toFixed(2)}s audio for ${words} words (expected ~${expected.toFixed(2)}s at 155 wpm)`,
        );
      }
    }
  } else {
    warnings.push("no assets/voice/timing.json; run tts to check narration pace");
  }

  const boardFile = path.join(dir, "STORYBOARD.md");
  const loaded = loadEpisode(dir, cfg, { allowLegacy: true });
  if (!existsSync(boardFile)) errors.push("missing STORYBOARD.md");
  else {
    const board = parseStoryboard(boardFile);
    const expectedShots = loaded?.timeline?.shots?.length ?? beats.length;
    if (board.frames.length !== expectedShots) {
      errors.push(`${board.frames.length} storyboard frames vs ${expectedShots} shot(s)`);
    }
    const sum = board.frames.reduce((total, frame) => total + (frame.duration ?? 0), 0);
    const expected = loaded?.timeline?.duration ?? rootDuration(path.join(dir, "index.html"));
    if (expected != null && Math.abs(sum - expected) > 0.15) {
      errors.push(`storyboard durations sum to ${sum.toFixed(2)}s, timeline is ${expected}s`);
    }
    for (const frame of board.frames) {
      if (!frame.src) warnings.push(`frame ${frame.number}: no src`);
      if (!frame.meta.reads) warnings.push(`frame ${frame.number}: no reads windows`);
      if (!frame.meta.sound) warnings.push(`frame ${frame.number}: no sound note`);
      if (frame.meta.beat && !beats.some((beat) => beat.id === frame.meta.beat)) {
        errors.push(`frame ${frame.number}: beat "${frame.meta.beat}" has no narration file`);
      }
    }
  }

  if (loaded?.timeline) {
    for (const warning of loaded.timeline.warnings) warnings.push(warning);
    if (loaded.timeline.duration >= 180) {
      const shortBeats = loaded.timeline.beats.filter((beat) => beat.duration < 30);
      if (shortBeats.length) {
        warnings.push(
          `${shortBeats.length} beat(s) under 30s in a ${(loaded.timeline.duration / 60).toFixed(1)}min episode; use shots inside long beats`,
        );
      }
    }
    const episode = readEpisode(dir);
    if (episode) {
      const episodeErrors = validateEpisode(episode);
      for (const error of episodeErrors) errors.push(`episode.json: ${error}`);
    }
  }

  const sources = sourcesFrom(path.join(dir, "SOURCES.md"));
  if (!sources.length) errors.push("SOURCES.md has no source URL");
  if (claims.size < 3 && (loaded?.timeline?.duration ?? 0) >= 180) {
    warnings.push(`only ${claims.size} claim row(s) for a long episode`);
  }
  for (const file of ["frame.md", "ASSETS.md", "VOICE.md", "MUSIC.md"]) {
    if (!existsSync(path.join(dir, file))) warnings.push(`missing ${file}`);
  }
  const briefFile = path.join(dir, "BRIEF.md");
  if (!existsSync(briefFile)) errors.push("missing BRIEF.md");
  else {
    const brief = readFileSync(briefFile, "utf8");
    if (!/\*\*Promise\*\*/.test(brief)) warnings.push("BRIEF.md has no Promise line");
    if (!/\*\*(Through-line question|One-sentence thesis)\*\*/i.test(brief))
      warnings.push("BRIEF.md has no through-line question");
  }

  const estimated = totalWords / 2.58;
  info(`words     ${totalWords} across ${beats.length} beats`);
  info(`narration ~${estimated.toFixed(1)}s at 155 wpm`);
  for (const warning of warnings) info(`  warning: ${warning}`);
  if (errors.length) {
    for (const error of errors) console.error(`✗ ${error}`);
    fail(`script lint failed (${errors.length} error(s), ${warnings.length} warning(s))`);
  }
  if (flags.strict && warnings.length)
    fail(`script lint failed in strict mode (${warnings.length} warning(s))`);
  ok(`script lint passed (${warnings.length} warning(s))`);
}

async function cmdCheck() {
  const slug = requireSlug();
  const dir = videoDir(slug);
  if (!flags["skip-lint"]) await cmdLintScript();
  const lint = hf(["lint", dir], { cwd: ROOT });
  if (lint.stdout) console.log(lint.stdout.trim());
  const report = hfJSON(["check", "--json", dir], { cwd: ROOT });
  if (report.error && !report.findings) fail(report.error);
  const errors = report.errorCount ?? 0;
  const warnings = report.warningCount ?? 0;
  info(`check: ${errors} error(s), ${warnings} warning(s)`);
  for (const finding of report.findings ?? []) {
    const severity = finding.severity ?? (finding.level === "error" ? "error" : "warning");
    info(`  [${severity}] ${finding.message ?? finding.code ?? JSON.stringify(finding)}`);
    if (finding.fix) info(`    fix: ${finding.fix}`);
    if (finding.file) info(`    at: ${finding.file}${finding.line ? `:${finding.line}` : ""}`);
  }
  if (errors > 0 || lint.status !== 0 || (flags.strict && warnings > 0)) {
    fail(`check failed (${errors} errors, ${warnings} warnings)`);
  }
  ok("check passed");
}

function collectImages(value, out = []) {
  if (typeof value === "string" && /\.(png|jpe?g|webp)$/i.test(value)) out.push(value);
  else if (Array.isArray(value)) for (const item of value) collectImages(item, out);
  else if (value && typeof value === "object")
    for (const item of Object.values(value)) collectImages(item, out);
  return out;
}

async function cmdSnapshot() {
  const slug = requireSlug();
  const dir = videoDir(slug);
  const snapshotArgs = ["snapshot", dir, "--json"];
  if (flags.review) snapshotArgs.push("--review");
  if (flags.at) snapshotArgs.push("--at", flags.at);
  if (flags.range) snapshotArgs.push("--range", flags.range);
  if (flags.frames) snapshotArgs.push("--frames", flags.frames);
  if (flags.composition) snapshotArgs.push("--composition", flags.composition);
  if (flags.zoom) snapshotArgs.push("--zoom", flags.zoom);
  if (flags.against) snapshotArgs.push("--against", flags.against);
  const result = hf(snapshotArgs, { cwd: ROOT });
  const text = `${result.stdout ?? ""}`.trim();
  const start = text.indexOf("{");
  if (start === -1) fail(`snapshot failed\n${text}\n${result.stderr ?? ""}`);
  const data = JSON.parse(text.slice(start));
  const images = [...new Set(collectImages(data))];
  for (const image of images) info(image.startsWith("/") ? image : path.join(dir, image));
  ok(`${images.length} image(s)`);
}

function measureLoudnorm(file) {
  const result = run("ffmpeg", [
    "-hide_banner",
    "-nostats",
    "-i",
    file,
    "-af",
    "loudnorm=I=-14:TP=-1.0:LRA=11:print_format=json",
    "-f",
    "null",
    "-",
  ]);
  const text = `${result.stderr ?? ""}`;
  const start = text.lastIndexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  return JSON.parse(text.slice(start, end + 1));
}

function masterFile(file) {
  const probe = probeSummary(file);
  if (!probe?.audio) {
    info("master: no audio stream, skipping");
    return null;
  }
  const measured = measureLoudnorm(file);
  if (!measured) fail(`master: could not measure ${file}`);
  const tmp = `${file}.mastering.mp4`;
  const filter = [
    "loudnorm=I=-14:TP=-1.0:LRA=11",
    `measured_I=${measured.input_i}`,
    `measured_TP=${measured.input_tp}`,
    `measured_LRA=${measured.input_lra}`,
    `measured_thresh=${measured.input_thresh}`,
    `offset=${measured.target_offset}`,
    "linear=true",
    "print_format=summary",
  ].join(":");
  info("Mastering to -14 LUFS / -1 dBTP ...");
  const result = run("ffmpeg", [
    "-hide_banner",
    "-y",
    "-i",
    file,
    "-af",
    filter,
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "320000",
    "-ar",
    "48000",
    "-movflags",
    "+faststart",
    tmp,
  ]);
  if (result.status !== 0) {
    if (existsSync(tmp)) renameSync(tmp, `${file}.failed-master.mp4`);
    fail(`master failed\n${result.stderr ?? ""}`);
  }
  renameSync(tmp, file);
  const after = loudness(file);
  ok(
    `mastered ${probe.duration.toFixed(2)}s  ${after ? `${after.integrated.toFixed(1)} LUFS / ${after.truePeak.toFixed(1)} dBTP` : "measured"}`,
  );
  return after;
}

async function cmdMaster() {
  const slug = requireSlug();
  const dir = videoDir(slug);
  const file = flags.file
    ? path.isAbsolute(flags.file)
      ? flags.file
      : path.join(dir, flags.file)
    : path.join(dir, "renders", `${slug}.mp4`);
  if (!existsSync(file)) fail(`Missing ${file}. Render first.`);
  masterFile(file);
}

async function cmdRender() {
  const slug = requireSlug();
  const cfg = videoConfig(slug);
  const dir = videoDir(slug);
  const quality = flags.quality ?? "looks";
  const workers = flags.workers ?? cfg.workers ?? "auto";
  const output = flags.output ?? path.join("renders", `${slug}.mp4`);
  const out = path.isAbsolute(output) ? output : path.join(dir, output);
  ensureDir(path.dirname(out));
  const args = ["render", dir, "--quality", quality, "--workers", String(workers), "--output", out];
  if (flags.fps) args.push("--fps", String(flags.fps));
  if (flags.resolution) args.push("--resolution", String(flags.resolution));
  if (flags.crf) args.push("--crf", String(flags.crf));
  if (flags["max-bitrate"]) args.push("--max-bitrate", String(flags["max-bitrate"]));
  if (flags["browser-gpu"]) args.push("--browser-gpu");
  if (flags["no-browser-gpu"]) args.push("--no-browser-gpu");
  if (flags.gpu) args.push("--gpu");
  if (flags.docker) args.push("--docker");
  if (flags["max-concurrent-renders"])
    args.push("--max-concurrent-renders", String(flags["max-concurrent-renders"]));
  info(`Rendering ${slug} (${quality}, ${workers} workers) ...`);
  const startedAt = new Date().toISOString();
  const startMs = Date.now();
  const result = hf(args, { cwd: ROOT, inherit: true });
  const elapsedSeconds = (Date.now() - startMs) / 1000;
  if (result.status !== 0) fail(`render failed (${result.status})`);
  let probe = probeSummary(out);
  if (!probe) fail(`render wrote no readable file at ${out}`);
  let master = null;
  if (flags.master !== false && flags["no-master"] !== true) {
    const before = loudness(out);
    master = masterFile(out);
    probe = probeSummary(out);
    master = { before, after: master };
  }
  const fps = probe.video?.fps || Number(cfg.fps ?? 30);
  const frames = Math.round(probe.duration * fps);
  const report = {
    file: out,
    slug,
    startedAt,
    elapsedSeconds: Number(elapsedSeconds.toFixed(2)),
    quality,
    workers,
    backend: flags["browser-gpu"]
      ? "browser-gpu"
      : flags.gpu
        ? "gpu-encode"
        : flags.docker
          ? "docker"
          : "auto",
    frames,
    fps,
    framesPerSecond: Number((frames / Math.max(0.001, elapsedSeconds)).toFixed(2)),
    command: `hyperframes ${args.join(" ")}`,
    duration: probe.duration,
    size: probe.size,
    video: probe.video,
    audio: probe.audio,
    loudness: loudness(out),
    master,
  };
  writeJSON(path.join(dir, "publish/render.json"), report);
  ok(
    `${out}  ${probe.duration.toFixed(2)}s  ${probe.video?.width}x${probe.video?.height}  ${fps.toFixed(3)}fps`,
  );
  info(
    `  ${frames} frames in ${elapsedSeconds.toFixed(1)}s (${report.framesPerSecond.toFixed(2)} fps capture)`,
  );
}

async function cmdCloud() {
  const slug = requireSlug();
  videoConfig(slug);
  const dir = videoDir(slug);
  const quality = flags.quality ?? "high";
  const output = flags.output ?? path.join("renders", `${slug}-cloud.mp4`);
  const out = path.isAbsolute(output) ? output : path.join(dir, output);
  ensureDir(path.dirname(out));
  const args = ["cloud", "render", dir, "--quality", quality, "--output", out];
  if (flags.resolution) args.push("--resolution", String(flags.resolution));
  if (flags.fps) args.push("--fps", String(flags.fps));
  if (flags.composition) args.push("--composition", String(flags.composition));
  if (flags["dry-run"]) args.push("--dry-run");
  info(`Cloud rendering ${slug} (${quality}) ...`);
  const startedAt = new Date().toISOString();
  const startMs = Date.now();
  const result = hf(args, { cwd: ROOT, inherit: true });
  const elapsedSeconds = (Date.now() - startMs) / 1000;
  if (result.status !== 0) fail(`cloud render failed (${result.status})`);
  const probe = existsSync(out) ? probeSummary(out) : null;
  if (!probe) {
    info(
      "cloud render finished; no local output file was downloaded. Check the HyperFrames cloud output path.",
    );
    return;
  }
  writeJSON(path.join(dir, "publish/render.json"), {
    file: out,
    slug,
    startedAt,
    elapsedSeconds: Number(elapsedSeconds.toFixed(2)),
    quality,
    backend: "hyperframes-cloud",
    duration: probe.duration,
    size: probe.size,
    video: probe.video,
    audio: probe.audio,
    loudness: loudness(out),
  });
  ok(`${out}  ${probe.duration.toFixed(2)}s  ${probe.video?.width}x${probe.video?.height}`);
}

function parseDetections(stderr, kind) {
  const lines = stderr.split("\n").filter((line) => line.includes(kind));
  if (kind === "freeze_") {
    const starts = [];
    const ends = [];
    const durations = [];
    for (const line of lines) {
      const start = line.match(/freeze_start:\s*([\d.]+)/);
      const end = line.match(/freeze_end:\s*([\d.]+)/);
      const duration = line.match(/freeze_duration:\s*([\d.]+)/);
      if (start) starts.push(Number(start[1]));
      if (end) ends.push(Number(end[1]));
      if (duration) durations.push(Number(duration[1]));
    }
    return starts.map((start, index) => {
      const end = ends[index] ?? (durations[index] != null ? start + durations[index] : null);
      return end == null
        ? `freeze from ${start.toFixed(2)}s`
        : `freeze ${start.toFixed(2)}-${end.toFixed(2)}s (${(end - start).toFixed(2)}s)`;
    });
  }
  if (kind === "silence_") {
    const starts = [];
    const ends = [];
    for (const line of lines) {
      const start = line.match(/silence_start:\s*([\d.]+)/);
      const end = line.match(/silence_end:\s*([\d.]+)/);
      if (start) starts.push(Number(start[1]));
      if (end) ends.push(Number(end[1]));
    }
    return starts.map((start, index) => {
      const end = ends[index];
      return end == null
        ? `silence from ${start.toFixed(2)}s`
        : `silence ${start.toFixed(2)}-${end.toFixed(2)}s (${(end - start).toFixed(2)}s)`;
    });
  }
  return lines.map((line) => line.trim()).slice(0, 20);
}

function measureLoudnessSegment(file, start, duration) {
  const result = run("ffmpeg", [
    "-hide_banner",
    "-nostats",
    "-ss",
    String(start),
    "-t",
    String(duration),
    "-i",
    file,
    "-af",
    "loudnorm=print_format=json",
    "-f",
    "null",
    "-",
  ]);
  const text = `${result.stderr ?? ""}`;
  const begin = text.lastIndexOf("{");
  const end = text.lastIndexOf("}");
  if (begin === -1 || end === -1) return null;
  try {
    const data = JSON.parse(text.slice(begin, end + 1));
    return {
      integrated: Number(data.input_i),
      truePeak: Number(data.input_tp),
      lra: Number(data.input_lra),
    };
  } catch {
    return null;
  }
}

async function cmdQa() {
  const slug = requireSlug();
  const cfg = videoConfig(slug);
  const dir = videoDir(slug);
  const file = flags.file
    ? path.isAbsolute(flags.file)
      ? flags.file
      : path.join(dir, flags.file)
    : path.join(dir, "renders", `${slug}.mp4`);
  if (!existsSync(file)) fail(`Missing ${file}. Render first.`);

  const probe = probeSummary(file);
  if (!probe) fail(`ffprobe cannot read ${file}`);
  const loaded = loadEpisode(dir, cfg, { allowLegacy: true });
  const expectedDuration = loaded?.timeline?.duration ?? rootDuration(path.join(dir, "index.html"));
  const expectedFps = Number(cfg.fps ?? 30);
  const expectedWidth = Number(cfg.width ?? 1920);
  const expectedHeight = Number(cfg.height ?? 1080);

  const problems = [];
  const warnings = [];
  if (probe.video?.codec !== "h264")
    problems.push(`video codec is ${probe.video?.codec}, expected h264`);
  if (probe.video?.pixFmt !== "yuv420p")
    problems.push(`pixel format is ${probe.video?.pixFmt}, expected yuv420p`);
  if (probe.video?.width !== expectedWidth || probe.video?.height !== expectedHeight) {
    problems.push(
      `resolution ${probe.video?.width}x${probe.video?.height}, expected ${expectedWidth}x${expectedHeight}`,
    );
  }
  if (Math.abs((probe.video?.fps ?? 0) - expectedFps) > 0.1) {
    problems.push(`fps ${probe.video?.fps?.toFixed(3)}, expected ${expectedFps}`);
  }
  if (!probe.audio) problems.push("no audio stream");
  else {
    if (probe.audio.sampleRate !== 48000)
      warnings.push(`audio sample rate ${probe.audio.sampleRate}, expected 48000`);
    if (probe.audio.channels !== 2)
      warnings.push(`audio channels ${probe.audio.channels}, expected 2`);
  }
  if (expectedDuration != null && Math.abs(probe.duration - expectedDuration) > 0.15) {
    problems.push(
      `duration ${probe.duration.toFixed(2)}s, timeline ${expectedDuration.toFixed(2)}s`,
    );
  }

  info("Measuring loudness (a few seconds) ...");
  const lufs = loudness(file);
  if (!lufs) warnings.push("loudness could not be measured");
  else {
    if (lufs.integrated < -15.5 || lufs.integrated > -13.0) {
      problems.push(
        `integrated loudness ${lufs.integrated.toFixed(1)} LUFS, target -14 LUFS (-15.5..-13.0)`,
      );
    }
    if (lufs.truePeak > -1.0)
      problems.push(`true peak ${lufs.truePeak.toFixed(1)} dBTP, target <= -1 dBTP`);
  }

  const black = run("ffmpeg", [
    "-hide_banner",
    "-i",
    file,
    "-vf",
    "blackdetect=d=0.5:pix_th=0.10",
    "-an",
    "-f",
    "null",
    "-",
  ]);
  const blackHits = parseDetections(black.stderr ?? "", "blackdetect");
  if (blackHits.length) warnings.push(`${blackHits.length} black segment(s) >= 0.5s`);

  const freeze = run("ffmpeg", [
    "-hide_banner",
    "-i",
    file,
    "-vf",
    "freezedetect=n=0.003:d=2",
    "-an",
    "-f",
    "null",
    "-",
  ]);
  const freezeHits = parseDetections(freeze.stderr ?? "", "freeze_");
  if (freezeHits.length) warnings.push(`${freezeHits.length} frozen segment marker(s) >= 2s`);

  const silence = run("ffmpeg", [
    "-hide_banner",
    "-i",
    file,
    "-af",
    "silencedetect=noise=-40dB:d=2",
    "-vn",
    "-f",
    "null",
    "-",
  ]);
  const silenceHits = parseDetections(silence.stderr ?? "", "silence_");
  if (silenceHits.length) warnings.push(`${silenceHits.length} silence marker(s) >= 2s`);

  ensureDir(path.join(dir, "publish"));
  const interval = Math.max(2, probe.duration / 60);
  const sheet = path.join(dir, "publish/contact-sheet.jpg");
  const tile = run("ffmpeg", [
    "-hide_banner",
    "-y",
    "-i",
    file,
    "-vf",
    `fps=1/${interval.toFixed(3)},scale=320:-1,tile=6x10`,
    "-frames:v",
    "1",
    "-q:v",
    "3",
    sheet,
  ]);
  if (tile.status !== 0) warnings.push("contact sheet could not be generated");

  const captionsFile = path.join(dir, "assets/voice/captions.srt");
  let captionCues = 0;
  let captionOverlaps = 0;
  if (existsSync(captionsFile)) {
    const cues = parseSrt(readFileSync(captionsFile, "utf8")).sort((a, b) => a.start - b.start);
    captionCues = cues.length;
    if (!cues.length) problems.push("captions.srt has no cues");
    const longLines = cues.filter((cue) => cue.text.split("\n").some((line) => line.length > 42));
    const longCues = cues.filter((cue) => cue.end - cue.start > 6);
    const fast = cues.filter((cue) => cue.text.length / Math.max(0.1, cue.end - cue.start) > 20);
    for (let i = 1; i < cues.length; i++) {
      if (cues[i].start < cues[i - 1].end - 0.02) captionOverlaps++;
    }
    if (longLines.length)
      warnings.push(`${longLines.length} caption cue(s) with a line over 42 chars`);
    if (longCues.length) warnings.push(`${longCues.length} caption cue(s) longer than 6s`);
    if (fast.length) warnings.push(`${fast.length} caption cue(s) over 20 chars/second`);
    if (captionOverlaps) problems.push(`${captionOverlaps} overlapping caption cue(s)`);
    if (cues.length) {
      const last = cues[cues.length - 1];
      if (last.end > probe.duration + 0.5)
        warnings.push(`captions end at ${last.end.toFixed(2)}s, past the video`);
    }
  } else if (!flags["skip-captions"]) {
    warnings.push("no assets/voice/captions.srt");
  }

  const transcriptQaFile = path.join(dir, "assets/voice/transcript-qa.json");
  let transcriptQa = null;
  if (existsSync(transcriptQaFile)) {
    transcriptQa = readJSON(transcriptQaFile);
    const bad = (transcriptQa?.beats ?? []).filter((beat) => beat.wer != null && beat.wer > 0.12);
    if (bad.length) warnings.push(`${bad.length} beat(s) above 12% ASR word error rate`);
  }

  const chapterResults = [];
  if (loaded?.timeline?.chapters?.length && !flags["no-chapters"]) {
    info(`Measuring ${loaded.timeline.chapters.length} chapter(s) ...`);
    for (const chapter of loaded.timeline.chapters) {
      const measured = measureLoudnessSegment(
        file,
        chapter.start,
        Math.min(chapter.duration, Math.max(1, probe.duration - chapter.start)),
      );
      if (!measured) {
        warnings.push(`chapter "${chapter.title}" loudness could not be measured`);
        continue;
      }
      chapterResults.push({
        title: chapter.title,
        start: chapter.start,
        duration: chapter.duration,
        ...measured,
      });
      if (measured.integrated < -17 || measured.integrated > -11) {
        warnings.push(`chapter "${chapter.title}" is ${measured.integrated.toFixed(1)} LUFS`);
      }
    }
  }

  const report = {
    file,
    duration: probe.duration,
    size: probe.size,
    video: probe.video,
    audio: probe.audio,
    loudness: lufs,
    render: readJSON(path.join(dir, "publish/render.json")),
    captions: {
      file: existsSync(captionsFile) ? captionsFile : null,
      cues: captionCues,
      overlaps: captionOverlaps,
      transcriptQa,
    },
    chapters: chapterResults,
    contactSheet: existsSync(sheet) ? sheet : null,
    blackSegments: blackHits,
    freezeSegments: freezeHits,
    silenceSegments: silenceHits,
    problems,
    warnings,
    ok: problems.length === 0,
  };
  writeJSON(path.join(dir, "publish/qa.json"), report);

  info("");
  info(`file      ${file}`);
  info(`duration  ${probe.duration.toFixed(2)}s (timeline ${expectedDuration ?? "?"}s)`);
  info(
    `video     ${probe.video?.codec} ${probe.video?.width}x${probe.video?.height} ${probe.video?.fps.toFixed(3)}fps ${probe.video?.pixFmt}`,
  );
  info(
    `audio     ${probe.audio?.codec ?? "none"} ${probe.audio?.sampleRate ?? ""}Hz ${probe.audio?.channels ?? ""}ch`,
  );
  info(
    `loudness  ${lufs ? `${lufs.integrated.toFixed(1)} LUFS, peak ${lufs.truePeak.toFixed(1)} dBTP` : "unmeasured"}`,
  );
  info(`captions  ${captionCues} cues, ${captionOverlaps} overlaps`);
  info(`chapters  ${chapterResults.length} measured`);
  info(`sheet     ${report.contactSheet ?? "none"}`);
  for (const warning of warnings) info(`  warning: ${warning}`);

  if (!report.ok) {
    for (const problem of problems) console.error(`✗ ${problem}`);
    fail(`QA failed (${problems.length} problem(s))`);
  }
  if (flags.strict && warnings.length)
    fail(`QA failed in strict mode (${warnings.length} warning(s))`);
  ok("QA passed");
}

function sourcesFrom(file) {
  if (!existsSync(file)) return [];
  const text = readFileSync(file, "utf8");
  return [
    ...new Set(
      (text.match(/https?:\/\/[^\s)>\]]+/g) ?? []).map((url) => url.replace(/[.,;:)]+$/, "")),
    ),
  ];
}

function withCaptionsHidden(dir, fn) {
  const index = path.join(dir, "index.html");
  const original = readFileSync(index, "utf8");
  let modified = original.replace(
    /(<[a-z][^>]*data-composition-id="captions"[^>]*?)data-duration="[^"]*"/g,
    '$1data-duration="0.001"',
  );
  if (modified === original) {
    modified = original.replace(
      /(<[a-z][^>]*id="captions-host"[^>]*?)data-duration="[^"]*"/g,
      '$1data-duration="0.001"',
    );
  }
  if (modified === original) return fn();
  writeFileSync(index, modified);
  try {
    return fn();
  } finally {
    writeFileSync(index, original);
  }
}

function newestPng(value, out = []) {
  if (typeof value === "string" && /\.png$/i.test(value)) out.push(value);
  else if (Array.isArray(value)) for (const item of value) newestPng(item, out);
  else if (value && typeof value === "object")
    for (const item of Object.values(value)) newestPng(item, out);
  return out;
}

async function cmdThumbnail(atOverride) {
  const slug = requireSlug();
  const dir = videoDir(slug);
  const at = String(atOverride ?? flags.at ?? "4");
  const outDir = path.join(dir, ".hyperframes", `thumbnail-${process.pid}-${at}`);
  ensureDir(outDir);
  info(`Capturing composition still at ${at}s without captions ...`);
  const result = withCaptionsHidden(dir, () =>
    hf(["snapshot", dir, "--at", at, "--output", outDir, "--json"], { cwd: ROOT }),
  );
  const text = `${result.stdout ?? ""}`.trim();
  const start = text.indexOf("{");
  if (start === -1) fail(`thumbnail snapshot failed\n${text}\n${result.stderr ?? ""}`);
  const data = JSON.parse(text.slice(start));
  const frames = (data.frames ?? []).filter((frame) => frame.path && frame.time != null);
  if (!frames.length) {
    const images = newestPng(data);
    if (!images.length) fail("thumbnail snapshot produced no PNG");
    frames.push({ path: images[0], time: Number(at) });
  }
  const chosen = frames.sort(
    (a, b) => Math.abs(a.time - Number(at)) - Math.abs(b.time - Number(at)),
  )[0];
  const thumb = path.join(dir, "publish/thumbnail.jpg");
  ensureDir(path.dirname(thumb));
  const convert = run("ffmpeg", [
    "-hide_banner",
    "-y",
    "-i",
    chosen.path,
    "-vf",
    "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720",
    "-q:v",
    "2",
    thumb,
  ]);
  if (convert.status !== 0) fail(`thumbnail conversion failed\n${convert.stderr ?? ""}`);
  ok(`thumbnail ${thumb} (from ${path.basename(chosen.path)} at ${chosen.time}s)`);
}

async function cmdPackage() {
  const slug = requireSlug();
  const cfg = videoConfig(slug);
  const dir = videoDir(slug);
  const loaded = loadEpisode(dir, cfg, { allowLegacy: true });
  if (!loaded) fail(`Missing episode.json and no legacy beats + STORYBOARD.md in videos/${slug}.`);
  const { episode, timeline } = loaded;
  const brief = existsSync(path.join(dir, "BRIEF.md"))
    ? readFileSync(path.join(dir, "BRIEF.md"), "utf8")
    : "";
  const sources = sourcesFrom(path.join(dir, "SOURCES.md"));
  ensureDir(path.join(dir, "publish"));
  const out = path.join(dir, "publish/youtube.md");
  writeFileSync(out, youtubeMarkdown(episode, timeline, { brief, sources, cfg }));
  writeJSON(path.join(dir, "publish/chapters.json"), timeline.chapters);

  if (flags["thumb-time"]) {
    const render = path.join(dir, "renders", `${slug}.mp4`);
    if (!existsSync(render)) fail(`Missing ${render}. Render first or drop --thumb-time.`);
    const thumb = path.join(dir, "publish/thumbnail.jpg");
    const result = run("ffmpeg", [
      "-hide_banner",
      "-y",
      "-ss",
      String(flags["thumb-time"]),
      "-i",
      render,
      "-frames:v",
      "1",
      "-vf",
      "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720",
      "-q:v",
      "2",
      thumb,
    ]);
    if (result.status !== 0) fail(`thumbnail extraction failed\n${result.stderr ?? ""}`);
    ok(`thumbnail ${thumb}`);
  } else {
    await cmdThumbnail(flags["thumb-at"] ?? "9");
  }
  for (const warning of timeline.warnings) info(`  warning: ${warning}`);
  ok(`package ${out} (${timeline.chapters.length} chapters)`);
}

async function cmdDoctor() {
  const report = hfJSON(["doctor", "--json"]);
  for (const check of report.checks ?? []) {
    info(
      `${check.ok ? "✓" : "✗"} ${check.name}: ${check.detail ?? ""}${check.fix ? ` (fix: ${check.fix})` : ""}`,
    );
  }
  const venv = path.join(process.env.HOME ?? "", ".local/share/hyperframes/tts-venv/bin/python");
  info(`${existsSync(venv) ? "✓" : "✗"} Kokoro venv: ${venv}`);
  const blender = run("blender", ["--version"]);
  info(
    `${blender.status === 0 ? "✓" : "✗"} Blender: ${(blender.stdout ?? "").split("\n")[0] || "missing"}`,
  );
  const ffmpeg = run("ffmpeg", ["-version"]);
  info(
    `${ffmpeg.status === 0 ? "✓" : "✗"} FFmpeg: ${(ffmpeg.stdout ?? "").split("\n")[0] || "missing"}`,
  );
  const videos = listVideos();
  const stale = videos.filter((v) => {
    const dir = videoDir(v.slug);
    return VIDEO_CONTEXT_FILES.some((name) => {
      const file = path.join(dir, name);
      return !existsSync(file) || readFileSync(file, "utf8") !== videoContextMarkdown(v.slug);
    });
  });
  info(
    `${stale.length ? "✗" : "✓"} Video context shims: ${
      stale.length
        ? `${stale.map((v) => v.slug).join(", ")} stale (fix: node harness/cli.mjs agents)`
        : `${videos.length} current`
    }`,
  );
  if (!report.ok)
    info("Optional items are allowed, but Chrome, FFmpeg and Node must pass before rendering.");
}

switch (command) {
  case "new":
    await cmdNew();
    break;
  case "agents":
    await cmdAgents();
    break;
  case "list":
    await cmdList();
    break;
  case "migrate":
    await cmdMigrate();
    break;
  case "compile":
    await cmdCompile();
    break;
  case "timeline":
    await cmdTimeline();
    break;
  case "otio":
    await cmdOtio();
    break;
  case "tts":
    await cmdTts();
    break;
  case "captions":
    await cmdCaptions();
    break;
  case "lint-script":
    await cmdLintScript();
    break;
  case "sync":
    await cmdSync();
    break;
  case "check":
    await cmdCheck();
    break;
  case "snapshot":
    await cmdSnapshot();
    break;
  case "render":
    await cmdRender();
    break;
  case "cloud":
    await cmdCloud();
    break;
  case "master":
    await cmdMaster();
    break;
  case "qa":
    await cmdQa();
    break;
  case "thumbnail":
    await cmdThumbnail();
    break;
  case "package":
    await cmdPackage();
    break;
  case "doctor":
    await cmdDoctor();
    break;
  case undefined:
  case "help":
  case "--help":
    printHelp();
    break;
  default:
    fail(`Unknown command "${command}". Run: node harness/cli.mjs help`);
}
