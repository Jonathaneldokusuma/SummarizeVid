# SummarizeVid

A YouTube summary app with a Vercel API route, browser dashboard, command-line fallback, and a free browser listener for videos without captions.

## What it supports

- Public videos
- Listed videos
- Direct video IDs
- Standard YouTube URLs and `youtu.be` links

## What it cannot do

- Private videos you do not have permission to access
- Automatically capture video audio without the browser share prompt
- Guarantee perfect speech recognition on noisy audio, heavy accents, or unclear speakers

## Install

```bash
npm install
```

## Usage

```bash
node index.js "https://www.youtube.com/watch?v=VIDEO_ID"
```

Options:

```bash
node index.js "VIDEO_ID" --limit 8
node index.js "https://youtu.be/VIDEO_ID" --json
```

## Quality Check

```bash
npm run check
```

The GitHub Actions workflow runs the same check on pushes and pull requests.

## Troubleshooting

Common listener, transcript, and deployment fixes are documented in `docs/TROUBLESHOOTING.md`.

## Output

- `Summary`: a longer extractive brief with up to 28 selected sentences
- `Key Lines`: up to 18 high-signal transcript lines
- `Full Transcript`: the cleaned transcript returned from captions or browser audio capture
- `Transcript Length`: size of the extracted transcript text
- Common ASR cleanup: removes audio markers, fixes spacing, and normalizes a small glossary of frequent misheard terms
- Clipboard actions: paste transcript text, copy the full summary output, select all output, and clear panels

## Notes

- English transcripts are preferred when available
- If YouTube does not expose captions for a video, use the web UI's shared tab audio listener
- Free fallback: record shared tab audio and transcribe it in the browser, or paste transcript text manually
- Listener mode writes transcript chunks first, then creates the summary after you stop recording
- Long transcript mode keeps the full text in the transcript panel and summarizes after capture
- No paid transcription service or API key is required for the basic flow
- The browser downloads a free Whisper model the first time tab-audio transcription runs
- Tab audio capture uses the browser's screen/tab picker; select the YouTube tab or this tab and enable audio sharing
