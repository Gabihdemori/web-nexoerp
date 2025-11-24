// nova_venda.js

const API_CONFIG = {
    CLIENTES: "https://api-nexoerp.vercel.app/api/clientes",
    PRODUTOS: "https://api-nexoerp.vercel.app/api/produtos",
    VENDAS: "https://api-nexoerp.vercel.app/api/vendas"
};

// Estado da venda
const saleState = {
    cliente: null,
    data: new Date().toISOString().split('T')[0],
    itens: [],
    desconto: 0,
    observacoes: '',
    total: 0,
    subtotal: 0
};

// Elementos DOM
const elements = {
    form: document.getElementById('sale-form'),
    clienteSelect: document.getElementById('cliente'),
    dataInput: document.getElementById('data'),
    saleItems: document.querySelector('.sale-items'),
    addItemBtn: document.getElementById('add-item'),
    descontoInput: document.getElementById('desconto'),
    totalInput: document.getElementById('total'),
    observacoesTextarea: document.getElementById('observacoes')
};

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    initializeSale();
    loadClients();
    loadProducts();
    setupEventListeners();
});

// Inicializar venda
function initializeSale() {
    // Definir data atual
    if (elements.dataInput) {
        elements.dataInput.value = saleState.data;
    }
    
    // Adicionar primeiro item
    addNewItem();
}

// Configurar event listeners
function setupEventListeners() {
    if (elements.form) {
        elements.form.addEventListener('submit', handleFormSubmit);
    }
    
    if (elements.addItemBtn) {
        elements.addItemBtn.addEventListener('click', addNewItem);
    }
    
    if (elements.descontoInput) {
        elements.descontoInput.addEventListener('input', handleDescontoChange);
    }
    
    if (elements.clienteSelect) {
        elements.clienteSelect.addEventListener('change', handleClienteChange);
    }
}

// Carregar clientes
async function loadClients() {
    try {
        const clientesData = await fetchData(API_CONFIG.CLIENTES);
        populateClientSelect(clientesData);
    } catch (error) {
        console.error('Erro ao carregar clientes:', error);
        showNotification('Erro ao carregar clientes', 'error');
    }
}

// Carregar produtos
async function loadProducts() {
    try {
        const produtosData = await fetchData(API_CONFIG.PRODUTOS);
        window.availableProducts = produtosData; // Disponibilizar globalmente
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        showNotification('Erro ao carregar produtos', 'error');
    }
}

// Popular select de clientes
function populateClientSelect(clientes) {
    if (!elements.clienteSelect) return;
    
    elements.clienteSelect.innerHTML = '<option value="">Selecione um cliente</option>';
    
    clientes.forEach(cliente => {
        const option = document.createElement('option');
        option.value = cliente.id;
        option.textContent = `${cliente.nome} - ${cliente.documento ? formatarDocumento(cliente.documento, cliente.tipo) : 'Sem documento'}`;
        elements.clienteSelect.appendChild(option);
    });
}

// Adicionar novo item à venda
function addNewItem() {
    const itemRow = document.createElement('div');
    itemRow.className = 'item-row';
    itemRow.innerHTML = `
        <select class="item-product" required>
            <option value="">Selecione um produto</option>
        </select>
        <input type="number" class="item-quantity" min="1" value="1" required>
        <input type="number" class="item-price" placeholder="Preço unitário" readonly>
        <span class="item-stock" style="font-size: 0.8rem; color: #666;">Estoque: 0</span>
        <span class="item-total">R$ 0,00</span>
        <button type="button" class="btn btn-secondary remove-item">Remover</button>
    `;
    
    elements.saleItems.appendChild(itemRow);
    
    // Popular select de produtos
    populateProductSelect(itemRow.querySelector('.item-product'));
    
    // Adicionar event listeners para o novo item
    setupItemEventListeners(itemRow);
    
    // Adicionar ao state
    const itemId = Date.now(); // ID temporário
    saleState.itens.push({
        id: itemId,
        produtoId: null,
        quantidade: 1,
        precoUnitario: 0,
        total: 0
    });
    
    itemRow.setAttribute('data-item-id', itemId);
}

