// ==================== ESTRUTURA DE DADOS PARA DROPDOWNS (LOGÍSTICA) ====================
// ATENÇÃO: Os dados do entregador são separados da Rede/Loja, conforme solicitado.
const APP_DATA = {
    // Entregadores (lista independente)
    ENTREGADORES: [
        "José Luiz",
        "Paulino",
        "Antonio Ananias",
        "Emanuel",
        "Cleiton"
    ],

    // Status (NOVO para Registro Geral)
    STATUS: [
        "Chegada",
        "Saída",
        "Encostou",
        "Descarregando",
        "Aguardando"
    ],
    
    // Redes e Lojas (estrutura dependente)
    REDES_LOJAS: {
        "Atacadão": ["BR 101 - SUL", "Parnammirim", "Prudente", "Zona Norte"],
        "Assaí": ["Ponta negra", "Maria Lacerda", "BR 101 - SUL", "Zona Norte"],
        "Superfácil": ["Emaús", "Nazaré", "Olho dágua"],
        "Nordestão": ["Loja 1", "Loja 2", "Loja 3", "Loja 4", "Loja 5", "Loja 6", "Loja 7", "Loja 8"],
        "Carrefour": ["Sul", "Norte"],
        "Mar Vermelho": ["Natal", "Parnamirim"],
    },
    
    // Dados Adicionais para a Câmera de Devolução
    MOTIVOS_DEVOLUCAO: [
        "Maturação elevada",
        "Atraso na Entrega",
        "Qualidade baixa",
        "Peso alt.",
        "Outro Motivo"
    ],
    
    TIPOS_PRODUTO: [
        "Prata",
        "Pacovan",
        "Comprida",
        "Leite",
        "Nanica",
        "Goiaba",
        "Abacaxi",
        "TUDO"
    ],
    
    // QUANTIDADES_KG foi removido, substituído por um input de texto.
};


// ================= MENU HAMBÚRGUER e VOLTAR AO TOPO (Estrutura Preservada) =================
const menuToggle = document.querySelector('.menu-toggle');
const sideMenu = document.querySelector('.side-menu');
const menuOverlay = document.querySelector('.menu-overlay');

if (menuToggle && sideMenu && menuOverlay) {
    menuToggle.addEventListener('click', () => {
        sideMenu.classList.toggle('active');
        menuOverlay.classList.toggle('active');
    });

    menuOverlay.addEventListener('click', () => {
        sideMenu.classList.remove('active');
        menuOverlay.classList.remove('active');
    });
    
    sideMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            sideMenu.classList.remove('active');
            menuOverlay.classList.remove('active');
        });
    });
}

const backToTop = document.querySelector('.back-to-top');

if (backToTop) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            backToTop.classList.add('show');
        } else {
            backToTop.classList.remove('show');
        }
    });

    backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}


// ==================== FUNCIONALIDADES DA CÂMERA E VÍDEO (ADAPTADAS) ====================

// Elementos da Interface (Comuns)
const openCameraBtn = document.getElementById('open-camera-btn');
const fullscreenCameraContainer = document.getElementById('fullscreen-camera-container');
const backToGalleryBtn = document.getElementById('back-to-gallery-btn');
const video = document.getElementById('video');
const shutterBtn = document.getElementById('shutter-btn');
const switchBtn = document.getElementById('switch-btn');
const dateTimeElement = document.getElementById('date-time');
const photoList = document.getElementById('photo-list');
const downloadAllBtn = document.getElementById('download-all');
const shareAllBtn = document.getElementById('share-all');
const photoCountElement = document.getElementById('photo-count');

// Elementos para Marca D'água (Adaptados)
const selectEntregador = document.getElementById('select-entregador'); 
const selectRede = document.getElementById('select-rede'); 
const selectLoja = document.getElementById('select-loja'); 
const selectStatus = document.getElementById('select-status'); 

// Elementos Específicos da Câmera de Devolução
const selectMotivo = document.getElementById('select-motivo'); 
const selectProduto = document.getElementById('select-produto'); 
const inputQuantidade = document.getElementById('input-quantidade'); 

let currentStream = null;
let usingFrontCamera = false;
let photos = [];
let hasCameraPermission = false;
const isDevolucaoPage = !!selectMotivo; 
const localStorageKey = 'qdelicia_logistica_last_selection'; 

// Carregar a imagem da logomarca
const logoImage = new Image();
logoImage.src = './images/logo-qdelicia.png'; 
logoImage.onerror = () => console.error("Erro ao carregar a imagem da logomarca. Verifique o caminho.");


// --- LÓGICA DE DROP DOWNS, PERSISTÊNCIA E VALIDAÇÃO ---

/**
 * @description Salva as seleções atuais no localStorage.
 */
