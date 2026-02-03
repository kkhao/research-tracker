# 研究进展追踪 - 启动脚本
# 用法: .\start.ps1

Write-Host "=== 研究进展追踪 启动 ===" -ForegroundColor Cyan

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# 启动后端
Write-Host "`n[1/2] 启动后端 (FastAPI)..." -ForegroundColor Yellow
$backendJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location (Join-Path $dir "backend")
    if (Test-Path "venv\Scripts\Activate.ps1") {
        & "venv\Scripts\Activate.ps1"
    }
    pip install -r requirements.txt -q 2>$null
    uvicorn main:app --reload --port 8000
} -ArgumentList $rootDir

Start-Sleep -Seconds 3

# 启动前端
Write-Host "[2/2] 启动前端 (Next.js)..." -ForegroundColor Yellow
$frontendJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location (Join-Path $dir "frontend")
    if (-not (Test-Path "node_modules")) {
        npm install
    }
    npm run dev
} -ArgumentList $rootDir

Write-Host "`n等待服务启动..." -ForegroundColor Gray
Start-Sleep -Seconds 8

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  前端: http://localhost:3000" -ForegroundColor White
Write-Host "  后端: http://localhost:8000" -ForegroundColor White
Write-Host "  API 文档: http://localhost:8000/docs" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Green
Write-Host "`n按 Ctrl+C 停止所有服务" -ForegroundColor Gray

# 保持运行，显示日志
try {
    while ($true) {
        Receive-Job $backendJob, $frontendJob | ForEach-Object { Write-Host $_ }
        Start-Sleep -Seconds 2
    }
} finally {
    Stop-Job $backendJob, $frontendJob
    Remove-Job $backendJob, $frontendJob
}
