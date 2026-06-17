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
    return agente.toLowerCase().trim().replace(/\s+/g, ' ');
}

// Logica de Validação de Fluxo (Início -> Término) por Agente
function validarLogica(modo, cond, faseStr, ignoreId, agenteVal) {
    if (!agenteVal) {
        const agenteInput = document.getElementById('agente');
        agenteVal = agenteInput ? agenteInput.value : "";
    }
    const agenteNorm = normalizarAgente(agenteVal);

    let regs = registros.filter(r => 
        r.modo === modo && 
        r.condominio === cond && 
        r.id !== ignoreId && 
        normalizarAgente(r.agente) === agenteNorm
    );
    const inicios = regs.filter(r => r.fase.startsWith('Início')).length;
    const terminos = regs.filter(r => r.fase.startsWith('Término')).length;

    if (faseStr.startsWith('Início') && inicios > terminos) {
        alert(`Erro: O agente "${agenteVal}" já possui um Início aberto sem Término para ${cond}.\n\nPor favor, lance o Término correspondente antes de iniciar um novo ciclo.`);
        return false;
    } else if (faseStr.startsWith('Término') && inicios <= terminos) {
        alert(`Erro: Não há nenhum Início aberto para o agente "${agenteVal}" em ${cond}.\n\nVocê não pode lançar um Término sem antes lançar o Início.`);
        return false;
    }
    return true;
}
