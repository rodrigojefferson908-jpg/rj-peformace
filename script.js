import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, push, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyALgq-QhWX3Z27xaQcbAhGA0uaVso2Mmkw",
    authDomain: "treino-9dd2a.firebaseapp.com",
    databaseURL: "https://treino-9dd2a-default-rtdb.firebaseio.com",
    projectId: "treino-9dd2a",
    storageBucket: "treino-9dd2a.firebasestorage.app",
    messagingSenderId: "276185169582",
    appId: "1:276185169582:web:29f42b9d8330059f5e773f"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

function dispararSomBuzina() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(180, audioCtx.currentTime); 
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(185, audioCtx.currentTime);
        gain1.gain.setValueAtTime(1.0, audioCtx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6); 
        gain2.gain.setValueAtTime(1.0, audioCtx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc1.start();
        osc2.start();
        osc1.stop(audioCtx.currentTime + 0.6);
        osc2.stop(audioCtx.currentTime + 0.6);
    } catch (e) {
        console.log("Erro ao inicializar som: ", e);
    }
}

let biblioteca = [], alunas = [], treinosDesignados = [], playlists = [], treinadores = [], usuarioLogado = "", tipoUsuarioLogado = "";
let idEdicaoAluna = null;
let idEdicaoBiblioteca = null;
let alunaSelecionadaFluxo = "";
let passoAtualAnamnese = 1;

let ferramentaAtiva = "timer";
let timerInterval = null; 
let cronometroInterval = null; let cronometroTempo = 0;
let hiitInterval = null; let hiitEstado = "PREPARAR";
let hiitCiclosRestantes = 0; let hiitTempoRestante = 0;
let metronomoInterval = null;
let metroEstadoCor = false; 

let memoriaTimerMin = 0;
let memoriaTimerSeg = 0;
let memoriaHiitPrep = 5;
let memoriaHiitTreino = 20;
let memoriaHiitDesc = 10;
let memoriaHiitCiclos = 8;
let memoriaMetroBpm = 60;

window.ferramentaFixaStatus = true;

const ORDEM_DEFINIDA = [
    "AQUECIMENTO", "CARDIO", "MEMBROS INFERIORES", "INFERIORES", 
    "MEMBROS SUPERIORES", "SUPERIORES", "CORE", "ABDOMINAL", "ALONGAMENTO"
];

function estaNoApp() {
    return navigator.userAgent.includes("wv") ||
           navigator.userAgent.includes("MIT") ||
           navigator.userAgent.includes("Android");
}

function normalizar(texto) {
    return texto ? texto.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : "";
}

window.toggleMenuLateral = () => {
    const menu = document.getElementById('menu-lateral');
    const overlay = document.getElementById('menu-overlay');
    if(menu && overlay) {
        menu.classList.toggle('aberto');
        overlay.classList.toggle('aberto');
    }
};

window.switchTab = (aba) => {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.menu-item').forEach(b => b.classList.remove('active'));

    const target = document.getElementById(`aba-${aba}`);
    if(target) target.style.display = 'block';

    const btnMenu = document.getElementById(`btn-menu-${aba}`);
    if(btnMenu) btnMenu.classList.add('active');

    if(aba === 'lista' && tipoUsuarioLogado === "Treinador") { 
        alunaSelecionadaFluxo = ""; 
    }

    const menu = document.getElementById('menu-lateral');
    const overlay = document.getElementById('menu-overlay');
    if(menu && menu.classList.contains('aberto')) {
        menu.classList.remove('aberto');
        overlay.classList.remove('aberto');
    }
    renderizar();
};

function atualizarEstruturaMenuLateral() {
    const containerLinks = document.getElementById('links-menu-dinamico');
    if(!containerLinks) return;

    if(tipoUsuarioLogado === "Admin") {
        containerLinks.innerHTML = `
            <button onclick="switchTab('criar-treino')" id="btn-menu-criar-treino" class="menu-item active"><i class="fas fa-plus-circle"></i> Criar Treino</button>
            <button onclick="switchTab('dados-treino')" id="btn-menu-dados-treino" class="menu-item"><i class="fas fa-database"></i> Dados de Treino</button>
            <button onclick="switchTab('cadastro-treinador')" id="btn-menu-cadastro-treinador" class="menu-item"><i class="fas fa-user-shield"></i> Cadastrar Treinador</button>
            <button onclick="switchTab('dados-treinador')" id="btn-menu-dados-treinador" class="menu-item"><i class="fas fa-users-cog"></i> Dados de Treinador</button>
            <button onclick="logout()" class="menu-item menu-item-sair"><i class="fas fa-sign-out-alt"></i> Sair</button>
        `;
    } else if(tipoUsuarioLogado === "Treinador") {
        containerLinks.innerHTML = `
            <button onclick="switchTab('lista')" id="btn-menu-lista" class="menu-item active"><i class="fas fa-home"></i> Início</button>
            <button onclick="switchTab('fichas')" id="btn-menu-fichas" class="menu-item"><i class="fas fa-address-book"></i> Ficha da Aluna</button>
            <button onclick="switchTab('designar')" id="btn-menu-designar" class="menu-item"><i class="fas fa-tasks"></i> Designar Treino</button>
            <button onclick="switchTab('cadastro')" id="btn-menu-cadastro" class="menu-item"><i class="fas fa-user-plus"></i> Cadastrar Nova Aluna</button>
            <button onclick="switchTab('musicas')" id="btn-menu-musicas" class="menu-item"><i class="fas fa-music"></i> Músicas</button>
            <button onclick="switchTab('gerenciar-musicas')" id="btn-menu-gerenciar-musicas" class="menu-item"><i class="fas fa-sliders-h"></i> Gerenciar Música</button>
            <button onclick="logout()" class="menu-item menu-item-sair"><i class="fas fa-sign-out-alt"></i> Sair</button>
        `;
    } else {
        containerLinks.innerHTML = `
            <button onclick="switchTab('lista')" id="btn-menu-lista" class="menu-item active"><i class="fas fa-home"></i> Início</button>
            <button onclick="switchTab('musicas')" id="btn-menu-musicas" class="menu-item"><i class="fas fa-music"></i> Músicas</button>
            <button onclick="switchTab('gerenciar-musicas')" id="btn-menu-gerenciar-musicas" class="menu-item"><i class="fas fa-sliders-h"></i> Gerenciar Música</button>
            <button onclick="logout()" class="menu-item menu-item-sair"><i class="fas fa-sign-out-alt"></i> Sair</button>
        `;
    }
}

window.toggleSenhaVisualizacao = () => {
    const input = document.getElementById('input-senha');
    const icone = document.getElementById('toggleSenha');
    if (input && icone) {
        input.type = input.type === "password" ? "text" : "password";
        icone.classList.toggle("fa-eye-slash");
    }
};

window.toggleCamposAnamnese = (idContainer, show) => {
    const el = document.getElementById(idContainer);
    if(el) el.style.display = show ? 'block' : 'none';
};

