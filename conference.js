// Arquivo: conference.js

// Variáveis de Estado da Conferência
let conferenceData = {
    invoiceTargets: {}, // { "pacovan": 100, "prata": 50 }
    launchedItems: [], // [ { produto: 'Prata', kg: 15.00, caixas: 1, timestamp: '10:30:00' } ]
    entregador: '',
    rede: '',
    loja: ''
};
const CONFERENCE_STORAGE_KEY = 'qdelicia_logistica_conference_data';
const KG_POR_CAIXA_ESTIMADO = 15; // Estimativa padrão para cálculo de caixas

// Elementos Específicos da Página (Referências Diretas)
const startConferenceBtn = document.getElementById('start-conference-btn');
const targetInputs = document.querySelectorAll('#invoice-input-section input[type="number"]'); 
const selectProductLaunch = document.getElementById('select-product-launch');
const inputProductKg = document.getElementById('input-product-kg');
const addItemBtn = document.getElementById('add-item-btn');
const resetConferenceBtn = document.getElementById('reset-conference-btn');
const conferenceSummaryBody = document.getElementById('conference-summary-body');
const shareReportBtn = document.getElementById('share-report-btn'); 
const downloadReportBtn = document.getElementById('download-report-btn'); 
const conferenceInputSection = document.getElementById('conference-input-section');
const conferenceSummarySection = document.getElementById('conference-summary-section');

// Elementos de Logística (Obtidos do DOM, compartilhados com script.js)
const selectEntregador = document.getElementById('select-entregador'); 
const selectRede = document.getElementById('select-rede'); 
const selectLoja = document.getElementById('select-loja'); 


// --- LÓGICA DE PERSISTÊNCIA E CARREGAMENTO ---

function saveConferenceState() {
    localStorage.setItem(CONFERENCE_STORAGE_KEY, JSON.stringify(conferenceData));
}

function loadConferenceState() {
    const savedData = localStorage.getItem(CONFERENCE_STORAGE_KEY);
    if (savedData) {
        conferenceData = JSON.parse(savedData);
        
        // Se já houver dados de conferência, restaura o estado visual
        if (conferenceData.entregador) {
            blockInitialFields(true);
            toggleConferenceSections(true);
        }

        // Restaura os valores da Nota Fiscal
        targetInputs.forEach(input => {
            const product = input.id.replace('nota-', '');
            if (conferenceData.invoiceTargets[product] !== undefined) {
                input.value = conferenceData.invoiceTargets[product];
                if (conferenceData.entregador) input.disabled = true;
            }
        });
        
        updateConferenceSummary();
    }
}


// --- LÓGICA DO BOTÃO INICIAR E FLUXO ---

function blockInitialFields(block) {
    if (selectEntregador) selectEntregador.disabled = block;
    // O selectRede pode ser desabilitado, mas as lojas dependem dele, então mantemos a desativação após o início
    if (selectRede) selectRede.disabled = block; 
    if (selectLoja) selectLoja.disabled = block;
    targetInputs.forEach(input => input.disabled = block);
    if (startConferenceBtn) startConferenceBtn.style.display = block ? 'none' : 'block';
    if (resetConferenceBtn) resetConferenceBtn.style.display = block ? 'block' : 'none';
}

/**
 * @description Habilita/Desabilita o botão INICIAR.
 */
