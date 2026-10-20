
const PROJECT_FORMAT = "crank-session";
const PROJECT_VERSION = "2.3.0";

export const MUSICAL_ROOTS = [
  "C", "C#", "D", "D#", "E", "F",
  "F#", "G", "G#", "A", "A#", "B",
];

export const SCALE_INTERVALS = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
};

export function createDefaultProject() {
  return {
    format: PROJECT_FORMAT,
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

    // All new channels begin empty.
    // No default beat should play when a new project opens.
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
  };
}

export function getScalePitchClasses(root = "C", mode = "minor") {
  const rootIndex = MUSICAL_ROOTS.indexOf(root);
  const intervals = SCALE_INTERVALS[mode] || SCALE_INTERVALS.minor;
  const normalizedRoot = rootIndex < 0 ? 0 : rootIndex;

  return new Set(
    intervals.map((interval) => (normalizedRoot + interval) % 12)
  );
}

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

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function readProject(file) {
  const text = await file.text();
  const data = JSON.parse(text);

  if (!data || data.format !== PROJECT_FORMAT) {
    throw new Error("This file is not a CRANK SESSION project.");
  }

  if (!Array.isArray(data.channels) || !Array.isArray(data.notes)) {
    throw new Error("Project data is incomplete.");
  }

  const defaults = createDefaultProject();

  const root = MUSICAL_ROOTS.includes(data.key?.root)
    ? data.key.root
    : defaults.key.root;

  const mode = Object.hasOwn(SCALE_INTERVALS, data.key?.mode)
    ? data.key.mode
    : defaults.key.mode;

  return {
    ...defaults,
    ...data,

    name: typeof data.name === "string"
      ? data.name
      : defaults.name,

    bpm: clampNumber(data.bpm, 40, 240, defaults.bpm),

    masterVolume: clampNumber(
      data.masterVolume,
      0,
      1,
      defaults.masterVolume
    ),

    key: { root, mode },

    filter: {
      ...defaults.filter,
      ...(data.filter || {}),
      cutoff: clampNumber(
        data.filter?.cutoff,
        20,
        20000,
        defaults.filter.cutoff
      ),
      resonance: clampNumber(
        data.filter?.resonance,
        0.1,
        20,
        defaults.filter.resonance
      ),
    },

    limiter: {
      ...defaults.limiter,
      ...(data.limiter || {}),
      inputGain: clampNumber(
        data.limiter?.inputGain,
        -24,
        12,
        defaults.limiter.inputGain
      ),
      ceiling: clampNumber(
        data.limiter?.ceiling,
        -12,
        0,
        defaults.limiter.ceiling
      ),
    },

    sections: Array.isArray(data.sections)
      ? data.sections.map((section, index) => ({
          name: String(section.name || `SECTION ${index + 1}`),
          bars: clampNumber(section.bars, 1, 32, 4),
        }))
      : defaults.sections,

    channels: data.channels.map((channel, index) => ({
      id: String(channel.id || `ch${index + 1}`),
      name: String(channel.name || `CHANNEL ${index + 1}`),
      type: channel.type || "synth",
      muted: Boolean(channel.muted),
      volume: clampNumber(channel.volume, 0, 1, 0.8),
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

    notes: data.notes
      .filter(
        (note) =>
          Number.isFinite(Number(note.pitch)) &&
          Number.isInteger(Number(note.step)) &&
          Number(note.step) >= 0 &&
          Number(note.step) < 16
      )
      .map((note, index) => ({
        ...note,
        id: String(note.id || `note-${index}-${note.pitch}-${note.step}`),
        pitch: clampNumber(note.pitch, 24, 108, 60),
        step: clampNumber(note.step, 0, 15, 0),
        length: clampNumber(note.length, 1, 16, 1),
        velocity: clampNumber(note.velocity, 0, 1, 0.8),
      })),
  };
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);

  if (!Number.isFinite(number)) return fallback;

  return Math.max(min, Math.min(max, number));
}

function safeName(name = "session") {
  return (
    String(name)
      .replace(/[^a-z0-9-_]+/gi, "-")
      .slice(0, 64) || "session"
  );
}
