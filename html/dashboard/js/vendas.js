// vendas.js - VERSÃO CORRIGIDA COM PAGINAÇÃO E FILTROS FUNCIONAIS
class VendasManager {
    constructor() {
        this.token = localStorage.getItem('token');
        this.userData = JSON.parse(localStorage.getItem('user') || 'null');
        this.todasVendas = []; // Todas as vendas carregadas da API
        this.vendas = []; // Vendas atuais (mantém compatibilidade)
        this.clientes = [];
        this.vendedores = [];
        this.observacoesVendas = this.carregarObservacoes();
        this.filtros = {
            search: '',
            status: '',
            cliente: '',
            vendedor: '',
            periodo: 'all',
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
            console.log('Total de vendas carregadas da API:', response.vendas?.length || 0);
            
            this.todasVendas = response.vendas || [];
            this.vendas = this.todasVendas; // Mantém compatibilidade
            
            console.log('Total de vendas armazenadas:', this.todasVendas.length);
            
            // Atualizar métricas com todas as vendas
            this.atualizarMetricas();
            
            // Aplicar filtros iniciais
            this.aplicarFiltrosReiniciar();
            
        } catch (error) {
            console.error('Erro ao carregar vendas:', error);
            this.mostrarNotificacao('Erro ao carregar vendas: ' + error.message, 'error');
        }
    }

    aplicarFiltrosReiniciar() {
        this.filtros.page = 1; // Volta para página 1
        this.aplicarFiltros();
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
        if (valor === null || valor === undefined) return '0,00';
        
        const numero = parseFloat(valor);
        if (isNaN(numero)) return '0,00';
        
        return new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(numero);
    }

    converterMoedaParaNumero(valorString) {
        console.log('Convertendo moeda:', valorString);
        
        if (!valorString) return 0;
        
        // Converte para string e remove espaços
        let valorLimpo = valorString.toString().trim();
        
        // Remove "R$" se existir
        valorLimpo = valorLimpo.replace('R$', '').trim();
        
        // Remove todos os pontos (separadores de milhar)
        valorLimpo = valorLimpo.replace(/\./g, '');
        
        // Substitui vírgula por ponto para parseFloat funcionar
        valorLimpo = valorLimpo.replace(',', '.');
        
        const valorNumerico = parseFloat(valorLimpo);
        const resultado = isNaN(valorNumerico) ? 0 : valorNumerico;
        
        console.log('Resultado da conversão:', resultado);
        return resultado;
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
            // Usar debounce para melhor performance
            let timeout;
            searchFilter.addEventListener('input', (e) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    this.filtros.search = e.target.value;
                    this.filtros.page = 1;
                    this.aplicarFiltros();
                }, 300);
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

    // Método auxiliar para calcular períodos de data
    // No método calcularPeriodo(), adicione:
calcularPeriodo(periodo) {
    const now = new Date();
    console.log('Data atual:', now.toISOString(), 'Mês atual:', now.getMonth() + 1, 'Ano atual:', now.getFullYear());
    
    let dataInicio, dataFim;
    
    switch (periodo) {
        case 'today':
            dataInicio = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            dataFim = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            break;
            
        case 'month':
            dataInicio = new Date(now.getFullYear(), now.getMonth(), 1);
            dataFim = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            dataFim.setHours(23, 59, 59, 999);
            console.log('Período do mês:', dataInicio.toISOString(), 'a', dataFim.toISOString());
            break;
            
        // ... outros casos
    }
    
    return { dataInicio, dataFim };
}

