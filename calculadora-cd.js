/* ========================================================================
 * ARQUIVO: calculadora-cd.js
 * DESCRIÇÃO: Lógica exclusiva para a página calculadora-cd.html.
 *
 * IMPORTANTE: Esta versão modificada requer a biblioteca jsPDF.
 * Adicione no seu HTML:
 * <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
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
const downloadReportBtn = document.getElementById('download-report-btn');
const shareReportBtn = document.getElementById('share-report-btn');


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
    
    // Atualiza o estado do botão de download
    if (downloadReportBtn) {
        downloadReportBtn.disabled = dischargedList.length === 0;
    }
    if (shareReportBtn) {
        shareReportBtn.disabled = dischargedList.length === 0;
    }
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


// -----------------------------------------------------
// 2. Lógica de Exportação (Download e Compartilhamento)
// -----------------------------------------------------

/**
 * @description Gera o conteúdo de texto para o relatório (base para o PDF).
 * @returns {string} O texto completo do relatório.
 */
function generateReportText() {
    const totalDischargedKg = dischargedList.reduce((sum, item) => sum + item.kg, 0);
    const totalDischargedCaixas = dischargedList.reduce((sum, item) => sum + item.caixas, 0);
    const totalPaletesEstimados = Math.ceil(totalKgNota / KG_POR_PALETE_ESTIMADO);

	    const remainingKg = totalKgNota - totalDischargedKg;
	    const remainingCaixas = remainingKg / KG_POR_CAIXA_ESTIMADO; // Depende dos KG Restantes
	    const remainingPaletes = Math.ceil(remainingKg / KG_POR_PALETE_ESTIMADO);
    
    const date = new Date().toLocaleString('pt-BR');

    let report = `RELATORIO DE DESCARREGAMENTO - CD NORDESTAO\n`;
	    const entregador = selectEntregador ? selectEntregador.value : 'N/A';

	    report += `QDELICIA FRUTAS - Gerado em: ${date}\n`;
	    report += `Entregador: ${entregador}\n`;
	    report += '==================================================\n\n';
    
    report += '1. DADOS DA NOTA FISCAL\n';
    report += `Volume Total da Nota: ${totalKgNota.toFixed(2)} KG\n\n`;
    
    report += '2. DADOS DA ENTREGA:\n';
	    report += `BASE DE CALCULO PADRAO: ${KG_POR_PALETE_ESTIMADO.toFixed(2)} KG POR PALETE\n`;
    report += `Total de Caixas (Estimado): ${Math.round(totalKgNota / KG_POR_CAIXA_ESTIMADO)} caixas\n`;
    report += `Total de Paletes (Estimado): ${totalPaletesEstimados} paletes\n\n`;

	    report += '3. DETALHES DA ENTREGA\n';
	    // Otimização da tabela para visualização em texto (usando abreviações e espaçamento)
	    report += '======================================================\n';
	    report += '|| Palete || KG Conf. || Cx Conf. || P.Medio/Cx ||\n';
	    report += '======================================================\n';
	    dischargedList.forEach((item, index) => {
	        const pesoMedioCaixa = item.kg / item.caixas;
	        // Garante que os campos tenham um tamanho mínimo para alinhamento
	        const paleteNum = `${index + 1}º`.padEnd(8);
	        const kgConf = item.kg.toFixed(2).padEnd(8);
	        const cxConf = item.caixas.toString().padEnd(8);
	        const pMedioCx = pesoMedioCaixa.toFixed(2).padEnd(11);
	        
	        report += `|| ${paleteNum} || ${kgConf} || ${cxConf} || ${pMedioCx} ||\n`;
	    });
	    report += '======================================================\n\n';

	    report += '4. RESUMO GERAL\n';
	    report += `TOTAL KG Descarregado: ${totalDischargedKg.toFixed(2)} KG\n`;
	    report += `TOTAL Caixas Descarregadas: ${totalDischargedCaixas} caixas\n\n`;
	    
	    report += '5. FALTA PARA CONCLUIR\n';
	    
	    // Inclui o status de KG no relatório
	    const tolerance = 5;
	    if (remainingKg <= tolerance && remainingKg >= 0) {
	        report += `STATUS: PESO ATINGIDO! ENTREGA REALIZADA!\n`;
	    } else if (remainingKg < 0) {
	        const excessKg = Math.abs(remainingKg);
	        report += `STATUS: PESO EXCEDIDO! Retirar ${excessKg.toFixed(2)} KG para atingir o volume da nota.\n`;
	    } else {
	        report += `STATUS: Em andamento...\n`;
	    }
	    
	    report += `KG Restantes: ${remainingKg.toFixed(2)} KG\n`;
	    report += `Caixas Restantes: ${Math.round(remainingCaixas)} caixas\n`;
	    report += `Paletes Restantes: ${remainingPaletes} paletes\n`;
	    report += '==================================================\n';

	    return report;
}
	
