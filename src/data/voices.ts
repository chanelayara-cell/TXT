import { Persona, EmotionStyle, ScriptTemplate, BgmTrack } from '../types';

export const GEMINI_VOICE_PERSONAS: Persona[] = [
  {
    id: 'dian-studio',
    name: 'Dian - Diksi Jernih & Presenter 🎙️',
    voiceName: 'Kore',
    gender: 'Wanita',
    tag: 'Diksi HD / Broadcaster',
    category: 'jernih',
    articulationBadge: 'Artikulasi Super Jernih',
    styleInstruction: 'Gaya bicara presenter televisi berita nasional Indonesia: artikulasi vokal konsonan (A, I, U, E, O, R, S, T) sangat jernih, tajam, dan presisi. Intonasi netral formal yang tegas, jeda nafas teratur, tempo stabil tanpa getaran robotik.',
    desc: 'Artikulasi vokal & konsonan sangat bersih dan presisi layaknya presenter berita studio TV nasional.',
    pitchShift: 0,
    speedRate: 1.0,
    browserPitch: 1.12,
    browserRate: 1.0,
    timbreProfile: 'Sopran Sedang • Jernih Studio Berita'
  },
  {
    id: 'reza-edukasi',
    name: 'Reza - Edukator & Dosen Artikulatif 👨‍🏫',
    voiceName: 'Charon',
    gender: 'Pria',
    tag: 'Edukasi / Tutorial Jernih',
    category: 'jernih',
    articulationBadge: 'Lafal Bersih & Jernih',
    styleInstruction: 'Gaya bicara pengajar profesional dan akademisi Indonesia: pelafalan kata per kata sangat bersih, berwibawa, intonasi tenang, penekanan poin kalimat natural layaknya mengajar tatap muka, tanpa nada datar robotik.',
    desc: 'Suara pria berwibawa dengan pelafalan kata demi kata yang bersih, tertata rapi, dan mudah dipahami untuk tutorial dan kursus.',
    pitchShift: 0,
    speedRate: 0.98,
    browserPitch: 0.94,
    browserRate: 0.98,
    timbreProfile: 'Bariton Tenang • Edukasi & Pengajar'
  },
  {
    id: 'laras-audiobook',
    name: 'Laras - Narator Bernapas & Hangat 📖',
    voiceName: 'Aoede',
    gender: 'Wanita',
    tag: 'Audiobook / Storytelling',
    category: 'kasual',
    articulationBadge: 'Sangat Alami & Bernapas',
    styleInstruction: 'Gaya bicara narator buku dan cerita wanita Indonesia: penuh kehangatan manusiawi, memiliki desah nafas dan infleksi suara organik yang sangat alami, berirama luwes tanpa kekakuan algoritma.',
    desc: 'Suara wanita hangat dengan dinamika pernapasan dan artikulasi kata yang sangat organik layaknya bercerita langsung di depanmu.',
    pitchShift: 0,
    speedRate: 0.96,
    browserPitch: 1.0,
    browserRate: 0.95,
    timbreProfile: 'Mezzo-Sopran Hangat • Storyteller Bernapas'
  },
  {
    id: 'dimas-podcast',
    name: 'Dimas - Obrolan Santai & Podcaster 🎧',
    voiceName: 'Puck',
    gender: 'Pria',
    tag: 'Podcast / Non-Robotik',
    category: 'kasual',
    articulationBadge: '100% Manusiawi & Santai',
    styleInstruction: 'Gaya bicara santai pemuda Indonesia di studio podcast: irama bicara mengalir fleksibel, artikulasi jernih tapi luwes, nada ramah dan spontan seperti sedang ngobrol akrab bersama kawan.',
    desc: 'Suara pemuda energik yang santai dan ekspresif. Sangat pas untuk podcast, YouTube kasual, dan obrolan gaul yang mengalir.',
    pitchShift: 1,
    speedRate: 1.04,
    browserPitch: 1.06,
    browserRate: 1.05,
    timbreProfile: 'Tenor Lincah • Kasual & Upbeat'
  },
  {
    id: 'citra-presenter',
    name: 'Citra - Diksi Korporat & Konsultan 💼',
    voiceName: 'Kore',
    gender: 'Wanita',
    tag: 'Pitching / Bisnis / Voiceover',
    category: 'formal',
    articulationBadge: 'Bahasa Baku Modern',
    styleInstruction: 'Gaya bicara konsultan bisnis dan eksekutif wanita korporat: Bahasa Indonesia baku yang rapi, senyum vokal (smiling voice) percaya diri, artikulasi bersih tanpa logat kedaerahan kental.',
    desc: 'Pelafalan Bahasa Indonesia baku yang rapi, berkelas, dan meyakinkan untuk presentasi bisnis dan company profile.',
    pitchShift: 1.5,
    speedRate: 1.02,
    browserPitch: 1.20,
    browserRate: 1.02,
    timbreProfile: 'Sopran Polished • Elegan Korporat'
  },
  {
    id: 'gilang-iklan',
    name: 'Gilang - Voiceover Iklan & Teaser 📻',
    voiceName: 'Fenrir',
    gender: 'Pria',
    tag: 'Komersial / Radio HD',
    category: 'formal',
    articulationBadge: 'Resonansi Dalam & Punchy',
    styleInstruction: 'Gaya bicara pengisi suara iklan radio dan komersial TV: resonansi dada hangat, artikulasi punchy dan tegas, intonasi energik namun terkontrol, vokal tebal dan meyakinkan konsumen.',
    desc: 'Suara pria maskulin dengan artikulasi kuat dan resonansi bass yang natural, vokal tegas dan punchy untuk promosi komersial.',
    pitchShift: -1,
    speedRate: 1.02,
    browserPitch: 0.86,
    browserRate: 1.02,
    timbreProfile: 'Bariton Berat • Punchy Iklan Komersial'
  },
  {
    id: 'siti-ceria',
    name: 'Siti - Ceria & Konten Kreator 👩',
    voiceName: 'Aoede',
    gender: 'Wanita',
    tag: 'TikTok / Reels / Ads',
    category: 'ekspresif',
    articulationBadge: 'Ceria & Ekspresif',
    styleInstruction: 'Gaya bicara kreator konten media sosial Indonesia: sangat ceria, riang, vokal bernada tinggi yang memikat telinga, lincah, ekspresif, dan ramah menyapa penonton.',
    desc: 'Suara wanita ceria, riang, dan bersahabat. Cocok untuk video promosi TikTok, Reels, YouTube Shorts, dan hiburan.',
    pitchShift: 2.5,
    speedRate: 1.08,
    browserPitch: 1.30,
    browserRate: 1.10,
    timbreProfile: 'Sopran Tinggi Riang • Kreator Medsos'
  },
  {
    id: 'budi-formal',
    name: 'Budi - Wibawa & Berita Resmi 👨',
    voiceName: 'Charon',
    gender: 'Pria',
    tag: 'Berita / Acara Resmi',
    category: 'formal',
    articulationBadge: 'Tenang & Berwibawa',
    styleInstruction: 'Gaya bicara pria Indonesia yang sangat berwibawa, teduh, tempo tertata rapi, dan artikulasi baku tegas seperti pembawa acara resmi kenegaraan atau pimpinan instansi.',
    desc: 'Suara pria matang, tenang, dan berwibawa. Sangat pas untuk narasi kenegaraan, profil institusi, dan pidato resmi.',
    pitchShift: -1.5,
    speedRate: 0.94,
    browserPitch: 0.88,
    browserRate: 0.92,
    timbreProfile: 'Bass-Bariton Formal • Wibawa Kenegaraan'
  },
  {
    id: 'maya-vlog',
    name: 'Maya - Soft & Ramah Harian 👩',
    voiceName: 'Aoede',
    gender: 'Wanita',
    tag: 'Vlog / Review Estetik',
    category: 'kasual',
    articulationBadge: 'Lembut & Akrab',
    styleInstruction: 'Gaya bicara vlogger wanita: santai, lembut, intim, artikulasi bersahabat seperti sedang mengobrol di kafe, nada bicara teduh dan menenangkan.',
    desc: 'Suara lembut dan bersahabat. Pas untuk storytelling gaya hidup, review produk kecantikan, dan vlog harian santai.',
    pitchShift: 0.5,
    speedRate: 0.95,
    browserPitch: 1.08,
    browserRate: 0.94,
    timbreProfile: 'Mezzo Lembut • Intim & Teduh'
  },
  {
    id: 'rian-friendly',
    name: 'Rian - Kasual & Explainer 🧑',
    voiceName: 'Puck',
    gender: 'Pria',
    tag: 'Explainer / Tips Trik',
    category: 'kasual',
    articulationBadge: 'Artikulasi Luwes',
    styleInstruction: 'Gaya bicara pemuda mentor teknologi: ramah, tempo seimbang, artikulasi jelas dalam menjelaskan langkah demi langkah, nada bersahabat dan mudah dicerna.',
    desc: 'Suara pemuda ramah dan santai. Cocok untuk video tutorial aplikasi teknologi, tips praktis, dan panduan belajar.',
    pitchShift: 0,
    speedRate: 1.0,
    browserPitch: 1.02,
    browserRate: 1.0,
    timbreProfile: 'Tenor Ramah • Praktis & Terang'
  },
  {
    id: 'aris-deep',
    name: 'Aris - Deep Cinematic & Dokumenter 🎙️',
    voiceName: 'Fenrir',
    gender: 'Pria',
    tag: 'Trailer / Dokumenter',
    category: 'ekspresif',
    articulationBadge: 'Ngebass & Sinematik',
    styleInstruction: 'Gaya bicara pria bergetar sub-bass berat: sangat sinematik, misterius, tempo lambat berbobot, intonasi dramatis seperti narator film dokumenter megah National Geographic.',
    desc: 'Suara pria sangat berat & ngebass sinematik. Sangat pas untuk narasi dokumenter sejarah, misteri, dan trailer film.',
    pitchShift: -3.0,
    speedRate: 0.92,
    browserPitch: 0.74,
    browserRate: 0.90,
    timbreProfile: 'Sub-Bass Dalam • Narator Sinematik'
  },
  {
    id: 'nadia-gentle',
    name: 'Nadia - Dongeng & Emosional 👧',
    voiceName: 'Aoede',
    gender: 'Wanita',
    tag: 'Storytelling / Puisi',
    category: 'ekspresif',
    articulationBadge: 'Emosional & Manis',
    styleInstruction: 'Gaya bicara pendongeng anak dan pembaca puisi: intonasi bergelombang manis, emosional tulus, lembut mengayun, artikulasi penuh empati dan kasih sayang.',
    desc: 'Suara bernuansa manis dan emosional untuk dongeng anak sebelum tidur, pembacaan puisi, atau kisah inspiratif.',
    pitchShift: 1.8,
    speedRate: 0.93,
    browserPitch: 1.24,
    browserRate: 0.92,
    timbreProfile: 'Sopran Melodik • Dongeng & Puitis'
  }
];

