// clientes.js - VERSÃO COMPLETA E FUNCIONAL COM PAGINAÇÃO SERVER-SIDE

const API_CONFIG = {
    CLIENTES: "https://api-nexoerp.vercel.app/api/clientes"
};

// Estado da aplicação
const appState = {
    clientes: [],
    currentPage: 1,
    itemsPerPage: 10,
    searchTerm: '',
    filters: {
        tipo: '',
        cidade: ''
    },
    pagination: {
        total: 0,
        totalPages: 1
    },
    currentView: 'table'
};

// Elementos DOM
const elements = {
    clientsTableBody: document.getElementById('clientsTableBody'),
    cardsView: document.getElementById('cardsView'),
    pagination: document.getElementById('pagination'),
    searchFilter: document.getElementById('searchFilter'),
    typeFilter: document.getElementById('typeFilter'),
    cityFilter: document.getElementById('cityFilter'),
    itemsPerPage: document.getElementById('itemsPerPage'),
    totalClients: document.getElementById('totalClients'),
    activeClients: document.getElementById('activeClients'),
    newThisMonth: document.getElementById('newThisMonth'),
    differentCities: document.getElementById('differentCities'),
    tableView: document.getElementById('tableView'),
    cardsViewContainer: document.getElementById('cardsView'),
    viewButtons: document.querySelectorAll('.view-btn'),
    addClientBtn: document.getElementById('addClientBtn'),
    exportBtn: document.getElementById('exportBtn')
};

// ========== INICIALIZAÇÃO ==========
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    try {
        await loadClientesData();
        setupEventListeners();
        setupViewToggle();
        updateLastAccess();
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showNotification('Erro ao carregar a página: ' + error.message, 'error');
    }
}

