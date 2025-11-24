// relatorios.js
class RelatoriosApp {
    constructor() {
        this.currentReport = null;
        this.currentView = 'table';
        this.chart = null;
        this.initializeApp();
    }

    initializeApp() {
        this.initializeEventListeners();
        this.initializeDatePickers();
        this.loadReportCategories();
        this.checkAuthentication();
    }

    checkAuthentication() {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }
    }

    initializeEventListeners() {
        // Categorias de relatório
        document.querySelectorAll('.category-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.selectCategory(e.currentTarget.dataset.category);
            });
        });

        // Tipo de relatório
        document.getElementById('report-type').addEventListener('change', (e) => {
            this.updateDynamicFilters(e.target.value);
        });

        // Filtro de agrupamento
        document.getElementById('group-by').addEventListener('change', (e) => {
            this.updateChartOptions();
        });

        // Botões de visualização
        document.querySelectorAll('.btn-view').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchView(e.currentTarget.dataset.view);
            });
        });

        // Tipo de gráfico
        document.getElementById('chart-type-select').addEventListener('change', (e) => {
            this.updateChart();
        });

        // Formulário de filtros
        document.getElementById('report-filters').addEventListener('submit', (e) => {
            e.preventDefault();
            this.generateReport();
        });

        // Exportar PDF
        document.getElementById('export-pdf').addEventListener('click', () => {
            this.exportToPDF();
        });

        // Salvar template
        document.getElementById('save-template').addEventListener('click', () => {
            this.saveTemplate();
        });
    }

    initializeDatePickers() {
        flatpickr('#start-date', {
            dateFormat: 'd/m/Y',
            locale: 'pt',
            defaultDate: new Date(),
            maxDate: new Date()
        });

        flatpickr('#end-date', {
            dateFormat: 'd/m/Y',
            locale: 'pt',
            defaultDate: new Date(),
            maxDate: new Date()
        });
    }

    selectCategory(category) {
        // Remove active class de todos os itens
        document.querySelectorAll('.category-item').forEach(item => {
            item.classList.remove('active');
        });

        // Adiciona active class ao item selecionado
        document.querySelector(`[data-category="${category}"]`).classList.add('active');

        // Atualiza opções do relatório baseado na categoria
        this.updateReportTypeOptions(category);
    }

    updateReportTypeOptions(category) {
        const reportTypeSelect = document.getElementById('report-type');
        reportTypeSelect.innerHTML = '<option value="">Selecione um relatório</option>';

        const options = {
            vendas: [
                { value: 'vendas-por-periodo', text: 'Vendas por Período' },
                { value: 'produtos-mais-vendidos', text: 'Produtos Mais Vendidos' },
                { value: 'vendas-por-vendedor', text: 'Vendas por Vendedor' },
                { value: 'vendas-por-cliente', text: 'Vendas por Cliente' }
            ],
            estoque: [
                { value: 'estoque-atual', text: 'Estoque Atual' },
                { value: 'movimentacao-estoque', text: 'Movimentação de Estoque' },
                { value: 'produtos-baixo-estoque', text: 'Produtos com Baixo Estoque' }
            ],
            financeiro: [
                { value: 'fluxo-caixa', text: 'Fluxo de Caixa' },
                { value: 'receitas-despesas', text: 'Receitas vs Despesas' },
                { value: 'lucro-periodo', text: 'Lucro por Período' }
            ],
            clientes: [
                { value: 'clientes-ativos', text: 'Clientes Ativos' },
                { value: 'clientes-inadimplentes', text: 'Clientes Inadimplentes' },
                { value: 'historico-compras', text: 'Histórico de Compras' }
            ]
        };

        if (options[category]) {
            options[category].forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option.value;
                optionElement.textContent = option.text;
                reportTypeSelect.appendChild(optionElement);
            });
        }

        this.updateDynamicFilters(reportTypeSelect.value);
    }

    updateDynamicFilters(reportType) {
        const dynamicFilters = document.getElementById('dynamic-filters');
        dynamicFilters.innerHTML = '';

        const filters = {
            'vendas-por-periodo': [
                { type: 'select', id: 'status-venda', label: 'Status da Venda', options: ['Todos', 'Concluída', 'Pendente', 'Cancelada'] }
            ],
            'vendas-por-vendedor': [
                { type: 'select', id: 'vendedor', label: 'Vendedor', options: [] }
            ],
            'estoque-atual': [
                { type: 'select', id: 'categoria-produto', label: 'Categoria', options: ['Todas', 'Eletrônicos', 'Roupas', 'Alimentação'] }
            ]
        };

        if (filters[reportType]) {
            filters[reportType].forEach(filter => {
                const filterElement = this.createFilterElement(filter);
                dynamicFilters.appendChild(filterElement);
            });

            // Carrega dados dinâmicos se necessário
            if (reportType === 'vendas-por-vendedor') {
                this.loadVendedores();
            }
        }
    }

    createFilterElement(filter) {
        const div = document.createElement('div');
        div.className = 'form-group';

        if (filter.type === 'select') {
            const label = document.createElement('label');
            label.htmlFor = filter.id;
            label.textContent = filter.label;

            const select = document.createElement('select');
            select.id = filter.id;
            select.className = 'form-select';

            filter.options.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option.toLowerCase();
                optionElement.textContent = option;
                select.appendChild(optionElement);
            });

            div.appendChild(label);
            div.appendChild(select);
        }

        return div;
    }

    async loadVendedores() {
        try {
            const response = await this.apiRequest('/api/usuarios?perfil=vendedor');
            const vendedores = await response.json();
            
            const select = document.getElementById('vendedor');
            select.innerHTML = '<option value="">Todos</option>';
            
            vendedores.forEach(vendedor => {
                const option = document.createElement('option');
                option.value = vendedor.id;
                option.textContent = vendedor.nome;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar vendedores:', error);
        }
    }

    async generateReport() {
        const reportType = document.getElementById('report-type').value;
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        const groupBy = document.getElementById('group-by').value;

        if (!reportType) {
            this.showNotification('Selecione um tipo de relatório', 'error');
            return;
        }

        this.showLoading(true);

        try {
            let response;
            const filters = this.getCurrentFilters();

            switch (reportType) {
                case 'vendas-por-periodo':
                    response = await this.generateSalesReport(startDate, endDate, filters);
                    break;
                case 'produtos-mais-vendidos':
                    response = await this.generateTopProductsReport(startDate, endDate, filters);
                    break;
                case 'vendas-por-vendedor':
                    response = await this.generateSalesBySellerReport(startDate, endDate, filters);
                    break;
                case 'estoque-atual':
                    response = await this.generateStockReport(filters);
                    break;
                default:
                    throw new Error('Tipo de relatório não implementado');
            }

            this.currentReport = response;
            this.displayReport(response);
            
        } catch (error) {
            console.error('Erro ao gerar relatório:', error);
            this.showNotification('Erro ao gerar relatório: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async generateSalesReport(startDate, endDate, filters) {
        const body = {
            dataInicio: this.formatDateForBackend(startDate),
            dataFim: this.formatDateForBackend(endDate),
            status: filters.status
        };

        const response = await this.apiRequest('/api/relatorios/gerar-vendas', {
            method: 'POST',
            body: JSON.stringify(body)
        });

        return await response.json();
    }

    async generateTopProductsReport(startDate, endDate, filters) {
        // Implementar lógica específica para produtos mais vendidos
        const response = await this.apiRequest('/api/relatorios/produtos-mais-vendidos', {
            method: 'POST',
            body: JSON.stringify({
                dataInicio: this.formatDateForBackend(startDate),
                dataFim: this.formatDateForBackend(endDate)
            })
        });

        return await response.json();
    }

    async generateSalesBySellerReport(startDate, endDate, filters) {
        const body = {
            dataInicio: this.formatDateForBackend(startDate),
            dataFim: this.formatDateForBackend(endDate),
            usuarioId: filters.vendedor
        };

        const response = await this.apiRequest('/api/relatorios/gerar-vendas', {
            method: 'POST',
            body: JSON.stringify(body)
        });

        return await response.json();
    }

    async generateStockReport(filters) {
        const response = await this.apiRequest('/api/relatorios', {
            method: 'POST',
            body: JSON.stringify({
                tipo: 'Estoque',
                categoria: filters.categoria
            })
        });

        return await response.json();
    }

    displayReport(reportData) {
        this.displaySummary(reportData);
        this.displayTable(reportData);
        this.displayChart(reportData);
        
        // Mostra os resultados e esconde a mensagem de "sem resultados"
        document.querySelector('.report-results').classList.add('has-results');
        document.querySelector('.no-results').style.display = 'none';
    }

    displaySummary(reportData) {
        const summaryContainer = document.querySelector('.summary-cards');
        summaryContainer.innerHTML = '';

        if (reportData.resumo) {
            const summaries = [
                { label: 'Total de Vendas', value: `R$ ${reportData.resumo.totalVendas?.toFixed(2) || '0,00'}` },
                { label: 'Quantidade', value: reportData.resumo.quantidadeVendas || 0 },
                { label: 'Período', value: `${reportData.resumo.periodo?.dataInicio || '-'} a ${reportData.resumo.periodo?.dataFim || '-'}` }
            ];

            summaries.forEach(summary => {
                const card = document.createElement('div');
                card.className = 'summary-card';
                card.innerHTML = `
                    <div class="summary-value">${summary.value}</div>
                    <div class="summary-label">${summary.label}</div>
                `;
                summaryContainer.appendChild(card);
            });
        }
    }

    displayTable(reportData) {
        const table = document.getElementById('report-table');
        const thead = table.querySelector('thead');
        const tbody = table.querySelector('tbody');
        
        thead.innerHTML = '';
        tbody.innerHTML = '';

        if (!reportData.relatorioVendas && !reportData.relatorioEstoque) {
            return;
        }

        // Cria cabeçalho baseado no tipo de relatório
        let headers = [];
        if (reportData.relatorioVendas) {
            headers = ['ID', 'Cliente', 'Data', 'Valor', 'Status', 'Vendedor'];
        } else if (reportData.relatorioEstoque) {
            headers = ['Produto', 'Estoque Atual', 'Estoque Mínimo', 'Status'];
        }

        const headerRow = document.createElement('tr');
        headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);

        // Preenche dados
        if (reportData.relatorioVendas) {
            reportData.relatorioVendas.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.venda?.id || ''}</td>
                    <td>${item.venda?.cliente?.nome || ''}</td>
                    <td>${item.venda?.data || ''}</td>
                    <td>R$ ${item.venda?.total?.toFixed(2) || '0,00'}</td>
                    <td><span class="status-badge ${item.venda?.status || ''}">${item.venda?.status || ''}</span></td>
                    <td>${item.venda?.usuario?.nome || ''}</td>
                `;
                tbody.appendChild(row);
            });
        }
    }

    displayChart(reportData) {
        const ctx = document.getElementById('report-chart').getContext('2d');
        
        // Destrói gráfico anterior se existir
        if (this.chart) {
            this.chart.destroy();
        }

        const chartType = document.getElementById('chart-type-select').value;
        
        if (reportData.relatorioVendas) {
            this.createSalesChart(ctx, chartType, reportData.relatorioVendas);
        }
    }

    createSalesChart(ctx, type, salesData) {
        const labels = salesData.map(item => {
            const date = new Date(item.venda.data);
            return date.toLocaleDateString('pt-BR');
        });

        const data = salesData.map(item => item.venda.total);

        const chartConfig = {
            type: type === 'bar' ? 'bar' : 
                  type === 'line' ? 'line' :
                  type === 'pie' ? 'pie' : 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Vendas (R$)',
                    data: data,
                    backgroundColor: type === 'line' ? 'rgba(54, 162, 235, 0.2)' : 
                                   ['#ff6384', '#36a2eb', '#cc65fe', '#ffce56'],
                    borderColor: type === 'line' ? 'rgba(54, 162, 235, 1)' : 'transparent',
                    borderWidth: type === 'line' ? 2 : 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Relatório de Vendas'
                    },
                    legend: {
                        display: type === 'pie' || type === 'donut'
                    }
                },
                scales: type !== 'pie' && type !== 'donut' ? {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'R$ ' + value.toFixed(2);
                            }
                        }
                    }
                } : {}
            }
        };

        this.chart = new Chart(ctx, chartConfig);
    }

    switchView(view) {
        this.currentView = view;
        
        // Atualiza botões ativos
        document.querySelectorAll('.btn-view').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${view}"]`).classList.add('active');

        // Mostra/oculta elementos baseado na view
        const tableContainer = document.querySelector('.table-container');
        const chartContainer = document.querySelector('.chart-container');

        switch (view) {
            case 'table':
                tableContainer.style.display = 'block';
                chartContainer.style.display = 'none';
                break;
            case 'chart':
                tableContainer.style.display = 'none';
                chartContainer.style.display = 'block';
                break;
            case 'both':
                tableContainer.style.display = 'block';
                chartContainer.style.display = 'block';
                break;
        }
    }

    updateChart() {
        if (this.currentReport && this.chart) {
            this.displayChart(this.currentReport);
        }
    }

    getCurrentFilters() {
        const filters = {};
        
        // Filtros dinâmicos
        const dynamicFilters = document.getElementById('dynamic-filters');
        const selectElements = dynamicFilters.querySelectorAll('select');
        
        selectElements.forEach(select => {
            if (select.value) {
                filters[select.id] = select.value;
            }
        });

        return filters;
    }

    formatDateForBackend(dateString) {
        if (!dateString) return null;
        
        const [day, month, year] = dateString.split('/');
        return `${year}-${month}-${day}`;
    }

    async apiRequest(endpoint, options = {}) {
        const token = localStorage.getItem('token');
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };

        const mergedOptions = { ...defaultOptions, ...options };
        
        const response = await fetch(endpoint, mergedOptions);
        
        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.href = 'login.html';
            }
            throw new Error(`Erro na requisição: ${response.status}`);
        }

        return response;
    }

    showLoading(show) {
        const loadingIndicator = document.querySelector('.loading-indicator');
        loadingIndicator.style.display = show ? 'flex' : 'none';
    }

    showNotification(message, type = 'info') {
        // Remove notificação anterior se existir
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(notification);

        // Mostra a notificação
        setTimeout(() => notification.classList.add('show'), 100);

        // Remove após 5 segundos
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    async exportToPDF() {
        if (!this.currentReport) {
            this.showNotification('Gere um relatório antes de exportar', 'error');
            return;
        }

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            // Título
            doc.setFontSize(20);
            doc.text('Relatório de Vendas', 20, 20);

            // Data de geração
            doc.setFontSize(10);
            doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 20, 30);

            // Tabela
            if (this.currentReport.relatorioVendas) {
                const tableData = this.currentReport.relatorioVendas.map(item => [
                    item.venda.id,
                    item.venda.cliente.nome,
                    item.venda.data,
                    `R$ ${item.venda.total.toFixed(2)}`,
                    item.venda.status
                ]);

                doc.autoTable({
                    startY: 40,
                    head: [['ID', 'Cliente', 'Data', 'Valor', 'Status']],
                    body: tableData,
                    theme: 'grid'
                });
            }

            // Salva o PDF
            doc.save(`relatorio-vendas-${new Date().toISOString().split('T')[0]}.pdf`);
            
            this.showNotification('PDF exportado com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao exportar PDF:', error);
            this.showNotification('Erro ao exportar PDF', 'error');
        }
    }

    async saveTemplate() {
        const reportType = document.getElementById('report-type').value;
        const filters = this.getCurrentFilters();

        if (!reportType) {
            this.showNotification('Selecione um tipo de relatório', 'error');
            return;
        }

        try {
            const template = {
                nome: `Template ${reportType}`,
                tipo: reportType,
                filtros: filters,
                configuracao: {
                    groupBy: document.getElementById('group-by').value,
                    chartType: document.getElementById('chart-type-select').value
                }
            };

            await this.apiRequest('/api/relatorios/templates', {
                method: 'POST',
                body: JSON.stringify(template)
            });

            this.showNotification('Template salvo com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao salvar template:', error);
            this.showNotification('Erro ao salvar template', 'error');
        }
    }

    loadReportCategories() {
        // Seleciona a categoria padrão (vendas)
        this.selectCategory('vendas');
    }
}

