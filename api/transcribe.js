function withJson(res, status, payload) {
  res.status(status).json(payload);
}

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return withJson(res, 405, { error: 'Method not allowed.' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return withJson(res, 500, { error: 'OPENAI_API_KEY is not configured on the server.' });
    }

    const { audioBase64, mimeType, language } = req.body || {};
    if (!audioBase64) {
      return withJson(res, 400, { error: 'Missing audio data.' });
    }

    const buffer = Buffer.from(audioBase64, 'base64');
    if (!buffer.length) {
      return withJson(res, 400, { error: 'Audio recording was empty.' });
    }

    const audioFile = new File([buffer], 'tab-audio.webm', { type: mimeType || 'audio/webm' });
    const form = new FormData();
    form.append('file', audioFile);
    form.append('model', 'whisper-1');
    if (language) {
      form.append('language', language);
    }

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: form,
    });

    const data = await response.json();
    if (!response.ok) {
      return withJson(res, response.status, { error: data.error?.message || 'Transcription failed.' });
    }

    return withJson(res, 200, { text: data.text || '' });
  } catch (error) {
    return withJson(res, 500, { error: error.message || 'Failed to transcribe audio.' });
  }
};
