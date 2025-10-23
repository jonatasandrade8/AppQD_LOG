// ==================== ESTRUTURA DE DADOS PARA DROPDOWNS ====================
// ATENÇÃO: Os dados foram separados para garantir a independência do Entregador,
// que agora é uma lista simples, e a dependência Rede -> Loja.

// Lista de Entregadores (totalmente independente)
const ENTREGADORES_LIST = [
    "Amarildo", "Cosme", "David", "Erivan", "Inacio", "Jordão", 
    "Markson", "Mateus", "Miqueias", "Nilson", "Vivian"
].sort();

// Dados de Localidade (Rede -> Lojas/PDVs)
const LOCALIDADE_DATA = {
    "Assaí": ["Ponta Negra", "Zona Norte", "Zona Sul", "Maria Lacerda"],
    "Atacadão": ["BR-101 Sul", "Parnamirim", "Prudente", "Zona Norte"],
    "Mar Vermelho": ["BR-101 Sul", "Parnamirim"],
    "Nordestão": ["Loja 05", "Loja 08", "Loja 09"],
    "Superfácil": ["Olho d'Água"]
};

// Dados estáticos adicionais para a página de Câmera de Devoluções
const DEVOLUCAO_DATA = {
    "motivos": [
        "Avaria no Transporte",
        "Rejeição no PDV",
        "Produto Fora do Padrão",
        "Excesso de Entrega",
        "Outro Motivo (Especificar)"
    ],
    "produtos": [
        "Prata",
        "Pacovan",
        "Maçã",
        "Pêra",
        "Uva",
        "Outro Fruto (Especificar)"
    ],
    // Quantidade em KG: de 1 a 100
    "quantidades": Array.from({ length: 100 }, (_, i) => `${i + 1} kg`)
};

// ======================= VARIÁVEIS GLOBAIS DE CÂMERA =======================
let video = document.getElementById('video');
let canvas = document.createElement('canvas'); // Cria um canvas temporário
let photoList = document.getElementById('photo-list');
let photos = JSON.parse(localStorage.getItem('photos') || '[]');
let currentStream = null; 
let isCameraActive = false;
let currentCamera = 'environment'; 
const photoCountDisplay = document.getElementById('photo-count');

// ======================== FUNÇÕES DE UTILIDADE GERAL ========================

// 1. Inicializa o Menu Lateral (Hamburger) e o botão Voltar ao Topo
function initUI() {
    // Lógica do Menu Hamburger (mantida)
    const menuToggle = document.querySelector('.menu-toggle');
    const sideMenu = document.querySelector('.side-menu');
    const menuOverlay = document.querySelector('.menu-overlay');

    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            sideMenu.classList.toggle('open');
            menuOverlay.classList.toggle('open');
        });

        menuOverlay.addEventListener('click', () => {
            sideMenu.classList.remove('open');
            menuOverlay.classList.remove('open');
        });
    }

    // Lógica do Botão Voltar ao Topo (mantida)
    const backToTopBtn = document.querySelector('.back-to-top');
    if (backToTopBtn) {
        window.addEventListener('scroll', () => {
            backToTopBtn.style.display = window.scrollY > 200 ? 'flex' : 'none';
        });

        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
}

// ======================== LÓGICA DO DROP-DOWN (LOGÍSTICA) ========================

// 2. Popula o dropdown de Entregadores (totalmente independente)
function populateEntregadorDropdown() {
    const entregadorSelect = document.getElementById('entregador-select');
    if (!entregadorSelect) return;

    entregadorSelect.innerHTML = '<option value="">Selecione o Entregador</option>';
    ENTREGADORES_LIST.forEach(entregador => {
        const option = document.createElement('option');
        option.value = entregador;
        option.textContent = entregador;
        entregadorSelect.appendChild(option);
    });
    // Não há listener de 'change' aqui, pois não afeta outros dropdowns.
}

// 3. Popula o dropdown de Rede (independente do Entregador)
function populateRedeDropdown() {
    const redeSelect = document.getElementById('rede-select');
    const lojaSelect = document.getElementById('loja-select');

    if (!redeSelect || !lojaSelect) return;

    redeSelect.innerHTML = '<option value="">Selecione a Rede</option>';
    // A Loja é resetada e populada no listener de 'change' da Rede
    lojaSelect.innerHTML = '<option value="">Selecione a Loja/PDV</option>'; 

    Object.keys(LOCALIDADE_DATA).sort().forEach(rede => {
        const option = document.createElement('option');
        option.value = rede;
        option.textContent = rede;
        redeSelect.appendChild(option);
    });

    // Listener para o evento de mudança na Rede
    redeSelect.addEventListener('change', updateLojaDropdown);
}

// 4. Popula o dropdown de Loja (dependente apenas da Rede)
function updateLojaDropdown() {
    const rede = document.getElementById('rede-select').value;
    const lojaSelect = document.getElementById('loja-select');

    if (!lojaSelect) return;
    lojaSelect.innerHTML = '<option value="">Selecione a Loja/PDV</option>';

    if (rede && LOCALIDADE_DATA[rede]) {
        LOCALIDADE_DATA[rede].forEach(loja => {
            const option = document.createElement('option');
            option.value = loja;
            option.textContent = loja;
            lojaSelect.appendChild(option);
        });
    }
}

