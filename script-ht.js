// Configurações e Estado Central
const CONDOMINIOS = [
    "Arosa", "Associação Master", "Baden", "Basel", "Bern", "Biel", "Botanico", "Davos", "Fribourg", 
    "Genebra", "Geneve", "Glarus", "La Vie", "Lauerz", "Lenk", "Lugano", "Luzern", 
    "Noville", "Office", "St. Moritz", "Vevey", "Villeneuve", "Zermatt", "Zurich"
];

let registros = [];
let db;
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
            registros = event.target.result;
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
    const identificacao = document.getElementById('identificacao').value.trim();
    const quantidade = document.getElementById('quantidade').value;

    if (!condominio || !identificacao || !quantidade) {
        alert("Preencha todos os campos antes de arrastar ou selecionar as fotos.");
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
                ctx.fillText(`📻 ${condominio} - ${identificacao} (Qtd: ${quantidade})`, 10, height - 10);
                
                registros.push({
                    id: Date.now() + Math.random(),
                    modo: 'ht',
                    condominio: condominio,
                    identificacao: identificacao,
                    quantidade: quantidade,
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
    
    // Fallback safe for old format without condominio/quantidade
    document.getElementById('edit-condominio').value = obj.condominio || '';
    document.getElementById('edit-identificacao').value = obj.identificacao || '';
    document.getElementById('edit-quantidade').value = obj.quantidade || 1;
}

function fecharModalEdicao() {
    document.getElementById('modal-edicao').style.display = 'none';
}

function salvarEdicao() {
    const id = parseFloat(document.getElementById('edit-id').value);
    const cond = document.getElementById('edit-condominio').value;
    const ident = document.getElementById('edit-identificacao').value.trim();
    const quant = document.getElementById('edit-quantidade').value;

    if (!cond || !ident || !quant) { alert("Preencha todos os campos!"); return; }

    const obj = registros.find(r => r.id === id);
    obj.condominio = cond;
    obj.identificacao = ident;
    obj.quantidade = quant;

    fecharModalEdicao();
    atualizarTela();
    salvarDadosOffline();
}

function limparFila() {
    const registrosAtuais = registros.filter(r => r.modo === 'ht');
    if (registrosAtuais.length === 0) return;
    
    if (confirm("Deseja apagar todas as fotos de HT / Equipamentos?")) {
        registros = registros.filter(r => r.modo !== 'ht');
        atualizarTela();
        salvarDadosOffline(); 
    }
}

// Removida a lógica de alternar ordenação e obterValorTempo (não mais usados)

function atualizarResumo(registrosAtuais) {
    const resumoDiv = document.getElementById('resumo-contador');
    const total = registrosAtuais.length;
    
    if (total === 0) {
        resumoDiv.innerHTML = `<p style="margin:0; color:var(--cor-texto-mutado);">Nenhum registro lançado ainda.</p>`;
        return;
    }

    const contagem = {};
    registrosAtuais.forEach(r => { 
        if(!contagem[r.condominio]) contagem[r.condominio] = 0;
        contagem[r.condominio] += parseInt(r.quantidade) || 1; 
    });
    
    let html = `<h3 style="color:#fbbc05;">Resumo Total de Aparelhos</h3><div class="resumo-lista">`;
    Object.keys(contagem).sort().forEach(cond => {
        if(cond && cond !== "undefined") {
           html += `<div>• ${cond}: <strong>Qtd: ${contagem[cond]}</strong></div>`;
        }
    });
    html += `</div>`;
    resumoDiv.innerHTML = html;
}

function atualizarTela() {
    const grid = document.getElementById('grid-fotos');
    grid.innerHTML = '';
    
    const busca = document.getElementById('filtro-busca').value.trim().toLowerCase();
    
    let registrosAtuais = registros.filter(r => r.modo === 'ht');
    if (busca !== '') {
        registrosAtuais = registrosAtuais.filter(r => 
            (r.condominio || '').toLowerCase().includes(busca) || 
            (r.identificacao || '').toLowerCase().includes(busca)
        );
    }

    document.getElementById('contador').innerText = registrosAtuais.length;
    
    atualizarResumo(registros.filter(r => r.modo === 'ht'));

    let regsOrdenados = [...registrosAtuais].sort((a, b) => {
        return (a.condominio || '').localeCompare(b.condominio || '');
    });

    let htmlRenderizado = "";
    regsOrdenados.forEach(reg => {
        let cond = reg.condominio || 'Sem Residencial';
        let ident = reg.identificacao || 'N/A';
        let qtd = reg.quantidade || 1;
        
        htmlRenderizado += `
            <div class="card-foto" style="border-top: 4px solid #fbbc05;">
                <button class="btn-editar" onclick="abrirModalEdicao(${reg.id})" title="Editar">✏️</button>
                <button class="btn-remover" onclick="removerFoto(${reg.id})" title="Remover">X</button>
                <span class="badge-condominio" style="background:#fbbc05; color:#333; font-weight:bold;">📌 ${cond}</span>
                <img src="${reg.foto}" loading="lazy">
                <p>Equip: <strong>${ident}</strong></p>
                <p>Qtd: <strong>${qtd}</strong></p>
            </div>
        `;
    });
    
    grid.innerHTML = htmlRenderizado;
}

function gerarPDF() {
    const registrosAtuais = registros.filter(r => r.modo === 'ht');
    if (registrosAtuais.length === 0) {
        alert("Adicione fotografias para gerar o relatório."); return;
    }

    if (!window.jspdf) { alert("Erro de PDF."); return; }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const dataHoje = new Date().toLocaleDateString('pt-BR');
    
    const tituloPDF = "Relatório Fotográfico - Controle de Equipamentos";
    
    doc.setFontSize(16); doc.setFont("helvetica", "bold");
    doc.text(tituloPDF, 105, 15, null, null, "center");
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text(`Data do Relatório: ${dataHoje}`, 105, 22, null, null, "center");
    doc.line(10, 25, 200, 25);
    let y = 35;

    // --- RESUMO NO PDF ---
    const contagem = {};
    let somaTotalQtd = 0;
    registrosAtuais.forEach(r => { 
        if(!contagem[r.condominio]) contagem[r.condominio] = 0;
        let q = parseInt(r.quantidade) || 1;
        contagem[r.condominio] += q; 
        somaTotalQtd += q;
    });
    
    doc.setFillColor(240, 240, 240);
    doc.rect(10, y - 5, 190, 8 + (Object.keys(contagem).length * 5) + 5, 'F');
    doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.text(`Resumo Operacional: Total de Equipamentos: ${somaTotalQtd}`, 15, y + 1);
    y += 7;

    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    let colX = 15; let linhaY = y; let itemCount = 0;
    Object.keys(contagem).sort().forEach(cond => {
        if(cond && cond !== "undefined") {
            doc.text(`• ${cond}: Qtd Total ${contagem[cond]}`, colX, linhaY);
            linhaY += 5; itemCount++;
            if (itemCount === 7) { colX += 60; linhaY = y; itemCount = 0; }
        }
    });
    y += (Object.keys(contagem).length <= 7 ? Object.keys(contagem).length * 5 : 35);
    y += 5; doc.line(10, y, 200, y); y += 10;

    // --- CORPO DO PDF ---
    let regsPDF = [...registrosAtuais].sort((a, b) => {
        return (a.condominio || '').localeCompare(b.condominio || '');
    });

    const corBase = [251, 188, 5]; 
    const corBg = [253, 246, 227]; 
    
    let x = 15; let colunaAtual = 0; let condominioAtual = "";

    regsPDF.forEach((reg, index) => {
        let cond = reg.condominio || 'Sem Residencial';
        if (cond !== condominioAtual) {
            if (colunaAtual !== 0) { y += 100; colunaAtual = 0; }
            condominioAtual = cond;
            if (y > 250) { doc.addPage(); y = 20; } else if (index !== 0) { y += 5; }

            doc.setFillColor(...corBg); doc.rect(10, y - 6, 190, 10, 'F');
            doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(...corBase); 
            doc.text(`RESIDENCIAL: ${condominioAtual}`, 15, y + 1);
            doc.setTextColor(0, 0, 0); y += 15;
        }

        if (y > 260) { doc.addPage(); y = 20; colunaAtual = 0; }
        x = 15 + (colunaAtual * 65);
        
        let ident = reg.identificacao || 'N/A';
        let qtd = reg.quantidade || 1;
        
        doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.text(`Equip: ${ident}`, x, y);
        doc.setFont("helvetica", "normal"); doc.text(`Qtd: ${qtd}`, x, y + 4);
        doc.addImage(reg.foto, 'JPEG', x, y + 8, 50, 70);
        
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
    doc.text("Assinatura do Responsável", 60, y + 5, null, null, "center");
    doc.text(`Assinatura da Central`, 150, y + 5, null, null, "center");

    doc.save(`Relatorio_Equipamentos_${dataHoje.replace(/\//g, '-')}.pdf`);

    setTimeout(() => {
        if (confirm("✅ Relatório gerado com sucesso!\n\nDeseja limpar a tela agora para o próximo plantão?")) {
            limparFila();
        }
    }, 1500);
}