function saveSelection() {
    const selection = {
        entregador: selectEntregador ? selectEntregador.value : '',
        rede: selectRede ? selectRede.value : '',
        loja: selectLoja ? selectLoja.value : '',
        status: selectStatus ? selectStatus.value : '', 
        motivo: selectMotivo ? selectMotivo.value : '',
        produto: selectProduto ? selectProduto.value : '',
        quantidade: inputQuantidade ? inputQuantidade.value : '' 
    };
    localStorage.setItem(localStorageKey, JSON.stringify(selection));
    checkCameraAccess();
}

/**
 * @description Preenche um select box com dados de um array ou objeto.
 */
function populateSelect(selectElement, data, placeholder) {
    if (!selectElement) return;
    
    // Limpa e adiciona o placeholder
    selectElement.innerHTML = `<option value="" disabled selected>${placeholder}</option>`;
    
    if (Array.isArray(data)) {
        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item;
            option.textContent = item;
            selectElement.appendChild(option);
        });
    } else if (typeof data === 'object' && data !== null) {
        Object.keys(data).forEach(key => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = key;
            selectElement.appendChild(option);
        });
    }
}

/**
 * @description Carrega as seleções do localStorage e preenche os dropdowns/inputs.
 */
function loadAndPopulateDropdowns() {
    // 1. Preenche o Entregador
    populateSelect(selectEntregador, APP_DATA.ENTREGADORES, "Selecione o Entregador");
    
    // 2. Preenche Status (NOVO)
    populateSelect(selectStatus, APP_DATA.STATUS, "Selecione o Status");

    // 3. Preenche a Rede
    populateSelect(selectRede, APP_DATA.REDES_LOJAS, "Selecione a Rede/Cliente");

    // 4. Preenche Loja (Inicialmente vazio)
    if (selectLoja) {
         selectLoja.innerHTML = '<option value="" disabled selected>Selecione a Loja/PDV</option>';
         selectLoja.disabled = true;
    }

    // 5. Preenche os campos da Câmera de Devolução, se for a página correta
    if (isDevolucaoPage) {
        populateSelect(selectMotivo, APP_DATA.MOTIVOS_DEVOLUCAO, "Selecione o Motivo");
        populateSelect(selectProduto, APP_DATA.TIPOS_PRODUTO, "Selecione o Produto");
    }

    const savedSelection = JSON.parse(localStorage.getItem(localStorageKey));

    if (savedSelection) {
        // Tenta restaurar Entregador e Status
        if (selectEntregador && savedSelection.entregador) selectEntregador.value = savedSelection.entregador;
        if (selectStatus && savedSelection.status) selectStatus.value = savedSelection.status; 

        // Tenta restaurar Rede
        if (selectRede && savedSelection.rede) {
            selectRede.value = savedSelection.rede;
            // E preenche a Loja com base na Rede salva
            populateLoja(savedSelection.rede); 
            // Tenta restaurar Loja
            if (selectLoja && savedSelection.loja) selectLoja.value = savedSelection.loja;
        }
        
        // Tenta restaurar campos de Devolução
        if (isDevolucaoPage) {
            if (selectMotivo && savedSelection.motivo) selectMotivo.value = savedSelection.motivo;
            if (selectProduto && savedSelection.produto) selectProduto.value = savedSelection.produto;
            if (inputQuantidade && savedSelection.quantidade) inputQuantidade.value = savedSelection.quantidade; 
        }
    }
    
    // Força a validação inicial do botão
    checkCameraAccess();
}

/**
 * @description Preenche as opções de Loja com base na Rede selecionada.
 */
function populateLoja(rede) {
    if (!selectLoja) return;

    selectLoja.innerHTML = '<option value="" disabled selected>Selecione a Loja/PDV</option>';

    if (rede && APP_DATA.REDES_LOJAS[rede]) {
        APP_DATA.REDES_LOJAS[rede].forEach(loja => {
            const option = document.createElement('option');
            option.value = loja;
            option.textContent = loja;
            selectLoja.appendChild(option);
        });
        selectLoja.disabled = false;
    } else {
        selectLoja.disabled = true;
    }
}

/**
 * @description Verifica se todos os campos obrigatórios estão preenchidos para liberar a câmera.
 * O botão é habilitado assim que os campos estiverem preenchidos, independentemente da permissão da câmera, para permitir o clique inicial e o pedido de permissão.
 */
