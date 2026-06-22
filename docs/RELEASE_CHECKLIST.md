# Release Checklist

Use this checklist before publishing a SummarizeVid update.

## 1. Review Changes

- Confirm the requested behavior is complete.
- Keep unrelated user changes untouched.
- Check that listener changes still use shared tab audio, not microphone input.
- Confirm long transcripts remain visible before the summary is generated.

## 2. Run Local Checks

```bash
npm run check
```

The command must pass checks for:

- `index.js`
- `api/summarize.js`
- the module script in `index.html`

## 3. Inspect Git State

```bash
git status --short
git diff --stat
```

Verify only intended files are staged.

## 4. Commit and Push

Use the GitHub-linked author email configured for this repository.

```bash
git push origin master
```

Confirm remote `master` points to the new commit.

## 5. Deploy Production

For UI or API changes, deploy the linked Vercel project:

```bash
npx vercel --prod --yes
```

Documentation-only changes do not require a production deploy.

## 6. Verify Live Site

Open:

```text
https://summarize-vid.vercel.app
```

Confirm the production page contains the expected new behavior. Use a hard refresh if the browser has cached an older deployment.

## 7. Final Status

```bash
git status --short
```

The working tree should be clean after the release is complete.
