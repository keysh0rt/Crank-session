
import * as Tone from "tone";

let initialized = false;
let synth;
let filter;
let limiter;
let inputGain;
let master;
let analyser;
let meterTimer;

export async function initAudio() {
  if (initialized) {
    if (Tone.context.state !== "running") {
      await Tone.start();
    }
    return;
  }

  await Tone.start();

  filter = new Tone.Filter({
    type: "lowpass",
    frequency: 420,
    Q: 0.28
  });

  inputGain = new Tone.Gain(Tone.dbToGain(-0.5));
  limiter = new Tone.Limiter(-0.1);
  master = new Tone.Gain(0.85);
  analyser = new Tone.Meter({ normalRange: false });

  synth = new Tone.PolySynth(Tone.Synth, {
    maxPolyphony: 32,
    options: {
      oscillator: { type: "sawtooth" },
      envelope: {
        attack: 0.01,
        decay: 0.15,
        sustain: 0.65,
        release: 0.35
      }
    }
  });

  synth.connect(filter);
  filter.connect(inputGain);
  inputGain.connect(limiter);
  limiter.connect(master);
  master.connect(analyser);
  analyser.toDestination();

  initialized = true;
}

export function getAudioState() {
  return {
    initialized,
    contextState: Tone.context.state,
    filterFrequency: filter?.frequency.value ?? 420,
    resonance: filter?.Q.value ?? 0.28,
    inputGainDb: -0.5,
    limiterCeiling: limiter?.threshold.value ?? -0.1
  };
}

export function playNote(note, duration = "8n", velocity = 0.8) {
  if (!initialized || Tone.context.state !== "running") return;

  synth.triggerAttackRelease(
    note,
    duration,
    Tone.now(),
    Math.max(0.01, Math.min(1, velocity))
  );
}

export function setFilterFrequency(value) {
  if (filter) {
    filter.frequency.rampTo(
      Math.max(20, Math.min(20000, Number(value))),
      0.03
    );
  }
}

export function setResonance(value) {
  if (filter) {
    filter.Q.rampTo(Math.max(0.1, Math.min(20, Number(value))), 0.03);
  }
}

export function setMasterVolume(value) {
  if (master) {
    master.gain.rampTo(Math.max(0, Math.min(1, Number(value))), 0.03);
  }
}

export function setInputGainDb(value) {
  if (inputGain) {
    inputGain.gain.rampTo(Tone.dbToGain(Number(value)), 0.03);
  }
}

export function setLimiterCeiling(value) {
  if (limiter) {
    limiter.threshold.rampTo(Number(value), 0.03);
  }
}

export function getMeterLevel() {
  if (!analyser || !initialized) return null;
  return analyser.getValue();
}

export function stopAudio() {
  if (synth) synth.releaseAll();
  if (meterTimer) {
    clearInterval(meterTimer);
    meterTimer = undefined;
  }
}

export async function shutdownAudio() {
  stopAudio();
  if (initialized) {
    await Tone.getTransport().stop();
    await Tone.getTransport().cancel();
    await Tone.getContext().close();
  }
  initialized = false;
}

