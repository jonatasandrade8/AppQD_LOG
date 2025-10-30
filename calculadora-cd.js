/* ========================================================================
 * ARQUIVO: calculadora-cd.js
 * DESCRIÇÃO: Lógica exclusiva para a página calculadora-cd.html.
 *
 * IMPORTANTE: Esta versão modificada requer:
 * 1. jsPDF (https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js)
 * 2. jsPDF-AutoTable (https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js)
 * ========================================================================
 */

// ==================== ESTRUTURA DE DADOS (CALCULADORA) ====================
const APP_DATA = {
    // Entregadores (lista independente)
    ENTREGADORES: [
        "José Luiz",
        "Paulino",
        "Antonio Ananias",
        "Emanuel",
        "Cleiton"
    ]
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

// ==================== FUNÇÕES UTILITÁRIAS ====================

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


// ==================== FUNCIONALIDADES DA CALCULADORA CD (Nordestão) ====================

// Constantes de Estimativa (Baseado em uma média de palete/carga)
const KG_POR_PALETE_ESTIMADO = 375; // KG (15kg/caixa * 25 caixas)
const KG_POR_CAIXA_ESTIMADO = 15; // KG
const CAIXAS_POR_PALETE_ESTIMADO = KG_POR_PALETE_ESTIMADO / KG_POR_CAIXA_ESTIMADO; // 25
const CAIXAS_FIXAS_POR_PALETE = 25; // Constante conforme regra de negócio

// Estado da Calculadora
let totalKgNota = 0;
let dischargedList = [];

// Elementos da Interface
const selectEntregador = document.getElementById('select-entregador'); // Essencial para a calculadora
const inputTotalKg = document.getElementById('input-total-kg');
const calculateTargetsBtn = document.getElementById('calculate-targets-btn');
const targetSummarySection = document.getElementById('target-summary-section');
const dischargeInputSection = document.getElementById('discharge-input-section');
const dischargeSummarySection = document.getElementById('discharge-summary-section');
const remainingSummarySection = document.getElementById('remaining-summary-section');
const dischargeListTable = document.getElementById('discharge-list');
const inputDischargeKg = document.getElementById('input-discharge-kg');
const inputDischargeCaixas = document.getElementById('input-discharge-caixas');
const addDischargeBtn = document.getElementById('add-discharge-btn');

// ================== NOVOS SELETORES DE BOTÃO ==================
const downloadPdfBtn = document.getElementById('download-pdf-btn');
const sharePdfBtn = document.getElementById('share-pdf-btn');
const shareCsvBtn = document.getElementById('share-csv-btn');
// ==============================================================


// -----------------------------------------------------
// 1. Lógica de Cálculo
// -----------------------------------------------------

/**
 * @description Calcula as metas iniciais e exibe as seções de controle.
 * @param {string | number} totalKg - O volume total da nota fiscal em KG.
 */
let calculateTargets = (totalKg) => {
    totalKgNota = parseFloat(totalKg) || 0;
    
    const totalPaletesEstimados = Math.ceil(totalKgNota / KG_POR_PALETE_ESTIMADO);
    const totalCaixasEstimadas = totalKgNota / KG_POR_CAIXA_ESTIMADO;

    document.getElementById('target-kg-per-pallet').textContent = KG_POR_PALETE_ESTIMADO.toFixed(2);
    document.getElementById('target-total-caixas').textContent = Math.round(totalCaixasEstimadas);
    document.getElementById('target-total-paletes').textContent = totalPaletesEstimados;

	    // Limpa e exibe as seções
	    dischargedList = [];
	    updateDischargeSummary(); 
	    
	    if (targetSummarySection) targetSummarySection.style.display = 'block';
	    
	    // Inicializa o campo de caixas com o valor padrão de 25
	    if (inputDischargeCaixas) {
	        inputDischargeCaixas.disabled = true;
	        inputDischargeCaixas.value = CAIXAS_FIXAS_POR_PALETE;
	        inputDischargeCaixas.placeholder = CAIXAS_FIXAS_POR_PALETE;
	    }
    if (dischargeInputSection) dischargeInputSection.style.display = 'block';
    if (dischargeSummarySection) dischargeSummarySection.style.display = 'block';
    if (remainingSummarySection) remainingSummarySection.style.display = 'block';
    
    // Habilita/Desabilita inputs
    if (inputTotalKg) inputTotalKg.disabled = true;
    if (calculateTargetsBtn) calculateTargetsBtn.style.display = 'none'; // Esconde o botão após o cálculo
    if (document.getElementById('reset-calculator-btn')) document.getElementById('reset-calculator-btn').style.display = 'block'; // Mostra o botão de reset
    
    // Foca no primeiro input de descarregamento
    if (inputDischargeKg) inputDischargeKg.focus();
}

/**
 * @description Atualiza os totais descarregados e o restante.
 */
function updateDischargeSummary() {
    const totalDischargedKg = dischargedList.reduce((sum, item) => sum + item.kg, 0);
	    const totalDischargedCaixas = dischargedList.reduce((sum, item) => sum + item.caixas, 0);
	    
	    // Verifica se o próximo palete é o último (ou o palete que contém o restante)
	    const totalCaixasEstimadas = totalKgNota / KG_POR_CAIXA_ESTIMADO;
	    const caixasRestantes = totalCaixasEstimadas - totalDischargedCaixas;
	    const isLastPallet = caixasRestantes <= CAIXAS_FIXAS_POR_PALETE;

	    if (inputDischargeCaixas) {
	        if (isLastPallet) {
	            // Último palete: libera o campo e sugere o restante
	            inputDischargeCaixas.disabled = false;
	            inputDischargeCaixas.placeholder = `Máx: ${Math.ceil(caixasRestantes)}`;
	            // Remove o valor automático para o usuário preencher
	            if (inputDischargeCaixas.value === CAIXAS_FIXAS_POR_PALETE.toString()) {
	                inputDischargeCaixas.value = '';
	            }
	        } else {
	            // Palete normal: bloqueia e preenche com 25
	            inputDischargeCaixas.disabled = true;
	            inputDischargeCaixas.value = CAIXAS_FIXAS_POR_PALETE;
	            inputDischargeCaixas.placeholder = CAIXAS_FIXAS_POR_PALETE;
	        }
	    }

    if (document.getElementById('total-discharged-kg')) document.getElementById('total-discharged-kg').textContent = totalDischargedKg.toFixed(2);
    if (document.getElementById('total-discharged-caixas')) document.getElementById('total-discharged-caixas').textContent = totalDischargedCaixas;
    
    // Lógica do Restante
	    const remainingKg = totalKgNota - totalDischargedKg;
	    // Caixas Restantes agora depende dos KG Restantes
	    const remainingCaixas = remainingKg / KG_POR_CAIXA_ESTIMADO; 
	    const remainingPaletes = Math.ceil(remainingKg / KG_POR_PALETE_ESTIMADO);

    if (document.getElementById('remaining-kg')) document.getElementById('remaining-kg').textContent = remainingKg.toFixed(2);
    if (document.getElementById('remaining-caixas')) document.getElementById('remaining-caixas').textContent = Math.round(remainingCaixas);
	    if (document.getElementById('remaining-paletes')) document.getElementById('remaining-paletes').textContent = remainingPaletes;
	    
	    // Lógica de Status (Etiquetas Verde/Amarela)
	    const statusMessage = document.getElementById('status-message');
	    const tolerance = 5; // Tolerância de 5kg para considerar "atingido"
	    
	    statusMessage.style.display = 'none';
	    statusMessage.classList.remove('green', 'yellow');
	    statusMessage.textContent = '';

	    if (remainingKg <= tolerance && remainingKg >= 0) {
	        // Status Verde: Peso atingido (dentro da tolerância)
	        statusMessage.style.display = 'block';
	        statusMessage.classList.add('green');
	        statusMessage.innerHTML = `✅ **PESO ATINGIDO!**`;
	    } else if (remainingKg < 0) {
	        // Status Amarelo: Peso ultrapassado
	        const excessKg = Math.abs(remainingKg);
	        statusMessage.style.display = 'block';
	        statusMessage.classList.add('yellow');
	        statusMessage.innerHTML = `⚠️ **PESO EXCEDIDO!** Retirar **${excessKg.toFixed(2)} KG** para atingir o volume da nota.`;
	    }

	    // Atualiza a tabela
	    if (dischargeListTable) {
	        dischargeListTable.innerHTML = '';
	        dischargedList.forEach((item, index) => {
	            const pesoMedioCaixa = item.kg / item.caixas;
	            
	            const row = dischargeListTable.insertRow();
	            const actionCell = row.insertCell();
	            const deleteBtn = document.createElement('button');
	            deleteBtn.classList.add('delete-pallet-btn');
	            deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
	            deleteBtn.onclick = () => {
	                // Remove o item da lista e atualiza a tabela
	                dischargedList.splice(index, 1);
	                updateDischargeSummary();
	            };
	            actionCell.appendChild(deleteBtn);
	            row.insertCell().textContent = `#${index + 1}`;
	            row.insertCell().textContent = item.kg.toFixed(2);
	            row.insertCell().textContent = item.caixas;
	            row.insertCell().textContent = pesoMedioCaixa.toFixed(2);
	        });
	    }
    
    // ================== ATUALIZA ESTADO DOS 3 BOTÕES ==================
    const hasData = dischargedList.length > 0;
    if (downloadPdfBtn) {
        downloadPdfBtn.disabled = !hasData;
    }
    if (sharePdfBtn) {
        sharePdfBtn.disabled = !hasData;
    }
    if (shareCsvBtn) {
        shareCsvBtn.disabled = !hasData;
    }
    // ==================================================================
}

/**
 * @description Adiciona um novo item de descarregamento à lista.
 */
function addDischargeEntry() {
    const kg = parseFloat(inputDischargeKg.value);
	    let caixas = parseInt(inputDischargeCaixas.value);
	    
	    // Se o campo estiver desabilitado, assume o valor fixo de 25
	    if (inputDischargeCaixas.disabled) {
	        caixas = CAIXAS_FIXAS_POR_PALETE;
	    } else {
	        // Se for o último palete, valida se o valor inserido é razoável
	        const totalCaixasEstimadas = totalKgNota / KG_POR_CAIXA_ESTIMADO;
	        const caixasRestantes = totalCaixasEstimadas - dischargedList.reduce((sum, item) => sum + item.caixas, 0);
	        
	        if (caixas > Math.ceil(caixasRestantes) + 5) { // Permite uma pequena margem de erro
	            alert(`O número de caixas inserido (${caixas}) parece exceder o restante estimado (${Math.ceil(caixasRestantes)}). Por favor, verifique.`);
	            if (inputDischargeCaixas) inputDischargeCaixas.focus();
	            return;
	        }
	    }

    if (isNaN(kg) || kg <= 0) {
        alert("Por favor, insira um valor válido para KG Conferidos.");
        if (inputDischargeKg) inputDischargeKg.focus();
        return;
    }
	    if (isNaN(caixas) || caixas <= 0) {
	        alert("O valor de caixas não é válido. Verifique se o campo está preenchido corretamente para o último palete.");
	        if (inputDischargeCaixas && !inputDischargeCaixas.disabled) inputDischargeCaixas.focus();
	        return;
	    }

    dischargedList.push({ kg: kg, caixas: caixas });
    
	    // Limpa os inputs
	    if (inputDischargeKg) inputDischargeKg.value = '';
	    // O inputDischargeCaixas será atualizado pela função updateDischargeSummary
	    if (inputDischargeKg) inputDischargeKg.focus();

    updateDischargeSummary();
}


// -----------------------------------------------------------------
// 2. Lógica de Exportação (PDF Profissional, CSV e Compartilhamento)
// -----------------------------------------------------------------

/**
 * @description Coleta todos os dados do relatório em um objeto estruturado.
 * @returns {object} Um objeto contendo todos os dados para os relatórios.
 */
function getReportData() {
    const totalDischargedKg = dischargedList.reduce((sum, item) => sum + item.kg, 0);
    const totalDischargedCaixas = dischargedList.reduce((sum, item) => sum + item.caixas, 0);
    const totalPaletesEstimados = Math.ceil(totalKgNota / KG_POR_PALETE_ESTIMADO);
    const totalCaixasEstimadas = totalKgNota / KG_POR_CAIXA_ESTIMADO;

    const remainingKg = totalKgNota - totalDischargedKg;
    const remainingCaixas = remainingKg / KG_POR_CAIXA_ESTIMADO; 
    const remainingPaletes = Math.ceil(remainingKg / KG_POR_PALETE_ESTIMADO);
    
    const date = new Date();
    const tolerance = 5;
    let status = "Em andamento...";

    if (remainingKg <= tolerance && remainingKg >= 0) {
        status = `PESO ATINGIDO! ENTREGA REALIZADA!`;
    } else if (remainingKg < 0) {
        const excessKg = Math.abs(remainingKg);
        status = `PESO EXCEDIDO! Retirar ${excessKg.toFixed(2)} KG.`;
    }

    // Dados da tabela de detalhes
    const detalhes = dischargedList.map((item, index) => ({
        palete: `#${index + 1}`,
        kg: item.kg,
        caixas: item.caixas,
        pesoMedio: item.kg / item.caixas
    }));

    return {
        entregador: selectEntregador ? selectEntregador.value : 'N/A',
        dataGeracao: date.toLocaleString('pt-BR'),
        dataArquivo: date.toISOString().slice(0, 10).replace(/-/g, ''),
        
        nota: {
            totalKgNota: totalKgNota
        },
        
        estimativas: {
            baseCalculo: KG_POR_PALETE_ESTIMADO,
            totalCaixasEstimadas: Math.round(totalCaixasEstimadas),
            totalPaletesEstimados: totalPaletesEstimados
        },

        detalhes: detalhes, // Array de objetos para a tabela

        resumo: {
            totalDischargedKg: totalDischargedKg,
            totalDischargedCaixas: totalDischargedCaixas
        },
        
        restante: {
            status: status,
            remainingKg: remainingKg,
            remainingCaixas: Math.round(remainingCaixas),
            remainingPaletes: remainingPaletes
        }
    };
}

/**
 * @description (NOVO) Gera um objeto jsPDF profissional com AutoTable.
 * @param {object} data - O objeto de dados da função getReportData()
 * @returns {object} O objeto 'doc' do jsPDF.
 */
function generateProfessionalPdf(data) {
    
    // ============================ LINHA CORRIGIDA ============================
    // A verificação antiga ( typeof jsPDF === 'undefined' || ... ) estava incorreta
    // porque 'jsPDF' global não existe na versão UMD carregada pelo HTML.
    // A verificação correta é pelo objeto 'window.jspdf' que contém a classe 'jsPDF'.
    if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
        alert("Erro: A biblioteca jsPDF não foi carregada.");
        return null;
    }
    // =========================================================================

    if (typeof window.jspdf.plugin.autotable === 'undefined') {
         alert("Erro: A biblioteca jsPDF-AutoTable não foi carregada.");
        return null;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let startY = 20; // Posição vertical inicial

    // === CABEÇALHO ===
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text("RELATÓRIO DE DESCARREGAMENTO", doc.internal.pageSize.getWidth() / 2, startY, { align: 'center' });
    startY += 8;
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text(`CD NORDESTAO - QDELICIA FRUTAS`, doc.internal.pageSize.getWidth() / 2, startY, { align: 'center' });
    startY += 12;

    doc.setFontSize(10);
    doc.text(`Entregador: ${data.entregador}`, 14, startY);
    doc.text(`Gerado em: ${data.dataGeracao}`, doc.internal.pageSize.getWidth() - 14, startY, { align: 'right' });
    startY += 10;

    // === SEÇÃO 1: DADOS DA NOTA ===
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text("1. DADOS DA NOTA FISCAL", 14, startY);
    startY += 7;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Volume Total da Nota: ${data.nota.totalKgNota.toFixed(2)} KG`, 16, startY);
    startY += 10;

    // === SEÇÃO 2: ESTIMATIVAS ===
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text("2. DADOS DA ENTREGA (ESTIMATIVAS)", 14, startY);
    startY += 7;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Base de Cálculo: ${data.estimativas.baseCalculo.toFixed(2)} KG por palete`, 16, startY);
    startY += 5;
    doc.text(`Total de Caixas (Estimado): ${data.estimativas.totalCaixasEstimadas} caixas`, 16, startY);
    startY += 5;
    doc.text(`Total de Paletes (Estimado): ${data.estimativas.totalPaletesEstimados} paletes`, 16, startY);
    startY += 12;

    // === SEÇÃO 3: TABELA DE DETALHES ===
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text("3. DETALHES DA ENTREGA", 14, startY);
    startY += 7;

    const tableHead = [['Palete', 'KG Conferido', 'Caixas Conferidas', 'Média/Cx (KG)']];
    const tableBody = data.detalhes.map(item => [
        item.palete,
        item.kg.toFixed(2),
        item.caixas,
        item.pesoMedio.toFixed(2)
    ]);
    
    // Adiciona o total na tabela
    tableBody.push([
        { content: 'TOTAL', colSpan: 1, styles: { fontStyle: 'bold' } },
        { content: data.resumo.totalDischargedKg.toFixed(2), styles: { fontStyle: 'bold' } },
        { content: data.resumo.totalDischargedCaixas, styles: { fontStyle: 'bold' } },
        { content: (data.resumo.totalDischargedKg / data.resumo.totalDischargedCaixas || 0).toFixed(2), styles: { fontStyle: 'bold' } }
    ]);

    doc.autoTable({
        head: tableHead,
        body: tableBody,
        startY: startY,
        theme: 'striped', // 'striped', 'grid', 'plain'
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
        didDrawPage: (hookData) => {
            // Atualiza a posição Y para continuar o texto após a tabela
            startY = hookData.cursor.y;
        }
    });

    startY += 10; // Espaçamento após a tabela

    // === SEÇÃO 4: FALTA PARA CONCLUIR ===
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text("4. FALTA PARA CONCLUIR (RESTANTE)", 14, startY);
    startY += 7;

    // Define a cor do status
    if (data.restante.status.includes('ATINGIDO')) {
        doc.setTextColor(0, 128, 0); // Verde
    } else if (data.restante.status.includes('EXCEDIDO')) {
        doc.setTextColor(255, 165, 0); // Laranja/Amarelo
    }
    doc.text(`STATUS: ${data.restante.status}`, 16, startY);
    doc.setTextColor(0, 0, 0); // Reseta a cor para preto
    startY += 7;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`KG Restantes: ${data.restante.remainingKg.toFixed(2)} KG`, 16, startY);
    startY += 5;
    doc.text(`Caixas Restantes (Estimado): ${data.restante.remainingCaixas} caixas`, 16, startY);
    startY += 5;
    doc.text(`Paletes Restantes (Estimado): ${data.restante.remainingPaletes} paletes`, 16, startY);
    
    return doc;
}

