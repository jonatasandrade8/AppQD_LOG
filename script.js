// ==================== ESTRUTURA DE DADOS PARA DROPDOWNS (LOGÍSTICA) ====================
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
        "Superfácil": ["Emaús", "Nazaré", "Olho dágua"],
        "Nordestão": ["Loja 1", "Loja 2", "Loja 3", "Loja 4", "Loja 5", "Loja 6", "Loja 7", "Loja 8"],
        "Carrefour": ["Sul", "Norte"],
        "Mar Vermelho": ["Natal", "Parnamirim"],
    },
    
    // Dados Adicionais para a Câmera de Devolução
    MOTIVOS_DEVOLUCAO: [
        "Maturação elevada",
        "Atraso na Entrega",
        "Volume incorreto",
        "Avaria no transporte",
        "Produto Reprovado - Qualidade",
        "Outro Motivo"
    ],
};

// ==================== VARIÁVEIS DE ESTADO ====================
let photos = JSON.parse(localStorage.getItem('qdelicia_photos_geral')) || [];
let currentStream = null;
let usingFrontCamera = true; // Inicia com a câmera frontal (user)
const maxPhotos = 10;
let lastSelectedEntregador = localStorage.getItem('lastSelectedEntregador') || '';
let lastSelectedRede = localStorage.getItem('lastSelectedRede') || '';
let lastSelectedLoja = localStorage.getItem('lastSelectedLoja') || '';
let lastSelectedStatus = localStorage.getItem('lastSelectedStatus') || '';

// ==================== SELETORES DE ELEMENTOS ====================
// Inputs de Informação
const selectEntregador = document.getElementById('select-entregador');
const selectRede = document.getElementById('select-rede');
const selectLoja = document.getElementById('select-loja');
const selectStatus = document.getElementById('select-status');

// Botões da Galeria/Ações
const openCameraBtn = document.getElementById('open-camera-btn');
const photoListContainer = document.getElementById('photo-list');
const downloadAllBtn = document.getElementById('download-all');
const shareAllBtn = document.getElementById('share-all');

// Elementos da Câmera
const videoElement = document.getElementById('video');
const cameraContainer = document.getElementById('fullscreen-camera-container');
const shutterBtn = document.getElementById('shutter-btn');
const backToGalleryBtn = document.getElementById('back-to-gallery-btn');
const switchBtn = document.getElementById('switch-btn');
const dateTimeDisplay = document.getElementById('date-time');
const photoCountDisplay = document.getElementById('photo-count');

// ==================== PERSISTÊNCIA E POPULAÇÃO DE DROPDOWNS ====================

function saveLastSelections() {
    localStorage.setItem('lastSelectedEntregador', selectEntregador ? selectEntregador.value : '');
    localStorage.setItem('lastSelectedRede', selectRede ? selectRede.value : '');
    localStorage.setItem('lastSelectedLoja', selectLoja ? selectLoja.value : '');
    localStorage.setItem('lastSelectedStatus', selectStatus ? selectStatus.value : '');
}

function loadAndPopulateDropdowns() {
    if (selectEntregador) {
        APP_DATA.ENTREGADORES.forEach(entregador => {
            const option = new Option(entregador, entregador);
            selectEntregador.add(option);
        });
        selectEntregador.value = lastSelectedEntregador;
    }

    if (selectRede) {
        Object.keys(APP_DATA.REDES_LOJAS).forEach(rede => {
            const option = new Option(rede, rede);
            selectRede.add(option);
        });
        selectRede.value = lastSelectedRede;
    }

    if (selectStatus) {
        APP_DATA.STATUS.forEach(status => {
            const option = new Option(status, status);
            selectStatus.add(option);
            
        });
        selectStatus.value = lastSelectedStatus;
    }

    // A população da Loja depende da Rede
    if (selectRede) {
        selectRede.addEventListener('change', populateLojas);
    }
    populateLojas(); // Inicializa as lojas com base no valor carregado

    // Adiciona listener para salvar as seleções e revalidar o botão da câmera
    [selectEntregador, selectRede, selectLoja, selectStatus].forEach(select => {
        if (select) {
            select.addEventListener('change', () => {
                saveLastSelections();
                updateCameraButtonState();
            });
        }
    });

    updateCameraButtonState();
}