// ========== CONFIGURAÇÃO DE EVENTOS ==========
function setupEventListeners() {
    // Filtros
    if (elements.typeFilter) {
        elements.typeFilter.addEventListener('change', () => {
            appState.filters.tipo = elements.typeFilter.value;
            appState.currentPage = 1;
            loadClientesData();
        });
    }

    if (elements.cityFilter) {
        elements.cityFilter.addEventListener('change', () => {
            appState.filters.cidade = elements.cityFilter.value;
            appState.currentPage = 1;
            loadClientesData();
        });
    }

    // Busca
    if (elements.searchFilter) {
        elements.searchFilter.addEventListener('input', debounce(() => {
            appState.searchTerm = elements.searchFilter.value;
            appState.currentPage = 1;
            loadClientesData();
        }, 500));
    }

    // Items por página
    if (elements.itemsPerPage) {
        elements.itemsPerPage.addEventListener('change', () => {
            appState.itemsPerPage = parseInt(elements.itemsPerPage.value);
            appState.currentPage = 1;
            loadClientesData();
        });
    }

    // Botões de ação
    if (elements.addClientBtn) {
        elements.addClientBtn.addEventListener('click', () => {
            window.location.href = 'Nova Tabela/novo_cliente.html';
        });
    }

    if (elements.exportBtn) {
        elements.exportBtn.addEventListener('click', showExportOptions);
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

// ========== CARREGAMENTO DE DADOS COM PAGINAÇÃO SERVER-SIDE ==========
async function loadClientesData() {
    try {
        showLoadingState();
        
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login.html';
            return;
        }

        // Construir URL com parâmetros para paginação server-side
        const params = new URLSearchParams();
        params.append('page', appState.currentPage);
        params.append('limit', appState.itemsPerPage);
        
        if (appState.searchTerm) params.append('search', appState.searchTerm);
        if (appState.filters.tipo) params.append('tipo', appState.filters.tipo);
        if (appState.filters.cidade) params.append('cidade', appState.filters.cidade);

        const url = `${API_CONFIG.CLIENTES}?${params.toString()}`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        // A API retorna { clientes: [], paginacao: {} } ou { data: [], pagination: {} }
        appState.clientes = result.clientes || result.data || [];
        
        // Configuração da paginação
        if (result.paginacao) {
            appState.pagination = {
                total: result.paginacao.total || 0,
                totalPages: result.paginacao.totalPages || 1,
                page: result.paginacao.page || appState.currentPage,
                limit: result.paginacao.limit || appState.itemsPerPage
            };
        } else if (result.pagination) {
            appState.pagination = result.pagination;
        } else {
            appState.pagination = {
                total: appState.clientes.length,
                totalPages: 1,
                page: appState.currentPage,
                limit: appState.itemsPerPage
            };
        }
        
        // Atualizar interface
        updateMetrics();
        populateCityFilter();
        renderClientes();
        renderPagination();
        
    } catch (error) {
        console.error('Erro ao carregar clientes:', error);
        showNotification('Erro ao carregar clientes: ' + error.message, 'error');
        
        if (error.message.includes('Failed to fetch')) {
            showNotification('Servidor indisponível. Verifique se o backend está rodando.', 'error');
        }
    } finally {
        hideLoadingState();
    }
}

function populateCityFilter() {
    if (!elements.cityFilter) return;
    
    // Buscar todas as cidades disponíveis da API
    const cidades = [...new Set(
        appState.clientes
            .map(cliente => cliente.cidade)
            .filter(cidade => cidade && cidade.trim() !== '')
            .map(cidade => cidade.trim())
    )].sort();
    
    elements.cityFilter.innerHTML = '<option value="">Todas as cidades</option>' + 
        cidades.map(cidade => `<option value="${cidade}">${cidade}</option>`).join('');
}

// ========== RENDERIZAÇÃO ==========
function renderClientes() {
    if (appState.currentView === 'table') {
        renderTableView();
    } else {
        renderCardsView();
    }
}

function renderTableView() {
    if (!elements.clientsTableBody) return;

    if (appState.clientes.length === 0) {
        elements.clientsTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                        <i class="fas fa-users" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                        <p style="font-size: 1.1rem; margin: 0;">Nenhum cliente encontrado</p>
                        <small style="font-size: 0.9rem;">Tente ajustar os filtros ou adicionar um novo cliente</small>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    elements.clientsTableBody.innerHTML = appState.clientes.map(cliente => `
        <tr>
            <td>
                <div class="user-cell">
                    <div class="user-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="user-info-small">
                        <div class="user-name">${escapeHtml(cliente.nome || 'Não informado')}</div>
                        <div class="user-email-small">${escapeHtml(cliente.email || 'Não informado')}</div>
                    </div>
                </div>
            </td>
            <td>
                <div class="documento-info">
                    <div>${cliente.cpf ? formatarCPF(cliente.cpf) : cliente.cnpj ? formatarCNPJ(cliente.cnpj) : '-'}</div>
                    <div class="tipo-label">${cliente.cnpj ? 'Pessoa Jurídica' : 'Pessoa Física'}</div>
                </div>
            </td>
            <td>
                <div class="contato-info">
                    <div class="telefone-small">${cliente.telefone ? formatarTelefone(cliente.telefone) : '-'}</div>
                </div>
            </td>
            <td>
                <div class="localizacao-info">
                    <div>${escapeHtml(cliente.cidade || '-')}</div>
                    <div class="estado-small">${cliente.estado || '-'}</div>
                </div>
            </td>
            <td>
                <div class="data-info">
                    ${cliente.dataNascimento ? formatarDataParaExibicao(cliente.dataNascimento) : '-'}
                </div>
            </td>
            <td>
                <div class="data-info">
                    ${cliente.criadoEm ? formatarDataHora(cliente.criadoEm) : '-'}
                </div>
            </td>
            <td>
                <div class="actions-cell">
                    <button class="btn-action btn-view" onclick="mostrarDetalhesCliente(${cliente.id})" data-tooltip="Visualizar">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-action btn-edit" onclick="editarCliente(${cliente.id})" data-tooltip="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="confirmarExclusao(${cliente.id}, '${escapeHtml(cliente.nome)}')" data-tooltip="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function renderCardsView() {
    if (!elements.cardsViewContainer) return;

    if (appState.clientes.length === 0) {
        elements.cardsViewContainer.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-secondary);">
                <i class="fas fa-users" style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <h3 style="margin: 0 0 0.5rem 0; color: var(--text-muted);">Nenhum cliente encontrado</h3>
                <p style="margin: 0;">Tente ajustar os filtros ou adicionar um novo cliente</p>
            </div>
        `;
        return;
    }
    
    elements.cardsViewContainer.innerHTML = appState.clientes.map(cliente => `
        <div class="client-card">
            <div class="card-header">
                <div class="client-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="client-info">
                    <h3>${escapeHtml(cliente.nome || 'Não informado')}</h3>
                    <p class="client-document">${cliente.cpf ? formatarCPF(cliente.cpf) : cliente.cnpj ? formatarCNPJ(cliente.cnpj) : 'Sem documento'}</p>
                </div>
            </div>
            
            <div class="card-body">
                <div class="contact-info">
                    <p><i class="fas fa-envelope"></i> ${escapeHtml(cliente.email || 'Não informado')}</p>
                    <p><i class="fas fa-phone"></i> ${cliente.telefone ? formatarTelefone(cliente.telefone) : 'Não informado'}</p>
                </div>
                
                <div class="location-info">
                    <p><i class="fas fa-map-marker-alt"></i> ${escapeHtml(cliente.cidade || 'Cidade não informada')}${cliente.estado ? ` - ${cliente.estado}` : ''}</p>
                </div>

                <div class="client-meta">
                    <div class="meta-item">
                        <span class="meta-label">Data Nasc.</span>
                        <span class="meta-value">${cliente.dataNascimento ? formatarDataParaExibicao(cliente.dataNascimento) : 'Não informada'}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Criado em</span>
                        <span class="meta-value">${cliente.criadoEm ? formatarDataHora(cliente.criadoEm) : 'Não informado'}</span>
                    </div>
                </div>
            </div>
            
            <div class="card-actions">
                <button class="btn btn-secondary btn-sm" onclick="mostrarDetalhesCliente(${cliente.id})">
                    <i class="fas fa-eye"></i> Detalhes
                </button>
                <button class="btn btn-primary btn-sm" onclick="editarCliente(${cliente.id})">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn btn-danger btn-sm" onclick="confirmarExclusao(${cliente.id}, '${escapeHtml(cliente.nome)}')">
                    <i class="fas fa-trash"></i> Excluir
                </button>
            </div>
        </div>
    `).join('');
}

// ========== PAGINAÇÃO SERVER-SIDE ==========
function renderPagination() {
    if (!elements.pagination) return;

    const pag = appState.pagination;
    const totalPages = pag.totalPages || 1;
    
    if (totalPages <= 1) {
        elements.pagination.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0;">
                <div>Mostrando ${appState.clientes.length} de ${pag.total || appState.clientes.length} clientes</div>
            </div>
        `;
        return;
    }
    
    let paginationHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0;">
            <div>Mostrando ${appState.clientes.length} de ${pag.total} clientes</div>
            <div style="display: flex; gap: 5px;">
    `;
    
    // Botão anterior
    paginationHTML += `
        <button onclick="changePage(${appState.currentPage - 1})" 
                ${appState.currentPage === 1 ? 'disabled' : ''}
                style="padding: 5px 10px; border: 1px solid #ddd; background: ${appState.currentPage === 1 ? '#f5f5f5' : 'white'}; color: ${appState.currentPage === 1 ? '#aaa' : '#333'}; cursor: ${appState.currentPage === 1 ? 'not-allowed' : 'pointer'}; border-radius: 4px;">
            <i class="fas fa-chevron-left"></i>
        </button>
    `;
    
    // Páginas
    const maxVisiblePages = 5;
    let startPage = Math.max(1, appState.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // Primeira página
    if (startPage > 1) {
        paginationHTML += `<button onclick="changePage(1)" style="padding: 5px 10px; border: 1px solid #ddd; background: white; cursor: pointer; border-radius: 4px;">1</button>`;
        if (startPage > 2) paginationHTML += `<span style="padding: 5px 10px;">...</span>`;
    }
    
    // Páginas do meio
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button onclick="changePage(${i})" 
                    style="padding: 5px 10px; border: 1px solid #ddd; background: ${i === appState.currentPage ? '#3498db' : 'white'}; color: ${i === appState.currentPage ? 'white' : '#333'}; cursor: pointer; border-radius: 4px;">
                ${i}
            </button>
        `;
    }
    
    // Última página
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) paginationHTML += `<span style="padding: 5px 10px;">...</span>`;
        paginationHTML += `<button onclick="changePage(${totalPages})" style="padding: 5px 10px; border: 1px solid #ddd; background: white; cursor: pointer; border-radius: 4px;">${totalPages}</button>`;
    }
    
    // Botão próximo
    paginationHTML += `
        <button onclick="changePage(${appState.currentPage + 1})" 
                ${appState.currentPage === totalPages ? 'disabled' : ''}
                style="padding: 5px 10px; border: 1px solid #ddd; background: ${appState.currentPage === totalPages ? '#f5f5f5' : 'white'}; color: ${appState.currentPage === totalPages ? '#aaa' : '#333'}; cursor: ${appState.currentPage === totalPages ? 'not-allowed' : 'pointer'}; border-radius: 4px;">
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    paginationHTML += `</div></div>`;
    elements.pagination.innerHTML = paginationHTML;
}

function changePage(page) {
    if (page >= 1 && page <= appState.pagination.totalPages) {
        appState.currentPage = page;
        loadClientesData();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// ========== MÉTRICAS ==========
function updateMetrics() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Calcular métricas baseadas nos clientes retornados
    const total = appState.pagination.total || appState.clientes.length;
    const novosEsteMes = appState.clientes.filter(cliente => {
        if (!cliente.criadoEm) return false;
        try {
            const dataCad = parseDate(cliente.criadoEm);
            return dataCad.getMonth() === currentMonth && dataCad.getFullYear() === currentYear;
        } catch {
            return false;
        }
    }).length;
    
    const cidadesDiferentes = new Set(
        appState.clientes
            .map(cliente => cliente.cidade)
            .filter(Boolean)
            .map(cidade => cidade.trim().toLowerCase())
    ).size;
    
    const comVendas = appState.clientes.filter(cliente => 
        cliente.totalVendas > 0
    ).length;
    
    // Atualizar elementos
    if (elements.totalClients) elements.totalClients.textContent = total.toLocaleString();
    if (elements.activeClients) elements.activeClients.textContent = total.toLocaleString();
    if (elements.newThisMonth) elements.newThisMonth.textContent = novosEsteMes.toLocaleString();
    if (elements.differentCities) elements.differentCities.textContent = cidadesDiferentes.toLocaleString();
}

// ========== TOGGLE DE VISUALIZAÇÃO ==========
function setupViewToggle() {
    if (!elements.viewButtons) return;
    
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
            
            renderClientes();
        });
    });
}

// ========== MODAL DE DETALHES ==========
async function mostrarDetalhesCliente(clienteId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_CONFIG.CLIENTES}/${clienteId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao carregar detalhes');
        }
        
        const result = await response.json();
        const cliente = result.data || result;
        mostrarModalDetalhes(cliente);
    } catch (error) {
        console.error('Erro:', error);
        showNotification('Erro ao carregar detalhes: ' + error.message, 'error');
    }
}

