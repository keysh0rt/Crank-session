
export const createDefaultProject = () => ({
  format: "crank-session",
  version: "2.2.0",
  name: "Untitled Session",
  bpm: 140,
  swing: 0,
  masterVolume: 0.85,
  selectedChannel: 0,
  activeSection: "INTRO",
  sections: [
    { name: "INTRO", bars: 4 },
    { name: "VERSE", bars: 8 },
    { name: "HOOK", bars: 8 },
    { name: "OUTRO", bars: 4 }
  ],
  channels: [
    { id: "ch1", name: "LEAD", type: "synth", muted: false, volume: 0.8, steps: [0, 4, 8, 12] },
    { id: "ch2", name: "BASS", type: "synth", muted: false, volume: 0.8, steps: [0, 6, 8, 14] },
    { id: "ch3", name: "DRUMS", type: "synth", muted: false, volume: 0.8, steps: [0, 4, 8, 12] },
    { id: "ch4", name: "PERC", type: "synth", muted: false, volume: 0.8, steps: [2, 6, 10, 14] }
  ],
  notes: [
    { id: "n1", pitch: 60, step: 0, length: 2, velocity: 0.85 },
    { id: "n2", pitch: 63, step: 4, length: 2, velocity: 0.8 },
    { id: "n3", pitch: 67, step: 8, length: 2, velocity: 0.8 },
    { id: "n4", pitch: 70, step: 12, length: 2, velocity: 0.8 }
  ],
  filter: { cutoff: 420, resonance: 0.28 },
  limiter: { inputGain: -0.5, ceiling: -0.1 }
});

export function downloadProject(project) {
  const blob = new Blob(
    [JSON.stringify(project, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeName(project.name)}.crank`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function readProject(file) {
  const text = await file.text();
  const data = JSON.parse(text);

  if (data.format !== "crank-session") {
    throw new Error("This file is not a CRANK SESSION project.");
  }

  if (!Array.isArray(data.channels) || !Array.isArray(data.notes)) {
    throw new Error("Project data is incomplete.");
  }

  return data;
}

function safeName(name = "session") {
  return String(name).replace(/[^a-z0-9-_]+/gi, "-").slice(0, 64) || "session";
}

