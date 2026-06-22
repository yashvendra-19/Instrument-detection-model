import os
import subprocess
from pathlib import Path

# Get the directory where separator.py is located
BASE_DIR = Path(__file__).resolve().parent
WORK_DIR = BASE_DIR / "separation_workspace"

STEM_NAMES = ("bass", "drums", "other", "vocals")

def separate_stems(audio_path: str) -> dict:
    """
    Runs Demucs separation via command-line, isolating the run using the unique
    input path folder structure to prevent file system collisions.
    """
    input_file = Path(audio_path)
    if not input_file.exists():
        raise FileNotFoundError(f"Input file not found: {audio_path}")

    # No clearing of global WORK_DIR here to prevent WinError 5 locks.
    # We let Demucs generate output inside its unique request subfolder.
    import sys
    # Fix for Windows Access Violation (0xC0000005) segfaults in PyTorch/OpenMP
    os.environ["OMP_NUM_THREADS"] = "1"
    os.environ["MKL_NUM_THREADS"] = "1"
    os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
    
    command = [
        sys.executable, "-m", "demucs",
        "-n", "mdx_extra_q",
        "--jobs", "1",
        "-d", "cuda",
        "--segment", "2",
        "--out", str(WORK_DIR),
        str(input_file)
    ]

    print(f"[separator] Executing CLI: {' '.join(command)}")
    
    try:
        # Remove capture_output to prevent tqdm progress bars from swallowing the actual error in stderr
        subprocess.run(command, check=True)
    except subprocess.CalledProcessError as err:
        raise RuntimeError(f"Demucs processing step failed with return code {err.returncode}. Please check the terminal logs for the exact error.")

    print("[separator] Demucs file generation finished successfully.")

    # Locate the created track folder dynamically inside the temporary sequence path
    expected_output_dir = WORK_DIR / "mdx_extra_q" / input_file.stem

    stems = {}
    for stem_name in STEM_NAMES:
        wav_path = expected_output_dir / f"{stem_name}.wav"
        mp3_path = expected_output_dir / f"{stem_name}.mp3"

        if wav_path.exists():
            stems[stem_name] = str(wav_path.resolve())
        elif mp3_path.exists():
            stems[stem_name] = str(mp3_path.resolve())
        else:
            raise FileNotFoundError(f"Could not locate output file segment for {stem_name} track.")

    return stems