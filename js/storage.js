// Persistência de Dados (LocalStorage e IndexedDB)

function carregarHistoricoAgentes() {
    try {
        let hist = JSON.parse(localStorage.getItem('agentes_historico') || '[]');
        if (!Array.isArray(hist)) hist = [];
        let dl = document.getElementById('lista-agentes');
        if (dl) {
            dl.innerHTML = '';
            hist.forEach(nome => {
                let opt = document.createElement('option');
                opt.value = nome;
                dl.appendChild(opt);
            });
        }
    } catch(e) {
        console.error("Erro ao carregar histórico", e);
    }
}

function salvarNovoAgenteNoHistorico(nome) {
    if (!nome) return;
    try {
        let hist = JSON.parse(localStorage.getItem('agentes_historico') || '[]');
        if (!Array.isArray(hist)) hist = [];
        if (!hist.includes(nome)) {
            hist.push(nome);
            localStorage.setItem('agentes_historico', JSON.stringify(hist));
            carregarHistoricoAgentes();
        }
    } catch(e) {
        console.error("Erro ao salvar agente", e);
        localStorage.setItem('agentes_historico', JSON.stringify([nome]));
    }
}

function limparHistoricoAgentes() {
    if (confirm("Deseja limpar todos os nomes de agentes salvos na lista?")) {
        localStorage.removeItem('agentes_historico');
        carregarHistoricoAgentes();
        document.getElementById('agente').value = '';
    }
}

// Banco de Dados IndexedDB
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
            registros = event.target.result.map(r => {
                let cond = r.condominio;
                if (cond === 'Genebra' || cond === 'Eco Villa Genebra' || cond === 'Eco Villas Genebra') {
                    cond = 'Eco Vila Genebra';
                } else if (cond.toLowerCase() === 'casarão' || cond.toLowerCase() === 'casarao') {
                    cond = 'Bern';
                }
                return {...r, condominio: cond, modo: r.modo || 'ronda'};
            });
            atualizarTela();
        }
    };
}