function checkStartConferenceButton() {
    // Retorna se o botão não existe (não é a página de conferência) ou se já iniciou
    if (!startConferenceBtn || conferenceData.entregador) return; 

    // 1. Campos de Logística (Entregador, Rede, Loja)
    // O valor deve ser diferente de "" e o elemento deve existir.
    const isEntregadorReady = selectEntregador && selectEntregador.value && selectEntregador.value !== "";
    const isRedeReady = selectRede && selectRede.value && selectRede.value !== "";
    const isLojaReady = selectLoja && selectLoja.value && selectLoja.value !== "";

    const isLogisticaReady = isEntregadorReady && isRedeReady && isLojaReady;
                             
    // 2. Campos da Nota Fiscal (pelo menos um deve ser preenchido > 0)
    let hasInvoiceTarget = false;
    targetInputs.forEach(input => {
        const kg = parseFloat(input.value);
        if (!isNaN(kg) && kg > 0) {
            hasInvoiceTarget = true;
        }
    });

    if (isLogisticaReady && hasInvoiceTarget) {
        startConferenceBtn.disabled = false;
        startConferenceBtn.innerHTML = '<i class="fas fa-play"></i> Iniciar Conferência';
    } else {
        startConferenceBtn.disabled = true;
        
        if (!isLogisticaReady) {
            let missingText = 'Selecione:';
            if (!isEntregadorReady) missingText += ' Entregador,';
            if (!isRedeReady) missingText += ' Rede,';
            if (!isLojaReady) missingText += ' Loja,';
            
            // Remove a última vírgula
            missingText = missingText.slice(0, -1); 

            startConferenceBtn.innerHTML = `<i class="fas fa-lock"></i> ${missingText}`;
            
        } else if (!hasInvoiceTarget) {
            startConferenceBtn.innerHTML = '<i class="fas fa-lock"></i> Preencha os Dados da Nota (> 0 KG)';
        } else {
            startConferenceBtn.innerHTML = '<i class="fas fa-lock"></i> Preencha os Dados para Iniciar';
        }
    }
}

function startConference() {
    if (startConferenceBtn.disabled) return;
    
    blockInitialFields(true);

    // Coleta os dados logísticos
    conferenceData.entregador = selectEntregador ? selectEntregador.value : '';
    conferenceData.rede = selectRede ? selectRede.value : '';
    conferenceData.loja = selectLoja ? selectLoja.value : '';
    
    // Coleta dos targets da Nota Fiscal
    conferenceData.invoiceTargets = {};
    targetInputs.forEach(input => {
        const product = input.id.replace('nota-', '');
        const kg = parseFloat(input.value) || 0;
        if (kg > 0) {
            conferenceData.invoiceTargets[product] = kg;
        }
    });
    
    conferenceData.launchedItems = []; 
    saveConferenceState(); 
    
    toggleConferenceSections(true);
    updateConferenceSummary();
    
    alert(`Conferência iniciada para ${conferenceData.entregador} em ${conferenceData.loja}.`);
}

function toggleConferenceSections(isStarted) {
    if (conferenceInputSection) conferenceInputSection.style.display = isStarted ? 'block' : 'none';
    if (conferenceSummarySection) conferenceSummarySection.style.display = isStarted ? 'block' : 'none';
}

function resetConference() {
    if (confirm("Tem certeza que deseja REINICIAR a conferência? Todos os lançamentos serão perdidos.")) {
        conferenceData = {
            invoiceTargets: {},
            launchedItems: [],
            entregador: '',
            rede: '',
            loja: ''
        };
        localStorage.removeItem(CONFERENCE_STORAGE_KEY);
        
        blockInitialFields(false);
        targetInputs.forEach(input => input.value = '');

        toggleConferenceSections(false);
        
        // Chama a função de load/populamento do script.js para restaurar dropdowns
        if (typeof loadAndPopulateDropdowns === 'function') {
            loadAndPopulateDropdowns();
        } else {
             if (selectLoja) selectLoja.disabled = true;
        }
        
        if (conferenceSummaryBody) conferenceSummaryBody.innerHTML = '';
        checkStartConferenceButton(); 
        
        alert("Conferência resetada com sucesso.");
    }
}

// --- LÓGICA DE LANÇAMENTO E RESUMO ---

function checkLaunchInputs() {
    if (!addItemBtn) return;
    
    const product = selectProductLaunch ? selectProductLaunch.value : null;
    const kg = parseFloat(inputProductKg ? inputProductKg.value : 0);
    
    if (product && product !== "" && !isNaN(kg) && kg > 0) {
        addItemBtn.disabled = false;
        addItemBtn.innerHTML = `<i class="fas fa-plus-circle"></i> Adicionar ${kg.toFixed(2)} KG de ${product}`;
    } else {
        addItemBtn.disabled = true;
        addItemBtn.innerHTML = `<i class="fas fa-plus-circle"></i> Adicionar Item`;
    }
}

