// O arquivo APP_DATA e as funções utilitárias (menu, back-to-top, populateSelect, populateLoja) 
// devem ser importadas de script.js ou replicadas aqui. 
// Para manter a independência conforme solicitado, replico a estrutura e as funções necessárias.

// ==================== ESTRUTURA DE DADOS (CÓPIA DE script.js) ====================
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
    // Produtos obrigatórios para conferência
    PRODUTOS_CONFERENCIA: [
        "Pacovan",
        "Prata",
        "Nanica",
        "Comprida",
        "Leite",
        "Abacaxi",
        "Goiaba",
    ],
};

const localStorageKeyConference = 'qdelicia_logistica_conference'; 

// ==================== VARIÁVEIS DE ESTADO ====================
let notaQuantities = {}; // Armazena KG da nota (Ex: { "Pacovan": 100, "Prata": 50, ... })
let conferenceEntries = {}; // Armazena KG conferido (Ex: { "Pacovan": 98, "Prata": 50.5, ... })

// Inicializa conferenceEntries com 0 para todos os produtos da nota
function initializeConferenceEntries() {
    conferenceEntries = {};
    APP_DATA.PRODUTOS_CONFERENCIA.forEach(produto => {
        // Inicializa apenas se o produto foi inserido na nota
        if(notaQuantities[produto] && parseFloat(notaQuantities[produto]) > 0) {
            conferenceEntries[produto] = 0;
        }
    });
}


// ==================== ELEMENTOS DA INTERFACE ====================
const selectConferente = document.getElementById('select-conferente');
const selectRede = document.getElementById('select-rede'); 
const selectLoja = document.getElementById('select-loja'); 

const notaInputSection = document.getElementById('nota-input-section');
const productTargetsGrid = document.getElementById('product-targets-grid');
const startConferenceBtn = document.getElementById('start-conference-btn');

const conferenceInputSection = document.getElementById('conference-input-section');
const selectProductConference = document.getElementById('select-product-conference');
const inputKgConference = document.getElementById('input-kg-conference');
const addConferenceBtn = document.getElementById('add-conference-btn');

const conferenceSummarySection = document.getElementById('conference-summary-section');
const conferenceSummaryTableBody = conferenceSummarySection ? conferenceSummarySection.querySelector('tbody') : null;
const summaryConferente = document.getElementById('summary-conferente');
const summaryRedeLoja = document.getElementById('summary-rede-loja');

const downloadConferencePdfBtn = document.getElementById('download-conference-pdf-btn');
const shareConferenceBtn = document.getElementById('share-conference-btn');
const conferenceReportContent = document.getElementById('conference-report-content');
const resetConferenceBtn = document.getElementById('reset-conference-btn');


// ==================== FUNÇÕES UTILS E DROPDOWNS (CÓPIA DE script.js) ====================

// Funções de Dropdown e Persistência (Adaptadas para Conferência)
function saveSelection() {
    const selection = {
        conferente: selectConferente ? selectConferente.value : '',
        rede: selectRede ? selectRede.value : '',
        loja: selectLoja ? selectLoja.value : '',
    };
    localStorage.setItem(localStorageKeyConference, JSON.stringify(selection));
    checkStartConferenceButton();
}

function populateSelect(selectElement, data, placeholder) {
    if (!selectElement) return;
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
    populateSelect(selectConferente, APP_DATA.ENTREGADORES, "Selecione o Conferente");
    populateSelect(selectRede, APP_DATA.REDES_LOJAS, "Selecione a Rede/Cliente");

    if (selectLoja) {
          selectLoja.innerHTML = '<option value="" disabled selected>Selecione a Loja/PDV</option>';
          selectLoja.disabled = true;
    }

    const savedSelection = JSON.parse(localStorage.getItem(localStorageKeyConference));

    if (savedSelection) {
        if (selectConferente && savedSelection.conferente) selectConferente.value = savedSelection.conferente;
        if (selectRede && savedSelection.rede) {
            selectRede.value = savedSelection.rede;
            populateLoja(savedSelection.rede); 
            if (selectLoja && savedSelection.loja) selectLoja.value = savedSelection.loja;
        }
    }
    
    checkStartConferenceButton();
}

