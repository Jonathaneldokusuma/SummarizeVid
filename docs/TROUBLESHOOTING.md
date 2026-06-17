# Troubleshooting

Use this guide when SummarizeVid does not behave as expected.

## Vercel Does Not Show the Latest Version

Try these checks:

- Confirm the latest commit is pushed to `master`.
- Confirm the Vercel project is linked to the same GitHub repository.
- Run a manual production deploy if auto-deploy is delayed:

```bash
npx vercel --prod --yes
```

After deployment, hard refresh the site with `Ctrl + F5`.

## YouTube Captions Are Disabled

Some videos do not expose captions to YouTube transcript tools. When that happens:

- Load the video in the embedded player or open the YouTube tab.
- Click `Record Video Audio`.
- Select the YouTube tab in the browser share picker.
- Enable tab audio sharing.
- Stop recording after the lecture has finished or after enough content is captured.

The app writes the transcript first, then creates the summary after recording stops.

## Listener Is Slow

The browser listener uses a larger free Whisper model for better accuracy. First run can be slow because the model downloads in the browser.

For best results:

- Keep the tab open while the model loads.
- Use Chrome or Edge for tab-audio capture.
- Capture shorter sections if the device is low on memory.
- Wait for all chunks to finish after pressing `Stop Recording`.

## Listener Captures No Audio

The app does not use your microphone. It needs shared tab audio from the browser picker.

Check these:

- Pick the YouTube tab, not a random window without audio.
- Turn on `Share tab audio` in the browser picker.
- Make sure the video is actually playing.
- Avoid muted player audio.

## Transcript Has Weird Noise

The app cleans common ASR noise such as repeated `[SOUND]`, long repeated letters, and repeated numeric tails. If a new repeated artifact appears, add it to the cleanup rules in:

```text
index.html
api/summarize.js
```

Run checks before pushing:

```bash
npm run check
```
