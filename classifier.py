import os
import torch
import librosa
import numpy as np
import soundfile as sf
import tempfile
import uuid
import laion_clap

print("Initializing Upgraded CLAP Framework (V3.0 - Expanded Indian Instrument Matrix)...")
# 1. Initialize and cache the CLAP model globally so it doesn't reload on every single API request.
model = laion_clap.CLAP_Module(enable_fusion=False)
model.load_ckpt()

# 2. Comprehensive Instrument Dataset with optimized descriptive prompts.
CANDIDATE_PROMPTS = [
    # General/Western
    "A classical grand piano playing notes harmoniously",
    "A punchy acoustic drum kit beating a rhythm section",
    "A clean studio recording of a flute playing a melody",
    "An acoustic guitar strumming chords cleanly",
    "A deep bass guitar rhythmic low frequency line",
    "Orchestral cinematic strings section playing a sweeping melody",
    
    # Indian Strings
    "A traditional Indian sitar plucking melodic classical music",
    "A traditional Indian sarod plucking classical melodies",
    "A traditional Indian sarangi bowed string instrument playing a mournful melody",
    "A traditional Indian veena plucked string instrument playing classical music",
    "A traditional Indian santoor hammered dulcimer playing rapid melodies",
    "A bright traditional mandolin plucking rapid folk melodies",
    "A traditional Indian tanpura playing a continuous drone",
    
    # Indian Wind & Keyboard
    "A traditional Indian harmonium pumping keys to play a melody",
    "A traditional Indian bansuri bamboo flute playing a soulful melody",
    "A traditional Indian shehnai playing a loud reedy wedding melody",
    
    # Indian Percussion
    "A traditional Indian tabla playing rapid rhythmic percussion strokes",
    "A traditional Indian dholak hand drum beating a folk rhythm",
    "A traditional Indian mridangam double sided drum playing classical rhythms",
    "A traditional Indian ghatam clay pot drum playing rhythmic beats",
    "A traditional duff frame drum or khanjari tapping a rhythmic beat",
    
    # Electronic / Modern
    "An electric guitar playing loud amplified chords",
    "A heavy electronic kick drum beating a dance rhythm",
    "A digital electronic synthesizer playing a modern pop melody",
    "A deep electronic 808 sub bass booming",
    "An electric piano or rhodes playing smooth jazz chords",
    "An electronic drum machine playing a synthetic beat",
    
    # Modern Brass & Woodwinds
    "A bright brass trumpet playing a loud jazzy melody",
    "A smooth jazz saxophone playing a solo",
    "A deep brass trombone sliding notes",
    
    # Modern Strings
    "A solo classical violin playing a high pitched melody",
    "A deep classical cello playing low string notes"
]

# Strict mapping dictionary to ensure the final JSON output matches the expected naming convention
PROMPT_TO_INSTRUMENT = {
    "A classical grand piano playing notes harmoniously": "Piano",
    "A punchy acoustic drum kit beating a rhythm section": "Drums",
    "A clean studio recording of a flute playing a melody": "Flute",
    "An acoustic guitar strumming chords cleanly": "Acoustic guitar",
    "A deep bass guitar rhythmic low frequency line": "Bass guitar",
    "Orchestral cinematic strings section playing a sweeping melody": "Strings section",
    
    "A traditional Indian sitar plucking melodic classical music": "Sitar",
    "A traditional Indian sarod plucking classical melodies": "Sarod",
    "A traditional Indian sarangi bowed string instrument playing a mournful melody": "Sarangi",
    "A traditional Indian veena plucked string instrument playing classical music": "Veena",
    "A traditional Indian santoor hammered dulcimer playing rapid melodies": "Santoor",
    "A bright traditional mandolin plucking rapid folk melodies": "Mandolin",
    "A traditional Indian tanpura playing a continuous drone": "Tanpura",
    "A traditional Indian harmonium pumping keys to play a melody": "Harmonium",
    "A traditional Indian bansuri bamboo flute playing a soulful melody": "Bansuri",
    "A traditional Indian shehnai playing a loud reedy wedding melody": "Shehnai",
    "A traditional Indian tabla playing rapid rhythmic percussion strokes": "Tabla",
    "A traditional Indian dholak hand drum beating a folk rhythm": "Dholak",
    "A traditional Indian mridangam double sided drum playing classical rhythms": "Mridangam",
    "A traditional Indian ghatam clay pot drum playing rhythmic beats": "Ghatam",
    "A traditional duff frame drum or khanjari tapping a rhythmic beat": "Duff or khanjari",
    
    "An electric guitar playing loud amplified chords": "Electric guitar",
    "A heavy electronic kick drum beating a dance rhythm": "Electronic kick",
    "A digital electronic synthesizer playing a modern pop melody": "Synthesizer",
    "A deep electronic 808 sub bass booming": "808 Bass",
    "An electric piano or rhodes playing smooth jazz chords": "Electric piano",
    "An electronic drum machine playing a synthetic beat": "Drum machine",
    
    "A bright brass trumpet playing a loud jazzy melody": "Trumpet",
    "A smooth jazz saxophone playing a solo": "Saxophone",
    "A deep brass trombone sliding notes": "Trombone",
    
    "A solo classical violin playing a high pitched melody": "Violin",
    "A deep classical cello playing low string notes": "Cello"
}

