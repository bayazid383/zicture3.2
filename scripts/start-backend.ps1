Param()

# Start the Flask backend in a new PowerShell window using the project's virtualenv
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$projectRoot = (Resolve-Path (Join-Path $scriptDir '..')).Path
Set-Location $projectRoot

# Ensure virtualenv exists and required packages are installed
$venvPython = Join-Path $projectRoot ".venv\Scripts\python.exe"
if (-not (Test-Path $venvPython)) {
    Write-Host ".venv not found. Creating virtual environment and installing requirements..."
    python -m venv "$projectRoot\.venv"
    & "$projectRoot\.venv\Scripts\python.exe" -m pip install --upgrade pip
    & "$projectRoot\.venv\Scripts\python.exe" -m pip install -r "$projectRoot\requirements.txt"
} else {
    # quick check for the 'google' package; install requirements if missing
    Try {
        $check = Start-Process -FilePath $venvPython -ArgumentList '-c', "import importlib.util, sys; sys.exit(0 if importlib.util.find_spec('google') else 1)" -NoNewWindow -Wait -PassThru -ErrorAction Stop
        if ($check.ExitCode -ne 0) {
            Write-Host "Required Python packages missing in venv; installing requirements..."
            Start-Process -FilePath $venvPython -ArgumentList '-m', 'pip', 'install', '-r', "$projectRoot\requirements.txt" -NoNewWindow -Wait
        }
    } Catch {
        Write-Host "Unable to verify venv packages; attempting to install requirements..."
        & "$projectRoot\.venv\Scripts\python.exe" -m pip install -r "$projectRoot\requirements.txt"
    }
}

# Stop any listener on port 5001
$ports = Get-NetTCPConnection -State Listen -LocalPort 5001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($procId in $ports) {
    Try { Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue } Catch {}
}

# Stop any running python app.py instances related to this project
Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and ($_.CommandLine -like '*Zicture*.venv*python.exe*app.py*' -or $_.CommandLine -like '*python.exe*app.py*') } | ForEach-Object { Try { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } Catch {} }

Start-Sleep -Seconds 1

# Launch a new PowerShell window that activates the venv and runs app.py
$pwshCmd = "& '$projectRoot\\.venv\\Scripts\\Activate.ps1'; python -u '$projectRoot\\app.py'"
Start-Process -FilePath 'powershell.exe' -ArgumentList '-NoExit','-ExecutionPolicy','Bypass','-Command',$pwshCmd -WorkingDirectory $projectRoot

Write-Host "Backend starting in a new PowerShell window (http://127.0.0.1:5001)."