function checkCameraAccess() {
    let isReady = false;

    // Campos base (Entregador, Rede, Loja)
    const baseFieldsReady = selectEntregador && selectEntregador.value && 
                            selectRede && selectRede.value && 
                            selectLoja && selectLoja.value;
    
    // Checagem de Status (Registro Geral)
    const statusReady = selectStatus && selectStatus.value;
    
    // Checagem de Quantidade (Devolução)
    const quantidadeReady = inputQuantidade && inputQuantidade.value.trim() !== '';

    if (isDevolucaoPage) {
        // Devolução: Base + Motivo, Produto, Quantidade (input)
        const devFieldsReady = selectMotivo && selectMotivo.value &&
                               selectProduto && selectProduto.value &&
                               quantidadeReady;
        isReady = baseFieldsReady && devFieldsReady;

    } else {
        // Geral: Base + Status
        isReady = baseFieldsReady && statusReady;
    }

    if (openCameraBtn) {
        if (isReady) {
            // HABILITA o botão se os campos estiverem prontos.
            openCameraBtn.disabled = false;
            
            // Define o texto de acordo com o estado da câmera
            if (currentStream) { // Stream ativo = Câmera aberta
                openCameraBtn.innerHTML = '<i class="fas fa-video"></i> Câmera Aberta (Clique para Fechar)'; 
            } else {
                // Campos prontos, mas câmera fechada/aguardando permissão. Permite o clique.
                openCameraBtn.innerHTML = '<i class="fas fa-video"></i> Abrir Câmera'; 
            }
        } else {
            // Se os campos estiverem faltando, mantém o botão desabilitado.
            openCameraBtn.disabled = true;
            openCameraBtn.innerHTML = '<i class="fas fa-lock"></i> Preencha as Informações Acima';
        }
    }
    return isReady;
}

// EVENT LISTENERS para os Dropdowns
if (selectEntregador) selectEntregador.addEventListener('change', saveSelection);
if (selectStatus) selectStatus.addEventListener('change', saveSelection); 
if (selectRede) {
    selectRede.addEventListener('change', () => {
        populateLoja(selectRede.value);
        saveSelection();
    });
}
if (selectLoja) selectLoja.addEventListener('change', saveSelection);

if (isDevolucaoPage) {
    if (selectMotivo) selectMotivo.addEventListener('change', saveSelection);
    if (selectProduto) selectProduto.addEventListener('change', saveSelection);
    if (inputQuantidade) inputQuantidade.addEventListener('input', saveSelection); 
}


// --- LÓGICA DA CÂMERA (Marca d'água organizada) ---

/**
 * @description Desenha a marca d'água na imagem capturada, adaptando para a página e organizando as informações.
 */
function drawWatermark(canvas, ctx) {
    // Coletas de dados
    const entregador = selectEntregador ? selectEntregador.value || 'N/A' : 'N/A';
    const rede = selectRede ? selectRede.value || 'N/A' : 'N/A';
    const loja = selectLoja ? selectLoja.value || 'N/A' : 'N/A';
    const status = selectStatus && selectStatus.value ? selectStatus.value.toUpperCase() : null;

    // 1. Data e Hora
    const date = new Date();
    const dateTimeText = date.toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    
    // --- Montagem do Texto da Marca D'água (Organizado) ---
    const lines = [];
    
    // Linha 1: Data e Hora
    lines.push(`${dateTimeText}`);
    
    // Linha 2: Entregador
    lines.push(`Entregador: ${entregador}`);
    
    // Linha 3: Localização
    lines.push(`Rede: ${rede} || Loja: ${loja}`);

    if (!isDevolucaoPage) {
        // Câmera Geral: Adiciona Status
        lines.push(`STATUS: ${status || 'N/A'}`);

    } else {
        // Câmera de Devolução: Adiciona Motivo, Produto e Quantidade
        const motivo = selectMotivo ? selectMotivo.value || 'N/A' : 'N/A';
        const produto = selectProduto ? selectProduto.value || 'N/A' : 'N/A';
        const quantidade = inputQuantidade ? inputQuantidade.value.trim() : 'N/A';
        
        lines.push(`Motivo: ${motivo}`);
        lines.push(`Produto: ${produto} || QTD: ${quantidade} KG`);
    }
    
    // --- Desenho no Canvas ---
    
    // Posições baseadas no tamanho do canvas
    const baseFontSize = canvas.height / 50; 
    const lineHeight = baseFontSize * 1.3;
    const margin = canvas.width / 50;
    const padding = baseFontSize * 0.5; // Padding para o fundo preto

    // Estilo do texto (Inicialmente para medir o texto)
    ctx.font = `600 ${baseFontSize}px Arial, sans-serif`; 
    ctx.textAlign = 'right';

    // 1. Encontra a largura máxima do texto para calcular o fundo
    let maxWidth = 0;
    lines.forEach(line => {
        const width = ctx.measureText(line).width;
        if (width > maxWidth) {
            maxWidth = width;
        }
    });

    // 2. Calcula as dimensões e posição do fundo do texto
    const rectWidth = maxWidth + 2 * padding;
    const rectHeight = (lines.length * lineHeight) + padding;
    
    const xText = canvas.width - margin; // Borda direita do texto (sem padding interno)
    const yBottomBaseline = canvas.height - margin; // Baseline da última linha (sem padding interno)
    
    // Posição superior esquerda do retângulo de fundo do texto
    const xRect = xText - rectWidth;
    const yRect = yBottomBaseline - rectHeight;

    // 3. Desenha o fundo preto semi-transparente (Bloco de Texto)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'; // Preto semi-transparente
    ctx.fillRect(xRect, yRect, rectWidth, rectHeight);


    // 4. Configura o estilo do texto e desenha cada linha
    ctx.fillStyle = 'rgba(255, 255, 255, 1)'; // Branco para o texto
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)'; 
    ctx.lineWidth = 2; // Contorno para maior legibilidade

    // Posição inicial para o texto (baseline da última linha, ajustada pelo padding)
    let yText = yBottomBaseline - padding; 

    // Desenha cada linha, invertendo a ordem para desenhar de baixo para cima
    lines.reverse().forEach(line => {
        ctx.strokeText(line, xText - padding, yText); // Desenha com padding da direita
        ctx.fillText(line, xText - padding, yText);
        yText -= lineHeight; 
    });


    // 5. Logomarca (Canto Superior Esquerdo com fundo preto)
    const logoHeight = canvas.height / 8; 
    const logoWidth = (logoImage.width / logoImage.height) * logoHeight;
    const xLogo = margin;
    const yLogo = margin; // Posição superior esquerda

    // Fundo da Logomarca
    const logoBgPadding = baseFontSize * 0.5;
    const logoBgWidth = logoWidth + 2 * logoBgPadding;
    const logoBgHeight = logoHeight + 2 * logoBgPadding;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'; // Preto semi-transparente
    ctx.fillRect(xLogo - logoBgPadding, yLogo - logoBgPadding, logoBgWidth, logoBgHeight);

    if (logoImage.complete && logoImage.naturalHeight !== 0) {
        ctx.drawImage(logoImage, xLogo, yLogo, logoWidth, logoHeight);
    }
}


