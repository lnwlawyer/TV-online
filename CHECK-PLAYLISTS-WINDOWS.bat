@echo off
cd /d "%~dp0"
py -3 verify_playlists.py --sources thailand news sports movies-channels series-channels documentary --out verified-channels.m3u
if errorlevel 1 python verify_playlists.py --sources thailand news sports movies-channels series-channels documentary --out verified-channels.m3u
pause
