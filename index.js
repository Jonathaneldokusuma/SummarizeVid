#!/usr/bin/env node

const { getTranscripts } = require('youtube-transcript');

function parseVideoId(input) {
  if (!input) return null;

  const trimmed = String(input).trim();
  const directMatch = trimmed.match(/^[a-zA-Z0-9_-]{11}$/);
  if (directMatch) return trimmed;

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      const id = parsed.pathname.split('/').filter(Boolean)[0];
      return id || null;
    }

    if (host.endsWith('youtube.com')) {
      const videoId = parsed.searchParams.get('v');
      if (videoId) return videoId;

      const parts = parsed.pathname.split('/').filter(Boolean);
      const watchLike = parts.find((part) => /^[a-zA-Z0-9_-]{11}$/.test(part));
      return watchLike || null;
    }
  } catch {
    return directMatch ? trimmed : null;
  }

  return null;
}

function extractTranscriptText(transcript) {
  if (!transcript) return '';

  if (Array.isArray(transcript)) {
    return transcript
      .map((item) => item && (item.text || item.transcript || ''))
      .filter(Boolean)
      .join(' ');
  }

  if (typeof transcript === 'string') return transcript;
  if (typeof transcript.text === 'string') return transcript.text;

  return '';
}

async function fetchTranscript(videoInput) {
  const videoId = parseVideoId(videoInput);
  if (!videoId) {
    throw new Error('Unable to parse a valid YouTube video ID from that input.');
  }

  const transcripts = await getTranscripts(videoId);
  if (!transcripts || transcripts.length === 0) {
    throw new Error('No transcript is available for this video.');
  }

  const preferred =
    transcripts.find((t) => /^en(-|$)/i.test(t.language || t.languageCode || '')) ||
    transcripts.find((t) => (t.language || '').toLowerCase().startsWith('en')) ||
    transcripts[0];

  return extractTranscriptText(preferred.transcript || preferred.text || preferred);
}

function splitSentences(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.!?;:])/g, '$1')
    .match(/[^.!?]+[.!?]+|[^.!?]+$/g)
    ?.map((sentence) => sentence.trim())
    .filter(Boolean) || [];
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function summarizeText(text, maxSentences = 6) {
  const sentences = splitSentences(text);
  if (sentences.length <= maxSentences) {
    return sentences.join(' ');
  }

  const wordScores = new Map();
  for (const word of tokenize(text)) {
    wordScores.set(word, (wordScores.get(word) || 0) + 1);
  }

  const ranked = sentences
    .map((sentence, index) => {
      const words = tokenize(sentence);
      const score = words.reduce((total, word) => total + (wordScores.get(word) || 0), 0);
      return { index, sentence, score: score / Math.max(words.length, 1) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .sort((a, b) => a.index - b.index);

  return ranked.map((item) => item.sentence).join(' ');
}

function extractHighlights(text, limit = 5) {
  const lines = splitSentences(text);
  const keywords = [...tokenize(text)]
    .reduce((acc, word) => acc.set(word, (acc.get(word) || 0) + 1), new Map());

  return lines
    .map((sentence) => {
      const score = tokenize(sentence).reduce((total, word) => total + (keywords.get(word) || 0), 0);
      return { sentence, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.sentence);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const options = { limit: 6, json: false };
  const positionals = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--json') {
      options.json = true;
    } else if (arg === '--limit' || arg === '-l') {
      const next = Number(args[i + 1]);
      if (Number.isFinite(next) && next > 0) {
        options.limit = next;
        i += 1;
      }
    } else {
      positionals.push(arg);
    }
  }

  return { options, input: positionals[0] };
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'that', 'with', 'this', 'from', 'have', 'are', 'was', 'were',
  'been', 'you', 'your', 'but', 'not', 'can', 'will', 'would', 'could', 'should',
  'they', 'their', 'about', 'into', 'what', 'when', 'where', 'which', 'while', 'there',
  'here', 'then', 'than', 'them', 'who', 'how', 'why', 'all', 'any', 'our', 'out',
  'just', 'like', 'over', 'also', 'more', 'some', 'most', 'many', 'much', 'very',
  'one', 'two', 'three', 'because', 'these', 'those', 'such', 'its', 'it', 'as',
  'on', 'in', 'at', 'to', 'of', 'a', 'an', 'is', 'are'
]);

async function main() {
  const { options, input } = parseArgs(process.argv);
  if (!input) {
    console.error('Usage: node index.js <YouTube URL or video id> [--limit N] [--json]');
    process.exit(1);
  }

  try {
    console.log('Fetching transcript...');
    const transcript = await fetchTranscript(input);
    if (!transcript.trim()) {
      throw new Error('Transcript was empty.');
    }

    const summary = summarizeText(transcript, options.limit);
    const highlights = extractHighlights(transcript, Math.min(options.limit, 5));

    if (options.json) {
      console.log(JSON.stringify({
        summary,
        highlights,
        transcriptCharacters: transcript.length,
      }, null, 2));
    } else {
      console.log('\n=== Summary ===\n');
      console.log(summary);
      if (highlights.length) {
        console.log('\n=== Key Lines ===\n');
        for (const item of highlights) {
          console.log(`- ${item}`);
        }
      }
      console.log(`\n=== Transcript Length: ${transcript.length} characters ===`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message || error);
    process.exit(1);
  }
}

main();
