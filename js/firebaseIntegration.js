// firebaseIntegration.js
// Lida com a conexão e sincronização em tempo real via Firebase Firestore

let firebaseApp = null;
let dbFirestore = null;
let sessaoAtualId = null;
let unsubscribeSessao = null;

// Inicializa o Firebase se houver config salva ou global
function inicializarFirebase() {
    let configStr = localStorage.getItem('firebase_config');
    let config = null;

    if (configStr && configStr.trim() !== '') {
        try {
            let cleanedConfigStr = configStr.replace(/^[^{]*{/, '{').replace(/}[^}]*$/, '}');
            config = JSON.parse(cleanedConfigStr);
        } catch (e) {
            console.error("Erro ao ler JSON local", e);
        }
    } else if (typeof GLOBAL_FIREBASE_CONFIG !== 'undefined' && GLOBAL_FIREBASE_CONFIG !== null) {
        config = GLOBAL_FIREBASE_CONFIG;
    }

    if (config) {
        try {
            if (!firebase.apps.length) {
                firebaseApp = firebase.initializeApp(config);
            }
            dbFirestore = firebase.firestore();
            console.log("Firebase inicializado com sucesso.");
            return true;
        } catch(e) {
            console.error("Erro ao inicializar Firebase", e);
            alert("A configuração do Firebase é inválida. Verifique em Configurações ou no state.js.");
            return false;
        }
    }
    return false;
}

function carregarSessaoSalva() {
    let sessaoSalva = localStorage.getItem('sessao_firebase_atual');
    
    // Se não tiver sessão salva localmente, usa a global se existir
    if (!sessaoSalva && typeof GLOBAL_DEFAULT_SESSION !== 'undefined' && GLOBAL_DEFAULT_SESSION.trim() !== '') {
        sessaoSalva = GLOBAL_DEFAULT_SESSION;
    }
    
    if (sessaoSalva) {
        const inputSessao = document.getElementById('input-sessao-id');
        if (inputSessao) inputSessao.value = sessaoSalva;
        
        // Tenta conectar automaticamente se já tiver configurado local ou global
        if (localStorage.getItem('firebase_config') || (typeof GLOBAL_FIREBASE_CONFIG !== 'undefined' && GLOBAL_FIREBASE_CONFIG)) {
            conectarSessaoFirebase(sessaoSalva, true);
        }
    }
}

// Conectar a uma sessão na nuvem (ID de Sessão)
function conectarSessaoFirebase(sessionId, silencioso = false) {
    if (!sessionId || sessionId.trim() === '') {
        if (!silencioso) alert("Digite um ID de sessão válido (ex: TURNO-1).");
        return;
    }
    
    if (!dbFirestore) {
        if (!inicializarFirebase()) return;
    }
    
    sessaoAtualId = sessionId;
    localStorage.setItem('sessao_firebase_atual', sessionId);
    
    // Atualiza botão/UI
    const btnConectar = document.getElementById('btn-conectar-sessao');
    if (btnConectar) {
        btnConectar.innerHTML = `☁️ Conectado: ${sessionId}`;
        btnConectar.style.backgroundColor = '#0f9d58';
        btnConectar.style.color = 'white';
    }

    // Desconecta listeners anteriores, se houver
    if (unsubscribeSessao) unsubscribeSessao();
    
    // Opcional: Esvaziar registros locais para não duplicar, 
    // ou apenas manter e o Firebase atualiza?
    // É mais seguro limpar a memória se estamos mudando de sessão.
    if (!silencioso && confirm("Deseja apagar as fotos atuais desta máquina e carregar apenas as da nuvem para evitar duplicação? (Recomendado se estiver entrando na mesma sessão a partir do zero)")) {
        registros = [];
        atualizarTela();
    }
    
    console.log("Aguardando sincronização com a sessão:", sessionId);

    // Listener para pegar registros do Firestore em tempo real
    unsubscribeSessao = dbFirestore.collection("sessoes")
        .doc(sessionId)
        .collection("registros")
        .onSnapshot((snapshot) => {
            let houveMudanca = false;
            
            snapshot.docChanges().forEach((change) => {
                const dadoFirestore = change.doc.data();
                // Firestore document IDs são strings
                const docId = parseFloat(change.doc.id); 
                dadoFirestore.id = docId;

                const idxLocal = registros.findIndex(r => r.id === docId);

                if (change.type === "added") {
                    if (idxLocal === -1) {
                        registros.push(dadoFirestore);
                        houveMudanca = true;
                    }
                }
                if (change.type === "modified") {
                    if (idxLocal !== -1) {
                        registros[idxLocal] = dadoFirestore;
                        houveMudanca = true;
                    }
                }
                if (change.type === "removed") {
                    if (idxLocal !== -1) {
                        registros.splice(idxLocal, 1);
                        houveMudanca = true;
                    }
                }
            });
            
            if (houveMudanca) {
                atualizarTela();
                salvarDadosOffline();
                mostrarAvisoSalvo("☁️ Nuvem sincronizada");
            }
        }, (error) => {
            console.error("Erro no Listener da Nuvem:", error);
            if (btnConectar) {
                btnConectar.innerHTML = `⚠️ Erro de Conexão`;
                btnConectar.style.backgroundColor = '#f44336';
            }
        });
}