    aplicarFiltros() {
        console.log('Aplicando filtros:', this.filtros);
        
        // Começar com todas as vendas
        let vendasFiltradas = [...this.todasVendas];
        
        console.log('Vendas antes dos filtros:', vendasFiltradas.length);

        // 1. Filtro de busca geral
        if (this.filtros.search) {
            const searchTerm = this.filtros.search.toLowerCase();
            vendasFiltradas = vendasFiltradas.filter(venda => {
                // Verificar ID
                if (venda.id.toString().includes(searchTerm)) return true;
                
                // Verificar nome do cliente
                if (venda.cliente?.nome && venda.cliente.nome.toLowerCase().includes(searchTerm)) return true;
                
                // Verificar nome do vendedor
                if (venda.usuario?.nome && venda.usuario.nome.toLowerCase().includes(searchTerm)) return true;
                
                // Verificar observações do servidor
                if (venda.observacoes && venda.observacoes.toLowerCase().includes(searchTerm)) return true;
                
                // Verificar observações locais
                const observacaoLocal = this.obterObservacao(venda.id);
                if (observacaoLocal && observacaoLocal.toLowerCase().includes(searchTerm)) return true;
                
                // Verificar itens
                if (venda.itens && Array.isArray(venda.itens)) {
                    const itemEncontrado = venda.itens.some(item => 
                        item.produto?.nome && item.produto.nome.toLowerCase().includes(searchTerm)
                    );
                    if (itemEncontrado) return true;
                }
                
                return false;
            });
            console.log('Após filtro de busca:', vendasFiltradas.length);
        }

        // 2. Filtro por status
        if (this.filtros.status) {
            vendasFiltradas = vendasFiltradas.filter(venda => venda.status === this.filtros.status);
            console.log('Após filtro de status:', vendasFiltradas.length);
        }

        // 3. Filtro por cliente
        if (this.filtros.cliente) {
            vendasFiltradas = vendasFiltradas.filter(venda => 
                venda.clienteId == this.filtros.cliente || venda.cliente?.id == this.filtros.cliente
            );
            console.log('Após filtro de cliente:', vendasFiltradas.length);
        }

        // 4. Filtro por vendedor
        if (this.filtros.vendedor) {
            vendasFiltradas = vendasFiltradas.filter(venda => 
                venda.usuarioId == this.filtros.vendedor || venda.usuario?.id == this.filtros.vendedor
            );
            console.log('Após filtro de vendedor:', vendasFiltradas.length);
        }

        // 5. Filtro por período
        if (this.filtros.periodo && this.filtros.periodo !== 'all') {
            const { dataInicio, dataFim } = this.calcularPeriodo(this.filtros.periodo);
            
            if (dataInicio && dataFim) {
                vendasFiltradas = vendasFiltradas.filter(venda => {
                    const dataVenda = this.parseDate(venda.data);
                    if (!dataVenda) return false;
                    
                    // Verificar se a data está dentro do período
                    return dataVenda >= dataInicio && dataVenda <= dataFim;
                });
                console.log('Após filtro de período:', vendasFiltradas.length);
            }
        }

        // Ordenar por data (mais recente primeiro)
        vendasFiltradas.sort((a, b) => {
            const dataA = this.parseDate(a.data);
            const dataB = this.parseDate(b.data);
            
            if (!dataA || !dataB) return 0;
            
            return dataB.getTime() - dataA.getTime();
        });

        // Salvar vendas filtradas
        this.vendasFiltradas = vendasFiltradas;
        console.log('Total de vendas após filtros:', this.vendasFiltradas.length);

        // Renderizar a página atual
        this.renderizarVendas();
        this.atualizarMetricas();
    }

