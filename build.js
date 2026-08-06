const fs = require('fs-extra');
const path = require('path');

// Raiz do projeto = diretório onde build.js está
const PROJECT_ROOT = __dirname;

function buildTypeScript() {
    console.log('Iniciando build do TypeScript...');
    console.log('PROJECT_ROOT:', PROJECT_ROOT);
    console.log('process.cwd():', process.cwd());
    console.log('Node version:', process.version);

    const ts = require('typescript');
    console.log('TypeScript version:', ts.version);

    // Garantir que a pasta dist existe
    const distPath = path.join(PROJECT_ROOT, 'dist');
    if (!fs.existsSync(distPath)) {
        fs.mkdirSync(distPath, { recursive: true });
        console.log(`Pasta criada: ${distPath}`);
    }

    // Localizar tsconfig.json a partir da raiz do projeto (não do cwd)
    const configPath = ts.findConfigFile(PROJECT_ROOT, ts.sys.fileExists, 'tsconfig.json');

    if (!configPath) {
        console.error('tsconfig.json não encontrado em: ' + PROJECT_ROOT);
        process.exit(1);
    }
    console.log('tsconfig.json encontrado em:', configPath);

    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    if (configFile.error) {
        console.error('Erro ao ler tsconfig.json:', ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n'));
        process.exit(1);
    }

    // Usar PROJECT_ROOT como basePath para resolver caminhos do tsconfig
    const compilerOptions = ts.parseJsonConfigFileContent(
        configFile.config,
        ts.sys,
        PROJECT_ROOT
    );

    if (compilerOptions.errors && compilerOptions.errors.length > 0) {
        compilerOptions.errors.forEach(e => {
            console.error(ts.flattenDiagnosticMessageText(e.messageText, '\n'));
        });
        process.exit(1);
    }

    console.log('outDir resolvido:', compilerOptions.options.outDir);
    console.log('rootDir resolvido:', compilerOptions.options.rootDir);
    console.log('arquivos fonte encontrados:', compilerOptions.fileNames.length);

    console.log('Compilando TypeScript...');
    const program = ts.createProgram(compilerOptions.fileNames, compilerOptions.options);
    const emitResult = program.emit();

    console.log('emitSkipped:', emitResult.emitSkipped);

    const allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);

    let hasErrors = false;
    allDiagnostics.forEach(diagnostic => {
        if (diagnostic.file) {
            const { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start);
            const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
            console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
        } else {
            console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
        }
        if (diagnostic.category === ts.DiagnosticCategory.Error) {
            hasErrors = true;
        }
    });

    if (hasErrors) {
        console.error('Build falhou com erros de compilação');
        process.exit(1);
    }

    if (emitResult.emitSkipped) {
        console.error('Build falhou - emissão de arquivos ignorada');
        process.exit(1);
    }

    // Verificar arquivos gerados usando paths absolutos
    console.log('Verificando arquivos compilados...');
    console.log('Conteúdo de dist/:', fs.existsSync(distPath) ? fs.readdirSync(distPath) : 'pasta não existe');

    const requiredFiles = [
        'dist/server.js',
        'dist/stream/StreamHandler.js',
        'dist/utils/logger.js',
        'dist/types/index.js',
        'dist/stream/StaticResponseService.js'
    ];

    const missingFiles = requiredFiles.filter(f => !fs.existsSync(path.join(PROJECT_ROOT, f)));

    if (missingFiles.length > 0) {
        console.error('Arquivos compilados faltando:');
        missingFiles.forEach(file => console.error(`- ${file}`));
        console.error('Build incompleto - alguns arquivos não foram gerados');
        process.exit(1);
    }

    console.log('\nBuild concluído com sucesso!');
    console.log('Arquivos compilados disponíveis em: dist/');

    // Copiar pasta videos para dist/
    const srcVideos = path.join(PROJECT_ROOT, 'src', 'videos');
    const distVideos = path.join(PROJECT_ROOT, 'dist', 'videos');
    if (fs.existsSync(srcVideos)) {
        fs.copySync(srcVideos, distVideos, { overwrite: true });
        const videoFiles = fs.readdirSync(srcVideos).filter(f => f.endsWith('.mp4'));
        console.log(`Videos copiados para dist/videos/: ${videoFiles.length} arquivos`);
    } else {
        console.log('Aviso: pasta src/videos/ nao encontrada');
    }
}

buildTypeScript();
