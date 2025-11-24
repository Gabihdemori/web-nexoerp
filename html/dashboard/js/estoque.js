// estoque.js

const API_CONFIG = {
    PRODUTOS: "https://api-nexoerp.vercel.app/api/produtos",
    ESTOQUE: "https://api-nexoerp.vercel.app/api/produtos"
};

// Estado da aplicação para estoque
const appState = {
    produtos: [],
    currentPage: 1,
    itemsPerPage: 10,
    searchTerm: '',
    filters: {
        stockLevel: 'all',
        category: 'all',
        status: ''
    },
    metrics: {
        totalItems: 0,
        totalValue: 0,
        lowStockItems: 0,
        outOfStockItems: 0
    }
};

// Elementos DOM para estoque
const elements = {
    // Tabela e Cards
    inventoryTableBody: document.getElementById('inventoryTableBody'),
    cardsView: document.getElementById('cardsView'),
    pagination: document.getElementById('pagination'),
    
    // Filtros
    searchFilter: document.getElementById('searchFilter'),
    stockFilter: document.getElementById('stockFilter'),
    categoryFilter: document.getElementById('categoryFilter'),
    statusFilter: document.getElementById('statusFilter'),
    itemsPerPage: document.getElementById('itemsPerPage'),
    
    // Métricas
    totalItems: document.getElementById('totalItems'),
    totalValue: document.getElementById('totalValue'),
    lowStockItems: document.getElementById('lowStockItems'),
    outOfStockItems: document.getElementById('outOfStockItems'),
    
    // Botões
    addProductBtn: document.getElementById('addProductBtn'),
    exportBtn: document.querySelector('.btn-secondary'),
    
    // Views
    tableView: document.getElementById('tableView'),
    cardsView: document.getElementById('cardsView'),
    viewButtons: document.querySelectorAll('.view-btn')
};

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    loadProdutosData();
    setupEventListeners();
    setupViewToggle();
});

// Configurar event listeners
function setupEventListeners() {
    // Filtros
    if (elements.stockFilter) {
        elements.stockFilter.addEventListener('change', handleFilterChange);
    }
    if (elements.categoryFilter) {
        elements.categoryFilter.addEventListener('change', handleFilterChange);
    }
    if (elements.statusFilter) {
        elements.statusFilter.addEventListener('change', handleFilterChange);
    }
    if (elements.searchFilter) {
        elements.searchFilter.addEventListener('input', debounce(handleSearch, 300));
    }
    if (elements.itemsPerPage) {
        elements.itemsPerPage.addEventListener('change', handleItemsPerPageChange);
    }

    // Botões de ação
    if (elements.addProductBtn) {
        elements.addProductBtn.addEventListener('click', novoProduto);
    }
    if (elements.exportBtn) {
        elements.exportBtn.addEventListener('click', showExportOptions);
    }
}

// Configurar toggle de visualização
function setupViewToggle() {
    elements.viewButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const viewType = this.getAttribute('data-view');
            
            // Atualizar botões ativos
            elements.viewButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Mostrar view selecionada
            if (viewType === 'table') {
                elements.tableView.style.display = 'block';
                elements.cardsView.style.display = 'none';
            } else {
                elements.tableView.style.display = 'none';
                elements.cardsView.style.display = 'grid';
            }
            
            // Re-renderizar se necessário
            renderProdutos();
        });
    });
}

// Carregar dados dos produtos
async function loadProdutosData() {
    try {
        showLoadingState();
        
        const produtosData = await fetchData(API_CONFIG.PRODUTOS);
        appState.produtos = produtosData.produtos || produtosData;
        
        // Calcular métricas
        calculateMetrics(appState.produtos);
        
        renderProdutos();
        renderMetrics();
        
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        showError('Erro ao carregar produtos: ' + error.message);
    } finally {
        hideLoadingState();
    }
}

// Calcular métricas
function calculateMetrics(produtos) {
    appState.metrics.totalItems = produtos.length;
    appState.metrics.totalValue = produtos.reduce((sum, produto) => sum + (produto.preco * produto.estoque), 0);
    appState.metrics.lowStockItems = produtos.filter(produto => produto.estoque > 0 && produto.estoque <= 5).length;
    appState.metrics.outOfStockItems = produtos.filter(produto => produto.estoque === 0).length;
}

// Renderizar métricas
function renderMetrics() {
    if (elements.totalItems) elements.totalItems.textContent = appState.metrics.totalItems;
    if (elements.totalValue) elements.totalValue.textContent = appState.metrics.totalValue.toFixed(2);
    if (elements.lowStockItems) elements.lowStockItems.textContent = appState.metrics.lowStockItems;
    if (elements.outOfStockItems) elements.outOfStockItems.textContent = appState.metrics.outOfStockItems;
}