    parseDate(dateString) {
    if (!dateString || dateString === '') {
        console.warn('Data string vazia ou nula:', dateString);
        return null;
    }
    
    console.log('Parsing date (BR):', dateString);
    
    // Tenta primeiro como formato brasileiro: DD/MM/YYYY HH:MM
    const formatoBrasileiroComHora = /^(\d{1,2})\/(\d{1,2})\/(\d{4}) (\d{1,2}):(\d{1,2})$/;
    const matchBRComHora = dateString.match(formatoBrasileiroComHora);
    if (matchBRComHora) {
        const [, day, month, year, hour, minute] = matchBRComHora;
        console.log(`Parseado como BR: dia=${day}, mês=${month}, ano=${year}, hora=${hour}, min=${minute}`);
        return new Date(year, month - 1, day, hour, minute);
    }
    
    // Tenta formato brasileiro sem hora: DD/MM/YYYY
    const formatoBrasileiroSemHora = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const matchBRSemHora = dateString.match(formatoBrasileiroSemHora);
    if (matchBRSemHora) {
        const [, day, month, year] = matchBRSemHora;
        console.log(`Parseado como BR: dia=${day}, mês=${month}, ano=${year}`);
        return new Date(year, month - 1, day);
    }
    
    // Tenta formato brasileiro com ano de 2 dígitos: DD/MM/YY HH:MM
    const formatoBRAnoCurtoComHora = /^(\d{1,2})\/(\d{1,2})\/(\d{2}) (\d{1,2}):(\d{1,2})$/;
    const matchBRAnoCurtoComHora = dateString.match(formatoBRAnoCurtoComHora);
    if (matchBRAnoCurtoComHora) {
        const [, day, month, year, hour, minute] = matchBRAnoCurtoComHora;
        const fullYear = 2000 + parseInt(year);
        console.log(`Parseado como BR (ano curto): dia=${day}, mês=${month}, ano=${fullYear}, hora=${hour}, min=${minute}`);
        return new Date(fullYear, month - 1, day, hour, minute);
    }
    
    // Tenta formato brasileiro com ano de 2 dígitos sem hora: DD/MM/YY
    const formatoBRAnoCurtoSemHora = /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/;
    const matchBRAnoCurtoSemHora = dateString.match(formatoBRAnoCurtoSemHora);
    if (matchBRAnoCurtoSemHora) {
        const [, day, month, year] = matchBRAnoCurtoSemHora;
        const fullYear = 2000 + parseInt(year);
        console.log(`Parseado como BR (ano curto): dia=${day}, mês=${month}, ano=${fullYear}`);
        return new Date(fullYear, month - 1, day);
    }
    
    // Se não for formato brasileiro, tenta como ISO
    let date = new Date(dateString);
    if (!isNaN(date.getTime())) {
        console.log('Parseado como ISO:', date);
        return date;
    }
    
    console.error('Não foi possível parsear a data:', dateString);
    return null;
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

        console.log(`Renderizando página ${this.filtros.page} (${startIndex}-${endIndex}) de ${this.vendasFiltradas.length} vendas`);

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
                        ${this.vendasFiltradas.length > 0 ? '<small>Tente ajustar os filtros</small>' : ''}
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = vendas.map(venda => {
            console.log('Renderizando venda ID:', venda.id);
            
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
                    ${this.vendasFiltradas.length > 0 ? '<small>Tente ajustar os filtros</small>' : ''}
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
                        <div class="header-actions">
                            ${temObservacaoServidor ? `
                                <span class="notes-indicator server-indicator" title="Observações no servidor">
                                    <i class="fas fa-database"></i>
                                </span>
                            ` : ''}
                            ${temObservacaoLocal ? `
                                <span class="notes-indicator local-indicator" title="Observações locais">
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
                                <span class="info-content"><strong>Cliente:</strong> ${venda.cliente?.nome || 'N/A'}</span>
                            </div>
                            <div class="info-item">
                                <i class="fas fa-user-tie"></i>
                                <span class="info-content"><strong>Vendedor:</strong> ${venda.usuario?.nome || 'N/A'}</span>
                            </div>
                            <div class="info-item">
                                <i class="fas fa-calendar"></i>
                                <span class="info-content"><strong>Data:</strong> ${venda.data}</span>
                            </div>
                        </div>
                        
                        ${temObservacaoServidor ? `
                        <div class="card-notes-preview server-notes">
                            <strong><i class="fas fa-database"></i> Observação (Servidor):</strong>
                            <p>${this.escapeHtml(venda.observacoes)}</p>
                        </div>
                        ` : ''}
                        
                        ${temObservacaoLocal ? `
                        <div class="card-notes-preview local-notes">
                            <strong><i class="fas fa-sticky-note"></i> Observação (Local):</strong>
                            <p>${this.escapeHtml(observacaoLocal)}</p>
                        </div>
                        ` : ''}
                        
                        ${venda.itens && venda.itens.length > 0 ? `
                        <div class="card-products">
                            <strong>Produtos Vendidos:</strong>
                            <ul>
                                ${venda.itens.slice(0, 3).map(item => `
                                    <li>
                                        <span class="product-name">${item.produto?.nome || 'Produto'}</span>
                                        <span class="product-details">${item.quantidade || 0}x - R$ ${this.formatarMoeda(item.precoUnit)}</span>
                                    </li>
                                `).join('')}
                                ${venda.itens.length > 3 ? `
                                    <li class="more-products">
                                        <span class="product-name">+${venda.itens.length - 3} produtos</span>
                                        <span class="product-details">Ver todos</span>
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
                            <button class="btn-action btn-view" data-id="${venda.id}" title="Visualizar Venda">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-action btn-edit" data-id="${venda.id}" title="Editar Venda">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-action btn-notes" data-id="${venda.id}" title="Gerenciar Observações">
                                <i class="fas fa-notes-medical"></i>
                            </button>
                            <button class="btn-action btn-delete" data-id="${venda.id}" title="Excluir Venda">
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
                console.log('Visualizando venda ID:', id);
                
                if (!id || id === 'null' || id === 'undefined') {
                    console.error('ID inválido ao visualizar venda:', id);
                    this.mostrarNotificacao('ID da venda inválido', 'error');
                    return;
                }
                
                this.visualizarVenda(id);
            });
        });

        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                console.log('Editando venda ID:', id);
                
                if (!id || id === 'null' || id === 'undefined') {
                    console.error('ID inválido ao editar venda:', id);
                    this.mostrarNotificacao('ID da venda inválido', 'error');
                    return;
                }
                
                this.editarVenda(id);
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                console.log('Excluindo venda ID:', id);
                
                if (!id || id === 'null' || id === 'undefined') {
                    console.error('ID inválido ao excluir venda:', id);
                    this.mostrarNotificacao('ID da venda inválido', 'error');
                    return;
                }
                
                this.excluirVenda(id);
            });
        });

        document.querySelectorAll('.notes-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                console.log('Gerenciando observações ID:', id);
                
                if (!id || id === 'null' || id === 'undefined') {
                    console.error('ID inválido para observações:', id);
                    this.mostrarNotificacao('ID da venda inválido', 'error');
                    return;
                }
                
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

        const totalVendas = this.vendasFiltradas.length;
        const totalPages = Math.ceil(totalVendas / this.filtros.limit);
        
        // Se não houver vendas, não mostra paginação
        if (totalVendas === 0) {
            pagination.innerHTML = '';
            return;
        }
        
        // Se houver apenas uma página, mostra apenas a informação
        if (totalPages <= 1) {
            pagination.innerHTML = `
                <div class="pagination-info">
                    Mostrando ${Math.min(this.filtros.limit, totalVendas)} de ${totalVendas} vendas
                </div>
            `;
            return;
        }

        // Calcular itens mostrados
        const startItem = ((this.filtros.page - 1) * this.filtros.limit) + 1;
        const endItem = Math.min(this.filtros.page * this.filtros.limit, totalVendas);

        let paginationHTML = `
            <div class="pagination-info">
                Mostrando ${startItem} a ${endItem} de ${totalVendas} vendas
            </div>
            <div class="pagination-controls">
        `;
        
        // Botão anterior
        if (this.filtros.page > 1) {
            paginationHTML += `
                <button class="pagination-btn" data-page="${this.filtros.page - 1}">
                    <i class="fas fa-chevron-left"></i>
                </button>
            `;
        }

        // Lógica melhorada para mostrar páginas
        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.filtros.page - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        // Ajustar se não temos páginas suficientes no início
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        // Primeira página (sempre mostrar se não for a primeira)
        if (startPage > 1) {
            paginationHTML += `
                <button class="pagination-btn" data-page="1">1</button>
                ${startPage > 2 ? '<span class="pagination-ellipsis">...</span>' : ''}
            `;
        }
        
        // Páginas do meio
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="pagination-btn ${i === this.filtros.page ? 'active' : ''}" 
                        data-page="${i}">
                    ${i}
                </button>
            `;
        }
        
        // Última página (sempre mostrar se não for a última)
        if (endPage < totalPages) {
            paginationHTML += `
                ${endPage < totalPages - 1 ? '<span class="pagination-ellipsis">...</span>' : ''}
                <button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>
            `;
        }
        
        // Botão próximo
        if (this.filtros.page < totalPages) {
            paginationHTML += `
                <button class="pagination-btn" data-page="${this.filtros.page + 1}">
                    <i class="fas fa-chevron-right"></i>
                </button>
            `;
        }

        paginationHTML += `</div>`;
        pagination.innerHTML = paginationHTML;

        // Corrigir event listener para usar currentTarget
        pagination.querySelectorAll('.pagination-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = parseInt(e.currentTarget.getAttribute('data-page'));
                if (page !== this.filtros.page) {
                    this.filtros.page = page;
                    this.renderizarVendas(); // Apenas renderiza novamente (os dados já estão filtrados)
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        });
    }

    atualizarMetricas() {
        // Usar TODAS as vendas para calcular métricas, não apenas as filtradas
        if (!Array.isArray(this.todasVendas) || this.todasVendas.length === 0) {
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

        this.todasVendas.forEach(venda => {
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
        console.log('Iniciando visualização da venda ID:', id);
        
        if (!id || id === 'null' || id === 'undefined') {
            console.error('ID inválido:', id);
            this.mostrarNotificacao('ID da venda inválido', 'error');
            return;
        }
        
        try {
            const venda = await this.fetchAuth(`https://api-nexoerp.vercel.app/api/vendas/${id}`);
            console.log('Dados da venda recebidos:', venda);
            this.mostrarModalDetalhesVenda(venda);
        } catch (error) {
            console.error('Erro ao carregar detalhes da venda:', error);
            this.mostrarNotificacao(`Erro ao carregar detalhes da venda: ${error.message}`, 'error');
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
        const dataInput = document.getElementById('data').value; // Formato: "YYYY-MM-DDTHH:mm"
        const status = document.getElementById('status').value;
        const total = document.getElementById('total').value;
        const observacoes = document.getElementById('observacoes').value;

        if (!clienteId || !dataInput || !status || !total) {
            throw new Error('Todos os campos obrigatórios devem ser preenchidos');
        }

        // Converte de "YYYY-MM-DDTHH:mm" para Date e depois para ISO
        const dataObj = new Date(dataInput);
        if (isNaN(dataObj.getTime())) {
            throw new Error('Data inválida');
        }

        return {
            vendaId: parseInt(vendaId),
            dados: {
                data: dataObj.toISOString(), // Envia para o backend em formato ISO
                status: status,
                total: this.converterMoedaParaNumero(total),
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
        if (!dateString) {
            console.warn('Data string vazia para formatar input');
            return '';
        }
        
        const date = this.parseDate(dateString);
        if (!date) {
            console.error('Não foi possível parsear data para input:', dateString);
            // Tenta criar uma data atual como fallback
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        }
        
        // Formato para input datetime-local: YYYY-MM-DDTHH:mm
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return `${year}-${month}-${day}T${hours}:${minutes}`;
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
        console.log('Fetch para:', url);
        
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
        console.log('Status da resposta:', response.status);

        if (!response.ok) {
            let errorMessage = `Erro ${response.status}: ${response.statusText}`;
            try {
                const errorData = await response.json();
                console.error('Detalhes do erro:', errorData);
                errorMessage = errorData.error || errorData.message || errorMessage;
                if (errorData.detalhes) {
                    errorMessage += ` - ${JSON.stringify(errorData.detalhes)}`;
                }
            } catch (e) {
                console.error('Erro ao parsear resposta:', e);
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