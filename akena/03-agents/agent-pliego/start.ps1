# start.ps1 — arranque de agent-pliego con variables de entorno desde .env
$agentDir = $PSScriptRoot
$sharedDir = Split-Path -Parent $agentDir

Set-Location $agentDir

# Leer .env y exportar cada variable al proceso actual
Get-Content "$agentDir\.env" | ForEach-Object {
    if ($_ -match "^([^#\s][^=]*)=(.*)$") {
        $name  = $matches[1].Trim()
        $value = $matches[2].Trim()
        Set-Item -Path "Env:$name" -Value $value
    }
}

# PYTHONPATH debe apuntar a 03-agents para que "shared" sea importable
$env:PYTHONPATH = $sharedDir

Write-Host "[agent-pliego] Arrancando en puerto $env:PORT ..."
Write-Host "[agent-pliego] LLM: $env:LLM_PROVIDER_TYPE / $env:ANTHROPIC_MODEL"
Write-Host "[agent-pliego] API key present: $([bool]$env:ANTHROPIC_API_KEY)"

python -m uvicorn src.main:app --host 0.0.0.0 --port $env:PORT --log-level info
