import os
import torch
import laion_clap

print("Initializing Upgraded CLAP Framework...")
# 1. Initialize and cache the CLAP model globally so it doesn't reload on every single API request.
model = laion_clap.CLAP_Module(enable_fusion=False)
model.load_ckpt()

# 2. Define the precision candidate targets requested by your mentor.
CANDIDATE_INSTRUMENTS = [
    "Flute music", 
    "Drums playing", 
    "Acoustic guitar", 
    "Piano", 
    "Bass guitar", 
    "Violin strings"
]

def classify_stem(stem_path: str):
    """
    Takes the path to an extracted audio stem file, computes contrastive
    embeddings using Microsoft CLAP, maps it to target categories, and returns
    a formatted list matching the production JSON schema.
    """
    if not os.path.exists(stem_path):
        print(f"Error inside classifier: Path {stem_path} does not exist.")
        return []

    # Get multi-modal contrastive embeddings
    audio_embed = model.get_audio_embedding_from_filelist(x=[stem_path], use_tensor=True)
    text_embed = model.get_text_embedding(CANDIDATE_INSTRUMENTS, use_tensor=True)

    with torch.no_grad():
        # 1. Normalize multi-modal embeddings to unit vectors
        audio_features = audio_embed / audio_embed.norm(dim=-1, keepdim=True)
        text_features = text_embed / text_embed.norm(dim=-1, keepdim=True)
        
        # 2. Compute the cosine similarity matrix (dot product)
        similarity = audio_features @ text_features.T
        
        # 3. Apply softmax across the final logits matrix array
        probs = torch.softmax(similarity, dim=-1).cpu().numpy()[0]

    # Formulating response items to match the expected format perfectly
    results = []
    for score, instrument in zip(probs, CANDIDATE_INSTRUMENTS):
        confidence_val = float(score)
        # Low confidence noise gate filtering
        if confidence_val > 0.01:
            results.append({
                "instrument": instrument,
                "original_prediction": instrument,
                "confidence": round(confidence_val, 4)
            })
            
    # Return results sorted with highest confidence first
    return sorted(results, key=lambda x: x["confidence"], reverse=True)