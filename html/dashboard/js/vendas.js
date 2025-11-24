// vendas.js - VERSÃO ATUALIZADA PARA BACKEND COM OBSERVAÇÕES
class VendasManager {
    constructor() {
        this.token = localStorage.getItem('token');
        this.userData = JSON.parse(localStorage.getItem('user') || 'null');
        this.vendas = [];
        this.clientes = [];
        this.vendedores = [];
        this.observacoesVendas = this.carregarObservacoes();
        this.filtros = {
            search: '',
            status: '',
            cliente: '',
            vendedor: '',
            periodo: 'month',
            page: 1,
            limit: 10
        };
        this.metrics = {
            salesToday: 0,
            salesMonth: 0,
            completedSales: 0,
            pendingSales: 0
        };
        this.currentView = 'table';
        this.init();
    }

    init() {
        this.carregarDadosIniciais();
        this.configurarEventListeners();
        this.atualizarMetricas();
    }

    async carregarDadosIniciais() {
        await Promise.all([
            this.carregarVendas(),
            this.carregarClientes(),
            this.carregarVendedores()
        ]);
    }

    async carregarVendas() {
        try {
            const response = await this.fetchAuth('https://api-nexoerp.vercel.app/api/vendas');
            console.log('Resposta da API de vendas:', response);
            
            this.vendas = response.vendas || [];
            this.vendasFiltradas = [...this.vendas];
            this.renderizarVendas();
            this.atualizarMetricas();
        } catch (error) {
            console.error('Erro ao carregar vendas:', error);
            this.mostrarNotificacao('Erro ao carregar vendas', 'error');
        }
    }

    async carregarClientes() {
        try {
            const response = await this.fetchAuth('https://api-nexoerp.vercel.app/api/clientes');
            this.clientes = response.clientes || [];
            this.popularFiltroClientes();
        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
        }
    }

    async carregarVendedores() {
        try {
            const response = await this.fetchAuth('https://api-nexoerp.vercel.app/api/usuarios');
            this.vendedores = response.usuarios || response.data || [];
            this.popularFiltroVendedores();
        } catch (error) {
            console.error('Erro ao carregar vendedores:', error);
        }
    }
    formatarMoeda(valor) {
        if (valor === null || valor === undefined || isNaN(valor)) return '0,00';
        
        return new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(parseFloat(valor));
    }

    // Converte string brasileira para número: "1.234,56" → 1234.56
    converterMoedaParaNumero(valorString) {
        if (!valorString) return 0;
        
        // Remove pontos de milhar e substitui vírgula decimal por ponto
        const valorNumerico = parseFloat(
            valorString.replace(/\./g, '').replace(',', '.')
        );
        
        return isNaN(valorNumerico) ? 0 : valorNumerico;
    }

    // ========== SISTEMA DE OBSERVAÇÕES NO LOCALSTORAGE ==========
    carregarObservacoes() {
        try {
            const observacoes = localStorage.getItem('vendas_observacoes');
            return observacoes ? JSON.parse(observacoes) : {};
        } catch (error) {
            console.error('Erro ao carregar observações:', error);
            return {};
        }
    }

    salvarObservacoes() {
        try {
            localStorage.setItem('vendas_observacoes', JSON.stringify(this.observacoesVendas));
        } catch (error) {
            console.error('Erro ao salvar observações:', error);
        }
    }

    salvarObservacao(vendaId, observacao) {
        this.observacoesVendas[vendaId] = observacao;
        this.salvarObservacoes();
    }

    obterObservacao(vendaId) {
        return this.observacoesVendas[vendaId] || '';
    }

