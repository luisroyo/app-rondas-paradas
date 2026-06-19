// Funções Utilitárias e Cálculos

function obterValorTempo(horaStr) {
    let valor = parseInt(horaStr.replace(':', ''));
    if (valor < 1800) { valor += 2400; }
    return valor;
}

function calcularDuracaoMinutos(inicioStr, terminoStr) {
    let [h1, m1] = inicioStr.split(':').map(Number);
    let [h2, m2] = terminoStr.split(':').map(Number);
    let min1 = h1 * 60 + m1;
    let min2 = h2 * 60 + m2;
    if (min2 < min1) {
        min2 += 24 * 60;
    }
    return min2 - min1;
}

function formatarTempo(minutos) {
    if (minutos < 60) return `${minutos} min`;
    let h = Math.floor(minutos / 60);
    let m = minutos % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function normalizarAgente(agente) {
    if (!agente) return "";
    const Lower = agente.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // Procura por termos como "condutor:", "condutora:", "condutor ", "condutora " para extrair o nome
    const match = agente.match(/(?:condutor|condutora)\s*:\s*([^/]+)/i) || 
                  agente.match(/(?:condutor|condutora)\s+([^/]+)/i);
    if (match) {
        let nome = match[1].trim();
        nome = nome.replace(/condominio.*/i, "")
                   .replace(/residencial.*/i, "")
                   .replace(/iniciando.*/i, "")
                   .replace(/terminando.*/i, "")
                   .trim();
        let nomeLimpo = nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, "");
        if (nomeLimpo.length >= 3) {
            return nomeLimpo;
        }
    }
    
    // Se não achar nome de condutor válido com 3+ letras, usa a normalização sem termos de ruído
    let s = Lower.replace(/\bvtr\b/g, "")
                 .replace(/\bcondutor\b/g, "")
                 .replace(/\bcondutora\b/g, "")
                 .replace(/\bsetor\b/g, "")
                 .replace(/\biniciando\b/g, "")
                 .replace(/\bterminando\b/g, "")
                 .replace(/\bronda\b/g, "")
                 .replace(/\bparada\b/g, "")
                 .replace(/\bcondominio\b/g, "")
                 .replace(/\bresidencial\b/g, "");
                 
    s = s.replace(/\b\d{2}:\d{2}\b/g, "");
    s = s.replace(/\b\d{4}\b/g, ""); // Remove números de 4 dígitos (ex: horários sem dois-pontos)
    return s.replace(/[^a-z0-9]/g, "");
}

// Logica de Validação de Fluxo (Início -> Término) por Agente
function validarLogica(modo, cond, faseStr, ignoreId, agenteVal, horarioVal) {
    if (!agenteVal) {
        const agenteInput = document.getElementById('agente');
        agenteVal = agenteInput ? agenteInput.value : "";
    }
    if (!horarioVal) {
        const horarioInput = document.getElementById('horario');
        horarioVal = horarioInput ? horarioInput.value : "";
    }
    
    if (!horarioVal) {
        // Se ainda não houver horário informado, não bloqueia a validação inicial
        return true;
    }

    const agenteNorm = normalizarAgente(agenteVal);
    const timeVal = obterValorTempo(horarioVal);

    // Filtrar apenas registros do mesmo agente, condomínio e modo
    let regs = registros.filter(r => 
        r.modo === modo && 
        r.condominio === cond && 
        r.id !== ignoreId && 
        normalizarAgente(r.agente) === agenteNorm
    );

    // Filtrar registros com horário anterior ou igual ao do lançamento atual
    let priorRegs = regs.filter(r => obterValorTempo(r.horario) <= timeVal);

    // Ordenar os registros anteriores por horário cronologicamente
    priorRegs.sort((a, b) => {
        let ta = obterValorTempo(a.horario);
        let tb = obterValorTempo(b.horario);
        if (ta !== tb) return ta - tb;
        return a.id - b.id;
    });

    const ultimoReg = priorRegs[priorRegs.length - 1];
    const temInicioAberto = ultimoReg && ultimoReg.fase.startsWith('Início');

    if (faseStr.startsWith('Início')) {
        if (temInicioAberto) {
            return confirm(`Atenção: O agente "${agenteVal}" já possui um Início aberto às ${ultimoReg.horario} para ${cond}.\n\nDeseja lançar este novo Início mesmo assim (ex: caso tenha esquecido de registrar o término do anterior)?`);
        }
    } else if (faseStr.startsWith('Término')) {
        if (!temInicioAberto) {
            const horaMsg = ultimoReg ? ` após as ${ultimoReg.horario}` : "";
            return confirm(`Atenção: Não há nenhum Início aberto para o agente "${agenteVal}" em ${cond}${horaMsg}.\n\nDeseja lançar este Término mesmo assim?`);
        }
    }
    return true;
}

function verificarAlertasDuracao(modo) {
    const registrosModo = registros.filter(r => r.modo === modo);
    const condsParaCalc = {};
    registrosModo.forEach(r => {
        if (!condsParaCalc[r.condominio]) condsParaCalc[r.condominio] = [];
        condsParaCalc[r.condominio].push(r);
    });
    
    let alertasNaoConfirmados = [];
    
    Object.keys(condsParaCalc).forEach(cond => {
        let regs = [...condsParaCalc[cond]].sort((a,b) => obterValorTempo(a.horario) - obterValorTempo(b.horario));
        
        const regsPorAgente = {};
        regs.forEach(r => {
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
                    if (dur > 30 && reg.alertaConfirmado !== true) {
                        alertasNaoConfirmados.push({
                            condominio: cond,
                            agente: reg.agente,
                            tempo: formatarTempo(dur)
                        });
                    }
                    inicio = null;
                }
            }
        });
    });
    
    return alertasNaoConfirmados;
}

function obterRegistrosAbertos(modo) {
    const registrosModo = registros.filter(r => r.modo === modo);
    const condsParaCalc = {};
    registrosModo.forEach(r => {
        if (!condsParaCalc[r.condominio]) condsParaCalc[r.condominio] = [];
        condsParaCalc[r.condominio].push(r);
    });
    
    let abertos = [];
    
    Object.keys(condsParaCalc).sort().forEach(cond => {
        let regs = [...condsParaCalc[cond]].sort((a,b) => obterValorTempo(a.horario) - obterValorTempo(b.horario));
        
        const regsPorAgente = {};
        regs.forEach(r => {
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
                    inicio = null;
                }
            }
            if (inicio) {
                abertos.push({
                    condominio: cond,
                    agente: inicio.agente,
                    horario: inicio.horario,
                    fase: inicio.fase
                });
            }
        });
    });
    
    return abertos;
}
