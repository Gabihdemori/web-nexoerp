
const API_CONFIG = {
    PRODUTOS: "https://api-nexoerp.vercel.app/api/produtos"
};

// Estado da aplicação para produtos
const appState = {
    produtos: [],
    currentPage: 1,
    itemsPerPage: 10,
    searchTerm: '',
    filters: {
        tipo: '',
        status: '',
        stock: ''
    },
    metrics: {
        total: 0,
        produtos: 0,
        servicos: 0,
        estoqueBaixo: 0
    },
    currentView: 'table'
};

// Elementos DOM para produtos
const elements = {
    productsTableBody: document.getElementById('productsTableBody'),
    cardsView: document.getElementById('cardsView'),
    pagination: document.getElementById('pagination'),
    searchFilter: document.getElementById('searchFilter'),
    typeFilter: document.getElementById('typeFilter'),
    statusFilter: document.getElementById('statusFilter'),
    stockFilter: document.getElementById('stockFilter'),
    itemsPerPage: document.getElementById('itemsPerPage'),
    totalItems: document.getElementById('totalItems'),
    totalProducts: document.getElementById('totalProducts'),
    totalServices: document.getElementById('totalServices'),
    lowStock: document.getElementById('lowStock'),
    tableView: document.getElementById('tableView'),
    cardsViewContainer: document.getElementById('cardsView'),
    viewButtons: document.querySelectorAll('.view-btn'),
    addProductBtn: document.getElementById('addProductBtn')
};

// Função para debug
function debugFormulario() {
    console.log('Elementos do formulário:');
    console.log('produtoId:', document.getElementById('produtoId'));
    console.log('nome:', document.getElementById('nome'));
    console.log('tipo:', document.getElementById('tipo'));
    console.log('preco:', document.getElementById('preco'));
    console.log('estoque:', document.getElementById('estoque'));
    console.log('status:', document.getElementById('status'));
    console.log('descricao:', document.getElementById('descricao'));
}
// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    try {
        await loadProdutosData();
        setupEventListeners();
        setupViewToggle();
        updateLastAccess();
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showNotification('Erro ao carregar a página: ' + error.message, 'error');
    }
}

function setupEventListeners() {
    if (elements.typeFilter) {
        elements.typeFilter.addEventListener('change', handleFilterChange);
    }
    if (elements.statusFilter) {
        elements.statusFilter.addEventListener('change', handleFilterChange);
    }
    if (elements.stockFilter) {
        elements.stockFilter.addEventListener('change', handleFilterChange);
    }
    if (elements.searchFilter) {
        elements.searchFilter.addEventListener('input', debounce(handleSearch, 300));
    }
    if (elements.itemsPerPage) {
        elements.itemsPerPage.addEventListener('change', handleItemsPerPageChange);
    }
    if (elements.addProductBtn) {
        elements.addProductBtn.addEventListener('click', novoProduto);
    }

    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal-overlay')) {
            e.target.remove();
        }
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modal = document.querySelector('.modal-overlay');
            if (modal) modal.remove();
        }
    });
}

function setupViewToggle() {
    elements.viewButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const viewType = this.getAttribute('data-view');
            elements.viewButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            appState.currentView = viewType;
            
            if (viewType === 'table') {
                elements.tableView.style.display = 'block';
                elements.cardsViewContainer.style.display = 'none';
            } else {
                elements.tableView.style.display = 'none';
                elements.cardsViewContainer.style.display = 'grid';
            }
            
            renderProdutos();
        });
    });
}

