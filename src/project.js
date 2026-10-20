
const PROJECT_VERSION = "2.3.0";

export const createDefaultProject = () => ({
  format: "crank-session",
  version: PROJECT_VERSION,
  name: "Untitled Beat",
  bpm: 140,
  swing: 0,
  masterVolume: 0.85,
  selectedChannel: 0,
  activeSection: "INTRO",

  key: {
    root: "C",
    mode: "minor",
  },

  sections: [
    { name: "INTRO", bars: 4 },
    { name: "VERSE", bars: 8 },
    { name: "HOOK", bars: 8 },
    { name: "OUTRO", bars: 4 },
  ],

  // New projects must never contain a preprogrammed beat.
  channels: [
    {
      id: "ch1",
      name: "LEAD",
      type: "synth",
      muted: false,
      volume: 0.8,
      steps: [],
    },
    {
      id: "ch2",
      name: "BASS",
      type: "synth",
      muted: false,
      volume: 0.8,
      steps: [],
    },
    {
      id: "ch3",
      name: "DRUMS",
      type: "synth",
      muted: false,
      volume: 0.8,
      steps: [],
    },
    {
      id: "ch4",
      name: "PERC",
      type: "synth",
      muted: false,
      volume: 0.8,
      steps: [],
    },
  ],

  notes: [],

  filter: {
    cutoff: 420,
    resonance: 0.28,
  },

  limiter: {
    inputGain: -0.5,
    ceiling: -0.1,
  },
});

export function downloadProject(project) {
  const blob = new Blob(
    [JSON.stringify(project, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `${safeName(project.name)}.crank`;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function readProject(file) {
  const text = await file.text();
  const data = JSON.parse(text);

  if (
    !data ||
    data.format !== "crank-session"
  ) {
    throw new Error(
      "This file is not a CRANK SESSION project."
    );
  }

  if (
    !Array.isArray(data.channels) ||
    !Array.isArray(data.notes)
  ) {
    throw new Error("Project data is incomplete.");
  }

  const defaults = createDefaultProject();

  return {
    ...defaults,
    ...data,

    key: {
      ...defaults.key,
      ...(data.key || {}),
    },

    filter: {
      ...defaults.filter,
      ...(data.filter || {}),
    },

    limiter: {
      ...defaults.limiter,
      ...(data.limiter || {}),
    },

    sections: data.sections || defaults.sections,

    channels: data.channels.map((channel, index) => ({
      id: channel.id || `ch${index + 1}`,
      name: channel.name || `CHANNEL ${index + 1}`,
      type: channel.type || "synth",
      muted: Boolean(channel.muted),
      volume: Number.isFinite(Number(channel.volume))
        ? Number(channel.volume)
        : 0.8,
      steps: Array.isArray(channel.steps)
        ? [...new Set(
            channel.steps
              .map(Number)
              .filter(
                (step) =>
                  Number.isInteger(step) &&
                  step >= 0 &&
                  step < 16
              )
          )].sort((a, b) => a - b)
        : [],
    })),

    notes: data.notes.filter(
      (note) =>
        Number.isFinite(Number(note.pitch)) &&
        Number.isInteger(Number(note.step)) &&
        Number(note.step) >= 0 &&
        Number(note.step) < 16
    ),
  };
}

function safeName(name = "session") {
  return (
    String(name)
      .replace(/[^a-z0-9-_]+/gi, "-")
      .slice(0, 64) || "session"
  );
}
