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
    "A traditional duff frame drum or khanjari tapping a rhythmic beat"
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
    "A traditional duff frame drum or khanjari tapping a rhythmic beat": "Duff or khanjari"
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
        
        # 3. Temperature Scaling Optimization (tau = 0.05) to sharpen confidence peaks
        temperature = 0.05
        probs = torch.softmax(similarity / temperature, dim=-1).cpu().numpy()[0]

    # Formulating response items to match the expected format perfectly
    results = []
    THRESHOLD = 0.10 # Only keep instruments with a confidence score greater than 10%

    for score, prompt in zip(probs, CANDIDATE_PROMPTS):
        confidence_val = float(score)
        
        if confidence_val >= THRESHOLD:
            instrument_name = PROMPT_TO_INSTRUMENT[prompt]
            results.append({
                "instrument": instrument_name,
                "original_prediction": instrument_name,
                "confidence": round(confidence_val, 4)
            })
            
    # Return results sorted with highest confidence first
    return sorted(results, key=lambda x: x["confidence"], reverse=True)