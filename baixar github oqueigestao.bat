@echo off
TITLE Oquei Gestão - Sincronizar e Rodar
cls

echo ======================================================
echo           OQUEI GESTAO - SYNC SYSTEM (HOME)
echo ======================================================
echo.
echo [1/2] Puxando ultimas alteracoes do GitHub...
git pull origin main

echo.
echo [2/2] Iniciando servidor de desenvolvimento...
echo.
echo 🚀 O sistema abrira em instantes...
echo.

:: Inicia o servidor
npm run dev

:: Se o comando acima falhar por algum motivo, mantem a janela aberta
if %errorlevel% neq 0 (
    echo.
    echo [ERRO] Ocorreu um problema ao iniciar o servidor.
    pause
)