@echo off
chcp 65001 >nul
echo.
echo ========================================
echo   李涛的 RAG API 服务启动脚本
echo ========================================
echo.

:: 检查 Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Python，请先安装 Python
    pause
    exit /b 1
)

echo [检查] Python 已安装

:: 检查 .env 文件
if not exist ".env" (
    echo [警告] .env 文件不存在，将使用默认配置
    echo [提示] 请复制 .env.example 为 .env 并配置 API Key
) else (
    echo [检查] .env 文件已找到
)

:: 检查依赖
echo [检查] 检查依赖...
python -c "import fastapi" >nul 2>&1
if errorlevel 1 (
    echo [安装] 正在安装依赖...
    pip install -r requirements.txt
) else (
    echo [检查] 依赖已安装
)

echo.
echo ========================================
echo   启动服务...
echo ========================================
echo.
echo 服务地址：http://127.0.0.1:8000
echo API 文档：http://127.0.0.1:8000/docs
echo.
echo 按 Ctrl+C 停止服务
echo.

python api_server.py

pause
