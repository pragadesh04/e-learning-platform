@echo off
cd /d "%~dp0"
echo Starting backend server...
py -3.14 -c "import uvicorn; uvicorn.run('main:app', host='127.0.0.1', port=8000, reload=False)"