// CSS adicional para os componentes
const additionalCSS = `
.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 8px;
    color: white;
    z-index: 10000;
    transform: translateX(400px);
    transition: transform 0.3s ease;
    max-width: 400px;
}

.notification.show {
    transform: translateX(0);
}

.notification-success {
    background-color: #28a745;
}

.notification-error {
    background-color: #dc3545;
}

.notification-info {
    background-color: #17a2b8;
}

.notification-content {
    display: flex;
    align-items: center;
    gap: 10px;
}

.summary-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
    margin-bottom: 20px;
}

.summary-card {
    background: var(--card-bg);
    padding: 20px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    text-align: center;
}

.summary-value {
    font-size: 24px;
    font-weight: bold;
    color: var(--primary-color);
    margin-bottom: 5px;
}

.summary-label {
    font-size: 14px;
    color: var(--text-muted);
}

.status-badge {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: bold;
}

.status-badge.Concluída {
    background-color: #d4edda;
    color: #155724;
}

.status-badge.Pendente {
    background-color: #fff3cd;
    color: #856404;
}

.status-badge.Cancelada {
    background-color: #f8d7da;
    color: #721c24;
}

.loading-indicator {
    display: none;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px;
}

.spinner {
    border: 4px solid #f3f3f3;
    border-top: 4px solid var(--primary-color);
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 2s linear infinite;
    margin-bottom: 15px;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.report-results.has-results .no-results {
    display: none;
}

.no-results {
    text-align: center;
    padding: 60px 20px;
    color: var(--text-muted);
}

.no-results i {
    font-size: 48px;
    margin-bottom: 15px;
    opacity: 0.5;
}
`;

// Adiciona CSS ao documento
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalCSS;
document.head.appendChild(styleSheet);

// Inicializa a aplicação quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    new RelatoriosApp();
});