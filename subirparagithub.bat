@echo off
chcp 65001 >nul
echo ==========================================
echo    ATUALIZANDO PROJETO NO GITHUB (OQUEI)
echo ==========================================
echo.

:: 1. Adiciona todos os arquivos modificados
git add .

:: 2. Pede para você digitar o que mudou (mensagem do commit)
set /p msg="O que voce alterou nesta versao? (ou aperte Enter para padrao): "

:: Se não digitar nada, usa uma mensagem padrão
if "%msg%"=="" set msg=Atualizacao do Simulador SOP e configuracoes

:: 3. Cria o commit com a mensagem
git commit -m "%msg%"

:: 4. Envia para o GitHub (mude 'main' para 'master' se a sua branch principal for master)
echo.
echo Enviando para o GitHub...
git push origin main

echo.
echo ==========================================
echo    UPLOAD CONCLUIDO COM SUCESSO!
echo ==========================================
pause