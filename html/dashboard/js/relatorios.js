// Configuração das APIs
const API_CONFIG = {
    PRODUTOS: "https://api-nexoerp.vercel.app/api/produtos",
    VENDAS: "https://api-nexoerp.vercel.app/api/vendas", 
    CLIENTES: "https://api-nexoerp.vercel.app/api/clientes"
};

// Estado da aplicação
const appState = {
    produtos: [],
    vendas: [],
    clientes: [],
    currentReport: null,
    chartData: null,
    googleChartsLoaded: false
};

// Elementos DOM
let elements = {};

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    // Primeiro, carregar todos os elementos DOM
    initializeElements();
    
    // Depois, inicializar o app
    initApp();
    setupEventListeners();
    setDefaultDates();
    
    // Carregar Google Charts primeiro
    loadGoogleCharts().then(() => {
        // Depois carregar os dados
        loadAllData();
    }).catch(error => {
        console.error('Erro ao carregar Google Charts:', error);
        showMessage('Erro ao carregar gráficos. Recarregue a página.', 'error');
    });
});

// Carregar Google Charts
function loadGoogleCharts() {
    return new Promise((resolve, reject) => {
        if (typeof google !== 'undefined' && google.charts) {
            google.charts.load('current', { packages: ['corechart'] });
            google.charts.setOnLoadCallback(() => {
                appState.googleChartsLoaded = true;
                console.log('Google Charts carregado com sucesso!');
                resolve();
            });
        } else {
            // Se google não estiver definido, carregar o script dinamicamente
            const script = document.createElement('script');
            script.src = 'https://www.gstatic.com/charts/loader.js';
            script.type = 'text/javascript';
            
            script.onload = () => {
                google.charts.load('current', { packages: ['corechart'] });
                google.charts.setOnLoadCallback(() => {
                    appState.googleChartsLoaded = true;
                    console.log('Google Charts carregado dinamicamente!');
                    resolve();
                });
            };
            
            script.onerror = () => {
                reject(new Error('Falha ao carregar Google Charts'));
            };
            
            document.head.appendChild(script);
        }
    });
}

// Inicializar elementos DOM
function initializeElements() {
    elements = {
        // Filtros
        reportType: document.getElementById('reportType'),
        datePeriod: document.getElementById('datePeriod'),
        startDate: document.getElementById('startDate'),
        endDate: document.getElementById('endDate'),
        limitResults: document.getElementById('limitResults'),
        chartType: document.getElementById('chartType'),
        generateReport: document.getElementById('generateReport'),
        resetFilters: document.getElementById('resetFilters'),
        
        // Métricas
        totalClients: document.getElementById('totalClients'),
        totalProducts: document.getElementById('totalProducts'),
        salesToday: document.getElementById('salesToday'),
        totalValue: document.getElementById('totalValue'),
        
        // Elementos de visualização
        mainChart: document.getElementById('mainChart'),
        reportTable: document.getElementById('reportTable'),
        tableHeader: document.getElementById('tableHeader'),
        tableBody: document.getElementById('tableBody'),
        
        // Botões de exportação
        exportExcel: document.getElementById('exportExcel'),
        exportPDF: document.getElementById('exportPDF'),
        exportData: document.getElementById('exportData'),
        exportButtons: document.querySelectorAll('.btn-export'),
        
        // Containers para mostrar/esconder
        dateCustom: document.querySelector('.date-custom')
    };
}

// Inicializar aplicação
function initApp() {
    // Verificar se elementos existem
    if (!elements.startDate || !elements.endDate) {
        console.error('Elementos de data não encontrados!');
        return;
    }
    
    // Definir datas padrão
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    elements.startDate.value = formatDate(firstDay);
    elements.endDate.value = formatDate(today);
    
    // Inicializar mensagem inicial
    if (elements.mainChart) {
        elements.mainChart.innerHTML = `
            <div class="chart-welcome">
                <i class="fas fa-chart-bar"></i>
                <h3>Relatórios NexoERP</h3>
                <p>Selecione um tipo de relatório e clique em "Gerar Relatório"</p>
            </div>
        `;
    }
}

