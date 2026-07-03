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

    // 1. Filtrar registros do mesmo condomínio e modo (independente do agente)
    let regsCond = registros.filter(r => 
        r.modo === modo && 
        r.condominio === cond && 
        r.id !== ignoreId
    );

    // Filtrar registros com horário anterior ou igual ao do lançamento atual
    let priorRegsCond = regsCond.filter(r => obterValorTempo(r.horario) <= timeVal);

    // Ordenar os registros anteriores por horário cronologicamente
    priorRegsCond.sort((a, b) => {
        let ta = obterValorTempo(a.horario);
        let tb = obterValorTempo(b.horario);
        if (ta !== tb) return ta - tb;
        return a.id - b.id;
    });

    // 2. Filtrar apenas os registros que pertencem ao agente atual (usando compatibilidade ou nome normalizado)
    let priorRegsAgente = priorRegsCond.filter(r => 
        normalizarAgente(r.agente) === agenteNorm || agentesSaoCompativeis(r.agente, agenteVal)
    );

    const ultimoRegAgente = priorRegsAgente[priorRegsAgente.length - 1];
    const temInicioAbertoAgente = ultimoRegAgente && ultimoRegAgente.fase.startsWith('Início');

    const labelModo = modo === 'ronda' ? 'Ronda' : 'Parada';

    if (faseStr.startsWith('Início')) {
        if (temInicioAbertoAgente) {
            return confirm(`⚠️ ATENÇÃO: O agente "${agenteVal}" já possui um Início aberto às ${ultimoRegAgente.horario} para o residencial ${cond}.\n\nDeseja lançar este novo Início mesmo assim (ex: caso tenha esquecido de registrar o término do anterior)?`);
        }
        
        // Se outro agente tem início aberto no residencial
        const inicioAbertoGeral = obterInicioAbertoGeral(priorRegsCond);
        if (inicioAbertoGeral) {
            return confirm(`⚠️ ATENÇÃO: O residencial ${cond} já possui um Início aberto às ${inicioAbertoGeral.horario} pelo agente "${inicioAbertoGeral.agente}".\n\nDeseja registrar outro Início de ${labelModo} concorrente/paralelo neste mesmo residencial?`);
        }
    } else if (faseStr.startsWith('Término')) {
        if (!temInicioAbertoAgente) {
            const inicioAbertoGeral = obterInicioAbertoGeral(priorRegsCond);
            if (inicioAbertoGeral) {
                return confirm(`⚠️ ATENÇÃO: Não há registro de Início para "${agenteVal}", mas existe um Início aberto às ${inicioAbertoGeral.horario} por "${inicioAbertoGeral.agente}".\n\nDeseja registrar este Término vinculando a essa ${labelModo} em aberto?`);
            } else {
                return confirm(`⚠️ ATENÇÃO: Não existe nenhum Início aberto para o residencial ${cond}.\n\nDeseja registrar este Término mesmo assim?`);
            }
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
        
        const gruposAgentes = agruparPorAgenteCompativel(regs);
        
        gruposAgentes.forEach(agentRegs => {
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
        
        const gruposAgentes = agruparPorAgenteCompativel(regs);

        gruposAgentes.forEach(agentRegs => {
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

function obterNomeMesAno(date) {
    const meses = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    return `${meses[date.getMonth()]} - ${date.getFullYear()}`;
}

function agentesSaoCompativeis(ag1, ag2) {
    if (!ag1 || !ag2) return false;
    
    // Check if the base name before a slash matches exactly after normalization
    const baseAg1 = ag1.split('/')[0].trim();
    const baseAg2 = ag2.split('/')[0].trim();
    if (normalizarAgente(baseAg1) === normalizarAgente(baseAg2)) {
        return true;
    }
    
    const limpar = (a) => a.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ");
    
    const extrairPalavrasSignificativas = (texto) => {
        return limpar(texto)
            .split(/\s+/)
            .filter(w => w.length >= 2 && 
                         w !== "vtr" && 
                         w !== "condutor" && 
                         w !== "condutora" && 
                         w !== "setor" && 
                         w !== "ronda" && 
                         w !== "parada" && 
                         w !== "viatura" &&
                         w !== "condominio" &&
                         w !== "residencial" &&
                         w !== "agente" &&
                         w !== "apoio");
    };

    const palavras1 = extrairPalavrasSignificativas(ag1);
    const palavras2 = extrairPalavrasSignificativas(ag2);
    
    if (palavras1.length === 0 || palavras2.length === 0) {
        return normalizarAgente(ag1) === normalizarAgente(ag2);
    }
    
    // Requer que exista pelo menos uma palavra significativa em comum
    // que não seja apenas números comuns se houver nomes.
    for (let p1 of palavras1) {
        if (palavras2.includes(p1)) {
            return true;
        }
    }
    return false;
}

function agruparPorAgenteCompativel(regs) {
    const grupos = [];
    
    regs.forEach(r => {
        let grupoEncontrado = grupos.find(g => 
            g.some(reg => 
                normalizarAgente(reg.agente) === normalizarAgente(r.agente) || 
                agentesSaoCompativeis(reg.agente, r.agente)
            )
        );
        
        if (grupoEncontrado) {
            grupoEncontrado.push(r);
        } else {
            grupos.push([r]);
        }
    });
    
    return grupos;
}

function obterInicioAbertoGeral(priorRegsCond) {
    const iniciosAbertos = [];
    
    priorRegsCond.forEach(reg => {
        if (reg.fase.startsWith('Início')) {
            iniciosAbertos.push(reg);
        } else if (reg.fase.startsWith('Término')) {
            const idx = iniciosAbertos.findIndex(ini => 
                normalizarAgente(ini.agente) === normalizarAgente(reg.agente) || 
                agentesSaoCompativeis(ini.agente, reg.agente)
            );
            if (idx !== -1) {
                iniciosAbertos.splice(idx, 1);
            }
        }
    });
    
    return iniciosAbertos.length > 0 ? iniciosAbertos[0] : null;
}

