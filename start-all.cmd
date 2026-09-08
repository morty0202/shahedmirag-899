@echo off
setlocal
title Meraj App Launcher
color 0A

echo ==================================================
echo   دبیرستان شاهد معراج — اجرای کامل (بک‌اند + سایت)
echo ==================================================
echo.

rem --- check backend port 3001 ---
netstat -ano | findstr /R "LISTENING" | findstr ":3001 " >nul 2>&1
if %errorlevel%==0 (
  echo [بک‌اند] از قبل روی پورت 3001 در حال اجراست (رد شدن از اجرای مجدد)
  set BACKEND_SKIP=1
) else (
  echo [بک‌اند] در حال اجرا بر روی http://localhost:3001 ...
  start "Meraj Backend (3001)" cmd /k "cd /d %~dp0server && node server.mjs"
  set BACKEND_SKIP=0
)

rem --- check frontend port 5173 ---
netstat -ano | findstr /R "LISTENING" | findstr ":5173 " >nul 2>&1
if %errorlevel%==0 (
  echo [سایت] از قبل روی پورت 5173 در حال اجراست (رد شدن از اجرای مجدد)
  set FRONTEND_SKIP=1
) else (
  echo [سایت] در حال اجرا بر روی http://localhost:5173 ...
  start "Meraj Frontend (5173)" cmd /k "cd /d %~dp0 && npm run dev"
  set FRONTEND_SKIP=0
)

echo.
echo ==================================================
echo   بک‌اند : http://localhost:3001
echo   سایت    : http://localhost:5173
echo   حساب‌ها : amir / Amir1404@  |  ahmadi / Teacher1404@  |  admin / Admin1404@
echo ==================================================
echo.
echo زمان بدهید تا سرورها بالا بیایند، سپس در مرورگر آدرس
echo   http://localhost:5173
echo را باز کنید.
echo.
pause