// Desconectar da sessão atual
function desconectarSessao() {
    if (unsubscribeSessao) {
        unsubscribeSessao();
        unsubscribeSessao = null;
    }
    sessaoAtualId = null;
    localStorage.removeItem('sessao_firebase_atual');
    const btnConectar = document.getElementById('btn-conectar-sessao');
    if (btnConectar) {
        btnConectar.innerHTML = `Conectar`;
        btnConectar.style.backgroundColor = '#fff';
        btnConectar.style.color = '#333';
        document.getElementById('input-sessao-id').value = '';
    }
}

// Enviar / Atualizar registro na Nuvem
function salvarRegistroNuvem(registro) {
    if (!dbFirestore || !sessaoAtualId) return; // Não configurado ou não conectado a nenhuma sessão
    
    dbFirestore.collection("sessoes")
        .doc(sessaoAtualId)
        .collection("registros")
        .doc(registro.id.toString())
        .set(registro)
        .then(() => {
            console.log("Registro salvo na nuvem");
        })
        .catch((error) => {
            console.error("Erro ao salvar na nuvem: ", error);
        });
}

// Deletar registro da nuvem
function deletarRegistroNuvem(registroId) {
    if (!dbFirestore || !sessaoAtualId) return;
    
    dbFirestore.collection("sessoes")
        .doc(sessaoAtualId)
        .collection("registros")
        .doc(registroId.toString())
        .delete()
        .then(() => {
            console.log("Registro apagado da nuvem");
        })
        .catch((error) => {
            console.error("Erro ao apagar na nuvem: ", error);
        });
}

// Subir todos os dados locais existentes para a nuvem de uma vez
function fazerUploadDadosLocaisParaNuvem() {
    if (!dbFirestore || !sessaoAtualId) {
        alert("Por favor, conecte-se a uma sessão na nuvem primeiro!");
        return;
    }
    
    if (registros.length === 0) {
        alert("Não há dados locais para enviar.");
        return;
    }

    if (confirm(`Deseja enviar todas as ${registros.length} fotos/registros desta máquina para a Sessão ${sessaoAtualId} na nuvem?`)) {
        registros.forEach(reg => {
            salvarRegistroNuvem(reg);
        });
        alert(`Enviando ${registros.length} registros para a nuvem! Eles logo aparecerão nos outros computadores.`);
    }
}

// Inicializa os botões ao carregar (é chamado via body onload ou após scripts carregarem)
document.addEventListener("DOMContentLoaded", () => {
    carregarSessaoSalva();
});
