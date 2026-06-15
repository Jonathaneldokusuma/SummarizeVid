# SummarizeVid

A Node.js CLI that pulls a YouTube transcript and turns it into a concise extractive summary.

## What it supports

- Public videos
- Listed videos
- Direct video IDs
- Standard YouTube URLs and `youtu.be` links

## What it cannot do

- Videos without an accessible transcript or captions
- Private videos you do not have permission to access

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

## Output

- `Summary`: the most informative sentences from the transcript
- `Key Lines`: a short list of high-signal transcript lines
- `Transcript Length`: size of the extracted transcript text

## Notes

- English transcripts are preferred when available
- If YouTube does not expose captions for a video, the tool will stop with a clear error