window.navegarAnamnese = (direcao) => {
    const passoAtualEl = document.getElementById(`passo-${passoAtualAnamnese}`);
    if (direcao === 1) {
        const inputsObrigat = passoAtualEl.querySelectorAll('[required]');
        let valido = true;
        inputsObrigat.forEach(i => {
            if(!i.checkValidity()) {
                i.reportValidity();
                valido = false;
            }
        });
        if(!valido) return;
    }
    passoAtualEl.style.display = 'none';
    passoAtualAnamnese += direcao;
    if (passoAtualAnamnese > 10) {
        passoAtualAnamnese = 10;
        finalizarESalvarAnamnese();
        return;
    }
    document.getElementById(`passo-${passoAtualAnamnese}`).style.display = 'block';
    document.getElementById('progresso-anamnese').innerText = `Passo ${passoAtualAnamnese} de 10`;
    document.getElementById('btn-ana-voltar').style.display = passoAtualAnamnese === 1 ? 'none' : 'block';
    document.getElementById('btn-ana-avancar').innerText = passoAtualAnamnese === 10 ? 'Concluir' : 'Avançar';
};

function finalizarESalvarAnamnese() {
    const alunaObj = alunas.find(a => a.nome === usuarioLogado);
    if(!alunaObj) return;
    const obterChecks = (nome) => Array.from(document.querySelectorAll(`input[name="${nome}"]:checked`)).map(c => c.value);
    const anamneseDados = {
        identificacao: {
            nomeCompleto: document.getElementById('ana-nome').value,
            dataNascimento: document.getElementById('ana-nasc').value,
            idade: document.getElementById('ana-idade').value,
            sexo: document.getElementById('ana-sexo').value,
            altura: document.getElementById('ana-altura').value,
            peso: document.getElementById('ana-peso').value,
            telefone: document.getElementById('ana-tel').value,
            email: document.getElementById('ana-email').value,
            profissao: document.getElementById('ana-profissao').value,
        },
        objetivos: { principais: obterChecks('ana-obj'), outro: document.getElementById('ana-obj-outro').value, prazo: document.getElementById('ana-prazo').value },
        historicoAtividade: { praticaAtualmente: document.getElementById('ana-pratica-atual').value, modalidade: document.getElementById('ana-modalidade').value, tempoPratica: document.getElementById('ana-tempo-pratica').value, frequenciaSemanal: document.getElementById('ana-frequencia').value, duracaoTreino: document.getElementById('ana-duracao').value, praticouAntes: document.getElementById('ana-pratica-anterior').value, quaisAnteriores: document.getElementById('ana-quais-anteriores').value },
        historicoMedico: { possuiDoenca: document.getElementById('ana-doenca').value, doencas: obterChecks('ana-doencas-lista'), outraDoenca: document.getElementById('ana-doenca-outra').value, realizouCirurgia: document.getElementById('ana-cirurgia').value, qualCirurgia: document.getElementById('ana-cirurgia-qual').value, quandoCirurgia: document.getElementById('ana-cirurgia-quando').value },
        parQ: { problemaCardiaco: document.getElementById('parq-1').value, dorPeitoExercicio: document.getElementById('parq-2').value, tonturaDesmaioFaltaAr: document.getElementById('parq-3').value, pressaoAlta: document.getElementById('parq-4').value, medicamentoPressaoCoracao: document.getElementById('parq-5').value, limitacaoExercicio: document.getElementById('parq-6').value },
        lesoesLimitacoes: { possuiLesao: document.getElementById('ana-lesao').value, locais: obterChecks('ana-lesao-local'), outroLocal: document.getElementById('ana-lesao-outro').value, senteDorAtual: document.getElementById('ana-dor-atual').value, escalaDor: document.getElementById('ana-dor-escala').value, movimentoProvocaDor: document.getElementById('ana-movimento-dor').value, qualMovimento: document.getElementById('ana-movimento-qual').value },
        medicamentosSuplementos: { medicamentoContinuo: document.getElementById('ana-med-continuo').value, quaisMedicamentos: document.getElementById('ana-med-quais').value, usaSuplementos: document.getElementById('ana-suple').value, suplementosLista: obterChecks('ana-suple-lista'), outroSuplemento: document.getElementById('ana-suple-outro').value },
        alimentacao: { acompanhamentoNutricional: document.getElementById('ana-nutri').value },
        disponibilidade: { diasSemana: document.getElementById('ana-disp-dias').value, tempoSessao: document.getElementById('ana-disp-tempo').value, localTreino: document.getElementById('ana-disp-local').value },
        dataEnvio: document.getElementById('ana-data-envio').value
    };
    update(ref(db, `alunas/${alunaObj.id}`), { anamnese: anamneseDados }).then(() => {
        alert("Questionário de anamnese respondido com sucesso!");
        document.getElementById('tela-anamnese').style.display = 'none';
        document.getElementById('app').style.display = 'block';
        renderizar();
    });
}

window.fazerLogin = () => {
    const user = document.getElementById('input-usuario').value.trim();
    const pass = document.getElementById('input-senha').value;

    if(user === "Admin" && pass === "147258") {
        entrarNoApp("Admin", "Admin");
    } else {
        const treinador = treinadores.find(t => t.nome === user && t.senha === pass);
        if(treinador) {
            entrarNoApp(treinador.nome, "Treinador");
            return;
        }

        const aluna = alunas.find(a => a.nome === user && a.senha === pass);
        if(aluna) {
            usuarioLogado = aluna.nome;
            tipoUsuarioLogado = "Aluna";
            if (!aluna.anamnese) {
                document.getElementById('tela-login').style.display = 'none';
                document.getElementById('tela-anamnese').style.display = 'flex';
                passoAtualAnamnese = 1;
                document.querySelectorAll('.passo-anamnese').forEach(p => p.style.display = 'none');
                document.getElementById('passo-1').style.display = 'block';
                document.getElementById('btn-ana-voltar').style.display = 'none';
                document.getElementById('btn-ana-avancar').innerText = 'Avançar';
                document.getElementById('progresso-anamnese').innerText = `Passo 1 de 10`;
                document.getElementById('form-anamnese').reset();
            } else {
                entrarNoApp(aluna.nome, "Aluna");
            }
        } else {
            alert("Usuário ou senha incorretos!");
        }
    }
};

function entrarNoApp(nome, tipo) {
    usuarioLogado = nome;
    tipoUsuarioLogado = tipo;
    document.getElementById('tela-login').style.display = 'none';
    document.getElementById('tela-anamnese').style.display = 'none';
    document.getElementById('app').style.display = 'block';

    document.getElementById('avisos-admin').style.display = tipo === "Treinador" ? "block" : "none";
    document.getElementById('boas-vindas').innerText = `Olá, ${nome}`;
    alunaSelecionadaFluxo = "";
// Salva a sessão somente no aplicativo
if (estaNoApp()) {
    localStorage.setItem("sessaoRJ", JSON.stringify({
        usuario: nome,
        tipo: tipo
    }));
}
    atualizarEstruturaMenuLateral();
    if(tipo === "Admin") {
        switchTab('criar-treino');
    } else {
        switchTab('lista');
    }
}

window.logout = function() {
    usuarioLogado = "";
    tipoUsuarioLogado = "";
    document.getElementById('app').style.display = 'none';
    document.getElementById('tela-anamnese').style.display = 'none';
    document.getElementById('tela-login').style.display = 'flex';
    document.getElementById('input-usuario').value = "";
    document.getElementById('input-senha').value = "";

    const menu = document.getElementById('menu-lateral');
    const overlay = document.getElementById('menu-overlay');
    if(menu && menu.classList.contains('aberto')) {
        menu.classList.remove('aberto');
        overlay.classList.remove('aberto');
    }
};

