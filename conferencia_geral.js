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

// =================== CONFIGURAÇÃO DA LOGO EM BASE64 ===================
// Para garantir a mais alta qualidade no PDF, a logo deve ser convertida
// para Base64 (preferencialmente de uma imagem PNG de alta resolução - 300 DPI).
// SUBSTITUA A STRING VAZIA ABAIXO PELA SUA STRING BASE64 COMPLETA.
const LOGO_BASE64_IMAGE = ""; // <--- COLOQUE A STRING BASE64 AQUI
// =====================================================================

const localStorageKeyConference = 'qdelicia_logistica_conference'; 

// ==================== VARIÁVEIS DE ESTADO ====================
let conferenceData = {
    entregador: "",
    rede: "",
    loja: "",
    notaFiscal: "",
    produtos: {} // { produto: { kgNota: 0, kgConferido: 0 } }
};

// ==================== ELEMENTOS DA INTERFACE ====================
const selectEntregador = document.getElementById('select-entregador');
const selectRede = document.getElementById('select-rede');
const selectLoja = document.getElementById('select-loja');
const inputNotaFiscal = document.getElementById('input-nota-fiscal');
const notaInputsSection = document.getElementById('nota-inputs-section');

const selectProductConference = document.getElementById('select-product-conference');
const inputKgNota = document.getElementById('input-kg-nota');
const inputKgConference = document.getElementById('input-kg-conferido');
const addConferenceBtn = document.getElementById('add-conference-btn');
const conferenceSummaryTableBody = document.getElementById('conference-summary-body');

const downloadPdfBtn = document.getElementById('download-pdf-btn');
const sharePdfBtn = document.getElementById('share-pdf-btn');
const shareCsvBtn = document.getElementById('share-csv-btn');
const resetConferenceBtn = document.getElementById('reset-conference-btn');


// ==================== FUNÇÕES UTILITÁRIAS ====================

/**
 * @description Preenche um select box com dados de um array.
 */
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

/**
 * @description Carrega dados do localStorage (se houver) e preenche os dropdowns.
 */
function loadAndPopulateDropdowns() {
    // 1. Preenche Entregadores
    populateSelect(selectEntregador, APP_DATA.ENTREGADORES, "Selecione o Entregador");
    // 2. Preenche Redes
    populateSelect(selectRede, Object.keys(APP_DATA.REDES_LOJAS), "Selecione a Rede");
    // 3. Preenche Produtos
    populateSelect(selectProductConference, APP_DATA.PRODUTOS_CONFERENCIA, "Selecione o Produto");

    // 4. Carrega estado salvo
    const savedData = localStorage.getItem(localStorageKeyConference);
    if (savedData) {
        conferenceData = JSON.parse(savedData);
        // Restaura a interface de usuário (seção de inputs)
        if (selectEntregador) selectEntregador.value = conferenceData.entregador;
        if (selectRede) selectRede.value = conferenceData.rede;
        
        // Dispara o preenchimento da loja
        if (selectRede && selectLoja) {
            handleRedeChange(); 
            selectLoja.value = conferenceData.loja;
        }

        if (inputNotaFiscal) inputNotaFiscal.value = conferenceData.notaFiscal;
        
        // Garante que os campos de inputs estejam visíveis e atualizados
        updateNotaInputsVisibility();
        updateConferenceSummary();
    }
}

/**
 * @description Salva o estado atual da conferência no localStorage.
 */
function saveConferenceData() {
    // Atualiza os dados de estado antes de salvar
    conferenceData.entregador = selectEntregador.value;
    conferenceData.rede = selectRede.value;
    conferenceData.loja = selectLoja.value;
    conferenceData.notaFiscal = inputNotaFiscal.value;
    
    localStorage.setItem(localStorageKeyConference, JSON.stringify(conferenceData));
    
    // Atualiza estado dos botões de relatório
    const hasData = Object.keys(conferenceData.produtos).length > 0;
    if (downloadPdfBtn) downloadPdfBtn.disabled = !hasData;
    if (sharePdfBtn) sharePdfBtn.disabled = !hasData;
    if (shareCsvBtn) shareCsvBtn.disabled = !hasData;
}


// ==================== LÓGICA DE CONFERÊNCIA ====================

/**
 * @description Adiciona ou atualiza um item de conferência.
 */