// Handlers de filtros
function handleFilterChange(e) {
    const filterName = e.target.id.replace('Filter', '');
    appState.filters[filterName] = e.target.value;
    appState.currentPage = 1;
    renderProdutos();
}

function handleSearch(e) {
    appState.searchTerm = e.target.value;
    appState.currentPage = 1;
    renderProdutos();
}

function handleItemsPerPageChange(e) {
    appState.itemsPerPage = parseInt(e.target.value);
    appState.currentPage = 1;
    renderProdutos();
}

// Renderizar produtos
function renderProdutos() {
    const filteredProdutos = filterProdutos(appState.produtos);
    const paginatedProdutos = paginateProdutos(filteredProdutos);
    
    const isTableView = document.querySelector('.view-btn[data-view="table"]').classList.contains('active');
    
    if (isTableView) {
        renderTableView(paginatedProdutos, filteredProdutos.length);
    } else {
        renderCardsView(paginatedProdutos, filteredProdutos.length);
    }
    
    renderPagination(filteredProdutos.length);
}

// Filtrar produtos
function filterProdutos(produtos) {
    return produtos.filter(produto => {
        // Pesquisa geral (ID, nome, descrição)
        const matchesSearch = !appState.searchTerm || 
            (produto.id && produto.id.toString().includes(appState.searchTerm)) ||
            (produto.nome && produto.nome.toLowerCase().includes(appState.searchTerm.toLowerCase())) ||
            (produto.descricao && produto.descricao.toLowerCase().includes(appState.searchTerm.toLowerCase()));
        
        // Filtro de nível de estoque
        const matchesStockLevel = appState.filters.stockLevel === 'all' || 
            (appState.filters.stockLevel === 'critical' && produto.estoque <= 2) ||
            (appState.filters.stockLevel === 'low' && produto.estoque <= 5) ||
            (appState.filters.stockLevel === 'medium' && produto.estoque <= 10) ||
            (appState.filters.stockLevel === 'good' && produto.estoque > 10) ||
            (appState.filters.stockLevel === 'out' && produto.estoque === 0);
        
        // Filtro de categoria
        const matchesCategory = appState.filters.category === 'all' || 
            produto.tipo === appState.filters.category;
        
        // Filtro de status
        const matchesStatus = !appState.filters.status || 
            produto.status === appState.filters.status;
        
        return matchesSearch && matchesStockLevel && matchesCategory && matchesStatus;
    });
}

// Paginar produtos
function paginateProdutos(produtos) {
    const startIndex = (appState.currentPage - 1) * appState.itemsPerPage;
    return produtos.slice(startIndex, startIndex + appState.itemsPerPage);
}

