@echo off
cls
echo 🚀 [GIT AUTOMATION] Iniciando o processo de upload...

:: Adiciona todas as mudanças (Views, Styles e Firebase configs)
git add .

:: Pergunta a mensagem do commit
set /p msg="Digite o que voce mudou hoje: "

:: Faz o commit com a sua mensagem
git commit -m "%msg%"

:: Envia para o GitHub
echo 📦 Enviando para o repositório remoto...
git push origin main

echo.
echo ✅ Sucesso! O Laboratorio Churn esta atualizado no GitHub.
echo.
pause