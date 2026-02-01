@echo off
echo.
echo  ========================================
echo   SYNTH STATION - Local Server
echo  ========================================
echo.
echo  Starting server at http://localhost:8000
echo  Open this URL in your browser!
echo.
echo  Press Ctrl+C to stop the server.
echo.
start http://localhost:8000/dnb_generator.html
python -m http.server 8000