function addOrUpdateConference() {
    const produto = selectProductConference.value;
    const kgNota = parseFloat(inputKgNota.value) || 0;
    const kgConferido = parseFloat(inputKgConference.value) || 0;

    if (!produto || kgNota <= 0 || kgConferido < 0) {
        alert("Por favor, preencha o produto, o KG da Nota (deve ser > 0) e o KG Conferido (deve ser >= 0) com valores válidos.");
        return;
    }

    conferenceData.produtos[produto] = {
        kgNota: kgNota,
        kgConferido: kgConferido,
    };

    // Limpa os inputs
    selectProductConference.value = "";
    inputKgNota.value = "";
    inputKgConference.value = "";
    addConferenceBtn.disabled = true;

    // Salva e atualiza o resumo
    saveConferenceData();
    updateConferenceSummary();
}

/**
 * @description Atualiza a tabela de resumo da conferência na interface.
 */
function updateConferenceSummary() {
    conferenceSummaryTableBody.innerHTML = '';
    const produtos = Object.keys(conferenceData.produtos).sort();
    
    let totalKgNota = 0;
    let totalKgConferido = 0;

    produtos.forEach(produto => {
        const item = conferenceData.produtos[produto];
        const diferenca = item.kgConferido - item.kgNota;
        const diferencaAbs = Math.abs(diferenca).toFixed(2);
        
        let status = 'OK';
        let statusClass = 'ok-value';

        if (diferenca > 5) { // Tolerância de 5kg para excesso
            status = `SOBRA ${diferencaAbs} KG`;
            statusClass = 'excess-value';
        } else if (diferenca < -5) { // Tolerância de 5kg para falta
            status = `FALTA ${diferencaAbs} KG`;
            statusClass = 'missing-value';
        }

        totalKgNota += item.kgNota;
        totalKgConferido += item.kgConferido;

        const row = conferenceSummaryTableBody.insertRow();
        row.insertCell().textContent = produto;
        row.insertCell().textContent = item.kgNota.toFixed(2);
        row.insertCell().textContent = item.kgConferido.toFixed(2);
        
        const diferencaCell = row.insertCell();
        diferencaCell.textContent = diferenca.toFixed(2);
        
        const statusCell = row.insertCell();
        statusCell.innerHTML = `<span class="${statusClass}">${status}</span>`;

        // Botão de Excluir
        const deleteCell = row.insertCell();
        const deleteBtn = document.createElement('button');
        deleteBtn.classList.add('delete-pallet-btn');
        deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
        deleteBtn.onclick = () => {
            delete conferenceData.produtos[produto];
            saveConferenceData();
            updateConferenceSummary();
        };
        deleteCell.appendChild(deleteBtn);
    });

    // Adiciona a linha de totais
    const totalRow = conferenceSummaryTableBody.insertRow();
    totalRow.style.fontWeight = 'bold';
    totalRow.insertCell().textContent = 'TOTAIS GERAIS';
    totalRow.insertCell().textContent = totalKgNota.toFixed(2);
    totalRow.insertCell().textContent = totalKgConferido.toFixed(2);
    
    const totalDiferenca = totalKgConferido - totalKgNota;
    const totalDiferencaCell = totalRow.insertCell();
    totalDiferencaCell.textContent = totalDiferenca.toFixed(2);
    
    const totalStatusCell = totalRow.insertCell();
    totalStatusCell.textContent = ''; // Status total não é necessário para o PDF
    
    totalRow.insertCell(); // Coluna do botão de excluir
    
    saveConferenceData(); // Salva novamente para atualizar o estado do botão de relatório
}

/**
 * @description Zera todos os dados e reinicia a conferência.
 */
function resetConference() {
    if (confirm("Tem certeza de que deseja zerar todos os dados da conferência e reiniciar?")) {
        conferenceData = {
            entregador: "",
            rede: "",
            loja: "",
            notaFiscal: "",
            produtos: {}
        };
        localStorage.removeItem(localStorageKeyConference);
        
        // Reset da interface
        if (selectEntregador) selectEntregador.value = "";
        if (selectRede) selectRede.value = "";
        if (selectLoja) selectLoja.innerHTML = `<option value="" disabled selected>Selecione a Loja</option>`;
        if (inputNotaFiscal) inputNotaFiscal.value = "";
        
        updateNotaInputsVisibility();
        updateConferenceSummary();
    }
}

// ==================== LÓGICA DE EXPORTAÇÃO (PDF, CSV, Share) ====================

/**
 * @description Coleta todos os dados do relatório em um objeto estruturado.
 * @returns {object} Um objeto contendo todos os dados para os relatórios.
 */