/**
 * @description MODIFICADO: Compartilha o relatório em PDF (via Web Share API).
 * REQUER A BIBLIOTECA jsPDF
 */
async function shareReport() {
    if (dischargedList.length === 0) {
        alert("Não há registros de descarregamento para compartilhar.");
        return;
    }

    if (typeof jsPDF === 'undefined') {
        alert("Erro: A biblioteca jsPDF não foi carregada. O compartilhamento do PDF falhou.");
        console.error("jsPDF não está definida. Adicione <script src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'></script> ao seu HTML.");
        return;
    }

    if (!navigator.share || !navigator.canShare) {
        alert("A função de compartilhamento de arquivos não é suportada por este navegador. Tente usar o botão 'Baixar Relatório (PDF)'.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const reportText = generateReportText();
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `Relatorio_CD_Nordestao_${date}.pdf`;

    // Definir fonte monoespaçada para manter o alinhamento da tabela
    doc.setFont("Courier", "normal");
    doc.setFontSize(10);
    
    // Adiciona o texto (Margem de 10mm)
    doc.text(reportText, 10, 10); 
    
    // Gera o PDF como um Blob
    const pdfBlob = doc.output('blob');
    
    const file = new File([pdfBlob], filename, { type: 'application/pdf' });
    const entregador = selectEntregador ? selectEntregador.value : 'Relatório';
    
    const shareData = {
        files: [file],
        title: `Relatório CD Nordestão - ${entregador}`,
        text: `Segue o relatório de descarregamento (PDF).`
    };

    if (navigator.canShare(shareData)) {
        try {
            await navigator.share(shareData);
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Erro ao compartilhar:', error);
                alert(`Erro ao compartilhar: ${error.message}\n\Tente baixar o relatório e compartilhar manually.`);
            }
        }
    } else {
         alert("Este navegador não pode compartilhar este arquivo PDF. Tente baixar e compartilhar manualmente.");
    }
}


/**
 * @description MODIFICADO: Inicia o download do relatório em formato PDF.
 * REQUER A BIBLIOTECA jsPDF
 */
function downloadReport() {
    if (dischargedList.length === 0) {
        alert("Não há registros de descarregamento para gerar o relatório.");
        return;
    }

    if (typeof jsPDF === 'undefined') {
        alert("Erro: A biblioteca jsPDF não foi carregada. O download do PDF falhou.");
        console.error("jsPDF não está definida. Adicione <script src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'></script> ao seu HTML.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const reportText = generateReportText();
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `Relatorio_CD_Nordestao_${date}.pdf`;

    // Definir fonte monoespaçada para manter o alinhamento da tabela
    doc.setFont("Courier", "normal");
    doc.setFontSize(10);
    
    // Adiciona o texto (Margem de 10mm)
    doc.text(reportText, 10, 10); 
    
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
    // O 'else' (lógica da câmera) foi removido.
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

if (downloadReportBtn) {
    downloadReportBtn.addEventListener('click', downloadReport);
}

if (shareReportBtn) {
    // Atualizado para chamar a nova função de compartilhamento de PDF
    shareReportBtn.addEventListener('click', shareReport); 
}

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
    });

    targetInputSection.appendChild(resetButton);
}