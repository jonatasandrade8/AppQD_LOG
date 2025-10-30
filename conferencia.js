// Arquivo: conferencia.js

// ==================== VARIÁVEIS GLOBAIS ====================
let expectedWeights = {}; // { produto: peso_esperado }
let conferenceEntries = []; // [{ produto: string, peso: number, acao: string }]

const PRODUCTS = ["Pacovan", "Prata", "Comprida", "Nanica", "Leite", "Abacaxi", "Goiaba"];

// ==================== ELEMENTOS DO DOM ====================
const initialInputSection = document.getElementById('initial-input-section');
const conferenceSection = document.getElementById('conference-section');
const productInputsContainer = document.getElementById('product-inputs-container');
const startConferenceBtn = document.getElementById('start-conference-btn');

const remainingSummary = document.getElementById('remaining-summary');
const productSelect = document.getElementById('product-select');
const weightInput = document.getElementById('weight-input');
const actionSelect = document.getElementById('action-select');
const addConferenceBtn = document.getElementById('add-conference-btn');
const conferenceTableBody = document.getElementById('conference-table-body');
const conferenceTableFooter = document.getElementById('conference-table-footer');

// ==================== FUNÇÕES DE INICIALIZAÇÃO ====================

/**
 * @description Cria os inputs iniciais para os produtos.
 */
function createInitialInputs() {
    PRODUCTS.forEach(product => {
        const div = document.createElement('div');
        div.classList.add('input-group');
        div.innerHTML = `
            <label for="${product.toLowerCase()}-weight">${product} (kg):</label>
            <input type="number" id="${product.toLowerCase()}-weight" data-product="${product}" placeholder="Peso esperado em kg" step="0.01" min="0">
        `;
        productInputsContainer.appendChild(div);
    });
}

/**
 * @description Preenche o select box de produtos na seção de conferência.
 */
function populateConferenceSelect() {
    // Adiciona apenas os produtos que tiveram peso esperado inserido
    const productsToConfer = Object.keys(expectedWeights);
    
    productSelect.innerHTML = '<option value="" disabled selected>Selecione o Produto</option>';
    
    productsToConfer.forEach(product => {
        const option = document.createElement('option');
        option.value = product;
        option.textContent = product;
        productSelect.appendChild(option);
    });
}

// ==================== FUNÇÕES DE VALIDAÇÃO E ESTADO ====================

/**
 * @description Verifica se pelo menos um peso foi inserido para habilitar o botão de iniciar.
 */
function checkInitialInputs() {
    let hasInput = false;
    productInputsContainer.querySelectorAll('input[type="number"]').forEach(input => {
        const weight = parseFloat(input.value);
        if (!isNaN(weight) && weight > 0) {
            hasInput = true;
        }
    });
    startConferenceBtn.disabled = !hasInput;
}

/**
 * @description Verifica se os inputs de conferência são válidos para habilitar o botão de adicionar.
 */
function checkConferenceInputs() {
    const product = productSelect.value;
    const weight = parseFloat(weightInput.value);
    const isValid = product && !isNaN(weight) && weight >= 0;
    addConferenceBtn.disabled = !isValid;
}

// ==================== FUNÇÕES DE CÁLCULO E RENDERIZAÇÃO ====================

/**
 * @description Calcula os totais conferidos e os pesos restantes.
 * @returns {object} Um objeto com { totaisConferidos: { produto: peso_total }, restantes: { produto: peso_restante } }
 */
function calculateTotals() {
    const totaisConferidos = {};
    
    // Inicializa com 0
    Object.keys(expectedWeights).forEach(product => {
        totaisConferidos[product] = 0;
    });

    // Soma os pesos conferidos (apenas ação 'conferido')
    conferenceEntries.forEach(entry => {
        if (entry.acao === 'conferido') {
            totaisConferidos[entry.produto] += entry.peso;
        }
    });

    const restantes = {};
    
    // Calcula os restantes
    Object.keys(expectedWeights).forEach(product => {
        const esperado = expectedWeights[product];
        const conferido = totaisConferidos[product];
        restantes[product] = esperado - conferido;
    });

    return { totaisConferidos, restantes };
}

