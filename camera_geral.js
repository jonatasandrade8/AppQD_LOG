// ==================== ESTRUTURA DE DADOS PARA DROPDOWNS (REGISTRO GERAL) ====================
const APP_DATA = {
    // Entregadores (lista independente)
    ENTREGADORES: [
        "José Luiz",
        "Paulino",
        "Antonio Ananias",
        "Emanuel",
        "Cleiton"
    ],

    // Status (Registro Geral)
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
        "Superfácil": ["Emáus", "Nazaré", "Olho dágua"],
        "Nordestão": ["Loja 1", "Loja 2", "Loja 3", "Loja 4", "Loja 5", "Loja 6", "Loja 7", "Loja 8"],
        "Carrefour": ["Sul", "Norte"],
        "Mar Vermelho": ["Natal", "Parnamirim"],
    },
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


// ==================== FUNCIONALIDADES DA CÂMERA E VÍDEO (GERAL) ====================

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

// Elementos para Marca D'Água (Específicos da Câmera Geral)
const selectEntregador = document.getElementById('select-entregador'); 
const selectRede = document.getElementById('select-rede'); 
const selectLoja = document.getElementById('select-loja'); 
const selectStatus = document.getElementById('select-status'); 

let currentStream = null;
let usingFrontCamera = false;
let photos = []; // Array de fotos não é persistido
const localStorageKey = 'qdelicia_logistica_last_selection'; 

// Carregar a imagem da logomarca
const logoImage = new Image();
logoImage.src = './images/logo-qdelicia.png'; 
logoImage.onerror = () => console.error("Erro ao carregar a imagem da logomarca. Verifique o caminho.");


// --- LÓGICA DE DROP DOWNS, PERSISTÊNCIA E VALIDAÇÃO ---

function saveSelection() {
    // Carrega dados existentes para não sobrescrever os de devolução
    const existingSelection = JSON.parse(localStorage.getItem(localStorageKey)) || {};

    const selection = {
        ...existingSelection, // Mantém dados de outras páginas (ex: devolução)
        entregador: selectEntregador ? selectEntregador.value : '',
        rede: selectRede ? selectRede.value : '',
        loja: selectLoja ? selectLoja.value : '',
        status: selectStatus ? selectStatus.value : '', 
    };
    // Salva APENAS as seleções, não o array 'photos'
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
    populateSelect(selectStatus, APP_DATA.STATUS, "Selecione o Status");
    populateSelect(selectRede, APP_DATA.REDES_LOJAS, "Selecione a Rede/Cliente");
    if (selectLoja) {
           selectLoja.innerHTML = '<option value="" disabled selected>Selecione a Loja/PDV</option>';
           selectLoja.disabled = true;
    }

    const savedSelection = JSON.parse(localStorage.getItem(localStorageKey));

    if (savedSelection) {
        if (selectEntregador && savedSelection.entregador) selectEntregador.value = savedSelection.entregador;
        if (selectStatus && savedSelection.status) selectStatus.value = savedSelection.status; 

        if (selectRede && savedSelection.rede) {
            selectRede.value = savedSelection.rede;
            populateLoja(savedSelection.rede); 
            if (selectLoja && savedSelection.loja) selectLoja.value = savedSelection.loja;
        }
    }
    
    checkCameraAccess();
}