function populateLojas() {
    if (selectLoja && selectRede) {
        selectLoja.innerHTML = '<option value="" disabled selected>Selecione a Loja</option>'; // Limpa e adiciona o placeholder
        const selectedRede = selectRede.value;
        const lojas = APP_DATA.REDES_LOJAS[selectedRede] || [];
        
        if (selectedRede) {
            // CORREÇÃO: Habilita o campo Loja assim que uma Rede é selecionada
            selectLoja.disabled = false;
        } else {
            // Se nenhuma rede estiver selecionada, mantém o campo Loja desabilitado
            selectLoja.disabled = true;
        }

        lojas.forEach(loja => {
            const option = new Option(loja, loja);
            selectLoja.add(option);
        });

        // Tenta selecionar o último valor salvo ou volta para o placeholder
        if (lojas.includes(lastSelectedLoja)) {
            selectLoja.value = lastSelectedLoja;
        } else {
            selectLoja.value = '';
        }
    }
}

function isFormValid() {
    const entregador = selectEntregador ? selectEntregador.value : '';
    const rede = selectRede ? selectRede.value : '';
    const loja = selectLoja ? selectLoja.value : '';
    const status = selectStatus ? selectStatus.value : '';
    
    return !!entregador && !!rede && !!loja && !!status;
}

function updateCameraButtonState() {
    if (openCameraBtn) {
        openCameraBtn.disabled = !isFormValid();
        openCameraBtn.textContent = isFormValid() ? 'Abrir Câmera' : 'Preencha todos os campos para habilitar a câmera';
    }
}

// ==================== CÂMERA: FUNÇÕES DE HARDWARE ====================

function checkCameraAccess() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Desculpe, seu navegador não suporta acesso à câmera.");
        return false;
    }
    return true;
}

async function startCamera(facingMode) {
    if (!videoElement || !cameraContainer) return;
    
    // Esconde o botão de trocar de câmera se não tiver suporte ou for ambiente de desenvolvimento
    if (switchBtn) {
        // Assume que em mobiles modernos 'environment' é suportado
        switchBtn.style.display = facingMode === 'environment' || facingMode === 'user' ? 'block' : 'none';
    }

    try {
        if (currentStream) stopCamera(); // Garante que a câmera anterior seja parada
        
        const constraints = {
            video: {
                facingMode: facingMode,
                width: { ideal: 1280 }, // Tenta alta resolução para o canvas
                height: { ideal: 720 }
            }
        };

        currentStream = await navigator.mediaDevices.getUserMedia(constraints);
        videoElement.srcObject = currentStream;
        videoElement.play();
        
        // Exibir a tela da câmera
        cameraContainer.classList.add('active');
        updateDateTime(); // Inicia o relógio
        shutterBtn.disabled = false;
        
    } catch (err) {
        console.error("Erro ao acessar a câmera: ", err);
        alert(`Não foi possível iniciar a câmera. Erro: ${err.name}.`);
        stopCamera();
    }
}

function stopCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
    if (videoElement) {
        videoElement.srcObject = null;
    }
    if (cameraContainer) {
        cameraContainer.classList.remove('active');
    }
    shutterBtn.disabled = true;
    // Opcional: Recarrega a galeria ao fechar
    renderPhotoList(); 
}

// ==================== CÂMERA: FOTO E MARCA D'ÁGUA ====================

function updateDateTime() {
    if (dateTimeDisplay) {
        const now = new Date();
        const dateStr = now.toLocaleDateString('pt-BR');
        const timeStr = now.toLocaleTimeString('pt-BR');
        dateTimeDisplay.textContent = `${dateStr} ${timeStr}`;
    }
    requestAnimationFrame(updateDateTime);
}

