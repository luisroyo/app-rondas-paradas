// Geração de Relatórios em Excel (.xlsx) usando a biblioteca SheetJS

function gerarExcel(modo = modoAtual) {
    const registrosModo = registros.filter(r => r.modo === modo);
    const labelModo = modo === 'ronda' ? 'Rondas' : 'Paradas';

    if (registrosModo.length === 0) {
        alert(`Não há registros de ${labelModo} para gerar a planilha Excel.`);
        return;
    }

    // Verificar se há alertas de duração pendentes
    const alertas = verificarAlertasDuracao(modo);
    if (alertas.length > 0) {
        const listaAlertas = alertas.map(a => `• ${a.condominio}: ${a.tempo} (${a.agente})`).join('\n');
        if (!confirm(`⚠️ ATENÇÃO: Existem rondas/paradas com duração superior a 30 minutos não confirmadas:\n\n${listaAlertas}\n\nDeseja gerar a planilha Excel mesmo assim?`)) {
            return;
        }
    }

    const supervisor = document.getElementById('supervisor').value || "Não informado";
    const turno = document.getElementById('turno').value;
    
    let dataRelatorio = new Date();
    if (turno.includes('Noturno') && dataRelatorio.getHours() < 12) {
        dataRelatorio.setDate(dataRelatorio.getDate() - 1);
    }
    const dataHoje = dataRelatorio.toLocaleDateString('pt-BR');

    // Verificar se o XLSX do SheetJS está carregado
    if (!window.XLSX) {
        alert("A biblioteca SheetJS (XLSX) não foi carregada corretamente.");
        return;
    }

    // Criar o Workbook (Livro Excel)
    const wb = XLSX.utils.book_new();

    // Criar apenas a planilha do modo solicitado
    const ws = criarPlanilhaModo(modo, registrosModo, supervisor, turno, dataHoje);
    XLSX.utils.book_append_sheet(wb, ws, labelModo);

    // Formatar nome do arquivo: Relatorio_[Supervisor]_[tipo]_[data].xlsx
    const supervisorNomeLimpo = supervisor.trim().replace(/\s+/g, '_');
    const nomeArquivo = `Relatorio_${supervisorNomeLimpo}_${modo}_${dataHoje.replace(/\//g, '-')}.xlsx`;

    // Salvar o arquivo Excel
    XLSX.writeFile(wb, nomeArquivo);
}

// Retorna o Excel em base64 (usado para o envio silencioso em nuvem)
function obterExcelBase64(modo) {
    const registrosModo = registros.filter(r => r.modo === modo);
    const supervisor = document.getElementById('supervisor').value || "Não informado";
    const turno = document.getElementById('turno').value;
    
    let dataRelatorio = new Date();
    if (turno.includes('Noturno') && dataRelatorio.getHours() < 12) {
        dataRelatorio.setDate(dataRelatorio.getDate() - 1);
    }
    const dataHoje = dataRelatorio.toLocaleDateString('pt-BR');

    if (!window.XLSX || registrosModo.length === 0) {
        return "";
    }

    const wb = XLSX.utils.book_new();
    const ws = criarPlanilhaModo(modo, registrosModo, supervisor, turno, dataHoje);
    const labelModo = modo === 'ronda' ? 'Rondas' : 'Paradas';
    XLSX.utils.book_append_sheet(wb, ws, labelModo);

    return XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
}