export const EMOTION_STYLES: EmotionStyle[] = [
  {
    id: 'clear-articulation',
    label: '🎙️ Artikulasi Super Jernih (Anti-AI)',
    prompt: 'PENTING: Gunakan artikulasi huruf dan kata yang luar biasa jernih, tajam, dan bersih. Lafalkan setiap suku kata dengan presisi layaknya penyiar studio profesional. Hindari suara sengau, bergumam, atau nada robotik.'
  },
  {
    id: 'conversational-human',
    label: '☕ Obrolan Manusiawi & Bernapas',
    prompt: 'Bicaralah dengan gaya santai dan 100% manusiawi. Berikan variasi nada yang hidup, jeda bernapas yang wajar, dan intonasi luwes seperti manusia yang sedang bercakap-cakap langsung.'
  },
  {
    id: 'smiling-warm',
    label: '😊 Ramah & Tersenyum (Smiling Voice)',
    prompt: 'Bicaralah dengan nada ramah, hangat, dan penuh senyum (smiling voice) yang membuat pendengar merasa nyaman dan disambut.'
  },
  {
    id: 'natural',
    label: '🍃 Natural & Alami Seimbang',
    prompt: 'Gunakan nada bicara alami sehari-hari, artikulasi jernih, dan tempo yang nyaman didengar.'
  },
  {
    id: 'happy',
    label: '🎉 Ceria & Penuh Energi',
    prompt: 'Bicaralah dengan penuh kegembiraan, energi tinggi, intonasi ceria, dan antusiasme yang menular.'
  },
  {
    id: 'serious',
    label: '💼 Formal & Berwibawa',
    prompt: 'Bicaralah dengan nada tegas, resmi, stabil, dan berwibawa tanpa kesan kaku.'
  },
  {
    id: 'dramatic',
    label: '🎬 Misterius & Sinematik',
    prompt: 'Bicaralah perlahan dengan intonasi misterius, ritme dramatis, dan penekanan kata yang mendalam.'
  },
  {
    id: 'whisper',
    label: '🌙 Lembut & Berbisik Tenang',
    prompt: 'Bicaralah dengan sangat lembut, tenang, dan santai seperti berbisik ramah di malam hari.'
  }
];