window.mudarFerramentaAtiva = (novaFerramenta) => {
    salvarConfiguracoesAtuais();
    ferramentaAtiva = novaFerramenta;
    window.resetarTimer(); window.resetarCronometro(); window.resetarHiit(); window.resetarMetronomo();
    renderizar();
};

function salvarConfiguracoesAtuais() {
    if (document.getElementById('hiit-prep')) {
        memoriaHiitPrep = parseInt(document.getElementById('hiit-prep').value) || 5;
        memoriaHiitTreino = parseInt(document.getElementById('hiit-treino').value) || 20;
        memoriaHiitDesc = parseInt(document.getElementById('hiit-desc').value) || 10;
        memoriaHiitCiclos = parseInt(document.getElementById('hiit-ciclos').value) || 8;
    }
    if (document.getElementById('timer-min-input')) {
        memoriaTimerMin = parseInt(document.getElementById('timer-min-input').value) || 0;
        memoriaTimerSeg = parseInt(document.getElementById('timer-seg-input').value) || 0;
    }
    if (document.getElementById('metro-bpm')) {
        memoriaMetroBpm = parseInt(document.getElementById('metro-bpm').value) || 60;
    }
}

window.alternarFixacao = (deveFixar) => {
    const cardVerde = document.getElementById('card-ferramentas-aluna');
    if (cardVerde) {
        if (deveFixar) cardVerde.classList.add('ferramenta-fixada');
        else cardVerde.classList.remove('ferramenta-fixada');
    }
    window.ferramentaFixaStatus = deveFixar;
};

window.atualizarValoresTimerScroll = () => {
    const m = document.getElementById('timer-min-input');
    const s = document.getElementById('timer-seg-input');
    if(m && s) {
        memoriaTimerMin = parseInt(m.value) || 0;
        memoriaTimerSeg = parseInt(s.value) || 0;
    }
};

window.iniciarTimer = () => {
    clearInterval(timerInterval);
    window.atualizarValoresTimerScroll();
    let tempoTotal = (memoriaTimerMin * 60) + memoriaTimerSeg;
    if (tempoTotal <= 0) return;

    if(document.getElementById('timer-min-input')) document.getElementById('timer-min-input').disabled = true;
    if(document.getElementById('timer-seg-input')) document.getElementById('timer-seg-input').disabled = true;

    timerInterval = setInterval(() => {
        if (tempoTotal <= 0) { 
            clearInterval(timerInterval);
            timerInterval = null;
            dispararSomBuzina();
            window.resetarTimer();
            return;
        }
        tempoTotal--;
        const m = Math.floor(tempoTotal / 60);
        const s = tempoTotal % 60;
        if(document.getElementById('timer-min-input')) document.getElementById('timer-min-input').value = m;
        if(document.getElementById('timer-seg-input')) document.getElementById('timer-seg-input').value = s;
    }, 1000);
};

window.resetarTimer = () => { 
    clearInterval(timerInterval); 
    timerInterval = null; 
    memoriaTimerMin = 0; 
    memoriaTimerSeg = 0; 
    if(document.getElementById('timer-min-input')) { 
        document.getElementById('timer-min-input').disabled = false;
        document.getElementById('timer-min-input').value = 0; 
    }
    if(document.getElementById('timer-seg-input')) {
        document.getElementById('timer-seg-input').disabled = false;
        document.getElementById('timer-seg-input').value = 0; 
    }
};

window.iniciarCronometro = () => {
    if(cronometroInterval) return;
    cronometroInterval = setInterval(() => {
        cronometroTempo++;
        const m = Math.floor(cronometroTempo / 60);
        const s = cronometroTempo % 60;
        document.getElementById('cronometro-display').innerText = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }, 1000);
};
window.pausarCronometro = () => { clearInterval(cronometroInterval); cronometroInterval = null; };
window.resetarCronometro = () => { clearInterval(cronometroInterval); cronrunning = null; cronometroInterval = null; cronometroTempo = 0; if(document.getElementById('cronometro-display')) document.getElementById('cronometro-display').innerText = "00:00"; };

window.iniciarHiit = () => {
    if(hiitInterval) return;
    const pPrep = parseInt(document.getElementById('hiit-prep').value) || 5;
    const pTreino = parseInt(document.getElementById('hiit-treino').value) || 20;
    const pDesc = parseInt(document.getElementById('hiit-desc').value) || 10;
    const pCiclos = parseInt(document.getElementById('hiit-ciclos').value) || 8;

    if(hiitCiclosRestantes === 0) {
        hiitCiclosRestantes = pCiclos;
        hiitTempoRestante = pPrep;
        hiitEstado = "PREPARAR";
    }

    const statusEl = document.getElementById('hiit-status');

    hiitInterval = setInterval(() => {
        let mudouEstado = false;
        if(hiitTempoRestante <= 0) {
            dispararSomBuzina();
            mudouEstado = true;
            if(hiitEstado === "PREPARAR") {
                hiitEstado = "COMECE!";
                hiitTempoRestante = pTreino;
            } else if(hiitEstado === "COMECE!") {
                hiitEstado = "DESCANSO";
                hiitTempoRestante = pDesc;
            } else if(hiitEstado === "DESCANSO") {
                hiitCiclosRestantes--;
                if(hiitCiclosRestantes <= 0) {
                    clearInterval(hiitInterval); hiitInterval = null;
                    statusEl.className = "hiit-status-animado hiit-fim";
                    statusEl.innerText = "FIM DO CARDIO!";
                    document.getElementById('hiit-display').innerText = "00:00";
                    memoriaHiitPrep = 5; memoriaHiitTreino = 20; memoriaHiitDesc = 10; memoriaHiitCiclos = 8;
                    if (document.getElementById('hiit-prep')) {
                        document.getElementById('hiit-prep').value = 5; document.getElementById('hiit-treino').value = 20; document.getElementById('hiit-desc').value = 10; document.getElementById('hiit-ciclos').value = 8;
                    }
                    hiitCiclosRestantes = 0; hiitTempoRestante = 0;
                    return;
                } else {
                    hiitEstado = "COMECE!";
                    hiitTempoRestante = pTreino;
                }
            }
        }

        if (mudouEstado || hiitTempoRestante === pPrep - 1) {
            statusEl.style.animation = 'none'; statusEl.offsetHeight; statusEl.style.animation = null;
        }

        if (hiitEstado === "PREPARAR") {
            statusEl.className = "hiit-status-animado hiit-preparar"; statusEl.innerText = `PREPARAR (Série ${hiitCiclosRestantes})`;
        } else if (hiitEstado === "COMECE!") {
            statusEl.className = "hiit-status-animado hiit-treino"; statusEl.innerText = `COMECE!`;
        } else if (hiitEstado === "DESCANSO") {
            statusEl.className = "hiit-status-animado hiit-descanso"; statusEl.innerText = `DESCANSO`;
        }

        const m = Math.floor(hiitTempoRestante / 60); const s = hiitTempoRestante % 60;
        document.getElementById('hiit-display').innerText = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        hiitTempoRestante--;
    }, 1000);
};
window.pausarHiit = () => { clearInterval(hiitInterval); hiitInterval = null; };
window.resetarHiit = () => { clearInterval(hiitInterval); hiitInterval = null; hiitCiclosRestantes = 0; hiitTempoRestante = 0; memoriaHiitPrep = 5; memoriaHiitTreino = 20; memoriaHiitDesc = 10; memoriaHiitCiclos = 8; if (document.getElementById('hiit-prep')) { document.getElementById('hiit-prep').value = 5; document.getElementById('hiit-treino').value = 20; document.getElementById('hiit-desc').value = 10; document.getElementById('hiit-ciclos').value = 8; } if(document.getElementById('hiit-display')) { document.getElementById('hiit-display').innerText = "00:00"; document.getElementById('hiit-status').className = "hiit-status-animado hiit-preparar"; document.getElementById('hiit-status').innerText = "PREPARAR"; } };