function startCamera(facingMode = 'environment') {
    if (currentStream) {
        // Chama stopCamera para limpar o estado e o botão corretamente antes de iniciar novamente.
        stopCamera(); 
    }

    const constraints = {
        video: {
            facingMode: facingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 }
        }
    };

    // Acessa a câmera
    navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
            // Sucesso na abertura da câmera
            currentStream = stream;
            video.srcObject = stream;
            video.play();
            hasCameraPermission = true;
            checkCameraAccess(); // Atualiza o texto do botão para 'Câmera Aberta'
            if (fullscreenCameraContainer) {
                fullscreenCameraContainer.style.display = 'flex';
                updateDateTimeWatermark(); 
            }
        })
        .catch(err => {
            // Falha ao acessar a câmera (permissão negada, etc.)
            console.error("Erro ao acessar a câmera: ", err);
            hasCameraPermission = false;
            currentStream = null; // Garante que o stream foi zerado em caso de erro

            checkCameraAccess(); // Atualiza o botão para "Abrir Câmera" (habilitado para tentar novamente)

            if (fullscreenCameraContainer) {
                fullscreenCameraContainer.style.display = 'none';
                alert("Não foi possível acessar a câmera. Certifique-se de que as permissões foram concedidas ou clique em 'Abrir Câmera' para tentar novamente.");
            }
        });
}

function stopCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null; // Limpa o stream
        hasCameraPermission = false; // Reseta a permissão
    }
    if (fullscreenCameraContainer) {
        fullscreenCameraContainer.style.display = 'none';
    }
    checkCameraAccess(); // Atualiza o botão para "Abrir Câmera"
}

function updateDateTimeWatermark() {
    if (dateTimeElement) {
        const date = new Date();
        const dateTimeText = date.toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
        
        // Coleta de dados
        const entregador = selectEntregador ? selectEntregador.value || 'N/A' : 'N/A';
        const rede = selectRede ? selectRede.value || 'N/A' : 'N/A';
        const loja = selectLoja ? selectLoja.value || 'N/A' : 'N/A';
        const status = selectStatus && selectStatus.value ? selectStatus.value.toUpperCase() : null;

        // Monta o texto de acordo com a página (para o elemento HTML da visualização)
        let watermarkContent = `${dateTimeText}`;
        watermarkContent += `<br>Entregador: ${entregador}`;
        watermarkContent += `<br>Rede: ${rede} || Loja: ${loja}`;


        if (!isDevolucaoPage) {
            watermarkContent += `<br>STATUS: ${status || 'N/A'}`; 
        } else {
            const motivo = selectMotivo ? selectMotivo.value || 'N/A' : 'N/A';
            const produto = selectProduto ? selectProduto.value || 'N/A' : 'N/A';
            const quantidade = inputQuantidade ? inputQuantidade.value.trim() : 'N/A'; 
            
            watermarkContent += `<br>Motivo: ${motivo}`;
            watermarkContent += `<br>Produto: ${produto} || QTD: ${quantidade} KG`;
        }
        
        dateTimeElement.innerHTML = watermarkContent;
    }
    // Continua a atualização em tempo real se a câmera estiver aberta
    if (currentStream) {
        requestAnimationFrame(updateDateTimeWatermark);
    }
}

function takePhoto() {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    drawWatermark(canvas, ctx);

    const photoDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    photos.push(photoDataUrl);
    
    updatePhotoGallery();
    
    video.classList.add('flash');
    setTimeout(() => video.classList.remove('flash'), 100);
}

