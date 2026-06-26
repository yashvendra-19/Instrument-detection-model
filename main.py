import uvicorn
import multiprocessing
from app import app

if __name__ == '__main__':
    multiprocessing.freeze_support() # Required for PyInstaller with multiprocess/PyTorch
    uvicorn.run(app, host="127.0.0.1", port=8000)