async function loadProdutosData() {
    try {
        showLoadingState();
        
        const queryParams = new URLSearchParams();
        
        // Adicionar filtro de tipo (converte para o valor esperado pelo backend)
        console.log('Filtro de tipo atual:', appState.filters.tipo);
        if (appState.filters.tipo && appState.filters.tipo !== 'all') {
            const tipoMap = {
                'product': 'Produto',
                'service': 'Servico'
            };
            const tipoValue = tipoMap[appState.filters.tipo];
            console.log('Convertendo tipo para:', tipoValue);
            queryParams.append('tipo', tipoValue);
        }
        
        // Adicionar filtro de status
        if (appState.filters.status && appState.filters.status !== 'all') {
            queryParams.append('status', appState.filters.status);
        }
        
        // Adicionar termo de busca
        if (appState.searchTerm) {
            queryParams.append('search', appState.searchTerm);
        }
        
        // Adicionar paginação
        queryParams.append('page', appState.currentPage);
        queryParams.append('limit', appState.itemsPerPage);
        
        const url = `${API_CONFIG.PRODUTOS}?${queryParams}`;
        console.log('🔍 URL da requisição:', url);
        
        const produtosData = await fetchData(url);
        
        // Armazenar os produtos recebidos
        appState.produtos = produtosData.produtos || [];
        console.log('Produtos recebidos:', appState.produtos);
        appState.paginacao = produtosData.paginacao || {};
        
        calculateMetrics(appState.produtos);
        renderProdutos();
        renderMetrics();
        renderPagination();
        
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        showNotification('Erro ao carregar produtos: ' + error.message, 'error');
    } finally {
        hideLoadingState();
    }
}

function calculateMetrics(produtos) {
    appState.metrics.total = produtos.length;
    appState.metrics.produtos = produtos.filter(p => p.tipo === 'Produto').length;
    appState.metrics.servicos = produtos.filter(p => p.tipo === 'Servico').length;
    appState.metrics.estoqueBaixo = produtos.filter(p => p.estoque <= 10 && p.estoque > 0).length;
}

function renderMetrics() {
    if (elements.totalItems) elements.totalItems.textContent = appState.metrics.total.toLocaleString();
    if (elements.totalProducts) elements.totalProducts.textContent = appState.metrics.produtos.toLocaleString();
    if (elements.totalServices) elements.totalServices.textContent = appState.metrics.servicos.toLocaleString();
    if (elements.lowStock) elements.lowStock.textContent = appState.metrics.estoqueBaixo.toLocaleString();
}

function handleFilterChange(e) {
    const filterName = e.target.id.replace('Filter', '');
    appState.filters[filterName] = e.target.value;
    console.log(`Filtro ${filterName} alterado para:`, e.target.value);
    appState.currentPage = 1;
    loadProdutosData();
}

function handleSearch(e) {
    appState.searchTerm = e.target.value.trim();
    appState.currentPage = 1;
    loadProdutosData();
}

function handleItemsPerPageChange(e) {
    appState.itemsPerPage = parseInt(e.target.value);
    appState.currentPage = 1;
    loadProdutosData();
}

function renderProdutos() {
    // Primeiro, aplicar filtro de estoque (client-side) se necessário
    let produtosExibicao = [...appState.produtos];
    if (appState.filters.stock && appState.filters.stock !== 'all') {
        produtosExibicao = filterProdutos(produtosExibicao);
    }
    
    const paginatedProdutos = paginateProdutos(produtosExibicao);
    
    if (appState.currentView === 'table') {
        renderTableView(paginatedProdutos, produtosExibicao.length);
    } else {
        renderCardsView(paginatedProdutos, produtosExibicao.length);
    }
    
    renderPagination(produtosExibicao.length);
}

function filterProdutos(produtos) {
    return produtos.filter(produto => {
        // Filtro de estoque client-side
        if (appState.filters.stock === 'out') {
            return produto.estoque === 0 || produto.estoque === null;
        } else if (appState.filters.stock === 'available') {
            return produto.estoque > 0;
        } else if (appState.filters.stock === 'low') {
            return produto.estoque <= 10 && produto.estoque > 0;
        }
        return true;
    });
}

function paginateProdutos(produtos) {
    const startIndex = (appState.currentPage - 1) * appState.itemsPerPage;
    const endIndex = startIndex + appState.itemsPerPage;
    return produtos.slice(startIndex, endIndex);
}

