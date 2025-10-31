// =======================================================================
// ARQUIVO: conferencia_geral.js
// DESCRIÇÃO: Lógica para a página de Conferência Geral de Produtos.
// Inclui persistência de estado (localStorage) e geração de PDF/CSV.
// =======================================================================

// ==================== ESTRUTURA DE DADOS ====================
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
const localStorageKeyConferenceState = 'qdelicia_logistica_conference_state'; 

// ==================== VARIÁVEIS DE ESTADO ====================
let notaQuantities = {}; 
let conferenceEntries = {}; 

/**
 * @description Inicializa conferenceEntries com 0 para todos os produtos que estão na nota.
 */
function initializeConferenceEntries() {
    conferenceEntries = {};
    APP_DATA.PRODUTOS_CONFERENCIA.forEach(produto => {
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

const downloadPdfBtn = document.getElementById('download-pdf-btn');
const sharePdfBtn = document.getElementById('share-pdf-btn');
const shareCsvBtn = document.getElementById('share-csv-btn');
const resetConferenceBtn = document.getElementById('reset-conference-btn');


// ==================== FUNÇÕES UTILS E DROPDOWNS ====================

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

// ==================== FUNÇÕES DE PERSISTÊNCIA DE ESTADO ====================

/**
 * @description Salva o estado completo da conferência no localStorage.
 */
function saveConferenceState() {
    const state = {
        notaQuantities: notaQuantities,
        conferenceEntries: conferenceEntries,
        isConferenceStarted: conferenceInputSection.style.display === 'block'
    };
    localStorage.setItem(localStorageKeyConferenceState, JSON.stringify(state));
}

/**
 * @description Carrega o estado completo da conferência do localStorage e restaura a UI.
 */
function loadConferenceState() {
    const savedState = localStorage.getItem(localStorageKeyConferenceState);
    if (!savedState) return;

    try {
        const state = JSON.parse(savedState);
        
        notaQuantities = state.notaQuantities || {};
        conferenceEntries = state.conferenceEntries || {};

        if (state.isConferenceStarted) {
            startConferenceBtn.disabled = false;
            startConference(true); 
        } else {
            updateSummaryDisplay();
        }

    } catch (e) {
        console.error("Erro ao carregar estado da conferência:", e);
        localStorage.removeItem(localStorageKeyConferenceState);
    }
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
        
        const savedValue = notaQuantities[produto];
        if (savedValue && parseFloat(savedValue) > 0) {
             input.value = parseFloat(savedValue);
        } else {
             input.value = '';
        }
        
        input.addEventListener('input', () => {
            notaQuantities[produto] = parseFloat(input.value) || 0;
            
            saveConferenceState(); 
            checkStartConferenceButton();
            updateSummaryDisplay();
        });

        inputGroup.appendChild(label);
        inputGroup.appendChild(input);
        productTargetsGrid.appendChild(inputGroup);
    });
}

/**
 * @description Verifica se os campos iniciais estão preenchidos para liberar o botão 'Iniciar Conferência'.
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
 * @param {boolean} isRestoring - Indica se a função foi chamada ao restaurar o estado.
 */
function startConference(isRestoring = false) {
    document.querySelectorAll('#nota-input-section input, #user-info-section select').forEach(el => el.disabled = true);
    startConferenceBtn.style.display = 'none';

    if (!isRestoring) {
        initializeConferenceEntries();
    }
    
    conferenceInputSection.style.display = 'block';
    conferenceSummarySection.style.display = 'block';
    
    const availableProducts = APP_DATA.PRODUTOS_CONFERENCIA.filter(p => notaQuantities[p] && parseFloat(notaQuantities[p]) > 0);
    populateSelect(selectProductConference, availableProducts, "Selecione o Produto para conferir");
    selectProductConference.value = ''; 
    
    updateSummaryDisplay();
    saveConferenceState();
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

    conferenceEntries[produto] = (conferenceEntries[produto] || 0) + kg;

    selectProductConference.value = '';
    inputKgConference.value = '';
    addConferenceBtn.disabled = true;

    updateSummaryDisplay();
    saveConferenceState();
}

/**
 * @description Atualiza a tabela de resumo e a diferença (falta).
 */
function updateSummaryDisplay() {
    if (!conferenceSummaryTableBody) return;

    summaryConferente.textContent = selectConferente.value || 'N/A';
    summaryRedeLoja.textContent = (selectRede.value && selectLoja.value) ? `${selectRede.value} / ${selectLoja.value}` : 'N/A';
    
    conferenceSummaryTableBody.innerHTML = '';

    let totalNota = 0;
    let totalConferido = 0;
    let totalDiferenca = 0;
    let hasData = false;

    APP_DATA.PRODUTOS_CONFERENCIA.forEach(produto => {
        const notaKg = parseFloat(notaQuantities[produto]) || 0;
        const conferidoKg = parseFloat(conferenceEntries[produto]) || 0;
        
        if (notaKg > 0 || conferidoKg > 0) {
            hasData = true;
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
    
    if (downloadPdfBtn) downloadPdfBtn.disabled = !hasData;
    if (sharePdfBtn) sharePdfBtn.disabled = !hasData;
    if (shareCsvBtn) shareCsvBtn.disabled = !hasData;
}

// -----------------------------------------------------------------
// Lógica de Relatório (PDF c/ AutoTable e CSV)
// -----------------------------------------------------------------

/**
 * @description Coleta todos os dados do relatório em um objeto estruturado.
 */
function getConferenceReportData() {
    const date = new Date();
    let totalNota = 0;
    let totalConferido = 0;
    
    const detalhes = [];
    APP_DATA.PRODUTOS_CONFERENCIA.forEach(produto => {
        const notaKg = parseFloat(notaQuantities[produto]) || 0;
        const conferidoKg = parseFloat(conferenceEntries[produto]) || 0;
        
        if (notaKg > 0 || conferidoKg > 0) {
            const diferenca = conferidoKg - notaKg;
            const status = diferenca === 0 ? 'OK' : (diferenca < 0 ? 'Falta' : 'Sobra');
            
            detalhes.push({
                produto: produto,
                notaKg: notaKg,
                conferidoKg: conferidoKg,
                diferenca: diferenca,
                status: status
            });
            
            totalNota += notaKg;
            totalConferido += conferidoKg;
        }
    });
    
    const totalDiferenca = totalConferido - totalNota;
    
    return {
        conferente: selectConferente.value,
        rede: selectRede.value,
        loja: selectLoja.value,
        dataGeracao: date.toLocaleString('pt-BR'),
        dataArquivo: date.toISOString().slice(0, 10).replace(/-/g, ''),
        
        detalhes: detalhes, 
        
        resumo: {
            totalNota: totalNota,
            totalConferido: totalConferido,
            totalDiferenca: totalDiferenca
        }
    };
}

/**
 * @description Gera um objeto jsPDF profissional com AutoTable, incluindo a logomarca.
 */
function generateConferencePdf(data) {
    if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
        alert("Erro: A biblioteca jsPDF não foi carregada.");
        return null;
    }
    
    const doc = new window.jspdf.jsPDF(); 

    // Verifica se o plugin autoTable foi carregado (CORREÇÃO DE ERRO)
    if (typeof doc.autoTable === 'undefined') {
        alert("Erro: O plugin jsPDF-AutoTable não foi carregado. Verifique a ordem dos scripts no HTML.");
        return null;
    }
    
    let startY = 20;

    // === INSERÇÃO DA LOGOMARCA ===
    const logoPath = './images/logo-qdelicia.png';
    const logoWidth = 30; 
    const logoHeight = 8; 
    const margin = 14; 

    try {
        // Posição: 14mm da esquerda e 14mm do topo
        doc.addImage(logoPath, 'PNG', margin, 14, logoWidth, logoHeight); 
    } catch (e) {
        console.warn("Não foi possível carregar a logomarca no PDF.", e);
    }
    // === FIM DA INSERÇÃO DA LOGOMARCA ===
    
    // O cabeçalho agora começa mais abaixo para acomodar a logo
    startY = 32; 
    
    // === CABEÇALHO ===
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text("Relatório de Conferência", doc.internal.pageSize.getWidth() / 2, startY, { align: 'center' });
    startY += 8;
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text(`Qdelícia Frutas - Gerado em: ${data.dataGeracao}`, doc.internal.pageSize.getWidth() / 2, startY, { align: 'center' });
    startY += 12;

    doc.setFontSize(10);
    doc.text(`Conferente: ${data.conferente}`, 14, startY);
    doc.text(`Rede/Loja: ${data.rede} / ${data.loja}`, 14, startY + 6);
    startY += 16;

    // === TABELA DE DETALHES ===
    const tableHead = [['Produto', 'KG Nota', 'KG Conferido', 'Diferença (KG)', 'Status']];
    const tableBody = data.detalhes.map(item => [
        item.produto,
        item.notaKg.toFixed(2),
        item.conferidoKg.toFixed(2),
        item.diferenca.toFixed(2),
        item.status
    ]);

    // === LINHA DE TOTAL PARA A TABELA ===
    tableBody.push([
        { content: 'TOTAL', colSpan: 1, styles: { fontStyle: 'bold' } },
        { content: data.resumo.totalNota.toFixed(2), styles: { fontStyle: 'bold' } },
        { content: data.resumo.totalConferido.toFixed(2), styles: { fontStyle: 'bold' } },
        { content: data.resumo.totalDiferenca.toFixed(2), styles: { fontStyle: 'bold' } },
        { content: data.resumo.totalDiferenca === 0 ? 'OK' : (data.resumo.totalDiferenca < 0 ? 'FALTA' : 'SOBRA'), styles: { fontStyle: 'bold' } }
    ]);

    doc.autoTable({
        head: tableHead,
        body: tableBody,
        startY: startY,
        theme: 'striped',
        headStyles: { fillColor: [93, 63, 211], textColor: 255, fontStyle: 'bold' }, 
        didParseCell: function (hookData) {
            if (hookData.section === 'body') {
                const cellValue = hookData.cell.raw;
                if (hookData.column.dataKey === 3) { 
                    const numValue = parseFloat(cellValue);
                    if (numValue < 0) hookData.cell.styles.textColor = [211, 63, 63]; 
                    if (numValue > 0) hookData.cell.styles.textColor = [255, 152, 0]; 
                }
                if (hookData.column.dataKey === 4) { 
                    if (cellValue === 'Falta') hookData.cell.styles.textColor = [211, 63, 63];
                    if (cellValue === 'Sobra') hookData.cell.styles.textColor = [255, 152, 0];
                    if (cellValue === 'OK') hookData.cell.styles.textColor = [37, 211, 102]; 
                }
            }
        }
    });
    
    return doc;
}

/**
 * @description Gera o texto para um arquivo CSV.
 */
function generateConferenceCsv(data) {
    const separator = ';';
    const eol = '\r\n';

    let csv = `RELATORIO DE CONFERENCIA - QDELICIA FRUTAS${eol}`;
    csv += `Conferente${separator}${data.conferente}${eol}`;
    csv += `Rede/Loja${separator}${data.rede} / ${data.loja}${eol}`;
    csv += `Data Geracao${separator}${data.dataGeracao}${eol}`;
    csv += `${eol}`;

    csv += `Produto${separator}KG Nota${separator}KG Conferido${separator}Diferenca (KG)${separator}Status${eol}`;
    
    data.detalhes.forEach(item => {
        csv += `${item.produto}${separator}${item.notaKg.toFixed(2)}${separator}${item.conferidoKg.toFixed(2)}${separator}${item.diferenca.toFixed(2)}${separator}${item.status}${eol}`;
    });
    
    csv += `${eol}`;
    csv += `TOTAL${separator}${data.resumo.totalNota.toFixed(2)}${separator}${data.resumo.totalConferido.toFixed(2)}${separator}${data.resumo.totalDiferenca.toFixed(2)}${eol}`;
    
    return csv;
}
	
/**
 * @description Compartilha o relatório em PDF (via Web Share API).
 */
async function sharePdfReport() {
    const data = getConferenceReportData();
    if (data.detalhes.length === 0) {
        alert("Não há dados de conferência para compartilhar.");
        return;
    }

    const doc = generateConferencePdf(data);
    if (!doc) return; 

    if (!navigator.share || !navigator.canShare) {
        alert("A função de compartilhamento de arquivos não é suportada por este navegador. Tente usar o botão 'Baixar PDF'.");
        return;
    }

    const filename = `Conferencia_${data.rede.replace(/ /g, '_')}_${data.dataArquivo}.pdf`;
    const pdfBlob = doc.output('blob');
    const file = new File([pdfBlob], filename, { type: 'application/pdf' });
    
    const shareData = {
        files: [file],
        title: `Relatório Conferência - ${data.conferente}`,
        text: `Segue o relatório de conferência (PDF).`
    };

    if (navigator.canShare(shareData)) {
        try {
            await navigator.share(shareData);
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Erro ao compartilhar PDF:', error);
                alert(`Erro ao compartilhar: ${error.message}\n\Tente baixar o relatório e compartilhar manualmente.`);
            }
        }
    } else {
         alert("Este navegador não pode compartilhar este arquivo PDF. Tente baixar e compartilhar manualmente.");
    }
}

/**
 * @description Compartilha o relatório em CSV (via Web Share API).
 */
async function shareCsvReport() {
    const data = getConferenceReportData();
     if (data.detalhes.length === 0) {
        alert("Não há dados de conferência para compartilhar.");
        return;
    }

    if (!navigator.share || !navigator.canShare) {
        alert("A função de compartilhamento de arquivos não é suportada por este navegador.");
        return;
    }

    const csvText = generateConferenceCsv(data);
    const filename = `Conferencia_${data.rede.replace(/ /g, '_')}_${data.dataArquivo}.csv`;
    const csvBlob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const file = new File([csvBlob], filename, { type: 'text/csv' });
    
    const shareData = {
        files: [file],
        title: `Relatório Conferência - ${data.conferente}`,
        text: `Segue o relatório de conferência (CSV).`
    };

    if (navigator.canShare(shareData)) {
        try {
            await navigator.share(shareData);
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Erro ao compartilhar CSV:', error);
                alert(`Erro ao compartilhar: ${error.message}`);
            }
        }
    } else {
         alert("Este navegador não pode compartilhar este arquivo CSV.");
    }
}


/**
 * @description Inicia o download do relatório em formato PDF profissional.
 */
function downloadPdfReport() {
    const data = getConferenceReportData();
     if (data.detalhes.length === 0) {
        alert("Não há dados de conferência para gerar o relatório.");
        return;
    }

    const doc = generateConferencePdf(data);
    if (!doc) return; 

    const filename = `Conferencia_${data.rede.replace(/ /g, '_')}_${data.dataArquivo}.pdf`;
    doc.save(filename);
}

/**
 * @description Reinicia todo o estado da conferência e LIMPA o Local Storage.
 */
function resetConference() {
    notaQuantities = {};
    conferenceEntries = {};
    
    localStorage.removeItem(localStorageKeyConference); 
    localStorage.removeItem(localStorageKeyConferenceState); 
    
    document.querySelectorAll('#nota-input-section input, #user-info-section select').forEach(el => el.disabled = false);
    
    loadAndPopulateDropdowns(); 

    startConferenceBtn.style.display = 'block';
    startConferenceBtn.textContent = 'Preencha todos os campos';
    conferenceInputSection.style.display = 'none';
    conferenceSummarySection.style.display = 'none';
    
    if (conferenceSummaryTableBody) conferenceSummaryTableBody.innerHTML = '';
    
    populateNotaInputs(); 
    checkStartConferenceButton();
    updateSummaryDisplay(); 
}

// ==================== INICIALIZAÇÃO E LISTENERS ====================

// Listeners de seleção de usuário (salvam no localStorage)
if (selectConferente) selectConferente.addEventListener('change', saveSelection);
if (selectRede) selectRede.addEventListener('change', (e) => {
    populateLoja(e.target.value);
    saveSelection();
});
if (selectLoja) selectLoja.addEventListener('change', saveSelection);

// Listeners dos botões de ação principal
if (startConferenceBtn) startConferenceBtn.addEventListener('click', startConference);
if (addConferenceBtn) addConferenceBtn.addEventListener('click', addConferenceEntry);

// Listeners de habilitação do botão 'Adicionar'
if (inputKgConference) inputKgConference.addEventListener('input', () => {
    addConferenceBtn.disabled = !selectProductConference.value || parseFloat(inputKgConference.value) <= 0;
});
if (selectProductConference) selectProductConference.addEventListener('change', () => {
    addConferenceBtn.disabled = !selectProductConference.value || parseFloat(inputKgConference.value) <= 0;
});

// Botões de Relatório e Reset
if (downloadPdfBtn) downloadPdfBtn.addEventListener('click', downloadPdfReport);
if (sharePdfBtn) sharePdfBtn.addEventListener('click', sharePdfReport);
if (shareCsvBtn) shareCsvBtn.addEventListener('click', shareCsvReport);
if (resetConferenceBtn) resetConferenceBtn.addEventListener('click', resetConference);

// Inicia o processo
document.addEventListener('DOMContentLoaded', () => {
    // 1. Carrega/Preenche os dados do usuário/loja (seleção)
    loadAndPopulateDropdowns();
    
    // 2. Tenta carregar o estado da conferência 
    loadConferenceState();
    
    // 3. Injeta os campos de input da nota (populando com os dados carregados ou vazios)
    populateNotaInputs();
    
    // 4. Configura o menu hamburger 
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