function updatePhotoGallery() {
    if (!photoList) return;
    photoList.innerHTML = ''; 

    photos.slice().reverse().forEach((photoDataUrl, index) => {
        const photoIndex = photos.length - 1 - index;
        const imgContainer = document.createElement('div');
        imgContainer.classList.add('photo-item');
        
        const img = document.createElement('img');
        img.src = photoDataUrl;
        img.alt = `Foto ${photoIndex + 1}`;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
        deleteBtn.classList.add('delete-btn');
        deleteBtn.addEventListener('click', () => {
            photos.splice(photoIndex, 1);
            updatePhotoGallery();
        });
        
        imgContainer.appendChild(img);
        imgContainer.appendChild(deleteBtn);
        photoList.appendChild(imgContainer);
    });

    if (photoCountElement) {
        photoCountElement.textContent = photos.length;
    }
    
    if (downloadAllBtn) downloadAllBtn.disabled = photos.length === 0;
    if (shareAllBtn) shareAllBtn.disabled = photos.length === 0;
}


// EVENT LISTENERS da Câmera
if (openCameraBtn) {
    openCameraBtn.addEventListener('click', () => {
        // Se a câmera já estiver aberta, clique deve fechar (alternar)
        if (currentStream) {
            stopCamera();
            return;
        }

        if (!checkCameraAccess()) {
            alert("Por favor, preencha todas as informações obrigatórias antes de abrir a câmera.");
            return;
        }
        // Se chegou aqui, os campos estão preenchidos e o botão está habilitado, então pode iniciar.
        usingFrontCamera = false;
        startCamera('environment'); 
    });
}


if (backToGalleryBtn) {
    backToGalleryBtn.addEventListener('click', stopCamera);
}

if (shutterBtn) {
    shutterBtn.addEventListener('click', takePhoto);
}

if (switchBtn) {
    switchBtn.addEventListener('click', () => {
        if (!currentStream) return; // Não faz nada se a câmera não estiver ativa
        usingFrontCamera = !usingFrontCamera;
        const newFacingMode = usingFrontCamera ? 'user' : 'environment';
        startCamera(newFacingMode);
    });
}

// Lógica de Download e Compartilhamento (Atualizada)

if (downloadAllBtn) {
    downloadAllBtn.addEventListener("click", () => {
        if (photos.length === 0) return;

        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');

        photos.forEach((img, i) => {
            const link = document.createElement('a');
            link.href = img;
            link.download = `QdeliciaLogistica_Foto_${date}_${i+1}.jpg`; 
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    });
}

if (shareAllBtn && navigator.share) {
    shareAllBtn.addEventListener("click", () => {
        const files = photos.slice(0, 3).map((img, i) => {
            const byteString = atob(img.split(",")[1]);
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let j = 0; j < byteString.length; j++) {
                ia[j] = byteString.charCodeAt(j);
            }
            return new File([ab], `QdeliciaLogistica_Foto_${i + 1}.jpg`, { type: "image/jpeg" });
        });

        navigator.share({
            files,
            title: "Fotos Logística Qdelícia", 
            text: " || Logística Qdelícia Frutas ||", 
        }).catch((error) => {
            if (error.name !== 'AbortError') {
                alert(`Erro ao compartilhar: ${error.message}`);
            }
        });
    });
} else if (shareAllBtn) {
    shareAllBtn.addEventListener("click", () => {
        alert("A função de compartilhamento direto de múltiplas fotos não é suportada por este navegador. Por favor, utilize a função 'Baixar Todas' e compartilhe manualmente.");
    });
}

// Inicializa a galeria e os dropdowns ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    loadAndPopulateDropdowns();
    updatePhotoGallery();
});


// ==================== FUNCIONALIDADES DA CALCULADORA CD (Nordestão) ====================

// Constantes de Estimativa (Baseado em uma média de palete/carga)
const KG_POR_PALETE_ESTIMADO = 375; // KG (15kg/caixa * 25 caixas)
const KG_POR_CAIXA_ESTIMADO = 15; // KG
const CAIXAS_POR_PALETE_ESTIMADO = KG_POR_PALETE_ESTIMADO / KG_POR_CAIXA_ESTIMADO; // 25
const CAIXAS_FIXAS_POR_PALETE = 25; // Constante conforme regra de negócio

// Estado da Calculadora
let totalKgNota = 0;
let dischargedList = [];

// Elementos da Interface
const inputTotalKg = document.getElementById('input-total-kg');
const calculateTargetsBtn = document.getElementById('calculate-targets-btn');
const targetSummarySection = document.getElementById('target-summary-section');
const dischargeInputSection = document.getElementById('discharge-input-section');
const dischargeSummarySection = document.getElementById('discharge-summary-section');
const remainingSummarySection = document.getElementById('remaining-summary-section');
const dischargeListTable = document.getElementById('discharge-list');
const inputDischargeKg = document.getElementById('input-discharge-kg');
const inputDischargeCaixas = document.getElementById('input-discharge-caixas');
const addDischargeBtn = document.getElementById('add-discharge-btn');
	const downloadReportBtn = document.getElementById('download-report-btn');
	const shareReportBtn = document.getElementById('share-report-btn');


