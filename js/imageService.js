// Processamento de Imagens, Drag and Drop e Paste

function acionarInputFotos() {
    const input = document.getElementById('fotos-input');
    if (input) input.click();
}

function processarImagens(files) {
    const condominio = document.getElementById('condominio').value;
    const agente = document.getElementById('agente').value.trim();
    const faseRegistro = document.getElementById('faseRegistro').value;
    const horario = document.getElementById('horario').value;

    if (!condominio || !agente || !faseRegistro || !horario) {
        alert("Preencha todos os campos antes de arrastar ou selecionar as fotos.");
        document.getElementById('fotos-input').value = "";
        return;
    }

    if (!validarLogica(modoAtual, condominio, faseRegistro, null, agente, horario)) {
        document.getElementById('fotos-input').value = "";
        return;
    }

    const duplicado = registros.some(r => r.modo === modoAtual && r.condominio === condominio && r.fase === faseRegistro && r.horario === horario);
    if (duplicado && !confirm(`⚠️ ATENÇÃO: Você já lançou uma foto para ${condominio} (${faseRegistro}) exatamente às ${horario}.\n\nDeseja mesmo adicionar outra foto repetida para este horário e fase?`)) {
        document.getElementById('fotos-input').value = "";
        return;
    }

    salvarNovoAgenteNoHistorico(agente);

    if (files.length === 0) {
        alert("Erro: Nenhuma foto detectada no momento de arrastar.");
        return;
    }

    Array.from(files).forEach(file => {
        if (!file.type.startsWith('image/')) {
            alert(`Atenção: O item "${file.name || 'desconhecido'}" não é uma imagem válida.`);
            return;
        }
        const reader = new FileReader();
        reader.onload = function(e) {
            processarUmaImagem(e.target.result, file.name, {
                condominio,
                agente,
                faseRegistro,
                horario
            });
        }
        reader.readAsDataURL(file);
    });

    document.getElementById('fotos-input').value = "";
    document.getElementById('horario').value = "";
    document.getElementById('faseRegistro').value = "";
}

function processarUmaImagem(src, nomeOriginal = 'imagem', dados = null) {
    const condominio = dados ? dados.condominio : document.getElementById('condominio').value;
    const agente = dados ? dados.agente : document.getElementById('agente').value.trim();
    const faseRegistro = dados ? dados.faseRegistro : document.getElementById('faseRegistro').value;
    const horario = dados ? dados.horario : document.getElementById('horario').value;

    const img = new Image();
    
    // Configurar crossOrigin para evitar canvas contaminado com imagens de outros domínios
    if (!src.startsWith('data:')) {
        img.crossOrigin = "Anonymous";
    }

    img.onload = function() {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const MAX_WIDTH = 400; 
            let width = img.width; 
            let height = img.height;
            if (width > MAX_WIDTH) { 
                height *= MAX_WIDTH / width; 
                width = MAX_WIDTH; 
            }
            canvas.width = width; 
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            
            // Marca d'água / Carimbo na foto
            ctx.fillStyle = "rgba(0, 0, 0, 0.6)"; 
            ctx.fillRect(0, height - 30, width, 30);
            
            ctx.fillStyle = "white";
            ctx.font = "bold 14px Arial";
            const isInicio = faseRegistro.startsWith('Início');
            ctx.fillText(`${isInicio ? '🟢' : '🔴'} ${faseRegistro} - ${condominio} às ${horario}`, 10, height - 10);
            
            const fotoBase64 = canvas.toDataURL('image/jpeg', 0.5);
            
            registros.push({
                id: Date.now() + Math.random(),
                modo: modoAtual,
                condominio: condominio,
                agente: agente,
                fase: faseRegistro,
                horario: horario,
                foto: fotoBase64
            });
            
            atualizarTela();
            salvarDadosOffline();
        } catch (err) {
            console.error("Erro ao processar imagem no canvas:", err);
            alert(`⚠️ Não foi possível processar a imagem "${nomeOriginal}" devido a restrições de segurança do navegador.\n\n💡 Dica rápida: Você não precisa baixar a foto! Clique nela no WhatsApp, copie-a (botão direito -> Copiar Imagem ou Ctrl+C) e cole-a (Ctrl+V) diretamente nesta página.`);
        }
    };
    
    img.onerror = function() {
        alert(`⚠️ Não foi possível carregar a imagem "${nomeOriginal}" diretamente.\n\n💡 Dica rápida: Você não precisa baixar a foto! Clique nela no WhatsApp, copie-a (botão direito -> Copiar Imagem ou Ctrl+C) e cole-a (Ctrl+V) diretamente nesta página.`);
    };

    img.src = src;
}

