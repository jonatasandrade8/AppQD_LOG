// ==================== ESTRUTURA DE DADOS PARA DROPDOWNS (DEVOLUÇÃO) ====================
const APP_DATA = {
    // Entregadores (lista independente)
    ENTREGADORES: [
        "José Luiz",
        "Paulino",
        "Antonio Ananias",
        "Emanuel",
        "Cleiton"
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
};


// ================= MENU HAMBÚRGUER e VOLTAR AO TOPO =================
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


// ==================== FUNCIONALIDADES DA CÂMERA E VÍDEO (DEVOLUÇÃO) ====================

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

// Elementos para Marca D'água (Base)
const selectEntregador = document.getElementById('select-entregador'); 
const selectRede = document.getElementById('select-rede'); 
const selectLoja = document.getElementById('select-loja'); 

// Elementos Específicos da Câmera de Devolução
const selectMotivo = document.getElementById('select-motivo'); 
const selectProduto = document.getElementById('select-produto'); 
const inputQuantidade = document.getElementById('input-quantidade'); 

let currentStream = null;
let usingFrontCamera = false;
let photos = [];
const localStorageKey = 'qdelicia_logistica_last_selection'; 

// Carregar a imagem da logomarca
const logoImage = new Image();
logoImage.src = './images/logo-qdelicia.png'; 
logoImage.onerror = () => console.error("Erro ao carregar a imagem da logomarca. Verifique o caminho.");


// --- LÓGICA DE DROP DOWNS, PERSISTÊNCIA E VALIDAÇÃO ---

function saveSelection() {
    // Carrega dados existentes para não sobrescrever os de registro geral
    const existingSelection = JSON.parse(localStorage.getItem(localStorageKey)) || {};

    const selection = {
        ...existingSelection, // Mantém dados de outras páginas (ex: status)
        entregador: selectEntregador ? selectEntregador.value : '',
        rede: selectRede ? selectRede.value : '',
        loja: selectLoja ? selectLoja.value : '',
        motivo: selectMotivo ? selectMotivo.value : '',
        produto: selectProduto ? selectProduto.value : '',
        quantidade: inputQuantidade ? inputQuantidade.value : '' 
    };
    localStorage.setItem(localStorageKey, JSON.stringify(selection));
    checkCameraAccess();
}

function populateSelect(selectElement, data, placeholder) {
    if (!selectElement) return;
    selectElement.innerHTML = `<option value="" disabled selected>${placeholder}</option>`;
    
    const isArray = Array.isArray(data);
    const iterableData = isArray ? data : Object.keys(data);
    
    iterableData.forEach(itemKey => {
        const itemValue = isArray ? itemKey : itemKey; 
        const option = document.createElement('option');
        option.value = itemValue;
        option.textContent = itemValue;
        selectElement.appendChild(option);
    });
}

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

function loadAndPopulateDropdowns() {
    populateSelect(selectEntregador, APP_DATA.ENTREGADORES, "Selecione o Entregador");
    populateSelect(selectRede, APP_DATA.REDES_LOJAS, "Selecione a Rede/Cliente");
    if (selectLoja) {
           selectLoja.innerHTML = '<option value="" disabled selected>Selecione a Loja/PDV</option>';
           selectLoja.disabled = true;
    }

    // Popula campos específicos de Devolução
    populateSelect(selectMotivo, APP_DATA.MOTIVOS_DEVOLUCAO, "Selecione o Motivo");
    populateSelect(selectProduto, APP_DATA.TIPOS_PRODUTO, "Selecione o Produto");
    

    const savedSelection = JSON.parse(localStorage.getItem(localStorageKey));

    if (savedSelection) {
        if (selectEntregador && savedSelection.entregador) selectEntregador.value = savedSelection.entregador;

        if (selectRede && savedSelection.rede) {
            selectRede.value = savedSelection.rede;
            populateLoja(savedSelection.rede); 
            if (selectLoja && savedSelection.loja) selectLoja.value = savedSelection.loja;
        }
        
        // Carrega dados salvos específicos de Devolução
        if (selectMotivo && savedSelection.motivo) selectMotivo.value = savedSelection.motivo;
        if (selectProduto && savedSelection.produto) selectProduto.value = savedSelection.produto;
        if (inputQuantidade && savedSelection.quantidade) inputQuantidade.value = savedSelection.quantidade; 
    }
    
    checkCameraAccess();
}

function checkCameraAccess() {
    let isReady = false;

    const baseFieldsReady = selectEntregador && selectEntregador.value && 
                            selectRede && selectRede.value && 
                            selectLoja && selectLoja.value;
    
    const quantidadeReady = inputQuantidade && inputQuantidade.value.trim() !== '';

    // Validação para página de Devolução
    const devFieldsReady = selectMotivo && selectMotivo.value &&
                           selectProduto && selectProduto.value &&
                           quantidadeReady;
    isReady = baseFieldsReady && devFieldsReady;


    if (openCameraBtn) {
        if (isReady) {
            openCameraBtn.disabled = false;
            openCameraBtn.innerHTML = currentStream 
                ? '<i class="fas fa-video"></i> Câmera Aberta (Clique para Fechar)' 
                : '<i class="fas fa-video"></i> Abrir Câmera'; 
        } else {
            openCameraBtn.disabled = true;
            openCameraBtn.innerHTML = '<i class="fas fa-lock"></i> Preencha as Informações Acima';
        }
    }
    return isReady;
}

// EVENT LISTENERS para os Dropdowns
if (selectEntregador) selectEntregador.addEventListener('change', saveSelection);
if (selectRede) {
    selectRede.addEventListener('change', () => {
        populateLoja(selectRede.value);
        saveSelection();
    });
}
if (selectLoja) selectLoja.addEventListener('change', saveSelection);

// Listeners específicos de Devolução
if (selectMotivo) selectMotivo.addEventListener('change', saveSelection);
if (selectProduto) selectProduto.addEventListener('change', saveSelection);
if (inputQuantidade) inputQuantidade.addEventListener('input', saveSelection); 


// --- LÓGICA DA CÂMERA (Marca d'água) ---

function drawWatermark(canvas, ctx) {
    const entregador = selectEntregador ? selectEntregador.value || 'N/A' : 'N/A';
    const rede = selectRede ? selectRede.value || 'N/A' : 'N/A';
    const loja = selectLoja ? selectLoja.value || 'N/A' : 'N/A';

    const date = new Date();
    const dateTimeText = date.toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    
    const lines = [];
    lines.push(`${dateTimeText}`);
    lines.push(`Entregador: ${entregador}`);
    lines.push(`Rede: ${rede} || Loja: ${loja}`);

    // Campos de Devolução
    const motivo = selectMotivo ? selectMotivo.value || 'N/A' : 'N/A';
    const produto = selectProduto ? selectProduto.value || 'N/A' : 'N/A';
    const quantidade = inputQuantidade ? inputQuantidade.value.trim() : 'N/A';
    
    lines.push(`Motivo: ${motivo}`);
    lines.push(`Produto: ${produto} || QTD: ${quantidade} KG`);
    
    
    // Configurações de Posição
    const baseFontSize = canvas.height / 50; 
    const lineHeight = baseFontSize * 1.3;
    const margin = canvas.width / 50;
    const padding = baseFontSize * 0.5;

    ctx.font = `600 ${baseFontSize}px Arial, sans-serif`; 
    ctx.textAlign = 'right';

    let maxWidth = 0;
    lines.forEach(line => {
        const width = ctx.measureText(line).width;
        if (width > maxWidth) maxWidth = width;
    });

    const rectWidth = maxWidth + 2 * padding;
    const rectHeight = (lines.length * lineHeight) + padding;
    
    const xText = canvas.width - margin; 
    const yBottomBaseline = canvas.height - margin; 
    const xRect = xText - rectWidth;
    const yRect = yBottomBaseline - rectHeight;

    // Fundo do texto
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'; 
    ctx.fillRect(xRect, yRect, rectWidth, rectHeight);


    // Desenha o texto
    ctx.fillStyle = 'rgba(255, 255, 255, 1)'; 
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)'; 
    ctx.lineWidth = 2; 

    let yText = yBottomBaseline - padding; 

    lines.reverse().forEach(line => {
        ctx.strokeText(line, xText - padding, yText);
        ctx.fillText(line, xText - padding, yText);
        yText -= lineHeight; 
    });


    // Logomarca (Canto Superior Esquerdo)
    const logoHeight = canvas.height / 8; 
    const logoWidth = (logoImage.width / logoImage.height) * logoHeight;
    const xLogo = margin;
    const yLogo = margin;

    const logoBgPadding = baseFontSize * 0.5;
    const logoBgWidth = logoWidth + 2 * logoBgPadding;
    const logoBgHeight = logoHeight + 2 * logoBgPadding;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'; 
    ctx.fillRect(xLogo - logoBgPadding, yLogo - logoBgPadding, logoBgWidth, logoBgHeight);

    if (logoImage.complete && logoImage.naturalHeight !== 0) {
        ctx.drawImage(logoImage, xLogo, yLogo, logoWidth, logoHeight);
    }
}


