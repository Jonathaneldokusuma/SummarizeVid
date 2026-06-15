const {
  fetchTranscript: fetchYoutubeTranscript,
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptNotAvailableLanguageError,
  YoutubeTranscriptTooManyRequestError,
  YoutubeTranscriptVideoUnavailableError,
} = require('youtube-transcript');

function parseVideoId(input) {
  if (!input) return null;

  const trimmed = String(input).trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      return parsed.pathname.split('/').filter(Boolean)[0] || null;
    }

    if (host.endsWith('youtube.com')) {
      const videoId = parsed.searchParams.get('v');
      if (videoId) return videoId;

      const parts = parsed.pathname.split('/').filter(Boolean);
      return parts.find((part) => /^[a-zA-Z0-9_-]{11}$/.test(part)) || null;
    }
  } catch {
    return null;
  }

  return null;
}

function extractTranscriptText(transcript) {
  if (!transcript) return '';
  if (Array.isArray(transcript)) {
    return transcript.map((item) => item?.text || '').filter(Boolean).join(' ');
  }
  if (typeof transcript === 'string') return transcript;
  if (typeof transcript.text === 'string') return transcript.text;
  return '';
}

const TRANSCRIPT_FIXES = [
  [/\bAno\s*W?\.?\s+Purbo\b/gi, 'Onno W. Purbo'],
  [/\bThangranxlatan\b/gi, 'Tangerang Selatan'],
  [/\bInstitute of Technology in Tangerang Selatan\b/gi, 'Institute of Technology Tangerang Selatan'],
  [/\bJonathan Postel'?s Surface Award\b/gi, 'Jonathan B. Postel Service Award'],
  [/\bGenautte AI\b/gi, 'generative AI'],
  [/\bGenautte\b/gi, 'generative'],
  [/\bmulti[-\s]?modial\b/gi, 'multimodal'],
  [/\bresponse space on user meet\b/gi, 'responses based on user needs'],
  [/\bhelps adapts responses\b/gi, 'helps adapt responses'],
  [/\bfour different process\b/gi, 'four different processes'],
  [/\bAI too may\b/gi, 'AI tools may'],
  [/\buser datai is\b/gi, 'user data. AI is'],
  [/\bAI\s+and\s+considering\s+through\s+the\s+years\b/gi, 'AI and machine learning through the years'],
];

function cleanTranscriptText(text) {
  let cleaned = String(text || '')
    .replace(/\[(S|INAUDIBLE|MUSIC|APPLAUSE|BLANK_AUDIO|SILENCE|NOISE)\]/gi, ' ')
    .replace(/&gt;&gt;|>>/g, ' ')
    .replace(/\((the|un|or the other)\)/gi, ' ')
    .replace(/\*+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([.!?]){2,}/g, '$1')
    .replace(/,\s*\./g, '.')
    .replace(/\s+/g, ' ')
    .trim();

  for (const [pattern, replacement] of TRANSCRIPT_FIXES) {
    cleaned = cleaned.replace(pattern, replacement);
  }

  return cleaned
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([.!?]){2,}/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitSentences(text) {
  return text
    .replace(/\s+/g, ' ')
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
  if (sentences.length <= maxSentences) return sentences.join(' ');

  const wordScores = new Map();
  for (const word of tokenize(text)) {
    wordScores.set(word, (wordScores.get(word) || 0) + 1);
  }

  return sentences
    .map((sentence, index) => {
      const words = tokenize(sentence);
      const score = words.reduce((total, word) => total + (wordScores.get(word) || 0), 0);
      return { index, sentence, score: score / Math.max(words.length, 1) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .sort((a, b) => a.index - b.index)
    .map((item) => item.sentence)
    .join(' ');
}

function extractHighlights(text, limit = 12) {
  const sentences = splitSentences(text);
  const counts = [...tokenize(text)].reduce((acc, word) => acc.set(word, (acc.get(word) || 0) + 1), new Map());

  return sentences
    .map((sentence) => ({
      sentence,
      score: tokenize(sentence).reduce((total, word) => total + (counts.get(word) || 0), 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.sentence);
}

async function fetchTranscript(videoInput) {
  const videoId = parseVideoId(videoInput);
  if (!videoId) throw new Error('Invalid YouTube URL or video ID.');

  const transcript = await fetchYoutubeTranscript(videoId);
  return extractTranscriptText(transcript);
}

function formatTranscriptError(error, videoId) {
  if (
    error instanceof YoutubeTranscriptDisabledError ||
    /disabled on this video/i.test(error.message || '')
  ) {
    return {
      status: 422,
      message: `Transcript is disabled for video ${videoId}. Try another public or listed video that has captions enabled.`,
    };
  }

  if (
    error instanceof YoutubeTranscriptNotAvailableError ||
    error instanceof YoutubeTranscriptNotAvailableLanguageError ||
    error instanceof YoutubeTranscriptVideoUnavailableError ||
    /not available/i.test(error.message || '') ||
    /video unavailable/i.test(error.message || '')
  ) {
    return {
      status: 422,
      message: `Transcript is not available for video ${videoId}.`,
    };
  }

  if (
    error instanceof YoutubeTranscriptTooManyRequestError ||
    /too many request/i.test(error.message || '')
  ) {
    return {
      status: 429,
      message: 'Transcript service rate limit reached. Please try again in a moment.',
    };
  }

  return {
    status: 500,
    message: error.message || 'Failed to summarize video.',
  };
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

module.exports = async (req, res) => {
  try {
    const video = req.method === 'GET' ? req.query.video : req.body?.video;
    if (!video) {
      res.status(400).json({ error: 'Missing video parameter.' });
      return;
    }

    const transcript = await fetchTranscript(video);
    if (!transcript.trim()) {
      throw new Error('Transcript is empty.');
    }

    const requestedLimit = Number(req.query.limit || req.body?.limit || 16);
    const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : 16;
    const cleanTranscript = cleanTranscriptText(transcript);
    const summary = summarizeText(cleanTranscript, limit);
    const highlights = extractHighlights(cleanTranscript, Math.min(limit, 12));

    res.status(200).json({
      video,
      summary,
      highlights,
      transcript: cleanTranscript,
      transcriptCharacters: cleanTranscript.length,
    });
  } catch (error) {
    const failure = formatTranscriptError(error, parseVideoId(req.query.video || req.body?.video) || 'that video');
    res.status(failure.status).json({ error: failure.message });
  }
};