window.iniciarMetronomo = () => {
    if(metronomoInterval) return;
    const bpm = parseInt(document.getElementById('metro-bpm').value) || 60;
    const intervaloMs = 60000 / bpm;
    metronomoInterval = setInterval(() => {
        dispararSomBuzina();
        const visual = document.getElementById('metro-visual');
        if(visual) {
            metroEstadoCor = !metroEstadoCor;
            visual.style.background = metroEstadoCor ? "#43a047" : "#ef5350"; visual.style.borderColor = metroEstadoCor ? "#a5d6a7" : "#ff8a80";
            setTimeout(() => { visual.style.background = "#1a1a1a"; visual.style.borderColor = "#444"; }, 120);
        }
    }, intervaloMs);
};
window.pausarMetronomo = () => { clearInterval(metronomoInterval); metronomoInterval = null; };
window.resetarMetronomo = () => { clearInterval(metronomoInterval); metronomoInterval = null; const visual = document.getElementById('metro-visual'); if(visual) { visual.style.background = "#1a1a1a"; visual.style.borderColor = "#43a047"; } };

window.cadastrarTreinador = () => {
    const nome = document.getElementById('cad-nome-treinador').value.trim();
    const senha = document.getElementById('cad-senha-treinador').value.trim();
    if(!nome || !senha) return alert("Preencha o nome e a senha do treinador!");

    push(ref(db, 'treinadores/'), { nome, senha }).then(() => {
        alert("Novo treinador cadastrado com sucesso!");
        document.getElementById('cad-nome-treinador').value = "";
        document.getElementById('cad-senha-treinador').value = "";
    });
};

window.cadastrarAluna = () => {
    const nome = document.getElementById('cad-nome-aluna').value.trim();
    const senha = document.getElementById('cad-senha-aluna').value.trim();
    const foto = document.getElementById('cad-foto-aluna').value.trim() || 'https://via.placeholder.com/150';
    const info = document.getElementById('cad-info-aluna').value.trim();
    if(!nome || !senha) return alert("Preencha nome e senha!");

    if(idEdicaoAluna) {
        update(ref(db, `alunas/${idEdicaoAluna}`), { nome, senha, foto, info }).then(() => {
            alert("Cadastro da aluna atualizado com sucesso!");
            limparFormularioAluna();
            switchTab('fichas');
        });
    } else {
        const idTreinador = usuarioLogado; 
        push(ref(db, 'alunas/'), { nome, senha, foto, info, idTreinador }).then(() => {
            alert("Nova aluna cadastrada!");
            limparFormularioAluna();
        });
    }
};

window.limparFormularioAluna = () => {
    idEdicaoAluna = null;
    document.getElementById('cad-nome-aluna').value = ""; 
    document.getElementById('cad-senha-aluna').value = ""; 
    document.getElementById('cad-foto-aluna').value = ""; 
    document.getElementById('cad-info-aluna').value = "";
    document.getElementById('titulo-cad-aluna').innerHTML = `<i class="fas fa-user-plus"></i> Cadastrar Nova Aluna`;
    document.getElementById('btn-salvar-aluna').innerText = "Salvar Cadastro";
    document.getElementById('btn-cancelar-edit-aluna').style.display = "none";
};

window.salvarNaBiblioteca = () => {
    const nome = document.getElementById('lib-nome').value;
    const foto = document.getElementById('lib-foto').value || 'https://via.placeholder.com/300x200';
    const legenda = document.getElementById('lib-legenda').value;
    const category = document.getElementById('lib-categoria').value;
    if(!nome) return alert("Digite o nome do exercício!");

    if(idEdicaoBiblioteca) {
        update(ref(db, `biblioteca/${idEdicaoBiblioteca}`), { nome, foto, legenda, category, categoria: category }).then(() => {
            alert("Exercício atualizado com sucesso!");
            limparFormularioBiblioteca();
            switchTab('dados-treino');
        });
    } else {
        push(ref(db, 'biblioteca/'), { nome, foto, legenda, categoria: category, category }).then(() => {
            alert("Exercício salvo na biblioteca geral!");
            limparFormularioBiblioteca();
        });
    }
};

window.limparFormularioBiblioteca = () => {
    idEdicaoBiblioteca = null;
    document.getElementById('lib-nome').value = ""; 
    document.getElementById('lib-foto').value = ""; 
    document.getElementById('lib-legenda').value = "";
    document.getElementById('titulo-lib-exercicio').innerHTML = `<i class="fas fa-dumbbell"></i> Criar Exercício`;
    document.getElementById('btn-salvar-lib').innerText = "Salvar na Biblioteca";
    document.getElementById('btn-cancelar-edit-lib').style.display = "none";
};

window.salvarPlaylist = () => {
    const nome = document.getElementById('musica-nome-playlist').value.trim();
    const link = document.getElementById('musica-link-playlist').value.trim();
    if(!nome || !link) return alert("Preencha o nome e insira o link da playlist!");

    let listId = "";
    if(link.includes("list=")) {
        listId = link.split("list=")[1].split("&")[0];
    } else {
        return alert("Link inválido! Certifique-se de copiar o link completo contendo 'list='.");
    }

    push(ref(db, 'playlists/'), { nome, listId }).then(() => {
        alert("Playlist cadastrada com sucesso!");
        document.getElementById('musica-nome-playlist').value = "";
        document.getElementById('musica-link-playlist').value = "";
    });
};

window.carregarPlaylistNoPlayer = (listId) => {
    const container = document.getElementById('container-player-musica');
    if(!listId) {
        container.innerHTML = "";
        return;
    }
    container.innerHTML = `
        <iframe 
          width="100%" 
          height="360" 
          src="https://www.youtube.com/embed/videoseries?list=${listId}" 
          title="Player de Música" 
          frameborder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
          allowfullscreen>
        </iframe>
    `;
};

window.prepararEdicaoAluna = (id) => {
    const aluna = alunas.find(a => a.id === id);
    if(!aluna) return;
    idEdicaoAluna = id;
    switchTab('cadastro');

    document.getElementById('cad-nome-aluna').value = aluna.nome; 
    document.getElementById('cad-senha-aluna').value = aluna.senha; 
    document.getElementById('cad-foto-aluna').value = aluna.foto; 
    document.getElementById('cad-info-aluna').value = aluna.info || "";

    document.getElementById('titulo-cad-aluna').innerHTML = `<i class="fas fa-edit"></i> Editando Dados de: ${aluna.nome}`;
    document.getElementById('btn-salvar-aluna').innerText = "ATUALIZAR DADOS";
    document.getElementById('btn-cancelar-edit-aluna').style.display = "block";
};

