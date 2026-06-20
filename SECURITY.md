# Security Policy

## Supported Version

Security fixes are applied to the latest version on the `master` branch and the production deployment at:

```text
https://summarize-vid.vercel.app
```

## Privacy Model

SummarizeVid is designed to keep the free listener workflow in the browser:

- tab audio is selected through the browser share picker
- the listener does not request microphone access
- browser transcription uses a free Whisper model loaded in the page
- no paid transcription API key is required for the listener flow
- transcript text stays in the page unless the user copies or submits it elsewhere

YouTube caption requests are handled by the Vercel API route in `api/summarize.js`.

## Secrets

Do not commit:

- Vercel tokens
- GitHub tokens
- private API keys
- `.env` files containing credentials
- local `.vercel` project metadata

Use Vercel environment variables for any future server-side secrets.

## Reporting a Vulnerability

Please report security issues privately to the repository owner instead of opening a public issue with exploit details.

Include:

- a short description of the issue
- steps to reproduce it
- affected browser or deployment URL
- expected and actual behavior
- screenshots or logs with secrets removed

## Safe Contributions

Before pushing security-related changes, run:

```bash
npm run check
```

Avoid changes that silently enable microphone capture, upload recorded audio, or expose transcript text without clear user action.