    // ========== MODAL PARA EDITAR OBSERVAÇÕES ==========
    editarObservacao(vendaId) {
        const observacaoAtual = this.obterObservacao(vendaId);
        
        const modalHTML = `
            <div class="modal-overlay edicao-observacao-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1001;">
                <div class="modal-content" style="background: white; padding: 25px; border-radius: 12px; max-width: 600px; width: 95%;">
                    <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px;">
                        <h3 style="margin: 0; color: #333;">Editar Observações - Venda #${vendaId}</h3>
                        <button class="close-modal" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666;">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group" style="margin-bottom: 20px;">
                            <label for="observacao-text" style="display: block; margin-bottom: 8px; font-weight: bold; color: #333;">Observações</label>
                            <textarea id="observacao-text" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; resize: vertical; min-height: 120px; font-family: inherit;" placeholder="Digite suas observações sobre esta venda...">${observacaoAtual || ''}</textarea>
                        </div>
                        <div class="info-text" style="background: #e7f3ff; padding: 10px; border-radius: 4px; border-left: 4px solid #007bff;">
                            <small style="color: #0066cc;">
                                <i class="fas fa-info-circle"></i> Estas observações são salvas apenas no seu navegador e não serão enviadas para o servidor.
                            </small>
                        </div>
                    </div>
                    <div class="modal-footer" style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px;">
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer;">Cancelar</button>
                        <button type="button" class="btn btn-success" onclick="vendasManager.salvarObservacaoModal(${vendaId})" style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 6px; cursor: pointer;">
                            <i class="fas fa-save"></i> Salvar Observações
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        const modal = document.querySelector('.edicao-observacao-modal');
        const closeBtn = modal.querySelector('.close-modal');
        
        closeBtn.addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    salvarObservacaoModal(vendaId) {
        const textarea = document.getElementById('observacao-text');
        const observacao = textarea.value.trim();
        
        this.salvarObservacao(vendaId, observacao);
        this.mostrarNotificacao('Observações salvas com sucesso!', 'success');
        
        const modal = document.querySelector('.edicao-observacao-modal');
        if (modal) modal.remove();
        
        const detalhesModal = document.querySelector('.modal-overlay:not(.edicao-observacao-modal)');
        if (detalhesModal) {
            detalhesModal.remove();
            this.visualizarVenda(vendaId);
        }
        
        this.renderizarVendas();
    }

    popularFiltroClientes() {
        const select = document.getElementById('clientFilter');
        if (!select) return;

        select.innerHTML = '<option value="">Todos</option>';
        
        if (Array.isArray(this.clientes)) {
            this.clientes.forEach(cliente => {
                const option = document.createElement('option');
                option.value = cliente.id;
                option.textContent = cliente.nome;
                select.appendChild(option);
            });
        } else {
            console.error('Clientes não é um array:', this.clientes);
        }
    }

    popularFiltroVendedores() {
        const select = document.getElementById('sellerFilter');
        if (!select) return;

        select.innerHTML = '<option value="">Todos</option>';
        
        if (Array.isArray(this.vendedores)) {
            this.vendedores.forEach(vendedor => {
                const option = document.createElement('option');
                option.value = vendedor.id;
                option.textContent = vendedor.nome;
                select.appendChild(option);
            });
        } else {
            console.error('Vendedores não é um array:', this.vendedores);
        }
    }

    configurarEventListeners() {
        const searchFilter = document.getElementById('searchFilter');
        const statusFilter = document.getElementById('statusFilter');
        const clientFilter = document.getElementById('clientFilter');
        const sellerFilter = document.getElementById('sellerFilter');
        const periodFilter = document.getElementById('periodFilter');
        const itemsPerPage = document.getElementById('itemsPerPage');

        if (searchFilter) {
            searchFilter.addEventListener('input', (e) => {
                this.filtros.search = e.target.value;
                this.filtros.page = 1;
                this.aplicarFiltros();
            });
        }

        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filtros.status = e.target.value;
                this.filtros.page = 1;
                this.aplicarFiltros();
            });
        }

        if (clientFilter) {
            clientFilter.addEventListener('change', (e) => {
                this.filtros.cliente = e.target.value;
                this.filtros.page = 1;
                this.aplicarFiltros();
            });
        }

        if (sellerFilter) {
            sellerFilter.addEventListener('change', (e) => {
                this.filtros.vendedor = e.target.value;
                this.filtros.page = 1;
                this.aplicarFiltros();
            });
        }

        if (periodFilter) {
            periodFilter.addEventListener('change', (e) => {
                this.filtros.periodo = e.target.value;
                this.filtros.page = 1;
                this.aplicarFiltros();
            });
        }

        if (itemsPerPage) {
            itemsPerPage.addEventListener('change', (e) => {
                this.filtros.limit = parseInt(e.target.value);
                this.filtros.page = 1;
                this.aplicarFiltros();
            });
        }

        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.getAttribute('data-view');
                this.alternarVisualizacao(view);
            });
        });

        const addSaleBtn = document.getElementById('addSaleBtn');
        if (addSaleBtn) {
            addSaleBtn.addEventListener('click', () => {
                window.location.href = 'Nova Tabela/nova_venda.html';
            });
        }
    }

    aplicarFiltros() {
        let vendasFiltradas = [...this.vendas];

        if (this.filtros.search) {
            const searchTerm = this.filtros.search.toLowerCase();
            vendasFiltradas = vendasFiltradas.filter(venda => 
                venda.id.toString().includes(searchTerm) ||
                (venda.cliente?.nome && venda.cliente.nome.toLowerCase().includes(searchTerm)) ||
                (venda.usuario?.nome && venda.usuario.nome.toLowerCase().includes(searchTerm)) ||
                (venda.observacoes && venda.observacoes.toLowerCase().includes(searchTerm)) ||
                (venda.itens && venda.itens.some(item => 
                    item.produto?.nome && item.produto.nome.toLowerCase().includes(searchTerm)
                ))
            );
        }

        if (this.filtros.status) {
            vendasFiltradas = vendasFiltradas.filter(venda => venda.status === this.filtros.status);
        }

        if (this.filtros.cliente) {
            vendasFiltradas = vendasFiltradas.filter(venda => 
                venda.clienteId == this.filtros.cliente || venda.cliente?.id == this.filtros.cliente
            );
        }

        if (this.filtros.vendedor) {
            vendasFiltradas = vendasFiltradas.filter(venda => 
                venda.usuarioId == this.filtros.vendedor || venda.usuario?.id == this.filtros.vendedor
            );
        }

        if (this.filtros.periodo && this.filtros.periodo !== 'all') {
            const now = new Date();
            let startDate, endDate;

            switch (this.filtros.periodo) {
                case 'today':
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
                    break;
                case 'week':
                    const dayOfWeek = now.getDay();
                    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
                    startDate = new Date(now.getFullYear(), now.getMonth(), diff);
                    endDate = new Date(now.getFullYear(), now.getMonth(), diff + 7);
                    break;
                case 'month':
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                    break;
                case 'quarter':
                    const quarter = Math.floor(now.getMonth() / 3);
                    startDate = new Date(now.getFullYear(), quarter * 3, 1);
                    endDate = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
                    break;
                case 'year':
                    startDate = new Date(now.getFullYear(), 0, 1);
                    endDate = new Date(now.getFullYear(), 11, 31);
                    break;
                default:
                    startDate = null;
                    endDate = null;
            }

            if (startDate && endDate) {
                vendasFiltradas = vendasFiltradas.filter(venda => {
                    const dataVenda = this.parseDate(venda.data);
                    return dataVenda >= startDate && dataVenda <= endDate;
                });
            }
        }

        this.vendasFiltradas = vendasFiltradas;
        this.renderizarVendas();
        this.atualizarMetricas();
    }

    parseDate(dateString) {
        if (!dateString) return null;
        
        const match = dateString.match(/(\d{2})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2})/);
        if (match) {
            const [, day, month, year, hours, minutes] = match;
            const fullYear = 2000 + parseInt(year);
            return new Date(fullYear, parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
        }
        
        return new Date(dateString);
    }

    alternarVisualizacao(view) {
        this.currentView = view;
        
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${view}"]`).classList.add('active');