function addItemToConference() {
    const product = selectProductLaunch.value;
    const kg = parseFloat(inputProductKg.value);
    
    if (addItemBtn.disabled || !window.APP_DATA) return; 

    // Acessa o APP_DATA global
    // Usando uma estimativa simples de 15kg/caixa para a conferência se não houver um dado específico
    const kgPorCaixa = KG_POR_CAIXA_ESTIMADO; 
    const caixas = Math.round(kg / kgPorCaixa);

    conferenceData.launchedItems.push({
        produto: product, 
        kg: kg, 
        caixas: caixas,
        timestamp: new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit', second: '2-digit'})
    });
    
    if (selectProductLaunch) selectProductLaunch.value = '';
    if (inputProductKg) inputProductKg.value = '';
    checkLaunchInputs();
    
    updateConferenceSummary();
    saveConferenceState();
}

function updateConferenceSummary() {
    if (!conferenceSummaryBody) return;
    conferenceSummaryBody.innerHTML = '';
    
    const targets = conferenceData.invoiceTargets;
    const launched = conferenceData.launchedItems;

    // 1. Resumo por Produto
    const productSummary = {};
    const productsInvolved = new Set([...Object.keys(targets), ...launched.map(i => i.produto)]);

    productsInvolved.forEach(prod => {
        productSummary[prod] = { target: targets[prod] || 0, launchedKg: 0 };
    });

    launched.forEach(item => {
        productSummary[item.produto].launchedKg += item.kg;
    });

    // 2. Desenha a Tabela
    productsInvolved.forEach(product => {
        const summary = productSummary[product];
        const target = summary.target;
        const launchedKg = summary.launchedKg;
        const diff = launchedKg - target; 
        
        let rowClass = '';
        const tolerance = 5;
        
        if (target === 0 && launchedKg > 0) {
            rowClass = 'status-extra';
        } else if (diff >= -tolerance && diff <= tolerance) {
            rowClass = 'status-ok';
        } else if (diff > tolerance) {
            rowClass = 'status-excess';
        } else {
            rowClass = 'status-short';
        }
        
        const row = conferenceSummaryBody.insertRow();
        row.classList.add(rowClass);

        row.insertCell().textContent = product;
        row.insertCell().textContent = target.toFixed(2);
        row.insertCell().textContent = launchedKg.toFixed(2);
        
        const diffCell = row.insertCell();
        diffCell.textContent = diff.toFixed(2); 
    });
    
    // 3. Botões de Relatório
    const isReadyForReport = launched.length > 0;
    if (downloadReportBtn) downloadReportBtn.disabled = !isReadyForReport;
    if (shareReportBtn) shareReportBtn.disabled = !isReadyForReport;
}


// --- LÓGICA DE RELATÓRIO ---

