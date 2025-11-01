// ==================== ESTRUTURA de DADOS PARA DROPDOWNS (DEVOLUÇÃO) ====================
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

// Elementos Específicos da Câmera de Devolução (para adicionar itens)
const selectMotivo = document.getElementById('select-motivo'); 
const selectProduto = document.getElementById('select-produto'); 
const inputQuantidade = document.getElementById('input-quantidade'); 
const inputObservacoes = document.getElementById('input-observacoes'); 

// Novos Elementos para a lista de itens
const addItemBtn = document.getElementById('add-item-btn');
const itemListElement = document.getElementById('item-list');

let currentStream = null;
let usingFrontCamera = false;
let photos = [];
let items = []; // NOVA: Armazena a lista de itens (produto, motivo, qtd)
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
        observacoes: inputObservacoes ? inputObservacoes.value : '' // MODIFICADO
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
    populateSelect(selectProduto, APP_DATA.TIPOS_PRODUO, "Selecione o Produto");
    

    const savedSelection = JSON.parse(localStorage.getItem(localStorageKey));

    if (savedSelection) {
        if (selectEntregador && savedSelection.entregador) selectEntregador.value = savedSelection.entregador;

        if (selectRede && savedSelection.rede) {
            selectRede.value = savedSelection.rede;
            populateLoja(savedSelection.rede); 
            if (selectLoja && savedSelection.loja) selectLoja.value = savedSelection.loja;
        }
        
        // Carrega dados salvos específicos de Devolução
        if (inputObservacoes && savedSelection.observacoes) inputObservacoes.value = savedSelection.observacoes; // MODIFICADO
    }
    
    checkCameraAccess();
}

// NOVA FUNÇÃO: Adiciona item na lista
function handleAddItem() {
    const produto = selectProduto.value;
    const motivo = selectMotivo.value;
    const quantidade = inputQuantidade.value.trim();

    if (!produto || !motivo || !quantidade) {
        alert("Por favor, preencha o Produto, Motivo e Quantidade para adicionar um item.");
        return;
    }

    items.push({ produto, motivo, quantidade });
    
    updateItemListUI();
    checkCameraAccess();

    // Limpa os campos para o próximo item
    selectProduto.value = "";
    selectMotivo.value = "";
    inputQuantidade.value = "";
}

// NOVA FUNÇÃO: Atualiza a lista de itens na UI
function updateItemListUI() {
    if (!itemListElement) return;

    itemListElement.innerHTML = ''; // Limpa a lista
    if (items.length === 0) {
        itemListElement.innerHTML = '<li class="empty-list">Nenhum item adicionado.</li>';
    }

    items.forEach((item, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span><strong>${item.produto}</strong> (${item.motivo}) - ${item.quantidade} KG</span>
            <button class="delete-item-btn" data-index="${index}" title="Remover item">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        li.querySelector('.delete-item-btn').addEventListener('click', () => {
            items.splice(index, 1); // Remove o item do array
            updateItemListUI(); // Atualiza a UI
            checkCameraAccess(); // Verifica o acesso à câmera novamente
        });

        itemListElement.appendChild(li);
    });
}