// -----------------------------------------------------
// 1. Lógica de Cálculo
// -----------------------------------------------------

/**
 * @description Calcula as metas iniciais e exibe as seções de controle.
 * @param {string | number} totalKg - O volume total da nota fiscal em KG.
 */
let calculateTargets = (totalKg) => {
    totalKgNota = parseFloat(totalKg) || 0;
    
    const totalPaletesEstimados = Math.ceil(totalKgNota / KG_POR_PALETE_ESTIMADO);
    const totalCaixasEstimadas = totalKgNota / KG_POR_CAIXA_ESTIMADO;

    document.getElementById('target-kg-per-pallet').textContent = KG_POR_PALETE_ESTIMADO.toFixed(2);
    document.getElementById('target-total-caixas').textContent = Math.round(totalCaixasEstimadas);
    document.getElementById('target-total-paletes').textContent = totalPaletesEstimados;

	    // Limpa e exibe as seções
	    dischargedList = [];
	    updateDischargeSummary(); 
	    
	    if (targetSummarySection) targetSummarySection.style.display = 'block';
	    
	    // Inicializa o campo de caixas com o valor padrão de 25
	    if (inputDischargeCaixas) {
	        inputDischargeCaixas.disabled = true;
	        inputDischargeCaixas.value = CAIXAS_FIXAS_POR_PALETE;
	        inputDischargeCaixas.placeholder = CAIXAS_FIXAS_POR_PALETE;
	    }
    if (dischargeInputSection) dischargeInputSection.style.display = 'block';
    if (dischargeSummarySection) dischargeSummarySection.style.display = 'block';
    if (remainingSummarySection) remainingSummarySection.style.display = 'block';
    
    // Habilita/Desabilita inputs
    if (inputTotalKg) inputTotalKg.disabled = true;
    if (calculateTargetsBtn) calculateTargetsBtn.style.display = 'none'; // Esconde o botão após o cálculo
    if (document.getElementById('reset-calculator-btn')) document.getElementById('reset-calculator-btn').style.display = 'block'; // Mostra o botão de reset
    
    // Foca no primeiro input de descarregamento
    if (inputDischargeKg) inputDischargeKg.focus();
}

/**
 * @description Atualiza os totais descarregados e o restante.
 */
function updateDischargeSummary() {
    const totalDischargedKg = dischargedList.reduce((sum, item) => sum + item.kg, 0);
	    const totalDischargedCaixas = dischargedList.reduce((sum, item) => sum + item.caixas, 0);
	    
	    // Verifica se o próximo palete é o último (ou o palete que contém o restante)
	    const totalCaixasEstimadas = totalKgNota / KG_POR_CAIXA_ESTIMADO;
	    const caixasRestantes = totalCaixasEstimadas - totalDischargedCaixas;
	    const isLastPallet = caixasRestantes <= CAIXAS_FIXAS_POR_PALETE;

	    if (inputDischargeCaixas) {
	        if (isLastPallet) {
	            // Último palete: libera o campo e sugere o restante
	            inputDischargeCaixas.disabled = false;
	            inputDischargeCaixas.placeholder = `Máx: ${Math.ceil(caixasRestantes)}`;
	            // Remove o valor automático para o usuário preencher
	            if (inputDischargeCaixas.value === CAIXAS_FIXAS_POR_PALETE.toString()) {
	                inputDischargeCaixas.value = '';
	            }
	        } else {
	            // Palete normal: bloqueia e preenche com 25
	            inputDischargeCaixas.disabled = true;
	            inputDischargeCaixas.value = CAIXAS_FIXAS_POR_PALETE;
	            inputDischargeCaixas.placeholder = CAIXAS_FIXAS_POR_PALETE;
	        }
	    }

    if (document.getElementById('total-discharged-kg')) document.getElementById('total-discharged-kg').textContent = totalDischargedKg.toFixed(2);
    if (document.getElementById('total-discharged-caixas')) document.getElementById('total-discharged-caixas').textContent = totalDischargedCaixas;
    
    // Lógica do Restante
    const remainingKg = totalKgNota - totalDischargedKg;
	    const remainingCaixas = (totalKgNota / KG_POR_CAIXA_ESTIMADO) - totalDischargedCaixas;
    const remainingPaletes = Math.ceil(remainingKg / KG_POR_PALETE_ESTIMADO);

    if (document.getElementById('remaining-kg')) document.getElementById('remaining-kg').textContent = remainingKg.toFixed(2);
    if (document.getElementById('remaining-caixas')) document.getElementById('remaining-caixas').textContent = Math.round(remainingCaixas);
    if (document.getElementById('remaining-paletes')) document.getElementById('remaining-paletes').textContent = remainingPaletes;
    
    // Atualiza a tabela
	    if (dischargeListTable) {
	        dischargeListTable.innerHTML = '';
	        dischargedList.forEach((item, index) => {
	            const pesoMedioCaixa = item.kg / item.caixas;
	            
	            const row = dischargeListTable.insertRow();
	            const actionCell = row.insertCell();
	            const deleteBtn = document.createElement('button');
	            deleteBtn.classList.add('delete-pallet-btn');
	            deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
	            deleteBtn.onclick = () => {
	                // Remove o item da lista e atualiza a tabela
	                dischargedList.splice(index, 1);
	                updateDischargeSummary();
	            };
	            actionCell.appendChild(deleteBtn);
	            row.insertCell().textContent = `#${index + 1}`;
	            row.insertCell().textContent = item.kg.toFixed(2);
	            row.insertCell().textContent = item.caixas;
	            row.insertCell().textContent = pesoMedioCaixa.toFixed(2);
	        });
	    }
    
    // Atualiza o estado do botão de download
    if (downloadReportBtn) {
        downloadReportBtn.disabled = dischargedList.length === 0;
    }
}