function generateConferenceReportText() {
    const date = new Date().toLocaleString('pt-BR');
    const targets = conferenceData.invoiceTargets;
    const launched = conferenceData.launchedItems;
    
    const productSummary = {};
    let totalTargetKg = 0;
    let totalLaunchedKg = 0;
    const productsInvolved = new Set([...Object.keys(targets), ...launched.map(i => i.produto)]);

    productsInvolved.forEach(prod => {
        productSummary[prod] = { target: targets[prod] || 0, launchedKg: 0 };
    });

    launched.forEach(item => {
        productSummary[item.produto].launchedKg += item.kg;
    });

    let report = `RELATORIO DE CONFERÊNCIA - QDELICIA\n`;
	report += `Gerado em: ${date}\n`;
	report += `Entregador: ${conferenceData.entregador}\n`;
	report += `Rede/Loja: ${conferenceData.rede} / ${conferenceData.loja}\n`;
	report += '==================================================\n\n';

    report += '1. RESUMO DA CONFERÊNCIA (NOTA FISCAL vs. CONFERIDO)\n';
    report += '==================================================\n';
    report += '|| PRODUTO || NOTA (KG) || CONF. (KG) || DIF. (KG) ||\n';
    report += '==================================================\n';
    
    productsInvolved.forEach(product => {
        const summary = productSummary[product];
        const target = summary.target;
        const launchedKg = summary.launchedKg;
        const diff = launchedKg - target;
        
        totalTargetKg += target;
        totalLaunchedKg += launchedKg;
        
        const prod = (product + '         ').slice(0, 9);
        const nota = (target.toFixed(2) + '         ').slice(0, 9);
        const conf = (launchedKg.toFixed(2) + '          ').slice(0, 10);
        const dif = (diff.toFixed(2) + '         ').slice(0, 9);

        report += `|| ${prod} || ${nota} || ${conf} || ${dif} ||\n`;
    });
    report += '==================================================\n';
    
    report += `\nTOTAL NOTA: ${totalTargetKg.toFixed(2)} KG\n`;
    report += `TOTAL CONFERIDO: ${totalLaunchedKg.toFixed(2)} KG\n`;
    report += `DIFERENÇA FINAL: ${(totalLaunchedKg - totalTargetKg).toFixed(2)} KG\n\n`;
    
    return report;
}

function downloadConferenceReport() {
    if (conferenceData.launchedItems.length === 0) return;
    const reportText = generateConferenceReportText();
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `Relatorio_Conferencia_${conferenceData.loja}_${date}.txt`;
    
    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
}

function shareConferenceReportWhatsApp() {
    if (conferenceData.launchedItems.length === 0) return;
    const reportText = generateConferenceReportText();
    const encodedText = encodeURIComponent(reportText);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
}


// --- INICIALIZAÇÃO DA CONFERÊNCIA ---

document.addEventListener('DOMContentLoaded', () => {
    // Verifica se a página é a de conferência
    if (!startConferenceBtn) return;
    
    // 1. Popula o seletor de produtos para lançamento (CORREÇÃO DE REFERÊNCIA)
    if (typeof populateSelect === 'function' && window.APP_DATA && APP_DATA.PRODUTOS_CONFERENCIA) {
        populateSelect(selectProductLaunch, APP_DATA.PRODUTOS_CONFERENCIA, "Selecione o Produto");
    }

    loadConferenceState(); 
    
    // 2. LISTENERS DE LOGÍSTICA (Chamada de Validação)
    if (selectEntregador) selectEntregador.addEventListener('change', checkStartConferenceButton);
    if (selectRede) {
        selectRede.addEventListener('change', () => {
            // populateLoja() é chamado no script.js, mas re-chamar é seguro.
            if (typeof populateLoja === 'function') populateLoja(selectRede.value);
            checkStartConferenceButton(); 
        });
    }
    if (selectLoja) selectLoja.addEventListener('change', checkStartConferenceButton);
    
    // 3. LISTENERS DOS CAMPOS DA NOTA FISCAL
    targetInputs.forEach(input => {
        input.addEventListener('input', checkStartConferenceButton);
    });
    
    // 4. LISTENERS DE AÇÃO
    if (startConferenceBtn) startConferenceBtn.addEventListener('click', startConference);
    if (addItemBtn) addItemBtn.addEventListener('click', addItemToConference);
    if (selectProductLaunch) selectProductLaunch.addEventListener('change', checkLaunchInputs);
    if (inputProductKg) inputProductKg.addEventListener('input', checkLaunchInputs);
    if (resetConferenceBtn) resetConferenceBtn.addEventListener('click', resetConference);
    if (downloadReportBtn) downloadReportBtn.addEventListener('click', downloadConferenceReport);
    if (shareReportBtn) shareReportBtn.addEventListener('click', shareConferenceReportWhatsApp);
    
    // 5. Checagem inicial
    checkStartConferenceButton();
    checkLaunchInputs(); 
});