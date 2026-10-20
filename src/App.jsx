
import React, { useEffect, useRef, useState } from "react";
import * as Tone from "tone";
import {
  Play, Square, Plus, Download, Upload, Music2, SlidersHorizontal,
  AudioLines, Piano, Layers3, Volume2, FolderOpen, CircleHelp
} from "lucide-react";
import {
  initAudio, playNote, stopAudio, setFilterFrequency, setResonance,
  setMasterVolume, setInputGainDb, setLimiterCeiling, getMeterLevel
} from "./audio.js";
import { createDefaultProject, downloadProject, readProject } from "./project.js";

const TABS = [
  ["PIANO ROLL", Piano],
  ["SONG", Layers3],
  ["CHANNELS", AudioLines],
  ["FILTER", SlidersHorizontal],
  ["LIMITER", Volume2],
  ["SOUNDS", Music2],
  ["MIXER", SlidersHorizontal],
  ["BEATS", AudioLines]
];

const PITCHES = [
  ["C5", 72], ["B4", 71], ["A#4", 70], ["A4", 69],
  ["G#4", 68], ["G4", 67], ["F#4", 66], ["F4", 65],
  ["E4", 64], ["D#4", 63], ["D4", 62], ["C#4", 61],
  ["C4", 60], ["B3", 59], ["A#3", 58], ["A3", 57],
  ["G#3", 56], ["G3", 55], ["F#3", 54], ["F3", 53],
  ["E3", 52], ["D#3", 51], ["D3", 50], ["C#3", 49],
  ["C3", 48]
];

const NOTES_IN_C_MINOR = new Set([0, 2, 3, 5, 7, 8, 10]);
const noteName = (midi) => Tone.Frequency(midi, "midi").toNote();