/**
 * @description Renderiza o resumo de pesos restantes.
 */
function renderRemainingSummary() {
    const { restantes } = calculateTotals();
    
    let html = '<h4>Falta Conferir (kg):</h4><ul>';
    let allDone = true;

    Object.keys(restantes).forEach(product => {
        const restante = restantes[product];
        const esperado = expectedWeights[product];
        const isNegative = restante < 0;
        const className = isNegative ? 'excess' : (restante > 0 ? 'missing' : 'done');
        
        if (restante > 0.01) { // Considera uma pequena margem de erro para "restante"
            allDone = false;
        }

        html += `
            <li class="${className}">
                <strong>${product}:</strong> 
                <span class="weight-value">${Math.abs(restante).toFixed(2)} kg</span>
                ${restante > 0 ? '(Faltando)' : (isNegative ? '(Excesso)' : '(Concluído)')}
            </li>
        `;
    });

    html += '</ul>';
    remainingSummary.innerHTML = html;
    
    // Adiciona classes para estilo (se o style.css suportar)
    if (allDone && Object.keys(expectedWeights).length > 0) {
        remainingSummary.classList.add('all-done');
    } else {
        remainingSummary.classList.remove('all-done');
    }
}

/**
 * @description Renderiza a tabela de histórico de conferência e os totais.
 */
function renderConferenceTable() {
    // 1. Renderiza o corpo da tabela (histórico)
    conferenceTableBody.innerHTML = '';
    conferenceEntries.forEach((entry, index) => {
        const row = conferenceTableBody.insertRow();
        row.innerHTML = `
            <td>${entry.produto}</td>
            <td>${entry.peso.toFixed(2)} kg</td>
            <td>${entry.acao.charAt(0).toUpperCase() + entry.acao.slice(1)}</td>
            <td><button class="remove-btn" data-index="${index}"><i class="fas fa-trash-alt"></i></button></td>
        `;
    });

    // 2. Renderiza o rodapé da tabela (totais por produto)
    const { totaisConferidos } = calculateTotals();
    conferenceTableFooter.innerHTML = '';

    // Cabeçalho do rodapé
    const totalRow = conferenceTableFooter.insertRow();
    totalRow.innerHTML = `<td colspan="4"><strong>Resumo de Totais Conferidos (Ação 'Conferido'):</strong></td>`;

    Object.keys(totaisConferidos).forEach(product => {
        const total = totaisConferidos[product];
        const expected = expectedWeights[product];
        
        const row = conferenceTableFooter.insertRow();
        row.innerHTML = `
            <td><strong>${product}</strong></td>
            <td colspan="3">
                <strong>Total Conferido:</strong> ${total.toFixed(2)} kg 
                (Esperado: ${expected.toFixed(2)} kg)
            </td>
        `;
    });

    // 3. Adiciona listeners para os botões de remoção
    document.querySelectorAll('.remove-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.dataset.index);
            removeConferenceEntry(index);
        });
    });
    
    // Atualiza o resumo de restantes após a renderização da tabela
    renderRemainingSummary();
}

/**
 * @description Remove uma entrada da conferência pelo índice.
 * @param {number} index - O índice da entrada a ser removida.
 */
function removeConferenceEntry(index) {
    if (index >= 0 && index < conferenceEntries.length) {
        conferenceEntries.splice(index, 1);
        renderConferenceTable();
    }
}

// ==================== EVENT HANDLERS ====================

/**
 * @description Inicia a conferência, salvando os pesos esperados e mostrando a seção de conferência.
 */
function startConference() {
    expectedWeights = {};
    let hasValidInput = false;

    productInputsContainer.querySelectorAll('input[type="number"]').forEach(input => {
        const product = input.dataset.product;
        const weight = parseFloat(input.value);
        
        if (!isNaN(weight) && weight > 0) {
            expectedWeights[product] = weight;
            hasValidInput = true;
        }
    });

    if (hasValidInput) {
        // Esconde a seção inicial e mostra a de conferência
        initialInputSection.style.display = 'none';
        conferenceSection.style.display = 'block';
        
        // Popula o select box com os produtos que têm peso esperado
        populateConferenceSelect();
        
        // Inicializa a renderização
        renderRemainingSummary();
        renderConferenceTable();
    } else {
        alert("Por favor, insira o peso esperado (em kg) para pelo menos um produto antes de iniciar.");
    }
}