function mostrarModalDetalhes(cliente) {
    const usuarioCadastro = cliente.usuario ? cliente.usuario.nome : 
                          (cliente.usuarioNome || 'Sistema');
    
    const totalVendas = cliente.totalVendas || 
                       (cliente._count && cliente._count.vendas) || 
                       (cliente.vendas && cliente.vendas.length) || 
                       0;
    
    const observacoesCliente = cliente.observacoes || 'Nenhuma observação cadastrada.';

    const modalHTML = `
        <div class="modal-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px;">
            <div class="modal-content" style="background: white; padding: 30px; border-radius: 12px; max-width: 800px; width: 100%; max-height: 90vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px;">
                    <h3 style="margin: 0; color: #333;">Detalhes do Cliente</h3>
                    <button onclick="this.closest('.modal-overlay').remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666;">&times;</button>
                </div>
                <div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                        <div>
                            <h4 style="margin: 0 0 15px 0; color: #555;">Informações Pessoais</h4>
                            <div style="display: grid; gap: 10px;">
                                <div><strong>Nome:</strong> ${escapeHtml(cliente.nome || 'Não informado')}</div>
                                <div><strong>Email:</strong> ${escapeHtml(cliente.email || 'Não informado')}</div>
                                <div><strong>Telefone:</strong> ${cliente.telefone ? formatarTelefone(cliente.telefone) : 'Não informado'}</div>
                                <div><strong>CPF:</strong> ${cliente.cpf ? formatarCPF(cliente.cpf) : 'Não informado'}</div>
                                <div><strong>CNPJ:</strong> ${cliente.cnpj ? formatarCNPJ(cliente.cnpj) : 'Não informado'}</div>
                                <div><strong>Data Nasc.:</strong> ${cliente.dataNascimento ? formatarDataParaExibicao(cliente.dataNascimento) : 'Não informada'}</div>
                            </div>
                        </div>
                        <div>
                            <h4 style="margin: 0 0 15px 0; color: #555;">Endereço</h4>
                            <div style="display: grid; gap: 10px;">
                                <div><strong>CEP:</strong> ${cliente.cep || 'Não informado'}</div>
                                <div><strong>Rua:</strong> ${escapeHtml(cliente.rua || 'Não informado')}</div>
                                <div><strong>Número:</strong> ${cliente.numero || 'Não informado'}</div>
                                <div><strong>Complemento:</strong> ${escapeHtml(cliente.complemento || 'Não informado')}</div>
                                <div><strong>Bairro:</strong> ${escapeHtml(cliente.bairro || 'Não informado')}</div>
                                <div><strong>Cidade:</strong> ${escapeHtml(cliente.cidade || 'Não informado')}</div>
                                <div><strong>Estado:</strong> ${cliente.estado || 'Não informado'}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <h4 style="margin: 0 0 15px 0; color: #555;">Observações</h4>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 6px;">
                            <p style="margin: 0; color: #666;">${escapeHtml(observacoesCliente)}</p>
                        </div>
                    </div>
                    
                    <div>
                        <h4 style="margin: 0 0 15px 0; color: #555;">Informações do Sistema</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <div><strong>Cadastrado por:</strong> ${escapeHtml(usuarioCadastro)}</div>
                            <div><strong>Criado em:</strong> ${cliente.criadoEm ? formatarDataHora(cliente.criadoEm) : 'Não informado'}</div>
                            <div><strong>Atualizado em:</strong> ${cliente.atualizadoEm ? formatarDataHora(cliente.atualizadoEm) : 'Não informado'}</div>
                            <div><strong>Total de Vendas:</strong> ${totalVendas}</div>
                        </div>
                    </div>
                </div>
                <div style="margin-top: 25px; display: flex; gap: 10px; justify-content: flex-end; border-top: 1px solid #eee; padding-top: 20px;">
                    <button onclick="editarCliente(${cliente.id})" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button onclick="this.closest('.modal-overlay').remove()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer;">Fechar</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// ========== FUNÇÕES DE EDIÇÃO (mantidas do segundo código) ==========
async function editarCliente(clienteId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_CONFIG.CLIENTES}/${clienteId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao carregar dados do cliente');
        }

        const result = await response.json();
        const cliente = result.data || result;
        
        mostrarModalEdicao(cliente);
    } catch (error) {
        console.error('Erro ao carregar dados do cliente para edição:', error);
        showNotification('Erro ao carregar dados do cliente', 'error');
    }
}

function mostrarModalEdicao(cliente) {
    const dataExibicao = cliente.dataNascimento ? converterDataParaInput(cliente.dataNascimento) : '';

    const modalHTML = `
        <div class="modal-overlay edicao-cliente-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
            <div class="modal-content" style="background: white; padding: 30px; border-radius: 12px; max-width: 900px; width: 95%; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px;">
                    <h3 style="margin: 0; color: #333;">Editar Cliente</h3>
                    <button class="close-modal" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666;">&times;</button>
                </div>
                <form id="cliente-edit-form">
                    <input type="hidden" id="clienteId" value="${cliente.id}">
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <!-- Coluna 1: Informações Pessoais -->
                        <div class="form-section">
                            <h4 style="margin: 0 0 15px 0; color: #555; border-bottom: 2px solid #007bff; padding-bottom: 5px;">Informações Pessoais</h4>
                            
                            <div class="form-group" style="margin-bottom: 15px;">
                                <label for="edit-nome" style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Nome *</label>
                                <input type="text" id="edit-nome" value="${cliente.nome || ''}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;" required>
                            </div>

                            <div class="form-group" style="margin-bottom: 15px;">
                                <label for="edit-email" style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Email *</label>
                                <input type="email" id="edit-email" value="${cliente.email || ''}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;" required>
                            </div>

                            <div class="form-group" style="margin-bottom: 15px;">
                                <label for="edit-telefone" style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Telefone *</label>
                                <input type="text" id="edit-telefone" value="${cliente.telefone || ''}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;" required>
                            </div>

                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                                <div class="form-group" style="margin-bottom: 15px;">
                                    <label for="edit-cpf" style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">CPF</label>
                                    <input type="text" id="edit-cpf" value="${cliente.cpf || ''}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
                                </div>

                                <div class="form-group" style="margin-bottom: 15px;">
                                    <label for="edit-cnpj" style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">CNPJ</label>
                                    <input type="text" id="edit-cnpj" value="${cliente.cnpj || ''}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
                                </div>
                            </div>

                            <div class="form-group" style="margin-bottom: 15px;">
                                <label for="edit-dataNascimento" style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Data de Nascimento</label>
                                <input type="text" id="edit-dataNascimento" value="${dataExibicao}" placeholder="dd-mm-aaaa" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
                            </div>
                        </div>

                        <!-- Coluna 2: Endereço -->
                        <div class="form-section">
                            <h4 style="margin: 0 0 15px 0; color: #555; border-bottom: 2px solid #28a745; padding-bottom: 5px;">Endereço</h4>
                            
                            <div class="form-group" style="margin-bottom: 15px;">
                                <label for="edit-cep" style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">CEP</label>
                                <input type="text" id="edit-cep" value="${cliente.cep || ''}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
                            </div>

                            <div class="form-group" style="margin-bottom: 15px;">
                                <label for="edit-rua" style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Rua</label>
                                <input type="text" id="edit-rua" value="${cliente.rua || ''}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
                            </div>

                            <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 15px;">
                                <div class="form-group" style="margin-bottom: 15px;">
                                    <label for="edit-numero" style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Número</label>
                                    <input type="text" id="edit-numero" value="${cliente.numero || ''}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
                                </div>

                                <div class="form-group" style="margin-bottom: 15px;">
                                    <label for="edit-complemento" style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Complemento</label>
                                    <input type="text" id="edit-complemento" value="${cliente.complemento || ''}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
                                </div>
                            </div>

                            <div class="form-group" style="margin-bottom: 15px;">
                                <label for="edit-bairro" style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Bairro</label>
                                <input type="text" id="edit-bairro" value="${cliente.bairro || ''}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
                            </div>

                            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 15px;">
                                <div class="form-group" style="margin-bottom: 15px;">
                                    <label for="edit-cidade" style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Cidade</label>
                                    <input type="text" id="edit-cidade" value="${cliente.cidade || ''}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
                                </div>

                                <div class="form-group" style="margin-bottom: 15px;">
                                    <label for="edit-estado" style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Estado</label>
                                    <input type="text" id="edit-estado" value="${cliente.estado || ''}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Observações -->
                    <div class="form-section" style="margin-top: 20px;">
                        <h4 style="margin: 0 0 15px 0; color: #555; border-bottom: 2px solid #ffc107; padding-bottom: 5px;">Observações</h4>
                        <div class="form-group" style="margin-bottom: 15px;">
                            <textarea id="edit-observacoes" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; resize: vertical; min-height: 80px;" placeholder="Digite observações sobre o cliente...">${cliente.observacoes || ''}</textarea>
                        </div>
                    </div>

                    <div id="errorMsg" style="display: none; background: #fee; color: #c33; padding: 12px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #dc3545;"></div>
                    <div id="successMsg" style="display: none; background: #efe; color: #363; padding: 12px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #28a745;"></div>

                    <div class="modal-footer" style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 25px; border-top: 1px solid #eee; padding-top: 20px;">
                        <button type="button" class="btn btn-danger" onclick="confirmarExclusaoCliente(${cliente.id}, '${escapeHtml(cliente.nome)}')" style="padding: 10px 20px; background: #dc3545; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
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
    const modal = document.querySelector('.edicao-cliente-modal');
    const form = document.getElementById('cliente-edit-form');
    const closeBtn = modal.querySelector('.close-modal');

    closeBtn.addEventListener('click', fecharModalEdicao);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            fecharModalEdicao();
        }
    });

    form.addEventListener('submit', handleSubmitEdicao);

    // Aplicar máscaras aos campos
    const cpfInput = document.getElementById('edit-cpf');
    if (cpfInput) {
        cpfInput.addEventListener('input', (e) => {
            e.target.value = formatarCPF(e.target.value);
        });
    }

    const cnpjInput = document.getElementById('edit-cnpj');
    if (cnpjInput) {
        cnpjInput.addEventListener('input', (e) => {
            e.target.value = formatarCNPJ(e.target.value);
        });
    }

    const telefoneInput = document.getElementById('edit-telefone');
    if (telefoneInput) {
        telefoneInput.addEventListener('input', (e) => {
            e.target.value = formatarTelefone(e.target.value);
        });
    }

    const cepInput = document.getElementById('edit-cep');
    if (cepInput) {
        cepInput.addEventListener('input', (e) => {
            e.target.value = formatarCEPInput(e.target.value);
        });
    }

    const dataNascInput = document.getElementById('edit-dataNascimento');
    if (dataNascInput) {
        dataNascInput.addEventListener('input', (e) => {
            e.target.value = formatarDataInput(e.target.value);
        });
    }
}

