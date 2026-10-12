// Taal v2 — window.Taal. Vanilla DOM factories: each takes a host element and props. Load components/lib/motion.js (window.Motion) first for springs.

/** One entry of the POST /detect response from app.py. */
export interface DetectedInstrument {
  instrument: string;
  original_prediction: string;
  /** Raw cosine similarity, 0..1, rounded to 4 places. */
  confidence: number;
  /** e.g. "31.42%" */
  confidence_percentage: string;
  /** Peak 10-second window, "M:SS - M:SS". */
  timestamp: string;
}
export interface DetectResponse { success: boolean; total_instruments_detected: number; instruments: DetectedInstrument[]; }

export type FamilyId = "western" | "indian-strings" | "indian-wind" | "indian-percussion" | "electronic" | "brass" | "modern-strings";
export interface Family { id: FamilyId; label: string; /** colour token name, e.g. "fam-indian-strings" */ token: string; members: string[]; }

export interface ButtonProps { variant?: "primary" | "quiet" | "ghost"; label?: string; arrow?: boolean; /** magnetic pull, default .25 */ magnet?: number; }
export interface FamilyChipProps { instrument?: string; family?: FamilyId; label?: string; }
export interface StatusPillProps { state?: "online" | "busy" | "offline"; text?: string; }
export interface DropzoneProps { onFile?: (file: File) => void; /** HTML; wrap one word in <em> */ title?: string; hint?: string; }
export interface FieldProps { id?: string; label: string; type?: string; value?: string; autocomplete?: string; help?: string; }
export interface WaveformProps { samples?: number[]; duration?: number; onSeek?: (seconds: number) => void; }
export interface StagesProps { stages?: [string, string][]; }
export interface InstrumentStringProps { item: DetectedInstrument; index?: number; duration?: number; maxPct?: number; delay?: number; }
export interface TaalRingProps { results: DetectedInstrument[]; duration?: number; /** ms per sweep, default 9000 */ period?: number; }
export interface MetricTileProps { label: string; caption?: string; value?: number | string; decimals?: number; }
export interface StringFieldProps { families?: Family[]; labels?: boolean; idle?: boolean; intro?: boolean; inset?: number; }

export declare function Button(el: HTMLElement, props: ButtonProps): HTMLElement;
export declare function FamilyChip(el: HTMLElement, props: FamilyChipProps): HTMLElement;
export declare function StatusPill(el: HTMLElement, props: StatusPillProps): { set(state: StatusPillProps["state"], text: string): void };
export declare function Dropzone(el: HTMLElement, props: DropzoneProps): { ripple(): void; setTitle(html: string): void };
export declare function Field(el: HTMLElement, props: FieldProps): HTMLInputElement;
export declare function Waveform(el: HTMLElement, props: WaveformProps): { set(p: WaveformProps): void; setPeaks(r: DetectedInstrument[]): void; setTime(seconds: number | null): void };
export declare function Stages(el: HTMLElement, props?: StagesProps): { set(i: number, status: "waiting" | "active" | "done"): void; reset(): void; progress(f: number): void; run<T>(request: Promise<T>, stepMs?: number): Promise<T>; count: number };
export declare function InstrumentString(el: HTMLElement, props: InstrumentStringProps): { pluck(strength?: number): void; setTime(seconds: number | null): void; el: HTMLElement; family: Family };
export declare function TaalRing(el: HTMLElement, props: TaalRingProps): { destroy(): void; setTime(seconds: number): void };
export declare function MetricTile(el: HTMLElement, props: MetricTileProps): { set(v: number | string, opts?: { decimals?: number }): void };
export declare function StringField(el: HTMLElement, props?: StringFieldProps): { pluck(i: number, position: number, amplitude: number): void; drive(bands: ArrayLike<number>): void };

export interface TransportProps { duration?: number; note?: string; onToggle?: () => void; }
export declare function Transport(el: HTMLElement, props: TransportProps): { setPlaying(p: boolean): void; update(t: number, duration: number, bands?: ArrayLike<number> | null): void; setNote(text: string): void };

/** Playback engine. With a file: Web Audio analyser over the real audio. Without: a silent, labelled simulation. */
export interface PlayerOptions { file?: File; duration?: number; samples?: number[]; }
export declare class Player {
  constructor(opts: PlayerOptions);
  simulated: boolean; duration: number; time: number; playing: boolean;
  /** Seven band energies 0..1, low to high, one per family string. */
  bands: Float32Array; level: number;
  on(fn: (time: number, bands: Float32Array, level: number) => void): () => void;
  play(): Promise<void>; pause(): void; toggle(): Promise<void>; seek(seconds: number): void; destroy(): void;
}
