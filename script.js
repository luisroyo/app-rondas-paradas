// Configurações e Estado Central
const CONDOMINIOS = [
    "Arosa", "Baden", "Basel", "Bern", "Biel", "Botanico", "Davos", "Fribourg", 
    "Genebra", "Geneve", "Glarus", "La Vie", "Lauerz", "Lenk", "Lugano", "Luzern", 
    "Noville", "Office", "St. Moritz", "Vevey", "Villeneuve", "Zermatt", "Zurich"
];

let registros = [];
let db;
let modoAtual = 'ronda'; // 'ronda' ou 'parada'
let modoOrdenacao = 'condominio';
let registroRemovido = null;
let timerToast = null;

// Inicialização da View
window.onload = () => {
    const selectCond = document.getElementById('condominio');
    const editCond = document.getElementById('edit-condominio');
    CONDOMINIOS.forEach(cond => {
        selectCond.appendChild(new Option(cond, cond));
        editCond.appendChild(new Option(cond, cond));
    });

    // Restaurar Tema Escuro
    if (localStorage.getItem('darkMode') === 'true') {
        document.getElementById('toggle-dark-mode').checked = true;
        document.body.classList.add('dark-mode');
    }

    mudarModo('ronda');
};

function alternarModoNoturno() {
    const isDark = document.getElementById('toggle-dark-mode').checked;
    if (isDark) {
        document.body.classList.add('dark-mode');
        localStorage.setItem('darkMode', 'true');
    } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('darkMode', 'false');
    }
}

function mudarModo(novoModo) {
    modoAtual = novoModo;
    document.body.className = novoModo === 'parada' ? 'tema-parada' : 'tema-ronda';
    if (document.getElementById('toggle-dark-mode').checked) {
        document.body.classList.add('dark-mode');
    }
    
    document.getElementById('aba-ronda').classList.toggle('ativa', novoModo === 'ronda');
    document.getElementById('aba-parada').classList.toggle('ativa', novoModo === 'parada');

    document.getElementById('titulo-painel').innerText = novoModo === 'ronda' ? 'Rondas Nos Residenciais' : 'Paradas Nos Residenciais';
    document.getElementById('label-agente').innerText = novoModo === 'ronda' ? 'Nome do Agente (Ronda):' : 'Nome do Agente/Viatura:';
    document.getElementById('agente').placeholder = novoModo === 'ronda' ? 'Ex: Silva' : 'Ex: Silva / VTR 01';

    const optionsFase = '<option value="">Selecione...</option>' + 
        (novoModo === 'ronda' 
            ? '<option value="Início da Ronda">Início da Ronda</option><option value="Término da Ronda">Término da Ronda</option>'
            : '<option value="Início da Parada">Início da Parada</option><option value="Término da Parada">Término da Parada</option>');
    
    document.getElementById('faseRegistro').innerHTML = optionsFase;
    
    // Preparar fomulário de edição também
    const optionsEditFase = novoModo === 'ronda' 
        ? '<option value="Início da Ronda">Início da Ronda</option><option value="Término da Ronda">Término da Ronda</option>'
        : '<option value="Início da Parada">Início da Parada</option><option value="Término da Parada">Término da Parada</option>';
    document.getElementById('edit-fase').innerHTML = optionsEditFase;

    document.getElementById('condominio').value = '';
    document.getElementById('agente').value = '';
    document.getElementById('horario').value = '';

    atualizarTela();
}

// Banco de Dados IndexedDB unificado
const requestDB = indexedDB.open("RelatoriosAppDB", 1);
requestDB.onupgradeneeded = function(event) {
    db = event.target.result;
    if (!db.objectStoreNames.contains("dados_operacionais")) {
        db.createObjectStore("dados_operacionais");
    }
};
requestDB.onsuccess = function(event) {
    db = event.target.result;
    carregarDadosOffline();
};
requestDB.onerror = function() {
    mostrarAvisoSalvo("⚠️ Erro no banco de dados do navegador");
};