function fecharModalEdicao() {
    const modal = document.querySelector('.edicao-cliente-modal');
    if (modal) {
        modal.remove();
    }
}

async function handleSubmitEdicao(e) {
    e.preventDefault();
    
    const form = document.getElementById('cliente-edit-form');
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
    submitBtn.disabled = true;

    const errorMsg = document.getElementById('errorMsg');
    const successMsg = document.getElementById('successMsg');
    if (errorMsg) errorMsg.style.display = 'none';
    if (successMsg) successMsg.style.display = 'none';

    try {
        const formData = obterDadosFormularioEdicao();
        await atualizarCliente(formData);
        
    } catch (error) {
        console.error('❌ Erro no handleSubmitEdicao:', error);
        
        if (errorMsg) {
            errorMsg.innerHTML = `
                <strong>Erro ao salvar:</strong> ${error.message}
                <br><small>Verifique os dados e tente novamente.</small>
            `;
            errorMsg.style.display = 'block';
        }
        
        showNotification('Erro ao salvar alterações: ' + error.message, 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function obterDadosFormularioEdicao() {
    const clienteId = document.getElementById('clienteId').value;
    const dataNascimentoInput = document.getElementById('edit-dataNascimento').value.trim();

    let dataNascimentoFormatada = null;
    if (dataNascimentoInput) {
        const numeros = dataNascimentoInput.replace(/\D/g, '');
        if (numeros.length === 8) {
            const dia = numeros.substring(0, 2);
            const mes = numeros.substring(2, 4);
            const ano = numeros.substring(4, 8);
            dataNascimentoFormatada = `${dia}-${mes}-${ano}`;
        } else {
            dataNascimentoFormatada = dataNascimentoInput;
        }
    }

    const dados = {
        nome: document.getElementById('edit-nome').value.trim(),
        email: document.getElementById('edit-email').value.trim(),
        telefone: document.getElementById('edit-telefone').value.trim(),
        cpf: document.getElementById('edit-cpf').value.replace(/\D/g, '') || null,
        cnpj: document.getElementById('edit-cnpj').value.replace(/\D/g, '') || null,
        dataNascimento: dataNascimentoFormatada,
        cep: document.getElementById('edit-cep').value.trim() || null,
        rua: document.getElementById('edit-rua').value.trim() || null,
        numero: document.getElementById('edit-numero').value.trim() || null,
        complemento: document.getElementById('edit-complemento').value.trim() || null,
        bairro: document.getElementById('edit-bairro').value.trim() || null,
        cidade: document.getElementById('edit-cidade').value.trim() || null,
        estado: document.getElementById('edit-estado').value.trim() || null,
        observacoes: document.getElementById('edit-observacoes').value.trim() || null
    };

    if (!dados.nome) throw new Error('Nome é obrigatório');
    if (!dados.email) throw new Error('Email é obrigatório');
    if (!dados.telefone) throw new Error('Telefone é obrigatório');

    return { clienteId, dados };
}

// ========== FUNÇÃO ATUALIZADA COM MELHOR TRATAMENTO DE ERROS ==========
async function atualizarCliente({ clienteId, dados }) {
    try {
        console.log('🚀 Enviando atualização para cliente ID:', clienteId);
        console.log('📦 Dados enviados:', dados);
        
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Token de autenticação não encontrado. Faça login novamente.');
        }

        const response = await fetch(`${API_CONFIG.CLIENTES}/${clienteId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
        },
         body: JSON.stringify(dados)
});

        console.log('📨 Status da resposta:', response.status);
        console.log('📨 Status OK?', response.ok);

        // Tentar obter a resposta como texto primeiro
        const responseText = await response.text();
        console.log('📄 Conteúdo da resposta:', responseText);

        let result;
        try {
            result = JSON.parse(responseText);
        } catch (e) {
            // Se não for JSON, usar o texto puro
            result = { text: responseText };
        }

        if (response.ok) {
            console.log('✅ Cliente atualizado com sucesso');
            console.log('📊 Resultado:', result);
            showNotification('Cliente atualizado com sucesso!', 'success');
            
            setTimeout(() => {
                fecharModalEdicao();
                loadClientesData();
            }, 1500);
        } else {
            console.error('❌ Erro na resposta:', result);
            console.error('❌ Status:', response.status);
            console.error('❌ Status Text:', response.statusText);
            
            let errorMessage = 'Erro ao atualizar cliente';
            
            // Tentar extrair a mensagem de erro da resposta de várias formas
            if (result && typeof result === 'object') {
                if (result.erro) errorMessage = result.erro;
                else if (result.message) errorMessage = result.message;
                else if (result.error) errorMessage = result.error;
                else if (result.detalhes) errorMessage = result.detalhes;
                else if (result.mensagem) errorMessage = result.mensagem;
                else if (result.text) {
                    // Se for HTML, mostrar mensagem genérica
                    if (result.text.includes('<!DOCTYPE')) {
                        errorMessage = `Erro ${response.status} no servidor. Contate o suporte técnico.`;
                    } else {
                        errorMessage = result.text.substring(0, 200);
                    }
                } else {
                    // Tentar stringify se for objeto
                    errorMessage = JSON.stringify(result);
                }
            } else if (responseText) {
                errorMessage = responseText.substring(0, 200);
            }
            
            // Adicionar status HTTP à mensagem
            if (response.status) {
                errorMessage = `Erro ${response.status}: ${errorMessage}`;
            }
            
            throw new Error(errorMessage);
        }
    } catch (error) {
        console.error('❌ Erro na atualização:', error);
        console.error('❌ Stack:', error.stack);
        throw error;
    }
}

// ========== FUNÇÃO ATUALIZADA PARA OBTER DADOS DO FORMULÁRIO ==========
function obterDadosFormularioEdicao() {
    const clienteId = document.getElementById('clienteId').value;
    const dataNascimentoInput = document.getElementById('edit-dataNascimento').value.trim();

    // FORMATO CORRETO PARA A API: dd-mm-aaaa
    let dataNascimentoFormatada = null;
    if (dataNascimentoInput) {
        // Limpar caracteres não numéricos
        const numeros = dataNascimentoInput.replace(/\D/g, '');
        
        if (numeros.length === 8) {
            // Formatar como dd-mm-aaaa
            const dia = numeros.substring(0, 2);
            const mes = numeros.substring(2, 4);
            const ano = numeros.substring(4, 8);
            dataNascimentoFormatada = `${dia}-${mes}-${ano}`;
            
            // Validar data
            const data = new Date(`${ano}-${mes}-${dia}`);
            if (isNaN(data.getTime())) {
                console.warn('⚠️ Data de nascimento inválida:', dataNascimentoInput);
                dataNascimentoFormatada = null;
            }
        } else if (dataNascimentoInput.includes('-') && dataNascimentoInput.length === 10) {
            // Já está no formato dd-mm-aaaa
            dataNascimentoFormatada = dataNascimentoInput;
        } else {
            console.warn('⚠️ Formato de data inválido:', dataNascimentoInput);
        }
    }

    // Validar campos obrigatórios ANTES de construir o objeto
    const nome = document.getElementById('edit-nome').value.trim();
    const email = document.getElementById('edit-email').value.trim();
    const telefone = document.getElementById('edit-telefone').value.trim();

    if (!nome) throw new Error('Nome é obrigatório');
    if (!email) throw new Error('Email é obrigatório');
    if (!telefone) throw new Error('Telefone é obrigatório');

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new Error('Email inválido');
    }

    const dados = {
        nome: nome,
        email: email,
        telefone: telefone.replace(/\D/g, ''), // Apenas números
        cpf: document.getElementById('edit-cpf').value.replace(/\D/g, '') || null,
        cnpj: document.getElementById('edit-cnpj').value.replace(/\D/g, '') || null,
        dataNascimento: dataNascimentoFormatada,
        cep: document.getElementById('edit-cep').value.replace(/\D/g, '') || null,
        rua: document.getElementById('edit-rua').value.trim() || null,
        numero: document.getElementById('edit-numero').value.trim() || null,
        complemento: document.getElementById('edit-complemento').value.trim() || null,
        bairro: document.getElementById('edit-bairro').value.trim() || null,
        cidade: document.getElementById('edit-cidade').value.trim() || null,
        estado: document.getElementById('edit-estado').value.trim() || null,
        observacoes: document.getElementById('edit-observacoes').value.trim() || null
    };

    console.log('📤 Dados do formulário preparados para envio:');
    console.log('🆔 Cliente ID:', clienteId);
    console.log('📝 Dados:', dados);
    console.log('📅 Data Nascimento (formato enviado):', dados.dataNascimento);

    return { clienteId, dados };
}

// ========== ATUALIZAR FUNÇÃO handleSubmitEdicao PARA MOSTRAR MELHOR OS ERROS ==========
async function handleSubmitEdicao(e) {
    e.preventDefault();
    
    const form = document.getElementById('cliente-edit-form');
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
    submitBtn.disabled = true;

    const errorMsg = document.getElementById('errorMsg');
    const successMsg = document.getElementById('successMsg');
    if (errorMsg) errorMsg.style.display = 'none';
    if (successMsg) successMsg.style.display = 'none';

    try {
        const formData = obterDadosFormularioEdicao();
        console.log('📋 Dados validados, enviando para API...');
        await atualizarCliente(formData);
        
    } catch (error) {
        console.error('❌ Erro no handleSubmitEdicao:', error);
        
        // Mostrar erro no modal
        if (errorMsg) {
            errorMsg.innerHTML = `
                <div style="display: flex; align-items: flex-start; gap: 10px;">
                    <i class="fas fa-exclamation-triangle" style="color: #dc3545; font-size: 1.2rem;"></i>
                    <div>
                        <strong>Erro ao salvar alterações:</strong><br>
                        ${error.message}
                        <br><small style="color: #666; margin-top: 5px; display: block;">
                            Verifique os dados e tente novamente. Se o problema persistir, contate o suporte.
                        </small>
                    </div>
                </div>
            `;
            errorMsg.style.display = 'block';
            
            // Scroll para o erro
            errorMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        // Também mostrar notificação
        showNotification('Erro ao salvar: ' + error.message, 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// ========== FUNÇÕES DE EXCLUSÃO ==========
function confirmarExclusao(clienteId, clienteNome) {
    const modalHTML = `
        <div class="modal-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
            <div class="modal-content" style="background: white; padding: 30px; border-radius: 12px; max-width: 400px; width: 90%;">
                <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin: 0;">Confirmar Exclusão</h3>
                    <button onclick="this.closest('.modal-overlay').remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
                </div>
                <div class="modal-body">
                    <p style="margin-bottom: 20px;">Tem certeza que deseja excluir o cliente <strong>"${escapeHtml(clienteNome)}"</strong>? Esta ação não pode ser desfeita.</p>
                </div>
                <div class="modal-footer" style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button onclick="this.closest('.modal-overlay').remove()" class="btn btn-secondary">Cancelar</button>
                    <button onclick="executarExclusao(${clienteId})" class="btn btn-danger">Excluir</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

async function executarExclusao(clienteId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_CONFIG.CLIENTES}/${clienteId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            showNotification('Cliente excluído com sucesso!', 'success');
            const modals = document.querySelectorAll('.modal-overlay');
            modals.forEach(modal => modal.remove());
            await loadClientesData();
        } else {
            const result = await response.json();
            let errorMessage = 'Erro ao excluir cliente';
            
            if (result.error) errorMessage = result.error;
            else if (result.detalhes) errorMessage = result.detalhes;
            else if (result.message) errorMessage = result.message;
            
            throw new Error(errorMessage);
        }
        
    } catch (error) {
        console.error('Erro ao excluir cliente:', error);
        showNotification('Erro ao excluir cliente: ' + error.message, 'error');
    }
}

function confirmarExclusaoCliente(clienteId, clienteNome) {
    const modalHTML = `
        <div class="modal-overlay confirmacao-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1001;">
            <div class="modal-content" style="background: white; padding: 30px; border-radius: 12px; max-width: 400px; width: 90%;">
                <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin: 0;">Confirmar Exclusão</h3>
                    <button class="close-confirmacao" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Tem certeza que deseja excluir o cliente <strong>${escapeHtml(clienteNome)}</strong>?</p>
                    <p style="color: #dc3545; font-size: 0.9rem; margin-top: 10px;">Esta ação não pode ser desfeita.</p>
                </div>
                <div class="modal-footer" style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                    <button type="button" class="btn btn-secondary" onclick="fecharModalConfirmacao()" style="padding: 10px 15px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Cancelar</button>
                    <button type="button" class="btn btn-danger" onclick="excluirClienteModal()" style="padding: 10px 15px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">Excluir</button>
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

    window.clienteParaExcluir = clienteId;
}

function fecharModalConfirmacao() {
    const modal = document.querySelector('.confirmacao-modal');
    if (modal) {
        modal.remove();
    }
    window.clienteParaExcluir = null;
}

async function excluirClienteModal() {
    if (!window.clienteParaExcluir) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_CONFIG.CLIENTES}/${window.clienteParaExcluir}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            showNotification('Cliente excluído com sucesso!', 'success');
            fecharModalConfirmacao();
            
            setTimeout(() => {
                fecharModalEdicao();
                loadClientesData();
            }, 1500);
        } else {
            const result = await response.json();
            let errorMessage = 'Erro ao excluir cliente';
            
            if (result.error) errorMessage = result.error;
            else if (result.detalhes) errorMessage = result.detalhes;
            else if (result.message) errorMessage = result.message;
            
            throw new Error(errorMessage);
        }
    } catch (error) {
        console.error('Erro:', error);
        showNotification(error.message, 'error');
    } finally {
        window.clienteParaExcluir = null;
    }
}

// ========== FUNÇÕES AUXILIARES ==========
function converterDataParaInput(dataString) {
    if (!dataString) return '';
    
    try {
        if (typeof dataString === 'string' && dataString.includes('-')) {
            const partes = dataString.split('-');
            if (partes.length === 3 && partes[0].length === 2 && partes[1].length === 2 && partes[2].length === 4) {
                return dataString;
            }
        }
        
        const data = new Date(dataString);
        if (!isNaN(data.getTime())) {
            const dia = data.getDate().toString().padStart(2, '0');
            const mes = (data.getMonth() + 1).toString().padStart(2, '0');
            const ano = data.getFullYear();
            return `${dia}-${mes}-${ano}`;
        }
        
        return dataString;
    } catch (error) {
        console.error('Erro ao converter data para input:', error);
        return dataString;
    }
}

function formatarDataParaExibicao(dataString) {
    if (!dataString) return '-';
    
    try {
        if (typeof dataString === 'string' && dataString.includes('-')) {
            const partes = dataString.split('-');
            if (partes.length === 3 && partes[0].length === 2 && partes[1].length === 2 && partes[2].length === 4) {
                return dataString;
            }
        }
        
        const data = new Date(dataString);
        if (!isNaN(data.getTime())) {
            const dia = data.getDate().toString().padStart(2, '0');
            const mes = (data.getMonth() + 1).toString().padStart(2, '0');
            const ano = data.getFullYear();
            return `${dia}-${mes}-${ano}`;
        }
        
        return dataString;
    } catch (error) {
        console.error('Erro ao formatar data para exibição:', error);
        return dataString;
    }
}

function formatarDataHora(dataString) {
    if (!dataString) return '-';
    try {
        const data = new Date(dataString);
        if (isNaN(data.getTime())) return dataString;
        
        return data.toLocaleDateString('pt-BR') + ' ' + 
               data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
        return dataString;
    }
}

function parseDate(dataString) {
    if (!dataString) return new Date();
    
    let data = new Date(dataString);
    if (!isNaN(data.getTime())) {
        return data;
    }

    const partes = dataString.split('/');
    if (partes.length === 3) {
        data = new Date(partes[2], partes[1] - 1, partes[0]);
        if (!isNaN(data.getTime())) {
            return data;
        }
    }

    const partes2 = dataString.split('-');
    if (partes2.length === 3) {
        data = new Date(partes2[2], partes2[1] - 1, partes2[0]);
        if (!isNaN(data.getTime())) {
            return data;
        }
    }

    return new Date();
}

function formatarCPF(cpf) {
    if (!cpf) return '';
    const numeros = cpf.replace(/\D/g, '');
    if (numeros.length === 11) {
        return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return cpf;
}

function formatarCNPJ(cnpj) {
    if (!cnpj) return '';
    const numeros = cnpj.replace(/\D/g, '');
    if (numeros.length === 14) {
        return numeros.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return cnpj;
}

function formatarTelefone(telefone) {
    if (!telefone) return '';
    const numeros = telefone.replace(/\D/g, '');
    
    if (numeros.length === 11) {
        return numeros.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (numeros.length === 10) {
        return numeros.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    
    return telefone;
}

function formatarCEPInput(cep) {
    if (!cep) return '';
    const numeros = cep.replace(/\D/g, '');
    if (numeros.length === 8) {
        return numeros.replace(/(\d{5})(\d{3})/, '$1-$2');
    }
    return cep;
}

function formatarDataInput(data) {
    if (!data) return '';
    const numeros = data.replace(/\D/g, '');
    if (numeros.length <= 2) {
        return numeros;
    } else if (numeros.length <= 4) {
        return numeros.replace(/(\d{2})(\d{2})/, '$1-$2');
    } else {
        return numeros.replace(/(\d{2})(\d{2})(\d{4})/, '$1-$2-$3');
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
    if (elements.clientsTableBody) {
        elements.clientsTableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px;">
                    <div style="border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto;"></div>
                    <p style="margin-top: 1rem; color: #666;">Carregando clientes...</p>
                </td>
            </tr>
        `;
    }
    if (elements.cardsViewContainer) {
        elements.cardsViewContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; grid-column: 1 / -1;">
                <div style="border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto;"></div>
                <p style="margin-top: 1rem; color: #666;">Carregando clientes...</p>
            </div>
        `;
    }
}

function hideLoadingState() {
    // A renderização remove o loading state
}

function showNotification(message, type = 'info') {
    const existing = document.querySelectorAll('.notification');
    existing.forEach(el => el.remove());

    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1'};
        color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460'};
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        max-width: 400px;
        animation: slideInRight 0.3s ease;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation-triangle' : 'info'}"></i>
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
















// ========== SISTEMA DE EXPORTAÇÃO PARA CLIENTES ==========

// ========== SISTEMA DE EXPORTAÇÃO ========== 
function showExportOptions() {
    // Remove menu existente se houver
    const existingMenu = document.querySelector('.export-menu');
    if (existingMenu) {
        existingMenu.remove();
        return;
    }

    const exportMenu = document.createElement('div');
    exportMenu.className = 'export-menu';
    exportMenu.style.cssText = `
        position: absolute;
        top: 100%;
        right: 0;
        background: var(--bg-primary);
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius);
        box-shadow: var(--box-shadow-lg);
        z-index: 1000;
        min-width: 200px;
        margin-top: 5px;
    `;
    
    exportMenu.innerHTML = `
        <button onclick="exportarClientesParaExcel()" class="export-option" style="width: 100%; padding: 12px 16px; border: none; background: none; text-align: left; cursor: pointer; color: var(--text-primary); border-bottom: 1px solid var(--border-color); display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-file-excel" style="color: #217346;"></i> 
            Exportar para Excel
        </button>
        <button onclick="exportarClientesParaPDF()" class="export-option" style="width: 100%; padding: 12px 16px; border: none; background: none; text-align: left; cursor: pointer; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-file-pdf" style="color: #f40f02;"></i>
            Exportar para PDF
        </button>
    `;
    
    elements.exportBtn.parentNode.style.position = 'relative';
    elements.exportBtn.parentNode.appendChild(exportMenu);
    
    // Fechar menu ao clicar fora
    setTimeout(() => {
        const closeMenu = (e) => {
            if (!exportMenu.contains(e.target) && e.target !== elements.exportBtn) {
                exportMenu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        document.addEventListener('click', closeMenu);
    }, 100);
}

function exportarClientesParaExcel() {
    try {
        const filteredClientes = filterClientes(appState.clientes);
        
        if (filteredClientes.length === 0) {
            showNotification('Nenhum dado para exportar', 'warning');
            return;
        }
        
        // Criar cabeçalhos
        const headers = [
            'ID', 'Nome', 'Email', 'Telefone', 'CPF/CNPJ', 'Tipo', 
            'Cidade', 'Estado', 'Data Nascimento', 'Data Cadastro', 'Total Vendas'
        ];
        
        // Criar dados
        const data = filteredClientes.map(cliente => {
            const tipo = cliente.cnpj ? 'PJ' : 'PF';
            const documento = cliente.cpf ? formatarCPF(cliente.cpf) : 
                            cliente.cnpj ? formatarCNPJ(cliente.cnpj) : '';
            const totalVendas = cliente.totalVendas || 
                              (cliente._count && cliente._count.vendas) || 
                              0;
            
            return [
                cliente.id,
                cliente.nome || '',
                cliente.email || '',
                cliente.telefone ? formatarTelefone(cliente.telefone) : '',
                documento,
                tipo,
                cliente.cidade || '',
                cliente.estado || '',
                cliente.dataNascimento ? formatarDataParaExibicao(cliente.dataNascimento) : '',
                cliente.criadoEm ? formatarDataHora(cliente.criadoEm) : '',
                totalVendas
            ];
        });
        
        // Criar conteúdo CSV
        let csvContent = headers.join(';') + '\n';
        data.forEach(row => {
            csvContent += row.map(field => `"${field}"`).join(';') + '\n';
        });
        
        // Criar e fazer download do arquivo
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `clientes_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification('Exportação para Excel realizada com sucesso!', 'success');
        
    } catch (error) {
        console.error('Erro na exportação:', error);
        showNotification('Erro ao exportar dados: ' + error.message, 'error');
    }
}

function exportarClientesParaPDF() {
    try {
        const filteredClientes = filterClientes(appState.clientes);
        
        if (filteredClientes.length === 0) {
            showNotification('Nenhum dado para exportar', 'warning');
            return;
        }
        
        // Calcular totais
        const totalClientes = filteredClientes.length;
        const totalVendas = filteredClientes.reduce((sum, c) => 
            sum + (c.totalVendas || (c._count && c._count.vendas) || 0), 0);
        const clientesPF = filteredClientes.filter(c => c.cpf && !c.cnpj).length;
        const clientesPJ = filteredClientes.filter(c => c.cnpj && !c.cpf).length;

        // Criar conteúdo HTML para o PDF
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Relatório de Clientes - NexoERP</title>
                <style>
                    body { 
                        font-family: 'Segoe UI', Arial, sans-serif; 
                        margin: 20px; 
                        color: #333;
                    }
                    h1 { 
                        color: #2c3e50; 
                        text-align: center; 
                        margin-bottom: 10px;
                        border-bottom: 2px solid #3498db;
                        padding-bottom: 10px;
                    }
                    .report-info {
                        text-align: center;
                        margin-bottom: 30px;
                        color: #7f8c8d;
                    }
                    .summary-grid {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 15px;
                        margin: 20px 0;
                        background: #f8f9fa;
                        padding: 20px;
                        border-radius: 8px;
                        border-left: 4px solid #3498db;
                    }
                    .summary-item {
                        padding: 10px;
                    }
                    .summary-item strong {
                        color: #2c3e50;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 20px;
                        font-size: 12px;
                    }
                    th {
                        background-color: #34495e;
                        color: white;
                        padding: 12px 8px;
                        text-align: left;
                        font-weight: 600;
                    }
                    td {
                        padding: 10px 8px;
                        border-bottom: 1px solid #ddd;
                    }
                    tr:nth-child(even) {
                        background-color: #f8f9fa;
                    }
                    .footer {
                        margin-top: 30px;
                        text-align: center;
                        color: #7f8c8d;
                        font-size: 12px;
                        border-top: 1px solid #ecf0f1;
                        padding-top: 15px;
                    }
                </style>
            </head>
            <body>
                <h1>Relatório de Clientes</h1>
                <div class="report-info">
                    <strong>Sistema NexoERP</strong> - Emitido em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
                </div>
                
                <div class="summary-grid">
                    <div class="summary-item">
                        <strong>Total de Clientes:</strong> ${totalClientes}
                    </div>
                    <div class="summary-item">
                        <strong>Total de Vendas:</strong> ${totalVendas}
                    </div>
                    <div class="summary-item">
                        <strong>Pessoa Física:</strong> ${clientesPF}
                    </div>
                    <div class="summary-item">
                        <strong>Pessoa Jurídica:</strong> ${clientesPJ}
                    </div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nome</th>
                            <th>Email</th>
                            <th>Telefone</th>
                            <th>Documento</th>
                            <th>Tipo</th>
                            <th>Cidade</th>
                            <th>Estado</th>
                            <th>Data Nasc.</th>
                            <th>Cadastro</th>
                            <th>Vendas</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredClientes.map(cliente => {
                            const tipo = cliente.cnpj ? 'PJ' : 'PF';
                            const documento = cliente.cpf ? formatarCPF(cliente.cpf) : 
                                            cliente.cnpj ? formatarCNPJ(cliente.cnpj) : '-';
                            const totalVendas = cliente.totalVendas || 
                                              (cliente._count && cliente._count.vendas) || 
                                              0;
                            
                            return `
                                <tr>
                                    <td>${cliente.id}</td>
                                    <td>${escapeHtml(cliente.nome || '-')}</td>
                                    <td>${escapeHtml(cliente.email || '-')}</td>
                                    <td>${cliente.telefone ? formatarTelefone(cliente.telefone) : '-'}</td>
                                    <td>${documento}</td>
                                    <td>${tipo}</td>
                                    <td>${escapeHtml(cliente.cidade || '-')}</td>
                                    <td>${cliente.estado || '-'}</td>
                                    <td>${cliente.dataNascimento ? formatarDataParaExibicao(cliente.dataNascimento) : '-'}</td>
                                    <td>${cliente.criadoEm ? new Date(cliente.criadoEm).toLocaleDateString('pt-BR') : '-'}</td>
                                    <td>${totalVendas}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
                
                <div class="footer">
                    <p>Relatório gerado automaticamente pelo Sistema NexoERP</p>
                </div>
            </body>
            </html>
        `;
        
        // Abrir em nova janela para impressão/salvar como PDF
        const printWindow = window.open('', '_blank');
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        // Aguardar o carregamento e então imprimir
        printWindow.onload = function() {
            setTimeout(() => {
                printWindow.print();
            }, 500);
        };
        
        showNotification('PDF gerado com sucesso! Use a opção "Salvar como PDF" na impressora.', 'success');
        
    } catch (error) {
        console.error('Erro na geração do PDF:', error);
        showNotification('Erro ao gerar PDF: ' + error.message, 'error');
    }
}
// ========== FUNÇÕES GLOBAIS ==========
function changePage(page) {
    appState.currentPage = page;
    renderClientes();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Expor funções globais
window.changePage = changePage;
window.confirmarExclusao = confirmarExclusao;
window.editarCliente = editarCliente;
window.mostrarDetalhesCliente = mostrarDetalhesCliente;
window.executarExclusao = executarExclusao;
window.fecharModalEdicao = fecharModalEdicao;
window.fecharModalConfirmacao = fecharModalConfirmacao;
window.excluirClienteModal = excluirClienteModal;
window.confirmarExclusaoCliente = confirmarExclusaoCliente;
window.showExportOptions = showExportOptions;
window.exportarClientesParaExcel = exportarClientesParaExcel;
window.exportarClientesParaPDF = exportarClientesParaPDF;


window.changePage = changePage;
window.mostrarDetalhesCliente = mostrarDetalhesCliente;
window.editarCliente = editarCliente;
window.confirmarExclusao = confirmarExclusao;
window.confirmarExclusaoCliente = confirmarExclusaoCliente;
window.fecharModalConfirmacao = fecharModalConfirmacao;
window.excluirClienteModal = excluirClienteModal;
window.fecharModalEdicao = fecharModalEdicao;