window.prepararEdicaoBiblioteca = (id) => {
    const ex = biblioteca.find(e => e.id === id);
    if(!ex) return;
    idEdicaoBiblioteca = id;
    switchTab('criar-treino');

    document.getElementById('lib-nome').value = ex.nome; 
    document.getElementById('lib-foto').value = ex.foto; 
    document.getElementById('lib-legenda').value = ex.legenda || ""; 
    document.getElementById('lib-categoria').value = ex.categoria || ex.category;

    document.getElementById('titulo-lib-exercicio').innerHTML = `<i class="fas fa-edit"></i> Editando Exercício`;
    document.getElementById('btn-salvar-lib').innerText = "ATUALIZAR EXERCÍCIO";
    document.getElementById('btn-cancelar-edit-lib').style.display = "block";
};

window.marcarInicio = (id) => {
    salvarConfiguracoesAtuais();
    const agora = new Date(); const dataHora = agora.toLocaleDateString('pt-BR') + " às " + agora.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
    update(ref(db, `treinosDesignados/${id}`), { iniciado: true, dataInicio: dataHora });
};

window.marcarFeito = (id) => {
    salvarConfiguracoesAtuais();
    const agora = new Date(); const dataHora = agora.toLocaleDateString('pt-BR') + " às " + agora.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
    update(ref(db, `treinosDesignados/${id}`), { concluido: true, dataConclusao: dataHora });
};

window.excluirItem = (pasta, id) => { 
    if(confirm("Apagar permanentemente esse registro do banco de dados?")) {
        remove(ref(db, `${pasta}/${id}`)); 
    }
};

window.selecionarAlunaFluxo = (nomeAluna) => { alunaSelecionadaFluxo = nomeAluna; renderizar(); };
window.voltarParaAlunas = () => { alunaSelecionadaFluxo = ""; renderizar(); };

window.moverExercicio = (idVinculo, direcao, listaFiltradaJSON) => {
    const lista = JSON.parse(decodeURIComponent(listaFiltradaJSON));
    const indexAtual = lista.findIndex(item => item.idVinculo === idVinculo);
    if (indexAtual === -1) return;
    const novoIndex = direcao === 'cima' ? indexAtual - 1 : indexAtual + 1;
    if (novoIndex < 0 || novoIndex >= lista.length) return;
    const itemAtual = lista[indexAtual]; const itemVizinho = lista[novoIndex];
    const ordemTemporaria = itemAtual.ordem; itemAtual.ordem = itemVizinho.ordem; itemVizinho.ordem = ordemTemporaria;
    const atualizacoes = {};
    atualizacoes[`treinosDesignados/${itemAtual.idVinculo}/ordem`] = itemAtual.ordem;
    atualizacoes[`treinosDesignados/${itemVizinho.idVinculo}/ordem`] = itemVizinho.ordem;
    update(ref(db), atualizacoes);
};

onValue(ref(db, '/'), (snapshot) => {
    const data = snapshot.val();
    biblioteca = data?.biblioteca ? Object.entries(data.biblioteca).map(([id, v]) => ({...v, id})) : [];
    alunas = data?.alunas ? Object.entries(data.alunas).map(([id, v]) => ({...v, id})) : [];
    treinosDesignados = data?.treinosDesignados ? Object.entries(data.treinosDesignados).map(([id, v]) => ({...v, idVinculo: id})) : [];
    playlists = data?.playlists ? Object.entries(data.playlists).map(([id, v]) => ({...v, id})) : [];
    treinadores = data?.treinadores ? Object.entries(data.treinadores).map(([id, v]) => ({...v, id})) : [];
    renderizar();
});

// LÓGICA DE VÍNCULO CORRIGIDA COM BUSCA RELATIVA
window.vincularTreinosSelecionados = () => {
    const nomeAluna = document.getElementById('select-aluna-vinculo').value;
    const dataSelecionada = document.getElementById('data-treino-vinculo').value;
    const selecionados = document.querySelectorAll('.check-exercicio:checked');

    if(!nomeAluna || selecionados.length === 0 || !dataSelecionada) {
        return alert("Por favor, selecione a aluna, os exercícios e a data do treino!");
    }

    const [ano, mes, dia] = dataSelecionada.split('-'); 
    const dataFormatada = `${dia}/${mes}/${ano}`;
    const exerciciosExistentes = treinosDesignados.filter(t => t.aluna === nomeAluna && t.dataProgramada === dataFormatada);

    let maiorOrdem = 0; 
    exerciciosExistentes.forEach(e => { 
        if (e.ordem && e.ordem > maiorOrdem) maiorOrdem = e.ordem; 
    });

    const treinosParaSalvar = [];

    selecionados.forEach((cb, index) => {
        const id = cb.dataset.id; 
        const ex = biblioteca.find(e => e.id === id);

        // A MÁGICA ACONTECE AQUI: Isola a busca apenas na linha deste checkbox
        const containerItem = cb.closest('.item-selecao');
        const inputSeries = containerItem.querySelector(`#series-${id}`);
        const inputReps = containerItem.querySelector(`#reps-${id}`);

        const inputSeriesVal = inputSeries ? inputSeries.value.trim() : "";
        const inputRepsVal = inputReps ? inputReps.value.trim() : "";

        const seriesFinal = inputSeriesVal !== "" ? inputSeriesVal : "3";
        const repsFinal = inputRepsVal !== "" ? inputRepsVal : "12";
        const stringDetalhes = `${seriesFinal}x${repsFinal}`;

        treinosParaSalvar.push({
            ...ex, 
            aluna: nomeAluna, 
            iniciado: false, 
            concluido: false, 
            dataProgramada: dataFormatada, 
            ordem: maiorOrdem + index + 1,
            detalhes: stringDetalhes,
            idTreinador: usuarioLogado
        });
    });

    treinosParaSalvar.forEach(treino => {
        push(ref(db, 'treinosDesignados/'), treino);
    });

    alert(`Treinos vinculados com sucesso para o dia ${dataFormatada}!`);
};