// ==================== LÓGICA ESPECÍFICA DA CONFERÊNCIA ====================

/**
 * @description Injeta dinamicamente os inputs de KG da Nota Fiscal.
 */
function populateNotaInputs() {
    if (!productTargetsGrid) return;
    productTargetsGrid.innerHTML = '';

    APP_DATA.PRODUTOS_CONFERENCIA.forEach(produto => {
        const inputGroup = document.createElement('div');
        inputGroup.classList.add('input-group-inline');
        
        const label = document.createElement('label');
        label.textContent = `${produto} (KG):`;

        const input = document.createElement('input');
        input.type = 'number';
        input.id = `input-nota-${produto.toLowerCase()}`;
        input.placeholder = '0.00';
        input.step = '0.01';
        input.min = '0';
        input.required = true;
        input.value = notaQuantities[produto] || ''; // Carrega valor, se existir
        
        input.addEventListener('input', () => {
            notaQuantities[produto] = parseFloat(input.value) || 0;
            checkStartConferenceButton();
        });

        inputGroup.appendChild(label);
        inputGroup.appendChild(input);
        productTargetsGrid.appendChild(inputGroup);
    });
}

/**
 * @description Verifica se os campos iniciais (Usuário, Rede, Loja e pelo menos 1 KG da nota) estão preenchidos para liberar o botão 'Iniciar Conferência'.
 */
function checkStartConferenceButton() {
    const isUserInfoReady = selectConferente && selectConferente.value && 
                            selectRede && selectRede.value && 
                            selectLoja && selectLoja.value;

    const hasNotaEntry = Object.values(notaQuantities).some(val => parseFloat(val) > 0);
    
    if (isUserInfoReady && hasNotaEntry) {
        startConferenceBtn.disabled = false;
        startConferenceBtn.textContent = 'Iniciar Conferência';
    } else {
        startConferenceBtn.disabled = true;
        startConferenceBtn.textContent = 'Preencha todos os campos';
    }
}

/**
 * @description Prepara a interface para o lançamento da conferência.
 */
function startConference() {
    // 1. Desabilita inputs da Nota e do Usuário
    document.querySelectorAll('#nota-input-section input, #user-info-section select').forEach(el => el.disabled = true);
    startConferenceBtn.style.display = 'none';

    // 2. Prepara o objeto de conferência
    initializeConferenceEntries();
    
    // 3. Exibe a seção de lançamento e resumo
    conferenceInputSection.style.display = 'block';
    conferenceSummarySection.style.display = 'block';
    
    // 4. Preenche o select de produtos para conferência
    const availableProducts = APP_DATA.PRODUTOS_CONFERENCIA.filter(p => notaQuantities[p] && parseFloat(notaQuantities[p]) > 0);
    populateSelect(selectProductConference, availableProducts, "Selecione o Produto para conferir");
    selectProductConference.value = ''; // Limpa a seleção
    
    // 5. Atualiza a exibição inicial
    updateSummaryDisplay();
}

/**
 * @description Adiciona um lançamento de conferência.
 */
function addConferenceEntry() {
    const produto = selectProductConference.value;
    const kg = parseFloat(inputKgConference.value);

    if (!produto || isNaN(kg) || kg < 0) {
        alert("Por favor, selecione um produto e insira uma quantidade válida.");
        return;
    }

    // Soma o valor ao total conferido para o produto
    conferenceEntries[produto] = (conferenceEntries[produto] || 0) + kg;

    // Limpa o formulário de lançamento
    selectProductConference.value = '';
    inputKgConference.value = '';
    addConferenceBtn.disabled = true;

    // Atualiza a tabela
    updateSummaryDisplay();
}

/**
 * @description Atualiza a tabela de resumo e a diferença (falta).
 */
