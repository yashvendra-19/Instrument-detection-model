export const TEAM = [
  { name: "Yashvendra Singh", reg: "24BCE2567" },
  { name: "Utkarsh Gautam", reg: "24BAI0007" },
  { name: "Pratyush Kumar Sahoo", reg: "24BAI0012" },
  { name: "Akshita Dahiya", reg: "24BCT0009" },
  { name: "Srijan Pradhan", reg: "24BDS0292" },
];

export const SUPERVISOR = {
  name: "Anandhakrishnan T",
  title: "Assistant Professor Sr. Grade 1",
  school: "School of Computer Science and Engineering, VIT Vellore",
};

export const COURSE = "BCSE306L — Artificial Intelligence";
export const REPO_URL = "https://github.com/yashvendra-19/Instrument-detection-model";

export const PIPELINE = [
  { title: "Upload", detail: "The song is posted to /detect with HTTP Basic credentials and saved to a temporary request folder." },
  { title: "Load & resample", detail: "librosa decodes the file to 48 kHz mono — the native input format of CLAP." },
  { title: "Window", detail: "The signal is cut into 480,000-sample (10 s) windows. A tail under 1 s is skipped; a short tail is zero-padded." },
  { title: "Embed audio", detail: "Each window passes through the CLAP audio encoder, four windows at a time to bound encoder memory." },
  { title: "Embed prompts", detail: "The 32 instrument descriptions pass through the CLAP text encoder in one call." },
  { title: "Similarity", detail: "Both sets are normalised and multiplied: an N × 32 matrix of cosine similarities." },
  { title: "Max-pool", detail: "For every instrument, the best score over all windows and the index of that window are kept." },
  { title: "Threshold & respond", detail: "Instruments scoring at least 1.15 × the mean are returned as JSON, sorted, with M:SS time ranges." },
];
