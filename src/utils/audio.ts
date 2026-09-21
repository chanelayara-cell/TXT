export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export function pcmToWav(pcm16Data: Int16Array, sampleRate = 24000, numChannels = 1): Blob {
  const buffer = new ArrayBuffer(44 + pcm16Data.length * 2);
  const view = new DataView(buffer);

  const writeString = (v: DataView, offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      v.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + pcm16Data.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, pcm16Data.length * 2, true);

  let offset = 44;
  for (let i = 0; i < pcm16Data.length; i++, offset += 2) {
    view.setInt16(offset, pcm16Data[i], true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

export function pcmToAudioBuffer(pcm16Data: Int16Array, sampleRate = 24000): AudioBuffer {
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx({ sampleRate });
  const buffer = ctx.createBuffer(1, pcm16Data.length, sampleRate);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < pcm16Data.length; i++) {
    channelData[i] = pcm16Data[i] / 32768.0;
  }
  return buffer;
}

export async function processAudioEnhancements(
  pcm16Data: Int16Array,
  speed = 1.0,
  pitchShiftSemitones = 0,
  personaId = '',
  sampleRate = 24000
): Promise<Int16Array> {
  const needsProcessing = speed !== 1.0 || pitchShiftSemitones !== 0 || personaId;
  if (!needsProcessing) return pcm16Data;

  try {
    const audioBuffer = pcmToAudioBuffer(pcm16Data, sampleRate);
    // Rate factor from speed and pitch shift
    const pitchFactor = Math.pow(2, pitchShiftSemitones / 24); // smooth subtle pitch inflection
    const effectivePlaybackRate = Math.max(0.6, Math.min(1.6, speed * pitchFactor));
    const targetLength = Math.max(1, Math.round(audioBuffer.length / effectivePlaybackRate));

    const OfflineAudioCtx =
      window.OfflineAudioContext ||
      (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;
    const offlineCtx = new OfflineAudioCtx(1, targetLength, sampleRate);

    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.playbackRate.value = effectivePlaybackRate;

    // Equalization per character persona
    let lastNode: AudioNode = source;

    if (personaId.includes('aris') || personaId.includes('gilang')) {
      // Bass boost / cinematic resonance
      const bassFilter = offlineCtx.createBiquadFilter();
      bassFilter.type = 'lowshelf';
      bassFilter.frequency.value = 180;
      bassFilter.gain.value = personaId.includes('aris') ? 6.0 : 3.5;
      lastNode.connect(bassFilter);
      lastNode = bassFilter;
    } else if (personaId.includes('siti') || personaId.includes('citra')) {
      // Treble & high presence boost for crystal-clear clarity
      const trebleFilter = offlineCtx.createBiquadFilter();
      trebleFilter.type = 'highshelf';
      trebleFilter.frequency.value = 3200;
      trebleFilter.gain.value = personaId.includes('siti') ? 4.5 : 3.0;
      lastNode.connect(trebleFilter);
      lastNode = trebleFilter;
    } else if (personaId.includes('dian') || personaId.includes('reza')) {
      // Articulation presence peak filter for broadcast/tutor diction
      const midFilter = offlineCtx.createBiquadFilter();
      midFilter.type = 'peaking';
      midFilter.frequency.value = 2400;
      midFilter.Q.value = 1.0;
      midFilter.gain.value = 3.0;
      lastNode.connect(midFilter);
      lastNode = midFilter;
    }

    lastNode.connect(offlineCtx.destination);
    source.start(0);

    const renderedBuffer = await offlineCtx.startRendering();
    const floatData = renderedBuffer.getChannelData(0);
    const pcm16Result = new Int16Array(floatData.length);

    for (let i = 0; i < floatData.length; i++) {
      const s = Math.max(-1, Math.min(1, floatData[i]));
      pcm16Result[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    return pcm16Result;
  } catch (e) {
    console.warn('Gagal memproses peningkatan audio PCM:', e);
    return pcm16Data;
  }
}

export async function processAudioSpeed(
  pcm16Data: Int16Array,
  speed: number,
  sampleRate = 24000
): Promise<Int16Array> {
  return processAudioEnhancements(pcm16Data, speed, 0, '', sampleRate);
}

export function generateSrtContent(text: string, speed = 1.0): string {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length === 0) return '';

  const totalWords = text.trim().split(/\s+/).length;
  const estTotalSeconds = (totalWords / (150 * speed)) * 60;
  const avgSecPerSentence = Math.max(2, estTotalSeconds / sentences.length);

  let srtContent = '';
  let currentTime = 0;

  const formatTime = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = Math.floor(sec % 60);
    const millis = Math.floor((sec % 1) * 1000);
    const pad = (num: number, len = 2) => String(num).padStart(len, '0');
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${pad(millis, 3)}`;
  };

  sentences.forEach((sentence, index) => {
    const startTime = formatTime(currentTime);
    currentTime += avgSecPerSentence;
    const endTime = formatTime(currentTime);
    srtContent += `${index + 1}\n${startTime} --> ${endTime}\n${sentence}\n\n`;
  });

  return srtContent;
}

export async function synthesizeOfflineVoiceWav(
  text: string,
  persona: {
    id: string;
    name: string;
    gender: 'Pria' | 'Wanita';
    browserPitch: number;
    browserRate: number;
    pitchShift?: number;
  },
  speed = 1.0,
  pitch = 1.0,
  sampleRate = 24000
): Promise<Blob> {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const effectiveSpeed = Math.max(0.6, Math.min(1.8, speed * (persona.browserRate || 1.0)));

  // Estimate syllable count
  const syllableCount = Math.max(4, Math.round(text.length / 3.2));
  const syllableDuration = 0.16 / effectiveSpeed;
  const wordPause = 0.08 / effectiveSpeed;
  const totalDuration = Math.max(1.0, syllableCount * syllableDuration + words.length * wordPause + 0.3);

  const OfflineCtx =
    window.OfflineAudioContext ||
    (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;
  const offlineCtx = new OfflineCtx(1, Math.ceil(totalDuration * sampleRate), sampleRate);

  // Determine base fundamental frequency
  const isMale = persona.gender === 'Pria';
  const baseFreq = isMale ? 115 : 225;
  const personaPitchMod = (persona.browserPitch || 1.0) * pitch;
  const semitoneFactor = persona.pitchShift ? Math.pow(2, persona.pitchShift / 12) : 1.0;
  const fundamentalF0 = Math.max(65, Math.min(450, baseFreq * personaPitchMod * semitoneFactor));

  // Voice source (harmonic glottal pulse approximation via sawtooth + triangle)
  const oscSaw = offlineCtx.createOscillator();
  oscSaw.type = 'sawtooth';
  oscSaw.frequency.setValueAtTime(fundamentalF0, 0);

  const oscTri = offlineCtx.createOscillator();
  oscTri.type = 'triangle';
  oscTri.frequency.setValueAtTime(fundamentalF0 * 2, 0);

  // Subtle human vibrato (5 Hz)
  const vibrato = offlineCtx.createOscillator();
  vibrato.frequency.setValueAtTime(5.2, 0);
  const vibratoGain = offlineCtx.createGain();
  vibratoGain.gain.setValueAtTime(fundamentalF0 * 0.015, 0);
  vibrato.connect(oscSaw.frequency);
  vibrato.connect(oscTri.frequency);

  // Vowel Formants Resonator (Indonesian neutral vowel formant F1 ~ 650Hz, F2 ~ 1700Hz)
  const f1Filter = offlineCtx.createBiquadFilter();
  f1Filter.type = 'bandpass';
  f1Filter.frequency.setValueAtTime(isMale ? 580 : 750, 0);
  f1Filter.Q.setValueAtTime(3.5, 0);

  const f2Filter = offlineCtx.createBiquadFilter();
  f2Filter.type = 'bandpass';
  f2Filter.frequency.setValueAtTime(isMale ? 1600 : 2100, 0);
  f2Filter.Q.setValueAtTime(4.0, 0);

  // Timbre shaping per persona
  const timbreFilter = offlineCtx.createBiquadFilter();
  if (persona.id.includes('aris') || persona.id.includes('gilang')) {
    timbreFilter.type = 'lowshelf';
    timbreFilter.frequency.value = 180;
    timbreFilter.gain.value = 5.0;
  } else if (persona.id.includes('siti') || persona.id.includes('citra')) {
    timbreFilter.type = 'highshelf';
    timbreFilter.frequency.value = 3400;
    timbreFilter.gain.value = 4.0;
  } else {
    timbreFilter.type = 'peaking';
    timbreFilter.frequency.value = 2200;
    timbreFilter.Q.value = 1.2;
    timbreFilter.gain.value = 2.5;
  }

  // Syllabic envelope
  const masterGain = offlineCtx.createGain();
  masterGain.gain.setValueAtTime(0.0001, 0);

  let curTime = 0.05;
  for (let w = 0; w < words.length; w++) {
    const word = words[w];
    const wordSyllables = Math.max(1, Math.round(word.length / 3));

    for (let s = 0; s < wordSyllables; s++) {
      const sylStart = curTime;
      const sylPeak = curTime + syllableDuration * 0.35;
      const sylEnd = curTime + syllableDuration;

      // Pitch inflection over the sentence
      const sentenceProgress = Math.min(1.0, curTime / totalDuration);
      const sentencePitchBend = fundamentalF0 * (1.0 + 0.06 * Math.sin(sentenceProgress * Math.PI) - 0.04 * sentenceProgress);
      oscSaw.frequency.setValueAtTime(sentencePitchBend, sylStart);

      masterGain.gain.setValueAtTime(0.001, sylStart);
      masterGain.gain.exponentialRampToValueAtTime(0.28, sylPeak);
      masterGain.gain.exponentialRampToValueAtTime(0.01, sylEnd);

      curTime = sylEnd + 0.02;
    }
    curTime += wordPause;
  }

  masterGain.gain.setValueAtTime(0.0001, Math.min(totalDuration - 0.05, curTime));

  // Connections
  oscSaw.connect(f1Filter);
  oscTri.connect(f2Filter);

  f1Filter.connect(timbreFilter);
  f2Filter.connect(timbreFilter);

  timbreFilter.connect(masterGain);
  masterGain.connect(offlineCtx.destination);

  vibrato.start(0);
  oscSaw.start(0);
  oscTri.start(0);

  vibrato.stop(totalDuration);
  oscSaw.stop(totalDuration);
  oscTri.stop(totalDuration);

  const renderedBuffer = await offlineCtx.startRendering();
  const floatData = renderedBuffer.getChannelData(0);
  const pcm16Result = new Int16Array(floatData.length);

  for (let i = 0; i < floatData.length; i++) {
    const s = Math.max(-1, Math.min(1, floatData[i]));
    pcm16Result[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  return pcmToWav(pcm16Result, sampleRate, 1);
}

