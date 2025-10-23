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