function salvarDadosOffline() {
    if (!db) return;
    const transaction = db.transaction(["dados_operacionais"], "readwrite");
    const store = transaction.objectStore("dados_operacionais");
    store.put(registros, "lista_atual");
    transaction.oncomplete = function() { mostrarAvisoSalvo("✅ Salvo no banco seguro"); };
}

function carregarDadosOffline() {
    if (!db) return;
    const store = db.transaction(["dados_operacionais"], "readonly").objectStore("dados_operacionais");
    const request = store.get("lista_atual");
    request.onsuccess = function(event) {
        if (event.target.result) {
            registros = event.target.result.map(r => ({...r, modo: r.modo || 'ronda'}));
            atualizarTela();
        }
    };
}

function mostrarAvisoSalvo(mensagem) {
    const aviso = document.getElementById('status-salvo');
    aviso.innerText = mensagem;
    setTimeout(() => { aviso.innerText = ""; }, 3000); 
}

// Drag and Drop & Input Config
const dropArea = document.getElementById('drop-area');
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(e => { dropArea.addEventListener(e, preventD, false); document.body.addEventListener(e, preventD, false); });
function preventD(e) { e.preventDefault(); e.stopPropagation(); }
['dragenter', 'dragover'].forEach(e => dropArea.addEventListener(e, () => dropArea.classList.add('dragover'), false));
['dragleave', 'drop'].forEach(e => dropArea.addEventListener(e, () => dropArea.classList.remove('dragover'), false));
dropArea.addEventListener('drop', function(e) { 
    processarImagens(e.dataTransfer.files); 
}, false);

function acionarInputFotos() {
    document.getElementById('fotos-input').click();
}

function processarImagens(files) {
    const condominio = document.getElementById('condominio').value;
    const agente = document.getElementById('agente').value.trim();
    const faseRegistro = document.getElementById('faseRegistro').value;
    const horario = document.getElementById('horario').value;

    if (!condominio || !agente || !faseRegistro || !horario) {
        alert("Preencha todos os campos antes de arrastar ou selecionar as fotos.");
        document.getElementById('fotos-input').value = "";
        return;
    }

    if (!validarLogica(modoAtual, condominio, faseRegistro, null)) {
        document.getElementById('fotos-input').value = "";
        return;
    }

    const duplicado = registros.some(r => r.modo === modoAtual && r.condominio === condominio && r.fase === faseRegistro && r.horario === horario);
    if (duplicado && !confirm(`⚠️ ATENÇÃO: Você já lançou uma foto para ${condominio} (${faseRegistro}) exatamente às ${horario}.\n\nDeseja mesmo adicionar outra foto repetida para este horário e fase?`)) {
        document.getElementById('fotos-input').value = "";
        return;
    }

    if (files.length === 0) return;

    Array.from(files).forEach(file => {
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const MAX_WIDTH = 500; 
                let width = img.width; let height = img.height;
                if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                canvas.width = width; canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                // Marca d'água / Carimbo na foto garantido no Canvas
                ctx.fillStyle = "rgba(0, 0, 0, 0.6)"; // Tarja Preta Semi-transparente
                ctx.fillRect(0, height - 30, width, 30);
                
                ctx.fillStyle = "white";
                ctx.font = "bold 14px Arial";
                const isInicio = faseRegistro.startsWith('Início');
                ctx.fillText(`${isInicio ? '🟢' : '🔴'} ${faseRegistro} - ${condominio} às ${horario}`, 10, height - 10);
                
                registros.push({
                    id: Date.now() + Math.random(),
                    modo: modoAtual,
                    condominio: condominio,
                    agente: agente,
                    fase: faseRegistro,
                    horario: horario,
                    foto: canvas.toDataURL('image/jpeg', 0.6)
                });
                
                atualizarTela();
                salvarDadosOffline(); 
            }
            img.src = e.target.result;
        }
        reader.readAsDataURL(file);
    });

    document.getElementById('fotos-input').value = "";
    document.getElementById('horario').value = "";
    document.getElementById('faseRegistro').value = "";
}

