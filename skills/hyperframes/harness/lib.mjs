import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = path.resolve(HERE, "..");

// The harness ships both inside a workspace (harness/ beside videos/) and inside the
// hyperframes skill (harness/ beside templates/). AHF_ROOT pins the episode workspace;
// otherwise use the directory that owns this harness when it is a workspace, else cwd.
export const ROOT = process.env.AHF_ROOT
  ? path.resolve(process.env.AHF_ROOT)
  : existsSync(path.join(SKILL_ROOT, "videos"))
    ? SKILL_ROOT
    : process.cwd();
export const VIDEOS = path.join(ROOT, "videos");
export const TEMPLATES = existsSync(path.join(SKILL_ROOT, "templates"))
  ? path.join(SKILL_ROOT, "templates")
  : path.join(ROOT, "templates");
export const HF_VERSION = "0.8.200";
export const TTS_VENV = path.join(
  process.env.HOME ?? "",
  ".local/share/hyperframes/tts-venv/bin/python",
);

export function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

export function readJSON(file, fallback = null) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

export function writeJSON(file, value) {
  ensureDir(path.dirname(file));
  writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}

export function assertSlug(slug) {
  if (!slug || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(slug)) {
    fail(`Invalid slug "${slug ?? ""}". Use lowercase letters, digits and hyphens.`);
  }
  return slug;
}

export function videoDir(slug) {
  return path.join(VIDEOS, assertSlug(slug));
}

export function videoConfig(slug) {
  const file = path.join(videoDir(slug), "video.json");
  if (!existsSync(file)) fail(`No video at videos/${slug}. Run: node harness/cli.mjs new ${slug}`);
  return readJSON(file);
}

export function hfEnv(extra = {}) {
  const env = { ...process.env, ...extra };
  if (existsSync(TTS_VENV)) env.HYPERFRAMES_PYTHON = TTS_VENV;
  env.HYPERFRAMES_SKIP_SKILLS = "1";
  return env;
}