function startCamera(facingMode = 'environment') {
    if (currentStream) stopCamera(); 

    const constraints = {
        video: {
            facingMode: facingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 }
        }
    };

    navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
            currentStream = stream;
            video.srcObject = stream;
            video.play();
            checkCameraAccess(); 
            if (fullscreenCameraContainer) {
                fullscreenCameraContainer.style.display = 'flex';
                updateDateTimeWatermark(); 
            }
        })
        .catch(err => {
            console.error("Erro ao acessar a câmera: ", err);
            currentStream = null; 
            checkCameraAccess();
            if (fullscreenCameraContainer) {
                fullscreenCameraContainer.style.display = 'none';
                alert("Não foi possível acessar a câmera. Verifique as permissões.");
            }
        });
}

function stopCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
    if (fullscreenCameraContainer) {
        fullscreenCameraContainer.style.display = 'none';
    }
    checkCameraAccess();
}

function updateDateTimeWatermark() {
    if (dateTimeElement) {
        const date = new Date();
        const dateTimeText = date.toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
        
        const entregador = selectEntregador ? selectEntregador.value || 'N/A' : 'N/A';
        const rede = selectRede ? selectRede.value || 'N/A' : 'N/A';
        const loja = selectLoja ? selectLoja.value || 'N/A' : 'N/A';

        let watermarkContent = `${dateTimeText}`;
        watermarkContent += `<br>Entregador: ${entregador}`;
        watermarkContent += `<br>Rede: ${rede} || Loja: ${loja}`;

        // Campos de Devolução
        const motivo = selectMotivo ? selectMotivo.value || 'N/A' : 'N/A';
        const produto = selectProduto ? selectProduto.value || 'N/A' : 'N/A';
        const quantidade = inputQuantidade ? inputQuantidade.value.trim() : 'N/A';
        
        watermarkContent += `<br>Motivo: ${motivo}`;
        watermarkContent += `<br>Produto: ${produto} || QTD: ${quantidade} KG`;
        
        
        dateTimeElement.innerHTML = watermarkContent;
    }
    if (currentStream) { 
        requestAnimationFrame(updateDateTimeWatermark); 
    }
}


