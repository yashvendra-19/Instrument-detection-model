// The 32 prompts and display names used by classifier.py (CANDIDATE_PROMPTS / PROMPT_TO_INSTRUMENT).
export const CATEGORIES = [
  { id: "western", label: "Western / general", color: "var(--cat-western)" },
  { id: "indian-strings", label: "Indian strings", color: "var(--cat-indian-strings)" },
  { id: "indian-wind", label: "Indian wind & keyboard", color: "var(--cat-indian-wind)" },
  { id: "indian-perc", label: "Indian percussion", color: "var(--cat-indian-perc)" },
  { id: "electronic", label: "Electronic / modern", color: "var(--cat-electronic)" },
  { id: "brass", label: "Brass & woodwinds", color: "var(--cat-brass)" },
  { id: "modern-strings", label: "Modern strings", color: "var(--cat-modern-strings)" },
];

export const INSTRUMENTS = [
  ["Piano", "western", "A classical grand piano playing notes harmoniously"],
  ["Drums", "western", "A punchy acoustic drum kit beating a rhythm section"],
  ["Flute", "western", "A clean studio recording of a flute playing a melody"],
  ["Acoustic guitar", "western", "An acoustic guitar strumming chords cleanly"],
  ["Bass guitar", "western", "A deep bass guitar rhythmic low frequency line"],
  ["Strings section", "western", "Orchestral cinematic strings section playing a sweeping melody"],
  ["Sitar", "indian-strings", "A traditional Indian sitar plucking melodic classical music"],
  ["Sarod", "indian-strings", "A traditional Indian sarod plucking classical melodies"],
  ["Sarangi", "indian-strings", "A traditional Indian sarangi bowed string instrument playing a mournful melody"],
  ["Veena", "indian-strings", "A traditional Indian veena plucked string instrument playing classical music"],
  ["Santoor", "indian-strings", "A traditional Indian santoor hammered dulcimer playing rapid melodies"],
  ["Mandolin", "indian-strings", "A bright traditional mandolin plucking rapid folk melodies"],
  ["Tanpura", "indian-strings", "A traditional Indian tanpura playing a continuous drone"],
  ["Harmonium", "indian-wind", "A traditional Indian harmonium pumping keys to play a melody"],
  ["Bansuri", "indian-wind", "A traditional Indian bansuri bamboo flute playing a soulful melody"],
  ["Shehnai", "indian-wind", "A traditional Indian shehnai playing a loud reedy wedding melody"],
  ["Tabla", "indian-perc", "A traditional Indian tabla playing rapid rhythmic percussion strokes"],
  ["Dholak", "indian-perc", "A traditional Indian dholak hand drum beating a folk rhythm"],
  ["Mridangam", "indian-perc", "A traditional Indian mridangam double sided drum playing classical rhythms"],
  ["Ghatam", "indian-perc", "A traditional Indian ghatam clay pot drum playing rhythmic beats"],
  ["Duff or khanjari", "indian-perc", "A traditional duff frame drum or khanjari tapping a rhythmic beat"],
  ["Electric guitar", "electronic", "An electric guitar playing loud amplified chords"],
  ["Electronic kick", "electronic", "A heavy electronic kick drum beating a dance rhythm"],
  ["Synthesizer", "electronic", "A digital electronic synthesizer playing a modern pop melody"],
  ["808 Bass", "electronic", "A deep electronic 808 sub bass booming"],
  ["Electric piano", "electronic", "An electric piano or rhodes playing smooth jazz chords"],
  ["Drum machine", "electronic", "An electronic drum machine playing a synthetic beat"],
  ["Trumpet", "brass", "A bright brass trumpet playing a loud jazzy melody"],
  ["Saxophone", "brass", "A smooth jazz saxophone playing a solo"],
  ["Trombone", "brass", "A deep brass trombone sliding notes"],
  ["Violin", "modern-strings", "A solo classical violin playing a high pitched melody"],
  ["Cello", "modern-strings", "A deep classical cello playing low string notes"],
].map(([name, category, prompt], i) => ({ id: i + 1, name, category, prompt }));

export const categoryOf = (id) => CATEGORIES.find((c) => c.id === id);
export const instrumentByName = (name) => INSTRUMENTS.find((i) => i.name.toLowerCase() === String(name).toLowerCase());
export const colorForInstrument = (name) => categoryOf(instrumentByName(name)?.category)?.color || "var(--cyan)";
