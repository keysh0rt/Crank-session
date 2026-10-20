
# CRANK SESSION

A landscape-first, touch-oriented browser music workstation.

## Stack

- React
- Vite
- Tone.js / Web Audio
- Vite PWA plugin
- GitHub Pages

## Run locally

Requires Node.js and npm.

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

## GitHub Pages

1. Push the source to the `main` branch.
2. Open Settings > Pages in the repository.
3. Set the publishing source to GitHub Actions.
4. Open the Actions tab and monitor the Deploy CRANK SESSION workflow.
5. Open the published Pages URL after the deployment succeeds.

## Current implementation scope

The current source includes a touch-oriented workspace, a built-in synth,
a Web Audio filter and limiter, a 16-step pattern editor, editable piano-roll
notes, project JSON import/export, and audio-file preview.

The following require further implementation before this should be considered
a complete DAW: full arrangement playback, track-routed sample instruments,
persistent sample-library storage, MIDI import/export, rendered WAV mixdowns
and stems, complete filter ADSR/LFO controls, and calibrated LUFS/true-peak
analysis and limiter gain-reduction metering.

Native desktop VST plugin binaries are not supported directly by a standard
browser PWA.
