@echo off
title Instrument Detector API

:: Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not added to your PATH.
    echo Please install Python from https://www.python.org/downloads/
    pause
    exit /b
)

:: Create virtual environment if it doesn't exist
if not exist "env\Scripts\activate.bat" (
    echo [INFO] Creating virtual environment...
    python -m venv env
)

:: Activate the virtual environment
call env\Scripts\activate.bat

:: Install dependencies
echo [INFO] Installing/Updating dependencies...
pip install -r requirements.txt

:: Run the application
echo [INFO] Starting the Instrument Detector API...
python main.py

pause
