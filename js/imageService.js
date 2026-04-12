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

    if (!validarLogica(modoAtual, condominio, faseRegistro, null)) {
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
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const MAX_WIDTH = 500; 
                let width = img.width; let height = img.height;
                if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                canvas.width = width; canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                // Marca d'água / Carimbo na foto
                ctx.fillStyle = "rgba(0, 0, 0, 0.6)"; 
                ctx.fillRect(0, height - 30, width, 30);
                
                ctx.fillStyle = "white";
                ctx.font = "bold 14px Arial";
                const isInicio = faseRegistro.startsWith('Início');
                ctx.fillText(`${isInicio ? '🟢' : '🔴'} ${faseRegistro} - ${condominio} às ${horario}`, 10, height - 10);
                
                registros.push({
                    id: Date.now() + Math.random(),
                    modo: modoAtual,
                    condominio: condominio,
                    agente: agente,
                    fase: faseRegistro,
                    horario: horario,
                    foto: canvas.toDataURL('image/jpeg', 0.6)
                });
                
                atualizarTela();
                salvarDadosOffline(); 
            }
            img.src = e.target.result;
        }
        reader.readAsDataURL(file);
    });

    document.getElementById('fotos-input').value = "";
    document.getElementById('horario').value = "";
    document.getElementById('faseRegistro').value = "";
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
        processarImagens(arquivosExtraidos); 
    }, false);
}

// Suporte para Ctrl+V
document.addEventListener('paste', function(e) {
    if (e.clipboardData && e.clipboardData.files.length > 0) {
        processarImagens(e.clipboardData.files);
    }
});