// Configurar event listeners
function setupEventListeners() {
    // Filtro de período
    if (elements.datePeriod) {
        elements.datePeriod.addEventListener('change', function() {
            const period = this.value;
            
            if (period === 'custom' && elements.dateCustom) {
                elements.dateCustom.style.display = 'flex';
            } else {
                if (elements.dateCustom) elements.dateCustom.style.display = 'none';
                setPeriodDates(period);
            }
        });
    }
    
    // Gerar relatório
    if (elements.generateReport) {
        elements.generateReport.addEventListener('click', generateReport);
    }
    
    // Resetar filtros
    if (elements.resetFilters) {
        elements.resetFilters.addEventListener('click', resetFilters);
    }
    
    // Mudar tipo de gráfico
    if (elements.chartType) {
        elements.chartType.addEventListener('change', function() {
            if (appState.chartData && appState.googleChartsLoaded) {
                drawChart(appState.chartData);
            }
        });
    }
    
    // Exportar Excel
    if (elements.exportExcel) {
        elements.exportExcel.addEventListener('click', exportToExcel);
    }
    
    // Exportar PDF
    if (elements.exportPDF) {
        elements.exportPDF.addEventListener('click', exportToPDF);
    }
    
    // Exportar dados do gráfico
    if (elements.exportData) {
        elements.exportData.addEventListener('click', exportChartData);
    }
    
    // Botões de exportação das listas
    if (elements.exportButtons && elements.exportButtons.length > 0) {
        elements.exportButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                const type = this.getAttribute('data-type');
                exportList(type);
            });
        });
    }
}

// Carregar todos os dados
async function loadAllData() {
    try {
        showLoading(true);
        
        // Carregar dados em paralelo
        const [produtosData, vendasData, clientesData] = await Promise.all([
            fetchData(API_CONFIG.PRODUTOS),
            fetchData(API_CONFIG.VENDAS),
            fetchData(API_CONFIG.CLIENTES)
        ]);
        
        appState.produtos = produtosData.produtos || produtosData;
        appState.vendas = vendasData.vendas || vendasData;
        appState.clientes = clientesData.clientes || clientesData;
        
        console.log('Dados carregados:', {
            produtos: appState.produtos.length,
            vendas: appState.vendas.length,
            clientes: appState.clientes.length
        });
        
        // Atualizar métricas rápidas
        updateQuickMetrics();
        
        // Mostrar mensagem de sucesso
        showMessage('Dados carregados com sucesso!', 'success');
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        showMessage('Erro ao carregar dados. Tente novamente.', 'error');
    } finally {
        showLoading(false);
    }
}

// Atualizar métricas rápidas
function updateQuickMetrics() {
    // Verificar se elementos existem
    if (!elements.totalClients || !elements.totalProducts || 
        !elements.salesToday || !elements.totalValue) {
        return;
    }
    
    // Total de clientes
    elements.totalClients.textContent = appState.clientes.length;
    
    // Produtos ativos
    const produtosAtivos = appState.produtos.filter(p => p.status === 'Ativo' || !p.status).length;
    elements.totalProducts.textContent = produtosAtivos;
    
    // Vendas de hoje
    const hoje = new Date().toISOString().split('T')[0];
    const vendasHoje = appState.vendas.filter(v => v.data && v.data.includes(hoje));
    elements.salesToday.textContent = vendasHoje.length;
    
    // Valor total das vendas
    const totalValor = appState.vendas.reduce((sum, v) => sum + (v.total || 0), 0);
    elements.totalValue.textContent = `R$ ${totalValor.toFixed(2)}`;
}

