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
    if (obj.fase !== fase || obj.condominio !== cond || obj.agente !== ag || obj.horario !== hor) {
        if (!validarLogica(obj.modo, cond, fase, id, ag, hor)) return;
    }

    obj.condominio = cond;
    obj.agente = ag;
    obj.fase = fase;
    obj.horario = hor;
    obj.alertaConfirmado = false;

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
    document.getElementById('btn-ordem').innerHTML = modoOrdenacao === 'condominio' 
        ? '<span class="icone-ordem">🔄</span> <span class="texto-ordem">Por Residencial</span>' 
        : '<span class="icone-ordem">🔄</span> <span class="texto-ordem">Por Horário</span>';
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
        const gruposAgentes = agruparPorAgenteCompativel(regs);

        let duracoes = [];
        let contagemInicios = 0;

        gruposAgentes.forEach(agentRegs => {
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
        const gruposAgentes = agruparPorAgenteCompativel(regsOrdenadosPorCondominio);

        gruposAgentes.forEach(agentRegs => {
            let inicio = null;
            for (let reg of agentRegs) {
                if (reg.fase.startsWith('Início')) {
                    inicio = reg;
                } else if (reg.fase.startsWith('Término') && inicio) {
                    let dur = calcularDuracaoMinutos(inicio.horario, reg.horario);
                    duracoesCard[reg.id] = { texto: formatarTempo(dur), minutos: dur, excedido: dur > 30 };
                    inicio = null;
                }
            }
        });
    });

    let htmlRenderizado = "";
    regsOrdenados.forEach(reg => {
        let classeFase = reg.fase.startsWith('Início') ? 'inicio' : 'termino';
        let extraInfo = "";
        let classeAlerta = "";
        if (classeFase === 'termino' && duracoesCard[reg.id]) {
            const infoDur = duracoesCard[reg.id];
            if (infoDur.excedido) {
                const confirmado = reg.alertaConfirmado === true;
                if (!confirmado) {
                    classeAlerta = "card-alerta-excedido";
                    extraInfo = `
                        <div class="alerta-duracao" style="background: rgba(234, 67, 53, 0.1); color: #ea4335; border: 1px solid rgba(234, 67, 53, 0.3); border-radius: 4px; padding: 6px; margin-top: 8px; font-size: 11px; font-weight: bold; text-align: left; display: flex; flex-direction: column; gap: 4px;">
                            <span>⚠️ Duração Alta: ${infoDur.texto}</span>
                            <button onclick="confirmarAlertaDuracao(${reg.id})" style="background: #ea4335; color: white; border: none; border-radius: 3px; padding: 3px 6px; font-size: 10px; cursor: pointer; font-weight: bold; width: fit-content; margin-top: 2px;">Confirmar</button>
                        </div>
                    `;
                } else {
                    extraInfo = `<p style="color: #666; font-size: 11px; margin-top:2px;">⏱️ Duração: <strong>${infoDur.texto}</strong> <span style="color: #0f9d58;">(✓ Confirmado)</span></p>`;
                }
            } else {
                extraInfo = `<p style="color: var(--cor-principal); font-size: 11px; margin-top:2px;">⏱️ Duração: <strong>${infoDur.texto}</strong></p>`;
            }
        }
        
        htmlRenderizado += `
            <div class="card-foto ${classeFase} ${classeAlerta}">
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

// Funções do Modal de Configurações e Integração Cloud
const GOOGLE_APPS_SCRIPT_TEMPLATE = `function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    
    // Helper para buscar ou criar pasta
    function obterOuCriarPasta(pai, nomePasta) {
      var pastas = pai.getFoldersByName(nomePasta);
      if (pastas.hasNext()) {
        return pastas.next();
      } else {
        return pai.createFolder(nomePasta);
      }
    }
    
    // 1. Pasta principal
    var mainFolder = obterOuCriarPasta(DriveApp, "Relatórios de Rondas e Paradas");
    
    // 2. Subpasta do Supervisor
    var supervisorName = data.supervisor ? data.supervisor.trim() : "Supervisor Não Informado";
    if (supervisorName && supervisorName !== "Não informado") {
      supervisorName = supervisorName.charAt(0).toUpperCase() + supervisorName.slice(1);
    } else {
      supervisorName = "Supervisor Não Informado";
    }
    var supervisorFolder = obterOuCriarPasta(mainFolder, supervisorName);
    
    // 3. Subpasta do Mês (Mês - Ano)
    var mesAno = data.mesAno || "Mês Não Informado";
    var mesFolder = obterOuCriarPasta(supervisorFolder, mesAno);
    
    // 4. Subpasta com a Data correspondente (Dia-Mês-Ano)
    var dataRelatorio = data.dataRelatorio || "Data Não Informada";
    var dataFolder = obterOuCriarPasta(mesFolder, dataRelatorio);
    
    var resultados = [];
    
    if (data.pdfData && data.pdfName) {
      var pdfBlob = Utilities.newBlob(Utilities.base64Decode(data.pdfData), 'application/pdf', data.pdfName);
      var pdfFile = dataFolder.createFile(pdfBlob);
      resultados.push("PDF salvo: " + pdfFile.getName());
    }
    
    if (data.excelData && data.excelName) {
      var excelBlob = Utilities.newBlob(
        Utilities.base64Decode(data.excelData), 
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
        data.excelName
      );
      var excelFile = dataFolder.createFile(excelBlob);
      resultados.push("XLSX salvo: " + excelFile.getName());
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success', 
      message: 'Relatórios salvos com sucesso em: ' + supervisorName + ' > ' + mesAno + ' > ' + dataRelatorio,
      details: resultados
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error', 
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

function abrirModalConfig() {
    const modal = document.getElementById('modal-configuracoes');
    if (!modal) return;
    
    modal.style.display = 'flex';
    
    // Carregar valores atuais
    const nuvemAtiva = localStorage.getItem('nuvem_ativa') !== 'false';
    const webhookUrl = localStorage.getItem('webhook_url') || DEFAULT_WEBHOOK_URL;
    
    document.getElementById('config-nuvem-ativa').checked = nuvemAtiva;
    document.getElementById('config-webhook-url').value = webhookUrl;
    
    // Configurar o código de visualização do script
    const pre = document.getElementById('codigo-apps-script-exemplo');
    if (pre) {
        pre.textContent = GOOGLE_APPS_SCRIPT_TEMPLATE;
    }
    
    alternarCamposNuvem();
}

function fecharModalConfig() {
    const modal = document.getElementById('modal-configuracoes');
    if (modal) modal.style.display = 'none';
}

function alternarCamposNuvem() {
    const ativa = document.getElementById('config-nuvem-ativa').checked;
    const campos = document.getElementById('campos-nuvem');
    if (campos) {
        campos.style.display = ativa ? 'block' : 'none';
    }
    if (!ativa) {
        const inst = document.getElementById('instrucoes-script');
        if (inst) inst.style.display = 'none';
    }
}

function exibirInstrucoesAppsScript(event) {
    if (event) event.preventDefault();
    const inst = document.getElementById('instrucoes-script');
    if (inst) {
        inst.style.display = inst.style.display === 'none' ? 'block' : 'none';
        if (inst.style.display === 'block') {
            // Rolar até o final para mostrar as instruções
            setTimeout(() => {
                inst.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }, 100);
        }
    }
}

function copiarCodigoScript() {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE)
        .then(() => {
            alert("Código do Google Apps Script copiado para a área de transferência!");
        })
        .catch(err => {
            console.error("Falha ao copiar:", err);
            alert("Não foi possível copiar automaticamente. Selecione o texto e copie manualmente.");
        });
}

function salvarConfiguracoes() {
    const ativa = document.getElementById('config-nuvem-ativa').checked;
    const url = document.getElementById('config-webhook-url').value.trim();
    
    if (ativa && !url) {
        alert("Por favor, informe a URL do Web App do Google Apps Script!");
        return;
    }
    
    localStorage.setItem('nuvem_ativa', ativa ? 'true' : 'false');
    localStorage.setItem('webhook_url', url);
    
    fecharModalConfig();
    mostrarAvisoSalvo("⚙️ Configurações salvas!");
}

function confirmarAlertaDuracao(id) {
    const obj = registros.find(r => r.id === id);
    if (obj) {
        obj.alertaConfirmado = true;
        atualizarTela();
        salvarDadosOffline();
    }
}

function verificarPendencias() {
    const registrosAbertos = obterRegistrosAbertos(modoAtual);
    const alertas = verificarAlertasDuracao(modoAtual);
    const termoFase = modoAtual === 'ronda' ? 'rondas' : 'paradas';
    
    let mensagens = [];
    
    if (registrosAbertos.length > 0) {
        const listaAbertos = registrosAbertos.map(a => `• ${a.condominio}: Iniciado às ${a.horario} por ${a.agente}`).join('\n');
        mensagens.push(`⚠️ Existem ${termoFase} em aberto (sem registro de término):\n${listaAbertos}`);
    }
    
    if (alertas.length > 0) {
        const listaAlertas = alertas.map(a => `• ${a.condominio}: ${a.tempo} (${a.agente})`).join('\n');
        mensagens.push(`⚠️ Existem ${termoFase} com duração superior a 30 minutos não confirmadas:\n${listaAlertas}`);
    }
    
    if (mensagens.length > 0) {
        alert(mensagens.join('\n\n'));
    } else {
        alert(`✅ Tudo certo! Não há pendências para as ${termoFase} atuais.`);
    }
}