export const SCRIPT_TEMPLATES: ScriptTemplate[] = [
  {
    id: 'viral-promo',
    category: 'E-Commerce / Promo',
    title: 'Promosi Produk Viral TikTok',
    text: 'Sumpah ya, ini barang rahasia yang bikin konten aku makin estetik! Nggak nyangka harganya se-terjangkau ini. Buruan cek keranjang kuning sebelum kehabisan!'
  },
  {
    id: 'story-fact',
    category: 'Edukasi / Fakta',
    title: 'Tahukah Kamu? (Fakta Unik)',
    text: 'Tahukah kamu? Otak manusia menghasilkan energi listrik yang cukup untuk menyalakan lampu bohlam kecil! Penasaran fakta menarik lainnya? Simak video ini sampai habis!'
  },
  {
    id: 'cinematic-trailer',
    category: 'Dokumenter / Trailer',
    title: 'Pembuka Konten Misteri',
    text: 'Di balik kegelapan malam yang sunyi, tersimpan rahasia tua yang tak pernah terungkap. Apakah kamu berani membuka tabir kebenaran selanjutnya?'
  },
  {
    id: 'motivation-quote',
    category: 'Motivasi',
    title: 'Kata-kata Semangat Pagi',
    text: 'Jangan pernah ragu dengan potensi dirimu. Setiap langkah kecil yang kamu ambil hari ini adalah investasi besar untuk masa depanmu. Mulai sekarang!'
  }
];

export const BGM_TRACKS: BgmTrack[] = [
  { id: 'none', name: 'Tanpa Musik (No BGM)', emoji: '🔇', type: 'none' },
  { id: 'lofi', name: 'Lo-Fi Chill Beat', emoji: '☕', type: 'synth-lofi' },
  { id: 'energetic', name: 'Upbeat Vlog Energy', emoji: '⚡', type: 'synth-upbeat' },
  { id: 'cinematic', name: 'Cinematic Ambient', emoji: '🎬', type: 'synth-ambient' },
];