/**
 * @description (NOVO) Gera o texto para um arquivo CSV.
 * @param {object} data - O objeto de dados da função getReportData()
 * @returns {string} O texto formatado em CSV.
 */
function generateCsvText(data) {
    // Usa ponto e vírgula (;) como separador, comum no Brasil para abrir no Excel
    const separator = ';';
    const eol = '\r\n'; // End of Line

    let csv = `RELATORIO DE DESCARREGAMENTO - CD NORDESTAO${eol}`;
    csv += `Entregador${separator}${data.entregador}${eol}`;
    csv += `Data Geracao${separator}${data.dataGeracao}${eol}`;
    csv += `${eol}`; // Linha em branco

    // Resumo
    csv += `RESUMO${separator}Valor${eol}`;
    csv += `Total KG (Nota)${separator}${data.nota.totalKgNota.toFixed(2)}${eol}`;
    csv += `Total KG (Descarregado)${separator}${data.resumo.totalDischargedKg.toFixed(2)}${eol}`;
    csv += `Total Caixas (Descarregado)${separator}${data.resumo.totalDischargedCaixas}${eol}`;
    csv += `KG Restantes${separator}${data.restante.remainingKg.toFixed(2)}${eol}`;
    csv += `Status${separator}${data.restante.status}${eol}`;
    csv += `${eol}`; // Linha em branco

    // Detalhes (Tabela)
    csv += `DETALHES DA ENTREGA${eol}`;
    csv += `Palete${separator}KG Conferido${separator}Caixas Conferidas${separator}Media/Cx (KG)${eol}`;
    
    data.detalhes.forEach(item => {
        csv += `${item.palete}${separator}${item.kg.toFixed(2)}${separator}${item.caixas}${separator}${item.pesoMedio.toFixed(2)}${eol}`;
    });
    
    return csv;
}
	
