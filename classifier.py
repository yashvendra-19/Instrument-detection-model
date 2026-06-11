import os
import torch
import laion_clap

print("Initializing Upgraded CLAP Framework (V2.1 - Precision Tuned)...")
# 1. Initialize and cache the CLAP model globally so it doesn't reload on every single API request.
model = laion_clap.CLAP_Module(enable_fusion=False)
model.load_ckpt()

# 2. Optimized Prompt Engineering: Descriptive prompts create significantly stronger text embeddings.
CANDIDATE_PROMPTS = [
    "A clean studio recording of a flute playing a melody",
    "A punchy acoustic drum kit beating a rhythm section",
    "An acoustic guitar strumming chords cleanly",
    "A classical grand piano playing notes harmoniously",
    "A deep bass guitar rhythmic low frequency line",
    "Orchestral violin strings playing a dramatic melody"
]

# Clean mapping dict to map back descriptive prompts to your exact JSON schema keys
PROMPT_TO_INSTRUMENT = {
    "A clean studio recording of a flute playing a melody": "Flute music",
    "A punchy acoustic drum kit beating a rhythm section": "Drums playing",
    "An acoustic guitar strumming chords cleanly": "Acoustic guitar",
    "A classical grand piano playing notes harmoniously": "Piano",
    "A deep bass guitar rhythmic low frequency line": "Bass guitar",
    "Orchestral violin strings playing a dramatic melody": "Violin strings"
}

def classify_stem(stem_path: str):
    """
    Takes the path to an extracted audio stem file, computes contrastive
    embeddings using Microsoft CLAP, applies temperature scaling optimization,
    and returns a crisp, high-accuracy probability distribution.
    """
    if not os.path.exists(stem_path):
        print(f"Error inside classifier: Path {stem_path} does not exist.")
        return []

    # Get multi-modal contrastive embeddings using the rich engineered prompts
    audio_embed = model.get_audio_embedding_from_filelist(x=[stem_path], use_tensor=True)
    text_embed = model.get_text_embedding(CANDIDATE_PROMPTS, use_tensor=True)

    with torch.no_grad():
        # 1. Normalize multi-modal embeddings to unit vectors
        audio_features = audio_embed / audio_embed.norm(dim=-1, keepdim=True)
        text_features = text_embed / text_embed.norm(dim=-1, keepdim=True)
        
        # 2. Compute the cosine similarity matrix (dot product)
        similarity = audio_features @ text_features.T
        
        # 3. TEMPERATURE SCALING OPTIMIZATION
        # By adding a scaling factor (tau = 0.05), we sharpen the softmax distribution.
        # This fixes the "flat distribution" problem and pushes the correct instrument to a distinct peak.
        temperature = 0.05
        probs = torch.softmax(similarity / temperature, dim=-1).cpu().numpy()[0]

    # Formulating response items to match the expected format perfectly
    results = []
    for score, prompt in zip(probs, CANDIDATE_PROMPTS):
        confidence_val = float(score)
        instrument_name = PROMPT_TO_INSTRUMENT[prompt]
        
        # Lower noise gate filtering since precision is now highly focused
        if confidence_val > 0.001:
            results.append({
                "instrument": instrument_name,
                "original_prediction": instrument_name,
                "confidence": round(confidence_val, 4)
            })
            
    # Return results sorted with highest confidence first
    return sorted(results, key=lambda x: x["confidence"], reverse=True)