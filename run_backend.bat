@echo off
cd /d "%~dp0backend"
echo Starting backend server on port 8000...
python -3.14 -c "import uvicorn; uvicorn.run('main:app', host='0.0.0.0', port=8000)"
pause
