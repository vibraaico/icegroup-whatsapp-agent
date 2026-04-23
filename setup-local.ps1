# Setup local ICEGROUP WhatsApp Agent
# Ejecutar en PowerShell como Administrador: .\setup-local.ps1

$ErrorActionPreference = "Stop"

Write-Host "=== ICEGROUP Local Setup ===" -ForegroundColor Cyan

# 1. Verificar winget
Write-Host "`n[1/4] Verificando winget..." -ForegroundColor Yellow
if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    Write-Host "Instala winget desde https://aka.ms/winget-cli" -ForegroundColor Red
    exit 1
}

# 2. Instalar Node.js LTS
Write-Host "`n[2/4] Instalando Node.js LTS..." -ForegroundColor Yellow
winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
refreshenv

# 3. Instalar N8N globalmente
Write-Host "`n[3/4] Instalando N8N..." -ForegroundColor Yellow
npm install -g n8n

# 4. Instalar ngrok
Write-Host "`n[4/4] Instalando ngrok..." -ForegroundColor Yellow
winget install Ngrok.Ngrok --accept-source-agreements --accept-package-agreements

Write-Host "`n=== Instalacion completa ===" -ForegroundColor Green
Write-Host "Ahora ejecuta: .\start-local.ps1" -ForegroundColor Cyan
