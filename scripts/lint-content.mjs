#!/usr/bin/env node
/**
 * Validate content JSON files against the canonical schema
 * (docs/content-schema.md) BEFORE importing. Friendly per-question
 * messages, no network, no deps.
 *
 * Usage:
 *   node scripts/lint-content.mjs [file.json ...]   (default: every JSON file under content/)
 */
import { readFile } from "node:fs/promises";
import { statSync, readdirSync } from "node:fs";
import { join, extname } from "node:path";

const QTYPES = ["mcq", "fill-blank", "word-form", "cloze", "transformation", "writing"];
const SECTIONS = ["phonetics", "lexico-grammar", "word-formation", "cloze", "reading", "writing", "listening"];
const CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"];
const SOURCE_TYPES = ["official", "community", "ai"];

const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : walk(join(process.cwd(), "content"));

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (extname(p) === ".json") out.push(p);
  }
  return out;
}

const errors = [];
const warnings = [];
let questionsSeen = 0;

function err(file, where, msg) {
  errors.push(`${file}: [error] ${where}: ${msg}`);
}
function warn(file, where, msg) {
  warnings.push(`${file}: [warn] ${where}: ${msg}`);
}

function checkQuestion(file, q, i) {
  const where = `questions[${i}] (${q.qtype ?? "?"})`;
  if (!q || typeof q !== "object") {
    err(file, `questions[${i}]`, "not an object");
    return;
  }
  if (!QTYPES.includes(q.qtype)) {
    err(file, where, `unknown qtype "${q.qtype}" — use one of: ${QTYPES.join(", ")}`);
    return;
  }
  if (!SECTIONS.includes(q.section)) {
    err(file, where, `unknown section "${q.section}" — use one of: ${SECTIONS.join(", ")}`);
    return;
  }
  if (!q.prompt || typeof q.prompt !== "string" || !q.prompt.trim()) {
    err(file, where, "prompt is empty");
  }
  if (!CEFR.includes(q.difficulty)) {
    err(file, where, `unknown difficulty "${q.difficulty}" — use one of: ${CEFR.join(", ")}`);
  }
  if (q.qtype === "mcq") {
    if (!Array.isArray(q.options) || q.options.length < 2) {
      err(file, where, "mcq needs options[] with at least 2 entries");
    } else {
      const opts = q.options.map((o) => String(o));
      if (opts.some((o) => !o.trim())) err(file, where, "mcq options[] contains an empty entry");
      if (new Set(opts).size !== opts.length) err(file, where, "mcq options[] contains duplicates");
      if (typeof q.answer === "string" && !/^[A-Z]$/.test(q.answer)) {
        err(file, where, `answer "${q.answer}" must be an option letter (A–Z)`);
      } else if (q.answer && q.answer.charCodeAt(0) - 65 >= opts.length) {
        err(file, where, `answer "${q.answer}" out of range — only ${opts.length} options`);
      }
    }
  } else if (Array.isArray(q.options) && q.options.length > 0) {
    warn(file, where, `${q.qtype} should omit options[] (only mcq and cloze use them)`);
  }
  if (!q.answer || typeof q.answer !== "string") {
    err(file, where, "answer is missing");
  }
  for (const field of ["acceptedVariants", "tags", "keyWords"]) {
    const v = q[field];
    if (v !== undefined && (!Array.isArray(v) || v.some((x) => typeof x !== "string"))) {
      err(file, where, `${field} must be an array of strings`);
    }
  }
  if (["fill-blank", "word-form", "transformation"].includes(q.qtype) && !q.acceptedVariants?.length) {
    warn(file, where, "acceptedVariants empty — HSG keys accept multiple forms; list alternates");
  }
  if (q.audio !== undefined && q.audio !== null && !String(q.audio).startsWith("/audio/")) {
    err(file, where, `audio "${q.audio}" must start with /audio/ (file lives in apps/web/public/audio/)`);
  }
  if (q.section !== "listening" && q.audio) {
    warn(file, where, `audio set on a ${q.section} question — audio is intended for listening questions`);
  }
  if (q.section === "listening" && !q.audio) {
    warn(file, where, "listening question without audio — fine to key first, add the clip later");
  }
  const known = new Set(["qtype", "section", "prompt", "options", "answer", "acceptedVariants", "tags", "keyWords", "audio", "difficulty", "rubricRef"]);
  for (const key of Object.keys(q)) {
    if (!known.has(key)) warn(file, where, `unknown field "${key}" (typo?)`);
  }
}

for (const file of files) {
  let data;
  try {
    data = JSON.parse(await readFile(file, "utf8"));
  } catch (e) {
    err(file, "(file)", `unreadable or invalid JSON: ${e.message}`);
    continue;
  }
  const src = data.source;
  if (!src || typeof src !== "object") {
    err(file, "source", "missing source object (type, name required)");
  } else {
    if (!SOURCE_TYPES.includes(src.type)) {
      err(file, "source", `unknown source.type "${src.type}" — use one of: ${SOURCE_TYPES.join(", ")}`);
    }
    if (!src.name || typeof src.name !== "string") err(file, "source", "source.name is required");
  }
  if (!Array.isArray(data.questions) || data.questions.length === 0) {
    err(file, "questions", "questions[] is empty or missing");
    continue;
  }
  data.questions.forEach((q, i) => checkQuestion(file, q, i));
  questionsSeen += data.questions.length;
}

for (const e of errors) console.error(e);
for (const w of warnings) console.warn(w);
console.log(
  `\n${files.length} file(s), ${questionsSeen} question(s): ${errors.length} error(s), ${warnings.length} warning(s)`,
);
process.exit(errors.length > 0 ? 1 : 0);