// Popular select de produtos para um item
function populateProductSelect(selectElement) {
    if (!window.availableProducts) return;
    
    selectElement.innerHTML = '<option value="">Selecione um produto</option>';
    
    window.availableProducts.forEach(produto => {
        // Verificar se produto está ativo e tem estoque
        if ((produto.status === 'active' || produto.status === 'Ativo') && produto.estoque > 0) {
            const option = document.createElement('option');
            option.value = produto.id;
            option.textContent = `${produto.nome} - R$ ${formatarPreco(produto.preco)} - Estoque: ${produto.estoque}`;
            option.setAttribute('data-preco', produto.preco);
            option.setAttribute('data-estoque', produto.estoque);
            selectElement.appendChild(option);
        }
    });
}

// Configurar event listeners para um item
function setupItemEventListeners(itemRow) {
    const productSelect = itemRow.querySelector('.item-product');
    const quantityInput = itemRow.querySelector('.item-quantity');
    const priceInput = itemRow.querySelector('.item-price');
    const stockSpan = itemRow.querySelector('.item-stock');
    const totalSpan = itemRow.querySelector('.item-total');
    const removeBtn = itemRow.querySelector('.remove-item');
    
    // Quando produto é selecionado
    productSelect.addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        const preco = parseFloat(selectedOption.getAttribute('data-preco')) || 0;
        const estoque = parseInt(selectedOption.getAttribute('data-estoque')) || 0;
        
        priceInput.value = preco;
        stockSpan.textContent = `Estoque: ${estoque}`;
        
        // Atualizar state
        const itemId = parseInt(itemRow.getAttribute('data-item-id'));
        const itemIndex = saleState.itens.findIndex(item => item.id === itemId);
        
        if (itemIndex !== -1) {
            saleState.itens[itemIndex].produtoId = this.value ? parseInt(this.value) : null;
            saleState.itens[itemIndex].precoUnitario = preco;
            
            // Atualizar quantidade máxima baseada no estoque
            quantityInput.max = estoque;
            
            calculateItemTotal(itemRow);
        }
    });
    
    // Quando quantidade muda
    quantityInput.addEventListener('input', function() {
        calculateItemTotal(itemRow);
    });
    
    // Remover item
    removeBtn.addEventListener('click', function() {
        const itemId = parseInt(itemRow.getAttribute('data-item-id'));
        removeItem(itemId, itemRow);
    });
}

// Calcular total de um item
function calculateItemTotal(itemRow) {
    const quantityInput = itemRow.querySelector('.item-quantity');
    const priceInput = itemRow.querySelector('.item-price');
    const totalSpan = itemRow.querySelector('.item-total');
    
    const quantidade = parseInt(quantityInput.value) || 0;
    const preco = parseFloat(priceInput.value) || 0;
    const total = quantidade * preco;
    
    totalSpan.textContent = `R$ ${formatarPreco(total)}`;
    
    // Atualizar state
    const itemId = parseInt(itemRow.getAttribute('data-item-id'));
    const itemIndex = saleState.itens.findIndex(item => item.id === itemId);
    
    if (itemIndex !== -1) {
        saleState.itens[itemIndex].quantidade = quantidade;
        saleState.itens[itemIndex].total = total;
    }
    
    calculateSaleTotal();
}

// Remover item da venda
function removeItem(itemId, itemRow) {
    // Remover do state
    saleState.itens = saleState.itens.filter(item => item.id !== itemId);
    
    // Remover do DOM
    itemRow.remove();
    
    calculateSaleTotal();
    
    // Se não há mais itens, adicionar um novo
    if (saleState.itens.length === 0) {
        addNewItem();
    }
}

// Calcular total da venda
function calculateSaleTotal() {
    saleState.subtotal = saleState.itens.reduce((total, item) => total + item.total, 0);
    saleState.desconto = parseFloat(elements.descontoInput.value) || 0;
    saleState.total = Math.max(0, saleState.subtotal - saleState.desconto);
    
    if (elements.totalInput) {
        elements.totalInput.value = `R$ ${formatarPreco(saleState.total)}`;
    }
}

