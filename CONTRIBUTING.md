# Contributing

Thanks for helping improve SummarizeVid.

## Local Checks

Run the project checks before pushing:

```bash
npm run check
```

This verifies:

- `index.js` syntax
- `api/summarize.js` syntax
- the inline module script inside `index.html`

## Deployment Notes

Production deploys are handled through Vercel. After pushing to `master`, confirm the live site at:

```text
https://summarize-vid.vercel.app
```

## Transcript Quality

When improving transcription, prefer changes that:

- keep the full transcript visible before summarizing
- avoid paid API requirements
- clean obvious ASR noise without deleting real lecture content
- preserve browser tab-audio capture instead of microphone capture