/**
 * @description Adiciona um novo item de descarregamento à lista.
 */
function addDischargeEntry() {
    const kg = parseFloat(inputDischargeKg.value);
	    let caixas = parseInt(inputDischargeCaixas.value);
	    
	    // Se o campo estiver desabilitado, assume o valor fixo de 25
	    if (inputDischargeCaixas.disabled) {
	        caixas = CAIXAS_FIXAS_POR_PALETE;
	    } else {
	        // Se for o último palete, valida se o valor inserido é razoável
	        const totalCaixasEstimadas = totalKgNota / KG_POR_CAIXA_ESTIMADO;
	        const caixasRestantes = totalCaixasEstimadas - dischargedList.reduce((sum, item) => sum + item.caixas, 0);
	        
	        if (caixas > Math.ceil(caixasRestantes) + 5) { // Permite uma pequena margem de erro
	            alert(`O número de caixas inserido (${caixas}) parece exceder o restante estimado (${Math.ceil(caixasRestantes)}). Por favor, verifique.`);
	            if (inputDischargeCaixas) inputDischargeCaixas.focus();
	            return;
	        }
	    }

    if (isNaN(kg) || kg <= 0) {
        alert("Por favor, insira um valor válido para KG Conferidos.");
        if (inputDischargeKg) inputDischargeKg.focus();
        return;
    }
	    if (isNaN(caixas) || caixas <= 0) {
	        alert("O valor de caixas não é válido. Verifique se o campo está preenchido corretamente para o último palete.");
	        if (inputDischargeCaixas && !inputDischargeCaixas.disabled) inputDischargeCaixas.focus();
	        return;
	    }

    dischargedList.push({ kg: kg, caixas: caixas });
    
	    // Limpa os inputs
	    if (inputDischargeKg) inputDischargeKg.value = '';
	    // O inputDischargeCaixas será atualizado pela função updateDischargeSummary
	    if (inputDischargeKg) inputDischargeKg.focus();

    updateDischargeSummary();
}


	// -----------------------------------------------------
	// 2. Lógica de Exportação (Download e Compartilhamento)
	// -----------------------------------------------------

/**
 * @description Gera o conteúdo de texto para o relatório de descarregamento.
 * @returns {string} O texto completo do relatório.
 */