function updateSummaryDisplay() {
    if (!conferenceSummaryTableBody) return;

    // 1. Atualiza dados do cabeçalho
    summaryConferente.textContent = selectConferente.value;
    summaryRedeLoja.textContent = `${selectRede.value} / ${selectLoja.value}`;
    
    conferenceSummaryTableBody.innerHTML = '';

    let totalNota = 0;
    let totalConferido = 0;
    let totalDiferenca = 0;

    // 2. Preenche a tabela
    APP_DATA.PRODUTOS_CONFERENCIA.forEach(produto => {
        const notaKg = parseFloat(notaQuantities[produto]) || 0;
        const conferidoKg = parseFloat(conferenceEntries[produto]) || 0;
        
        // Exibe apenas produtos com KG na nota ou já conferidos (após o início)
        if (notaKg > 0 || (conferenceInputSection.style.display === 'block' && conferidoKg > 0)) {
            const diferenca = conferidoKg - notaKg;
            const statusText = diferenca === 0 ? 'OK' : (diferenca < 0 ? 'Falta' : 'Sobra');
            const statusClass = diferenca === 0 ? 'status-ok' : (diferenca < 0 ? 'status-missing' : 'status-excess');
            
            const row = conferenceSummaryTableBody.insertRow();
            
            row.insertCell().textContent = produto;
            row.insertCell().textContent = notaKg.toFixed(2);
            row.insertCell().textContent = conferidoKg.toFixed(2);
            
            const diferencaCell = row.insertCell();
            diferencaCell.textContent = diferenca.toFixed(2);
            diferencaCell.classList.add(diferenca < 0 ? 'missing-value' : (diferenca > 0 ? 'excess-value' : 'ok-value'));
            
            const statusCell = row.insertCell();
            statusCell.textContent = statusText;
            statusCell.classList.add(statusClass);

            totalNota += notaKg;
            totalConferido += conferidoKg;
            totalDiferenca += diferenca;
        }
    });

    // 3. Adiciona a linha de total
    if (totalNota > 0 || totalConferido > 0) {
        const totalRow = conferenceSummaryTableBody.insertRow();
        totalRow.classList.add('total-row');
        
        totalRow.insertCell().textContent = 'TOTAL';
        totalRow.insertCell().textContent = totalNota.toFixed(2);
        totalRow.insertCell().textContent = totalConferido.toFixed(2);
        
        const totalDiferencaCell = totalRow.insertCell();
        totalDiferencaCell.textContent = totalDiferenca.toFixed(2);
        totalDiferencaCell.classList.add(totalDiferenca < 0 ? 'missing-value' : (totalDiferenca > 0 ? 'excess-value' : 'ok-value'));
        
        totalRow.insertCell().textContent = totalDiferenca === 0 ? 'OK' : (totalDiferenca < 0 ? 'FALTA' : 'SOBRA');
    }
}


/**
 * @description Converte o conteúdo do relatório para PDF e inicia o download.
 */