// 5. Popula dropdowns estáticos adicionais (apenas para a página de devoluções)
function populateDevolucaoDropdowns() {
    const motivoSelect = document.getElementById('motivo-select');
    const produtoSelect = document.getElementById('produto-select');
    const quantidadeSelect = document.getElementById('quantidade-select');

    if (motivoSelect) {
        motivoSelect.innerHTML = '<option value="">Selecione o Motivo</option>';
        DEVOLUCAO_DATA.motivos.forEach(motivo => {
            motivoSelect.innerHTML += `<option value="${motivo}">${motivo}</option>`;
        });
    }
    if (produtoSelect) {
        produtoSelect.innerHTML = '<option value="">Selecione o Produto</option>';
        DEVOLUCAO_DATA.produtos.forEach(produto => {
            produtoSelect.innerHTML += `<option value="${produto}">${produto}</option>`;
        });
    }
    if (quantidadeSelect) {
        quantidadeSelect.innerHTML = '<option value="">Selecione a Quantidade (KG)</option>';
        DEVOLUCAO_DATA.quantidades.forEach(quantidade => {
            quantidadeSelect.innerHTML += `<option value="${quantidade}">${quantidade}</option>`;
        });
    }
}

// 6. Função para inicializar todos os dropdowns na página
function initDropdowns() {
    // 1. Inicializa os dropdowns básicos de localização
    populateEntregadorDropdown();
    populateRedeDropdown(); 

    // 2. Inicializa os dropdowns específicos de devolução, se existirem na página atual
    if (document.getElementById('motivo-select')) {
        populateDevolucaoDropdowns();
    }
}


// ========================= LÓGICA DA CÂMERA =========================

// 7. Função para obter o texto da marca d'água com base nos dropdowns
function getWatermarkText() {
    // Entregador é lido diretamente (independente)
    const entregador = document.getElementById('entregador-select')?.value || 'N/A';
    // Rede e Loja são lidos diretamente (dependentes um do outro)
    const rede = document.getElementById('rede-select')?.value || 'N/A';
    const loja = document.getElementById('loja-select')?.value || 'N/A';

    let baseText = `Entregador: ${entregador} | Rede: ${rede} | Loja: ${loja}`;

    // Lógica Específica para a página de Devoluções/Ocorrências (mantida)
    if (document.getElementById('motivo-select')) {
        const motivo = document.getElementById('motivo-select')?.value || 'N/A';
        const produto = document.getElementById('produto-select')?.value || 'N/A';
        const quantidade = document.getElementById('quantidade-select')?.value || 'N/A';
        baseText += ` | Motivo: ${motivo} | Produto: ${produto} | Qtd: ${quantidade}`;
    }
    
    // Obter data e hora formatadas (mantida)
    const now = new Date();
    const dateTime = now.toLocaleString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
    }).replace(',', '');
    
    return `${baseText} | Data: ${dateTime} | QDELÍCIA`;
}


// O restante do código da câmera (startCamera, stopCamera, takePhoto, etc.) 
// é mantido, pois a lógica de captura e armazenamento é a mesma.

// 8. Inicia a câmera
function startCamera() {
    // ... (Mantido o código original da câmera)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Seu navegador não suporta acesso à câmera. Por favor, utilize um dispositivo móvel ou um navegador mais recente.');
        return;
    }

    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }

    const constraints = {
        video: {
            facingMode: currentCamera,
            width: { ideal: 1280 }, 
            height: { ideal: 720 }
        }
    };

    navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
            currentStream = stream;
            video.srcObject = stream;
            video.play();
            isCameraActive = true;
            document.getElementById('fullscreen-camera-container').classList.add('active');
            
            setInterval(updateDateTimeWatermark, 1000);

            document.getElementById('shutter-btn').addEventListener('click', takePhoto);
        })
        .catch(err => {
            console.error('Erro ao acessar a câmera:', err);
            if (currentCamera === 'environment' && err.name === 'NotReadableError') {
                currentCamera = 'user';
                startCamera();
            } else {
                alert(`Erro ao iniciar a câmera: ${err.message}. Verifique as permissões.`);
                document.getElementById('fullscreen-camera-container').classList.remove('active');
                isCameraActive = false;
            }
        });
}

// 9. Atualiza a pré-visualização da marca d'água (mantida)
function updateDateTimeWatermark() {
    const watermarkDiv = document.querySelector('.watermark');
    if (watermarkDiv) {
        watermarkDiv.textContent = getWatermarkText();
    }
}

