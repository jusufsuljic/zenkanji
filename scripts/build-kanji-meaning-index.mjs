import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const KANJI_API_BASE_URL = 'https://kanjiapi.dev/v1';
const OUTPUT_PATH = resolve(process.cwd(), 'public/data/kanji-meaning-index.v1.json');
const CONCURRENCY = 32;
const MAX_RETRIES = 2;

const sleep = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));

const fetchJson = async (path, retries = MAX_RETRIES) => {
  try {
    const response = await fetch(`${KANJI_API_BASE_URL}${path}`);
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status} for ${path}`);
    }

    return await response.json();
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }

    await sleep(300);
    return fetchJson(path, retries - 1);
  }
};

const buildEntry = (detail) => {
  const meanings = Array.isArray(detail.meanings)
    ? [...new Set(detail.meanings.map((meaning) => meaning?.trim()).filter(Boolean))]
    : [];

  const heisig = typeof detail.heisig_en === 'string' ? detail.heisig_en.trim() : '';

  return {
    c: detail.kanji,
    m: meanings,
    ...(heisig && !meanings.includes(heisig) ? { h: heisig } : {}),
    ...(typeof detail.jlpt === 'number' ? { j: detail.jlpt } : {}),
    ...(typeof detail.grade === 'number' ? { g: detail.grade } : {}),
  };
};

const run = async () => {
  const characters = await fetchJson('/kanji/all');
  if (!Array.isArray(characters) || characters.length === 0) {
    throw new Error('Failed to load kanji list from KanjiAPI');
  }

  const results = new Array(characters.length);
  let nextIndex = 0;
  let completed = 0;

  const worker = async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;

      if (index >= characters.length) {
        return;
      }

      const character = characters[index];
      try {
        const detail = await fetchJson(`/kanji/${encodeURIComponent(character)}`);
        results[index] = buildEntry(detail);
      } catch (error) {
        console.error(`[kanji-index] Failed to fetch ${character}:`, error instanceof Error ? error.message : error);
      }

      completed += 1;
      if (completed % 500 === 0 || completed === characters.length) {
        console.log(`[kanji-index] ${completed}/${characters.length}`);
      }
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  const filteredResults = results.filter((entry) => entry?.c && (entry.m?.length || entry.h));

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(filteredResults));

  console.log(`[kanji-index] Wrote ${filteredResults.length} entries to ${OUTPUT_PATH}`);
};

run().catch((error) => {
  console.error('[kanji-index] Build failed:', error);
  process.exitCode = 1;
});