export function run(cmd, args = [], opts = {}) {
  const result = spawnSync(cmd, args, {
    cwd: opts.cwd ?? ROOT,
    env: opts.env ?? hfEnv(),
    encoding: "utf8",
    stdio: opts.inherit ? "inherit" : "pipe",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  return result;
}

export function runOrThrow(cmd, args = [], opts = {}) {
  const result = run(cmd, args, opts);
  if (result.status !== 0) {
    const detail = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
    throw new Error(`${cmd} ${args.join(" ")} failed (${result.status})\n${detail}`);
  }
  return result;
}

export function hf(args, opts = {}) {
  return run("npx", ["--yes", `hyperframes@${HF_VERSION}`, ...args], opts);
}

export function hfOrThrow(args, opts = {}) {
  return runOrThrow("npx", ["--yes", `hyperframes@${HF_VERSION}`, ...args], opts);
}

export function hfJSON(args, opts = {}) {
  const result = hf(args, opts);
  const text = `${result.stdout ?? ""}`.trim();
  const start = text.indexOf("{");
  if (start === -1) {
    if (result.status !== 0) return { ok: false, error: text || result.stderr };
    fail(`Expected JSON from: hyperframes ${args.join(" ")}\n${text}`);
  }
  try {
    return JSON.parse(text.slice(start));
  } catch {
    return { ok: false, error: text };
  }
}

export function ffprobe(file) {
  const result = run("ffprobe", [
    "-v",
    "error",
    "-show_streams",
    "-show_format",
    "-of",
    "json",
    file,
  ]);
  if (result.status !== 0) return null;
  return JSON.parse(result.stdout);
}

export function probeSummary(file) {
  const data = ffprobe(file);
  if (!data) return null;
  const video = data.streams?.find((s) => s.codec_type === "video");
  const audio = data.streams?.find((s) => s.codec_type === "audio");
  return {
    file,
    duration: Number(data.format?.duration ?? 0),
    size: Number(data.format?.size ?? 0),
    video: video
      ? {
          codec: video.codec_name,
          profile: video.profile,
          width: video.width,
          height: video.height,
          pixFmt: video.pix_fmt,
          fps: parseRate(video.avg_frame_rate ?? video.r_frame_rate),
        }
      : null,
    audio: audio
      ? {
          codec: audio.codec_name,
          sampleRate: Number(audio.sample_rate),
          channels: audio.channels,
          bitRate: Number(audio.bit_rate ?? 0),
        }
      : null,
  };
}

function parseRate(rate) {
  if (!rate) return 0;
  const [a, b] = rate.split("/").map(Number);
  return b ? a / b : a;
}

export function loudness(file) {
  const result = run("ffmpeg", [
    "-hide_banner",
    "-nostats",
    "-i",
    file,
    "-af",
    "loudnorm=print_format=json",
    "-f",
    "null",
    "-",
  ]);
  const text = `${result.stderr ?? ""}`;
  const start = text.lastIndexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    const data = JSON.parse(text.slice(start, end + 1));
    return {
      integrated: Number(data.input_i),
      truePeak: Number(data.input_tp),
      lra: Number(data.input_lra),
      threshold: Number(data.input_thresh),
    };
  } catch {
    return null;
  }
}

export function rootDuration(indexHtml) {
  const text = readFileSync(indexHtml, "utf8");
  const root = text.match(/data-composition-id="[^"]+"[\s\S]{0,600}?data-duration="([\d.]+)"/);
  if (root) return Number(root[1]);
  const any = text.match(/data-duration="([\d.]+)"/);
  return any ? Number(any[1]) : null;
}

export function parseStoryboard(file) {
  const text = readFileSync(file, "utf8");
  const frontmatter = {};
  const fm = text.match(/^---\n([\s\S]*?)\n---/);
  if (fm) {
    for (const line of fm[1].split("\n")) {
      const m = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
      if (m) frontmatter[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  const parts = text.split(/^##\s+(?:Frame|Beat|Scene)\s+(\d+)\s*[—\-:]\s*(.*)$/gm);
  const frames = [];
  for (let i = 1; i < parts.length; i += 3) {
    const number = Number(parts[i]);
    const title = parts[i + 1].trim();
    const body = parts[i + 2] ?? "";
    const meta = {};
    for (const line of body.split("\n")) {
      const m = line.match(/^\s*-\s+([a-zA-Z_]+):\s*(.*)$/);
      if (m) meta[m[1]] = m[2].trim();
    }
    const durationMatch = (meta.duration ?? "").match(/([\d.]+)/);
    const narrative = body
      .split("\n")
      .filter((line) => !/^\s*-\s+[a-zA-Z_]+:/.test(line))
      .join("\n")
      .trim();
    frames.push({
      number,
      title,
      duration: durationMatch ? Number(durationMatch[1]) : null,
      src: meta.src ?? null,
      scene: meta.scene ?? null,
      voiceover: meta.voiceover ?? null,
      narration: meta.voiceover ?? null,
      narrative,
      transition: meta.transition_in ?? meta.transition ?? null,
      meta,
    });
  }
  return { frontmatter, frames };
}

export function beatFiles(dir) {
  const beatsDir = path.join(dir, "beats");
  if (!existsSync(beatsDir)) return [];
  return readdirSync(beatsDir)
    .filter((f) => f.endsWith(".txt"))
    .sort()
    .map((f) => ({ id: path.basename(f, ".txt"), file: path.join(beatsDir, f) }));
}

export function parseSrt(text) {
  const cues = [];
  const blocks = text
    .replace(/\r/g, "")
    .trim()
    .split(/\n{2,}/);
  for (const block of blocks) {
    const lines = block.split("\n");
    if (lines.length < 3) continue;
    const time = lines[1].match(
      /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/,
    );
    if (!time) continue;
    const toSec = (h, m, s, ms) =>
      Number(h) * 3600 + Number(m) * 60 + Number(s) + Number(ms) / 1000;
    cues.push({
      start: toSec(time[1], time[2], time[3], time[4]),
      end: toSec(time[5], time[6], time[7], time[8]),
      text: lines.slice(2).join("\n"),
    });
  }
  return cues;
}

export function srtTime(seconds) {
  const clamped = Math.max(0, seconds);
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = Math.floor(clamped % 60);
  const ms = Math.round((clamped - Math.floor(clamped)) * 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

export function toSrt(cues) {
  return cues
    .map(
      (cue, i) => `${i + 1}\n${srtTime(cue.start)} --> ${srtTime(cue.end)}\n${cue.text.trim()}\n`,
    )
    .join("\n");
}

export function chapterTime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

export function info(message) {
  console.log(message);
}

export function ok(message) {
  console.log(`✓ ${message}`);
}

export const VIDEO_CONTEXT_MARKER = "<!-- ahyper-frames:video-context v1 -->";
export const VIDEO_CONTEXT_FILES = ["AGENTS.md", "CLAUDE.md"];

export function videoContextMarkdown(slug) {
  return `${VIDEO_CONTEXT_MARKER}
# ahyper-frames episode: ${slug}

This folder is one episode of the **ahyper-frames** workspace. Process is defined in
[\`../../AGENTS.md\`](../../AGENTS.md). **Read that file first and follow it**; it is authoritative for
everything except the episode-local additions below. If this file disagrees with the workspace file or
with a skill, the workspace file and the skill win.

## Read in this order, every session

1. \`../../AGENTS.md\` - workspace rules 1-13: truth ledger, \`episode.json\`, the gate, the audit trail.
2. \`/hyperframes\` - the render contract and work loop; then
   \`/hyperframes/references/episode.md\` for the deep-dive pipeline: through-line question,
   narrative arc, narration timing, captions, audio, QA gates and YouTube packaging. **Always**,
   before planning, scripting or rendering.
3. \`/hyperframes-cli\` for commands, \`/hyperframes-registry\` before hand-building a named visual,
   \`/media-use\` for voice, music, footage.
4. \`/humanizer\` before writing any prose.

## Episode-local hard rules

- \`episode.json\` is the machine source of truth: beats own narration and claims, shots own picture
  time. Edit it, then \`node ../../harness/cli.mjs compile ${slug}\`. Never hand-edit generated durations.
- \`BRIEF.md\` and \`SOURCES.md\` are filled before the script; every factual claim carries a claim id
  or a \`derivation\` label.
- Gate after every structural change: \`compile\` -> \`check\` -> \`snapshot --review\`, then render.
- \`node ../../harness/cli.mjs qa ${slug}\` must pass before upload.
- Deterministic compositions only: no \`Date.now()\`, no unseeded \`Math.random()\`, no network fetches.
- One through-line question and one visual world that changes; a deep dive runs question -> old
  picture -> crack -> rebuild -> test -> consequence, with a real low and a real high. No bullet
  slides, no three cards.
- The look is a decision: replace the neutral \`frame.md\` (\`LOOK-NOT-CHOSEN\`) from the subject's
  medium before compile; compile and lint fail until it is chosen.

## HyperFrames essentials (full contract in \`/hyperframes\`)

- Every timed element needs \`data-start\` plus a duration; timed visual elements take \`class="clip"\`.
- Register one paused root timeline per composition on \`window.__timelines\`; scene timelines added to
  that root are not paused.
- Run \`npm run check\`, then look at \`npx hyperframes snapshot --at <seconds>\` before replying.

## This file

Generated by \`node harness/cli.mjs new\` / \`agents\`; do not hand-edit.
\`npx hyperframes catch-up\` leaves it alone (it only rewrites files titled
"# HyperFrames Composition Project").
`;
}

export function writeVideoContext(dir, slug) {
  const markdown = videoContextMarkdown(slug);
  const written = [];
  for (const name of VIDEO_CONTEXT_FILES) {
    const file = path.join(dir, name);
    if (existsSync(file) && readFileSync(file, "utf8") === markdown) continue;
    writeFileSync(file, markdown);
    written.push(name);
  }
  return written;
}

export function listVideos() {
  if (!existsSync(VIDEOS)) return [];
  return readdirSync(VIDEOS, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(path.join(VIDEOS, d.name, "video.json")))
    .map((d) => ({ slug: d.name, ...readJSON(path.join(VIDEOS, d.name, "video.json"), {}) }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
}