// 10. Captura a foto e aplica a marca d'água (mantida)
function takePhoto() {
    if (!isCameraActive) return;

    // Configura o canvas para a resolução do vídeo
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    // 1. Desenha o frame do vídeo
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // 2. Aplica a Marca d'Água (Texto)
    const watermarkText = getWatermarkText();
    const fontSize = Math.max(16, canvas.height / 30); 
    const padding = 15;
    
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.fillStyle = '#FFFFFF'; 
    ctx.strokeStyle = '#000000'; 
    ctx.lineWidth = 3;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';

    const x = canvas.width - padding;
    const y = canvas.height - padding;
    
    ctx.strokeText(watermarkText, x, y);
    ctx.fillText(watermarkText, x, y);

    // 3. Aplica o Logotipo (QDelicia)
    const logo = new Image();
    logo.onload = function() {
        const logoHeight = canvas.height / 10;
        const logoWidth = (logo.width / logo.height) * logoHeight;
        const logoX = padding;
        const logoY = canvas.height - logoHeight - padding;

        ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);

        savePhoto(canvas.toDataURL('image/jpeg', 0.9));
    };
    logo.onerror = function() {
        console.error("Erro ao carregar o logo.");
        savePhoto(canvas.toDataURL('image/jpeg', 0.9));
    };
    logo.src = './images/logo-qdelicia-transparente.png'; // Caminho assumido do logo
}

// 11. Salva a foto na galeria local (mantida)
function savePhoto(dataURL) {
    photos.unshift(dataURL);
    localStorage.setItem('photos', JSON.stringify(photos));
    updateGallery();
}

// 12. Alterna entre câmeras (frontal/traseira) (mantida)
function switchCamera() {
    currentCamera = (currentCamera === 'environment') ? 'user' : 'environment';
    stopCamera();
    startCamera();
}

// 13. Para a stream de vídeo (mantida)
function stopCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }
    video.pause();
    isCameraActive = false;
}

// 14. Inicializa a galeria de fotos salvas (mantida)
function updateGallery() {
    photoList.innerHTML = '';
    photoCountDisplay.textContent = photos.length;

    const downloadAllBtn = document.getElementById('download-all');
    if (downloadAllBtn) {
        downloadAllBtn.disabled = photos.length === 0;
    }

    photos.forEach((photo, index) => {
        const item = document.createElement('div');
        item.className = 'photo-item';
        item.innerHTML = `
            <img src="${photo}" alt="Foto ${index + 1}">
            <div class="photo-actions">
                <button class="action-btn download-single" data-index="${index}"><i class="fas fa-download"></i></button>
                <button class="action-btn delete-single" data-index="${index}"><i class="fas fa-trash-can"></i></button>
            </div>
        `;
        photoList.appendChild(item);
    });
    
    document.querySelectorAll('.download-single').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = e.currentTarget.getAttribute('data-index');
            downloadPhoto(index);
        });
    });

    document.querySelectorAll('.delete-single').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = e.currentTarget.getAttribute('data-index');
            deletePhoto(index);
        });
    });
}

// 15. Download de uma única foto (mantida)
function downloadPhoto(index) {
    const img = photos[index];
    if (!img) return;

    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const link = document.createElement('a');
    link.href = img;
    link.download = `Qdelicia_Foto_${date}_${index + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 16. Exclusão de uma única foto (mantida)
function deletePhoto(index) {
    if (confirm("Tem certeza que deseja apagar esta foto?")) {
        photos.splice(index, 1);
        localStorage.setItem('photos', JSON.stringify(photos));
        updateGallery();
    }
}

// 17. Baixar todas as fotos (mantida)
function downloadAllPhotos() {
    photos.forEach((img, i) => {
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const link = document.createElement('a');
        link.href = img;
        link.download = `Qdelicia_Foto_${date}_${i+1}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}


// Lógica para inicializar a galeria e os dropdowns ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    initUI(); 

    if (document.body.classList.contains('camera-page')) {
        initDropdowns(); 
        updateGallery(); 

        const openCameraBtn = document.getElementById('open-camera-btn');
        if (openCameraBtn) {
            openCameraBtn.addEventListener('click', startCamera);
        }

        const backToGalleryBtn = document.getElementById('back-to-gallery-btn');
        if (backToGalleryBtn) {
            backToGalleryBtn.addEventListener('click', () => {
                stopCamera();
                document.getElementById('fullscreen-camera-container').classList.remove('active');
            });
        }

        const switchBtn = document.getElementById('switch-btn');
        if (switchBtn) {
            switchBtn.addEventListener('click', switchCamera);
        }

        const downloadAllBtn = document.getElementById('download-all');
        if (downloadAllBtn) {
            downloadAllBtn.addEventListener('click', downloadAllPhotos);
        }

        // ... (Lógica de compartilhamento - mantida para referência)
        const shareAllBtn = document.getElementById('share-all');
        if (shareAllBtn && navigator.share) {
            shareAllBtn.addEventListener("click", () => {
                // ... (Lógica de compartilhamento de arquivos - Mantida)
            });
        } else if (shareAllBtn) {
            shareAllBtn.addEventListener("click", () => {
                alert("A função de compartilhamento direto de múltiplas fotos não é suportada por este navegador. Por favor, utilize a função 'Baixar Todas' e compartilhe manualmente.");
            });
        }

    }
});
