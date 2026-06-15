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

function extractHighlights(text, limit = 5) {
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

    const limit = Number(req.query.limit || req.body?.limit || 6);
    const summary = summarizeText(transcript, Number.isFinite(limit) && limit > 0 ? limit : 6);
    const highlights = extractHighlights(transcript, Math.min(Number.isFinite(limit) && limit > 0 ? limit : 6, 5));

    res.status(200).json({
      video,
      summary,
      highlights,
      transcriptCharacters: transcript.length,
    });
  } catch (error) {
    const failure = formatTranscriptError(error, parseVideoId(req.query.video || req.body?.video) || 'that video');
    res.status(failure.status).json({ error: failure.message });
  }
};