function takePhoto() {
    if (!currentStream) {
        alert("A câmera não está ativa.");
        return;
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    drawWatermark(canvas, ctx);

    const photoDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    photos.push(photoDataUrl);
    
    updateGallery();
}

function updateGallery() {
    if (!photoList) return; 

    photoList.innerHTML = ''; 

    if (photoCountElement) photoCountElement.textContent = photos.length;
    
    const hasPhotos = photos.length > 0;
    if (downloadAllBtn) downloadAllBtn.disabled = !hasPhotos;
    if (shareAllBtn) shareAllBtn.disabled = !hasPhotos;
    
    photos.forEach((photoUrl, index) => {
        const photoItem = document.createElement('div');
        photoItem.classList.add('photo-item');
        
        const img = document.createElement('img');
        img.src = photoUrl;
        photoItem.appendChild(img);
        
        const downloadBtn = document.createElement('a');
        downloadBtn.href = photoUrl;
        downloadBtn.download = `qdelicia_registro_${index + 1}.jpg`;
        downloadBtn.classList.add('icon-btn', 'download-icon');
        downloadBtn.innerHTML = '<i class="fas fa-download"></i>';
        
        const deleteBtn = document.createElement('button');
        deleteBtn.classList.add('icon-btn', 'delete-icon');
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.addEventListener('click', () => {
            photos.splice(index, 1);
            updateGallery(); 
        });

        const controlsContainer = document.createElement('div');
        controlsContainer.classList.add('photo-controls');
        controlsContainer.appendChild(downloadBtn);
        controlsContainer.appendChild(deleteBtn);
        
        photoItem.appendChild(controlsContainer);
        photoList.prepend(photoItem); 
    });
}

function downloadAllPhotos() {
    if (photos.length === 0) return;
    alert("Baixando todas as fotos..."); 

    photos.forEach((photoUrl, index) => {
        const link = document.createElement('a');
        link.href = photoUrl;
        link.download = `qdelicia_registro_${index + 1}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}

function shareAllPhotos() {
    if (photos.length === 0) return;
    alert("O compartilhamento de múltiplas imagens só é suportado via APIs nativas em Apps, ou manualmente no WhatsApp. Você pode baixar e compartilhar.");
}

// ==================== CÂMERA: EVENT LISTENERS ====================
if (openCameraBtn) {
    openCameraBtn.addEventListener('click', () => {
        if (currentStream) {
            stopCamera(); 
        } else if (checkCameraAccess()) { 
            startCamera(usingFrontCamera ? 'user' : 'environment'); 
        }
    });
}

if (shutterBtn) shutterBtn.addEventListener('click', takePhoto);
if (backToGalleryBtn) backToGalleryBtn.addEventListener('click', stopCamera);
if (switchBtn) {
    switchBtn.addEventListener('click', () => {
        usingFrontCamera = !usingFrontCamera;
        startCamera(usingFrontCamera ? 'user' : 'environment');
    });
}

if (downloadAllBtn) downloadAllBtn.addEventListener('click', downloadAllPhotos);
if (shareAllBtn) shareAllBtn.addEventListener('click', shareAllPhotos);


// ==================== INICIALIZAÇÃO GERAL ====================
window.addEventListener('load', () => {
    // Carrega as seleções salvas e preenche os dropdowns da câmera
    loadAndPopulateDropdowns(); 
});