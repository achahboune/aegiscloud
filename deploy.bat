@echo off
setlocal EnableExtensions

REM =========================
REM CONFIG
REM =========================
set REMOTE=origin

REM =========================
REM SETUP MODE
REM =========================
if /I "%~1"=="setup" goto setup

REM =========================
REM MAIN MODE
REM Usage: deploy.bat "message"
REM =========================
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo ERROR: Not a git repository.
  exit /b 1
)

for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD') do set BRANCH=%%b

git remote get-url %REMOTE% >nul 2>&1
if errorlevel 1 (
  echo ERROR: Remote "%REMOTE%" not found.
  echo Fix: git remote add %REMOTE% ^<YOUR_GITHUB_REPO_URL^>
  exit /b 1
)

set MSG=%~1
if "%MSG%"=="" set MSG=deploy update

git add -A

git diff --cached --quiet
if errorlevel 1 (
  echo [1/3] Commit: %MSG%
  git commit -m "%MSG%"
  if errorlevel 1 goto err
) else (
  echo [1/3] No changes to commit.
)

echo [2/3] Push: %REMOTE% %BRANCH%
git push %REMOTE% %BRANCH%
if errorlevel 1 goto err

echo [3/3] Vercel deploy (prod)...
vercel deploy --prod --yes
if errorlevel 1 goto err

echo DONE
exit /b 0

:setup
echo [1/2] Vercel login...
vercel login
if errorlevel 1 goto err

echo [2/2] Vercel link...
vercel link --yes
if errorlevel 1 goto err

echo SETUP DONE. Next: deploy.bat "update"
exit /b 0

:err
echo FAILED (see error above)
exit /b 1
