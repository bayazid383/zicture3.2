Param()

# Start both backend and frontend helper scripts from the project root.
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$projectRoot = (Resolve-Path (Join-Path $scriptDir '..')).Path
Set-Location $projectRoot

Write-Host "Starting backend and frontend..."
& "$projectRoot\scripts\start-backend.ps1"
Start-Sleep -Seconds 2
& "$projectRoot\scripts\start-frontend.ps1"

Write-Host "Launched start-backend and start-frontend; check http://127.0.0.1:5001 and the Vite dev server output window."
