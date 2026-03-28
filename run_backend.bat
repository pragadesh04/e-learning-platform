@echo off
cd /d "%~dp0backend"
echo Starting backend server on port 8000...
echo.
echo Press Ctrl+C to stop the server
echo.
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
pause