function checkCameraAccess() {
    let isReady = false;

    const baseFieldsReady = selectEntregador && selectEntregador.value && 
                            selectRede && selectRede.value && 
                            selectLoja && selectLoja.value;
    
    const statusReady = selectStatus && selectStatus.value;

    isReady = baseFieldsReady && statusReady;

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
if (selectStatus) selectStatus.addEventListener('change', saveSelection); 
if (selectRede) {
    selectRede.addEventListener('change', () => {
        populateLoja(selectRede.value);
        saveSelection();
    });
}
if (selectLoja) selectLoja.addEventListener('change', saveSelection);


// --- LÓGICA DA CÂMERA (Marca d'Água) ---

function drawWatermark(canvas, ctx) {
    const entregador = selectEntregador ? selectEntregador.value || 'N/A' : 'N/A';
    const rede = selectRede ? selectRede.value || 'N/A' : 'N/A';
    const loja = selectLoja ? selectLoja.value || 'N/A' : 'N/A';
    const status = selectStatus && selectStatus.value ? selectStatus.value.toUpperCase() : 'N/A';

    const date = new Date();
    const dateTimeText = date.toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    
    const lines = [];
    lines.push(`${dateTimeText}`);
    lines.push(`Entregador: ${entregador}`);
    lines.push(`Rede: ${rede} || Loja: ${loja}`);
    lines.push(`STATUS: ${status}`);

    
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
        const status = selectStatus && selectStatus.value ? selectStatus.value.toUpperCase() : 'N/A';

        let watermarkContent = `${dateTimeText}`;
        watermarkContent += `<br>Entregador: ${entregador}`;
        watermarkContent += `<br>Rede: ${rede} || Loja: ${loja}`;
        watermarkContent += `<br>STATUS: ${status}`;
        
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
        
        // --- BOTÃO DE LIXEIRA ---
        const deleteBtn = document.createElement('button');
        deleteBtn.classList.add('icon-btn', 'delete-icon');
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.addEventListener('click', () => {
            photos.splice(index, 1); // Remove a foto do array
            updateGallery(); // Atualiza a galeria
        });
        // --- FIM DO BOTÃO DE LIXEIRA ---

        const controlsContainer = document.createElement('div');
        controlsContainer.classList.add('photo-controls');
        controlsContainer.appendChild(downloadBtn);
        controlsContainer.appendChild(deleteBtn);
        
        photoItem.appendChild(controlsContainer);
        photoList.prepend(photoItem); // .prepend para a mais nova aparecer primeiro
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


// ==================================================================
// === FUNÇÕES DE GERAÇÃO DE LEGENDA E COMPARTILHAMENTO ===
// ==================================================================

/**
 * Gera a legenda com as mesmas informações da marca d'água
 */
function generateCaption() {
    const entregador = selectEntregador ? selectEntregador.value || 'N/A' : 'N/A';
    const rede = selectRede ? selectRede.value || 'N/A' : 'N/A';
    const loja = selectLoja ? selectLoja.value || 'N/A' : 'N/A';
    const status = selectStatus && selectStatus.value ? selectStatus.value.toUpperCase() : 'N/A';

    const date = new Date();
    const dateTimeText = date.toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });

    let caption = `${dateTimeText}\n`;
    caption += `Entregador: ${entregador}\n`;
    caption += `Rede: ${rede} || Loja: ${loja}\n`;
    caption += `STATUS: ${status}`;

    return caption;
}

/**
 * Converte uma string dataURL (base64) em um objeto File.
 * @param {string} dataurl - A string dataURL da imagem (que já é 'image/jpeg')
 * @param {string} filename - O nome do arquivo a ser criado.
 * @returns {File} - O objeto File com o tipo MIME correto.
 */
function dataURLtoFile(dataurl, filename) {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1]; // Ex: 'image/jpeg'
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    // Cria o arquivo preservando o tipo (MIME type)
    return new File([u8arr], filename, {type:mime});
}


/**
 * Compartilha todas as fotos com legenda contendo as informações da marca d'água
 */
async function shareAllPhotos() {
    if (photos.length === 0) return;

    // 1. Converter todas as fotos (data URLs) em objetos File
    const files = photos.map((photoUrl, index) => {
        return dataURLtoFile(photoUrl, `qdelicia_registro_${index + 1}.jpg`);
    });

    // 2. Gerar a legenda com as informações da marca d'água
    const caption = generateCaption();

    // 3. Verificar se o navegador suporta compartilhamento de arquivos
    if (navigator.share && navigator.canShare && navigator.canShare({ files: files })) {
        try {
            // 4. Compartilhar com a legenda incluída
            await navigator.share({
                title: 'Registros Logística Qdelícia',
                text: caption, // A legenda com os dados da marca d'água
                files: files
            });
            console.log('Fotos compartilhadas com sucesso.');
        } catch (error) {
            // 5. Lidar com erros (ex: usuário cancelou o compartilhamento)
            if (error.name !== 'AbortError') {
                console.error('Erro ao compartilhar:', error);
                alert('Ocorreu um erro ao tentar compartilhar as fotos.');
            } else {
                console.log('Compartilhamento cancelado pelo usuário.');
            }
        }
    } else {
        // 6. Fallback para navegadores que não suportam
        alert("Seu navegador não suporta o compartilhamento direto de arquivos. Por favor, baixe as fotos e compartilhe manualmente.");
    }
}

// ==================================================================
// === FIM DAS FUNÇÕES DE COMPARTILHAMENTO ===
// ==================================================================


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