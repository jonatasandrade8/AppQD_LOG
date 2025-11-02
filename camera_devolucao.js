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
// const dateTimeElement = document.getElementById('date-time'); <--- REMOVIDO: Elemento de Marca D'água
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
let items = []; // Armazena a lista de itens (produto, motivo, qtd)
const localStorageKey = 'qdelicia_logistica_last_selection'; 

// Carregar a imagem da logomarca (mantida para uso apenas no PDF)
const logoImage = new Image();
logoImage.src = './images/logo-qdelicia.png'; 
logoImage.onerror = () => console.error("Erro ao carregar a imagem da logomarca. Verifique o caminho.");


// --- LÓGICA DE DROP DOWNS, PERSISTÊNCIA E VALIDAÇÃO ---

function saveSelection() {
    const existingSelection = JSON.parse(localStorage.getItem(localStorageKey)) || {};

    const selection = {
        ...existingSelection, 
        entregador: selectEntregador ? selectEntregador.value : '',
        rede: selectRede ? selectRede.value : '',
        loja: selectLoja ? selectLoja.value : '',
        observacoes: inputObservacoes ? inputObservacoes.value : ''
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
        
        if (inputObservacoes && savedSelection.observacoes) inputObservacoes.value = savedSelection.observacoes; 
    }
    
    checkCameraAccess();
}

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

    selectProduto.value = "";
    selectMotivo.value = "";
    inputQuantidade.value = "";
}

function updateItemListUI() {
    if (!itemListElement) return;

    itemListElement.innerHTML = ''; 
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
            items.splice(index, 1); 
            updateItemListUI(); 
            checkCameraAccess(); 
        });

        itemListElement.appendChild(li);
    });
}

