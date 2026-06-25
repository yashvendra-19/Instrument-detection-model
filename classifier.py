import os
import torch
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

def classify_stem(stem_path: str):
    """
    Takes the path to an extracted audio stem file, computes contrastive
    embeddings using Microsoft CLAP across 8 target categories, applies 
    temperature scaling, and returns a formatted list matching the production JSON schema.
    """
    if not os.path.exists(stem_path):
        print(f"Error inside classifier: Path {stem_path} does not exist.")
        return []

    # Get multi-modal contrastive embeddings using the expanded prompt setup
    audio_embed = model.get_audio_embedding_from_filelist(x=[stem_path], use_tensor=True)
    text_embed = model.get_text_embedding(CANDIDATE_PROMPTS, use_tensor=True)

    with torch.no_grad():
        # 1. Normalize multi-modal embeddings to unit vectors
        audio_features = audio_embed / audio_embed.norm(dim=-1, keepdim=True)
        text_features = text_embed / text_embed.norm(dim=-1, keepdim=True)
        
        # 2. Compute the cosine similarity matrix (dot product)
        similarity = audio_features @ text_features.T
        
        # 3. Multi-label Optimization: Use raw cosine similarity instead of Softmax.
        # Softmax forces all scores to sum to 1.0, which means if one instrument is loud, 
        # it squashes all others to 0.0. Raw similarity allows multiple instruments to score highly independently.
        probs = similarity.cpu().numpy()[0]

    # Formulating response items to match the expected format perfectly
    results = []
    for score, prompt in zip(probs, CANDIDATE_PROMPTS):
        confidence_val = float(score)
        instrument_name = PROMPT_TO_INSTRUMENT[prompt]
        
        results.append({
            "instrument": instrument_name,
            "original_prediction": instrument_name,
            "confidence": round(confidence_val, 4)
        })
            
    # Sort with highest confidence first
    sorted_results = sorted(results, key=lambda x: x["confidence"], reverse=True)
    
    # Dynamic Thresholding: We don't know how many instruments are in the song (could be 2, could be 12).
    # We find the 'average' confidence score across all 33 instruments (the noise floor)
    # and only return the instruments that spike significantly above that average.
    if len(sorted_results) > 0:
        mean_score = sum(r["confidence"] for r in sorted_results) / len(sorted_results)
        
        # Keep instruments that are at least 15% higher than the average noise floor
        dynamic_threshold = mean_score * 1.15 
        
        final_instruments = [r for r in sorted_results if r["confidence"] >= dynamic_threshold]
        return final_instruments
    
    return sorted_results