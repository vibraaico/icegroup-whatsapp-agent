# Levantar N8N + ngrok para ICEGROUP WhatsApp Agent
# Doble click en este archivo o ejecutar: powershell -ExecutionPolicy Bypass -File start-local.ps1

$NODE    = "C:\Program Files\nodejs\node.exe"
$NPM     = "C:\Program Files\nodejs\npm.cmd"
$LT_CMD  = "C:\Users\User\AppData\Roaming\npm\lt.cmd"
$N8N_CMD = "$env:APPDATA\npm\n8n.cmd"
$PROJECT = Split-Path -Parent $MyInvocation.MyCommand.Path
$ENV_FILE = Join-Path $PROJECT ".env"

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  ICEGROUP WhatsApp Agent - Local    " -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Cargar .env
if (Test-Path $ENV_FILE) {
    Get-Content $ENV_FILE | ForEach-Object {
        if ($_ -match "^([^#][^=]+)=(.+)$") {
            $key   = $matches[1].Trim()
            $value = $matches[2].Trim()
            [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
    Write-Host "[OK] Variables cargadas desde .env" -ForegroundColor Green
} else {
    Write-Host "[!] No se encontro .env — rellena tus credenciales primero" -ForegroundColor Red
    Write-Host "    Copia .env.example a .env y completa los valores." -ForegroundColor Yellow
    pause
    exit 1
}

# Configurar N8N
$env:N8N_PORT                        = "5678"
$env:N8N_ENCRYPTION_KEY              = if ($env:N8N_ENCRYPTION_KEY) { $env:N8N_ENCRYPTION_KEY } else { "icegroup_local_key_2024_secure_32" }
$env:NODE_FUNCTION_ALLOW_BUILTIN     = "*"
$env:NODE_FUNCTION_ALLOW_EXTERNAL    = "*"
$env:EXECUTIONS_DATA_SAVE_ON_ERROR   = "all"
$env:EXECUTIONS_DATA_SAVE_ON_SUCCESS = "all"
$env:N8N_LOG_LEVEL                   = "info"

# Verificar que N8N existe
if (-not (Test-Path $N8N_CMD)) {
    Write-Host "[!] N8N no encontrado. Instalando..." -ForegroundColor Yellow
    & $NPM install -g n8n
}

# --- INICIAR N8N ---
Write-Host ""
Write-Host "[1/2] Iniciando N8N en http://localhost:5678 ..." -ForegroundColor Yellow
$n8nProcess = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c `"$N8N_CMD`" start" `
    -PassThru -WindowStyle Minimized

Write-Host "      Esperando que N8N arranque (20s)..." -ForegroundColor Gray
Start-Sleep -Seconds 20

# --- INICIAR LOCALTUNNEL ---
Write-Host "[2/2] Iniciando tunel localtunnel..." -ForegroundColor Yellow
$ltLog = "$PROJECT\lt.log"
$ltProcess = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c `"$LT_CMD`" --port 5678 --subdomain icegroup-agent" `
    -PassThru -WindowStyle Minimized -RedirectStandardOutput $ltLog

Start-Sleep -Seconds 8

# Leer URL de localtunnel desde el log
$publicUrl = $null
$ltContent = Get-Content $ltLog -ErrorAction SilentlyContinue -Raw
if ($ltContent -match "your url is: (https://\S+)") {
    $publicUrl = $matches[1]
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
if ($publicUrl) {
    Write-Host "  N8N PANEL:     http://localhost:5678" -ForegroundColor Green
    Write-Host "  URL PUBLICA:   $publicUrl" -ForegroundColor Green
    Write-Host "  WEBHOOK META:  $publicUrl/webhook/whatsapp" -ForegroundColor Yellow
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host ""
    Write-Host ">>> Copia la URL del WEBHOOK en:" -ForegroundColor Cyan
    Write-Host "    Meta Developers > WhatsApp > Configuration > Callback URL" -ForegroundColor Cyan
    Write-Host ""
    Write-Host ">>> Verify Token: $($env:META_VERIFY_TOKEN)" -ForegroundColor Cyan

    # Copiar URL al portapapeles
    "$publicUrl/webhook/whatsapp" | Set-Clipboard
    Write-Host ""
    Write-Host "[OK] URL del webhook copiada al portapapeles" -ForegroundColor Green
} else {
    Write-Host "  N8N:    http://localhost:5678" -ForegroundColor Green
    Write-Host "  ngrok:  abre http://localhost:4040 para ver la URL publica" -ForegroundColor Yellow
    Write-Host "=====================================" -ForegroundColor Green
}

Write-Host ""
Write-Host "Proximos pasos:" -ForegroundColor White
Write-Host "  1. Abre http://localhost:5678 en el navegador" -ForegroundColor White
Write-Host "  2. Importa el workflow: n8n/workflows/agente_icegroup.json" -ForegroundColor White
Write-Host "  3. Activa el workflow (toggle Inactive > Active)" -ForegroundColor White
Write-Host "  4. Pega la URL del webhook en Meta Developers" -ForegroundColor White
Write-Host ""
Write-Host "Presiona Enter para detener todos los servicios..." -ForegroundColor Gray
Read-Host

# Limpiar
if ($n8nProcess -and !$n8nProcess.HasExited)  { Stop-Process -Id $n8nProcess.Id -Force -ErrorAction SilentlyContinue }
if ($ltProcess  -and !$ltProcess.HasExited)   { Stop-Process -Id $ltProcess.Id  -Force -ErrorAction SilentlyContinue }
Write-Host "Servicios detenidos." -ForegroundColor Gray
