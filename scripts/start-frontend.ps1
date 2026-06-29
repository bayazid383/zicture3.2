Param()

# Start the Vite frontend dev server in a new PowerShell window
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$projectRoot = (Resolve-Path (Join-Path $scriptDir '..')).Path
Set-Location $projectRoot

# Stop common Vite ports if present
$ports = Get-NetTCPConnection -State Listen -LocalPort 5173,5174 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($procId in $ports) {
    Try { Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue } Catch {}
}

Start-Sleep -Seconds 1

$cmd = "cd '$projectRoot'; npm run dev"
Start-Process -FilePath 'powershell.exe' -ArgumentList '-NoExit','-ExecutionPolicy','Bypass','-Command',$cmd -WorkingDirectory $projectRoot

Write-Host "Frontend dev server starting in a new PowerShell window (Vite)."