/**
 * @description Adiciona uma nova entrada de conferência.
 */
function addConferenceEntry() {
    const product = productSelect.value;
    const weight = parseFloat(weightInput.value);
    const action = actionSelect.value;
    
    if (!product || isNaN(weight) || weight < 0) {
        alert("Por favor, selecione um produto e insira um peso válido.");
        return;
    }

    const newEntry = {
        produto: product,
        peso: weight,
        acao: action
    };

    conferenceEntries.push(newEntry);
    
    // Limpa os campos de input
    productSelect.value = "";
    weightInput.value = "";
    actionSelect.value = "conferido";
    addConferenceBtn.disabled = true;

    // Atualiza a tabela e o resumo
    renderConferenceTable();
}


// ==================== INICIALIZAÇÃO E LISTENERS ====================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Cria os inputs iniciais
    createInitialInputs();

    // 2. Listeners para a seção de input inicial
    productInputsContainer.addEventListener('input', checkInitialInputs);
    startConferenceBtn.addEventListener('click', startConference);
    
    // 3. Listeners para a seção de conferência
    productSelect.addEventListener('change', checkConferenceInputs);
    weightInput.addEventListener('input', checkConferenceInputs);
    actionSelect.addEventListener('change', checkConferenceInputs);
    addConferenceBtn.addEventListener('click', addConferenceEntry);
    
    // 4. Estilos adicionais para a nova página (se necessário, mas o style.css deve ser suficiente)
    // Adiciona estilos para o summary-box e cores de status (se o style.css não tiver)
    const style = document.createElement('style');
    style.innerHTML = `
        .card { 
            margin-bottom: 20px; 
            padding: 20px;
        }
        .input-group-row {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            margin-bottom: 20px;
            align-items: flex-end;
        }
        .input-group-row .input-group {
            flex: 1 1 200px; /* Flexível para mobile/desktop */
        }
        .input-group-row .action-btn {
            flex: 0 0 auto;
            min-width: 150px;
            height: 44px; /* Para alinhar com os inputs */
        }
        .summary-box {
            background-color: var(--bg-light);
            border: 1px solid var(--tertiary-color);
            padding: 15px;
            border-radius: var(--border-radius);
            margin-bottom: 20px;
        }
        .summary-box h4 {
            color: var(--primary-color);
            margin-bottom: 10px;
        }
        .summary-box ul {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .summary-box li {
            padding: 5px 0;
            border-bottom: 1px dotted #eee;
            display: flex;
            justify-content: space-between;
        }
        .summary-box li:last-child {
            border-bottom: none;
        }
        .summary-box .weight-value {
            font-weight: 700;
        }
        .summary-box li.missing {
            color: #d9534f; /* Vermelho */
        }
        .summary-box li.excess {
            color: #f0ad4e; /* Amarelo/Laranja */
        }
        .summary-box li.done {
            color: #5cb85c; /* Verde */
        }
        .summary-box.all-done {
            border-color: #5cb85c;
            background-color: #e6ffe6;
        }
        
        .table-container {
            overflow-x: auto;
        }
        #conference-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        #conference-table th, #conference-table td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
        }
        #conference-table th {
            background-color: var(--primary-color);
            color: var(--white);
        }
        #conference-table tfoot td {
            background-color: #f9f9f9;
            font-size: 0.9em;
        }
        .remove-btn {
            background: none;
            border: none;
            color: #d9534f;
            cursor: pointer;
            font-size: 1.1em;
        }
        
        /* Ajuste para mobile */
        @media (max-width: 600px) {
            .input-group-row {
                flex-direction: column;
            }
            .input-group-row .input-group {
                width: 100%;
            }
            .input-group-row .action-btn {
                width: 100%;
            }
        }
    `;
    document.head.appendChild(style);
});

// Garante que o script.js (menu, etc.) seja carregado primeiro, se a página principal o incluir
// O arquivo conferencia.js deve ser incluído DEPOIS do script.js no HTML.
// O menu hamburger e o back-to-top já são tratados pelo script.js.
