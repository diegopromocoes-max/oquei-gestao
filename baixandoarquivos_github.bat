@echo off
TITLE Oquei Gestao - Sincronizar e Rodar (Trabalho)
cls

echo ======================================================
echo           OQUEI GESTAO - SYNC SYSTEM (WORK)
echo ======================================================
echo.

echo [1/3] Acessando a pasta do projeto...
cd /d C:\Oquei\oquei-gestao

echo.
echo [2/3] Puxando ultimas alteracoes do GitHub...
git pull origin main

echo.
echo [3/3] Iniciando servidor de desenvolvimento...
echo 🚀 O sistema abrira em instantes...
echo.

:: Dica: Se voce instalou alguma biblioteca nova em casa (como o recharts), 
:: remova os dois pontos (::) da linha abaixo para ele instalar automaticamente aqui tambem.
:: npm install

:: Inicia o servidor Vite
npm run dev

:: Se o comando falhar, mantem a tela preta aberta para lermos o erro
if %errorlevel% neq 0 (
    echo.
    echo [ERRO] Ocorreu um problema ao iniciar o servidor.
    pause
)