        const tableView = document.getElementById('tableView');
        const cardsView = document.getElementById('cardsView');
        
        if (view === 'table') {
            tableView.style.display = 'block';
            cardsView.style.display = 'none';
        } else {
            tableView.style.display = 'none';
            cardsView.style.display = 'grid';
        }

        this.renderizarVendas();
    }

    renderizarVendas() {
        if (!this.vendasFiltradas || !Array.isArray(this.vendasFiltradas)) {
            console.error('vendasFiltradas não é um array válido');
            return;
        }

        const startIndex = (this.filtros.page - 1) * this.filtros.limit;
        const endIndex = startIndex + this.filtros.limit;
        const vendasPaginadas = this.vendasFiltradas.slice(startIndex, endIndex);

        if (this.currentView === 'table') {
            this.renderizarTabela(vendasPaginadas);
        } else {
            this.renderizarCards(vendasPaginadas);
        }

        this.renderizarPaginacao();
    }

    renderizarTabela(vendas) {
        const tbody = document.getElementById('salesTableBody');
        if (!tbody) return;

        if (vendas.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="no-data">
                        <i class="fas fa-inbox"></i>
                        <p>Nenhuma venda encontrada</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = vendas.map(venda => {
            const observacaoLocal = this.obterObservacao(venda.id);
            const temObservacaoLocal = observacaoLocal && observacaoLocal.trim() !== '';
            const temObservacaoServidor = venda.observacoes && venda.observacoes.trim() !== '';
            
            return `
                <tr class="${temObservacaoLocal ? 'has-local-notes' : ''} ${temObservacaoServidor ? 'has-server-notes' : ''}">
                    <td>#${venda.id}</td>
                    <td>${venda.data}</td>
                    <td>${venda.cliente?.nome || 'N/A'}</td>
                    <td>${venda.usuario?.nome || 'N/A'}</td>
                    <td>R$ ${this.formatarMoeda(venda.total)}</td>

                    <td>
                        <span class="status-badge status-${(venda.status || '').toLowerCase()}">
                            ${this.getStatusText(venda.status)}
                        </span>
                    </td>
                    <td>
                        ${temObservacaoServidor ? `
                            <span class="notes-indicator" title="Observações no servidor" style="color: #28a745;">
                                <i class="fas fa-database"></i>
                            </span>
                        ` : ''}
                        ${temObservacaoLocal ? `
                            <span class="notes-indicator" title="Observações locais" style="color: #ffc107;">
                                <i class="fas fa-sticky-note"></i>
                            </span>
                        ` : ''}
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-icon view-btn" data-id="${venda.id}" title="Visualizar">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-icon edit-btn" data-id="${venda.id}" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon notes-btn" data-id="${venda.id}" title="Gerenciar Observações" style="color: #6c757d;">
                                <i class="fas fa-notes-medical"></i>
                            </button>
                            <button class="btn-icon delete-btn" data-id="${venda.id}" title="Excluir">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        this.adicionarEventListenersAcoes();
    }

    renderizarCards(vendas) {
        const container = document.getElementById('cardsView');
        if (!container) return;

        if (vendas.length === 0) {
            container.innerHTML = `
                <div class="no-data">
                    <i class="fas fa-inbox"></i>
                    <p>Nenhuma venda encontrada</p>
                </div>
            `;
            return;
        }

        container.innerHTML = vendas.map(venda => {
            const observacaoLocal = this.obterObservacao(venda.id);
            const temObservacaoLocal = observacaoLocal && observacaoLocal.trim() !== '';
            const temObservacaoServidor = venda.observacoes && venda.observacoes.trim() !== '';
            
            return `
                <div class="sale-card ${venda.total > 1000 ? 'high-value' : ''} ${temObservacaoLocal ? 'has-local-notes' : ''} ${temObservacaoServidor ? 'has-server-notes' : ''}">
                    <div class="card-header">
                        <h3>Venda #${venda.id}</h3>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            ${temObservacaoServidor ? `
                                <span class="notes-indicator" title="Observações no servidor" style="color: #28a745; font-size: 0.8rem;">
                                    <i class="fas fa-database"></i>
                                </span>
                            ` : ''}
                            ${temObservacaoLocal ? `
                                <span class="notes-indicator" title="Observações locais" style="color: #ffc107; font-size: 0.8rem;">
                                    <i class="fas fa-sticky-note"></i>
                                </span>
                            ` : ''}
                            <span class="status-badge status-${(venda.status || '').toLowerCase()}">
                                ${this.getStatusText(venda.status)}
                            </span>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="card-info">
                            <div class="info-item">
                                <i class="fas fa-user"></i>
                                <span><strong>Cliente:</strong> ${venda.cliente?.nome || 'N/A'}</span>
                            </div>
                            <div class="info-item">
                                <i class="fas fa-user-tie"></i>
                                <span><strong>Vendedor:</strong> ${venda.usuario?.nome || 'N/A'}</span>
                            </div>
                            <div class="info-item">
                                <i class="fas fa-calendar"></i>
                                <span><strong>Data:</strong> ${venda.data}</span>
                            </div>
                        </div>
                        
                        ${temObservacaoServidor ? `
                        <div class="card-notes-preview server-notes">
                            <strong><i class="fas fa-database"></i> Observação (Servidor):</strong>
                            <p style="margin: 5px 0 0 0; font-size: 0.85rem; color: #28a745; line-height: 1.3; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                                ${this.escapeHtml(venda.observacoes)}
                            </p>
                        </div>
                        ` : ''}
                        
                        ${temObservacaoLocal ? `
                        <div class="card-notes-preview local-notes">
                            <strong><i class="fas fa-sticky-note"></i> Observação (Local):</strong>
                            <p style="margin: 5px 0 0 0; font-size: 0.85rem; color: #666; line-height: 1.3; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                                ${this.escapeHtml(observacaoLocal)}
                            </p>
                        </div>
                        ` : ''}
                        
                        ${venda.itens && venda.itens.length > 0 ? `
                        <div class="card-products">
                            <strong>Produtos Vendidos:</strong>
                            <ul>
                                ${venda.itens.slice(0, 3).map(item => `
                                    <li>
                                        <span>${item.produto?.nome || 'Produto'}</span>
                                        <span>${item.quantidade || 0}x - R$ ${this.formatarMoeda(item.precoUnit)}</span>
                                    </li>
                                `).join('')}
                                ${venda.itens.length > 3 ? `
                                    <li>
                                        <span>+${venda.itens.length - 3} produtos</span>
                                        <span>Ver todos</span>
                                    </li>
                                ` : ''}
                            </ul>
                        </div>
                        ` : ''}
                    </div>
                    <div class="card-footer">
                        <div class="card-total">
                            Total: <span>R$ ${this.formatarMoeda(venda.total)}</span>
                        </div>
                        <div class="card-actions">
                            <button class="btn-icon view-btn" data-id="${venda.id}" title="Visualizar Venda">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-icon edit-btn" data-id="${venda.id}" title="Editar Venda">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon notes-btn" data-id="${venda.id}" title="Gerenciar Observações" style="color: #6c757d;">
                                <i class="fas fa-notes-medical"></i>
                            </button>
                            <button class="btn-icon delete-btn" data-id="${venda.id}" title="Excluir Venda">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        this.adicionarEventListenersAcoes();
    }

    adicionarEventListenersAcoes() {
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                this.visualizarVenda(id);
            });
        });

        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                this.editarVenda(id);
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                this.excluirVenda(id);
            });
        });

        document.querySelectorAll('.notes-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                this.mostrarModalGerenciarObservacoes(id);
            });
        });
    }

    // NOVO: Modal para gerenciar ambos os tipos de observações
    async mostrarModalGerenciarObservacoes(vendaId) {
        try {
            const venda = await this.fetchAuth(`https://api-nexoerp.vercel.app/api/vendas/${vendaId}`);
            const observacaoLocal = this.obterObservacao(vendaId);
            
            const modalHTML = `
                <div class="modal-overlay gerenciar-observacoes-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1001;">
                    <div class="modal-content" style="background: white; padding: 25px; border-radius: 12px; max-width: 700px; width: 95%;">
                        <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px;">
                            <h3 style="margin: 0; color: #333;">Gerenciar Observações - Venda #${vendaId}</h3>
                            <button class="close-modal" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666;">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="form-section" style="margin-bottom: 25px;">
                                <h4 style="margin: 0 0 15px 0; color: #555; border-bottom: 2px solid #28a745; padding-bottom: 5px;">
                                    <i class="fas fa-database"></i> Observações do Servidor
                                </h4>
                                <div class="form-group" style="margin-bottom: 15px;">
                                    <textarea id="observacoes-servidor" style="width: 100%; padding: 12px; border: 1px solid #28a745; border-radius: 6px; font-size: 14px; resize: vertical; min-height: 100px; font-family: inherit;" placeholder="Observações que serão salvas no servidor...">${venda.observacoes || ''}</textarea>
                                </div>
                                <div class="info-text" style="background: #e8f5e8; padding: 10px; border-radius: 4px; border-left: 4px solid #28a745;">
                                    <small style="color: #155724;">
                                        <i class="fas fa-info-circle"></i> Estas observações são salvas no servidor e sincronizadas com o banco de dados.
                                    </small>
                                </div>
                            </div>

                            <div class="form-section">
                                <h4 style="margin: 0 0 15px 0; color: #555; border-bottom: 2px solid #ffc107; padding-bottom: 5px;">
                                    <i class="fas fa-sticky-note"></i> Observações Locais
                                </h4>
                                <div class="form-group" style="margin-bottom: 15px;">
                                    <textarea id="observacoes-local" style="width: 100%; padding: 12px; border: 1px solid #ffc107; border-radius: 6px; font-size: 14px; resize: vertical; min-height: 100px; font-family: inherit;" placeholder="Observações que serão salvas apenas no seu navegador...">${observacaoLocal || ''}</textarea>
                                </div>
                                <div class="info-text" style="background: #fff3cd; padding: 10px; border-radius: 4px; border-left: 4px solid #ffc107;">
                                    <small style="color: #856404;">
                                        <i class="fas fa-info-circle"></i> Estas observações são salvas apenas no seu navegador e não são enviadas para o servidor.
                                    </small>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer" style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px;">
                            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer;">Cancelar</button>
                            <button type="button" class="btn btn-success" onclick="vendasManager.salvarTodasObservacoes(${vendaId})" style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 6px; cursor: pointer;">
                                <i class="fas fa-save"></i> Salvar Todas
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHTML);
            
            const modal = document.querySelector('.gerenciar-observacoes-modal');
            const closeBtn = modal.querySelector('.close-modal');
            
            closeBtn.addEventListener('click', () => modal.remove());
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });
        } catch (error) {
            console.error('Erro ao carregar dados da venda:', error);
            this.mostrarNotificacao('Erro ao carregar dados da venda', 'error');
        }
    }

    async salvarTodasObservacoes(vendaId) {
        const observacoesServidor = document.getElementById('observacoes-servidor').value.trim();
        const observacoesLocal = document.getElementById('observacoes-local').value.trim();

        try {
            // Salvar observações do servidor
            if (observacoesServidor !== '') {
                const dadosAtualizacao = {
                    observacoes: observacoesServidor
                };

                await this.fetchAuth(`https://api-nexoerp.vercel.app/api/vendas/${vendaId}`, {
                    method: 'PUT',
                    body: JSON.stringify(dadosAtualizacao)
                });
            }

            // Salvar observações locais
            this.salvarObservacao(vendaId, observacoesLocal);

            this.mostrarNotificacao('Observações salvas com sucesso!', 'success');
            
            const modal = document.querySelector('.gerenciar-observacoes-modal');
            if (modal) modal.remove();
            
            this.carregarVendas();
        } catch (error) {
            console.error('Erro ao salvar observações:', error);
            this.mostrarNotificacao('Erro ao salvar observações: ' + error.message, 'error');
        }
    }

    renderizarPaginacao() {
        const pagination = document.getElementById('pagination');
        if (!pagination) return;

        if (!Array.isArray(this.vendasFiltradas)) {
            pagination.innerHTML = '';
            return;
        }

        const totalPages = Math.ceil(this.vendasFiltradas.length / this.filtros.limit);
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let paginationHTML = `
            <div class="pagination-info">
                Mostrando ${Math.min(this.filtros.limit, this.vendasFiltradas.length)} de ${this.vendasFiltradas.length} vendas
            </div>
            <div class="pagination-controls">
        `;
        
        if (this.filtros.page > 1) {
            paginationHTML += `
                <button class="pagination-btn" data-page="${this.filtros.page - 1}">
                    <i class="fas fa-chevron-left"></i>
                </button>
            `;
        }

        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.filtros.page - 2 && i <= this.filtros.page + 2)) {
                paginationHTML += `
                    <button class="pagination-btn ${i === this.filtros.page ? 'active' : ''}" data-page="${i}">
                        ${i}
                    </button>
                `;
            } else if (i === this.filtros.page - 3 || i === this.filtros.page + 3) {
                paginationHTML += `<span class="pagination-ellipsis">...</span>`;
            }
        }

        if (this.filtros.page < totalPages) {
            paginationHTML += `
                <button class="pagination-btn" data-page="${this.filtros.page + 1}">
                    <i class="fas fa-chevron-right"></i>
                </button>
            `;
        }

        paginationHTML += `</div>`;
        pagination.innerHTML = paginationHTML;

        pagination.querySelectorAll('.pagination-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = parseInt(e.target.getAttribute('data-page'));
                this.filtros.page = page;
                this.renderizarVendas();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        });
    }

    atualizarMetricas() {
        if (!Array.isArray(this.vendasFiltradas)) {
            return;
        }

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        let salesToday = 0;
        let salesMonth = 0;
        let completedSales = 0;
        let pendingSales = 0;

        this.vendasFiltradas.forEach(venda => {
            const saleDate = this.parseDate(venda.data);
            if (!saleDate) return;

            const saleValue = venda.total || 0;

            if (saleDate >= todayStart && saleDate < todayEnd) {
                salesToday += saleValue;
            }

            if (saleDate >= monthStart && saleDate <= monthEnd) {
                salesMonth += saleValue;
            }

            if (venda.status === 'Concluida') {
                completedSales++;
            } else if (venda.status === 'Pendente') {
                pendingSales++;
            }
        });

        const salesTodayElement = document.getElementById('salesToday');
        const salesMonthElement = document.getElementById('salesMonth');
        const completedSalesElement = document.getElementById('completedSales');
        const pendingSalesElement = document.getElementById('pendingSales');

        if (salesTodayElement) salesTodayElement.textContent = this.formatarMoeda(salesToday);
        if (salesMonthElement) salesMonthElement.textContent = this.formatarMoeda(salesMonth);
        if (completedSalesElement) completedSalesElement.textContent = completedSales;
        if (pendingSalesElement) pendingSalesElement.textContent = pendingSales;
    }

    getStatusText(status) {
        const statusMap = {
            'Concluida': 'Concluída',
            'Pendente': 'Pendente',
            'Cancelada': 'Cancelada'
        };
        return statusMap[status] || status || 'Desconhecido';
    }

    // ========== MODAIS DE VENDAS ==========
    async visualizarVenda(id) {
        try {
            const venda = await this.fetchAuth(`https://api-nexoerp.vercel.app/api/vendas/${id}`);
            this.mostrarModalDetalhesVenda(venda);
        } catch (error) {
            console.error('Erro ao carregar detalhes da venda:', error);
            this.mostrarNotificacao('Erro ao carregar detalhes da venda', 'error');
        }
    }

    mostrarModalDetalhesVenda(venda) {
        const observacaoLocal = this.obterObservacao(venda.id);
        
        const modalHTML = `
            <div class="modal-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
                <div class="modal-content" style="background: white; padding: 30px; border-radius: 12px; max-width: 900px; width: 95%; max-height: 90vh; overflow-y: auto;">
                    <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px;">
                        <h3 style="margin: 0; color: #333;">Detalhes da Venda #${venda.id}</h3>
                        <button onclick="this.closest('.modal-overlay').remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666;">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                            <div class="info-section">
                                <h4 style="margin: 0 0 15px 0; color: #555; border-bottom: 2px solid #007bff; padding-bottom: 5px;">Informações da Venda</h4>
                                <div class="detail-grid" style="display: grid; gap: 12px;">
                                    <div class="detail-row">
                                        <strong style="color: #333;">Número:</strong> 
                                        <span>#${venda.id}</span>
                                    </div>
                                    <div class="detail-row">
                                        <strong style="color: #333;">Data:</strong> 
                                        <span>${venda.data}</span>
                                    </div>
                                    <div class="detail-row">
                                        <strong style="color: #333;">Status:</strong> 
                                        <span class="status-badge status-${(venda.status || '').toLowerCase()}">
                                            ${this.getStatusText(venda.status)}
                                        </span>
                                    </div>
                                    <div class="detail-row">
                                        <strong style="color: #333;">Total:</strong> 
                                        <span style="font-weight: bold; color: #28a745;">R$ ${(venda.total || 0).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            <div class="info-section">
                                <h4 style="margin: 0 0 15px 0; color: #555; border-bottom: 2px solid #28a745; padding-bottom: 5px;">Cliente e Vendedor</h4>
                                <div class="detail-grid" style="display: grid; gap: 12px;">
                                    <div class="detail-row">
                                        <strong style="color: #333;">Cliente:</strong> 
                                        <span>${venda.cliente?.nome || 'N/A'}</span>
                                    </div>
                                    <div class="detail-row">
                                        <strong style="color: #333;">Email:</strong> 
                                        <span>${venda.cliente?.email || 'N/A'}</span>
                                    </div>
                                    <div class="detail-row">
                                        <strong style="color: #333;">Vendedor:</strong> 
                                        <span>${venda.usuario?.nome || 'N/A'}</span>
                                    </div>
                                    <div class="detail-row">
                                        <strong style="color: #333;">Perfil:</strong> 
                                        <span>${venda.usuario?.perfil || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="info-section" style="margin-top: 20px;">
                            <h4 style="margin: 0 0 15px 0; color: #555; border-bottom: 2px solid #ffc107; padding-bottom: 5px;">Itens da Venda</h4>
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead>
                                    <tr style="background: #f8f9fa;">
                                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Produto</th>
                                        <th style="padding: 12px; text-align: center; border-bottom: 1px solid #ddd;">Quantidade</th>
                                        <th style="padding: 12px; text-align: right; border-bottom: 1px solid #ddd;">Preço Unit.</th>
                                        <th style="padding: 12px; text-align: right; border-bottom: 1px solid #ddd;">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${venda.itens && venda.itens.length > 0 ? venda.itens.map(item => `
                                        <tr>
                                            <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.produto?.nome || 'N/A'}</td>
                                            <td style="padding: 12px; text-align: center; border-bottom: 1px solid #eee;">${item.quantidade || 0}</td>
                                            <td style="padding: 12px; text-align: right; border-bottom: 1px solid #eee;">R$ ${this.formatarMoeda(item.precoUnit)}</td>
                                            <td style="padding: 12px; text-align: right; border-bottom: 1px solid #eee;">R$ ${this.formatarMoeda((item.quantidade || 0) * (item.precoUnit || 0))}</td>
                                        </tr>
                                    `).join('') : `
                                        <tr>
                                            <td colspan="4" style="padding: 20px; text-align: center; color: #666;">Nenhum item encontrado</td>
                                        </tr>
                                    `}
                                </tbody>
                                <tfoot>
                                    <tr style="background: #f8f9fa;">
                                        <td colspan="3" style="padding: 12px; text-align: right; font-weight: bold;">Total:</td>
                                        <td style="padding: 12px; text-align: right; font-weight: bold; color: #28a745;">R$ R$ ${this.formatarMoeda(venda.total)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        ${(venda.observacoes || observacaoLocal) ? `
                        <div class="info-section" style="margin-top: 20px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                                <h4 style="margin: 0; color: #555; border-bottom: 2px solid #6c757d; padding-bottom: 5px;">Observações</h4>
                                <button type="button" class="btn btn-primary btn-sm" onclick="vendasManager.mostrarModalGerenciarObservacoes(${venda.id})" style="padding: 5px 10px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                                    <i class="fas fa-edit"></i> Gerenciar
                                </button>
                            </div>
                            ${venda.observacoes ? `
                            <div style="background: #e8f5e8; padding: 15px; border-radius: 6px; border-left: 4px solid #28a745; margin-bottom: 15px;">
                                <h5 style="margin: 0 0 10px 0; color: #155724;"><i class="fas fa-database"></i> Observações do Servidor</h5>
                                <p style="margin: 0; color: #155724; line-height: 1.5; white-space: pre-wrap;">${this.escapeHtml(venda.observacoes)}</p>
                            </div>
                            ` : ''}
                            ${observacaoLocal ? `
                            <div style="background: #fff3cd; padding: 15px; border-radius: 6px; border-left: 4px solid #ffc107;">
                                <h5 style="margin: 0 0 10px 0; color: #856404;"><i class="fas fa-sticky-note"></i> Observações Locais</h5>
                                <p style="margin: 0; color: #856404; line-height: 1.5; white-space: pre-wrap;">${this.escapeHtml(observacaoLocal)}</p>
                            </div>
                            ` : ''}
                        </div>
                        ` : ''}
                    </div>
                    <div class="modal-footer" style="margin-top: 25px; display: flex; gap: 10px; justify-content: flex-end; border-top: 1px solid #eee; padding-top: 20px;">
                        <button onclick="vendasManager.editarVenda(${venda.id})" class="btn btn-primary">
                            <i class="fas fa-edit"></i> Editar Venda
                        </button>
                        <button onclick="vendasManager.mostrarModalGerenciarObservacoes(${venda.id})" class="btn btn-warning">
                            <i class="fas fa-notes-medical"></i> Gerenciar Observações
                        </button>
                        <button onclick="this.closest('.modal-overlay').remove()" class="btn btn-secondary">Fechar</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    async editarVenda(id) {
        try {
            const venda = await this.fetchAuth(`https://api-nexoerp.vercel.app/api/vendas/${id}`);
            this.mostrarModalEdicaoVenda(venda);
        } catch (error) {
            console.error('Erro ao carregar dados da venda para edição:', error);
            this.mostrarNotificacao('Erro ao carregar dados da venda', 'error');
        }
    }

    mostrarModalEdicaoVenda(venda) {
        const modalHTML = `
            <div class="modal-overlay edicao-venda-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
                <div class="modal-content" style="background: white; padding: 30px; border-radius: 12px; max-width: 800px; width: 95%; max-height: 90vh; overflow-y: auto;">
                    <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px;">
                        <h3 style="margin: 0; color: #333;">Editar Venda #${venda.id}</h3>
                        <button class="close-modal" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666;">&times;</button>
                    </div>
                    <form id="venda-edit-form">
                        <input type="hidden" id="vendaId" value="${venda.id}">
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                            <div class="form-section">
                                <h4 style="margin: 0 0 15px 0; color: #555; border-bottom: 2px solid #007bff; padding-bottom: 5px;">Informações Básicas</h4>
                                
                                <div class="form-group" style="margin-bottom: 15px;">
                                    <label for="cliente" style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Cliente *</label>
                                    <select id="cliente" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;" required>
                                        <option value="">Selecione um cliente</option>
                                        ${this.clientes.map(cliente => `
                                            <option value="${cliente.id}" ${venda.clienteId === cliente.id ? 'selected' : ''}>${cliente.nome}</option>
                                        `).join('')}
                                    </select>
                                </div>

                                <div class="form-group" style="margin-bottom: 15px;">
                                    <label for="data" style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Data *</label>
                                    <input type="datetime-local" id="data" value="${this.formatarDataParaInput(venda.data)}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;" required>
                                </div>

                                <div class="form-group" style="margin-bottom: 15px;">
                                    <label for="status" style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Status *</label>
                                    <select id="status" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;" required>
                                        <option value="Concluida" ${venda.status === 'Concluida' ? 'selected' : ''}>Concluída</option>
                                        <option value="Pendente" ${venda.status === 'Pendente' ? 'selected' : ''}>Pendente</option>
                                        <option value="Cancelada" ${venda.status === 'Cancelada' ? 'selected' : ''}>Cancelada</option>
                                    </select>
                                </div>
                            </div>

                            <div class="form-section">
                                <h4 style="margin: 0 0 15px 0; color: #555; border-bottom: 2px solid #28a745; padding-bottom: 5px;">Valores</h4>
                                
                                <div class="form-group" style="margin-bottom: 15px;">
                                    <label for="total" style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Total (R$) *</label>
                                    <input type="text" id="total" value="${this.formatarMoeda(venda.total)}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;" required>
                                </div>

                                <div class="form-group" style="margin-bottom: 15px;">
                                    <label for="observacoes" style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Observações (Servidor)</label>
                                    <textarea id="observacoes" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; resize: vertical; min-height: 80px;" placeholder="Observações sobre a venda...">${venda.observacoes || ''}</textarea>
                                </div>
                            </div>
                        </div>

                        <div id="errorMsg" style="display: none; background: #fee; color: #c33; padding: 12px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #dc3545;"></div>
                        <div id="successMsg" style="display: none; background: #efe; color: #363; padding: 12px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #28a745;"></div>

                        <div class="modal-footer" style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 25px; border-top: 1px solid #eee; padding-top: 20px;">
                            <button type="button" class="btn btn-danger" onclick="vendasManager.confirmarExclusaoVenda(${venda.id}, '${this.escapeHtml(`Venda #${venda.id}`)}')" style="padding: 10px 20px; background: #dc3545; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
                                <i class="fas fa-trash"></i> Excluir
                            </button>
                            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
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
        this.configurarModalEdicaoVenda();
    }

    configurarModalEdicaoVenda() {
        const modal = document.querySelector('.edicao-venda-modal');
        const form = document.getElementById('venda-edit-form');
        const closeBtn = modal.querySelector('.close-modal');

        closeBtn.addEventListener('click', () => modal.remove());
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        form.addEventListener('submit', (e) => this.handleSubmitEdicaoVenda(e));
    }

    async handleSubmitEdicaoVenda(e) {
        e.preventDefault();
        
        const form = document.getElementById('venda-edit-form');
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        submitBtn.disabled = true;

        try {
            const formData = this.obterDadosFormularioVenda();
            await this.atualizarVenda(formData);
            
        } catch (error) {
            console.error('Erro:', error);
            this.mostrarErroModal(error.message || 'Erro ao salvar alterações');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    obterDadosFormularioVenda() {
    const vendaId = document.getElementById('vendaId').value;
    const clienteId = document.getElementById('cliente').value;
    const data = document.getElementById('data').value;
    const status = document.getElementById('status').value;
    const total = document.getElementById('total').value;
    const observacoes = document.getElementById('observacoes').value;

    if (!clienteId || !data || !status || !total) {
        throw new Error('Todos os campos obrigatórios devem ser preenchidos');
    }

    return {
        vendaId: parseInt(vendaId),
        dados: {
            data: new Date(data).toISOString(),
            status: status,
            total: this.converterMoedaParaNumero(total), // ← AQUI MUDEI
            observacoes: observacoes || null,
            cliente: {
                connect: { id: parseInt(clienteId) }
            }
        }
    };

    }

    async atualizarVenda({ vendaId, dados }) {
        try {
            console.log('Dados para atualização:', dados);

            const response = await this.fetchAuth(`https://api-nexoerp.vercel.app/api/vendas/${vendaId}`, {
                method: 'PUT',
                body: JSON.stringify(dados)
            });

            console.log('Resposta da atualização:', response);

            this.mostrarSucessoModal('Venda atualizada com sucesso!');
            
            setTimeout(() => {
                const modal = document.querySelector('.edicao-venda-modal');
                if (modal) modal.remove();
                this.carregarVendas();
            }, 1500);
        } catch (error) {
            console.error('Erro detalhado:', error);
            throw new Error(error.message || 'Erro ao atualizar venda');
        }
    }

    async excluirVenda(id) {
        if (confirm('Tem certeza que deseja excluir esta venda?')) {
            try {
                await this.fetchAuth(`https://api-nexoerp.vercel.app/api/vendas/${id}`, {
                    method: 'DELETE'
                });
                this.mostrarNotificacao('Venda excluída com sucesso!', 'success');
                this.carregarVendas();
            } catch (error) {
                console.error('Erro ao excluir venda:', error);
                this.mostrarNotificacao('Erro ao excluir venda: ' + error.message, 'error');
            }
        }
    }

    confirmarExclusaoVenda(vendaId, vendaNome) {
        const modalHTML = `
            <div class="modal-overlay confirmacao-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1001;">
                <div class="modal-content" style="background: white; padding: 30px; border-radius: 12px; max-width: 400px; width: 90%;">
                    <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h3 style="margin: 0;">Confirmar Exclusão</h3>
                        <button class="close-confirmacao" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>Tem certeza que deseja excluir a <strong>${this.escapeHtml(vendaNome)}</strong>?</p>
                        <p style="color: #dc3545; font-size: 0.9rem; margin-top: 10px;">Esta ação não pode ser desfeita.</p>
                    </div>
                    <div class="modal-footer" style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()" style="padding: 10px 15px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Cancelar</button>
                        <button type="button" class="btn btn-danger" onclick="vendasManager.executarExclusaoVenda(${vendaId})" style="padding: 10px 15px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">Excluir</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        const modal = document.querySelector('.confirmacao-modal');
        const closeBtn = modal.querySelector('.close-confirmacao');
        
        closeBtn.addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    async executarExclusaoVenda(vendaId) {
        try {
            await this.fetchAuth(`https://api-nexoerp.vercel.app/api/vendas/${vendaId}`, {
                method: 'DELETE'
            });

            this.mostrarSucessoModal('Venda excluída com sucesso!');
            const modal = document.querySelector('.confirmacao-modal');
            if (modal) modal.remove();
            
            setTimeout(() => {
                const edicaoModal = document.querySelector('.edicao-venda-modal');
                if (edicaoModal) edicaoModal.remove();
                this.carregarVendas();
            }, 1500);
        } catch (error) {
            console.error('Erro:', error);
            this.mostrarErroModal(error.message);
        }
    }

    // ========== FUNÇÕES AUXILIARES ==========
    formatarDataParaInput(dateString) {
        if (!dateString) return '';
        
        const date = this.parseDate(dateString);
        if (!date) return '';
        
        return date.toISOString().slice(0, 16);
    }

    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    async fetchAuth(url, options = {}) {
        const config = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            },
            ...options
        };

        if (options.body) {
            config.body = options.body;
        }

        const response = await fetch(url, config);

        if (!response.ok) {
            let errorMessage = `Erro ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorData.message || errorMessage;
                if (errorData.detalhes) {
                    errorMessage += ` - ${JSON.stringify(errorData.detalhes)}`;
                }
            } catch (e) {
                // Se não conseguir parsear o JSON, usa o status
            }
            throw new Error(errorMessage);
        }

        return await response.json();
    }

    mostrarNotificacao(mensagem, tipo = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${tipo}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            border-left: 4px solid ${tipo === 'success' ? '#28a745' : tipo === 'error' ? '#dc3545' : '#007bff'};
            z-index: 1000;
            max-width: 400px;
        `;
        
        notification.innerHTML = `
            <div class="notification-content" style="display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-${tipo === 'success' ? 'check' : tipo === 'error' ? 'exclamation-triangle' : 'info'}" 
                   style="color: ${tipo === 'success' ? '#28a745' : tipo === 'error' ? '#dc3545' : '#007bff'};"></i>
                <span>${mensagem}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    mostrarErroModal(mensagem) {
        const errorDiv = document.getElementById('errorMsg');
        if (errorDiv) {
            errorDiv.textContent = mensagem;
            errorDiv.style.display = 'block';
            const successDiv = document.getElementById('successMsg');
            if (successDiv) successDiv.style.display = 'none';
        }
    }

    mostrarSucessoModal(mensagem) {
        const successDiv = document.getElementById('successMsg');
        if (successDiv) {
            successDiv.textContent = mensagem;
            successDiv.style.display = 'block';
            const errorDiv = document.getElementById('errorMsg');
            if (errorDiv) errorDiv.style.display = 'none';
        }
    }
}

// Inicialização quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    window.vendasManager = new VendasManager();
});