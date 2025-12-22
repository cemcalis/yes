<#
PowerShell helper to configure frontend to use the focused-friendship backend.

What it does (interactive):
 - Ask whether frontend is hosted on Vercel or Railway
 - If Vercel: prints exact steps and the env values to set in the Vercel Dashboard
 - If Railway: asks for the frontend service name, shows current production variables, sets NEXT_PUBLIC_API_URL to the focused-friendship URL and triggers a restart
 - Restarts the focused-friendship backend service to ensure the new backend is running
 - Optionally creates an empty commit and pushes to trigger a rebuild

Usage:
  powershell -ExecutionPolicy Bypass -File .\scripts\setup_frontend_env.ps1
#>

$focusedApi = 'https://focused-friendship-production-290f.up.railway.app/api'
$focusedBackend = 'https://focused-friendship-production-290f.up.railway.app'

Write-Host "This script will help point your frontend to the focused-friendship backend." -ForegroundColor Cyan

# Ask hosting
$hostChoice = Read-Host "Is your frontend hosted on Vercel? (y/N)"
if ($hostChoice -match '^(y|Y)') {
    Write-Host "
Vercel guide — do these steps in your Vercel project:
1) Open your Vercel Project -> Settings -> Environment Variables
2) Add / update the following for the Production environment:
   - NEXT_PUBLIC_API_URL = $focusedApi
   - NEXT_PUBLIC_BACKEND_URL = $focusedBackend
3) Save and trigger a redeploy (Deployments -> Redeploy or push a commit)

You can trigger a quick rebuild from this repo by doing an empty commit locally and pushing:
  git commit --allow-empty -m "rebuild frontend -> point to focused-friendship API"
  git push

After redeploy, open the site and check DevTools Network -> /api/products request -> Request URL should start with: $focusedApi
" -ForegroundColor Yellow
    exit 0
}

# Else assume Railway or other self-hosted
$frontendService = Read-Host "Enter your frontend Railway service name (example: aura-frontend) or press Enter to skip"
if ([string]::IsNullOrWhiteSpace($frontendService)) {
    Write-Host "No Railway frontend service name given. I will only restart the backend (focused-friendship)." -ForegroundColor Yellow
} else {
    Write-Host "Will set NEXT_PUBLIC_API_URL on Railway service '$frontendService' to: $focusedApi" -ForegroundColor Cyan
    $confirm = Read-Host "Confirm and run Railway CLI to set variables for $frontendService? (y/N)"
    if ($confirm -match '^(y|Y)') {
        try {
            Write-Host "Showing current variables for $frontendService..." -ForegroundColor Gray
            & railway variables -e production -s $frontendService -k
        } catch {
            Write-Host "Failed to fetch variables for $frontendService. Make sure Railway CLI is installed and you're logged in." -ForegroundColor Red
            Write-Host $_.Exception.Message
        }

        try {
            Write-Host "Setting NEXT_PUBLIC_API_URL..." -ForegroundColor Gray
            & railway variables --set "NEXT_PUBLIC_API_URL=$focusedApi" -e production -s $frontendService
            Write-Host "Triggering restart for frontend service..." -ForegroundColor Gray
            & railway variables --set "RESTART_AT=$(Get-Date -Format o)" -e production -s $frontendService
            Write-Host "Frontend env updated and restart requested." -ForegroundColor Green
        } catch {
            Write-Host "Error while setting variables for ${frontendService}:" -ForegroundColor Red
            Write-Host $_.Exception.Message
        }
    } else {
        Write-Host "Skipped setting frontend env." -ForegroundColor Yellow
    }
}

# Always restart focused-friendship backend so it picks any new envs
$confirmBackend = Read-Host "Do you also want to restart the focused-friendship backend now? (y/N)"
if ($confirmBackend -match '^(y|Y)') {
    try {
        Write-Host "Restarting focused-friendship (setting RESTART_AT)..." -ForegroundColor Gray
        & railway variables --set "RESTART_AT=$(Get-Date -Format o)" -e production -s focused-friendship
        Write-Host "Restart requested for focused-friendship." -ForegroundColor Green
    } catch {
        Write-Host "Failed to restart focused-friendship via Railway CLI. Make sure you have access and the service exists." -ForegroundColor Red
        Write-Host $_.Exception.Message
    }
} else {
    Write-Host "Skipped backend restart." -ForegroundColor Yellow
}

# Optionally create empty commit to trigger a rebuild (useful if hosting auto-deploys from git)
$commitNow = Read-Host "Do you want to create an empty commit and push to trigger a frontend rebuild? (y/N)"
if ($commitNow -match '^(y|Y)') {
    try {
        Write-Host "Creating empty commit and pushing..." -ForegroundColor Gray
        & git commit --allow-empty -m "rebuild frontend -> point to focused-friendship API"
        & git push
        Write-Host "Empty commit pushed." -ForegroundColor Green
    } catch {
        Write-Host "Failed to create/push empty commit. Ensure you have git configured and network access." -ForegroundColor Red
        Write-Host $_.Exception.Message
    }
}

Write-Host "
Done. After the frontend has rebuilt/deployed, open the production site and check DevTools Network -> /api/products to confirm Request URL is:
$focusedApi
" -ForegroundColor Cyan
