import librosa
import numpy as np
from panns_inference import AudioTagging, labels

audio_path = "separated/htdemucs/sample_audio/drums.mp3" 

print("Loading audio.Stay tuned...")
audio, _ = librosa.load(audio_path, sr=32000, mono=True)

print("Loading PANNs CNN14 Model...")
model = AudioTagging(checkpoint_path=None, device='cpu')

print("Listening to the instruments...")
_, output = model.inference(audio[np.newaxis, :])

print("\n--- Top 3 Predictions ---")
top_indices = np.argsort(output[0])[::-1][:3]

for idx in top_indices:
    class_name = labels[idx]
    confidence = output[0][idx]
    print(f"> {class_name} : {confidence:.2f}")
