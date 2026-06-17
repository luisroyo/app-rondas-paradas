// Manipulação da Interface (UI) e Eventos de Tela

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
    
    // Preparar formulário de edição também
    const optionsEditFase = novoModo === 'ronda' 
        ? '<option value="Início da Ronda">Início da Ronda</option><option value="Término da Ronda">Término da Ronda</option>'
        : '<option value="Início da Parada">Início da Parada</option><option value="Término da Parada">Término da Parada</option>';
    document.getElementById('edit-fase').innerHTML = optionsEditFase;

    const selectCond = document.getElementById('condominio');
    const editCond = document.getElementById('edit-condominio');
    if (selectCond && editCond) {
        selectCond.innerHTML = '<option value="">Selecione...</option>';
        editCond.innerHTML = '<option value="">Selecione...</option>';
        const listaCondominios = novoModo === 'ronda' ? CONDOMINIOS_RONDA : CONDOMINIOS_PARADA;
        listaCondominios.forEach(cond => {
            selectCond.appendChild(new Option(cond, cond));
            editCond.appendChild(new Option(cond, cond));
        });
    }

    document.getElementById('condominio').value = '';
    document.getElementById('agente').value = localStorage.getItem('agente_salvo') || '';
    document.getElementById('horario').value = '';

    atualizarTela();
}

function mostrarAvisoSalvo(mensagem) {
    const aviso = document.getElementById('status-salvo');
    if (aviso) {
        aviso.innerText = mensagem;
        setTimeout(() => { aviso.innerText = ""; }, 3000); 
    }
}

