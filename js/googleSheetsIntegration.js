// Integração com Google Sheets para envio de totais de Rondas e Paradas

function calcularTotais(modo) {
    const registrosModo = registros.filter(r => r.modo === modo);
    const condsInfo = {};
    const totais = {};

    // Agrupar registros por condomínio
    registrosModo.forEach(r => {
        if (!condsInfo[r.condominio]) condsInfo[r.condominio] = [];
        condsInfo[r.condominio].push(r);
    });

    Object.keys(condsInfo).forEach(cond => {
        // Ordenar registros do condomínio por horário
        const regs = condsInfo[cond].sort((a, b) => obterValorTempo(a.horario) - obterValorTempo(b.horario));
        const gruposAgentes = agruparPorAgenteCompativel(regs);
        
        let qtdCompletas = 0;
        
        gruposAgentes.forEach(agentRegs => {
            let inicio = null;
            for (let reg of agentRegs) {
                if (reg.fase.startsWith('Início')) {
                    inicio = reg;
                } else if (reg.fase.startsWith('Término')) {
                    if (inicio) {
                        qtdCompletas++;
                        inicio = null;
                    }
                }
            }
        });
        
        if (qtdCompletas > 0) {
            totais[cond] = qtdCompletas;
        }
    });

    return totais;
}

async function enviarTotaisGoogle() {
    const webhookUrl = localStorage.getItem('google_sheets_webhook_url');
    if (!webhookUrl || !webhookUrl.trim()) {
        alert("Por favor, configure a URL do Webhook do Google Apps Script nas Configurações (⚙️) antes de enviar.");
        return;
    }

    const totaisRondasTemp = calcularTotais('ronda');
    const totaisParadasTemp = calcularTotais('parada');

    // Combinar totais em um único objeto { "Residencial": { rondas: X, paradas: Y } }
    const totaisGerais = {};
    
    // Processar rondas
    Object.keys(totaisRondasTemp).forEach(cond => {
        if (!totaisGerais[cond]) totaisGerais[cond] = { rondas: 0, paradas: 0 };
        totaisGerais[cond].rondas = totaisRondasTemp[cond];
    });
    
    // Processar paradas
    Object.keys(totaisParadasTemp).forEach(cond => {
        if (!totaisGerais[cond]) totaisGerais[cond] = { rondas: 0, paradas: 0 };
        totaisGerais[cond].paradas = totaisParadasTemp[cond];
    });

    if (Object.keys(totaisGerais).length === 0) {
        alert("Não há rondas ou paradas completas para enviar.");
        return;
    }

    const turno = document.getElementById('turno').value;
    
    let dataRelatorio = new Date();
    // Lógica para dia anterior se for turno noturno e antes do meio-dia (mesma lógica do excel)
    if (turno.includes('Noturno') && dataRelatorio.getHours() < 12) {
        dataRelatorio.setDate(dataRelatorio.getDate() - 1);
    }
    
    // Formato YYYY-MM-DD
    const dataString = dataRelatorio.toISOString().split('T')[0];

    const payload = {
        data: dataString,
        turno: turno,
        totais: totaisGerais
    };

    const btn = document.getElementById('btn-enviar-google');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = 'Enviando... ⏳';
    }

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            mode: 'no-cors', // O Google Apps Script exige no-cors para chamadas de frontend se não tiver preflight configurado ou se for apenas POST
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        // Como usamos no-cors, o response.ok sempre será false (opaque), então assumimos sucesso se a requisição não falhou.
        alert("✅ Totais enviados para o Google Sheets com sucesso!");
    } catch (error) {
        console.error("Erro ao enviar dados para o Google Sheets:", error);
        alert("❌ Ocorreu um erro ao enviar os dados. Verifique sua conexão e a URL configurada.");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '🚀 Enviar Totais para Planilha';
        }
    }
}