function generateReportText() {
    const totalDischargedKg = dischargedList.reduce((sum, item) => sum + item.kg, 0);
    const totalDischargedCaixas = dischargedList.reduce((sum, item) => sum + item.caixas, 0);
    const totalPaletesEstimados = Math.ceil(totalKgNota / KG_POR_PALETE_ESTIMADO);

    const remainingKg = totalKgNota - totalDischargedKg;
    const remainingCaixas = (totalKgNota / KG_POR_CAIXA_ESTIMADO) - totalDischargedCaixas;
    const remainingPaletes = Math.ceil(remainingKg / KG_POR_PALETE_ESTIMADO);
    
    const date = new Date().toLocaleString('pt-BR');

    let report = `RELATÓRIO DE DESCARREGAMENTO - CD NORDESTÃO\n`;
    report += `QDELÍCIA FRUTAS - Gerado em: ${date}\n`;
    report += '==================================================\n\n';
    
    report += '1. DADOS DA NOTA FISCAL\n';
    report += `Volume Total da Nota: ${totalKgNota.toFixed(2)} KG\n\n`;
    
    report += '2. METAS DE DESCARREGO (ESTIMATIVA)\n';
	    report += `KG Médio/Palete (Estimado): ${KG_POR_PALETE_ESTIMADO.toFixed(2)} KG\n`;
    report += `Total de Caixas (Estimado): ${Math.round(totalKgNota / KG_POR_CAIXA_ESTIMADO)} caixas\n`;
    report += `Total de Paletes (Estimado): ${totalPaletesEstimados} paletes\n\n`;

	    report += '3. DETALHE DO DESCARREGAMENTO (REGISTRO POR PALETE)\n';
	    report += '==================================================================\n';
	    report += '|| Palete # || KG Conferidos || Caixas Conferidas || Peso Médio/Caixa ||\n';
	    report += '==================================================================\n';
	    dischargedList.forEach((item, index) => {
	        const pesoMedioCaixa = item.kg / item.caixas;
	        report += `|| #${index + 1} || ${item.kg.toFixed(2)} || ${item.caixas} || ${pesoMedioCaixa.toFixed(2)} ||\n`;
	    });
	    report += '==================================================================\n\n';

    report += '4. RESUMO GERAL\n';
    report += `TOTAL KG Descarregado: ${totalDischargedKg.toFixed(2)} KG\n`;
    report += `TOTAL Caixas Descarregadas: ${totalDischargedCaixas} caixas\n\n`;
    
    report += '5. FALTA PARA CONCLUIR\n';
    report += `KG Restantes: ${remainingKg.toFixed(2)} KG\n`;
    report += `Caixas Restantes: ${Math.round(remainingCaixas)} caixas\n`;
    report += `Paletes Restantes: ${remainingPaletes} paletes\n`;
    report += '==================================================\n';

	    return report;
	}
	
	/**
	 * @description Compartilha o relatório via WhatsApp.
	 */
	function shareReportWhatsApp() {
	    if (dischargedList.length === 0) {
	        alert("Não há registros de descarregamento para compartilhar.");
	        return;
	    }
	    const reportText = generateReportText();
	    
	    // Codifica o texto para URL
	    const encodedText = encodeURIComponent(reportText);
	    
	    // Cria o link do WhatsApp (usa a versão web/mobile)
	    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
	    
	    // Abre em uma nova aba
	    window.open(whatsappUrl, '_blank');
	}

/**
 * @description Inicia o download do relatório em formato TXT.
 */
function downloadReport() {
    if (dischargedList.length === 0) {
        alert("Não há registros de descarregamento para gerar o relatório.");
        return;
    }
    const reportText = generateReportText();
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `Relatorio_CD_Nordestao_${date}.txt`;
    
    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    
    // Cria um link de download temporário
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    
    // Simula o clique e remove o link
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Revoga o URL do objeto para liberar memória
    URL.revokeObjectURL(a.href);
}


// -----------------------------------------------------
// 3. EVENT LISTENERS e Inicialização da Calculadora
// -----------------------------------------------------

const targetInputSection = document.getElementById('target-input-section');

if (inputTotalKg && calculateTargetsBtn) {
    // Habilita o botão apenas se o input tiver um valor válido
    inputTotalKg.addEventListener('input', () => {
        const kg = parseFloat(inputTotalKg.value);
        if (calculateTargetsBtn) calculateTargetsBtn.disabled = isNaN(kg) || kg <= 0;
    });

    calculateTargetsBtn.addEventListener('click', () => {
        calculateTargets(inputTotalKg.value);
    });
}

if (addDischargeBtn) {
    addDischargeBtn.addEventListener('click', addDischargeEntry);
    
    // Permite adicionar ao pressionar Enter em qualquer um dos campos de descarregamento
    if (inputDischargeKg) inputDischargeKg.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); 
            addDischargeEntry();
        }
    });
    if (inputDischargeCaixas) inputDischargeCaixas.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addDischargeEntry();
        }
    });
}

	if (downloadReportBtn) {
	    downloadReportBtn.addEventListener('click', downloadReport);
	}
	
	if (shareReportBtn) {
	    shareReportBtn.addEventListener('click', shareReportWhatsApp);
	}

// Lógica para o botão de Reiniciar (Adicionado dinamicamente)
if(targetInputSection) {
    const resetButton = document.createElement('button');
    resetButton.textContent = 'Reiniciar Calculadora';
    resetButton.classList.add('action-btn', 'secondary-btn');
    resetButton.style.marginTop = '10px';
    resetButton.style.display = 'none'; // Inicialmente escondido
    resetButton.id = 'reset-calculator-btn';
    
    resetButton.addEventListener('click', () => {
        // Reinicia o estado
        totalKgNota = 0;
        dischargedList = [];
        
        // Reabilita o input e botão inicial
        if (inputTotalKg) {
            inputTotalKg.disabled = false;
            inputTotalKg.value = '';
            inputTotalKg.focus();
        }
        if (calculateTargetsBtn) {
            calculateTargetsBtn.style.display = 'block';
            calculateTargetsBtn.disabled = true;
        }

        // Esconde todas as seções de resumo
        if (targetSummarySection) targetSummarySection.style.display = 'none';
        if (dischargeInputSection) dischargeInputSection.style.display = 'none';
        if (dischargeSummarySection) dischargeSummarySection.style.display = 'none';
        if (remainingSummarySection) remainingSummarySection.style.display = 'none';
        resetButton.style.display = 'none';
    });

    targetInputSection.appendChild(resetButton);
}