function takePhoto() {
    if (!videoElement || videoElement.readyState !== videoElement.HAVE_ENOUGH_DATA) return;
    if (photos.length >= maxPhotos) {
        alert(`Limite de ${maxPhotos} fotos atingido! Remova fotos antigas antes de continuar.`);
        return;
    }

    shutterBtn.disabled = true; // Desabilita o botão para evitar cliques duplos

    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    
    // 1. Desenha o frame do vídeo
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    
    // 2. Adiciona a marca d'água (data/hora e informações do formulário)
    const now = new Date();
    const dateTimeText = now.toLocaleString('pt-BR');
    
    // Coleta dados do formulário
    const entregador = selectEntregador ? selectEntregador.value : 'N/A';
    const rede = selectRede ? selectRede.value : 'N/A';
    const loja = selectLoja ? selectLoja.value : 'N/A';
    const status = selectStatus ? selectStatus.value : 'N/A';
    
    const infoText1 = `${rede} - ${loja}`;
    const infoText2 = `${entregador} | ${status}`;

    // Estilo da Marca D'água
    const fontSize = Math.floor(canvas.height / 30); // Fonte responsiva
    const margin = fontSize / 2;
    const shadowColor = 'rgba(0,0,0,0.8)';
    const textColor = 'white';

    ctx.fillStyle = textColor;
    ctx.strokeStyle = shadowColor;
    ctx.lineWidth = 4;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.font = `bold ${fontSize}px sans-serif`;

    // Desenha Data/Hora (Bottom-Left)
    let y = canvas.height - margin;
    let x = margin;
    ctx.strokeText(dateTimeText, x, y);
    ctx.fillText(dateTimeText, x, y);
    
    // Desenha Linha 1 (Rede/Loja) (Top-Left)
    y = margin + fontSize;
    x = margin;
    ctx.strokeText(infoText1, x, y);
    ctx.fillText(infoText1, x, y);

    // Desenha Linha 2 (Entregador/Status) (Top-Left, abaixo da Linha 1)
    y = margin + (fontSize * 2) + (margin / 2);
    x = margin;
    ctx.strokeText(infoText2, x, y);
    ctx.fillText(infoText2, x, y);

    // 3. Salva a foto
    const photoDataUrl = canvas.toDataURL('image/jpeg', 0.9); // Boa qualidade JPEG
    
    photos.push({
        dataUrl: photoDataUrl,
        timestamp: now.getTime(),
        entregador: entregador,
        rede: rede,
        loja: loja,
        status: status,
    });
    
    localStorage.setItem('qdelicia_photos_geral', JSON.stringify(photos));
    
    renderPhotoList();
    
    setTimeout(() => {
        shutterBtn.disabled = false; // Reabilita o botão após um breve delay
    }, 500);
}

// ==================== GALERIA: RENDERIZAÇÃO E AÇÕES ====================

function renderPhotoList() {
    if (!photoListContainer) return;

    photoListContainer.innerHTML = ''; // Limpa a galeria

    // Inverte a ordem para mostrar as mais novas primeiro
    photos.slice().reverse().forEach((photo, originalIndex) => {
        // Calcula o índice original correto (necessário para a exclusão)
        const trueIndex = photos.length - 1 - originalIndex; 

        const photoCard = document.createElement('div');
        photoCard.className = 'photo-card';
        photoCard.setAttribute('data-index', trueIndex);

        const img = document.createElement('img');
        img.src = photo.dataUrl;
        img.alt = `Registro ${trueIndex + 1}`;
        photoCard.appendChild(img);
        
        // Informações
        const info = document.createElement('div');
        info.className = 'photo-info';
        const date = new Date(photo.timestamp).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
        info.innerHTML = `
            <p>#${trueIndex + 1} | ${date}</p>
            <p class="small-text">${photo.rede} - ${photo.loja}</p>
            <p class="small-text">${photo.status}</p>
        `;
        photoCard.appendChild(info);

        // Ações (Botões)
        const actions = document.createElement('div');
        actions.className = 'photo-actions';

        // Botão Download
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'action-btn secondary-btn';
        downloadBtn.innerHTML = '<i class="fas fa-download"></i>';
        downloadBtn.title = 'Baixar Foto';
        downloadBtn.addEventListener('click', () => downloadPhoto(trueIndex));
        actions.appendChild(downloadBtn);

        // Botão Compartilhar (WhatsApp)
        const shareBtn = document.createElement('button');
        shareBtn.className = 'action-btn primary-btn';
        shareBtn.innerHTML = '<i class="fab fa-whatsapp"></i>';
        shareBtn.title = 'Compartilhar no WhatsApp';
        shareBtn.addEventListener('click', () => sharePhoto(trueIndex));
        actions.appendChild(shareBtn);
        
        // Botão Remover
        const removeBtn = document.createElement('button');
        removeBtn.className = 'action-btn danger-btn';
        removeBtn.innerHTML = '<i class="fas fa-trash"></i>';
        removeBtn.title = 'Remover Foto';
        removeBtn.addEventListener('click', () => removePhoto(trueIndex));
        actions.appendChild(removeBtn);

        photoCard.appendChild(actions);
        photoListContainer.appendChild(photoCard);
    });

    // Atualiza o contador e botões globais
    if (photoCountDisplay) photoCountDisplay.textContent = photos.length;
    
    const hasPhotos = photos.length > 0;
    if (downloadAllBtn) downloadAllBtn.disabled = !hasPhotos;
    if (shareAllBtn) shareAllBtn.disabled = !hasPhotos;
}