// Event Listeners para Drag and Drop
const dropArea = document.getElementById('drop-area');
if (dropArea) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(e => { 
        dropArea.addEventListener(e, preventD, false); 
        document.body.addEventListener(e, preventD, false); 
    });

    function preventD(e) { e.preventDefault(); e.stopPropagation(); }

    ['dragenter', 'dragover'].forEach(e => dropArea.addEventListener(e, () => dropArea.classList.add('dragover'), false));
    ['dragleave', 'drop'].forEach(e => dropArea.addEventListener(e, () => dropArea.classList.remove('dragover'), false));

    dropArea.addEventListener('drop', function(e) { 
        let arquivosExtraidos = Array.from(e.dataTransfer.files);
        if (arquivosExtraidos.length === 0 && e.dataTransfer.items) {
            for (let i = 0; i < e.dataTransfer.items.length; i++) {
                let item = e.dataTransfer.items[i];
                if (item.type.indexOf('image/') !== -1) {
                    let arquivoDaWeb = item.getAsFile();
                    if (arquivoDaWeb) arquivosExtraidos.push(arquivoDaWeb);
                }
            }
        }
        
        if (arquivosExtraidos.length > 0) {
            processarImagens(arquivosExtraidos); 
        } else {
            // Tenta obter links ou HTML da imagem arrastada
            let url = e.dataTransfer.getData('URL') || e.dataTransfer.getData('text/uri-list');
            let html = e.dataTransfer.getData('text/html');
            
            if (!url && html) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const imgEl = doc.querySelector('img');
                if (imgEl && imgEl.src) {
                    url = imgEl.src;
                }
            }
            
            if (url) {
                // Verificar preenchimento básico antes de tentar processar
                const condominio = document.getElementById('condominio').value;
                const agente = document.getElementById('agente').value.trim();
                const faseRegistro = document.getElementById('faseRegistro').value;
                const horario = document.getElementById('horario').value;

                if (!condominio || !agente || !faseRegistro || !horario) {
                    alert("Preencha todos os campos antes de arrastar ou selecionar as fotos.");
                    return;
                }

                if (!validarLogica(modoAtual, condominio, faseRegistro, null, agente, horario)) {
                    return;
                }

                const duplicado = registros.some(r => r.modo === modoAtual && r.condominio === condominio && r.fase === faseRegistro && r.horario === horario);
                if (duplicado && !confirm(`⚠️ ATENÇÃO: Você já lançou uma foto para ${condominio} (${faseRegistro}) exatamente às ${horario}.\n\nDeseja mesmo adicionar outra foto repetida para este horário e fase?`)) {
                    return;
                }
                
                salvarNovoAgenteNoHistorico(agente);
                
                if (url.startsWith('data:image/')) {
                    processarUmaImagem(url, "imagem_arrastada", { condominio, agente, faseRegistro, horario });
                    document.getElementById('horario').value = "";
                    document.getElementById('faseRegistro').value = "";
                } else if (url.startsWith('blob:')) {
                    alert(`⚠️ Não é possível arrastar fotos diretamente do WhatsApp Web devido a restrições de segurança do navegador.\n\n💡 Dica rápida: Você não precisa baixar a foto! Clique nela no WhatsApp, copie-a (botão direito -> Copiar Imagem ou Ctrl+C) e cole-a (Ctrl+V) em qualquer parte desta tela.`);
                } else {
                    processarUmaImagem(url, "imagem_url", { condominio, agente, faseRegistro, horario });
                    document.getElementById('horario').value = "";
                    document.getElementById('faseRegistro').value = "";
                }
            } else {
                alert("Erro: Nenhuma foto detectada no momento de arrastar.");
            }
        }
    }, false);
}

// Suporte robusto para Ctrl+V (colar)
document.addEventListener('paste', function(e) {
    let arquivos = [];
    if (e.clipboardData) {
        if (e.clipboardData.files && e.clipboardData.files.length > 0) {
            arquivos = Array.from(e.clipboardData.files);
        } else if (e.clipboardData.items) {
            for (let i = 0; i < e.clipboardData.items.length; i++) {
                let item = e.clipboardData.items[i];
                if (item.type.indexOf('image/') !== -1) {
                    let file = item.getAsFile();
                    if (file) arquivos.push(file);
                }
            }
        }
    }
    
    if (arquivos.length > 0) {
        processarImagens(arquivos);
    }
});