function getReportData() {
    const date = new Date();
    const produtos = Object.keys(conferenceData.produtos).sort();
    
    const detalhes = produtos.map(produto => {
        const item = conferenceData.produtos[produto];
        const diferenca = item.kgConferido - item.kgNota;
        const diferencaAbs = Math.abs(diferenca).toFixed(2);
        
        let status = 'OK';
        if (diferenca > 5) {
            status = `SOBRA ${diferencaAbs} KG`;
        } else if (diferenca < -5) {
            status = `FALTA ${diferencaAbs} KG`;
        }
        
        return {
            produto: produto,
            kgNota: item.kgNota,
            kgConferido: item.kgConferido,
            diferenca: diferenca,
            status: status
        };
    });

    const totalKgNota = detalhes.reduce((sum, item) => sum + item.kgNota, 0);
    const totalKgConferido = detalhes.reduce((sum, item) => sum + item.kgConferido, 0);
    const totalDiferenca = totalKgConferido - totalKgNota;
    
    return {
        entregador: conferenceData.entregador,
        rede: conferenceData.rede,
        loja: conferenceData.loja,
        notaFiscal: conferenceData.notaFiscal,
        dataGeracao: date.toLocaleString('pt-BR'),
        dataArquivo: date.toISOString().slice(0, 10).replace(/-/g, ''),
        
        detalhes: detalhes,
        
        resumo: {
            totalKgNota: totalKgNota,
            totalKgConferido: totalKgConferido,
            totalDiferenca: totalDiferenca
        }
    };
}


/**
 * @description Gera um objeto jsPDF profissional com AutoTable e Logomarca.
 * @param {object} data - O objeto de dados da conferência.
 * @returns {object} O objeto 'doc' do jsPDF.
 */
