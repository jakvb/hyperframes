import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chapterTime, ensureDir, fail, info, readJSON, writeJSON } from "./lib.mjs";

const HOSTS_START = "<!-- episode:hosts:start -->";
const HOSTS_END = "<!-- episode:hosts:end -->";

function oneLine(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function unquote(value) {
  let text = oneLine(value).replace(/\\+"/g, '"');
  text = text.replace(/^"+|"+$/g, "");
  return text;
}

function mdCell(value) {
  return oneLine(value).replaceAll("|", "\\|");
}

function attr(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");
}

function num(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round(value, places = 3) {
  const factor = 10 ** places;
  return Math.round((num(value) + Number.EPSILON) * factor) / factor;
}

function secondsLabel(value) {
  return `${round(value, 2).toFixed(2)}s`;
}

export function episodeFile(dir) {
  return path.join(dir, "episode.json");
}

export function readEpisode(dir) {
  return readJSON(episodeFile(dir));
}

export function validateEpisode(episode) {
  const errors = [];
  if (!episode || typeof episode !== "object") {
    return ["episode.json must be an object"];
  }
  if (!Array.isArray(episode.beats) || episode.beats.length === 0) {
    errors.push("episode.json needs at least one beat");
    return errors;
  }
  const beatIds = new Set();
  const shotIds = new Set();
  for (const [beatIndex, beat] of episode.beats.entries()) {
    if (!beat || typeof beat !== "object") {
      errors.push(`beats[${beatIndex}] must be an object`);
      continue;
    }
    if (!beat.id || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(beat.id)) {
      errors.push(`beats[${beatIndex}].id must be a lowercase slug`);
    } else if (beatIds.has(beat.id)) {
      errors.push(`duplicate beat id "${beat.id}"`);
    } else {
      beatIds.add(beat.id);
    }
    const shots =
      Array.isArray(beat.shots) && beat.shots.length
        ? beat.shots
        : [{ id: beat.id, src: beat.src, seconds: beat.seconds }];
    for (const [shotIndex, shot] of shots.entries()) {
      if (!shot || typeof shot !== "object") {
        errors.push(`${beat.id}: shots[${shotIndex}] must be an object`);
        continue;
      }
      if (!shot.id) {
        errors.push(`${beat.id}: shots[${shotIndex}] needs an id`);
      } else if (shotIds.has(shot.id)) {
        errors.push(`duplicate shot id "${shot.id}"`);
      } else {
        shotIds.add(shot.id);
      }
      if (!shot.src) {
        errors.push(`${beat.id}/${shot.id ?? shotIndex}: needs src`);
      }
      if (shot.seconds != null && num(shot.seconds) < 0) {
        errors.push(`${beat.id}/${shot.id ?? shotIndex}: seconds must be >= 0`);
      }
    }
  }
  return errors;
}

/**
 * Turn episode.json + assets/voice/timing.json into an absolute timeline.
 * One beat owns one narration file and one audio clip. One or more shots split
 * the beat's picture time; unspecified shot durations absorb the remainder.
 */
export function buildTimeline(episode, timing, cfg = {}) {
  const errors = validateEpisode(episode);
  if (errors.length) throw new Error(errors.join("\n"));

  const tail = num(episode.tailSeconds ?? cfg.tailSeconds, 0.3);
  const timingMap = new Map((timing?.beats ?? []).map((beat) => [beat.id, num(beat.seconds, 0)]));
  const warnings = [];
  let cursor = 0;
  const beats = [];
  const allShots = [];

  for (const beat of episode.beats) {
    const audioSeconds = timingMap.has(beat.id)
      ? timingMap.get(beat.id)
      : num(beat.audioSeconds, 0);
    const rawShots = (
      Array.isArray(beat.shots) && beat.shots.length
        ? beat.shots
        : [{ id: beat.id, src: beat.src, seconds: beat.seconds }]
    ).map((shot, index) => ({
      ...shot,
      id: shot.id ?? `${beat.id}-${index + 1}`,
    }));

    const specified = rawShots.map((shot) => num(shot.seconds, 0));
    const specifiedSum = specified.reduce((sum, value) => sum + value, 0);
    let beatDuration;

    if (audioSeconds > 0) {
      beatDuration = audioSeconds + tail;
      if (specifiedSum > beatDuration + 0.05) {
        const scale = beatDuration / specifiedSum;
        for (let i = 0; i < rawShots.length; i++) {
          if (specified[i] > 0) rawShots[i].seconds = specified[i] * scale;
        }
        warnings.push(`${beat.id}: scaled shot timings by ${scale.toFixed(4)} to match narration`);
      } else {
        const unknown = specified.filter((value) => value === 0).length;
        if (unknown > 0) {
          const each = (beatDuration - specifiedSum) / unknown;
          for (let i = 0; i < rawShots.length; i++) {
            if (specified[i] === 0) rawShots[i].seconds = each;
          }
        } else if (specifiedSum < beatDuration - 0.05) {
          rawShots[rawShots.length - 1].seconds =
            num(rawShots[rawShots.length - 1].seconds, 0) + (beatDuration - specifiedSum);
          warnings.push(
            `${beat.id}: added ${(beatDuration - specifiedSum).toFixed(3)}s tail to the last shot`,
          );
        }
      }
    } else {
      if (specifiedSum <= 0) {
        throw new Error(
          `${beat.id}: no narration duration and no shot seconds. Run tts or set shot.seconds.`,
        );
      }
      beatDuration = specifiedSum;
    }

    let shotCursor = cursor;
    const shots = rawShots.map((shot) => {
      const duration = num(shot.seconds, 0);
      const start = shotCursor;
      shotCursor += duration;
      const out = {
        ...shot,
        beatId: beat.id,
        start: round(start),
        duration: round(duration),
        end: round(start + duration),
        hostId: shot.hostId ?? `scene-${shot.id}`,
        compositionId: shot.compositionId ?? shot.id,
        trackIndex: num(shot.trackIndex, 1),
      };
      allShots.push(out);
      return out;
    });

    const outBeat = {
      id: beat.id,
      title: beat.title ?? beat.id,
      start: round(cursor),
      duration: round(beatDuration),
      end: round(cursor + beatDuration),
      audioStart: round(cursor),
      audioDuration: round(audioSeconds),
      audio: beat.audio ?? `assets/voice/${beat.id}.wav`,
      claims: Array.isArray(beat.claims) ? beat.claims : [],
      shots,
    };
    beats.push(outBeat);
    cursor += beatDuration;
  }

  const total = round(cursor);
  const { chapters, warnings: chapterWarnings } = buildChapters(episode, beats, total);
  warnings.push(...chapterWarnings);

  return {
    version: 1,
    slug: episode.slug ?? cfg.slug ?? null,
    title: episode.title ?? cfg.title ?? null,
    fps: num(episode.fps ?? cfg.fps, 30),
    width: num(episode.width ?? cfg.width, 1920),
    height: num(episode.height ?? cfg.height, 1080),
    tailSeconds: tail,
    duration: total,
    beats,
    shots: allShots,
    chapters,
    warnings,
    generatedAt: new Date().toISOString(),
  };
}

function chapterRange(chapter, beats) {
  const byId = new Map(beats.map((beat) => [beat.id, beat]));
  if (typeof chapter === "string") {
    const beat = byId.get(chapter);
    return beat
      ? { title: beat.title, start: beat.start, duration: beat.duration, beats: [beat.id] }
      : null;
  }
  if (!chapter || typeof chapter !== "object") return null;
  if (chapter.start != null) {
    return {
      title: chapter.title ?? "Chapter",
      start: num(chapter.start),
      duration: num(chapter.duration, 0),
      beats: Array.isArray(chapter.beats) ? chapter.beats : [],
    };
  }
  const ids = Array.isArray(chapter.beats) ? chapter.beats : chapter.beat ? [chapter.beat] : [];
  const selected = ids.map((id) => byId.get(id)).filter(Boolean);
  if (!selected.length) return null;
  const start = Math.min(...selected.map((beat) => beat.start));
  const end = Math.max(...selected.map((beat) => beat.end));
  return {
    title: chapter.title ?? selected.map((beat) => beat.title).join(" / "),
    start,
    duration: end - start,
    beats: selected.map((beat) => beat.id),
  };
}

function buildChapters(episode, beats, total) {
  const warnings = [];
  let chapters = [];
  if (Array.isArray(episode.chapters) && episode.chapters.length) {
    chapters = episode.chapters.map((chapter) => chapterRange(chapter, beats)).filter(Boolean);
  } else {
    let current = null;
    for (const beat of beats) {
      if (!current) {
        current = { title: beat.title, start: beat.start, duration: 0, beats: [] };
      } else {
        current.title = `${current.title} / ${beat.title}`;
      }
      current.duration += beat.duration;
      current.beats.push(beat.id);
      if (current.duration >= 10) {
        chapters.push(current);
        current = null;
      }
    }
    if (current) {
      if (chapters.length) {
        const last = chapters[chapters.length - 1];
        last.duration += current.duration;
        last.beats.push(...current.beats);
      } else {
        chapters.push(current);
      }
    }
  }

  // YouTube requires >= 10 s per chapter; merge short chapters backwards.
  const merged = [];
  for (const chapter of chapters) {
    if (merged.length && chapter.duration < 10) {
      const previous = merged[merged.length - 1];
      previous.duration += chapter.duration;
      previous.beats.push(...chapter.beats);
      previous.title = `${previous.title} / ${chapter.title}`;
    } else {
      merged.push({ ...chapter });
    }
  }
  if (merged.length > 1 && merged[merged.length - 1].duration < 10) {
    const last = merged.pop();
    const previous = merged[merged.length - 1];
    previous.duration += last.duration;
    previous.beats.push(...last.beats);
    previous.title = `${previous.title} / ${last.title}`;
  }

  if (merged.length < 3)
    warnings.push(`only ${merged.length} chapter(s); YouTube needs at least 3`);
  if (merged.length && Math.abs(merged[0].start) > 0.01)
    warnings.push("first chapter does not start at 0");
  for (const chapter of merged) {
    if (chapter.duration < 10)
      warnings.push(
        `chapter "${chapter.title}" is ${chapter.duration.toFixed(2)}s, expected >= 10s`,
      );
  }
  if (
    merged.length &&
    total - (merged[merged.length - 1].start + merged[merged.length - 1].duration) > 1
  ) {
    warnings.push("chapters do not cover the end of the film");
  }

  return {
    chapters: merged.map((chapter, index) => ({
      ...chapter,
      index: index + 1,
      start: round(chapter.start),
      duration: round(chapter.duration),
      end: round(chapter.start + chapter.duration),
    })),
    warnings,
  };
}

export function parseClaims(dir) {
  const file = path.join(dir, "SOURCES.md");
  if (!existsSync(file)) return new Map();
  const lines = readFileSync(file, "utf8").replace(/\r/g, "").split("\n");
  const claims = new Map();
  for (const line of lines) {
    if (!line.trim().startsWith("|")) continue;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length < 2) continue;
    const id = cells[0];
    if (!/^C\d+$/i.test(id)) continue;
    if (/^C\d+$/i.test(cells[1])) continue;
    claims.set(id, {
      id,
      claim: cells[1] ?? "",
      value: cells[2] ?? "",
      source: cells[3] ?? "",
      treatment: cells[4] ?? "",
    });
  }
  return claims;
}

export function parseScriptClaims(dir) {
  const file = path.join(dir, "SCRIPT.md");
  if (!existsSync(file)) return new Map();
  const lines = readFileSync(file, "utf8").replace(/\r/g, "").split("\n");
  const out = new Map();
  let columns = null;
  for (const line of lines) {
    if (!line.trim().startsWith("|")) continue;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (!columns) {
      if (cells.some((cell) => /^beat$/i.test(cell))) {
        columns = cells.map((cell) => cell.toLowerCase());
      }
      continue;
    }
    if (cells.every((cell) => /^:?-{3,}/.test(cell))) continue;
    const row = {};
    for (let i = 0; i < columns.length; i++) row[columns[i]] = cells[i] ?? "";
    const id = row.beat ?? row.id;
    if (!id) continue;
    const raw = row.claims ?? row.claim ?? "";
    out.set(
      id,
      raw
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    );
  }
  return out;
}

export function numericClaims(text) {
  const matches = String(text ?? "").match(/\b\d[\d,.]*\b/g) ?? [];
  return [...new Set(matches.map((value) => value.replace(/[.,]$/, "")))];
}

export function parseWords(file) {
  const data = readJSON(file);
  if (!data) return [];
  let words = [];
  if (Array.isArray(data)) words = data;
  else if (Array.isArray(data.words)) words = data.words;
  else if (Array.isArray(data.segments)) {
    for (const segment of data.segments) {
      if (Array.isArray(segment.words)) words.push(...segment.words);
      else if (segment.text != null) words.push(segment);
    }
  }
  return words
    .map((word) => ({
      text: oneLine(word.text ?? word.word ?? ""),
      start: num(word.start ?? word.start_time ?? word.from, 0),
      end: num(word.end ?? word.end_time ?? word.to, 0),
    }))
    .filter((word) => word.text && word.end > word.start)
    .sort((a, b) => a.start - b.start);
}

export function wrapText(text, width = 42) {
  const words = oneLine(text).split(" ").filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    if (!line) line = word;
    else if (`${line} ${word}`.length <= width) line += ` ${word}`;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function cueText(words) {
  return words
    .map((word) => word.text)
    .join(" ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function groupWords(words, offset = 0, options = {}) {
  const maxChars = num(options.maxChars, 84);
  const maxLines = num(options.maxLines, 2);
  const maxDuration = num(options.maxDuration, 6);
  const maxCps = num(options.maxCps, 20);
  const maxGap = num(options.maxGap, 0.35);
  const maxWords = num(options.maxWords, 7);
  const cues = [];
  let current = [];

  const flush = () => {
    if (!current.length) return;
    const text = cueText(current);
    const start = offset + current[0].start;
    let end = offset + current[current.length - 1].end;
    if (end - start < 0.2) end = start + 0.2;
    cues.push({
      start: round(start),
      end: round(end),
      text: wrapText(text).slice(0, maxLines).join("\n"),
      words: current.map((word) => ({
        ...word,
        start: round(offset + word.start),
        end: round(offset + word.end),
      })),
    });
    current = [];
  };

  for (const word of words) {
    if (current.length) {
      const candidate = [...current, word];
      const text = cueText(candidate);
      const duration = candidate[candidate.length - 1].end - candidate[0].start;
      const lines = wrapText(text);
      const gap = word.start - current[current.length - 1].end;
      const sentence = /[.!?]$/.test(current[current.length - 1].text);
      const tooFast = duration > 0.15 && text.length / duration > maxCps && current.length >= 2;
      if (
        lines.length > maxLines ||
        text.length > maxChars ||
        duration > maxDuration ||
        gap > maxGap ||
        sentence ||
        current.length >= maxWords ||
        tooFast
      ) {
        flush();
      }
    }
    current.push(word);
  }
  flush();
  return cues;
}

export function normalizeTokens(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function wordErrorRate(reference, hypothesis) {
  const ref = normalizeTokens(reference);
  const hyp = normalizeTokens(hypothesis);
  if (!ref.length) return hyp.length ? 1 : 0;
  const rows = ref.length + 1;
  const cols = hyp.length + 1;
  const dp = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let i = 0; i < rows; i++) dp[i][0] = i;
  for (let j = 0; j < cols; j++) dp[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = ref[i - 1] === hyp[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[ref.length][hyp.length] / ref.length;
}

function existingFrame(existingBoard, shot, index) {
  const frames = existingBoard?.frames ?? [];
  return frames.find((frame) => frame.src && frame.src === shot.src) ?? frames[index] ?? null;
}

export function storyboardMarkdown(episode, timeline, existingBoard = null) {
  const frontmatter = [
    "---",
    `format: ${timeline.width}x${timeline.height}`,
    `duration: ${secondsLabel(timeline.duration)}`,
    `message: ${JSON.stringify(oneLine(episode.message ?? existingBoard?.frontmatter?.message ?? episode.title ?? ""))}`,
    `arc: ${oneLine(episode.arc ?? existingBoard?.frontmatter?.arc ?? "Question -> Context -> Mechanism -> Evidence -> Complication -> Payoff -> Implication")}`,
    `audience: ${JSON.stringify(oneLine(episode.audience ?? existingBoard?.frontmatter?.audience ?? ""))}`,
    `mode: ${oneLine(episode.mode ?? existingBoard?.frontmatter?.mode ?? "collaborative")}`,
    "---",
    "",
  ];
  const beatById = new Map(timeline.beats.map((beat) => [beat.id, beat]));
  const lines = [...frontmatter];

  for (const [index, shot] of timeline.shots.entries()) {
    const existing = existingFrame(existingBoard, shot, index);
    const beat = beatById.get(shot.beatId);
    const title = oneLine(shot.title ?? existing?.title ?? shot.id);
    const voiceover = unquote(shot.voiceover ?? beat?.voiceover ?? existing?.voiceover ?? "");
    const scene = oneLine(shot.scene ?? existing?.scene ?? title);
    const reads = unquote(shot.reads ?? existing?.meta?.reads ?? "");
    const sound = unquote(shot.sound ?? existing?.meta?.sound ?? "");
    const status = oneLine(shot.status ?? existing?.meta?.status ?? "built");
    const poster = shot.poster ?? existing?.meta?.poster ?? null;
    const transition = oneLine(shot.transition_in ?? existing?.transition ?? "cut");
    lines.push(`## Frame ${index + 1} — ${title}`, "");
    lines.push(`- scene: ${scene}`);
    lines.push(`- duration: ${secondsLabel(shot.duration)}`);
    if (poster != null && poster !== "") lines.push(`- poster: ${poster}`);
    lines.push(`- transition_in: ${transition}`);
    lines.push(`- status: ${status}`);
    lines.push(`- beat: ${shot.beatId}`);
    lines.push(`- shot: ${shot.id}`);
    if (voiceover) lines.push(`- voiceover: "${voiceover}"`);
    if (reads) lines.push(`- reads: "${reads}"`);
    if (sound) lines.push(`- sound: "${sound}"`);
    lines.push(`- src: ${shot.src}`);
    lines.push("");
    const narrative = oneLine(shot.narrative ?? existing?.narrative ?? "");
    if (narrative) lines.push(narrative, "");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

export function scriptMarkdown(episode, timeline, brief = "") {
  const promise = oneLine(
    episode.promise ?? brief.match(/-\s+\*\*Promise\*\*:\s*(.+)/)?.[1] ?? episode.title ?? "",
  );
  const thesis = oneLine(
    episode.thesis ?? brief.match(/-\s+\*\*One-sentence thesis\*\*[^:]*:\s*(.+)/)?.[1] ?? "",
  );
  const lines = [
    `# Script - ${episode.title ?? timeline.title ?? timeline.slug ?? "Untitled"}`,
    "",
    `Target: ${chapterTime(timeline.duration)} at 155 wpm. Thesis: ${thesis || "(not set)"}`,
    "",
    "| beat | target | narration file | visual job | viewer reads | claims |",
    "|---|---|---|---|---|---|",
  ];
  for (const beat of timeline.beats) {
    const visual = beat.shots
      .map((shot) => oneLine(shot.title ?? shot.scene ?? shot.id))
      .join(" / ");
    const reads = beat.shots
      .map((shot) => oneLine(shot.reads ?? ""))
      .filter(Boolean)
      .join(" / ");
    const claims = beat.claims?.length ? beat.claims.join(", ") : "—";
    lines.push(
      `| ${mdCell(beat.id)} | ${chapterTime(beat.start)}-${chapterTime(beat.end)} | ${mdCell(`beats/${beat.id}.txt`)} | ${mdCell(visual)} | ${mdCell(reads)} | ${mdCell(claims)} |`,
    );
  }
  lines.push(
    "",
    "## Read-aloud pass",
    "",
    "- [ ] Every sentence is speakable in one breath.",
    "- [ ] No sentence repeats the on-screen text word for word.",
    "- [ ] Every number has a unit and a comparison.",
    "- [ ] No claim outside `SOURCES.md`.",
    "- [ ] First 15 seconds contain the question, the stakes and a concrete image.",
    "- [ ] Last line is the thesis, not a recap.",
    "- [ ] Word count is within 10% of the target.",
    "",
    promise ? `Promise: ${promise}` : "",
    "",
  );
  return `${lines.join("\n").trimEnd()}\n`;
}

export function youtubeMarkdown(episode, timeline, options = {}) {
  const youtube = episode.youtube ?? {};
  const titleOptions =
    Array.isArray(youtube.titleOptions) && youtube.titleOptions.length
      ? youtube.titleOptions
      : [episode.title ?? timeline.title ?? "Untitled"];
  const promise = oneLine(
    youtube.description ??
      episode.promise ??
      options.brief?.match(/-\s+\*\*Promise\*\*:\s*(.+)/)?.[1] ??
      "",
  );
  const sources = Array.isArray(options.sources) ? options.sources : [];
  const credits = Array.isArray(youtube.credits)
    ? youtube.credits
    : [`Narration: ${episode.voice ?? options.cfg?.voice ?? "af_heart"}`];
  const tags = Array.isArray(youtube.tags) ? youtube.tags : [];
  const hashtags = Array.isArray(youtube.hashtags) ? youtube.hashtags : [];
  const lines = [
    `# ${episode.title ?? timeline.title ?? titleOptions[0]}`,
    "",
    "## Title options",
    ...titleOptions.map((title) => `- ${title}`),
    "",
    "## Description",
    "",
    promise || "Add the promise from BRIEF.md.",
    "",
    "Sources:",
    ...(sources.length ? sources.map((url) => `- ${url}`) : ["- (add sources from SOURCES.md)"]),
    "",
    "Chapters:",
    ...timeline.chapters.map((chapter) => `${chapterTime(chapter.start)} ${chapter.title}`),
    "",
    "Credits:",
    ...credits.map((credit) => `- ${credit}`),
    "",
    "## Tags",
    "",
    tags.length ? tags.join(", ") : "(5-10 tags, 3 hashtags)",
    "",
    "## Hashtags",
    "",
    hashtags.length ? hashtags.join(" ") : "(3 hashtags max)",
    "",
    "## Thumbnail",
    "",
    oneLine(
      youtube.thumbnail ?? "1280x720, <2 MB, 3-4 words, one focal object, readable at 320x180.",
    ),
    "",
    "## End screen",
    "",
    oneLine(
      youtube.endScreen ??
        "Last 20 s; no critical information; one next-video slot and one subscribe slot.",
    ),
    "",
  ];
  return `${lines.join("\n").trimEnd()}\n`;
}

export function hostBlock(episode, timeline) {
  const lines = [];
  for (const shot of timeline.shots) {
    lines.push(
      `    <div id="${attr(shot.hostId)}" class="scene-host" data-composition-id="${attr(shot.compositionId)}" data-composition-src="${attr(shot.src)}" data-start="${shot.start.toFixed(3)}" data-duration="${shot.duration.toFixed(3)}" data-track-index="${shot.trackIndex}" data-track-kind="graphics" data-width="${timeline.width}" data-height="${timeline.height}"></div>`,
    );
  }
  lines.push(
    `    <div id="captions-host" class="scene-host" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="${timeline.duration.toFixed(3)}" data-track-index="99" data-track-kind="captions" data-width="${timeline.width}" data-height="${timeline.height}"></div>`,
  );
  for (const beat of timeline.beats) {
    if (beat.audioDuration <= 0) continue;
    lines.push(
      `    <audio id="vo-${attr(beat.id)}" data-start="${beat.audioStart.toFixed(3)}" data-duration="${beat.audioDuration.toFixed(3)}" data-track-index="0" src="${attr(beat.audio)}"></audio>`,
    );
  }
  return lines.join("\n");
}

export function ensureHostMarkers(html) {
  let out = html.split(HOSTS_START).join("").split(HOSTS_END).join("");
  const root = out.match(/<div[^>]*id="root"[^>]*>/);
  if (!root) return out;
  const rootEnd = root.index + root[0].length;
  const script = out.indexOf("<script", rootEnd);
  const rootClose = out.lastIndexOf("</div>", script !== -1 ? script : out.length);
  if (rootClose === -1) return out;

  let content = out.slice(rootEnd, rootClose);
  // Remove every previously generated episode host and voice clip. Leave the
  // grain, music bed and any other authored overlays in place.
  content = content.replace(/<div[^>]*class="[^"]*scene-host[^"]*"[^>]*>[\s\S]*?<\/div>/g, "");
  content = content.replace(/<audio[^>]*id="vo-[^"]*"[^>]*>[\s\S]*?<\/audio>/g, "");
  content = content.replace(
    /<h1[^>]*id="title"[^>]*class="[^"]*clip[^"]*"[^>]*>[\s\S]*?<\/h1>/g,
    "",
  );
  content = content
    .replace(/^[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();

  return `${out.slice(0, rootEnd)}
    ${HOSTS_START}
    ${HOSTS_END}
${content ? `\n${content}\n` : "\n"}  ${out.slice(rootClose)}`;
}

export function updateIndexHtml(html, episode, timeline) {
  let out = ensureHostMarkers(html);
  const start = out.indexOf(HOSTS_START);
  const end = out.indexOf(HOSTS_END);
  if (start === -1 || end === -1) {
    return {
      html: out,
      warning:
        "no episode host markers in index.html (add <!-- episode:hosts:start --> and <!-- episode:hosts:end -->)",
    };
  }
  out =
    out.slice(0, start + HOSTS_START.length) +
    "\n" +
    hostBlock(episode, timeline) +
    "\n    " +
    out.slice(end);
  out = out.replace(
    /(<div[^>]*id="root"[^>]*?)data-duration="[^"]*"/,
    `$1data-duration="${timeline.duration.toFixed(3)}"`,
  );
  return { html: out, warning: null };
}

export function writeCompiled(dir, episode, timeline, options = {}) {
  const withMarkdown = options.markdown !== false;
  const withHtml = options.html !== false;
  const existingBoard = options.existingBoard ?? null;
  const brief =
    options.brief ??
    (existsSync(path.join(dir, "BRIEF.md"))
      ? readFileSync(path.join(dir, "BRIEF.md"), "utf8")
      : "");
  const sources = options.sources ?? [];
  const cfg = options.cfg ?? readJSON(path.join(dir, "video.json"), {});

  ensureDir(path.join(dir, "assets"));
  ensureDir(path.join(dir, "publish"));
  writeJSON(path.join(dir, "assets/timeline.json"), timeline);

  if (withMarkdown) {
    ensureDir(path.join(dir, "assets"));
    writeFileSync(
      path.join(dir, "STORYBOARD.md"),
      storyboardMarkdown(episode, timeline, existingBoard),
    );
    writeFileSync(path.join(dir, "SCRIPT.md"), scriptMarkdown(episode, timeline, brief));
    writeFileSync(
      path.join(dir, "publish/youtube.md"),
      youtubeMarkdown(episode, timeline, { brief, sources, cfg }),
    );
  }

  if (withHtml && existsSync(path.join(dir, "index.html"))) {
    const original = readFileSync(path.join(dir, "index.html"), "utf8");
    const { html, warning } = updateIndexHtml(original, episode, timeline);
    writeFileSync(path.join(dir, "index.html"), html);
    if (warning) info(`  warning: ${warning}`);
  }

  writeJSON(path.join(dir, "publish/chapters.json"), timeline.chapters);
  const cfgFile = path.join(dir, "video.json");
  if (existsSync(cfgFile)) {
    writeJSON(cfgFile, {
      ...cfg,
      duration: timeline.duration,
      fps: timeline.fps,
      width: timeline.width,
      height: timeline.height,
      tailSeconds: timeline.tailSeconds,
    });
  }
  return { timeline };
}

export function groupWordsForBeat(words, offset, beatDuration) {
  const cues = groupWords(words, offset);
  return cues
    .map((cue) => ({
      ...cue,
      start: Math.max(0, Math.min(cue.start, offset + beatDuration)),
      end: Math.max(cue.start + 0.2, Math.min(cue.end, offset + beatDuration)),
      text: cue.text.trim(),
    }))
    .filter((cue) => cue.end > cue.start);
}

export function hostMapFromHtml(html) {
  const map = new Map();
  const regex = /<div[^>]*class="[^"]*scene-host[^"]*"[^>]*>/g;
  for (const match of html.matchAll(regex)) {
    const tag = match[0];
    const src = tag.match(/data-composition-src="([^"]+)"/)?.[1];
    if (!src) continue;
    map.set(src, {
      tag,
      id: tag.match(/\bid="([^"]+)"/)?.[1] ?? null,
      compositionId: tag.match(/data-composition-id="([^"]+)"/)?.[1] ?? null,
    });
  }
  return map;
}

export function timelineToOtio(timeline) {
  const rate = timeline.fps;
  const rt = (value) => ({
    OTIO_SCHEMA: "RationalTime.1",
    rate,
    value: Math.round(value * rate),
  });
  const range = (duration) => ({
    OTIO_SCHEMA: "TimeRange.1",
    start_time: rt(0),
    duration: rt(duration),
  });
  const video = {
    OTIO_SCHEMA: "Track.1",
    name: "V1",
    kind: "Video",
    metadata: {},
    children: timeline.shots.map((shot) => ({
      OTIO_SCHEMA: "Clip.1",
      name: shot.id,
      source_range: range(shot.duration),
      media_reference: {
        OTIO_SCHEMA: "ExternalReference.1",
        target_url: shot.src,
        available_range: null,
        metadata: {},
      },
      metadata: {
        hyperframes: {
          shotId: shot.id,
          beatId: shot.beatId,
          hostId: shot.hostId,
          start: shot.start,
          duration: shot.duration,
        },
      },
    })),
  };
  const audio = {
    OTIO_SCHEMA: "Track.1",
    name: "A1",
    kind: "Audio",
    metadata: {},
    children: timeline.beats
      .filter((beat) => beat.audioDuration > 0)
      .map((beat) => ({
        OTIO_SCHEMA: "Clip.1",
        name: beat.id,
        source_range: range(beat.audioDuration),
        media_reference: {
          OTIO_SCHEMA: "ExternalReference.1",
          target_url: beat.audio,
          available_range: null,
          metadata: {},
        },
        metadata: {
          hyperframes: {
            beatId: beat.id,
            start: beat.audioStart,
            duration: beat.audioDuration,
          },
        },
      })),
  };
  return {
    OTIO_SCHEMA: "Timeline.1",
    name: timeline.title ?? timeline.slug ?? "timeline",
    global_start_time: null,
    metadata: {
      hyperframes: {
        slug: timeline.slug,
        fps: timeline.fps,
        width: timeline.width,
        height: timeline.height,
        duration: timeline.duration,
        chapters: timeline.chapters,
      },
    },
    tracks: {
      OTIO_SCHEMA: "Stack.1",
      name: "tracks",
      metadata: {},
      children: [video, audio],
    },
  };
}

export function failOnEpisodeErrors(errors) {
  if (errors.length) fail(`episode.json invalid:\n- ${errors.join("\n- ")}`);
}