function checkCameraAccess() {
    let isReady = false;

    const baseFieldsReady = selectEntregador && selectEntregador.value && 
                            selectRede && selectRede.value && 
                            selectLoja && selectLoja.value;
    
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

// Listeners específicos de Devolução
if (inputObservacoes) inputObservacoes.addEventListener('input', saveSelection); 
if (addItemBtn) addItemBtn.addEventListener('click', handleAddItem);


// --- LÓGICA DA CÂMERA (SEM MARCA D'ÁGUA) ---

/**
 * REMOVIDO: A função drawWatermark foi completamente removida.
 */
// function drawWatermark(canvas, ctx) { ... }


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
                // updateDateTimeWatermark(); <--- REMOVIDO: Nenhuma marca d'água na pré-visualização
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

/**
 * REMOVIDO: A função updateDateTimeWatermark foi removida,
 * pois não haverá marca d'água de data/hora na pré-visualização.
 */
// function updateDateTimeWatermark() { ... }


/**
 * CONFIRMADO: As fotos agora são capturadas limpas, sem marca d'água.
 */
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
    
    // drawWatermark(canvas, ctx); <--- Não está aqui. Foto limpa.

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

// ==================== LÓGICA DE GERAÇÃO DE PDF (OTIMIZADA) ====================
async function generatePDFReport(action) {
    if (photos.length === 0) {
        alert("Tire pelo menos uma foto para gerar o relatório.");
        return;
    }
    if (items.length === 0) {
        alert("Adicione pelo menos um item de devolução para gerar o relatório.");
        return;
    }

    if (typeof jspdf === 'undefined') {
        alert("ERRO: A biblioteca jsPDF não foi carregada. Verifique o HTML.");
        return;
    }
    
    const { jsPDF } = jspdf; 
    alert("Iniciando geração do PDF. Isso pode levar um momento.");

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    
    // Configurações para o layout 2x3
    const cols = 2;
    const rows = 3;
    const imgPadding = 3;
    const imgWidth = (pdfWidth - (margin * 2) - ((cols - 1) * imgPadding)) / cols;
    const imgHeight = (pdfHeight - (margin * 2) - ((rows - 1) * imgPadding)) / rows;
    
    
    // --- PARTE 1: ADICIONAR FOTOS (2x3 por página) ---
    // A primeira página é adicionada automaticamente
    let currentPhoto = 0;
    
    for (let i = 0; i < photos.length; i++) {
        const photoIndexOnPage = i % (cols * rows);
        
        if (photoIndexOnPage === 0 && i !== 0) {
            pdf.addPage();
        }
        
        const col = photoIndexOnPage % cols;
        const row = Math.floor(photoIndexOnPage / cols);
        
        const x = margin + (col * (imgWidth + imgPadding));
        const y = margin + (row * (imgHeight + imgPadding));

        // Adiciona o título da foto
        pdf.setFontSize(8);
        pdf.text(`Foto ${i + 1}`, x, y - 2); 
        
        // Adiciona a imagem
        pdf.addImage(photos[i], 'JPEG', x, y, imgWidth, imgHeight);
        currentPhoto++;
    }

    // --- PARTE 2: ADICIONAR RELATÓRIO DE INFORMAÇÕES (NOVA PÁGINA) ---
    
    // Adiciona uma nova página para o relatório, garantindo que comece sempre em uma página nova após as fotos
    pdf.addPage();
    
    const entregador = selectEntregador.value;
    const rede = selectRede.value;
    const loja = selectLoja.value;
    const observacoes = inputObservacoes.value.trim() || 'Nenhuma observação.';
    const date = new Date().toLocaleString('pt-BR');
    let yPos = margin;

    // Cabeçalho e Logomarca
    
    const logoDataUrl = logoImage.complete ? logoImage.src : null;
    if (logoDataUrl) {
        pdf.addImage(logoDataUrl, 'PNG', margin, yPos, 40, 15); 
        yPos += 20; 
    }
    
    // Título
    pdf.setFontSize(18);
    pdf.text('Relatório de Devolução', margin, yPos);
    pdf.line(margin, yPos + 2, pdfWidth - margin, yPos + 2); 
    yPos += 10; 

    // Dados Gerais
    pdf.setFontSize(11);
    pdf.text(`Data e Hora: ${date}`, margin, yPos);
    yPos += 7;
    pdf.text(`Entregador: ${entregador}`, margin, yPos);
    yPos += 7;
    pdf.text(`Rede: ${rede} - Loja: ${loja}`, margin, yPos);
    yPos += 10;
    
    // Itens da Devolução
    pdf.setFontSize(14);
    pdf.text('Itens da Devolução', margin, yPos);
    pdf.line(margin, yPos + 2, pdfWidth - margin, yPos + 2); 
    yPos += 7;
    
    pdf.setFontSize(11);
    items.forEach((item, index) => {
        const text = `• Item ${index + 1}: ${item.produto} (${item.motivo}) - ${item.quantidade} KG`;
        const splitText = pdf.splitTextToSize(text, pdfWidth - (margin * 2));
        pdf.text(splitText, margin, yPos);
        yPos += (splitText.length * 5) + 2; 
        
        // Quebra de página para itens longos
        if (yPos > pdfHeight - 20) {
            pdf.addPage();
            yPos = margin;
            pdf.setFontSize(11);
        }
    });

    yPos += 5;

    // Observações
    pdf.setFontSize(14);
    pdf.text('Observações Gerais', margin, yPos);
    pdf.line(margin, yPos + 2, pdfWidth - margin, yPos + 2); 
    yPos += 7;
    
    pdf.setFontSize(11);
    const splitObs = pdf.splitTextToSize(observacoes, pdfWidth - (margin * 2));
    pdf.text(splitObs, margin, yPos);
    yPos += (splitObs.length * 5) + 2;

    const fileName = `relatorio_devolucao_${rede}_${loja}_${date.split(' ')[0].replace(/\//g, '-')}.pdf`;

    if (action === 'download') {
        pdf.save(fileName);
    } else if (action === 'share') {
        pdf.save(fileName); // 1. Garante que o PDF seja baixado

        const summaryText = `*RELATÓRIO DE DEVOLUÇÃO QDELÍCIA*\n\n` +
                            `*Entregador:* ${entregador}\n` +
                            `*Rede/Loja:* ${rede} - ${loja}\n` +
                            `*Data/Hora:* ${date}\n` +
                            `*Total de Itens Devolvidos:* ${items.length}\n` +
                            `*Observações:* ${observacoes.substring(0, 150)}${observacoes.length > 150 ? '...' : ''}\n\n` +
                            `🚨 *Atenção:* O arquivo PDF (${fileName}) com todas as fotos e detalhes foi baixado para o seu dispositivo. *Anexe este PDF* a esta mensagem antes de enviar.`;
        
        const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(summaryText)}`;
        window.open(whatsappUrl, '_blank');
        
        // Alerta para orientar o usuário a anexar o arquivo.
        alert(`O PDF "${fileName}" foi baixado. O WhatsApp será aberto em seguida. Por favor, *anexe o PDF baixado* à mensagem antes de enviar!`);
    }
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

// Listeners para os botões de PDF
if (downloadAllBtn) downloadAllBtn.addEventListener('click', () => generatePDFReport('download'));
if (shareAllBtn) shareAllBtn.addEventListener('click', () => generatePDFReport('share'));


// ==================== INICIALIZAÇÃO GERAL ====================
window.addEventListener('load', () => {
    loadAndPopulateDropdowns(); 
    updateItemListUI();
});