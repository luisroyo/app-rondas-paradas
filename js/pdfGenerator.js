// Geração de Relatórios em PDF

function gerarPDF() {
    const registrosAtuais = registros.filter(r => r.modo === modoAtual);
    if (registrosAtuais.length === 0) {
        alert("Adicione fotografias para gerar o relatório."); return;
    }

    // Verificar se há rondas ou paradas em aberto (iniciadas e não finalizadas)
    const registrosAbertos = obterRegistrosAbertos(modoAtual);
    if (registrosAbertos.length > 0) {
        const termoFase = modoAtual === 'ronda' ? 'rondas' : 'paradas';
        const listaAbertos = registrosAbertos.map(a => `• ${a.condominio}: Iniciado às ${a.horario} por ${a.agente}`).join('\n');
        if (!confirm(`⚠️ ATENÇÃO: Existem ${termoFase} em aberto (sem registro de término):\n\n${listaAbertos}\n\nDeseja gerar o relatório em PDF mesmo assim?`)) {
            return;
        }
    }

    // Verificar se há alertas de duração pendentes
    const alertas = verificarAlertasDuracao(modoAtual);
    if (alertas.length > 0) {
        const listaAlertas = alertas.map(a => `• ${a.condominio}: ${a.tempo} (${a.agente})`).join('\n');
        if (!confirm(`⚠️ ATENÇÃO: Existem rondas/paradas com duração superior a 30 minutos não confirmadas:\n\n${listaAlertas}\n\nDeseja gerar o relatório em PDF mesmo assim?`)) {
            return;
        }
    }

    const supervisor = document.getElementById('supervisor').value || "Não informado";
    const turno = document.getElementById('turno').value;
    if (!window.jspdf) { alert("A biblioteca jsPDF não foi carregada corretamente."); return; }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    let dataRelatorio = new Date();
    if (turno.includes('Noturno') && dataRelatorio.getHours() < 12) {
        dataRelatorio.setDate(dataRelatorio.getDate() - 1);
    }
    const dataHoje = dataRelatorio.toLocaleDateString('pt-BR');
    
    const tituloPDF = modoAtual === 'ronda' ? "Relatório Fotográfico de Rondas" : "Relatório Fotográfico de Paradas";
    
    doc.setFontSize(18); doc.setFont("helvetica", "bold");
    doc.text(tituloPDF, 105, 15, null, null, "center");
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text(`Turno: ${turno} | Data: ${dataHoje} | Supervisor: ${supervisor}`, 105, 22, null, null, "center");
    doc.line(10, 25, 200, 25);
    let y = 35;

    // --- RESUMO NO PDF ---
    const condsInfo = {};
    registrosAtuais.forEach(r => {
        if (!condsInfo[r.condominio]) condsInfo[r.condominio] = [];
        condsInfo[r.condominio].push(r);
    });

    const contagem = {};
    const medias = {};
    const duracoesCardPDF = {}; 
    let totalAcoes = 0;

    Object.keys(condsInfo).forEach(cond => {
        let regs = condsInfo[cond].sort((a,b) => obterValorTempo(a.horario) - obterValorTempo(b.horario));
        
        // Agrupar por agente para pareamento correto de rondas simultâneas
        const gruposAgentes = agruparPorAgenteCompativel(regs);

        let duracoes = [];
        let qtd = 0;

        gruposAgentes.forEach(agentRegs => {
            let inicio = null;
            for (let reg of agentRegs) {
                if (reg.fase.startsWith('Início')) {
                    inicio = reg;
                    qtd++;
                } else if (reg.fase.startsWith('Término') && inicio) {
                    let dur = calcularDuracaoMinutos(inicio.horario, reg.horario);
                    duracoes.push(dur);
                    duracoesCardPDF[reg.id] = formatarTempo(dur);
                    inicio = null;
                }
            }
        });

        if (qtd > 0) {
            contagem[cond] = qtd;
            totalAcoes += qtd;
            if (duracoes.length > 0) {
                let soma = duracoes.reduce((a,b) => a+b, 0);
                medias[cond] = formatarTempo(Math.round(soma / duracoes.length));
            } else {
                medias[cond] = "";
            }
        }
    });
    
    const numeroDeAtivos = Object.keys(contagem).length;
    let linhasPorColuna = Math.ceil(numeroDeAtivos / 2);
    if (linhasPorColuna < 1) linhasPorColuna = 1;
    
    let alturaCaixa = 12 + (linhasPorColuna * 5);
    
    doc.setFillColor(240, 240, 240);
    doc.rect(10, y - 5, 190, alturaCaixa, 'F');
    doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.text(`Resumo Operacional: ${totalAcoes} ${modoAtual === 'ronda' ? 'Rondas' : 'Paradas'} Realizadas`, 15, y + 1);
    y += 7;

    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    let colX = 15; let linhaY = y; let itemCount = 0;
    
    Object.keys(contagem).sort().forEach(cond => {
        let textoMed = medias[cond] ? ` - Méd: ${medias[cond]}` : "";
        // Limita a largura do texto do condomínio no resumo para evitar sobreposição
        doc.text(`• ${cond}: ${contagem[cond]}${textoMed}`, colX, linhaY, { maxWidth: 85 });
        linhaY += 5; itemCount++;
        if (itemCount === linhasPorColuna) { 
            colX += 95; // Aumentado de 90 para 95
            linhaY = y; 
            itemCount = 0; 
        }
    });

    y += (linhasPorColuna * 5);
    y += 5; doc.line(10, y, 200, y); y += 10;

    // --- CORPO DO PDF ---
    let regsPDF = [...registrosAtuais].sort((a, b) => {
        if (a.condominio === b.condominio) return obterValorTempo(a.horario) - obterValorTempo(b.horario);
        return a.condominio.localeCompare(b.condominio);
    });

    const corBase = modoAtual === 'ronda' ? [26, 115, 232] : [0, 105, 92];
    const corBg = modoAtual === 'ronda' ? [230, 240, 255] : [224, 242, 241];
    
    let x = 15; let colunaAtual = 0; let condominioAtual = "";

    function renderHeaderCond(nome, posY) {
        doc.setFillColor(...corBg); doc.rect(10, posY - 6, 190, 10, 'F');
        doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(...corBase); 
        doc.text(`RESIDENCIAL: ${nome}${modoAtual === 'parada' ? ' (Ponto Base)' : ''}`, 15, posY + 1, { maxWidth: 180 });
        doc.setTextColor(0, 0, 0);
    }

    regsPDF.forEach((reg, index) => {
        let isNovoCondominio = (reg.condominio !== condominioAtual);
        
        if (isNovoCondominio && colunaAtual !== 0) { 
            y += 95; // Aumentado de 90 para 95
            colunaAtual = 0; 
        }

        if (isNovoCondominio) {
            if (index !== 0 && y <= 190) { y += 5; } 
            if (y > 190) { doc.addPage(); y = 20; }
            
            condominioAtual = reg.condominio;
            renderHeaderCond(condominioAtual, y);
            y += 15;
            colunaAtual = 0;
        } else {
            if (colunaAtual === 0 && y > 185) { // Reduzido de 200 para 185 para garantir que a foto caiba
                doc.addPage(); y = 20;
                renderHeaderCond(condominioAtual + " (Continuação)", y);
                y += 15;
            }
        }

        x = 15 + (colunaAtual * 95); // Aumentado de 65 para 95 para 2 colunas
        
        doc.setFontSize(9); doc.setFont("helvetica", "bold"); 
        // Adicionado maxWidth para o nome do Agente
        doc.text(`Agente: ${reg.agente}`, x, y, { maxWidth: 85 });
        
        doc.setFont("helvetica", "normal"); 
        doc.text(`Fase: ${reg.fase}`, x, y + 6); // Aumentado o espaçamento vertical
        doc.text(`Horário: ${reg.horario}`, x, y + 10);
        
        let startImgY = y + 12;
        if (reg.fase.startsWith('Término') && duracoesCardPDF[reg.id]) {
            doc.setFont("helvetica", "bold"); 
            doc.text(`Duração: ${duracoesCardPDF[reg.id]}`, x, y + 14);
            doc.setFont("helvetica", "normal");
            startImgY = y + 16;
        }
        
        doc.addImage(reg.foto, 'JPEG', x, startImgY, 80, 75); // Aumentado o tamanho da foto (50x68 -> 80x75)
        
        colunaAtual++;
        if (colunaAtual === 2) { // Alterado de 3 para 2 colunas
            colunaAtual = 0; 
            y += 105; // Aumentado de 90 para 105 para acomodar fotos maiores
        }
    });

    // --- ASSINATURAS NO PDF ---
    if (colunaAtual > 0) y += 105; 
    if (y > 240) { doc.addPage(); y = 40; } else { y += 20; }
    
    doc.setDrawColor(0);
    doc.line(30, y, 90, y);
    doc.line(120, y, 180, y);
    
    doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    doc.text("Assinatura do Supervisor", 60, y + 5, null, null, "center");
    doc.text(`Assinatura da Central`, 150, y + 5, null, null, "center");

    const supervisorNomeLimpo = supervisor.trim().replace(/\s+/g, '_');
    doc.save(`Relatorio_${supervisorNomeLimpo}_${modoAtual}_${dataHoje.replace(/\//g, '-')}.pdf`);

    // Integração silenciosa com a nuvem (Google Drive)
    const nuvemAtiva = localStorage.getItem('nuvem_ativa') === 'true';
    const webhookUrl = localStorage.getItem('webhook_url');

    if (nuvemAtiva && webhookUrl) {
        mostrarAvisoSalvo("☁️ Salvando no Google Drive...");
        try {
            const supervisorNomeLimpo = supervisor.trim().replace(/\s+/g, '_');
            const pdfNome = `Relatorio_${supervisorNomeLimpo}_${modoAtual}_${dataHoje.replace(/\//g, '-')}.pdf`;
            const excelNome = `Relatorio_${supervisorNomeLimpo}_${modoAtual}_${dataHoje.replace(/\//g, '-')}.xlsx`;
            
            // Obter PDF em Base64
            const pdfBase64 = doc.output('datauristring').split(',')[1];
            
            // Obter Excel em Base64
            const excelBase64 = obterExcelBase64(modoAtual);
            
            // Montar o payload
            const payload = {
                pdfName: pdfNome,
                pdfData: pdfBase64,
                excelName: excelNome,
                excelData: excelBase64,
                supervisor: supervisor,
                dataRelatorio: dataHoje.replace(/\//g, '-'),
                mesAno: obterNomeMesAno(dataRelatorio)
            };
            
            fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain'
                },
                body: JSON.stringify(payload)
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    mostrarAvisoSalvo("☁️ PDF e Excel salvos no Google Drive!");
                } else {
                    mostrarAvisoSalvo("⚠️ Falha ao salvar no Drive: " + data.message);
                }
            })
            .catch(err => {
                console.error("Erro de requisição da nuvem:", err);
                mostrarAvisoSalvo("⚠️ Erro de rede ao salvar no Drive");
            });
        } catch (err) {
            console.error("Erro ao preparar dados da nuvem:", err);
            mostrarAvisoSalvo("⚠️ Erro ao salvar arquivos na nuvem");
        }
    }

    setTimeout(() => {
        const mensagem = nuvemAtiva 
            ? "✅ Relatório em PDF gerado e enviado para a nuvem com sucesso!"
            : "✅ Relatório em PDF gerado com sucesso!";
        alert(mensagem);
    }, 500);
}
