export interface Persona {
  id: string;
  name: string;
  voiceName: 'Kore' | 'Aoede' | 'Charon' | 'Puck' | 'Fenrir';
  gender: 'Wanita' | 'Pria';
  tag: string;
  category: 'jernih' | 'kasual' | 'formal' | 'ekspresif';
  articulationBadge: string;
  styleInstruction: string;
  desc: string;
  pitchShift: number; // Semitone shift for audio DSP (-3 to +3)
  speedRate: number; // Baseline speed (0.9 to 1.15)
  browserPitch: number; // Pitch for browser synthesis (0.7 to 1.35)
  browserRate: number; // Rate for browser synthesis (0.85 to 1.2)
  timbreProfile: string; // Descriptive acoustic profile
}

export interface EmotionStyle {
  id: string;
  label: string;
  prompt: string;
}

export interface ScriptTemplate {
  id: string;
  category: string;
  title: string;
  text: string;
}

export interface BgmTrack {
  id: string;
  name: string;
  emoji: string;
  type: string;
}

export interface HistoryItem {
  id: number;
  text: string;
  voice: string;
  date: string;
}

export interface ToastNotification {
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}