// Gerar relatório
async function generateReport() {
    const reportType = elements.reportType.value;
    const limit = parseInt(elements.limitResults.value);
    
    if (!reportType) {
        showMessage('Selecione um tipo de relatório.', 'warning');
        return;
    }
    
    try {
        showLoading(true);
        
        let data;
        
        switch(reportType) {
            case 'clientes-top':
                data = await generateTopClientsReport(limit);
                break;
            case 'produtos-top':
                data = await generateTopProductsReport(limit);
                break;
            case 'vendas-periodo':
                data = await generateSalesByPeriodReport();
                break;
            case 'produtos-estoque':
                data = await generateProductsStockReport();
                break;
            case 'clientes-ativos':
                data = await generateActiveClientsReport(limit);
                break;
            case 'vendas-vendedor':
                data = await generateSalesBySellerReport(limit);
                break;
            default:
                throw new Error('Tipo de relatório não suportado');
        }
        
        appState.currentReport = reportType;
        appState.chartData = data;
        
        // Atualizar tabela
        updateTable(data);
        
        // Desenhar gráfico se Google Charts estiver carregado
        if (appState.googleChartsLoaded) {
            drawChart(data);
        } else {
            console.warn('Google Charts não carregado ainda');
            showMessage('Gráficos ainda estão carregando...', 'info');
            
            // Tentar carregar novamente
            loadGoogleCharts().then(() => {
                drawChart(data);
            });
        }
        
    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        showMessage('Erro ao gerar relatório: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Gerar relatório: Clientes que mais compram
function generateTopClientsReport(limit = 10) {
    return new Promise((resolve) => {
        // Calcular valor total por cliente
        const clientesMap = new Map();
        
        appState.vendas.forEach(venda => {
            const clienteId = venda.clienteId || venda.cliente?.id;
            if (clienteId) {
                if (!clientesMap.has(clienteId)) {
                    const cliente = appState.clientes.find(c => c.id === clienteId);
                    clientesMap.set(clienteId, {
                        id: clienteId,
                        nome: cliente ? cliente.nome : `Cliente #${clienteId}`,
                        totalVendas: 0,
                        quantidadeVendas: 0
                    });
                }
                
                const clienteData = clientesMap.get(clienteId);
                clienteData.totalVendas += venda.total || 0;
                clienteData.quantidadeVendas += 1;
            }
        });
        
        // Converter para array e ordenar
        let data = Array.from(clientesMap.values())
            .sort((a, b) => b.totalVendas - a.totalVendas)
            .slice(0, limit);
        
        // Formatar para Google Charts
        const chartData = [
            ['Cliente', 'Valor Total (R$)'],
            ...data.map(item => [item.nome, item.totalVendas])
        ];
        
        resolve({
            title: `Top ${limit} Clientes que Mais Compram`,
            data: chartData,
            rawData: data,
            columns: ['Cliente', 'Total Gasto (R$)', 'Nº de Compras']
        });
    });
}

// Gerar relatório: Produtos mais vendidos
function generateTopProductsReport(limit = 10) {
    return new Promise((resolve) => {
        // Simular dados de vendas por produto
        const produtosMaisVendidos = appState.produtos
            .filter(p => (p.status === 'Ativo' || !p.status) && p.estoque !== undefined)
            .map(p => ({
                id: p.id,
                nome: p.nome,
                vendas: Math.floor(Math.random() * 100) + 1, // Simulado até termos dados reais
                estoque: p.estoque || 0,
                preco: p.preco || 0
            }))
            .sort((a, b) => b.vendas - a.vendas)
            .slice(0, limit);
        
        const chartData = [
            ['Produto', 'Quantidade Vendida'],
            ...produtosMaisVendidos.map(p => [p.nome, p.vendas])
        ];
        
        resolve({
            title: `Top ${limit} Produtos Mais Vendidos`,
            data: chartData,
            rawData: produtosMaisVendidos,
            columns: ['Produto', 'Quantidade Vendida', 'Estoque Atual', 'Preço']
        });
    });
}

// Gerar relatório: Vendas por período
function generateSalesByPeriodReport() {
    return new Promise((resolve) => {
        // Agrupar vendas por data
        const vendasPorDia = {};
        
        appState.vendas.forEach(venda => {
            if (venda.data) {
                const date = new Date(venda.data);
                const dateKey = date.toISOString().split('T')[0];
                
                if (!vendasPorDia[dateKey]) {
                    vendasPorDia[dateKey] = {
                        data: dateKey,
                        total: 0,
                        quantidade: 0
                    };
                }
                vendasPorDia[dateKey].total += venda.total || 0;
                vendasPorDia[dateKey].quantidade += 1;
            }
        });
        
        // Converter para array e ordenar por data
        let data = Object.values(vendasPorDia)
            .sort((a, b) => new Date(a.data) - new Date(b.data))
            .slice(-30); // Últimos 30 dias
        
        // Formatar para Google Charts
        const chartData = [
            ['Data', 'Valor Total (R$)'],
            ...data.map(item => [formatDateShort(item.data), item.total])
        ];
        
        resolve({
            title: 'Vendas por Período (Últimos 30 dias)',
            data: chartData,
            rawData: data,
            columns: ['Data', 'Valor Total (R$)', 'Nº de Vendas']
        });
    });
}

// Gerar relatório: Estoque de produtos
function generateProductsStockReport() {
    return new Promise((resolve) => {
        const produtosEstoque = appState.produtos
            .filter(p => p.estoque !== undefined && p.estoque !== null)
            .map(p => ({
                nome: p.nome,
                estoque: p.estoque,
                preco: p.preco || 0,
                status: p.status || 'Ativo',
                valorTotal: (p.estoque || 0) * (p.preco || 0)
            }))
            .sort((a, b) => b.estoque - a.estoque);
        
        const chartData = [
            ['Produto', 'Estoque'],
            ...produtosEstoque.slice(0, 15).map(p => [p.nome, p.estoque])
        ];
        
        resolve({
            title: 'Estoque de Produtos',
            data: chartData,
            rawData: produtosEstoque,
            columns: ['Produto', 'Estoque', 'Preço', 'Valor Total', 'Status']
        });
    });
}

// Atualizar tabela
function updateTable(reportData) {
    if (!elements.tableBody || !elements.tableHeader) {
        console.error('Elementos da tabela não encontrados!');
        return;
    }
    
    if (!reportData || !reportData.rawData || reportData.rawData.length === 0) {
        elements.tableBody.innerHTML = `
            <tr>
                <td colspan="3" class="empty-message">
                    <i class="fas fa-database"></i>
                    Nenhum dado encontrado para este relatório
                </td>
            </tr>
        `;
        return;
    }
    
    // Atualizar cabeçalho
    elements.tableHeader.innerHTML = reportData.columns
        .map(col => `<th>${col}</th>`)
        .join('');
    
    // Atualizar corpo da tabela
    let tableRows = '';
    
    reportData.rawData.forEach((item, index) => {
        let row = '<tr>';
        
        if (appState.currentReport === 'clientes-top') {
            row += `
                <td>${item.nome}</td>
                <td>R$ ${item.totalVendas.toFixed(2)}</td>
                <td>${item.quantidadeVendas}</td>
            `;
        } else if (appState.currentReport === 'produtos-top') {
            row += `
                <td>${item.nome}</td>
                <td>${item.vendas}</td>
                <td>${item.estoque}</td>
                <td>R$ ${item.preco.toFixed(2)}</td>
            `;
        } else if (appState.currentReport === 'vendas-periodo') {
            row += `
                <td>${formatDateFull(item.data)}</td>
                <td>R$ ${item.total.toFixed(2)}</td>
                <td>${item.quantidade}</td>
            `;
        } else if (appState.currentReport === 'produtos-estoque') {
            row += `
                <td>${item.nome}</td>
                <td>${item.estoque}</td>
                <td>R$ ${item.preco.toFixed(2)}</td>
                <td>R$ ${item.valorTotal.toFixed(2)}</td>
                <td><span class="status-badge ${item.status === 'Ativo' ? 'status-active' : 'status-inactive'}">${item.status}</span></td>
            `;
        } else {
            // Formato genérico
            Object.values(item).forEach(val => {
                if (typeof val === 'number' && val > 1000) {
                    row += `<td>R$ ${val.toFixed(2)}</td>`;
                } else {
                    row += `<td>${val}</td>`;
                }
            });
        }
        
        row += '</tr>';
        tableRows += row;
    });
    
    elements.tableBody.innerHTML = tableRows;
}

// Desenhar gráfico com Google Charts
function drawChart(reportData) {
    if (!elements.mainChart) {
        console.error('Elemento do gráfico não encontrado!');
        return;
    }
    
    if (!appState.googleChartsLoaded) {
        elements.mainChart.innerHTML = `
            <div class="chart-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Grafícos não carregados. Recarregue a página.</p>
            </div>
        `;
        return;
    }
    
    if (!reportData || reportData.data.length <= 1) {
        elements.mainChart.innerHTML = `
            <div class="empty-message">
                <i class="fas fa-chart-line"></i>
                <p>Dados insuficientes para gerar gráfico</p>
            </div>
        `;
        return;
    }
    
    try {
        const chartType = elements.chartType ? elements.chartType.value : 'ColumnChart';
        const data = google.visualization.arrayToDataTable(reportData.data);
        
        // Detectar modo claro/escuro
        const isDarkMode = document.body.classList.contains('dark-theme') || 
                          document.body.classList.contains('dark-mode') ||
                          window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        const options = {
            title: reportData.title,
            titleTextStyle: {
                color: isDarkMode ? '#e5e7eb' : '#1f2937',
                fontSize: 16,
                bold: true
            },
            backgroundColor: 'transparent',
            colors: ['#2563eb', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'],
            legend: {
                textStyle: {
                    color: isDarkMode ? '#e5e7eb' : '#1f2937'
                }
            },
            hAxis: {
                textStyle: {
                    color: isDarkMode ? '#9ca3af' : '#6b7280'
                }
            },
            vAxis: {
                textStyle: {
                    color: isDarkMode ? '#9ca3af' : '#6b7280'
                },
                format: 'currency'
            },
            chartArea: {
                width: '85%',
                height: '70%'
            },
            animation: {
                startup: true,
                duration: 1000,
                easing: 'out'
            }
        };
        
        // Ajustar opções baseadas no tipo de gráfico
        if (chartType === 'PieChart') {
            options.pieHole = 0.4;
        } else if (chartType === 'LineChart') {
            options.pointSize = 5;
            options.lineWidth = 3;
        }
        
        let chart;
        switch(chartType) {
            case 'PieChart':
                chart = new google.visualization.PieChart(elements.mainChart);
                break;
            case 'LineChart':
                chart = new google.visualization.LineChart(elements.mainChart);
                break;
            case 'BarChart':
                chart = new google.visualization.BarChart(elements.mainChart);
                break;
            case 'AreaChart':
                chart = new google.visualization.AreaChart(elements.mainChart);
                break;
            default:
                chart = new google.visualization.ColumnChart(elements.mainChart);
        }
        
        chart.draw(data, options);
        
        // Adicionar evento de redimensionamento
        window.addEventListener('resize', function() {
            chart.draw(data, options);
        });
        
    } catch (error) {
        console.error('Erro ao desenhar gráfico:', error);
        elements.mainChart.innerHTML = `
            <div class="chart-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Erro ao gerar gráfico: ${error.message}</p>
            </div>
        `;
    }
}

// Exportar para Excel
function exportToExcel() {
    if (!appState.currentReport || !appState.chartData) {
        showMessage('Gere um relatório primeiro.', 'warning');
        return;
    }
    
    try {
        if (typeof XLSX === 'undefined') {
            showMessage('Biblioteca Excel não carregada.', 'error');
            return;
        }
        
        const data = appState.chartData.rawData;
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        
        XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório");
        XLSX.writeFile(workbook, `relatorio_${appState.currentReport}_${Date.now()}.xlsx`);
        
        showMessage('Relatório exportado para Excel com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao exportar Excel:', error);
        showMessage('Erro ao exportar para Excel: ' + error.message, 'error');
    }
}

// Exportar para PDF
function exportToPDF() {
    if (!appState.currentReport || !appState.chartData) {
        showMessage('Gere um relatório primeiro.', 'warning');
        return;
    }
    
    try {
        if (typeof window.jspdf === 'undefined') {
            showMessage('Biblioteca PDF não carregada.', 'error');
            return;
        }
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text(appState.chartData.title, 14, 22);
        doc.setFontSize(11);
        doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 32);
        
        // Preparar dados para tabela
        const tableData = appState.chartData.rawData.map(item => {
            if (appState.currentReport === 'clientes-top') {
                return [item.nome, `R$ ${item.totalVendas.toFixed(2)}`, item.quantidadeVendas];
            } else if (appState.currentReport === 'produtos-top') {
                return [item.nome, item.vendas, item.estoque, `R$ ${item.preco.toFixed(2)}`];
            } else if (appState.currentReport === 'vendas-periodo') {
                return [formatDateFull(item.data), `R$ ${item.total.toFixed(2)}`, item.quantidade];
            }
            return Object.values(item);
        });
        
        // Adicionar tabela
        doc.autoTable({
            head: [appState.chartData.columns],
            body: tableData,
            startY: 40,
            theme: 'striped',
            styles: {
                fontSize: 10,
                cellPadding: 3
            },
            headStyles: {
                fillColor: [37, 99, 235],
                textColor: 255
            }
        });
        
        doc.save(`relatorio_${appState.currentReport}_${Date.now()}.pdf`);
        showMessage('Relatório exportado para PDF com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao exportar PDF:', error);
        showMessage('Erro ao exportar para PDF: ' + error.message, 'error');
    }
}

// Exportar dados do gráfico
function exportChartData() {
    if (!appState.chartData) {
        showMessage('Não há dados para exportar.', 'warning');
        return;
    }
    
    // Criar arquivo CSV simples
    const csvContent = [
        appState.chartData.columns.join(','),
        ...appState.chartData.rawData.map(item => {
            if (appState.currentReport === 'clientes-top') {
                return `${item.nome},${item.totalVendas},${item.quantidadeVendas}`;
            } else if (appState.currentReport === 'produtos-top') {
                return `${item.nome},${item.vendas},${item.estoque},${item.preco}`;
            }
            return Object.values(item).join(',');
        })
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `dados_${appState.currentReport}_${Date.now()}.csv`;
    link.click();
    
    showMessage('Dados exportados como CSV!', 'success');
}

// Exportar lista completa
function exportList(type) {
    let data, filename, columns;
    
    switch(type) {
        case 'products':
            data = appState.produtos;
            filename = 'lista_produtos';
            columns = ['ID', 'Nome', 'Descrição', 'Preço', 'Estoque', 'Tipo', 'Status'];
            break;
        case 'clients':
            data = appState.clientes;
            filename = 'lista_clientes';
            columns = ['ID', 'Nome', 'Email', 'Telefone', 'CPF/CNPJ', 'Cidade', 'Estado'];
            break;
        case 'sales':
            data = appState.vendas;
            filename = 'lista_vendas';
            columns = ['ID', 'Cliente', 'Data', 'Total', 'Status'];
            break;
        default:
            showMessage('Tipo de lista não suportado.', 'error');
            return;
    }
    
    try {
        const worksheet = XLSX.utils.json_to_sheet(data.map(item => {
            if (type === 'products') {
                return {
                    ID: item.id,
                    Nome: item.nome,
                    Descrição: item.descricao || '',
                    Preço: item.preco || 0,
                    Estoque: item.estoque || 0,
                    Tipo: item.tipo || 'Produto',
                    Status: item.status || 'Ativo'
                };
            } else if (type === 'clients') {
                return {
                    ID: item.id,
                    Nome: item.nome,
                    Email: item.email || '',
                    Telefone: item.telefone || '',
                    'CPF/CNPJ': item.cpf || item.cnpj || '',
                    Cidade: item.cidade || '',
                    Estado: item.estado || ''
                };
            } else if (type === 'sales') {
                const cliente = appState.clientes.find(c => c.id === item.clienteId);
                return {
                    ID: item.id,
                    Cliente: cliente ? cliente.nome : 'Desconhecido',
                    Data: item.data ? new Date(item.data).toLocaleDateString('pt-BR') : '',
                    Total: item.total || 0,
                    Status: item.status || 'Pendente'
                };
            }
            return item;
        }));
        
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Lista");
        XLSX.writeFile(workbook, `${filename}_${Date.now()}.xlsx`);
        
        showMessage(`Lista de ${type} exportada com sucesso!`, 'success');
    } catch (error) {
        console.error('Erro ao exportar lista:', error);
        showMessage('Erro ao exportar lista: ' + error.message, 'error');
    }
}

// Funções auxiliares
function formatDate(date) {
    return date.toISOString().split('T')[0];
}

function formatDateShort(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function formatDateFull(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

function setPeriodDates(period) {
    const today = new Date();
    let startDate = today;
    
    switch(period) {
        case 'today':
            startDate = new Date(today);
            break;
        case 'week':
            startDate = new Date(today.setDate(today.getDate() - 7));
            break;
        case 'month':
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            break;
        case 'quarter':
            const quarter = Math.floor(today.getMonth() / 3);
            startDate = new Date(today.getFullYear(), quarter * 3, 1);
            break;
        case 'year':
            startDate = new Date(today.getFullYear(), 0, 1);
            break;
    }
    
    if (elements.startDate && elements.endDate) {
        elements.startDate.value = formatDate(startDate);
        elements.endDate.value = formatDate(new Date());
    }
}

function setDefaultDates() {
    if (elements.datePeriod) {
        setPeriodDates(elements.datePeriod.value);
    }
}

function resetFilters() {
    if (elements.reportType) elements.reportType.value = '';
    if (elements.datePeriod) elements.datePeriod.value = 'month';
    if (elements.limitResults) elements.limitResults.value = '10';
    if (elements.chartType) elements.chartType.value = 'ColumnChart';
    
    setPeriodDates('month');
    showMessage('Filtros resetados.', 'info');
    
    // Limpar gráfico e tabela
    if (elements.mainChart) {
        elements.mainChart.innerHTML = `
            <div class="chart-welcome">
                <i class="fas fa-chart-bar"></i>
                <h3>Relatórios NexoERP</h3>
                <p>Selecione um tipo de relatório e clique em "Gerar Relatório"</p>
            </div>
        `;
    }
    
    if (elements.tableBody) {
        elements.tableBody.innerHTML = `
            <tr>
                <td colspan="3" class="empty-message">
                    <i class="fas fa-database"></i>
                    Nenhum relatório gerado ainda
                </td>
            </tr>
        `;
    }
}

async function fetchData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Erro ao buscar dados:', error);
        throw error;
    }
}

function showLoading(show) {
    // Implementar visual de loading se necessário
    if (show) {
        console.log('Mostrando loading...');
    } else {
        console.log('Escondendo loading...');
    }
}

function showMessage(text, type = 'info') {
    // Criar elemento de mensagem
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
        <span>${text}</span>
    `;
    
    // Adicionar ao início do conteúdo principal
    const content = document.querySelector('.content');
    if (content) {
        content.insertBefore(messageDiv, content.firstChild);
        
        // Remover após 5 segundos
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 5000);
    }
}

// Exportar funções globais
window.generateReport = generateReport;
window.exportToExcel = exportToExcel;
window.exportToPDF = exportToPDF;
window.resetFilters = resetFilters;

// Adicionar CSS para mensagens e estados
const style = document.createElement('style');
style.textContent = `
    .message {
        padding: 12px 16px;
        border-radius: var(--border-radius);
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideIn 0.3s ease;
        font-size: 0.9rem;
    }
    
    .message.info {
        background: rgba(37, 99, 235, 0.1);
        border-left: 4px solid var(--primary);
        color: var(--primary);
    }
    
    .message.success {
        background: rgba(16, 185, 129, 0.1);
        border-left: 4px solid var(--success);
        color: var(--success);
    }
    
    .message.warning {
        background: rgba(245, 158, 11, 0.1);
        border-left: 4px solid var(--warning);
        color: var(--warning);
    }
    
    .message.error {
        background: rgba(239, 68, 68, 0.1);
        border-left: 4px solid var(--error);
        color: var(--error);
    }
    
    .chart-welcome, .chart-error, .empty-message {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        padding: 40px;
        text-align: center;
        color: var(--text-secondary);
    }
    
    .chart-welcome i, .chart-error i {
        font-size: 3rem;
        margin-bottom: 16px;
        opacity: 0.5;
    }
    
    .chart-error i {
        color: var(--error);
    }
    
    .empty-message i {
        font-size: 2rem;
        margin-bottom: 8px;
        opacity: 0.5;
    }
    
    .status-badge {
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: 500;
    }
    
    .status-active {
        background: rgba(16, 185, 129, 0.1);
        color: var(--success);
    }
    
    .status-inactive {
        background: rgba(239, 68, 68, 0.1);
        color: var(--error);
    }
    
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(style);