/**
 * @description (MODIFICADO) Compartilha o relatório em PDF (via Web Share API).
 */
async function sharePdfReport() {
    if (dischargedList.length === 0) {
        alert("Não há registros de descarregamento para compartilhar.");
        return;
    }

    const data = getReportData();
    const doc = generateProfessionalPdf(data);
    if (!doc) return; // Erro já foi alertado em generateProfessionalPdf

    if (!navigator.share || !navigator.canShare) {
        alert("A função de compartilhamento de arquivos não é suportada por este navegador. Tente usar o botão 'Baixar PDF'.");
        return;
    }

    const filename = `Relatorio_CD_Nordestao_${data.dataArquivo}.pdf`;
    
    // Gera o PDF como um Blob
    const pdfBlob = doc.output('blob');
    
    const file = new File([pdfBlob], filename, { type: 'application/pdf' });
    
    const shareData = {
        files: [file],
        title: `Relatório CD Nordestão - ${data.entregador}`,
        text: `Segue o relatório de descarregamento (PDF).`
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
 * @description (NOVO) Compartilha o relatório em CSV (via Web Share API).
 */
async function shareCsvReport() {
    if (dischargedList.length === 0) {
        alert("Não há registros de descarregamento para compartilhar.");
        return;
    }

    if (!navigator.share || !navigator.canShare) {
        alert("A função de compartilhamento de arquivos não é suportada por este navegador.");
        return;
    }

    const data = getReportData();
    const csvText = generateCsvText(data);
    const filename = `Relatorio_CD_Nordestao_${data.dataArquivo}.csv`;

    // Gera o CSV como um Blob
    const csvBlob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    
    const file = new File([csvBlob], filename, { type: 'text/csv' });
    
    const shareData = {
        files: [file],
        title: `Relatório CD Nordestão - ${data.entregador}`,
        text: `Segue o relatório de descarregamento (CSV).`
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
 * @description (MODIFICADO) Inicia o download do relatório em formato PDF profissional.
 */
function downloadPdfReport() {
    if (dischargedList.length === 0) {
        alert("Não há registros de descarregamento para gerar o relatório.");
        return;
    }

    const data = getReportData();
    const doc = generateProfessionalPdf(data);
    if (!doc) return; // Erro já foi alertado em generateProfessionalPdf

    const filename = `Relatorio_CD_Nordestao_${data.dataArquivo}.pdf`;
    
    // Salva o arquivo
    doc.save(filename);
}


// -----------------------------------------------------
// 3. EVENT LISTENERS e Inicialização da Calculadora
// -----------------------------------------------------

const targetInputSection = document.getElementById('target-input-section');

// Inicializa os dropdowns e validações da Calculadora
document.addEventListener('DOMContentLoaded', () => {
    // Verifica se a página é a calculadora-cd.html (baseado no input-total-kg)
    if (document.getElementById('input-total-kg')) {
        
        // 1. Apenas preenche o entregador na calculadora
        if (selectEntregador) {
            populateSelect(selectEntregador, APP_DATA.ENTREGADORES, "Selecione o Entregador");
        }
        
        // 2. Adiciona um listener para habilitar o botão de cálculo
        if (selectEntregador && inputTotalKg && calculateTargetsBtn) {
            const checkInputs = () => {
                const kg = parseFloat(inputTotalKg.value);
                const entregadorSelecionado = selectEntregador.value;
                calculateTargetsBtn.disabled = isNaN(kg) || kg <= 0 || !entregadorSelecionado;
            };
            selectEntregador.addEventListener('change', checkInputs);
            inputTotalKg.addEventListener('input', checkInputs);
            checkInputs(); // Checagem inicial
        }
    }
});


if (inputTotalKg && calculateTargetsBtn) {
    calculateTargetsBtn.addEventListener('click', () => {
        calculateTargets(inputTotalKg.value);
    });
    
    // Permite iniciar com Enter
    inputTotalKg.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !calculateTargetsBtn.disabled) {
            e.preventDefault();
            calculateTargets(inputTotalKg.value);
        }
    });
}

if (addDischargeBtn) {
    addDischargeBtn.addEventListener('click', addDischargeEntry);
    
    // Permite adicionar ao pressionar Enter em qualquer um dos campos de descarregamento
    if (inputDischargeKg) inputDischargeKg.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); 
            addDischargeEntry();
        }
    });
    if (inputDischargeCaixas) inputDischargeCaixas.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addDischargeEntry();
        }
    });
}

