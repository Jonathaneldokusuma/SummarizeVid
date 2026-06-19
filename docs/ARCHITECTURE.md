# Architecture

SummarizeVid has three main paths: captions, browser listener, and manual transcript text.

## Web Dashboard

`index.html` owns the browser experience:

- loads the YouTube preview player
- records shared tab audio when captions are not available
- transcribes audio in the browser with a free Whisper model
- cleans transcript noise and common ASR artifacts
- writes the full transcript first
- creates the summary only after recording stops
- provides clipboard actions for copying and pasting long text

## Captions API

`api/summarize.js` runs on Vercel and handles caption-based summaries:

- parses standard YouTube URLs, short links, and video IDs
- fetches YouTube captions with `youtube-transcript`
- cleans transcript text with the same style of cleanup rules as the browser
- ranks sentences extractively
- returns summary, highlights, transcript text, and transcript length

## Browser Listener Flow

The listener does not use the microphone.

The flow is:

1. User clicks `Record Video Audio`.
2. Browser asks the user to share a tab or screen.
3. User selects the YouTube tab and enables tab audio.
4. The app captures tab audio in chunks.
5. Each chunk is transcribed and appended to the transcript box.
6. When the user stops recording, the app summarizes the full transcript once.

This keeps the transcript understandable while recording and avoids constant summary rewrites.

## Cleanup Layer

The cleanup layer removes obvious transcription noise:

- repeated `[SOUND]` markers
- repeated long letters
- repeated numeric tails
- placeholder audio tags
- common lecture-specific ASR mistakes

Cleanup should stay conservative. It should remove noise, not rewrite the speaker's meaning.

## Quality Checks

Run:

```bash
npm run check
```

This validates:

- CLI syntax
- Vercel API syntax
- inline browser module syntax in `index.html`

GitHub Actions runs the same check on pushes and pull requests.