// Logica de Validação
function validarLogica(modo, cond, faseStr, ignoreId) {
    let regs = registros.filter(r => r.modo === modo && r.condominio === cond && r.id !== ignoreId);
    const inicios = regs.filter(r => r.fase.startsWith('Início')).length;
    const terminos = regs.filter(r => r.fase.startsWith('Término')).length;

    if (faseStr.startsWith('Início') && inicios > terminos) {
        alert(`Erro: Você já possui um Início aberto sem Término para ${cond}.\n\nPor favor, lance o Término correspondente antes de iniciar um novo ciclo.`);
        return false;
    } else if (faseStr.startsWith('Término') && inicios <= terminos) {
        alert(`Erro: Não há nenhum Início aberto para ${cond}.\n\nVocê não pode lançar um Término sem antes lançar o Início.`);
        return false;
    }
    return true;
}

// Lixeira e Desfazer
function removerFoto(id) {
    const obj = registros.find(r => r.id === id);
    if (!obj) return;
    registroRemovido = obj; // Guarda pra lixeira
    registros = registros.filter(r => r.id !== id);
    atualizarTela();
    salvarDadosOffline(); 
    mostrarToastDesfazer();
}

function mostrarToastDesfazer() {
    const toast = document.getElementById('toast-desfazer');
    toast.classList.add('toast-visivel');
    clearTimeout(timerToast);
    timerToast = setTimeout(() => {
        toast.classList.remove('toast-visivel');
        registroRemovido = null;
    }, 5000);
}

function desfazerRemocao() {
    if (registroRemovido) {
        registros.push(registroRemovido);
        registroRemovido = null;
        document.getElementById('toast-desfazer').classList.remove('toast-visivel');
        atualizarTela();
        salvarDadosOffline();
    }
}

// Modal de Edição
function abrirModalEdicao(id) {
    const obj = registros.find(r => r.id === id);
    if (!obj) return;
    document.getElementById('modal-edicao').style.display = 'flex';
    document.getElementById('edit-id').value = obj.id;
    document.getElementById('edit-condominio').value = obj.condominio;
    document.getElementById('edit-agente').value = obj.agente;
    document.getElementById('edit-fase').value = obj.fase;
    document.getElementById('edit-horario').value = obj.horario;
}

function fecharModalEdicao() {
    document.getElementById('modal-edicao').style.display = 'none';
}

function salvarEdicao() {
    const id = parseFloat(document.getElementById('edit-id').value);
    const cond = document.getElementById('edit-condominio').value;
    const ag = document.getElementById('edit-agente').value.trim();
    const fase = document.getElementById('edit-fase').value;
    const hor = document.getElementById('edit-horario').value;

    if (!ag || !hor) { alert("Preencha todos os campos!"); return; }

    // Validar fluxo se a fase ou condomínio mudaram
    const obj = registros.find(r => r.id === id);
    if (obj.fase !== fase || obj.condominio !== cond) {
        if (!validarLogica(obj.modo, cond, fase, id)) return;
    }

    obj.condominio = cond;
    obj.agente = ag;
    obj.fase = fase;
    obj.horario = hor;

    fecharModalEdicao();
    atualizarTela();
    salvarDadosOffline();
}

function limparFila() {
    const registrosAtuais = registros.filter(r => r.modo === modoAtual);
    if (registrosAtuais.length === 0) return;
    
    let confirmMsg = modoAtual === 'ronda' ? "Deseja apagar todas as fotos de RONDAS?" : "Deseja apagar todas as fotos de PARADAS?";
    if (confirm(confirmMsg)) {
        registros = registros.filter(r => r.modo !== modoAtual);
        atualizarTela();
        salvarDadosOffline(); 
    }
}

function alternarOrdenacao() {
    modoOrdenacao = modoOrdenacao === 'condominio' ? 'horario' : 'condominio';
    document.getElementById('btn-ordem').innerText = modoOrdenacao === 'condominio' 
        ? 'Visualizando: Por Residencial 🔄' : 'Visualizando: Por Horário 🔄';
    atualizarTela();
}

function obterValorTempo(horaStr) {
    let valor = parseInt(horaStr.replace(':', ''));
    if (valor < 1800) { valor += 2400; }
    return valor;
}

