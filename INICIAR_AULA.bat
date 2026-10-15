@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if errorlevel 1 (
  echo Necesitas Python instalado para abrir Mi Aula desde el ordenador.
  echo Alternativamente, sube la web a GitHub Pages.
  pause
  exit /b 1
)
start "Servidor Mi Aula" /min py -3 -m http.server 8000
ping -n 3 127.0.0.1 >nul
start "" "http://localhost:8000/"
echo Mi Aula abierta en el navegador. Cierra la ventana 'Servidor Mi Aula' para detenerlo.
