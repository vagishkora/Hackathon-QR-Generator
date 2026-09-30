@echo off
title HACKDAYS Database Reset Utility
cd /d "%~dp0"

echo ====================================================
echo    HACKDAYS QR PASS - DATABASE RESET UTILITY
echo ====================================================
echo.

node scripts/clear_data.mjs

echo.
pause