function renderizar() {
    const isAdmin = tipoUsuarioLogado === "Admin";
    const isTreinador = tipoUsuarioLogado === "Treinador";
    const subTelaAlunas = document.getElementById('sub-tela-alunas');
    const subTelaTreinos = document.getElementById('sub-tela-treinos');
    const subTelaExercicios = document.getElementById('sub-tela-exercicios');
    const container = document.getElementById('container-treinos');
    const hojeString = new Date().toLocaleDateString('pt-BR'); 

    const selectPlaylist = document.getElementById('select-playlist-aluna');
    if(selectPlaylist) {
        const valorAtual = selectPlaylist.value;
        selectPlaylist.innerHTML = '<option value="">Selecione uma playlist...</option>' + 
            playlists.map(p => `<option value="${p.listId}">${p.nome}</option>`).join('');
        selectPlaylist.value = valorAtual;
    }

    let filtrados = [];
    let alunasDoTreinador = isTreinador ? alunas.filter(a => a.idTreinador === usuarioLogado) : alunas;

    if (isTreinador) {
        const selectVinculo = document.getElementById('select-aluna-vinculo');
        if (selectVinculo) {
            selectVinculo.innerHTML = alunasDoTreinador.map(a => `<option value="${a.nome}">${a.nome}</option>`).join('');
        }

        const containerFichas = document.getElementById('container-fichas');
        if (containerFichas) {
            containerFichas.innerHTML = alunasDoTreinador.map(a => {
                let anamneseHtml = `<p style="font-size:0.8rem; color:#e0e0e0; margin-top:5px;"><b>Anamnese:</b> Não respondeu ainda.</p>`;
                if (a.anamnese) {
                    const ana = a.anamnese;
                    anamneseHtml = `
                    <div style="margin-top:10px; padding:8px; background:#1a1a1a; border-radius:8px; text-align:left; font-size:0.75rem; color:#a5d6a7; border: 1px solid #333;">
                        <div style="color:#ffeb3b; font-weight:bold; margin-bottom:4px;">📋 RESUMO DA ANAMNESE (${ana.dataEnvio || ''}):</div>
                        <b>Idade/Sexo:</b> ${ana.identificacao?.idade || ''} anos - ${ana.identificacao?.sexo || ''}<br><b>Peso/Altura:</b> ${ana.identificacao?.peso || ''}kg / ${ana.identificacao?.altura || ''}m<br><b>Objetivos:</b> ${ana.objetivos?.principais?.join(', ') || ''} ${ana.objetivos?.outro ? `(${ana.objetivos.outro})` : ''}<br><b>Pratica atual?</b> ${ana.historicoAtividade?.praticaAtualmente || ''} ${ana.historicoAtividade?.modalidade ? `(${ana.historicoAtividade.modalidade})` : ''}<br><b>Doenças:</b> ${ana.historicoMedico?.possuiDoenca === 'Sim' ? (ana.historicoMedico?.doencas?.join(', ') || 'Sim') : 'Nenhuma'}<br><b>Lesões:</b> ${ana.lesoesLimitacoes?.possuiLesao === 'Sim' ? (ana.lesoesLimitacoes?.locais?.join(', ') || 'Sim') : 'Nenhuma'} (Dor: ${ana.lesoesLimitacoes?.escalaDor || '0'}/10)<br><b>Dias/Tempo:</b> ${ana.disponibilidade?.diasSemana || ''} / ${ana.disponibilidade?.tempoSessao || ''}<br><b>Treinar em:</b> ${ana.disponibilidade?.localTreino || ''}
                    </div>`;
                }
                return `
                <div class="card-moderno">
                    <img src="${a.foto}" alt="Foto Aluna">
                    <div class="info">
                        <h3>${a.nome}</h3>
                        <p>${a.info || 'Sem notas.'}</p>
                        ${anamneseHtml}
                        <div style="margin-top:12px; padding-top:10px; border-top:1px solid #444; display:flex; justify-content:flex-end; gap:5px;">
                            <button class="btn-edit" onclick="prepararEdicaoAluna('${a.id}')" title="Editar dados da aluna"><i class="fas fa-edit"></i> Editar</button>
                            <button style="background:#c62828; color:white; border:none; padding:6px 12px; border-radius:8px; cursor:pointer;" onclick="excluirItem('alunas','${a.id}')" title="Excluir aluna"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                </div>`;
            }).join('');
        }

        const listaAvisos = document.getElementById('lista-avisos');
        if (listaAvisos) {
            listaAvisos.innerHTML = treinosDesignados.filter(t => t.concluido && t.idTreinador === usuarioLogado).reverse().map(t => `<div style="font-size:0.75rem; border-bottom:1px solid #eee; padding:10px;">✅ <b>${t.aluna}</b> concluiu ${t.nome} em ${t.dataConclusao}</div>`).join('') || "Sem atividades.";
        }
    }

    if (isTreinador) {
        if(subTelaAlunas) subTelaAlunas.style.display = "none";
        if(subTelaTreinos) subTelaTreinos.style.display = "none";
        if(subTelaExercicios) subTelaExercicios.style.display = "none";
        if (!alunaSelecionadaFluxo) {
            if(subTelaAlunas) subTelaAlunas.style.display = "block";
            const listaFluxo = document.getElementById('lista-fluxo-alunas');
            if (listaFluxo) {
                listaFluxo.innerHTML = alunasDoTreinador.map(a => `
                    <div onclick="selecionarAlunaFluxo('${a.nome}')" style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                        <span><i class="fas fa-user"></i> ${a.nome}</span>
                        <i class="fas fa-chevron-right" style="color: #43a047;"></i>
                    </div>
                `).join('') || "<div style='color: white; padding: 10px;'>Nenhuma aluna vinculada a você.</div>";
            }
            window.executarRenderizacoesFinais(isAdmin, isTreinador, biblioteca);
            return; 
        } else {
            if(subTelaExercicios) subTelaExercicios.style.display = "block";
            const btnVoltar = document.getElementById('container-botao-voltar-exercicios');
            if (btnVoltar) {
                btnVoltar.innerHTML = `
                    <button onclick="voltarParaAlunas()" class="btn-principal" style="width: auto; padding: 5px 15px; background: #666; margin-bottom:10px;"><i class="fas fa-arrow-left"></i> Voltar</button>
                `;
            }
            filtrados = treinosDesignados.filter(t => t.aluna === alunaSelecionadaFluxo);
        }
    } else if (tipoUsuarioLogado === "Aluna") {
        if(subTelaAlunas) subTelaAlunas.style.display = "none";
        if(subTelaTreinos) subTelaTreinos.style.display = "none";
        if(subTelaExercicios) subTelaExercicios.style.display = "block";
        filtrados = treinosDesignados.filter(t => t.aluna === usuarioLogado && t.dataProgramada === hojeString);
    }

    let htmlTopo = "";
    if (tipoUsuarioLogado === "Aluna" || isTreinador) {
        const concluidos = filtrados.filter(t => t.concluido).length;
        const porc = filtrados.length > 0 ? Math.round((concluidos / filtrados.length) * 100) : 0;
        let interfaceFerramentaSelecionada = "";

        if (ferramentaAtiva === "timer") {
            interfaceFerramentaSelecionada = `
                <h3 style="font-size: 0.9rem; margin-bottom: 10px;">⏱️ Temporizador</h3>
                <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <input type="number" id="timer-min-input" min="0" max="99" value="${memoriaTimerMin}" onchange="atualizarValoresTimerScroll()" class="input-scroll-timer">
                        <span style="font-size: 0.8rem; color: #a5d6a7; font-weight: bold;">m</span>
                    </div>
                    <div style="font-size: 1.5rem; font-weight: bold; color: #43a047;">:</div>
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <input type="number" id="timer-seg-input" min="0" max="59" value="${memoriaTimerSeg}" onchange="atualizarValoresTimerScroll()" class="input-scroll-timer">
                        <span style="font-size: 0.8rem; color: #a5d6a7; font-weight: bold;">s</span>
                    </div>
                </div>
                <div style="display: flex; gap: 10px; justify-content: center; margin-top: 15px;">
                    <button onclick="iniciarTimer()" class="btn-pequeno" style="background:var(--verde-principal);">Play</button>
                    <button onclick="resetarTimer()" class="btn-pequeno" style="background:#666;">Reset</button>
                </div>`;
        } else if (ferramentaAtiva === "cronometro") {
            interfaceFerramentaSelecionada = `
                <h3 style="font-size: 0.9rem; margin-bottom: 10px;">⏱️ Cronômetro</h3>
                <div id="cronometro-display" style="font-size: 2.5rem; font-weight: bold; color: #43a047; margin: 10px 0;">00:00</div>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button onclick="iniciarCronometro()" class="btn-pequeno" style="background:var(--verde-principal);">Iniciar</button>
                    <button onclick="pausarCronometro()" class="btn-pequeno" style="background:#ff9800;">Pausar</button>
                    <button onclick="resetarCronometro()" class="btn-pequeno" style="background:#666;">Reset</button>
                </div>`;
        } else if (ferramentaAtiva === "hiit") {
            interfaceFerramentaSelecionada = `
                <h3 style="font-size: 0.9rem; margin-bottom: 5px;">🔥 Timer HIIT / Tabata</h3>
                <div id="hiit-status" class="hiit-status-animado hiit-preparar">PREPARAR</div>
                <div id="hiit-display" style="font-size: 2.5rem; font-weight: bold; color: #43a047; margin-bottom: 10px;">00:00</div>
                <div class="container-inputs-flex">
                    <div><span>PREP</span><input type="number" id="hiit-prep" value="${memoriaHiitPrep}"></div>
                    <div><span>TREINO</span><input type="number" id="hiit-treino" value="${memoriaHiitTreino}"></div>
                    <div><span>DESC</span><input type="number" id="hiit-desc" value="${memoriaHiitDesc}"></div>
                    <div><span>SÉRIES</span><input type="number" id="hiit-ciclos" value="${memoriaHiitCiclos}"></div>
                </div>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button onclick="iniciarHiit()" class="btn-pequeno" style="background:var(--verde-principal);">Play</button>
                    <button onclick="pausarHiit()" class="btn-pequeno" style="background:#ff9800;">Pausar</button>
                    <button onclick="resetarHiit()" class="btn-pequeno" style="background:#666;">Reset</button>
                </div>`;
        } else if (ferramentaAtiva === "metronomo") {
            interfaceFerramentaSelecionada = `
                <h3 style="font-size: 0.9rem; margin-bottom: 10px;">🥁 Metrônomo</h3>
                <div style="display:flex; justify-content:center; align-items:center; flex-direction:column; gap:12px; margin-bottom:10px;">
                    <div style="display:flex; justify-content:center; align-items:center; gap:10px;">
                        <input type="number" id="metro-bpm" value="${memoriaMetroBpm}" style="width:70px; text-align:center; background:#1a1a1a; color:white; border:1px solid #444; margin:0; padding:8px; border-radius:8px;">
                        <span style="color:white; font-weight:bold; font-size:0.9rem;">BPM</span>
                    </div>
                    <div id="metro-visual" style="width:40px; height:40px; border-radius:50%; background:#1a1a1a; border:3px solid #43a047; transition: background 0.05s, border-color 0.05s;"></div>
                </div>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button onclick="iniciarMetronomo()" class="btn-pequeno" style="background:var(--verde-principal);">Play</button>
                    <button onclick="pausarMetronomo()" class="btn-pequeno" style="background:#ff9800;">Pausar</button>
                    <button onclick="resetarMetronomo()" class="btn-pequeno" style="background:#666;">Reset</button>
                </div>`;
        }

        htmlTopo = `
    <div class="card-verde" id="card-ferramentas-aluna" style="text-align: center; width: 100%; border-radius:0px; margin-bottom:15px;">
        <div style="color: #43a047; font-weight: bold; font-size: 1.1rem; margin-bottom: 10px;"><i class="fas fa-clock"></i> Painel de Cronometragem e Métricas</div>
        
        ${tipoUsuarioLogado === "Aluna" ? `
        <h3 style="font-size: 0.8rem; margin-bottom: 5px; margin-top: 5px;">Progresso de Hoje: ${porc}%</h3>
        <div style="background: #eee; border-radius: 10px; height: 18px; position: relative; overflow: hidden; border: 1px solid #ddd; margin-bottom: 15px;">
            <div style="background: var(--verde-principal); width: ${porc}%; height: 100%; transition: 0.5s;"></div>
            <span style="position: absolute; width: 100%; left:0; top:0; font-size: 0.65rem; line-height: 18px; color: white; font-weight:bold; text-align:center;">${porc}%</span>
        </div>` : ''}

        <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin: 10px 0 15px 0;">
            <label class="switch-container">
                <input type="checkbox" id="fixar-ferramentas" onchange="alternarFixacao(this.checked)">
                <span class="slider-arredondado"></span>
            </label>
            <span style="color: #a5d6a7; font-size: 0.85rem; font-weight: bold; user-select: none;">📌 Fixar ferramentas no topo</span>
        </div>

        <select class="select-ferramenta" onchange="mudarFerramentaAtiva(this.value)">
            <option value="timer" ${ferramentaAtiva === 'timer' ? 'selected' : ''}>⏱️ Temporizador</option>
            <option value="cronometro" ${ferramentaAtiva === 'cronometro' ? 'selected' : ''}>⏱️ Cronômetro</option>
            <option value="hiit" ${ferramentaAtiva === 'hiit' ? 'selected' : ''}>🔥 Timer HIIT / Tabata</option>
            <option value="metronomo" ${ferramentaAtiva === 'metronomo' ? 'selected' : ''}>🥁 Metrônomo</option>
        </select>
        
        <div id="box-ferramenta-dinamica" style="margin-top:5px;">
            ${interfaceFerramentaSelecionada}
        </div>
    </div>`;
    }

    filtrados.sort((a, b) => {
        if(a.dataProgramada !== b.dataProgramada) return a.dataProgramada > b.dataProgramada ? 1 : -1;
        return (a.ordem || 0) - (b.ordem || 0);
    });
    const listaFiltradaJSONString = encodeURIComponent(JSON.stringify(filtrados));

    let htmlFinalCards = "";
    if(tipoUsuarioLogado === "Aluna" && filtrados.length === 0) {
        htmlFinalCards = `<div style="text-align:center; color:#a5d6a7; padding: 40px 20px; font-weight:bold; font-size:0.9rem;">Nenhum treino agendado para o dia de hoje (${hojeString}). Descanse!</div>`;
    } else {
        htmlFinalCards = `<div class="grid-moderno">` + filtrados.map((t, index) => {
            let botaoAcaoHtml = "";
            if (tipoUsuarioLogado === "Aluna" && !t.concluido) {
                if (!t.iniciado) botaoAcaoHtml = `<button onclick="event.stopPropagation(); marcarInicio('${t.idVinculo}')" class="btn-principal btn-iniciar">Iniciar</button>`;
                else botaoAcaoHtml = `<button onclick="event.stopPropagation(); marcarFeito('${t.idVinculo}')" class="btn-principal btn-concluir">Concluir</button>`;
            }
            return `
            <div class="card-moderno ${t.concluido ? 'concluido' : ''}" onclick="abrirModal('${t.idVinculo || t.id}')" style="cursor:pointer;">
                <img src="${t.foto}" alt="Exercício">
                <div class="info">
                    <span style="font-size: 0.65rem; color: #fff; background: var(--verde-principal); padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">${t.categoria || t.category}</span>
                    <h4 style="margin-top: 5px;">${t.nome}</h4>
                    <span class="detalhe-badge">${t.detalhes}</span>
                    ${t.iniciado ? `<div class="inicio-txt">⏱️ Início: ${t.dataInicio}</div>` : ''}
                    ${botaoAcaoHtml}
                    ${t.concluido ? `<div class="feito-txt">✓ ${t.dataConclusao}</div>` : ''}
                    ${isTreinador ? `
                        <div style="margin-top:5px; border-top:1px solid #444; padding-top:3px; font-size:0.7rem; color:#ffeb3b; font-weight:bold;">Dia: ${t.dataProgramada}</div>
                        <div style="margin-top:5px; border-top:1px solid #444; padding-top:5px; display:flex; justify-content:space-between; align-items:center;">
                            <small style="font-size:0.6rem;">${t.aluna}</small>
                            <button onclick="event.stopPropagation(); excluirItem('treinosDesignados','${t.idVinculo}')" style="color:red; background:none; border:none; cursor:pointer;">✖</button>
                        </div>
                        <div class="container-ordenacao" onclick="event.stopPropagation();">
                            <button class="btn-ordem" onclick="moverExercicio('${t.idVinculo}', 'cima', '${listaFiltradaJSONString}')" ${index === 0 ? 'disabled style="opacity:0.3; border-color:#666;"' : ''}><i class="fas fa-arrow-up"></i></button>
                            <span style="color: #43a047; font-size:0.75rem; font-weight:bold;">Posição ${index + 1}</span>
                            <button class="btn-ordem" onclick="moverExercicio('${t.idVinculo}', 'baixo', '${listaFiltradaJSONString}')" ${index === filtrados.length - 1 ? 'disabled style="opacity:0.3; border-color:#666;"' : ''}><i class="fas fa-arrow-down"></i></button>
                        </div>
                    ` : ''}
                </div>
            </div>`;
        }).join('') + `</div>`;
    }

    if (container) container.innerHTML = `${htmlTopo}${htmlFinalCards}`;

    window.executarRenderizacoesFinais(isAdmin, isTreinador, biblioteca);
}