function generateProfessionalPdf(data) {
    
    // 1. Verifica se a biblioteca jsPDF principal está carregada
    if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
        alert("Erro: A biblioteca jsPDF não foi carregada.");
        return null;
    }

    // 2. Cria a instância do documento
    const doc = new window.jspdf.jsPDF(); 

    // 3. Verifica se o plugin autoTable foi carregado
    if (typeof doc.autoTable === 'undefined') {
        alert("Erro: O plugin jsPDF-AutoTable não foi carregado. Verifique a ordem dos scripts no HTML.");
        return null;
    }
    
    let startY = 20; 
    const margin = 14; 

    // === INSERÇÃO DA LOGOMARCA (Base64 de alta qualidade) ===
    const logoWidth = 30; 
    const logoHeight = 8; 

    if (LOGO_BASE64_IMAGE) {
        try {
            // Tenta determinar o tipo da imagem
            const base64Type = LOGO_BASE64_IMAGE.includes('image/jpeg') ? 'JPEG' : 'PNG';
            doc.addImage(LOGO_BASE64_IMAGE, base64Type, margin, 14, logoWidth, logoHeight); 
        } catch (e) {
            console.warn("Não foi possível carregar a logomarca Base64 no PDF. Verifique se a string está correta.", e);
        }
    } else {
         console.warn("LOGO_BASE64_IMAGE não fornecida. O PDF será gerado sem a logomarca no cabeçalho.");
    }
    // === FIM DA INSERÇÃO DA LOGOMARCA ===
    
    // Ajusta o Y inicial para acomodar a logo
    startY = 32; 

    // === CABEÇALHO GERAL ===
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text("RELATÓRIO DE CONFERÊNCIA DE LOJA", doc.internal.pageSize.getWidth() / 2, startY, { align: 'center' });
    startY += 8;
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text(`QDELICIA FRUTAS - Conferência Logística`, doc.internal.pageSize.getWidth() / 2, startY, { align: 'center' });
    startY += 12;

    doc.setFontSize(10);
    doc.text(`Entregador: ${data.entregador}`, margin, startY);
    doc.text(`Rede/Loja: ${data.rede} / ${data.loja}`, doc.internal.pageSize.getWidth() / 2, startY);
    doc.text(`Nota Fiscal: ${data.notaFiscal}`, doc.internal.pageSize.getWidth() - margin, startY, { align: 'right' });
    startY += 5;
    doc.text(`Gerado em: ${data.dataGeracao}`, margin, startY);
    startY += 10;
    
    // === SEÇÃO 1: TABELA DE DETALHES (autoTable) ===
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text("1. DETALHES DA CONFERÊNCIA POR PRODUTO", margin, startY);
    startY += 7;

    const tableHead = [['Produto', 'KG Nota', 'KG Conferido', 'Diferença (KG)', 'Status']];
    const tableBody = data.detalhes.map(item => {
        let statusColor = [0, 0, 0]; // Preto padrão
        if (item.status.includes('SOBRA')) {
            statusColor = [255, 152, 0]; // Laranja
        } else if (item.status.includes('FALTA')) {
            statusColor = [244, 67, 54]; // Vermelho
        } else if (item.status.includes('OK')) {
            statusColor = [37, 211, 102]; // Verde
        }

        return [
            item.produto,
            item.kgNota.toFixed(2),
            item.kgConferido.toFixed(2),
            { content: item.diferenca.toFixed(2), styles: { fontStyle: item.diferenca !== 0 ? 'bold' : 'normal' } },
            { content: item.status, styles: { textColor: statusColor, fontStyle: 'bold' } }
        ];
    });
    
    // Linha de Total na Tabela
    tableBody.push([
        { content: 'TOTAIS GERAIS', colSpan: 1, styles: { fontStyle: 'bold' } },
        { content: data.resumo.totalKgNota.toFixed(2), styles: { fontStyle: 'bold' } },
        { content: data.resumo.totalKgConferido.toFixed(2), styles: { fontStyle: 'bold' } },
        { content: data.resumo.totalDiferenca.toFixed(2), styles: { fontStyle: 'bold' } },
        { content: '', styles: { fontStyle: 'bold' } }
    ]);

    doc.autoTable({
        head: tableHead,
        body: tableBody,
        startY: startY,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
             0: { cellWidth: 30 }, // Produto
             1: { cellWidth: 20, halign: 'right' }, // KG Nota
             2: { cellWidth: 30, halign: 'right' }, // KG Conferido
             3: { cellWidth: 30, halign: 'right' }, // Diferença
             4: { cellWidth: 50 } // Status
        },
        didDrawPage: (hookData) => {
            startY = hookData.cursor.y; // Atualiza a posição Y após a tabela
        }
    });

    startY += 10; 

    // === SEÇÃO 2: RESUMO FINAL ===
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text("2. RESUMO DA ENTREGA", margin, startY);
    startY += 7;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Diferença Total: ${data.resumo.totalDiferenca.toFixed(2)} KG`, margin + 2, startY);
    
    return doc;
}


/**
 * @description Gera o texto para um arquivo CSV.
 * @param {object} data - O objeto de dados da conferência.
 * @returns {string} O texto formatado em CSV.
 */
function generateCsvText(data) {
    const separator = ';';
    const eol = '\r\n';

    let csv = `RELATORIO DE CONFERENCIA DE LOJA${eol}`;
    csv += `Entregador${separator}${data.entregador}${eol}`;
    csv += `Rede${separator}${data.rede}${eol}`;
    csv += `Loja${separator}${data.loja}${eol}`;
    csv += `Nota Fiscal${separator}${data.notaFiscal}${eol}`;
    csv += `Data Geracao${separator}${data.dataGeracao}${eol}`;
    csv += `${eol}`; 

    // Resumo
    csv += `RESUMO GERAL${separator}Valor${eol}`;
    csv += `Total KG (Nota)${separator}${data.resumo.totalKgNota.toFixed(2)}${eol}`;
    csv += `Total KG (Conferido)${separator}${data.resumo.totalKgConferido.toFixed(2)}${eol}`;
    csv += `Diferenca Total (KG)${separator}${data.resumo.totalDiferenca.toFixed(2)}${eol}`;
    csv += `${eol}`; 

    // Detalhes (Tabela)
    csv += `DETALHES DA CONFERENCIA${eol}`;
    csv += `Produto${separator}KG Nota${separator}KG Conferido${separator}Diferenca (KG)${separator}Status${eol}`;
    
    data.detalhes.forEach(item => {
        csv += `${item.produto}${separator}${item.kgNota.toFixed(2)}${separator}${item.kgConferido.toFixed(2)}${separator}${item.diferenca.toFixed(2)}${separator}${item.status}${eol}`;
    });
    
    return csv;
}
	
/**
 * @description Compartilha o relatório em PDF (via Web Share API).
 */
async function sharePdfReport() {
    if (Object.keys(conferenceData.produtos).length === 0) {
        alert("Não há produtos conferidos para compartilhar.");
        return;
    }

    const data = getReportData();
    const doc = generateProfessionalPdf(data);
    if (!doc) return; 

    if (!navigator.share || !navigator.canShare) {
        alert("A função de compartilhamento de arquivos não é suportada por este navegador. Tente usar o botão 'Baixar PDF'.");
        return;
    }

    const filename = `Relatorio_Conferencia_${data.loja}_${data.dataArquivo}.pdf`;
    
    const pdfBlob = doc.output('blob');
    const file = new File([pdfBlob], filename, { type: 'application/pdf' });
    
    const shareData = {
        files: [file],
        title: `Relatório Conferência ${data.rede} - ${data.loja}`,
        text: `Segue o relatório de conferência (PDF) da nota ${data.notaFiscal}.`
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
    if (Object.keys(conferenceData.produtos).length === 0) {
        alert("Não há produtos conferidos para compartilhar.");
        return;
    }

    if (!navigator.share || !navigator.canShare) {
        alert("A função de compartilhamento de arquivos não é suportada por este navegador.");
        return;
    }

    const data = getReportData();
    const csvText = generateCsvText(data);
    const filename = `Relatorio_Conferencia_${data.loja}_${data.dataArquivo}.csv`;

    const csvBlob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    
    const file = new File([csvBlob], filename, { type: 'text/csv' });
    
    const shareData = {
        files: [file],
        title: `Relatório Conferência ${data.rede} - ${data.loja}`,
        text: `Segue o relatório de conferência (CSV) da nota ${data.notaFiscal}.`
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
    if (Object.keys(conferenceData.produtos).length === 0) {
        alert("Não há produtos conferidos para gerar o relatório.");
        return;
    }

    const data = getReportData();
    const doc = generateProfessionalPdf(data);
    if (!doc) return; 

    const filename = `Relatorio_Conferencia_${data.loja}_${data.dataArquivo}.pdf`;
    
    doc.save(filename);
}


// ==================== LÓGICA DE EVENTOS E VISIBILIDADE ====================

/**
 * @description Preenche o dropdown de lojas com base na rede selecionada.
 */
function handleRedeChange() {
    const redeSelecionada = selectRede.value;
    const lojas = APP_DATA.REDES_LOJAS[redeSelecionada] || [];
    populateSelect(selectLoja, lojas, "Selecione a Loja");
    
    // Limpa o valor da loja no estado
    conferenceData.loja = "";
    if (selectLoja) selectLoja.value = ""; 
    
    saveConferenceData();
    updateNotaInputsVisibility();
}

/**
 * @description Controla a visibilidade da seção de inputs da nota.
 */
function updateNotaInputsVisibility() {
    const isReady = selectEntregador.value && selectRede.value && selectLoja.value;
    if (notaInputsSection) {
        notaInputsSection.style.display = isReady ? 'block' : 'none';
    }
    // Salva o estado atual
    saveConferenceData();
}

// ==================== LISTENERS ====================

// Funções de preenchimento e visibilidade
if (selectRede) selectRede.addEventListener('change', handleRedeChange);
if (selectLoja) selectLoja.addEventListener('change', updateNotaInputsVisibility);
if (selectEntregador) selectEntregador.addEventListener('change', updateNotaInputsVisibility);

// Listeners de input da nota (atualiza o estado em tempo real)
if (inputNotaFiscal) inputNotaFiscal.addEventListener('input', saveConferenceData);

// Listeners do form de adição de conferência
if (addConferenceBtn) addConferenceBtn.addEventListener('click', addOrUpdateConference);

// Habilita/Desabilita o botão de adicionar
if (inputKgNota) inputKgNota.addEventListener('input', () => {
    addConferenceBtn.disabled = !selectProductConference.value || parseFloat(inputKgNota.value) <= 0 || parseFloat(inputKgConference.value) < 0;
});
if (inputKgConference) inputKgConference.addEventListener('input', () => {
    addConferenceBtn.disabled = !selectProductConference.value || parseFloat(inputKgNota.value) <= 0 || parseFloat(inputKgConference.value) < 0;
});
if (selectProductConference) selectProductConference.addEventListener('change', () => {
    addConferenceBtn.disabled = !selectProductConference.value || parseFloat(inputKgNota.value) <= 0 || parseFloat(inputKgConference.value) < 0;
});


// ================== EVENT LISTENERS DE RELATÓRIO ==================
if (downloadPdfBtn) downloadPdfBtn.addEventListener('click', downloadPdfReport);
if (sharePdfBtn) sharePdfBtn.addEventListener('click', sharePdfReport);
if (shareCsvBtn) shareCsvBtn.addEventListener('click', shareCsvReport);
if (resetConferenceBtn) resetConferenceBtn.addEventListener('click', resetConference);
// ======================================================================


// Inicia o processo
document.addEventListener('DOMContentLoaded', () => {
    // Carrega/Preenche os dados do usuário/loja
    loadAndPopulateDropdowns();
    
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
