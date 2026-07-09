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
        supervisorInput.addEventListener('change', function() {
            localStorage.setItem('supervisor_salvo', this.value);
            
            const nome = this.value.toLowerCase().trim();
            if (nome === 'luis' || nome === 'romel') {
                if (turnoSelect) {
                    turnoSelect.value = 'Noturno (18:00 às 06:00)';
                    localStorage.setItem('turno_salvo', turnoSelect.value);
                }
            } else if (nome === 'arnaldo' || nome === 'gleison') {
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
    texto = texto.replace(/st\.?\s*moriti?[zs]/gi, 'St. Moritz');
    texto = texto.replace(/\bla\s*vie\b/gi, 'La Vie');
    texto = texto.replace(/eco\s*vill?[ea]s?(?:\s*genebra)?/gi, 'Eco Vila Genebra');
    texto = texto.replace(/\bgenebra\b/gi, 'Eco Vila Genebra');
    texto = texto.replace(/gen[eéè]ve/gi, 'Geneve');
    texto = texto.replace(/casar[ãa]o/gi, 'Bern');
    texto = texto.replace(/z[üu]rich/gi, 'Zurich');
    texto = texto.replace(/vil+eneuve/gi, 'Villeneuve');
    
    const textoLow = texto.toLowerCase();
    const textoUpper = texto.toUpperCase();
    
    // 1. Horário (HH:MM)
    const matchHora = texto.match(/\b(\d{2}[:;]\d{2})\b/);
    if (matchHora) {
        document.getElementById('horario').value = matchHora[1].replace(';', ':');
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
    if (textoLow.includes('inicio') || textoLow.includes('início') || textoLow.includes('inicial') || textoLow.includes('lnicial') || textoLow.includes('inician')) {
        document.getElementById('faseRegistro').value = modoAtual === 'ronda' ? "Início da Ronda" : "Início da Parada";
    } else if (textoLow.includes('termino') || textoLow.includes('término') || textoLow.includes('fim') || textoLow.includes('final') || textoLow.includes('terminan')) {
        document.getElementById('faseRegistro').value = modoAtual === 'ronda' ? "Término da Ronda" : "Término da Parada";
    }
    
    // 4. Agente / Moto / VTR
    let linhas = texto.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let linhasAgente = [];
    
    for (let linha of linhas) {
        let linhaL = linha.toLowerCase();
        
        // Em vez de descartar a linha que cita o condomínio, vamos apenas limpar o nome dele
        // para preservar a informação do agente se estiver na mesma linha
        for (let cond of listaCondominios) {
            let condS = cond.toLowerCase().replace('associação ', '');
            if (linhaL.includes(cond.toLowerCase()) || linhaL.includes(condS)) {
                linha = linha.replace(new RegExp(cond, 'gi'), '');
                linha = linha.replace(new RegExp(condS, 'gi'), '');
                linha = linha.replace(/(?:condomínio|residencial|associação)\s*(?:residencial)?\s*:?/gi, '');
                linhaL = linha.toLowerCase();
            }
        }
        
        // Limpar possíveis delimitadores extras resultantes da limpeza
        linha = linha.replace(/^[/\s:-]+|[/\s:-]+$/g, '').trim();
        
        // Se a linha ficou vazia (ex: continha apenas o nome do condomínio), ignora
        if (linha.replace(/[^a-zA-Z0-9]/g, '').trim() === '') {
            continue;
        }
        
        // Ignorar linhas com horários ou descrições de fase/ronda
        if (
            /\b\d{2}[:;]\d{2}\b/.test(linha) || 
            linhaL.includes('inicio') || 
            linhaL.includes('início') || 
            linhaL.includes('inicial') || 
            linhaL.includes('lnicial') ||
            linhaL.includes('inician') ||
            linhaL.includes('termino') || 
            linhaL.includes('término') || 
            linhaL.includes('terminan') ||
            linhaL.includes('ronda') ||
            linhaL.includes('fim') || 
            linhaL.includes('final') || 
            linhaL.includes('parada')
        ) {
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