// Renderizar visualização em tabela
function renderTableView(produtos, totalProdutos) {
    if (!elements.inventoryTableBody) return;

    if (produtos.length === 0) {
        elements.inventoryTableBody.innerHTML = `
            <tr>
                <td colspan="9" class="empty-state">
                    <i class="fas fa-boxes"></i>
                    <p>Nenhum produto encontrado</p>
                </td>
            </tr>
        `;
        return;
    }
    
    elements.inventoryTableBody.innerHTML = produtos.map(produto => `
        <tr>
            <td>${produto.id}</td>
            <td>
                <div class="product-name">${escapeHtml(produto.nome)}</div>
            </td>
            <td>${escapeHtml(produto.descricao || '-')}</td>
            <td>${produto.tipo || '-'}</td>
            <td>
                <div class="stock-info">
                    <span class="stock-quantity ${getStockClass(produto.estoque)}">${produto.estoque}</span>
                    ${produto.estoque <= 5 ? '<i class="fas fa-exclamation-triangle low-stock-warning"></i>' : ''}
                </div>
            </td>
            <td>R$ ${produto.preco.toFixed(2)}</td>
            <td>R$ ${(produto.preco * produto.estoque).toFixed(2)}</td>
            <td>
                <span class="status-badge ${produto.status === 'Ativo' ? 'status-active' : 'status-inactive'}">
                    ${produto.status || 'Inativo'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-edit" onclick="editarProduto(${produto.id})">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-delete" onclick="confirmarExclusao(${produto.id}, '${escapeHtml(produto.nome)}')">
                        <i class="fas fa-trash"></i> Excluir
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Renderizar visualização em cards
function renderCardsView(produtos, totalProdutos) {
    if (!elements.cardsView) return;

    if (produtos.length === 0) {
        elements.cardsView.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-boxes"></i>
                <p>Nenhum produto encontrado</p>
            </div>
        `;
        return;
    }
    
    elements.cardsView.innerHTML = produtos.map(produto => `
        <div class="product-card">
            <div class="card-header">
                <div class="product-avatar">
                    <i class="fas fa-box"></i>
                </div>
                <div class="product-info">
                    <h3>${escapeHtml(produto.nome)}</h3>
                    <p class="product-id">ID: ${produto.id}</p>
                </div>
                <span class="status-badge ${produto.status === 'Ativo' ? 'status-active' : 'status-inactive'}">
                    ${produto.status || 'Inativo'}
                </span>
            </div>
            
            <div class="card-body">
                <p class="product-description">${escapeHtml(produto.descricao || 'Sem descrição')}</p>
                
                <div class="product-meta">
                    <div class="meta-item">
                        <span class="meta-label">Categoria</span>
                        <span class="meta-value">${produto.tipo || '-'}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Preço</span>
                        <span class="meta-value">R$ ${produto.preco.toFixed(2)}</span>
                    </div>
                </div>
                
                <div class="stock-section">
                    <div class="stock-level ${getStockClass(produto.estoque)}">
                        <i class="fas fa-boxes"></i>
                        <span>Estoque: ${produto.estoque}</span>
                        ${produto.estoque <= 5 ? '<i class="fas fa-exclamation-triangle"></i>' : ''}
                    </div>
                    <div class="total-value">
                        Valor Total: R$ ${(produto.preco * produto.estoque).toFixed(2)}
                    </div>
                </div>
            </div>
            
            <div class="card-actions">
                <button class="btn btn-edit" onclick="editarProduto(${produto.id})">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn btn-delete" onclick="confirmarExclusao(${produto.id}, '${escapeHtml(produto.nome)}')">
                    <i class="fas fa-trash"></i> Excluir
                </button>
            </div>
        </div>
    `).join('');
}

// Função auxiliar para determinar a classe do estoque
function getStockClass(estoque) {
    if (estoque === 0) return 'out-of-stock';
    if (estoque <= 2) return 'critical-stock';
    if (estoque <= 5) return 'low-stock';
    if (estoque <= 10) return 'medium-stock';
    return 'good-stock';
}