function removePhoto(index) {
    if (confirm(`Tem certeza que deseja remover o registro #${index + 1}?`)) {
        photos.splice(index, 1); // Remove 1 elemento na posição 'index'
        localStorage.setItem('qdelicia_photos_geral', JSON.stringify(photos));
        renderPhotoList();
    }
}

function downloadPhoto(index) {
    const photo = photos[index];
    if (!photo) return;
    
    // Cria um nome de arquivo descritivo
    const dateStr = new Date(photo.timestamp).toLocaleDateString('pt-BR').replace(/\//g, '');
    const timeStr = new Date(photo.timestamp).toLocaleTimeString('pt-BR').replace(/:/g, '');
    const fileName = `registro_${photo.rede.replace(/ /g, '_')}_${photo.loja.replace(/ /g, '_')}_${dateStr}_${timeStr}.jpg`;

    const link = document.createElement('a');
    link.href = photo.dataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * @description Modificada para incluir a legenda com dados do formulário.
 * @param {number} index Índice da foto na array.
 */
function sharePhoto(index) {
    const photo = photos[index];
    if (!photo) return;

    // 1. Constrói a legenda completa
    const dateStr = new Date(photo.timestamp).toLocaleString('pt-BR');
    const legenda = `
📸 *Registro QDelícia*
-------------------------
*Data/Hora:* ${dateStr}
*Entregador:* ${photo.entregador}
*Rede/Loja:* ${photo.rede} - ${photo.loja}
*Status:* ${photo.status}
-------------------------
`;

    // 2. Converte o Base64 para um Blob (necessário para o Web Share API - Não funciona com DataURL direto no WhatsApp)
    const base64Parts = photo.dataUrl.split(',');
    const mimeType = base64Parts[0].match(/:(.*?);/)[1];
    const data = base64Parts[1];
    const byteCharacters = atob(data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    const file = new File([blob], 'registro.jpg', { type: mimeType });


    // 3. Usa o Web Share API (Nativo do Browser)
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({
            files: [file],
            title: 'Registro de Logística QDelícia',
            text: legenda // A legenda é enviada via 'text'
        })
        .catch((error) => console.error('Erro no compartilhamento:', error));
    } else {
        // Fallback para ambientes que não suportam (desktop/alguns Androids)
        alert('Seu navegador não suporta o compartilhamento direto de arquivos. Por favor, baixe a imagem e compartilhe manualmente, colando esta legenda:\n\n' + legenda);
    }
}


function downloadAllPhotos() {
    if (photos.length === 0) return;
    alert("O download de múltiplas imagens deve ser feito uma a uma no mobile, ou você pode baixar e descompactar o ZIP no desktop.");
    // Implementação de ZIP é complexa e será ignorada por enquanto
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
            // Usa a câmera que estava configurada no estado 'usingFrontCamera'
            startCamera(usingFrontCamera ? 'user' : 'environment'); 
        }
    });
}

if (shutterBtn) shutterBtn.addEventListener('click', takePhoto);
if (backToGalleryBtn) backToGalleryBtn.addEventListener('click', stopCamera);
if (switchBtn) {
    switchBtn.addEventListener('click', () => {
        usingFrontCamera = !usingFrontCamera;
        // Reinicia a câmera com o novo modo
        startCamera(usingFrontCamera ? 'user' : 'environment');
    });
}

if (downloadAllBtn) downloadAllBtn.addEventListener('click', downloadAllPhotos);
if (shareAllBtn) shareAllBtn.addEventListener('click', shareAllPhotos);


// ==================== INICIALIZAÇÃO GERAL ====================
window.addEventListener('load', () => {
    // Carrega as seleções salvas e preenche os dropdowns da câmera
    loadAndPopulateDropdowns();
    // Renderiza a galeria
    renderPhotoList();
    
    // Configura o menu hamburger (Copia as funções do script.js)
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
        
        // Garante que o menu feche ao clicar em um link
        sideMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                sideMenu.classList.remove('active');
                menuOverlay.classList.remove('active');
            });
        });
    }

    // Configura o botão voltar ao topo
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
});
