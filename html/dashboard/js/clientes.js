// clientes.js - VERSÃO COMPLETA CORRIGIDA

const API_CONFIG = {
    CLIENTES: "https://api-nexoerp.vercel.app/api/clientes"
};

// Estado da aplicação para clientes
const appState = {
    clientes: [],
    currentPage: 1,
    itemsPerPage: 10,
    searchTerm: '',
    filters: {
        tipo: '',
        cidade: ''
    },
    metrics: {
        total: 0,
        novosEsteMes: 0,
        cidadesDiferentes: 0,
        comVendas: 0
    },
    currentView: 'table'
};

// Elementos DOM para clientes
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
    addClientBtn: document.getElementById('addClientBtn')
};

// Inicialização
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

function setupEventListeners() {
    if (elements.typeFilter) {
        elements.typeFilter.addEventListener('change', handleFilterChange);
    }
    if (elements.cityFilter) {
        elements.cityFilter.addEventListener('change', handleFilterChange);
    }
    if (elements.searchFilter) {
        elements.searchFilter.addEventListener('input', debounce(handleSearch, 300));
    }
    if (elements.itemsPerPage) {
        elements.itemsPerPage.addEventListener('change', handleItemsPerPageChange);
    }
    if (elements.addClientBtn) {
        elements.addClientBtn.addEventListener('click', function() {
            window.location.href = 'Nova Tabela/novo_cliente.html';
        });
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
            
            renderClientes();
        });
    });
}

