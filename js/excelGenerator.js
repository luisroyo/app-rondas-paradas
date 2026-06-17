// Geração de Relatórios em Excel (.xlsx) usando a biblioteca SheetJS

function gerarExcel() {
    // Filtrar registros globais
    const registrosRonda = registros.filter(r => r.modo === 'ronda');
    const registrosParada = registros.filter(r => r.modo === 'parada');

    if (registrosRonda.length === 0 && registrosParada.length === 0) {
        alert("Adicione fotografias ou registros para gerar a planilha Excel.");
        return;
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

    // 1. Planilha de Rondas
    const wsRondas = criarPlanilhaModo('ronda', registrosRonda, supervisor, turno, dataHoje);
    XLSX.utils.book_append_sheet(wb, wsRondas, 'Rondas');

    // 2. Planilha de Paradas
    const wsParadas = criarPlanilhaModo('parada', registrosParada, supervisor, turno, dataHoje);
    XLSX.utils.book_append_sheet(wb, wsParadas, 'Paradas');

    // Nome do arquivo baseado no modo ativo para manter coerência com o PDF
    const prefixo = modoAtual === 'ronda' ? 'Rondas' : 'Paradas';
    const nomeArquivo = `Relatorio_${prefixo}_${turno.split(' ')[0]}_${dataHoje.replace(/\//g, '-')}.xlsx`;

    // Salvar o arquivo Excel
    XLSX.writeFile(wb, nomeArquivo);
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

        // Calcular ciclos completos (Início -> Término)
        const events = [];
        let inicio = null;

        for (let reg of regs) {
            if (reg.fase.startsWith('Início')) {
                if (inicio) {
                    // Registro de Início sem Término anterior (caso ocorra desvio de fluxo)
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
                    // Registro de Término sem Início correspondente
                    events.push({
                        inicio: "--",
                        termino: reg.horario,
                        duracao: "--",
                        agente: reg.agente
                    });
                }
            }
        }

        // Se sobrou um Início aberto no final
        if (inicio) {
            events.push({
                inicio: inicio.horario,
                termino: "--",
                duracao: "--",
                agente: inicio.agente
            });
        }

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