function downloadConferenceReportPDF() {
    if (!conferenceReportContent || typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
        alert("Erro: Bibliotecas de PDF não carregadas ou conteúdo não encontrado. O PDF requer html2canvas e jspdf.");
        return;
    }

    const title = 'Relatório de Conferência';
    const conferente = summaryConferente.textContent;
    const redeLoja = summaryRedeLoja.textContent;
    const filename = `Conferencia_${redeLoja.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;

    // 1. Clonar o conteúdo para renderizar corretamente
    const clone = conferenceReportContent.cloneNode(true);
    clone.style.maxWidth = '800px'; 
    clone.style.margin = '0 auto';
    clone.style.padding = '20px';
    clone.style.backgroundColor = '#fff';
    document.body.appendChild(clone);

    // 2. Usar html2canvas para renderizar o HTML em uma imagem
    html2canvas(clone, {
        scale: 2, 
        logging: false,
        useCORS: true 
    }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jspdf.jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });
        const imgProps= pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        // Adiciona um título ao topo
        pdf.setFontSize(16);
        pdf.text(title, 105, 15, null, null, "center");

        // Adiciona a imagem/canvas ao PDF
        pdf.addImage(imgData, 'PNG', 10, 20, pdfWidth - 20, pdfHeight); 

        // 3. Inicia o download
        pdf.save(filename);

        // Remove o clone
        document.body.removeChild(clone);
    }).catch(error => {
        console.error('Erro na geração do PDF:', error);
        alert('Erro ao gerar o PDF. Verifique o console para detalhes.');
        document.body.removeChild(clone); 
    });
}

/**
 * @description Compartilha um resumo do relatório via WhatsApp.
 */
function shareConferenceWhatsApp() {
    const conferente = summaryConferente.textContent;
    const redeLoja = summaryRedeLoja.textContent;
    
    let message = `*Relatório de Conferência - Qdelícia*\n`;
    message += `*Conferente:* ${conferente}\n`;
    message += `*Rede/Loja:* ${redeLoja}\n\n`;
    message += `*Detalhes da Conferência:*\n`;

    let totalNota = 0;
    let totalConferido = 0;

    APP_DATA.PRODUTOS_CONFERENCIA.forEach(produto => {
        const notaKg = parseFloat(notaQuantities[produto]) || 0;
        const conferidoKg = parseFloat(conferenceEntries[produto]) || 0;
        const diferenca = conferidoKg - notaKg;

        if (notaKg > 0) {
            message += `- ${produto}:\n`;
            message += `  > Nota: ${notaKg.toFixed(2)} kg\n`;
            message += `  > Conf: ${conferidoKg.toFixed(2)} kg\n`;
            message += `  > Dif: ${diferenca.toFixed(2)} kg\n`;
            
            totalNota += notaKg;
            totalConferido += conferidoKg;
        }
    });

    const totalDiferenca = totalConferido - totalNota;
    
    message += `\n*RESUMO GERAL (KG):*\n`;
    message += `*Total Nota:* ${totalNota.toFixed(2)} kg\n`;
    message += `*Total Conferido:* ${totalConferido.toFixed(2)} kg\n`;
    message += `*Diferença Final:* ${totalDiferenca.toFixed(2)} kg\n`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}

/**
 * @description Reinicia todo o estado da conferência.
 */
function resetConference() {
    // 1. Limpa o estado
    notaQuantities = {};
    conferenceEntries = {};
    
    // 2. Reseta a interface
    document.querySelectorAll('#nota-input-section input, #user-info-section select').forEach(el => el.disabled = false);
    document.querySelectorAll('#nota-input-section input').forEach(input => input.value = '');
    
    startConferenceBtn.style.display = 'block';
    startConferenceBtn.textContent = 'Iniciar Conferência';
    conferenceInputSection.style.display = 'none';
    conferenceSummarySection.style.display = 'none';
    
    if (conferenceSummaryTableBody) conferenceSummaryTableBody.innerHTML = '';
    
    // 3. Força a verificação
    checkStartConferenceButton();
}

// ==================== INICIALIZAÇÃO E LISTENERS ====================

// Adiciona os listeners para os campos de seleção do usuário
if (selectConferente) selectConferente.addEventListener('change', saveSelection);
if (selectRede) selectRede.addEventListener('change', (e) => {
    populateLoja(e.target.value);
    saveSelection();
});
if (selectLoja) selectLoja.addEventListener('change', saveSelection);

// Listeners dos botões de ação
if (startConferenceBtn) startConferenceBtn.addEventListener('click', startConference);
if (addConferenceBtn) addConferenceBtn.addEventListener('click', addConferenceEntry);
if (inputKgConference) inputKgConference.addEventListener('input', () => {
    addConferenceBtn.disabled = !selectProductConference.value || parseFloat(inputKgConference.value) <= 0;
});
if (selectProductConference) selectProductConference.addEventListener('change', () => {
    addConferenceBtn.disabled = !selectProductConference.value || parseFloat(inputKgConference.value) <= 0;
});

// Listeners de Relatório
if (downloadConferencePdfBtn) downloadConferencePdfBtn.addEventListener('click', downloadConferenceReportPDF);
if (shareConferenceBtn) shareConferenceBtn.addEventListener('click', shareConferenceWhatsApp);
if (resetConferenceBtn) resetConferenceBtn.addEventListener('click', resetConference);


// Inicia o processo
document.addEventListener('DOMContentLoaded', () => {
    // Carrega/Preenche os dados do usuário/loja
    loadAndPopulateDropdowns();
    // Injeta os campos de input da nota
    populateNotaInputs();
    
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
    }
});