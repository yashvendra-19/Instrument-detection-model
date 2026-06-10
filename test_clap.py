import torch
import laion_clap
import os

print("Loading Microsoft CLAP Model... (Downloading weights on first run)")
# Load the official audio-text foundation model
model = laion_clap.CLAP_Module(enable_fusion=False)
model.load_ckpt() 

# Define the exact target instruments your mentor wants to find!
candidate_instruments = [
    "Flute music", 
    "Drums playing", 
    "Acoustic guitar", 
    "Piano", 
    "Bass guitar", 
    "Violin strings"
]

# Path to the 'other.mp3' stem that your Demucs extraction saved earlier
audio_data_path = r"separated/htdemucs/sample_audio/other.mp3"

if not os.path.exists(audio_data_path):
    print(f"Error: Could not find the file at {audio_data_path}")
    print("Please check your folder structure to ensure other.mp3 is there!")
else:
    print(f"Testing CLAP against candidates on: {audio_data_path}")

    # Get embeddings and calculate similarity scores
    audio_embed = model.get_audio_embedding_from_filelist(x=[audio_data_path], use_tensor=True)
    text_embed = model.get_text_embedding(candidate_instruments, use_tensor=True)

    with torch.no_grad():
        # 1. Normalize the embeddings to unit vectors (Standard Contrastive Math)
        audio_features = audio_embed / audio_embed.norm(dim=-1, keepdim=True)
        text_features = text_embed / text_embed.norm(dim=-1, keepdim=True)
        
        # 2. Compute similarity via matrix multiplication (Dot Product)
        # We multiply by 100 as a scaling temperature factor typical for CLAP/CLIP
        similarity = (audio_features @ text_features.T) * 100
        
        # 3. Convert raw similarity logits to clean percentage probabilities
        probs = torch.softmax(similarity, dim=-1).cpu().numpy()[0]

    print("\nCLAP Matching Results:")
    for score, instrument in sorted(zip(probs, candidate_instruments), reverse=True):
        print(f"- {instrument}: {round(float(score) * 100, 2)}% match")