function atualizarResumo(registrosAtuais) {
    const resumoDiv = document.getElementById('resumo-contador');
    const inicios = registrosAtuais.filter(r => r.fase.startsWith('Início'));
    const total = inicios.length;
    
    if (total === 0) {
        resumoDiv.innerHTML = `<p style="margin:0; color:var(--cor-texto-mutado);">Nenhum plantão iniciado ainda.</p>`;
        return;
    }

    const contagem = {};
    inicios.forEach(r => { contagem[r.condominio] = (contagem[r.condominio] || 0) + 1; });
    const txtPlural = modoAtual === 'ronda' ? 'Rondas Realizadas' : 'Paradas Realizadas';
    let html = `<h3>Resumo do Plantão: ${total} ${txtPlural}</h3><div class="resumo-lista">`;
    Object.keys(contagem).sort().forEach(cond => {
        html += `<div>• ${cond}: <strong>${contagem[cond]}</strong></div>`;
    });
    html += `</div>`;
    resumoDiv.innerHTML = html;
}

function atualizarTela() {
    const grid = document.getElementById('grid-fotos');
    grid.innerHTML = '';
    
    const busca = document.getElementById('filtro-busca').value.trim().toLowerCase();
    
    // Filtramos pelo modo E pelo campo de busca
    let registrosAtuais = registros.filter(r => r.modo === modoAtual);
    if (busca !== '') {
        registrosAtuais = registrosAtuais.filter(r => 
            r.condominio.toLowerCase().includes(busca) || 
            r.agente.toLowerCase().includes(busca)
        );
    }

    document.getElementById('contador').innerText = registrosAtuais.length;
    
    // O resumo conta APENAS sobre o que está sendo exibido, mas sem o filtro de texto para não bugar a conta base
    atualizarResumo(registros.filter(r => r.modo === modoAtual));

    let regsOrdenados = [...registrosAtuais].sort((a, b) => {
        if (modoOrdenacao === 'condominio') {
            if (a.condominio === b.condominio) return obterValorTempo(a.horario) - obterValorTempo(b.horario);
            return a.condominio.localeCompare(b.condominio);
        } else {
            let tempoA = obterValorTempo(a.horario);
            let tempoB = obterValorTempo(b.horario);
            if (tempoA === tempoB) return a.condominio.localeCompare(b.condominio);
            return tempoA - tempoB;
        }
    });

    let htmlRenderizado = "";
    regsOrdenados.forEach(reg => {
        let classeFase = reg.fase.startsWith('Início') ? 'inicio' : 'termino';
        htmlRenderizado += `
            <div class="card-foto ${classeFase}">
                <button class="btn-editar" onclick="abrirModalEdicao(${reg.id})" title="Editar">✏️</button>
                <button class="btn-remover" onclick="removerFoto(${reg.id})" title="Remover">X</button>
                <span class="badge-condominio">📌 ${reg.condominio}</span>
                <img src="${reg.foto}" loading="lazy">
                <p>Agente: <strong>${reg.agente}</strong></p>
                <p>⏰ <strong>${reg.horario}</strong></p>
                <span class="badge-fase ${classeFase}">${reg.fase}</span>
            </div>
        `;
    });
    
    grid.innerHTML = htmlRenderizado;
}