function checkCameraAccess() {
    let isReady = false;

    const baseFieldsReady = selectEntregador && selectEntregador.value && 
                            selectRede && selectRede.value && 
                            selectLoja && selectLoja.value;
    
    // MODIFICADO: Validação agora checa se a lista de itens tem pelo menos 1 item
    const itemsReady = items.length > 0;
    
    isReady = baseFieldsReady && itemsReady;


    if (openCameraBtn) {
        if (isReady) {
            openCameraBtn.disabled = false;
            openCameraBtn.innerHTML = currentStream 
                ? '<i class="fas fa-video"></i> Câmera Aberta (Clique para Fechar)' 
                : '<i class="fas fa-video"></i> Abrir Câmera'; 
        } else {
            openCameraBtn.disabled = true;
            if (!baseFieldsReady) {
                openCameraBtn.innerHTML = '<i class="fas fa-lock"></i> Preencha Entregador/Rede/Loja';
            } else {
                openCameraBtn.innerHTML = '<i class="fas fa-plus"></i> Adicione Pelo Menos 1 Item';
            }
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

// Listeners específicos de Devolução MODIFICADOS
if (inputObservacoes) inputObservacoes.addEventListener('input', saveSelection); 
if (addItemBtn) addItemBtn.addEventListener('click', handleAddItem);


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

    // MODIFICADO: Campos de Devolução vêm da lista 'items'
    if (items.length > 0) {
        lines.push(`--- ITENS DEVOLUÇÃO ---`);
        items.forEach((item, index) => {
            lines.push(`Item ${index + 1}: ${item.produto} (${item.motivo}) - ${item.quantidade} KG`);
        });
    } else {
        lines.push("Nenhum item de devolução adicionado");
    }
    
    
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

        // MODIFICADO: Campos de Devolução vêm da lista 'items'
        if (items.length > 0) {
            watermarkContent += `<br>--- ITENS DEVOLUÇÃO ---`;
            items.forEach((item, index) => {
                watermarkContent += `<br>Item ${index + 1}: ${item.produto} (${item.motivo}) - ${item.quantidade} KG`;
            });
        } else {
            watermarkContent += `<br>Nenhum item adicionado`;
        }
        
        
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

// NOVA FUNÇÃO: Lógica de Geração de PDF (Stub)
function generatePDFReport(action) {
    if (photos.length === 0) {
        alert("Tire pelo menos uma foto para gerar o relatório.");
        return;
    }
    if (items.length === 0) {
        alert("Adicione pelo menos um item de devolução para gerar o relatório.");
        return;
    }

    // 1. Verifica se a biblioteca jsPDF está disponível
    if (typeof jsPDF === 'undefined' || typeof html2canvas === 'undefined') {
        alert("ERRO: As bibliotecas jsPDF e html2canvas são necessárias para gerar o PDF.\n\nPor favor, peça ao desenvolvedor para adicioná-las ao arquivo HTML.");
        
        console.warn("jsPDF ou html2canvas não encontrados.");
        return;
    }

    // 2. Coletar todos os dados
    const entregador = selectEntregador.value;
    const rede = selectRede.value;
    const loja = selectLoja.value;
    const observacoes = inputObservacoes.value.trim() || 'Nenhuma';
    const date = new Date().toLocaleString('pt-BR');
    
    alert("Iniciando geração do PDF... Isso pode levar um momento.");

    // 3. Criar um contêiner HTML temporário para o conteúdo do PDF
    const reportElement = document.createElement('div');
    reportElement.style.width = '210mm'; // Tamanho A4
    reportElement.style.padding = '10mm';
    reportElement.style.fontFamily = 'Arial, sans-serif';
    reportElement.style.fontSize = '12px';
    
    let reportContent = `
        <img src="${logoImage.src}" style="width: 150px; margin-bottom: 10px;" alt="Logo">
        <h1 style="font-size: 20px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">Relatório de Devolução</h1>
        <p><strong>Data:</strong> ${date}</p>
        <p><strong>Entregador:</strong> ${entregador}</p>
        <p><strong>Cliente:</strong> ${rede} - ${loja}</p>
        
        <h2 style="font-size: 16px; margin-top: 20px; border-bottom: 1px solid #eee; padding-bottom: 3px;">Itens da Devolução</h2>
        <ul style="list-style-type: disc; padding-left: 20px;">
    `;
    
    items.forEach(item => {
        reportContent += `<li style="margin-bottom: 5px;"><strong>${item.produto}</strong> (${item.motivo}) - ${item.quantidade} KG</li>`;
    });
    
    reportContent += `
        </ul>
        <h2 style="font-size: 16px; margin-top: 20px; border-bottom: 1px solid #eee; padding-bottom: 3px;">Observações</h2>
        <p style="white-space: pre-wrap;">${observacoes}</p>
        
        <h2 style="font-size: 16px; margin-top: 20px; border-bottom: 1px solid #eee; padding-bottom: 3px;">Fotos</h2>
    `;
    
    photos.forEach((photoUrl, index) => {
        reportContent += `
            <div style="margin-top: 15px; page-break-inside: avoid;">
                <p style="font-weight: bold;">Foto ${index + 1}</p>
                <img src="${photoUrl}" style="width: 100%; max-width: 180mm; border: 1px solid #ccc; margin-top: 5px;">
            </div>
        `;
    });

    reportElement.innerHTML = reportContent;
    document.body.appendChild(reportElement); // Adiciona ao DOM para o html2canvas ler

    // 4. Usar html2canvas para renderizar o HTML e jsPDF para criar o PDF
    html2canvas(reportElement, { scale: 2 }).then(canvas => {
        document.body.removeChild(reportElement); // Remove o elemento temporário
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF.jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        
        const fileName = `relatorio_devolucao_${rede}_${loja}.pdf`;

        if (action === 'download') {
            pdf.save(fileName);
        } else if (action === 'share') {
            alert("A função de 'Compartilhar' gerará o PDF. Por favor, use a função de compartilhamento do seu visualizador de PDF após o download.");
            // O compartilhamento direto de blobs de PDF é complexo e não universal
            // A melhor abordagem é o download
            pdf.save(fileName);
        }
    }).catch(err => {
        console.error("Erro ao gerar PDF:", err);
        alert("Ocorreu um erro ao gerar o relatório PDF.");
        document.body.removeChild(reportElement);
    });
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

// MODIFICADO: Listeners para os botões de PDF
if (downloadAllBtn) downloadAllBtn.addEventListener('click', () => generatePDFReport('download'));
if (shareAllBtn) shareAllBtn.addEventListener('click', () => generatePDFReport('share'));


// ==================== INICIALIZAÇÃO GERAL ====================
window.addEventListener('load', () => {
    // Carrega as seleções salvas e preenche os dropdowns da câmera
    loadAndPopulateDropdowns(); 
    // Inicializa a lista de itens vazia na UI
    updateItemListUI();
});