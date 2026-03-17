import fs from 'fs';
import path from 'path';

// 1. Defina as pastas E os arquivos específicos que queremos ler
const caminhosAlvo = [
    './src/HubCrescimento', // Nossa pasta principal
    './src/App.jsx',        // Rotas principais
    './src/App.js',         // Caso use .js
    './firebase.json',      // Configurações do Firebase
    './firestore.rules',    // Regras de Segurança
    './firestore.indexes.json', // Nossos Índices Compostos
    './firebase.rules'      // Caso tenha esse nome
]; 

const arquivoFinal = './codigo-hub-completo.txt';
const extensoesValidas = ['.js', '.jsx', '.css', '.json', '.rules'];

function lerArquivos(caminho, listaArquivos = []) {
    if (!fs.existsSync(caminho)) return listaArquivos; // Pula se o arquivo/pasta não existir

    const stat = fs.statSync(caminho);

    if (stat.isDirectory()) {
        const itens = fs.readdirSync(caminho);
        for (const item of itens) {
            lerArquivos(path.join(caminho, item), listaArquivos);
        }
    } else {
        const extensao = path.extname(caminho);
        // Se não tem extensão (ex: firestore.rules) ou tem extensão válida
        if (!extensao || extensoesValidas.includes(extensao)) {
            listaArquivos.push(caminho);
        }
    }
    return listaArquivos;
}

try {
    let todosArquivos = [];
    caminhosAlvo.forEach(caminho => {
        todosArquivos = lerArquivos(caminho, todosArquivos);
    });

    let conteudoCombinado = '';

    todosArquivos.forEach(arquivo => {
        const conteudo = fs.readFileSync(arquivo, 'utf-8');
        conteudoCombinado += `\n\n// ==========================================\n`;
        conteudoCombinado += `// 📄 ARQUIVO: ${arquivo.replace(/\\/g, '/')}\n`;
        conteudoCombinado += `// ==========================================\n\n`;
        conteudoCombinado += conteudo;
    });

    fs.writeFileSync(arquivoFinal, conteudoCombinado, 'utf-8');
    console.log(`✅ Sucesso Absoluto! ${todosArquivos.length} arquivos combinados em "${arquivoFinal}".`);
} catch (erro) {
    console.error('❌ Erro ao processar:', erro.message);
}