function renderTableView(produtos, totalProdutos) {
    if (!elements.productsTableBody) return;

    if (produtos.length === 0) {
        elements.productsTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                        <i class="fas fa-box-open" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                        <p style="font-size: 1.1rem; margin: 0;">Nenhum produto encontrado</p>
                        <small style="font-size: 0.9rem;">Tente ajustar os filtros ou adicionar um novo produto</small>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    elements.productsTableBody.innerHTML = produtos.map(produto => `
        <tr>
            <td>
                <span class="type-badge ${produto.tipo === 'Servico' ? 'service' : 'product'}">
                    <i class="fas ${produto.tipo === 'Servico' ? 'fa-concierge-bell' : 'fa-box'}"></i>
                    ${produto.tipo === 'Servico' ? 'Serviço' : 'Produto'}
                </span>
            </td>
            <td>
                <div class="product-info">
                    <strong>${escapeHtml(produto.nome || 'Não informado')}</strong>
                    ${produto.codigo ? `<small>#${produto.codigo}</small>` : ''}
                </div>
            </td>
            <td>${escapeHtml(produto.descricao || 'Sem descrição')}</td>
            <td class="price-cell">R$ ${(produto.preco ?? 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td>
                <span class="stock-badge ${getStockClass(produto.estoque)}">
                    ${produto.estoque ?? 0}
                </span>
            </td>
            <td>
                <span class="status-badge ${produto.status === 'Ativo' ? 'status-active' : 'status-inactive'}">
                    ${produto.status || 'Inativo'}
                </span>
            </td>
            <td>
                <div class="actions-cell">
                    <button class="btn-action btn-view" onclick="mostrarDetalhesProduto(${produto.id})" data-tooltip="Visualizar">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-action btn-edit" onclick="editarProduto(${produto.id})" data-tooltip="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="confirmarExclusao(${produto.id}, '${escapeHtml(produto.nome)}')" data-tooltip="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function renderCardsView(produtos, totalProdutos) {
    if (!elements.cardsViewContainer) return;

    if (produtos.length === 0) {
        elements.cardsViewContainer.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-secondary);">
                <i class="fas fa-box-open" style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <h3 style="margin: 0 0 0.5rem 0; color: var(--text-muted);">Nenhum produto encontrado</h3>
                <p style="margin: 0;">Tente ajustar os filtros ou adicionar um novo produto</p>
            </div>
        `;
        return;
    }
    
    elements.cardsViewContainer.innerHTML = produtos.map(produto => `
        <div class="product-card">
            <div class="card-header">
                <div class="product-avatar">
                    <i class="fas ${produto.tipo === 'Servico' ? 'fa-concierge-bell' : 'fa-box'}"></i>
                </div>
                <div class="product-info">
                    <h3>${escapeHtml(produto.nome || 'Não informado')}</h3>
                    <p class="product-type">${produto.tipo === 'Servico' ? 'Serviço' : 'Produto'}</p>
                </div>
                <span class="status-badge ${produto.status === 'Ativo' ? 'status-active' : 'status-inactive'}">
                    ${produto.status || 'Inativo'}
                </span>
            </div>
            
            <div class="card-body">
                <div class="description-info">
                    <p><i class="fas fa-align-left"></i> ${escapeHtml(produto.descricao || 'Sem descrição')}</p>
                </div>
                
                <div class="price-info">
                    <p><i class="fas fa-tag"></i> R$ ${(produto.preco ?? 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                </div>
                
                <div class="product-meta">
                    <div class="meta-item">
                        <span class="meta-label">Estoque</span>
                        <span class="meta-value stock-badge ${getStockClass(produto.estoque)}">${produto.estoque ?? 0}</span>
                    </div>
                    
                </div>
            </div>
            
            <div class="card-actions">
                <button class="btn btn-secondary btn-sm" onclick="mostrarDetalhesProduto(${produto.id})">
                    <i class="fas fa-eye"></i> Detalhes
                </button>
                <button class="btn btn-primary btn-sm" onclick="editarProduto(${produto.id})">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn btn-danger btn-sm" onclick="confirmarExclusao(${produto.id}, '${escapeHtml(produto.nome)}')">
                    <i class="fas fa-trash"></i> Excluir
                </button>
            </div>
        </div>
    `).join('');
}

function renderPagination(totalProdutos) {
    if (!elements.pagination) return;

    const totalPages = Math.ceil(totalProdutos / appState.itemsPerPage);
    
    if (totalPages <= 1) {
        elements.pagination.innerHTML = '';
        return;
    }
    
    let paginationHTML = `
        <div class="pagination-info">
            Mostrando ${Math.min(appState.itemsPerPage, totalProdutos)} de ${totalProdutos} produtos
        </div>
        <div class="pagination-controls">
    `;
    
    paginationHTML += `
        <button class="pagination-btn" ${appState.currentPage === 1 ? 'disabled' : ''} onclick="changePage(${appState.currentPage - 1})">
            <i class="fas fa-chevron-left"></i>
        </button>
    `;
    
    const maxVisiblePages = 5;
    let startPage = Math.max(1, appState.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    if (startPage > 1) {
        paginationHTML += `<button class="pagination-btn" onclick="changePage(1)">1</button>`;
        if (startPage > 2) {
            paginationHTML += `<span class="pagination-ellipsis">...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button class="pagination-btn ${i === appState.currentPage ? 'active' : ''}" onclick="changePage(${i})">
                ${i}
            </button>
        `;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<span class="pagination-ellipsis">...</span>`;
        }
        paginationHTML += `<button class="pagination-btn" onclick="changePage(${totalPages})">${totalPages}</button>`;
    }
    
    paginationHTML += `
        <button class="pagination-btn" ${appState.currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${appState.currentPage + 1})">
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    paginationHTML += `</div>`;
    elements.pagination.innerHTML = paginationHTML;
}

// ========== MODAL DE DETALHES DO PRODUTO ==========
async function mostrarDetalhesProduto(produtoId) {
    try {
        const produto = await fetchData(`${API_CONFIG.PRODUTOS}/${produtoId}`);
        mostrarModalDetalhes(produto);
    } catch (error) {
        console.error('Erro ao carregar detalhes do produto:', error);
        showNotification('Erro ao carregar detalhes do produto', 'error');
    }
}

function mostrarModalDetalhes(produto) {
    const precoFormatado = (produto.preco ?? 0).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    /* É AQUI QUE MUDA - Aumente o max-width para caber mais conteúdo */
    const modalHTML = `
        <div class="modal-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
            <div class="modal-content" style="background: white; padding: 30px; border-radius: 12px; max-width: 800px; width: 95%; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px;">
                    <h3 style="margin: 0; color: #333;">Detalhes do Produto</h3>
                    <button onclick="this.closest('.modal-overlay').remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666;">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <!-- Coluna 1: Informações Básicas -->
                        <div class="info-section">
                            <h4 style="margin: 0 0 15px 0; color: #555; border-bottom: 2px solid #007bff; padding-bottom: 5px;">Informações Básicas</h4>
                            <div class="detail-grid" style="display: grid; gap: 12px;">
                                <div class="detail-row">
                                    <strong style="color: #333;">Nome:</strong> 
                                    <span>${produto.nome || 'Não informado'}</span>
                                </div>
                                
                                <div class="detail-row">
                                    <strong style="color: #333;">Tipo:</strong> 
                                    <span class="type-badge ${produto.tipo === 'Servico' ? 'service' : 'product'}">
                                        ${produto.tipo === 'Servico' ? 'Serviço' : 'Produto'}
                                    </span>
                                </div>
                                <div class="detail-row">
                                    <strong style="color: #333;">Preço:</strong> 
                                    <span style="font-weight: bold; color: #28a745;">R$ ${precoFormatado}</span>
                                </div>
                                <div class="detail-row">
                                    <strong style="color: #333;">Status:</strong> 
                                    <span class="status-badge ${produto.status === 'Ativo' ? 'status-active' : 'status-inactive'}">
                                        ${produto.status || 'Inativo'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- Coluna 2: Estoque e Métricas -->
                        <div class="info-section">
                            <h4 style="margin: 0 0 15px 0; color: #555; border-bottom: 2px solid #28a745; padding-bottom: 5px;">Estoque e Métricas</h4>
                            <div class="detail-grid" style="display: grid; gap: 12px;">
                                <div class="detail-row">
                                    <strong style="color: #333;">Estoque Atual:</strong> 
                                    <span class="stock-badge ${getStockClass(produto.estoque)}">
                                        ${produto.estoque ?? 0}
                                    </span>
                                </div>
                                
                            </div>
                        </div>
                    </div>

                    <!-- Descrição -->
                    <div class="info-section" style="margin-top: 20px;">
                        <h4 style="margin: 0 0 15px 0; color: #555; border-bottom: 2px solid #ffc107; padding-bottom: 5px;">Descrição</h4>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #ffc107;">
                            <p style="margin: 0; color: #666; line-height: 1.5;">${produto.descricao || 'Nenhuma descrição cadastrada.'}</p>
                        </div>
                    </div>

                    <!-- Informações do Sistema -->
                    <div class="info-section" style="margin-top: 20px;">
                        <h4 style="margin: 0 0 15px 0; color: #555; border-bottom: 2px solid #6c757d; padding-bottom: 5px;">Informações do Sistema</h4>
                        <div class="detail-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                            <div class="detail-row">
                                <strong style="color: #333;">Criado por:</strong> 
                                <span>${produto.usuario ? produto.usuario.nome : 'Usuário não encontrado'}</span>
                            </div>
                            <div class="detail-row">
                                <strong style="color: #333;">Criado em:</strong> 
                                <span>${produto.criadoEm || 'Não informado'}</span>
                            </div>
                            <div class="detail-row">
                                <strong style="color: #333;">Atualizado em:</strong> 
                                <span>${produto.atualizadoEm || 'Não informado'}</span>
                            </div>
                            <div class="detail-row">
                                <strong style="color: #333;">Última Atualização:</strong> 
                                <span>${produto.ultimaAtualizacao || 'Não informado'}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer" style="margin-top: 25px; display: flex; gap: 10px; justify-content: flex-end; border-top: 1px solid #eee; padding-top: 20px;">
                    <button onclick="editarProduto(${produto.id})" class="btn btn-primary">
                        <i class="fas fa-edit"></i> Editar Produto
                    </button>
                    <button onclick="this.closest('.modal-overlay').remove()" class="btn btn-secondary">Fechar</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// ========== MODAL DE EDIÇÃO DO PRODUTO ==========
async function editarProduto(produtoId) {
    try {
        const produto = await fetchData(`${API_CONFIG.PRODUTOS}/${produtoId}`);
        mostrarModalEdicao(produto);
    } catch (error) {
        console.error('Erro ao carregar dados do produto para edição:', error);
        showNotification('Erro ao carregar dados do produto', 'error');
    }
}

function mostrarModalEdicao(produto) {
    /* É AQUI QUE MUDA - Aumente o max-width para caber todos os campos */
    const modalHTML = `
        <div class="modal-overlay edicao-produto-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
            <div class="modal-content" style="background: white; padding: 30px; border-radius: 12px; max-width: 900px; width: 95%; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px;">
                    <h3 style="margin: 0; color: #333;">Editar Produto</h3>
                    <button class="close-modal" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666;">&times;</button>
                </div>
                <form id="produto-edit-form">
                    <input type="hidden" id="produtoId" value="${produto.id}">
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <!-- Coluna 1: Informações Básicas -->
                        <div class="form-section">
                            <h4 style="margin: 0 0 15px 0; color: #555; border-bottom: 2px solid #007bff; padding-bottom: 5px;">Informações Básicas</h4>
                            
                            <div class="form-group" style="margin-bottom: 15px;">
                                <label for="nome" style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Nome *</label>
                                <input type="text" id="nome" value="${produto.nome || ''}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;" required>
                            </div>

                           
                            <div class="form-group" style="margin-bottom: 15px;">
                                <label for="tipo" style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Tipo *</label>
                                <select id="tipo" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;" required>
                                    <option value="Produto" ${produto.tipo === 'Produto' ? 'selected' : ''}>Produto</option>
                                    <option value="Servico" ${produto.tipo === 'Servico' ? 'selected' : ''}>Serviço</option>
                                </select>
                            </div>

                            <div class="form-group" style="margin-bottom: 15px;">
                                <label for="preco" style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Preço (R$) *</label>
                                <input type="number" id="preco" step="0.01" min="0" value="${produto.preco || 0}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;" required>
                            </div>

                            <div class="form-group" style="margin-bottom: 15px;">
                                <label for="status" style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Status *</label>
                                <select id="status" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;" required>
                                    <option value="Ativo" ${produto.status === 'Ativo' ? 'selected' : ''}>Ativo</option>
                                    <option value="Inativo" ${produto.status === 'Inativo' ? 'selected' : ''}>Inativo</option>
                                </select>
                            </div>
                        </div>

                        <!-- Coluna 2: Estoque e Detalhes -->
                        <div class="form-section">
                            <h4 style="margin: 0 0 15px 0; color: #555; border-bottom: 2px solid #28a745; padding-bottom: 5px;">Estoque</h4>
                            
                            <div class="form-group" style="margin-bottom: 15px;">
                                <label for="estoque" style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Estoque *</label>
                                <input type="number" id="estoque" min="0" value="${produto.estoque || 0}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;" required>
                            </div>

                                                     

                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                                
                            </div>
                        </div>
                    </div>

                    <!-- Descrição -->
                    <div class="form-section" style="margin-top: 20px;">
                        <h4 style="margin: 0 0 15px 0; color: #555; border-bottom: 2px solid #ffc107; padding-bottom: 5px;">Descrição</h4>
                        <div class="form-group" style="margin-bottom: 15px;">
                            <textarea id="descricao" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; resize: vertical; min-height: 100px;" placeholder="Digite a descrição do produto...">${produto.descricao || ''}</textarea>
                        </div>
                    </div>

                    <div id="errorMsg" style="display: none; background: #fee; color: #c33; padding: 12px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #dc3545;"></div>
                    <div id="successMsg" style="display: none; background: #efe; color: #363; padding: 12px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #28a745;"></div>

                    <div class="modal-footer" style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 25px; border-top: 1px solid #eee; padding-top: 20px;">
                        <button type="button" class="btn btn-danger" onclick="confirmarExclusaoProduto(${produto.id}, '${escapeHtml(produto.nome)}')" style="padding: 10px 20px; background: #dc3545; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
                            <i class="fas fa-trash"></i> Excluir
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="fecharModalEdicao()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
                            Cancelar
                        </button>
                        <button type="submit" class="btn btn-primary" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
                            <i class="fas fa-save"></i> Salvar Alterações
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    configurarModalEdicao();
}

function configurarModalEdicao() {
    const modal = document.querySelector('.edicao-produto-modal');
    const form = document.getElementById('produto-edit-form');
    const closeBtn = modal.querySelector('.close-modal');

    closeBtn.addEventListener('click', fecharModalEdicao);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            fecharModalEdicao();
        }
    });

    form.addEventListener('submit', handleSubmitEdicao);
}

function fecharModalEdicao() {
    const modal = document.querySelector('.edicao-produto-modal');
    if (modal) {
        modal.remove();
    }
}

async function handleSubmitEdicao(e) {
    e.preventDefault();
    
    // DEBUG TEMPORÁRIO
    debugFormulario();
    
    const form = document.getElementById('produto-edit-form');
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
    submitBtn.disabled = true;

    try {
        const formData = obterDadosFormulario();
        await atualizarProduto(formData);
        
    } catch (error) {
        console.error('Erro:', error);
        mostrarErroModal(error.message || 'Erro ao salvar alterações');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function obterDadosFormulario() {
    // Verificar se todos os elementos existem antes de acessá-los
    const produtoIdElement = document.getElementById('produtoId');
    const nomeElement = document.getElementById('nome');
    const tipoElement = document.getElementById('tipo');
    const precoElement = document.getElementById('preco');
    const estoqueElement = document.getElementById('estoque');
    const statusElement = document.getElementById('status');
    const descricaoElement = document.getElementById('descricao');

    // Verificar se os elementos obrigatórios existem
    if (!produtoIdElement || !nomeElement || !tipoElement || !precoElement || !estoqueElement || !statusElement) {
        throw new Error('Erro: Alguns campos do formulário não foram encontrados.');
    }

    const dados = {
        nome: nomeElement.value.trim(),
        tipo: tipoElement.value,
        preco: parseFloat(precoElement.value),
        estoque: parseInt(estoqueElement.value),
        status: statusElement.value,
        descricao: descricaoElement ? descricaoElement.value.trim() || null : null,
    };

    // Validações básicas
    if (!dados.nome) {
        throw new Error('Nome é obrigatório');
    }
    if (isNaN(dados.preco) || dados.preco < 0) {
        throw new Error('Preço deve ser um número válido e não negativo');
    }
    if (isNaN(dados.estoque) || dados.estoque < 0) {
        throw new Error('Estoque deve ser um número válido e não negativo');
    }

    return { 
        produtoId: produtoIdElement.value, 
        dados 
    };
}
async function atualizarProduto({ produtoId, dados }) {
    try {
        // Validações básicas
        if (!dados.nome || dados.preco < 0 || dados.estoque < 0) {
            throw new Error('Dados inválidos. Verifique os campos obrigatórios.');
        }

        const response = await fetch(`${API_CONFIG.PRODUTOS}/${produtoId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dados)
        });

        const result = await response.json();

        if (response.ok) {
            mostrarSucessoModal('Produto atualizado com sucesso!');
            
            setTimeout(() => {
                fecharModalEdicao();
                loadProdutosData(); // Recarregar a lista
            }, 1500);
        } else {
            const errorMessage = result.error || result.detalhes || result.message || 'Erro ao atualizar produto';
            throw new Error(errorMessage);
        }
    } catch (error) {
        throw error;
    }
}

function confirmarExclusaoProduto(produtoId, produtoNome) {
    const modalHTML = `
        <div class="modal-overlay confirmacao-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1001;">
            <div class="modal-content" style="background: white; padding: 30px; border-radius: 12px; max-width: 400px; width: 90%;">
                <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin: 0;">Confirmar Exclusão</h3>
                    <button class="close-confirmacao" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Tem certeza que deseja excluir o produto <strong>${escapeHtml(produtoNome)}</strong>?</p>
                    <p style="color: #dc3545; font-size: 0.9rem; margin-top: 10px;">Esta ação não pode ser desfeita.</p>
                </div>
                <div class="modal-footer" style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                    <button type="button" class="btn btn-secondary" onclick="fecharModalConfirmacao()" style="padding: 10px 15px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Cancelar</button>
                    <button type="button" class="btn btn-danger" onclick="excluirProdutoModal()" style="padding: 10px 15px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">Excluir</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    const modal = document.querySelector('.confirmacao-modal');
    const closeBtn = modal.querySelector('.close-confirmacao');
    
    closeBtn.addEventListener('click', fecharModalConfirmacao);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            fecharModalConfirmacao();
        }
    });

    // Armazenar o ID do produto para exclusão
    window.produtoParaExcluir = produtoId;
}

function fecharModalConfirmacao() {
    const modal = document.querySelector('.confirmacao-modal');
    if (modal) {
        modal.remove();
    }
    window.produtoParaExcluir = null;
}

async function excluirProdutoModal() {
    if (!window.produtoParaExcluir) return;
    
    try {
        await fetchData(`${API_CONFIG.PRODUTOS}/${window.produtoParaExcluir}`, {
            method: 'DELETE'
        });

        mostrarSucessoModal('Produto excluído com sucesso!');
        fecharModalConfirmacao();
        
        setTimeout(() => {
            fecharModalEdicao();
            loadProdutosData();
        }, 1500);
    } catch (error) {
        console.error('Erro:', error);
        mostrarErroModal(error.message);
    } finally {
        window.produtoParaExcluir = null;
    }
}

function mostrarErroModal(mensagem) {
    const errorDiv = document.getElementById('errorMsg');
    errorDiv.textContent = mensagem;
    errorDiv.style.display = 'block';
    document.getElementById('successMsg').style.display = 'none';
}

function mostrarSucessoModal(mensagem) {
    const successDiv = document.getElementById('successMsg');
    successDiv.textContent = mensagem;
    successDiv.style.display = 'block';
    document.getElementById('errorMsg').style.display = 'none';
}

// ========== FUNÇÕES DE APOIO ==========
function changePage(page) {
    appState.currentPage = page;
    loadProdutosData();
    window.scrollTo(0, 0);
}

function novoProduto() {
    window.location.href = 'Nova Tabela/novo_produto.html';
}

function getStockClass(estoque) {
    if (estoque === 0) return 'out-of-stock';
    if (estoque <= 10) return 'low-stock';
    return 'in-stock';
}

let currentProdutoToDelete = null;

function confirmarExclusao(produtoId, produtoNome) {
    currentProdutoToDelete = produtoId;
    
    const modalHTML = `
        <div class="modal-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
            <div class="modal-content" style="background: white; padding: 30px; border-radius: 12px; max-width: 400px; width: 90%;">
                <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin: 0;">Confirmar Exclusão</h3>
                    <button onclick="this.closest('.modal-overlay').remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
                </div>
                <div class="modal-body">
                    <p style="margin-bottom: 20px;">Tem certeza que deseja excluir o produto <strong>"${escapeHtml(produtoNome)}"</strong>? Esta ação não pode ser desfeita.</p>
                </div>
                <div class="modal-footer" style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button onclick="this.closest('.modal-overlay').remove()" class="btn btn-secondary">Cancelar</button>
                    <button onclick="executarExclusao()" class="btn btn-danger">Excluir</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

async function executarExclusao() {
    if (!currentProdutoToDelete) return;
    
    try {
        await fetchData(`${API_CONFIG.PRODUTOS}/${currentProdutoToDelete}`, {
            method: 'DELETE'
        });
        
        showNotification('Produto excluído com sucesso!', 'success');
        await loadProdutosData();
        
    } catch (error) {
        console.error('Erro ao excluir produto:', error);
        showNotification('Erro ao excluir produto: ' + error.message, 'error');
    } finally {
        currentProdutoToDelete = null;
        const modals = document.querySelectorAll('.modal-overlay');
        modals.forEach(modal => modal.remove());
    }
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

async function fetchData(url) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login.html';
            throw new Error('Não autenticado');
        }
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Erro no fetchData:', error);
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
    if (elements.productsTableBody) {
        elements.productsTableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px;">
                    <div class="loading-spinner"></div>
                    <p style="margin-top: 1rem; color: var(--text-secondary);">Carregando produtos...</p>
                </td>
            </tr>
        `;
    }
    if (elements.cardsViewContainer) {
        elements.cardsViewContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; grid-column: 1 / -1;">
                <div class="loading-spinner"></div>
                <p style="margin-top: 1rem; color: var(--text-secondary);">Carregando produtos...</p>
            </div>
        `;
    }
}

function hideLoadingState() {
    // Loading state é removido quando os dados são renderizados
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        border-left: 4px solid ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--error)' : 'var(--primary)'};
        z-index: 1000;
        max-width: 400px;
        animation: slideInRight 0.3s ease;
    `;
    
    notification.innerHTML = `
        <div class="notification-content" style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation-triangle' : 'info'}" 
               style="color: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--error)' : 'var(--primary)'};"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

function updateLastAccess() {
    const lastAccessElement = document.getElementById('lastAccess');
    if (lastAccessElement) {
        const now = new Date();
        lastAccessElement.textContent = now.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Expor funções globais
window.changePage = changePage;
window.confirmarExclusao = confirmarExclusao;
window.editarProduto = editarProduto;
window.novoProduto = novoProduto;
window.mostrarDetalhesProduto = mostrarDetalhesProduto;
window.executarExclusao = executarExclusao;
window.fecharModalEdicao = fecharModalEdicao;
window.fecharModalConfirmacao = fecharModalConfirmacao;
window.excluirProdutoModal = excluirProdutoModal;
window.confirmarExclusaoProduto = confirmarExclusaoProduto;

// Inicializar view padrão (tabela)
if (elements.tableView && elements.cardsViewContainer) {
    elements.tableView.style.display = 'block';
    elements.cardsViewContainer.style.display = 'none';
}