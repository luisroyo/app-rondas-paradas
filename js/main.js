// Ponto de Entrada Principal e Orquestração

window.onload = () => {
    const selectCond = document.getElementById('condominio');
    const editCond = document.getElementById('edit-condominio');

    // Restaurar Tema Escuro
    if (localStorage.getItem('darkMode') === 'true') {
        const toggle = document.getElementById('toggle-dark-mode');
        if (toggle) toggle.checked = true;
        document.body.classList.add('dark-mode');
    }

    // Eventos de persistência automática
    const agenteInput = document.getElementById('agente');
    if (agenteInput) {
        agenteInput.addEventListener('input', function() {
            localStorage.setItem('agente_salvo', this.value);
        });
    }

    const turnoSelect = document.getElementById('turno');
    const supervisorInput = document.getElementById('supervisor');
    
    if (supervisorInput) {
        supervisorInput.addEventListener('input', function() {
            localStorage.setItem('supervisor_salvo', this.value);
            
            const nome = this.value.toLowerCase().trim();
            if (nome.includes('luis') || nome.includes('simone') || nome.includes('romel')) {
                if (turnoSelect) {
                    turnoSelect.value = 'Noturno (18:00 às 06:00)';
                    localStorage.setItem('turno_salvo', turnoSelect.value);
                }
            } else if (nome.includes('arnaldo') || nome.includes('gleison')) {
                if (turnoSelect) {
                    turnoSelect.value = 'Diurno (06:00 às 18:00)';
                    localStorage.setItem('turno_salvo', turnoSelect.value);
                }
            }
        });
    }

    if (turnoSelect) {
        turnoSelect.addEventListener('change', function() {
            localStorage.setItem('turno_salvo', this.value);
        });
    }

    // Evento para preenchimento rápido via texto colado
    const textoResumo = document.getElementById('texto-resumo');
    if (textoResumo) {
        textoResumo.addEventListener('input', function() {
            inserirDadosRapidos(this.value);
        });
    }

    // Restaurar Supervisor e Turno se existirem
    if (localStorage.getItem('supervisor_salvo') && supervisorInput) {
        supervisorInput.value = localStorage.getItem('supervisor_salvo');
    }
    if (localStorage.getItem('turno_salvo') && turnoSelect) {
        turnoSelect.value = localStorage.getItem('turno_salvo');
    }

    mudarModo('ronda');
    carregarHistoricoAgentes();
};

// Preenchimento Automático via Texto Colado
function inserirDadosRapidos(texto) {
    if (!texto || !texto.trim()) return;
    
    // Normalização básica de texto
    texto = texto.replace(/st\.?\s*moritz/gi, 'St. Moritz');
    texto = texto.replace(/\bla\s*vie\b/gi, 'La Vie');
    texto = texto.replace(/eco\s*vill?[ea]s?(?:\s*genebra)?/gi, 'Eco Vila Genebra');
    texto = texto.replace(/\bgenebra\b/gi, 'Eco Vila Genebra');
    texto = texto.replace(/gen[eéè]ve/gi, 'Geneve');
    texto = texto.replace(/casar[ãa]o/gi, 'Bern');
    
    const textoLow = texto.toLowerCase();
    const textoUpper = texto.toUpperCase();
    
    // 1. Horário (HH:MM)
    const matchHora = texto.match(/\b(\d{2}:\d{2})\b/);
    if (matchHora) {
        document.getElementById('horario').value = matchHora[1];
    }
    
    // 2. Condomínio
    const listaCondominios = modoAtual === 'ronda' ? CONDOMINIOS_RONDA : CONDOMINIOS_PARADA;
    for (let cond of listaCondominios) {
        let condSimplificado = cond.toUpperCase().replace('ASSOCIAÇÃO ', '');
        if (textoUpper.includes(cond.toUpperCase()) || textoUpper.includes(condSimplificado)) {
            document.getElementById('condominio').value = cond;
            break;
        }
    }
    
    // 3. Fase
    if (textoLow.includes('inicio') || textoLow.includes('início') || textoLow.includes('inicial')) {
        document.getElementById('faseRegistro').value = modoAtual === 'ronda' ? "Início da Ronda" : "Início da Parada";
    } else if (textoLow.includes('termino') || textoLow.includes('término') || textoLow.includes('fim')) {
        document.getElementById('faseRegistro').value = modoAtual === 'ronda' ? "Término da Ronda" : "Término da Parada";
    }
    
    // 4. Agente / Moto / VTR
    let linhas = texto.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let linhasAgente = [];
    
    for (let linha of linhas) {
        let linhaL = linha.toLowerCase();
        
        let achouCond = false;
        for (let cond of listaCondominios) {
            let condS = cond.toLowerCase().replace('associação ', '');
            if (linhaL.includes(cond.toLowerCase()) || linhaL.includes(condS)) { achouCond = true; break; }
        }
        if (achouCond) continue;
        
        if (/\b\d{2}:\d{2}\b/.test(linha) || linhaL.includes('inicio') || linhaL.includes('início') || linhaL.includes('inicial') || linhaL.includes('termino') || linhaL.includes('término') || linhaL.includes('fim')) {
            continue;
        }
        
        linhasAgente.push(linha);
    }
    
    if (linhasAgente.length > 0) {
        let agenteValue = linhasAgente.join(' / ').replace(/\s+/g, ' ');
        document.getElementById('agente').value = agenteValue;
        localStorage.setItem('agente_salvo', agenteValue);
    }
}