function removerFoto(id) {
    const obj = registros.find(r => r.id === id);
    if (!obj) return;
    registroRemovido = obj; 
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

    const obj = registros.find(r => r.id === id);
    if (obj.fase !== fase || obj.condominio !== cond || obj.agente !== ag) {
        if (!validarLogica(obj.modo, cond, fase, id, ag)) return;
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

function atualizarResumo(registrosAtuais) {
    const resumoDiv = document.getElementById('resumo-contador');
    if (!resumoDiv) return;

    const condsInfo = {};
    registrosAtuais.forEach(r => {
        if (!condsInfo[r.condominio]) condsInfo[r.condominio] = [];
        condsInfo[r.condominio].push(r);
    });

    let totalInicios = 0;
    Object.keys(condsInfo).forEach(cond => {
        let regs = condsInfo[cond].sort((a,b) => obterValorTempo(a.horario) - obterValorTempo(b.horario));
        
        // Agrupar por agente para pareamento correto de rondas simultâneas
        const regsPorAgente = {};
        regs.forEach(r => {
            const agKey = normalizarAgente(r.agente);
            if (!regsPorAgente[agKey]) regsPorAgente[agKey] = [];
            regsPorAgente[agKey].push(r);
        });

        let duracoes = [];
        let contagemInicios = 0;

        Object.values(regsPorAgente).forEach(agentRegs => {
            let inicio = null;
            for (let reg of agentRegs) {
                if (reg.fase.startsWith('Início')) {
                    inicio = reg;
                    contagemInicios++;
                } else if (reg.fase.startsWith('Término') && inicio) {
                    duracoes.push(calcularDuracaoMinutos(inicio.horario, reg.horario));
                    inicio = null;
                }
            }
        });
        
        let mediaTexto = "";
        if (duracoes.length > 0) {
            let soma = duracoes.reduce((a,b) => a+b, 0);
            let media = Math.round(soma / duracoes.length);
            mediaTexto = `(Méd: ${formatarTempo(media)})`;
        }
        
        condsInfo[cond].resumo = {
            qtd: contagemInicios,
            mediaTexto: mediaTexto
        };
        totalInicios += contagemInicios;
    });

    if (totalInicios === 0) {
        resumoDiv.innerHTML = `<p style="margin:0; color:var(--cor-texto-mutado);">Nenhum plantão iniciado ainda.</p>`;
        return;
    }

    const txtPlural = modoAtual === 'ronda' ? 'Rondas Realizadas' : 'Paradas Realizadas';
    let html = `<h3>Resumo do Plantão: ${totalInicios} ${txtPlural}</h3><div class="resumo-lista">`;
    Object.keys(condsInfo).sort().forEach(cond => {
         let info = condsInfo[cond].resumo;
         if (info.qtd > 0) {
             html += `<div>• ${cond}: <strong>${info.qtd}</strong> <span style="font-size:12px; color:var(--cor-texto-mutado);">${info.mediaTexto}</span></div>`;
         }
    });
    html += `</div>`;
    resumoDiv.innerHTML = html;
}

function atualizarTela() {
    const grid = document.getElementById('grid-fotos');
    if (!grid) return;
    grid.innerHTML = '';
    
    const filtroInput = document.getElementById('filtro-busca');
    const busca = filtroInput ? filtroInput.value.trim().toLowerCase() : '';
    
    let registrosAtuais = registros.filter(r => r.modo === modoAtual);
    if (busca !== '') {
        registrosAtuais = registrosAtuais.filter(r => 
            r.condominio.toLowerCase().includes(busca) || 
            r.agente.toLowerCase().includes(busca)
        );
    }

    const contadorSpan = document.getElementById('contador');
    if (contadorSpan) contadorSpan.innerText = registrosAtuais.length;
    
    let todosRegistrosModo = registros.filter(r => r.modo === modoAtual);
    atualizarResumo(todosRegistrosModo);

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

    const duracoesCard = {}; 
    const condsParaCalc = {};
    todosRegistrosModo.forEach(r => {
        if (!condsParaCalc[r.condominio]) condsParaCalc[r.condominio] = [];
        condsParaCalc[r.condominio].push(r);
    });
    
    Object.values(condsParaCalc).forEach(regs => {
        let regsOrdenadosPorCondominio = [...regs].sort((a,b) => obterValorTempo(a.horario) - obterValorTempo(b.horario));
        
        // Agrupar por agente para pareamento correto de rondas simultâneas
        const regsPorAgente = {};
        regsOrdenadosPorCondominio.forEach(r => {
            const agKey = normalizarAgente(r.agente);
            if (!regsPorAgente[agKey]) regsPorAgente[agKey] = [];
            regsPorAgente[agKey].push(r);
        });

        Object.values(regsPorAgente).forEach(agentRegs => {
            let inicio = null;
            for (let reg of agentRegs) {
                if (reg.fase.startsWith('Início')) {
                    inicio = reg;
                } else if (reg.fase.startsWith('Término') && inicio) {
                    let dur = calcularDuracaoMinutos(inicio.horario, reg.horario);
                    duracoesCard[reg.id] = formatarTempo(dur);
                    inicio = null;
                }
            }
        });
    });

    let htmlRenderizado = "";
    regsOrdenados.forEach(reg => {
        let classeFase = reg.fase.startsWith('Início') ? 'inicio' : 'termino';
        let extraInfo = "";
        if (classeFase === 'termino' && duracoesCard[reg.id]) {
            extraInfo = `<p style="color: var(--cor-principal); font-size: 11px; margin-top:2px;">⏱️ Duração: <strong>${duracoesCard[reg.id]}</strong></p>`;
        }
        
        htmlRenderizado += `
            <div class="card-foto ${classeFase}">
                <button class="btn-editar" onclick="abrirModalEdicao(${reg.id})" title="Editar">✏️</button>
                <button class="btn-remover" onclick="removerFoto(${reg.id})" title="Remover">X</button>
                <span class="badge-condominio">📌 ${reg.condominio}</span>
                <img src="${reg.foto}" loading="lazy">
                <p>Agente: <strong>${reg.agente}</strong></p>
                <p>⏰ <strong>${reg.horario}</strong></p>
                <span class="badge-fase ${classeFase}">${reg.fase}</span>
                ${extraInfo}
            </div>
        `;
    });
    
    grid.innerHTML = htmlRenderizado;
}