function criarPlanilhaModo(modo, registrosModo, supervisor, turno, dataHoje) {
    const data = [];
    const merges = [];
    const labelModo = modo === 'ronda' ? 'Rondas' : 'Paradas';

    // 1. Título do Relatório
    data.push([`RELATÓRIO OPERACIONAL DE ${labelModo.toUpperCase()}`]);
    merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } });

    // 2. Metadados do Plantão
    data.push([`Supervisor: ${supervisor} | Turno: ${turno} | Data: ${dataHoje}`]);
    merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 4 } });

    // 3. Espaçador
    data.push([]);

    // Se não houver registros, colocar um aviso amigável
    if (registrosModo.length === 0) {
        data.push([`Nenhum registro de ${labelModo} lançado para este plantão.`]);
        merges.push({ s: { r: 3, c: 0 }, e: { r: 3, c: 4 } });
        
        const ws = XLSX.utils.aoa_to_sheet(data);
        ws['!merges'] = merges;
        ws['!cols'] = [
            { wch: 22 }, // Evento / Residencial
            { wch: 12 }, // Início
            { wch: 12 }, // Término
            { wch: 15 }, // Duração
            { wch: 25 }  // Agente
        ];
        return ws;
    }

    // Agrupar registros por condomínio/residencial
    const condsInfo = {};
    registrosModo.forEach(r => {
        if (!condsInfo[r.condominio]) condsInfo[r.condominio] = [];
        condsInfo[r.condominio].push(r);
    });

    // Ordenar condomínios em ordem alfabética
    Object.keys(condsInfo).sort().forEach(cond => {
        // Ordenar os registros de cada condomínio por horário
        const regs = condsInfo[cond].sort((a, b) => obterValorTempo(a.horario) - obterValorTempo(b.horario));

        // Agrupar por agente para pareamento correto de rondas simultâneas
        const gruposAgentes = agruparPorAgenteCompativel(regs);

        // Calcular ciclos por agente
        let events = [];
        gruposAgentes.forEach(agentRegs => {
            let inicio = null;
            for (let reg of agentRegs) {
                if (reg.fase.startsWith('Início')) {
                    if (inicio) {
                        events.push({
                            inicio: inicio.horario,
                            termino: "--",
                            duracao: "--",
                            agente: inicio.agente
                        });
                    }
                    inicio = reg;
                } else if (reg.fase.startsWith('Término')) {
                    if (inicio) {
                        const dur = calcularDuracaoMinutos(inicio.horario, reg.horario);
                        events.push({
                            inicio: inicio.horario,
                            termino: reg.horario,
                            duracao: formatarTempo(dur),
                            agente: reg.agente
                        });
                        inicio = null;
                    } else {
                        events.push({
                            inicio: "--",
                            termino: reg.horario,
                            duracao: "--",
                            agente: reg.agente
                        });
                    }
                }
            }
            if (inicio) {
                events.push({
                    inicio: inicio.horario,
                    termino: "--",
                    duracao: "--",
                    agente: inicio.agente
                });
            }
        });

        // Ordenar os eventos gerados cronologicamente pelo horário de início/término
        events.sort((a, b) => {
            const tempoA = a.inicio !== "--" ? obterValorTempo(a.inicio) : obterValorTempo(a.termino);
            const tempoB = b.inicio !== "--" ? obterValorTempo(b.inicio) : obterValorTempo(b.termino);
            return tempoA - tempoB;
        });

        // Se houver eventos processados para este condomínio
        if (events.length > 0) {
            // Header do Residencial
            const resIndex = data.length;
            data.push([`Residencial: ${cond.toUpperCase()}`]);
            merges.push({ s: { r: resIndex, c: 0 }, e: { r: resIndex, c: 4 } });

            // Cabeçalho da Tabela
            data.push(["Evento", "Início", "Término", "Duração", "Agente/VTR"]);

            let qtdCompletas = 0;

            // Inserir linhas de dados dos eventos
            events.forEach((evt, idx) => {
                const labelEvt = modo === 'ronda' ? `Ronda ${idx + 1}` : `Parada ${idx + 1}`;
                data.push([labelEvt, evt.inicio, evt.termino, evt.duracao, evt.agente]);
                
                // Contabilizar apenas ciclos concluídos (com início e término válidos)
                if (evt.inicio !== "--" && evt.termino !== "--") {
                    qtdCompletas++;
                }
            });

            // Linha de Resumo Total do Residencial
            const totalIndex = data.length;
            const textoTotal = modo === 'ronda'
                ? `${qtdCompletas} rondas completas no plantão`
                : `${qtdCompletas} paradas completas no plantão`;

            data.push(["✅ Total:", textoTotal]);
            merges.push({ s: { r: totalIndex, c: 1 }, e: { r: totalIndex, c: 4 } });

            // Linha em branco de separação
            data.push([]);
        }
    });

    // Converter matriz em folha de cálculo
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!merges'] = merges;
    
    // Definir largura padrão para as colunas para evitar clipping de texto
    ws['!cols'] = [
        { wch: 22 }, // Coluna A: Evento / Títulos / Residenciais
        { wch: 12 }, // Coluna B: Início
        { wch: 12 }, // Coluna C: Término
        { wch: 15 }, // Coluna D: Duração
        { wch: 25 }  // Coluna E: Agente / VTR
    ];

    return ws;
}
