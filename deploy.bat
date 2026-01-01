@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

set REMOTE=origin
set ENV_FILE=.env.local

if /I "%~1"=="setup" goto setup

REM --- check git repo
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo ERROR: Not a git repository in "%cd%".
  exit /b 1
)

for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD') do set BRANCH=%%b

REM --- commit message
set MSG=%~1
if "%MSG%"=="" set MSG=deploy update

REM --- stage
git add -A

REM --- commit only if there are staged changes
git diff --cached --quiet
if errorlevel 1 (
  echo [1/3] Commit: %MSG%
  git commit -m "%MSG%"
  if errorlevel 1 goto err
) else (
  echo [1/3] No changes to commit.
)

REM --- push
echo [2/3] Push: %REMOTE% %BRANCH%
git push %REMOTE% %BRANCH%
if errorlevel 1 goto err

REM --- read deploy hook (optional)
set HOOK_URL=
if exist "%ENV_FILE%" (
  for /f "tokens=1,* delims==" %%A in ('findstr /I /B "CLOUDFLARE_DEPLOY_HOOK_URL=" "%ENV_FILE%"') do set HOOK_URL=%%B
)

REM remove quotes if any
set HOOK_URL=%HOOK_URL:"=%

if "%HOOK_URL%"=="" goto nohook

:hook
echo [3/3] Trigger Cloudflare Pages deploy hook...
curl -s -X POST "%HOOK_URL%" >nul
if errorlevel 1 (
  echo WARNING: Deploy hook call failed. Your push may still auto-deploy.
) else (
  echo Deploy hook triggered.
)
goto done

:nohook
echo [3/3] Cloudflare deploy hook not set. (OK if auto-deploy is enabled)
echo Tip: run "deploy.bat setup" to save your Deploy Hook URL.
goto done

:setup
echo === Cloudflare Pages Deploy Hook Setup ===
set /p INPUT=Paste your CLOUDFLARE_DEPLOY_HOOK_URL (or leave blank to skip):

if "%INPUT%"=="" (
  echo Skipped.
  exit /b 0
)

REM write/update .env.local (simple + safe)
if exist "%ENV_FILE%" del /q "%ENV_FILE%" >nul 2>&1
echo CLOUDFLARE_DEPLOY_HOOK_URL=%INPUT%>"%ENV_FILE%"

echo Saved: CLOUDFLARE_DEPLOY_HOOK_URL=******
echo SETUP DONE. Next: deploy.bat "update"
exit /b 0

:err
echo FAILED (see error above)
exit /b 1

:done
echo DONE
exit /b 0