export default function App() {
  const [project, setProject] = useState(createDefaultProject);
  const [tab, setTab] = useState("PIANO ROLL");
  const [playing, setPlaying] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [step, setStep] = useState(-1);
  const [message, setMessage] = useState("Ready");
  const [meter, setMeter] = useState(-60);
  const [samples, setSamples] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const fileRef = useRef(null);
  const sampleRef = useRef(null);
  const tickRef = useRef(null);
  const meterRef = useRef(null);
  const samplePlayers = useRef([]);

  useEffect(() => {
    return () => {
      Tone.getTransport().stop();
      Tone.getTransport().cancel();
      stopAudio();
      samplePlayers.current.forEach((player) => {
        try { player.dispose(); } catch {}
      });
      if (meterRef.current) clearInterval(meterRef.current);
    };
  }, []);

  const updateProject = (fn) => setProject((old) => fn(structuredClone(old)));

  async function ensureAudio() {
    await initAudio();
    setAudioReady(true);
  }

  async function togglePlay() {
    if (playing) {
      Tone.getTransport().stop();
      Tone.getTransport().cancel();
      stopAudio();
      setPlaying(false);
      setStep(-1);
      setMessage("Stopped");
      return;
    }

    try {
      await ensureAudio();
      const transport = Tone.getTransport();
      transport.stop();
      transport.cancel();
      transport.bpm.value = project.bpm;
      transport.position = 0;

      let currentStep = 0;
      const totalSteps = 16;

      transport.scheduleRepeat((time) => {
        const stepNow = currentStep % totalSteps;
        const liveProject = projectRef.current;
        liveProject.channels.forEach((channel, channelIndex) => {
          if (channel.muted || !channel.steps.includes(stepNow)) return;

          const midi = [36, 48, 60, 72][channelIndex % 4];
          const duration = channelIndex === 2 ? "16n" : "8n";
          playNote(noteName(midi), duration, channel.volume);
        });

        liveProject.notes.forEach((note) => {
          if (note.step === stepNow) {
            playNote(noteName(note.pitch), "16n", note.velocity);
          }
        });

        currentStep += 1;
      }, "16n");

      transport.start();
      setPlaying(true);
      setMessage("Playing");
      if (meterRef.current) clearInterval(meterRef.current);
      meterRef.current = setInterval(() => {
        const value = getMeterLevel();
        if (typeof value === "number" && Number.isFinite(value)) {
          setMeter(Math.max(-60, Math.min(0, value)));
        }
      }, 100);
    } catch (error) {
      setMessage(`Audio error: ${error.message}`);
    }
  }

  const projectRef = useRef(project);
  useEffect(() => { projectRef.current = project; }, [project]);

  function toggleStep(channelId, stepNumber) {
    updateProject((p) => {
      const channel = p.channels.find((c) => c.id === channelId);
      if (!channel) return p;
      channel.steps = channel.steps.includes(stepNumber)
        ? channel.steps.filter((s) => s !== stepNumber)
        : [...channel.steps, stepNumber].sort((a, b) => a - b);
      return p;
    });
  }

  function addNote(pitch, stepNumber) {
    updateProject((p) => {
      const existing = p.notes.find(
        (n) => n.pitch === pitch && n.step === stepNumber
      );
      if (existing) {
        p.notes = p.notes.filter((n) => n.id !== existing.id);
      } else {
        const id = `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        p.notes.push({ id, pitch, step: stepNumber, length: 1, velocity: 0.8 });
      }
      return p;
    });
  }

  function changeNoteLength(id, length) {
    updateProject((p) => {
      const note = p.notes.find((n) => n.id === id);
      if (note) note.length = Math.max(1, Math.min(16 - note.step, Number(length)));
      return p;
    });
  }

  async function importProject(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const loaded = await readProject(file);
      setProject(loaded);
      setMessage(`Loaded ${file.name}`);
    } catch (error) {
      setMessage(`Import failed: ${error.message}`);
    }
    event.target.value = "";
  }

  function importSamples(event) {
    const files = Array.from(event.target.files || []);
    const accepted = files.filter((f) =>
      /\.(wav|mp3|ogg|m4a|aiff?)$/i.test(f.name)
    );

    const entries = accepted.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      name: file.name,
      file,
      url: URL.createObjectURL(file)
    }));

    setSamples((old) => [...old, ...entries]);
    setMessage(`${entries.length} sound file(s) imported`);
    event.target.value = "";
  }

  async function previewSample(sample) {
    try {
      await ensureAudio();
      const player = new Tone.Player(sample.url).toDestination();
      samplePlayers.current.push(player);
      await Tone.loaded();
      player.start();
    } catch (error) {
      setMessage(`Preview failed: ${error.message}`);
    }
  }

  function selectSection(name) {
    updateProject((p) => {
      p.activeSection = name;
      return p;
    });
    setMessage(`${name} selected`);
  }

  const updateChannel = (id, key, value) => {
    updateProject((p) => {
      const channel = p.channels.find((c) => c.id === id);
      if (channel) channel[key] = value;
      return p;
    });
  };

  function addChannel() {
    updateProject((p) => {
      const n = p.channels.length + 1;
      p.channels.push({
        id: `ch${Date.now()}`,
        name: `CHANNEL ${n}`,
        type: "synth",
        muted: false,
        volume: 0.8,
        steps: []
      });
      return p;
    });
  }

  function deleteNote(id) {
    updateProject((p) => {
      p.notes = p.notes.filter((n) => n.id !== id);
      return p;
    });
    setSelectedNote(null);
  }

  const addNoteByPrompt = () => {
    const pitch = Number(prompt("MIDI pitch (48 = C3, 60 = C4, 72 = C5)", "60"));
    const stepNumber = Number(prompt("Step (0–15)", "0"));
    if (Number.isFinite(pitch) && pitch >= 24 && pitch <= 108 &&
        Number.isInteger(stepNumber) && stepNumber >= 0 && stepNumber < 16) {
      addNote(pitch, stepNumber);
    }
  };

  return (
    <main className="studio">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">C</div>
          <div>
            <div className="brand-name">CRANK<span> SESSION</span></div>
            <div className="brand-sub">MOBILE MUSIC WORKSTATION</div>
          </div>
        </div>

        <div className="transport">
          <label className="bpm-control">
            <span>BPM</span>
            <input
              type="number"
              min="40"
              max="240"
              value={project.bpm}
              onChange={(e) => updateProject((p) => {
                p.bpm = Math.max(40, Math.min(240, Number(e.target.value) || 140));
                Tone.getTransport().bpm.value = p.bpm;
                return p;
              })}
            />
          </label>
          <button className={`transport-button ${playing ? "active" : ""}`}
            onClick={togglePlay} aria-label={playing ? "Stop" : "Play"}>
            {playing ? <Square size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
            {playing ? "STOP" : "PLAY"}
          </button>
          <span className="status-dot" />
          <span className="status-text">{message}</span>
        </div>

        <div className="file-actions">
          <button className="icon-button" onClick={() => fileRef.current?.click()} title="Open project">
            <FolderOpen size={17} />
          </button>
          <input ref={fileRef} hidden type="file" accept=".crank,.json,application/json" onChange={importProject} />
          <button className="save-button" onClick={() => downloadProject(project)}>
            <Download size={16} /> SAVE PROJECT
          </button>
        </div>
      </header>

      <section className="workspace">
        <aside className="left-rail">
          <div className="rail-heading">WORKSPACE</div>
          {TABS.map(([name, Icon]) => (
            <button key={name} className={`rail-item ${tab === name ? "selected" : ""}`}
              onClick={() => setTab(name)}>
              <Icon size={18} /><span>{name}</span>
            </button>
          ))}
          <div className="rail-bottom">
            <CircleHelp size={17} />
            <span>SESSION v2.2</span>
          </div>
        </aside>

        <section className="main-panel">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">CRANK SESSION / {tab}</div>
              <h1>{tab === "PIANO ROLL" ? "Piano Roll" : tab}</h1>
            </div>
            <div className="panel-tools">
              <span className="pill">C MINOR</span>
              {tab === "PIANO ROLL" && <button className="small-action" onClick={addNoteByPrompt}><Plus size={15} /> ADD NOTE</button>}
            </div>
          </div>

          {tab === "PIANO ROLL" && (
            <div className="piano-layout">
              <div className="keyboard">
                {PITCHES.map(([label, pitch]) => (
                  <button key={pitch}
                    className={`key ${[1, 3, 6, 8, 10].includes(pitch % 12) ? "black-key" : ""}`}
                    onClick={async () => { await ensureAudio(); playNote(noteName(pitch), "8n", 0.8); }}>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
              <div className="roll-scroll">
                <div className="bar-labels">
                  {Array.from({ length: 4 }, (_, i) => <span key={i}>BAR {i + 1}</span>)}
                </div>
                <div className="note-grid">
                  {PITCHES.map(([label, pitch]) => {
                    const pitchClass = pitch % 12;
                    const inScale = NOTES_IN_C_MINOR.has(pitchClass);
                    return (
                      <div className={`pitch-row ${inScale ? "scale-row" : ""}`} key={pitch}>
                        <span className="pitch-label">{label}</span>
                        <div className="steps-grid">
                          {Array.from({ length: 16 }, (_, s) => {
                            const note = project.notes.find(n => n.pitch === pitch && n.step === s);
                            return (
                              <button key={s}
                                className={`note-cell ${s % 4 === 0 ? "beat-start" : ""} ${note ? "has-note" : ""} ${step === s && playing ? "playhead-cell" : ""}`}
                                onClick={() => note ? setSelectedNote(note) : addNote(pitch, s)}
                                title={`${label}, step ${s + 1}`}>
                                {note && <span className="note-block" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="velocity-panel">
                  <div className="velocity-title">VELOCITY</div>
                  {Array.from({ length: 16 }, (_, s) => {
                    const note = project.notes.find(n => n.step === s);
                    return (
                      <button key={s} className="velocity-column"
                        onClick={() => {
                          if (note) updateProject((p) => {
                            const found = p.notes.find(n => n.id === note.id);
                            if (found) found.velocity = found.velocity >= 0.95 ? 0.3 : Math.min(1, found.velocity + 0.15);
                            return p;
                          });
                        }}>
                        <span style={{ height: `${(note?.velocity ?? 0.08) * 100}%` }} />
                      </button>
                    );
                  })}
                </div>
              </div>
              <aside className="note-inspector">
                <div className="inspector-title">NOTE PROPERTIES</div>
                {selectedNote ? (
                  <>
                    <div className="property-row"><span>PITCH</span><b>{noteName(selectedNote.pitch)}</b></div>
                    <div className="property-row"><span>STEP</span><b>{selectedNote.step + 1}</b></div>
                    <label className="range-label">LENGTH <b>{selectedNote.length} step(s)</b>
                      <input type="range" min="1" max={16 - selectedNote.step} value={selectedNote.length}
                        onChange={(e) => changeNoteLength(selectedNote.id, e.target.value)} />
                    </label>
                    <button className="danger-button" onClick={() => deleteNote(selectedNote.id)}>DELETE NOTE</button>
                  </>
                ) : <p className="muted-copy">Tap a note to edit its length or delete it. Tap an empty grid cell to add a note.</p>}
                <div className="inspector-divider" />
                <div className="inspector-title">SCALE ASSISTANT</div>
                <div className="scale-badge">C NATURAL MINOR</div>
                <p className="muted-copy">Highlighted rows show notes in C natural minor.</p>
              </aside>
            </div>
          )}

          {tab === "CHANNELS" && (
            <div className="content-view">
              <div className="section-toolbar"><h2>CHANNEL RACK</h2><button className="small-action" onClick={addChannel}><Plus size={15} /> ADD CHANNEL</button></div>
              <div className="step-head"><span>CHANNEL</span>{Array.from({length:16},(_,i)=><span key={i}>{i+1}</span>)}</div>
              {project.channels.map((channel) => (
                <div className="channel-row" key={channel.id}>
                  <div className="channel-info">
                    <button className={`mute-button ${channel.muted ? "muted" : ""}`} onClick={() => updateChannel(channel.id,"muted",!channel.muted)}>{channel.muted ? "M" : "●"}</button>
                    <input className="channel-name" value={channel.name} onChange={(e) => updateChannel(channel.id,"name",e.target.value)} />
                    <input aria-label={`${channel.name} volume`} className="channel-volume" type="range" min="0" max="1" step=".05" value={channel.volume} onChange={(e) => updateChannel(channel.id,"volume",Number(e.target.value))} />
                  </div>
                  {Array.from({length:16},(_,i)=>(
                    <button key={i} onClick={() => toggleStep(channel.id,i)}
                      className={`step-button ${channel.steps.includes(i) ? "step-on" : ""} ${i%4===0 ? "step-beat" : ""}`}
                      aria-label={`${channel.name} step ${i+1}`} />
                  ))}
                </div>
              ))}
              <p className="muted-copy">Tap squares to program the 16-step pattern. M toggles mute; channel volume controls sequencer-note velocity.</p>
            </div>
          )}

          {tab === "SONG" && (
            <div className="content-view">
              <div className="section-toolbar"><h2>ARRANGEMENT</h2><span className="pill">4 SECTIONS</span></div>
              <div className="arrangement">
                {project.sections.map((section, i) => (
                  <button key={section.name} onClick={() => selectSection(section.name)}
                    className={`arrangement-block block-${i} ${project.activeSection === section.name ? "arrangement-selected" : ""}`}>
                    <b>{section.name}</b><span>{section.bars} BARS</span>
                  </button>
                ))}
              </div>
              <div className="section-toolbar"><h2>SECTION LENGTH</h2></div>
              {project.sections.map((section) => (
                <label className="section-length" key={section.name}>
                  <span>{section.name}</span>
                  <input type="range" min="1" max="32" value={section.bars} onChange={(e) => updateProject((p) => {
                    const found = p.sections.find(s => s.name === section.name);
                    if (found) found.bars = Number(e.target.value);
                    return p;
                  })} />
                  <b>{section.bars} bars</b>
                </label>
              ))}
              <p className="muted-copy">Sections can be selected and resized. Full multi-section arrangement playback is not yet connected to the transport in this source set.</p>
            </div>
          )}

          {tab === "FILTER" && (
            <div className="content-view processor-view">
              <div className="processor-card">
                <div className="processor-heading"><h2>FILTER</h2><span className="live-tag">LIVE AUDIO</span></div>
                <label className="range-label">CUTOFF <b>{Math.round(project.filter.cutoff)} Hz</b>
                  <input type="range" min="20" max="20000" step="1" value={project.filter.cutoff}
                    onChange={(e) => { const v = Number(e.target.value); updateProject(p => {p.filter.cutoff=v;return p;}); setFilterFrequency(v); }} />
                </label>
                <label className="range-label">RESONANCE (Q) <b>{project.filter.resonance.toFixed(2)}</b>
                  <input type="range" min=".1" max="20" step=".01" value={project.filter.resonance}
                    onChange={(e) => { const v = Number(e.target.value); updateProject(p => {p.filter.resonance=v;return p;}); setResonance(v); }} />
                </label>
                <p className="muted-copy">Changes affect the built-in synthesizer's live audio path. The current version does not yet include ADSR-per-note filter modulation or an LFO.</p>
              </div>
            </div>
          )}

          {tab === "LIMITER" && (
            <div className="content-view processor-view">
              <div className="processor-card">
                <div className="processor-heading"><h2>MASTER LIMITER</h2><span className="live-tag">LIVE AUDIO</span></div>
                <label className="range-label">INPUT GAIN <b>{project.limiter.inputGain.toFixed(1)} dB</b>
                  <input type="range" min="-24" max="12" step=".1" value={project.limiter.inputGain}
                    onChange={(e) => { const v=Number(e.target.value); updateProject(p=>{p.limiter.inputGain=v;return p;}); setInputGainDb(v); }} />
                </label>
                <label className="range-label">CEILING <b>{project.limiter.ceiling.toFixed(1)} dB</b>
                  <input type="range" min="-12" max="0" step=".1" value={project.limiter.ceiling}
                    onChange={(e) => { const v=Number(e.target.value); updateProject(p=>{p.limiter.ceiling=v;return p;}); setLimiterCeiling(v); }} />
                </label>
                <div className="meter-wrap"><span>OUTPUT LEVEL</span><div className="meter-track"><div className="meter-fill" style={{width:`${Math.max(0, Math.min(100, (meter+60)/60*100))}%`}} /></div><b>{meter.toFixed(1)} dB</b></div>
                <p className="muted-copy">The meter shows a live audio-level reading, not LUFS, true peak, or gain reduction. Attack, release, lookahead, and calibrated loudness analysis are not implemented yet.</p>
              </div>
            </div>
          )}

          {tab === "SOUNDS" && (
            <div className="content-view">
              <div className="section-toolbar"><h2>MY SOUNDS</h2><button className="small-action" onClick={() => sampleRef.current?.click()}><Upload size={15} /> IMPORT AUDIO</button></div>
              <input ref={sampleRef} hidden type="file" multiple accept=".wav,.mp3,.ogg,.m4a,.aiff,.aif,audio/*" onChange={importSamples} />
              {samples.length === 0 ? (
                <div className="empty-sounds"><Music2 size={36}/><b>Your sound library is empty</b><span>Import WAV or MP3 files to preview them here.</span></div>
              ) : samples.map(sample => (
                <div className="sample-row" key={sample.id}><Music2 size={18}/><span>{sample.name}</span><button className="small-action" onClick={() => previewSample(sample)}><Play size={14}/> PREVIEW</button></div>
              ))}
              <p className="muted-copy">Imported sounds are currently kept in this browser session and previewed separately. Persistent IndexedDB storage and routing imported samples into tracks are still to be added.</p>
            </div>
          )}

          {tab === "MIXER" && (
            <div className="content-view mixer-grid">
              {project.channels.map(channel => (
                <div className="mixer-strip" key={channel.id}>
                  <span>{channel.name}</span><div className="mixer-meter"><i style={{height:`${channel.muted ? 0 : channel.volume*100}%`}} /></div>
                  <input type="range" min="0" max="1" step=".01" value={channel.volume} onChange={e=>updateChannel(channel.id,"volume",Number(e.target.value))}/>
                  <b>{Math.round(channel.volume*100)}%</b>
                  <button className={`mute-button ${channel.muted ? "muted" : ""}`} onClick={()=>updateChannel(channel.id,"muted",!channel.muted)}>{channel.muted ? "MUTED" : "MUTE"}</button>
                </div>
              ))}
              <p className="muted-copy">These are per-channel project controls. Independent audio buses and per-channel effect routing are not yet implemented.</p>
            </div>
          )}

          {tab === "BEATS" && (
            <div className="content-view">
              <div className="section-toolbar"><h2>BEAT PROGRAMMER</h2><span className="pill">16 STEPS</span></div>
              <div className="beat-grid">
                {project.channels.map(channel=>(
                  <div className="beat-line" key={channel.id}>
                    <span>{channel.name}</span>
                    {Array.from({length:16},(_,i)=>(
                      <button key={i} className={`${channel.steps.includes(i)?"step-on":""} ${i%4===0?"step-beat":""}`} onClick={()=>toggleStep(channel.id,i)} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </section>

      <footer className="bottom-status">
        <div><span className="status-dot" /> {audioReady ? "AUDIO ENGINE READY" : "AUDIO STARTS AFTER FIRST PLAY"}</div>
        <div className="master-control"><span>MASTER</span><input type="range" min="0" max="1" step=".01" value={project.masterVolume}
          onChange={e=>{const v=Number(e.target.value);updateProject(p=>{p.masterVolume=v;return p;});setMasterVolume(v);}}/><b>{Math.round(project.masterVolume*100)}%</b></div>
        <div>44.1 kHz · STEREO</div>
      </footer>
    </main>
  );
}

