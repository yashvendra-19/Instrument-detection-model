import os
import torch
import laion_clap

print("Initializing Upgraded CLAP Framework (V2.2 - Complete 8-Instrument Matrix)...")
# 1. Initialize and cache the CLAP model globally so it doesn't reload on every single API request.
model = laion_clap.CLAP_Module(enable_fusion=False)
model.load_ckpt()

# 2. Complete 8-Instrument Dataset requested by your mentor with optimized descriptive prompts.
CANDIDATE_PROMPTS = [
    "A classical grand piano playing notes harmoniously",
    "A punchy acoustic drum kit beating a rhythm section",
    "A bright traditional mandolin plucking rapid folk melodies",
    "A clean studio recording of a flute playing a melody",
    "An acoustic guitar strumming chords cleanly",
    "A deep bass guitar rhythmic low frequency line",
    "A traditional duff frame drum or khanjari tapping a rhythmic beat",
    "Orchestral cinematic strings section playing a sweeping melody"
]

# Strict mapping dictionary to ensure the final JSON output matches the mentor's exact naming convention
PROMPT_TO_INSTRUMENT = {
    "A classical grand piano playing notes harmoniously": "Piano",
    "A punchy acoustic drum kit beating a rhythm section": "Drums",
    "A bright traditional mandolin plucking rapid folk melodies": "Mandolin",
    "A clean studio recording of a flute playing a melody": "Flute",
    "An acoustic guitar strumming chords cleanly": "Acoustic guitar",
    "A deep bass guitar rhythmic low frequency line": "Bass guitar",
    "A traditional duff frame drum or khanjari tapping a rhythmic beat": "Duff or khanjari",
    "Orchestral cinematic strings section playing a sweeping melody": "Strings section"
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
    for score, prompt in zip(probs, CANDIDATE_PROMPTS):
        confidence_val = float(score)
        instrument_name = PROMPT_TO_INSTRUMENT[prompt]
        
        # Kept noise gate open (0.0) so ALL 8 instruments are guaranteed to show up in the JSON array as requested!
        results.append({
            "instrument": instrument_name,
            "original_prediction": instrument_name,
            "confidence": round(confidence_val, 4)
        })
            
    # Return results sorted with highest confidence first
    return sorted(results, key=lambda x: x["confidence"], reverse=True)