async function loadClientesData() {
    try {
        showLoadingState();
        
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Usuário não autenticado');
        }

        const response = await fetch(API_CONFIG.CLIENTES, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        // A API retorna { success: true, data: [], pagination: {} }
        appState.clientes = result.data || result.clientes || [];
        
        calculateMetrics(appState.clientes);
        populateCityFilter(appState.clientes);
        renderClientes();
        renderMetrics();
        
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

function calculateMetrics(clientes) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    appState.metrics.total = clientes.length;
    
    // Novos este mês - baseado na data de criação
    appState.metrics.novosEsteMes = clientes.filter(cliente => {
        if (!cliente.criadoEm) return false;
        try {
            const dataCad = parseDate(cliente.criadoEm);
            return dataCad.getMonth() === currentMonth && dataCad.getFullYear() === currentYear;
        } catch {
            return false;
        }
    }).length;
    
    // Cidades diferentes
    const cidadesUnicas = new Set(
        clientes
            .map(cliente => cliente.cidade)
            .filter(Boolean)
            .map(cidade => cidade.trim().toLowerCase())
    );
    appState.metrics.cidadesDiferentes = cidadesUnicas.size;
    
    // Clientes com vendas
    appState.metrics.comVendas = clientes.filter(cliente => 
        cliente.totalVendas > 0 || (cliente._count && cliente._count.vendas > 0)
    ).length;
}

function populateCityFilter(clientes) {
    if (!elements.cityFilter) return;
    
    const cidades = [...new Set(
        clientes
            .map(cliente => cliente.cidade)
            .filter(Boolean)
            .map(cidade => cidade.trim())
    )].sort();
    
    elements.cityFilter.innerHTML = '<option value="">Todas</option>' + 
        cidades.map(cidade => `<option value="${cidade}">${cidade}</option>`).join('');
}

function renderMetrics() {
    if (elements.totalClients) elements.totalClients.textContent = appState.metrics.total.toLocaleString();
    if (elements.activeClients) elements.activeClients.textContent = appState.metrics.total.toLocaleString();
    if (elements.newThisMonth) elements.newThisMonth.textContent = appState.metrics.novosEsteMes.toLocaleString();
    if (elements.differentCities) elements.differentCities.textContent = appState.metrics.cidadesDiferentes.toLocaleString();
}

function handleFilterChange(e) {
    const filterName = e.target.id.replace('Filter', '');
    appState.filters[filterName] = e.target.value;
    appState.currentPage = 1;
    renderClientes();
}

function handleSearch(e) {
    appState.searchTerm = e.target.value.trim();
    appState.currentPage = 1;
    renderClientes();
}

function handleItemsPerPageChange(e) {
    appState.itemsPerPage = parseInt(e.target.value);
    appState.currentPage = 1;
    renderClientes();
}

function renderClientes() {
    const filteredClientes = filterClientes(appState.clientes);
    const paginatedClientes = paginateClientes(filteredClientes);
    
    if (appState.currentView === 'table') {
        renderTableView(paginatedClientes, filteredClientes.length);
    } else {
        renderCardsView(paginatedClientes, filteredClientes.length);
    }
    
    renderPagination(filteredClientes.length);
}

function filterClientes(clientes) {
    return clientes.filter(cliente => {
        const searchLower = appState.searchTerm.toLowerCase();
        const matchesSearch = !appState.searchTerm || 
            (cliente.nome && cliente.nome.toLowerCase().includes(searchLower)) ||
            (cliente.email && cliente.email.toLowerCase().includes(searchLower)) ||
            (cliente.telefone && cliente.telefone.includes(appState.searchTerm)) ||
            (cliente.cpf && cliente.cpf && cliente.cpf.includes(appState.searchTerm)) ||
            (cliente.cnpj && cliente.cnpj && cliente.cnpj.includes(appState.searchTerm));
        
        const matchesTipo = !appState.filters.tipo || 
            (appState.filters.tipo === 'PF' && cliente.cpf) ||
            (appState.filters.tipo === 'PJ' && cliente.cnpj);
        
        const matchesCidade = !appState.filters.cidade || 
            (cliente.cidade && cliente.cidade.trim().toLowerCase() === appState.filters.cidade.trim().toLowerCase());
        
        return matchesSearch && matchesTipo && matchesCidade;
    });
}

function paginateClientes(clientes) {
    const startIndex = (appState.currentPage - 1) * appState.itemsPerPage;
    return clientes.slice(startIndex, startIndex + appState.itemsPerPage);
}

function renderTableView(clientes, totalClientes) {
    if (!elements.clientsTableBody) return;

    if (clientes.length === 0) {
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
    
    elements.clientsTableBody.innerHTML = clientes.map(cliente => `
        <tr>
            <td>
                <div class="user-cell">
                    <div class="user-avatar-small">
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

function renderCardsView(clientes, totalClientes) {
    if (!elements.cardsViewContainer) return;

    if (clientes.length === 0) {
        elements.cardsViewContainer.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-secondary);">
                <i class="fas fa-users" style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <h3 style="margin: 0 0 0.5rem 0; color: var(--text-muted);">Nenhum cliente encontrado</h3>
                <p style="margin: 0;">Tente ajustar os filtros ou adicionar um novo cliente</p>
            </div>
        `;
        return;
    }
    
    elements.cardsViewContainer.innerHTML = clientes.map(cliente => `
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

function renderPagination(totalClientes) {
    if (!elements.pagination) return;

    const totalPages = Math.ceil(totalClientes / appState.itemsPerPage);
    
    if (totalPages <= 1) {
        elements.pagination.innerHTML = '';
        return;
    }
    
    let paginationHTML = `
        <div class="pagination-info">
            Mostrando ${Math.min(appState.itemsPerPage, totalClientes)} de ${totalClientes} clientes
        </div>
        <div class="pagination-controls">
    `;
    
    // Botão anterior
    paginationHTML += `
        <button class="pagination-btn" ${appState.currentPage === 1 ? 'disabled' : ''} onclick="changePage(${appState.currentPage - 1})">
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
    
    // Primeira página e ellipsis
    if (startPage > 1) {
        paginationHTML += `<button class="pagination-btn" onclick="changePage(1)">1</button>`;
        if (startPage > 2) {
            paginationHTML += `<span class="pagination-ellipsis">...</span>`;
        }
    }
    
    // Páginas do meio
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button class="pagination-btn ${i === appState.currentPage ? 'active' : ''}" onclick="changePage(${i})">
                ${i}
            </button>
        `;
    }
    
    // Última página e ellipsis
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<span class="pagination-ellipsis">...</span>`;
        }
        paginationHTML += `<button class="pagination-btn" onclick="changePage(${totalPages})">${totalPages}</button>`;
    }
    
    // Botão próximo
    paginationHTML += `
        <button class="pagination-btn" ${appState.currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${appState.currentPage + 1})">
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    paginationHTML += `</div>`;
    elements.pagination.innerHTML = paginationHTML;
}

// ========== MODAL DE DETALHES DO CLIENTE ==========
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
            throw new Error('Erro ao carregar detalhes do cliente');
        }

        const result = await response.json();
        const cliente = result.data || result;
        
        mostrarModalDetalhes(cliente);
    } catch (error) {
        console.error('Erro ao carregar detalhes do cliente:', error);
        showNotification('Erro ao carregar detalhes do cliente', 'error');
    }
}

function mostrarModalDetalhes(cliente) {
    // CORREÇÃO: Obter informações corretas do usuário que cadastrou
    const usuarioCadastro = cliente.usuario ? cliente.usuario.nome : 
                          (cliente.usuarioNome || 'Sistema');
    
    // CORREÇÃO: Calcular total de vendas corretamente
    const totalVendas = cliente.totalVendas || 
                       (cliente._count && cliente._count.vendas) || 
                       (cliente.vendas && cliente.vendas.length) || 
                       0;
    
    // CORREÇÃO: Garantir que mostra apenas observações do cliente, não de vendas
    const observacoesCliente = cliente.observacoes || 'Nenhuma observação cadastrada.';

    const modalHTML = `
        <div class="modal-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px;">
            <div class="modal-content" style="background: white; padding: 30px; border-radius: 12px; max-width: 800px; width: 100%; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px;">
                    <h3 style="margin: 0; color: #333;">Detalhes do Cliente</h3>
                    <button onclick="this.closest('.modal-overlay').remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666;">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <!-- Coluna 1: Informações Pessoais -->
                        <div class="info-section">
                            <h4 style="margin: 0 0 15px 0; color: #555; border-bottom: 2px solid #007bff; padding-bottom: 5px;">Informações Pessoais</h4>
                            <div class="detail-grid" style="display: grid; gap: 12px;">
                                <div class="detail-row">
                                    <strong style="color: #333;">Nome:</strong> 
                                    <span>${escapeHtml(cliente.nome || 'Não informado')}</span>
                                </div>
                                <div class="detail-row">
                                    <strong style="color: #333;">Email:</strong> 
                                    <span>${escapeHtml(cliente.email || 'Não informado')}</span>
                                </div>
                                <div class="detail-row">
                                    <strong style="color: #333;">Telefone:</strong> 
                                    <span>${cliente.telefone ? formatarTelefone(cliente.telefone) : 'Não informado'}</span>
                                </div>
                                <div class="detail-row">
                                    <strong style="color: #333;">CPF:</strong> 
                                    <span>${cliente.cpf ? formatarCPF(cliente.cpf) : 'Não informado'}</span>
                                </div>
                                <div class="detail-row">
                                    <strong style="color: #333;">CNPJ:</strong> 
                                    <span>${cliente.cnpj ? formatarCNPJ(cliente.cnpj) : 'Não informado'}</span>
                                </div>
                                <div class="detail-row">
                                    <strong style="color: #333;">Data de Nascimento:</strong> 
                                    <span>${cliente.dataNascimento ? formatarDataParaExibicao(cliente.dataNascimento) : 'Não informada'}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Coluna 2: Endereço -->
                        <div class="info-section">
                            <h4 style="margin: 0 0 15px 0; color: #555; border-bottom: 2px solid #28a745; padding-bottom: 5px;">Endereço</h4>
                            <div class="detail-grid" style="display: grid; gap: 12px;">
                                <div class="detail-row">
                                    <strong style="color: #333;">CEP:</strong> 
                                    <span>${cliente.cep || 'Não informado'}</span>
                                </div>
                                <div class="detail-row">
                                    <strong style="color: #333;">Rua:</strong> 
                                    <span>${escapeHtml(cliente.rua || 'Não informado')}</span>
                                </div>
                                <div class="detail-row">
                                    <strong style="color: #333;">Número:</strong> 
                                    <span>${cliente.numero || 'Não informado'}</span>
                                </div>
                                <div class="detail-row">
                                    <strong style="color: #333;">Complemento:</strong> 
                                    <span>${escapeHtml(cliente.complemento || 'Não informado')}</span>
                                </div>
                                <div class="detail-row">
                                    <strong style="color: #333;">Bairro:</strong> 
                                    <span>${escapeHtml(cliente.bairro || 'Não informado')}</span>
                                </div>
                                <div class="detail-row">
                                    <strong style="color: #333;">Cidade:</strong> 
                                    <span>${escapeHtml(cliente.cidade || 'Não informado')}</span>
                                </div>
                                <div class="detail-row">
                                    <strong style="color: #333;">Estado:</strong> 
                                    <span>${cliente.estado || 'Não informado'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Observações (CORREÇÃO: Apenas observações do cliente) -->
                    <div class="info-section" style="margin-top: 20px;">
                        <h4 style="margin: 0 0 15px 0; color: #555; border-bottom: 2px solid #ffc107; padding-bottom: 5px;">Observações do Cliente</h4>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #ffc107;">
                            <p style="margin: 0; color: #666; white-space: pre-wrap;">${escapeHtml(observacoesCliente)}</p>
                        </div>
                    </div>

                    <!-- Informações do Sistema (CORREÇÃO: Informações corretas) -->
                    <div class="info-section" style="margin-top: 20px;">
                        <h4 style="margin: 0 0 15px 0; color: #555; border-bottom: 2px solid #6c757d; padding-bottom: 5px;">Informações do Sistema</h4>
                        <div class="detail-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                            <div class="detail-row">
                                <strong style="color: #333;">Cadastrado por:</strong> 
                                <span>${escapeHtml(usuarioCadastro)}</span>
                            </div>
                            <div class="detail-row">
                                <strong style="color: #333;">Criado em:</strong> 
                                <span>${cliente.criadoEm ? formatarDataHora(cliente.criadoEm) : 'Não informado'}</span>
                            </div>
                            <div class="detail-row">
                                <strong style="color: #333;">Atualizado em:</strong> 
                                <span>${cliente.atualizadoEm ? formatarDataHora(cliente.atualizadoEm) : 'Não informado'}</span>
                            </div>
                            <div class="detail-row">
                                <strong style="color: #333;">Total de Vendas:</strong> 
                                <span>${totalVendas}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer" style="margin-top: 25px; display: flex; gap: 10px; justify-content: flex-end; border-top: 1px solid #eee; padding-top: 20px;">
                    <button onclick="editarCliente(${cliente.id})" class="btn btn-primary">
                        <i class="fas fa-edit"></i> Editar Cliente
                    </button>
                    <button onclick="this.closest('.modal-overlay').remove()" class="btn btn-secondary">Fechar</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}
// ========== MODAL DE EDIÇÃO DO CLIENTE ==========
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
    // CORREÇÃO: Converter data para o formato correto (dd-mm-aaaa)
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

    // Limpar mensagens anteriores
    const errorMsg = document.getElementById('errorMsg');
    const successMsg = document.getElementById('successMsg');
    if (errorMsg) errorMsg.style.display = 'none';
    if (successMsg) successMsg.style.display = 'none';

    try {
        const formData = obterDadosFormularioEdicao();
        await atualizarCliente(formData);
        
    } catch (error) {
        console.error('❌ Erro no handleSubmitEdicao:', error);
        
        // Mostrar erro mais detalhado no modal
        if (errorMsg) {
            errorMsg.innerHTML = `
                <strong>Erro ao salvar:</strong> ${error.message}
                <br><small>Verifique os dados e tente novamente. Se o problema persistir, contate o suporte.</small>
            `;
            errorMsg.style.display = 'block';
        }
        
        showNotification('Erro ao salvar alterações: ' + error.message, 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// ========== FUNÇÃO ATUALIZADA PARA OBTER DADOS DO FORMULÁRIO ==========
function obterDadosFormularioEdicao() {
    const clienteId = document.getElementById('clienteId').value;
    const dataNascimentoInput = document.getElementById('edit-dataNascimento').value.trim();

    // CORREÇÃO: Formatar data para o padrão ISO (YYYY-MM-DD) que o backend espera
    let dataNascimentoFormatada = null;
    if (dataNascimentoInput) {
        try {
            // Converter de dd-mm-aaaa para aaaa-mm-dd
            const partes = dataNascimentoInput.split('-');
            if (partes.length === 3) {
                const dia = partes[0].padStart(2, '0');
                const mes = partes[1].padStart(2, '0');
                const ano = partes[2];
                
                // Validar se é uma data válida
                const data = new Date(`${ano}-${mes}-${dia}`);
                if (!isNaN(data.getTime())) {
                    dataNascimentoFormatada = `${ano}-${mes}-${dia}`;
                } else {
                    console.warn('Data de nascimento inválida:', dataNascimentoInput);
                    dataNascimentoFormatada = null;
                }
            }
        } catch (error) {
            console.error('Erro ao formatar data de nascimento:', error);
            dataNascimentoFormatada = null;
        }
    }

    const dados = {
        nome: document.getElementById('edit-nome').value.trim(),
        email: document.getElementById('edit-email').value.trim(),
        telefone: document.getElementById('edit-telefone').value.replace(/\D/g, ''),
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

    // CORREÇÃO: Validar campos obrigatórios
    if (!dados.nome) {
        throw new Error('Nome é obrigatório');
    }
    
    if (!dados.email) {
        throw new Error('Email é obrigatório');
    }
    
    if (!dados.telefone) {
        throw new Error('Telefone é obrigatório');
    }

    console.log('📤 Dados do formulário:');
    console.log('🆔 Cliente ID:', clienteId);
    console.log('📝 Dados:', dados);
    console.log('📅 Data Nascimento formatada (ISO):', dados.dataNascimento);

    return { clienteId, dados };
}

function obterDadosFormularioEdicao() {
    const clienteId = document.getElementById('clienteId').value;
    const dataNascimentoInput = document.getElementById('edit-dataNascimento').value.trim();

    // CORREÇÃO: Garantir que a data esteja no formato dd-mm-aaaa
    let dataNascimentoFormatada = null;
    if (dataNascimentoInput) {
        // Remover qualquer caractere não numérico e garantir formato dd-mm-aaaa
        const numeros = dataNascimentoInput.replace(/\D/g, '');
        if (numeros.length === 8) {
            const dia = numeros.substring(0, 2);
            const mes = numeros.substring(2, 4);
            const ano = numeros.substring(4, 8);
            dataNascimentoFormatada = `${dia}-${mes}-${ano}`;
        } else {
            // Se não tem 8 dígitos, usar como está (o backend vai validar)
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

    console.log('📤 Dados do formulário:');
    console.log('🆔 Cliente ID:', clienteId);
    console.log('📝 Dados:', dados);
    console.log('📅 Data Nascimento formatada:', dados.dataNascimento);

    return { clienteId, dados };
}

async function atualizarCliente({ clienteId, dados }) {
    try {
        console.log('🚀 Enviando atualização para cliente ID:', clienteId);
        
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_CONFIG.CLIENTES}/${clienteId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(dados)
        });

        console.log('📨 Status da resposta:', response.status);

        // Ler a resposta UMA VEZ apenas
        const responseText = await response.text();
        console.log('📄 Conteúdo da resposta:', responseText.substring(0, 500)); // Mostrar só os primeiros 500 chars

        // Tentar parsear como JSON se possível
        let result;
        try {
            result = JSON.parse(responseText);
        } catch {
            // Se não for JSON, usar o texto puro
            result = { text: responseText };
        }

        if (response.ok) {
            console.log('✅ Cliente atualizado com sucesso');
            // CORREÇÃO: Usar showNotification em vez de mostrarSucessoModal
            showNotification('Cliente atualizado com sucesso!', 'success');
            
            setTimeout(() => {
                fecharModalEdicao();
                loadClientesData();
            }, 1500);
        } else {
            console.error('❌ Erro na resposta:', result);
            
            let errorMessage = 'Erro ao atualizar cliente';
            
            // Extrair mensagem de erro de várias formas possíveis
            if (result.erro) errorMessage = result.erro;
            else if (result.message) errorMessage = result.message;
            else if (result.error) errorMessage = result.error;
            else if (result.detalhes) errorMessage = result.detalhes;
            else if (result.text) {
                // Se for HTML, mostrar mensagem genérica
                if (result.text.includes('<!DOCTYPE')) {
                    errorMessage = `Erro ${response.status} no servidor - Contate o suporte técnico`;
                } else {
                    errorMessage = result.text.substring(0, 200);
                }
            }
            
            throw new Error(errorMessage);
        }
    } catch (error) {
        console.error('❌ Erro na atualização:', error);
        throw error;
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
            // Fechar modal
            const modals = document.querySelectorAll('.modal-overlay');
            modals.forEach(modal => modal.remove());
            // Recarregar dados
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

    // Armazenar o ID do cliente para exclusão
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

// ========== FUNÇÕES AUXILIARES CORRIGIDAS ==========

// CORREÇÃO: Função para converter data para o formato de input (dd-mm-aaaa)
function converterDataParaInput(dataString) {
    if (!dataString) return '';
    
    try {
        // Se já está no formato dd-mm-aaaa, retornar como está
        if (typeof dataString === 'string' && dataString.includes('-')) {
            const partes = dataString.split('-');
            if (partes.length === 3 && partes[0].length === 2 && partes[1].length === 2 && partes[2].length === 4) {
                return dataString;
            }
        }
        
        // Tentar converter de outros formatos
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

// CORREÇÃO: Função para formatar data para exibição (dd-mm-aaaa)
function formatarDataParaExibicao(dataString) {
    if (!dataString) return '-';
    
    try {
        // Se já está no formato dd-mm-aaaa, retornar como está
        if (typeof dataString === 'string' && dataString.includes('-')) {
            const partes = dataString.split('-');
            if (partes.length === 3 && partes[0].length === 2 && partes[1].length === 2 && partes[2].length === 4) {
                return dataString;
            }
        }
        
        // Tentar converter de outros formatos
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
    
    // Tenta parse como ISO string
    let data = new Date(dataString);
    if (!isNaN(data.getTime())) {
        return data;
    }

    // Tenta parse como DD/MM/YYYY
    const partes = dataString.split('/');
    if (partes.length === 3) {
        data = new Date(partes[2], partes[1] - 1, partes[0]);
        if (!isNaN(data.getTime())) {
            return data;
        }
    }

    // Tenta parse como DD-MM-YYYY
    const partes2 = dataString.split('-');
    if (partes2.length === 3) {
        data = new Date(partes2[2], partes2[1] - 1, partes2[0]);
        if (!isNaN(data.getTime())) {
            return data;
        }
    }

    return new Date();
}

// ========== FUNÇÕES DE FORMATAÇÃO ==========
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
                    <div class="loading-spinner"></div>
                    <p style="margin-top: 1rem; color: var(--text-secondary);">Carregando clientes...</p>
                </td>
            </tr>
        `;
    }
    if (elements.cardsViewContainer) {
        elements.cardsViewContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; grid-column: 1 / -1;">
                <div class="loading-spinner"></div>
                <p style="margin-top: 1rem; color: var(--text-secondary);">Carregando clientes...</p>
            </div>
        `;
    }
}

function hideLoadingState() {
    // Loading state é removido quando os dados são renderizados
}

function showNotification(message, type = 'info') {
    // Remove notificações existentes
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());

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
        border-left: 4px solid ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#007bff'};
        z-index: 1000;
        max-width: 400px;
        animation: slideInRight 0.3s ease;
    `;
    
    notification.innerHTML = `
        <div class="notification-content" style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation-triangle' : 'info'}" 
               style="color: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#007bff'};"></i>
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

function showExportOptions() {
    const exportMenu = document.createElement('div');
    exportMenu.className = 'export-menu';
    exportMenu.innerHTML = `
        <button onclick="exportarClientesParaExcel()" class="export-option">
            <i class="fas fa-file-excel"></i> Exportar para Excel
        </button>
        <button onclick="exportarClientesParaPDF()" class="export-option">
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
function exportarClientesParaExcel() {
    const filteredClientes = filterClientes(appState.clientes);
    
    // Criar tabela HTML para exportação
    let html = `
        <table border="1">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Nome</th>
                    <th>Email</th>
                    <th>Telefone</th>
                    <th>CPF/CNPJ</th>
                    <th>Tipo</th>
                    <th>Cidade</th>
                    <th>Estado</th>
                    <th>Data Nascimento</th>
                    <th>Data Cadastro</th>
                    <th>Total Vendas</th>
                    <th>Cadastrado Por</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    filteredClientes.forEach(cliente => {
        // CORREÇÃO: Mostrar o usuário real que cadastrou, não o usuário logado
        const usuarioCadastro = cliente.usuario ? cliente.usuario.nome : 'Sistema';
        const totalVendas = cliente.totalVendas || (cliente._count && cliente._count.vendas) || 0;
        
        html += `
            <tr>
                <td>${cliente.id}</td>
                <td>${escapeHtml(cliente.nome || '')}</td>
                <td>${escapeHtml(cliente.email || '')}</td>
                <td>${cliente.telefone || ''}</td>
                <td>${cliente.cpf ? formatarCPF(cliente.cpf) : (cliente.cnpj ? formatarCNPJ(cliente.cnpj) : '')}</td>
                <td>${cliente.cnpj ? 'PJ' : 'PF'}</td>
                <td>${escapeHtml(cliente.cidade || '')}</td>
                <td>${cliente.estado || ''}</td>
                <td>${cliente.dataNascimento ? formatarDataParaExibicao(cliente.dataNascimento) : ''}</td>
                <td>${cliente.criadoEm ? formatarDataHora(cliente.criadoEm) : ''}</td>
                <td>${totalVendas}</td>
                <td>${usuarioCadastro}</td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    const nomeArquivo = `clientes_${new Date().toISOString().split('T')[0]}.xls`;
    
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
function exportarClientesParaPDF() {
    const filteredClientes = filterClientes(appState.clientes);
    
    // Calcular totais
    const totalClientes = filteredClientes.length;
    const totalVendas = filteredClientes.reduce((sum, c) => sum + (c.totalVendas || (c._count && c._count.vendas) || 0), 0);
    const clientesPF = filteredClientes.filter(c => c.cpf).length;
    const clientesPJ = filteredClientes.filter(c => c.cnpj).length;

    // Criar conteúdo HTML para o PDF
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Relatório de Clientes</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { color: #333; text-align: center; margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f5f5f5; font-weight: bold; }
                .header-info { margin-bottom: 20px; }
                .summary { background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
                .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
                .summary-item { padding: 10px; }
            </style>
        </head>
        <body>
            <h1>Relatório de Clientes - NexoERP</h1>
            
            <div class="header-info">
                <p><strong>Data de emissão:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
                <div class="summary-grid">
                    <div class="summary-item">
                        <strong>Total de clientes:</strong> ${totalClientes}
                    </div>
                    <div class="summary-item">
                        <strong>Total de vendas:</strong> ${totalVendas}
                    </div>
                    <div class="summary-item">
                        <strong>Pessoa Física:</strong> ${clientesPF}
                    </div>
                    <div class="summary-item">
                        <strong>Pessoa Jurídica:</strong> ${clientesPJ}
                    </div>
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nome</th>
                        <th>Email</th>
                        <th>Telefone</th>
                        <th>CPF/CNPJ</th>
                        <th>Tipo</th>
                        <th>Cidade</th>
                        <th>Estado</th>
                        <th>Data Nasc.</th>
                        <th>Data Cadastro</th>
                        <th>Total Vendas</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredClientes.map(cliente => {
                        const totalVendas = cliente.totalVendas || (cliente._count && cliente._count.vendas) || 0;
                        return `
                            <tr>
                                <td>${cliente.id}</td>
                                <td>${escapeHtml(cliente.nome || '')}</td>
                                <td>${escapeHtml(cliente.email || '')}</td>
                                <td>${cliente.telefone || ''}</td>
                                <td>${cliente.cpf ? formatarCPF(cliente.cpf) : (cliente.cnpj ? formatarCNPJ(cliente.cnpj) : '')}</td>
                                <td>${cliente.cnpj ? 'PJ' : 'PF'}</td>
                                <td>${escapeHtml(cliente.cidade || '')}</td>
                                <td>${cliente.estado || ''}</td>
                                <td>${cliente.dataNascimento ? formatarDataParaExibicao(cliente.dataNascimento) : ''}</td>
                                <td>${cliente.criadoEm ? formatarDataHora(cliente.criadoEm) : ''}</td>
                                <td>${totalVendas}</td>
                            </tr>
                        `;
                    }).join('')}
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