// Handlers de eventos
function handleDescontoChange() {
    calculateSaleTotal();
}

function handleClienteChange() {
    saleState.cliente = this.value ? parseInt(this.value) : null;
}

// Handler para submit do formulário
async function handleFormSubmit(event) {
    event.preventDefault();
    
    if (!validateSaleForm()) {
        return;
    }
    
    const saleData = collectSaleData();
    
    try {
        await saveSale(saleData);
    } catch (error) {
        console.error('Erro ao salvar venda:', error);
        showNotification('Erro ao salvar venda: ' + error.message, 'error');
    }
}

// Validar formulário de venda
function validateSaleForm() {
    let isValid = true;
    
    // Validar cliente
    if (!saleState.cliente) {
        showNotification('Selecione um cliente', 'error');
        isValid = false;
    }
    
    // Validar itens
    const validItems = saleState.itens.filter(item => 
        item.produtoId && item.quantidade > 0 && item.precoUnitario > 0
    );
    
    if (validItems.length === 0) {
        showNotification('Adicione pelo menos um item à venda', 'error');
        isValid = false;
    }
    
    // Validar estoque para cada item
    for (const item of saleState.itens) {
        if (item.produtoId) {
            const produto = window.availableProducts.find(p => p.id === item.produtoId);
            if (produto && item.quantidade > produto.estoque) {
                showNotification(`Estoque insuficiente para ${produto.nome}. Disponível: ${produto.estoque}`, 'error');
                isValid = false;
                break;
            }
        }
    }
    
    return isValid;
}

// Coletar dados da venda
function collectSaleData() {
    // Filtrar apenas itens válidos
    const itensValidos = saleState.itens.filter(item => 
        item.produtoId && item.quantidade > 0
    );
    
    return {
        clienteId: saleState.cliente,
        data: elements.dataInput.value,
        itens: itensValidos.map(item => ({
            produtoId: item.produtoId,
            quantidade: item.quantidade,
            precoUnitario: item.precoUnitario
        })),
        desconto: saleState.desconto,
        subtotal: saleState.subtotal,
        total: saleState.total,
        observacoes: elements.observacoesTextarea.value,
        status: 'concluida'
    };
}

// Salvar venda na API
async function saveSale(saleData) {
    showNotification('Processando venda...', 'info');
    
    const response = await fetch(API_CONFIG.VENDAS, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(saleData)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erro ${response.status}`);
    }

    const result = await response.json();
    
    showNotification('Venda realizada com sucesso!', 'success');
    
    // Redirecionar após 2 segundos
    setTimeout(() => {
        window.location.href = '../vendas.html';
    }, 2000);
    
    return result;
}

// Funções de formatação
function formatarPreco(valor) {
    return parseFloat(valor || 0).toFixed(2).replace('.', ',');
}

function formatarDocumento(documento, tipo) {
    if (!documento) return '';
    
    const numeros = documento.replace(/\D/g, '');
    
    if (tipo === 'PJ') {
        // CNPJ
        if (numeros.length === 14) {
            return numeros.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
        }
    } else {
        // CPF
        if (numeros.length === 11) {
            return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        }
    }
    
    return documento;
}

// Função para fazer requisições
async function fetchData(url, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json'
        }
    };

    const finalOptions = { ...defaultOptions, ...options };
    
    try {
        const response = await fetch(url, finalOptions);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Erro ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Erro na requisição:', error);
        throw error;
    }
}

// Sistema de notificação
function showNotification(message, type = 'info') {
    // Remove notificação existente
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animar entrada
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Remover após 5 segundos
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 5000);
}

function getNotificationIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-triangle',
        info: 'info-circle',
        warning: 'exclamation-circle'
    };
    return icons[type] || 'info-circle';
}

// Expor funções globais
window.addNewItem = addNewItem;