def classify_audio(audio_path: str):
    """
    Takes the path to the original full audio file, chunks it into 10-second segments,
    computes contrastive embeddings for all chunks in a batch using Microsoft CLAP,
    and returns the maximum confidence score for each instrument across the timeline.
    """
    if not os.path.exists(audio_path):
        print(f"Error inside classifier: Path {audio_path} does not exist.")
        return []

    print(f"[classifier] Loading audio and chunking into 10-second Sliding Windows...")
    try:
        # Load audio at 48kHz natively for CLAP
        audio_data, sr = librosa.load(audio_path, sr=48000, mono=True)
    except Exception as e:
        print(f"Error loading audio: {e}")
        return []

    # Slice the audio into 10-second chunks (480000 samples)
    chunk_length_samples = sr * 10
    chunks = []
    
    for i in range(0, len(audio_data), chunk_length_samples):
        chunk = audio_data[i:i + chunk_length_samples]
        
        # Skip leftover tail chunks that are less than 1 second to avoid noise
        if len(chunk) < sr * 1:
            continue
            
        # CLAP strictly expects 480000 sample tensors. Pad with silence if slightly short.
        if len(chunk) < chunk_length_samples:
            chunk = np.pad(chunk, (0, chunk_length_samples - len(chunk)), 'constant')
            
        chunks.append(chunk)

    if not chunks:
        return []

    print(f"[classifier] Batch processing {len(chunks)} chunks through CLAP Engine...")
    
    # We will write chunks to temporary WAV files and use the proven filelist embedding function
    # This prevents PyTorch tensor/numpy shape mismatch errors in laion_clap's data ingestion
    tmp_dir = tempfile.gettempdir()
    batch_id = uuid.uuid4().hex
    chunk_paths = []
    
    for idx, chunk in enumerate(chunks):
        path = os.path.join(tmp_dir, f"chunk_{batch_id}_{idx}.wav")
        sf.write(path, chunk, 48000)
        chunk_paths.append(path)
        
    # Process all chunks through the model simultaneously
    audio_embed = model.get_audio_embedding_from_filelist(x=chunk_paths, use_tensor=True)
    text_embed = model.get_text_embedding(CANDIDATE_PROMPTS, use_tensor=True)
    
    # Cleanup temporary chunk files
    for p in chunk_paths:
        try:
            os.remove(p)
        except Exception:
            pass

    with torch.no_grad():
        # 1. Normalize multi-modal embeddings to unit vectors
        audio_features = audio_embed / audio_embed.norm(dim=-1, keepdim=True)
        text_features = text_embed / text_embed.norm(dim=-1, keepdim=True)
        
        # 2. Compute the cosine similarity matrix: Shape (num_chunks, num_prompts)
        similarity = audio_features @ text_features.T
        
        # 3. Max Pooling: Get the maximum similarity score for each instrument across all chunks
        # This isolates the specific 10-second moment the instrument played the loudest!
        max_results = torch.max(similarity, dim=0)
        max_probs = max_results.values.cpu().numpy()
        max_indices = max_results.indices.cpu().numpy()

    # Formulating response items
    results = []
    for idx, (score, prompt) in enumerate(zip(max_probs, CANDIDATE_PROMPTS)):
        confidence_val = float(score)
        instrument_name = PROMPT_TO_INSTRUMENT[prompt]
        chunk_index = max_indices[idx]
        
        # Calculate start and end seconds for the 10-second chunk
        start_sec = chunk_index * 10
        end_sec = start_sec + 10
        
        # Format as M:SS
        start_str = f"{start_sec // 60}:{start_sec % 60:02d}"
        end_str = f"{end_sec // 60}:{end_sec % 60:02d}"
        
        results.append({
            "instrument": instrument_name,
            "original_prediction": instrument_name,
            "confidence": round(confidence_val, 4),
            "confidence_percentage": f"{round(confidence_val * 100, 2)}%",
            "timestamp": f"{start_str} - {end_str}"
        })
            
    # Sort with highest confidence first
    sorted_results = sorted(results, key=lambda x: x["confidence"], reverse=True)
    
    # Dynamic Thresholding: Calculate noise floor and isolate massive spikes
    if len(sorted_results) > 0:
        mean_score = sum(r["confidence"] for r in sorted_results) / len(sorted_results)
        dynamic_threshold = mean_score * 1.15 
        
        final_instruments = [r for r in sorted_results if r["confidence"] >= dynamic_threshold]
        return final_instruments
    
    return sorted_results