function gerarPDF() {
    const registrosAtuais = registros.filter(r => r.modo === modoAtual);
    if (registrosAtuais.length === 0) {
        alert("Adicione fotografias para gerar o relatório."); return;
    }

    const supervisor = document.getElementById('supervisor').value || "Não informado";
    const turno = document.getElementById('turno').value;
    if (!window.jspdf) { alert("Erro de PDF."); return; }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const dataHoje = new Date().toLocaleDateString('pt-BR');
    
    const tituloPDF = modoAtual === 'ronda' ? "Relatório Fotográfico de Rondas" : "Relatório Fotográfico de Paradas";
    
    doc.setFontSize(18); doc.setFont("helvetica", "bold");
    doc.text(tituloPDF, 105, 15, null, null, "center");
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text(`Turno: ${turno} | Data: ${dataHoje} | Supervisor: ${supervisor}`, 105, 22, null, null, "center");
    doc.line(10, 25, 200, 25);
    let y = 35;

    // --- RESUMO NO PDF ---
    const inicios = registrosAtuais.filter(r => r.fase.startsWith('Início'));
    const contagem = {};
    inicios.forEach(r => { contagem[r.condominio] = (contagem[r.condominio] || 0) + 1; });
    const totalAcoes = inicios.length;
    
    doc.setFillColor(240, 240, 240);
    doc.rect(10, y - 5, 190, 8 + (Object.keys(contagem).length * 5) + 5, 'F');
    doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.text(`Resumo Operacional: ${totalAcoes} ${modoAtual === 'ronda' ? 'Rondas' : 'Paradas'} Realizadas`, 15, y + 1);
    y += 7;

    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    let colX = 15; let linhaY = y; let itemCount = 0;
    Object.keys(contagem).sort().forEach(cond => {
        doc.text(`• ${cond}: ${contagem[cond]}`, colX, linhaY);
        linhaY += 5; itemCount++;
        if (itemCount === 7) { colX += 60; linhaY = y; itemCount = 0; }
    });
    y += (Object.keys(contagem).length <= 7 ? Object.keys(contagem).length * 5 : 35);
    y += 5; doc.line(10, y, 200, y); y += 10;

    // --- CORPO DO PDF ---
    let regsPDF = [...registrosAtuais].sort((a, b) => {
        if (a.condominio === b.condominio) return obterValorTempo(a.horario) - obterValorTempo(b.horario);
        return a.condominio.localeCompare(b.condominio);
    });

    const corBase = modoAtual === 'ronda' ? [26, 115, 232] : [0, 105, 92];
    const corBg = modoAtual === 'ronda' ? [230, 240, 255] : [224, 242, 241];
    
    let x = 15; let colunaAtual = 0; let condominioAtual = "";

    regsPDF.forEach((reg, index) => {
        if (reg.condominio !== condominioAtual) {
            if (colunaAtual !== 0) { y += 100; colunaAtual = 0; }
            condominioAtual = reg.condominio;
            if (y > 250) { doc.addPage(); y = 20; } else if (index !== 0) { y += 5; }

            doc.setFillColor(...corBg); doc.rect(10, y - 6, 190, 10, 'F');
            doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(...corBase); 
            doc.text(`RESIDENCIAL: ${condominioAtual}${modoAtual === 'parada' ? ' (Ponto Base)' : ''}`, 15, y + 1);
            doc.setTextColor(0, 0, 0); y += 15;
        }

        if (y > 260) { doc.addPage(); y = 20; colunaAtual = 0; }
        x = 15 + (colunaAtual * 65);
        doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.text(`Agente: ${reg.agente}`, x, y);
        doc.setFont("helvetica", "normal"); doc.text(`Fase: ${reg.fase}`, x, y + 4); doc.text(`Horário: ${reg.horario}`, x, y + 8);
        doc.addImage(reg.foto, 'JPEG', x, y + 10, 50, 70);
        
        colunaAtual++;
        if (colunaAtual === 3) { colunaAtual = 0; y += 90; }
    });

    // --- ASSINATURAS NO PDF ---
    if (colunaAtual > 0) y += 90; // descer do ultimo bloco de fotos
    if (y > 240) { doc.addPage(); y = 40; } else { y += 20; }
    
    doc.setDrawColor(0);
    doc.line(30, y, 90, y);
    doc.line(120, y, 180, y);
    
    doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    doc.text("Assinatura do Supervisor", 60, y + 5, null, null, "center");
    doc.text(`Assinatura da Central`, 150, y + 5, null, null, "center");

    const prefixo = modoAtual === 'ronda' ? 'Rondas' : 'Paradas';
    doc.save(`Relatorio_${prefixo}_${turno.split(' ')[0]}_${dataHoje.replace(/\//g, '-')}.pdf`);

    // Limpeza Automática Opcional Pós-PDF
    setTimeout(() => {
        if (confirm("✅ Relatório gerado com sucesso!\n\nDeseja limpar a tela agora para o próximo plantão?")) {
            limparFila();
        }
    }, 1500);
}