window.executarRenderizacoesFinais = function(isAdmin, isTreinador, biblioteca) {
    if (usuarioLogado !== "" && tipoUsuarioLogado !== "Admin") {
        const checkFixar = document.getElementById('fixar-ferramentas');
        if (window.ferramentaFixaStatus) { if (checkFixar) checkFixar.checked = true; alternarFixacao(true); }
    }

    const listaMult = document.getElementById('lista-selecao-multipla');
    if(listaMult && isTreinador) {
        const categoriesLib = [...new Set(biblioteca.map(ex => ex.categoria || ex.category))];
        categoriesLib.sort((a, b) => {
            let indexA = ORDEM_DEFINIDA.indexOf(normalizar(a)); let indexB = ORDEM_DEFINIDA.indexOf(normalizar(b));
            if (indexA === -1) indexA = 999; if (indexB === -1) indexB = 999;
            return indexA - indexB;
        });
        listaMult.innerHTML = categoriesLib.map(cat => `
            <div style="grid-column: 1/-1; background: var(--verde-principal); color:white; padding:5px 10px; border-radius:8px; margin:10px 0; font-size:0.75rem; font-weight:bold; text-transform:uppercase;">${cat}</div>
            ${biblioteca.filter(ex => (ex.categoria || ex.category) === cat).map(ex => `
                <div class="item-selecao">
                    <input type="checkbox" class="check-exercicio" data-id="${ex.id}">
                    <span style="flex:1;">${ex.nome}</span>
                    <div class="inputs-detalhes">
                        <input type="text" id="series-${ex.id}" placeholder="S" style="width:35px;">
                        <input type="text" id="reps-${ex.id}" placeholder="R" style="width:35px;">
                    </div>
                </div>
            `).join('')}
        `).join('');
    }

    if(isAdmin) {
        const adminBib = document.getElementById('lista-admin-biblioteca');
        if(adminBib) {
            adminBib.innerHTML = biblioteca.map(ex => `
                <div style="display:flex; justify-content:space-between; align-items:center; width:100%; margin-bottom:5px;">
                    <span>${ex.nome} <small style="color:#666; font-size:0.7rem; margin-left:5px;">(${ex.categoria || ex.category})</small></span>
                    <div>
                        <button class="btn-edit" onclick="prepararEdicaoBiblioteca('${ex.id}')"><i class="fas fa-edit"></i></button>
                        <button onclick="excluirItem('biblioteca','${ex.id}')">✖</button>
                    </div>
                </div>`).join('');
        }

        const adminTreinadores = document.getElementById('lista-admin-treinadores');
        if(adminTreinadores) {
            adminTreinadores.innerHTML = treinadores.map(t => `
                <div style="display:flex; justify-content:space-between; align-items:center; width:100%; margin-bottom:5px;">
                    <span><i class="fas fa-user-shield" style="color:#43a047; margin-right:8px;"></i>${t.nome}</span>
                    <button onclick="excluirItem('treinadores','${t.id}')">✖</button>
                </div>`).join('') || "<div style='color: white; padding: 10px;'>Nenhum treinador cadastrado.</div>";
        }
    }

    const playlistAdminContainer = document.getElementById('lista-playlists-admin');
    if(playlistAdminContainer && (isTreinador || tipoUsuarioLogado === "Aluna")) {
        playlistAdminContainer.innerHTML = playlists.map(p => `
            <div style="display:flex; justify-content:space-between; align-items:center; width:100%; margin-bottom:5px;">
                <span><i class="fas fa-music" style="color:#43a047; margin-right:8px;"></i>${p.nome}</span>
                ${isTreinador ? `<button onclick="excluirItem('playlists','${p.id}')">✖</button>` : ''}
            </div>`).join('') || "<div style='color: white; padding: 10px;'>Nenhuma playlist cadastrada.</div>";
    }
};