// ================== NOVOS EVENT LISTENERS ==================
if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener('click', downloadPdfReport);
}

if (sharePdfBtn) {
    sharePdfBtn.addEventListener('click', sharePdfReport); 
}

if (shareCsvBtn) {
    shareCsvBtn.addEventListener('click', shareCsvReport);
}
// ===========================================================

// Lógica para o botão de Reiniciar (Adicionado dinamicamente)
if(targetInputSection) {
    const resetButton = document.createElement('button');
    resetButton.textContent = 'Reiniciar Calculadora';
    resetButton.classList.add('action-btn', 'secondary-btn');
    resetButton.style.marginTop = '10px';
    resetButton.style.display = 'none'; // Inicialmente escondido
    resetButton.id = 'reset-calculator-btn';
    
    resetButton.addEventListener('click', () => {
        // Reinicia o estado
        totalKgNota = 0;
        dischargedList = [];
        
        // Reabilita o input e botão inicial
        if (inputTotalKg) {
            inputTotalKg.disabled = false;
            inputTotalKg.value = '';
            inputTotalKg.focus();
        }
        if (calculateTargetsBtn) {
            calculateTargetsBtn.style.display = 'block';
            calculateTargetsBtn.disabled = true; // Desabilita até que os inputs sejam preenchidos
        }
        // Reseta o entregador para forçar a validação
        if (selectEntregador) {
            selectEntregador.value = '';
        }

        // Esconde todas as seções de resumo
        if (targetSummarySection) targetSummarySection.style.display = 'none';
        if (dischargeInputSection) dischargeInputSection.style.display = 'none';
        if (dischargeSummarySection) dischargeSummarySection.style.display = 'none';
        if (remainingSummarySection) remainingSummarySection.style.display = 'none';
        resetButton.style.display = 'none';
        
        // Garante que os botões de relatório sejam desabilitados
        updateDischargeSummary();
    });

    targetInputSection.appendChild(resetButton);
}