// Renderizar paginação
function renderPagination(totalProdutos) {
    if (!elements.pagination) return;

    const totalPages = Math.ceil(totalProdutos / appState.itemsPerPage);
    
    if (totalPages <= 1) {
        elements.pagination.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // Botão anterior
    paginationHTML += `<button class="pagination-btn" ${appState.currentPage === 1 ? 'disabled' : ''} onclick="changePage(${appState.currentPage - 1})">
        <i class="fas fa-chevron-left"></i> Anterior
    </button>`;
    
    // Páginas
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= appState.currentPage - 1 && i <= appState.currentPage + 1)) {
            paginationHTML += `<button class="pagination-btn ${i === appState.currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
        } else if (i === appState.currentPage - 2 || i === appState.currentPage + 2) {
            paginationHTML += `<span class="pagination-ellipsis">...</span>`;
        }
    }
    
    // Botão próximo
    paginationHTML += `<button class="pagination-btn" ${appState.currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${appState.currentPage + 1})">
        Próxima <i class="fas fa-chevron-right"></i>
    </button>`;
    
    elements.pagination.innerHTML = paginationHTML;
}

// Funções de ação
function changePage(page) {
    appState.currentPage = page;
    renderProdutos();
    window.scrollTo(0, 0);
}

function editarProduto(produtoId) {
    window.location.href = `editar_produto.html?id=${produtoId}`;
}

function novoProduto() {
    window.location.href = 'Nova Tabela/novo_produto.html';
}

// Exportação
    function showExportOptions() {
        const exportMenu = document.createElement('div');
        exportMenu.className = 'export-menu';
        exportMenu.innerHTML = `
            <button onclick="exportarParaExcel()" class="export-option">
                <i class="fas fa-file-excel"></i> Exportar para Excel
            </button>
            <button onclick="exportarParaPDF()" class="export-option">
                <i class="fas fa-file-pdf"></i> Exportar para PDF
            </button>
        `;
        
        // Posicionar o menu
        const rect = elements.exportBtn.getBoundingClientRect();
        exportMenu.style.position = 'fixed';
        exportMenu.style.top = `${rect.bottom + 5}px`;
        exportMenu.style.right = `${window.innerWidth - rect.right}px`;
        
        document.body.appendChild(exportMenu);
        
        // Remover o menu após clicar fora
        function closeMenu(e) {
            if (!exportMenu.contains(e.target) && e.target !== elements.exportBtn) {
                exportMenu.remove();
                document.removeEventListener('click', closeMenu);
            }
        }
        
        setTimeout(() => document.addEventListener('click', closeMenu), 100);
    }

    // Exportar para Excel
    function exportarParaExcel() {
        const filteredProdutos = filterProdutos(appState.produtos);
        
        // Criar tabela HTML para exportação
        let html = `
            <table border="1">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nome</th>
                        <th>Descrição</th>
                        <th>Categoria</th>
                        <th>Estoque</th>
                        <th>Preço Unit.</th>
                        <th>Valor Total</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        filteredProdutos.forEach(produto => {
            html += `
                <tr>
                    <td>${produto.id}</td>
                    <td>${escapeHtml(produto.nome)}</td>
                    <td>${escapeHtml(produto.descricao || '')}</td>
                    <td>${produto.tipo || '-'}</td>
                    <td>${produto.estoque}</td>
                    <td>R$ ${produto.preco.toFixed(2)}</td>
                    <td>R$ ${(produto.preco * produto.estoque).toFixed(2)}</td>
                    <td>${produto.status || 'Inativo'}</td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
        `;
        
        const nomeArquivo = `estoque_${new Date().toISOString().split('T')[0]}.xls`;
        
        // Criar blob e fazer download
        const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = nomeArquivo;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification('Exportação para Excel realizada com sucesso!', 'success');
    }

    // Exportar para PDF
    function exportarParaPDF() {
        const filteredProdutos = filterProdutos(appState.produtos);
        
        // Criar conteúdo HTML para o PDF
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Relatório de Estoque</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    h1 { color: #333; text-align: center; margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f5f5f5; font-weight: bold; }
                    .header-info { margin-bottom: 20px; }
                    .summary { background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
                </style>
            </head>
            <body>
                <h1>Relatório de Estoque - NexoERP</h1>
                
                <div class="header-info">
                    <p><strong>Data de emissão:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
                    <p><strong>Total de itens:</strong> ${filteredProdutos.length}</p>
                    <p><strong>Valor total em estoque:</strong> R$ ${filteredProdutos.reduce((sum, p) => sum + (p.preco * p.estoque), 0).toFixed(2)}</p>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nome</th>
                            <th>Descrição</th>
                            <th>Categoria</th>
                            <th>Estoque</th>
                            <th>Preço Unit.</th>
                            <th>Valor Total</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredProdutos.map(produto => `
                            <tr>
                                <td>${produto.id}</td>
                                <td>${escapeHtml(produto.nome)}</td>
                                <td>${escapeHtml(produto.descricao || '')}</td>
                                <td>${produto.tipo || '-'}</td>
                                <td>${produto.estoque}</td>
                                <td>R$ ${produto.preco.toFixed(2)}</td>
                                <td>R$ ${(produto.preco * produto.estoque).toFixed(2)}</td>
                                <td>${produto.status || 'Inativo'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div style="margin-top: 30px; text-align: center; color: #666;">
                    <p>Relatório gerado automaticamente pelo Sistema NexoERP</p>
                </div>
            </body>
            </html>
        `;
        
        // Abrir em nova janela para impressão/salvar como PDF
        const printWindow = window.open('', '_blank');
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        // Aguardar o carregamento e então imprimir/salvar como PDF
        printWindow.onload = function() {
            printWindow.print();
        };
        
        showNotification('PDF gerado com sucesso! Use a opção "Salvar como PDF" na impressora.', 'success');
    }

    // Funções auxiliares
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

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

function showLoadingState() {
    if (elements.inventoryTableBody) {
        elements.inventoryTableBody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 40px;">
                    <i class="fas fa-spinner fa-spin"></i>
                </td>
            </tr>
        `;
    }
    if (elements.cardsView) {
        elements.cardsView.innerHTML = `
            <div style="text-align: center; padding: 40px; grid-column: 1 / -1;">
                <i class="fas fa-spinner fa-spin"></i> 
            </div>
        `;
    }
}

function hideLoadingState() {
    // Implementação opcional para esconder loading
}

function showError(message) {
    showNotification(message, 'error');
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation-triangle' : 'info'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Expor funções globais
window.changePage = changePage;
window.editarProduto = editarProduto;
window.novoProduto = novoProduto;
window.confirmarExclusao = confirmarExclusao;
window.exportarParaExcel = exportarParaExcel;
window.exportarParaPDF = exportarParaPDF;
window.showExportOptions = showExportOptions;