window.abrirModal = (id) => {
    const ex = biblioteca.find(e => e.id === id) || treinosDesignados.find(t => t.idVinculo === id) || treinosDesignados.find(t => t.id === id);
    if (ex) {
        document.getElementById('modal-img').src = ex.foto; document.getElementById('modal-titulo').innerText = ex.nome; document.getElementById('modal-legenda').innerText = ex.legenda || "Sem detalhes.";
        let horariosHtml = "";
        if(ex.dataInicio) horariosHtml += `<p style="color: #43a047; margin-bottom:4px;">⏱️ <b>Início:</b> ${ex.dataInicio}</p>`;
        if(ex.dataConclusao) horariosHtml += `<p style="color: #ff4444;">✅ <b>Conclusão:</b> ${ex.dataConclusao}</p>`;
        const divHorarios = document.getElementById('modal-horarios'); divHorarios.innerHTML = horariosHtml; divHorarios.style.display = horariosHtml ? "block" : "none";
        document.getElementById('modal-exercicio').style.display = 'flex';
    }
};
window.fecharModal = () => { document.getElementById('modal-exercicio').style.display = 'none'; };

document.addEventListener('DOMContentLoaded', () => {
    const btnToggleSenha = document.getElementById('toggleSenha');
    if(btnToggleSenha) {
        btnToggleSenha.addEventListener('click', window.toggleSenhaVisualizacao);
    }
});

window.toggleMenuLateral = toggleMenuLateral;
window.atualizarEstruturaMenuLateral = atualizarEstruturaMenuLateral;
window.limparFormularioAluna = limparFormularioAluna;
window.limparFormularioBiblioteca = limparFormularioBiblioteca;
window.salvarPlaylist = salvarPlaylist;
window.carregarPlaylistNoPlayer = carregarPlaylistNoPlayer;
window.switchTab = switchTab;
window.cadastrarTreinador = cadastrarTreinador;