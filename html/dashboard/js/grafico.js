    // Configuração das APIs
const API_URL_VENDAS = "https://api-nexoerp.vercel.app/api/vendas";
const API_URL_PRODUTOS = "https://api-nexoerp.vercel.app/api/produtos";

// Cores para os gráficos
const CHART_COLORS = {
    primary: '#2563eb',
    primaryLight: '#3b82f6',
    secondary: '#7c3aed',
    secondaryLight: '#8b5cf6',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#06b6d4',
    gray: '#6b7280'
};

// Instâncias dos gráficos
let salesChart = null;
let productsChart = null;

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    initializeCharts();
    setupEventListeners();
});

function initializeCharts() {
    loadSalesData('month');
    loadProductsData();
}

function setupEventListeners() {
    // Seletor de período para vendas
    const periodSelect = document.querySelector('.chart-period');
    if (periodSelect) {
        periodSelect.addEventListener('change', function(e) {
            loadSalesData(e.target.value);
        });
    }
}

// Função para carregar dados de vendas
async function loadSalesData(period) {
    const chartContainer = document.querySelector('.chart-card:first-child .chart-container');
    const placeholder = chartContainer.querySelector('.chart-placeholder');
    
    try {
        // Mostrar loading
        chartContainer.classList.add('loading');
        
        // Buscar dados da API
        const response = await fetch(API_URL_VENDAS);
        if (!response.ok) throw new Error('Erro ao carregar dados de vendas');
        
        const vendas = await response.json();
        
        // Processar dados baseado no período selecionado
        const processedData = processSalesData(vendas, period);
        
        // Criar ou atualizar gráfico
        createSalesChart(processedData, period);
        
        // Remover placeholder
        if (placeholder) {
            placeholder.style.display = 'none';
        }
        
    } catch (error) {
        console.error('Erro ao carregar dados de vendas:', error);
        showError(chartContainer, 'Erro ao carregar dados de vendas');
    } finally {
        chartContainer.classList.remove('loading');
    }
}

// Função para processar dados de vendas por período
function processSalesData(vendas, period) {
    const now = new Date();
    let filteredVendas = [];
    
    switch (period) {
        case 'week':
            // Últimos 7 dias
            const weekAgo = new Date(now);
            weekAgo.setDate(now.getDate() - 7);
            filteredVendas = vendas.filter(venda => 
                new Date(venda.data) >= weekAgo
            );
            break;
            
        case 'month':
            // Este mês
            filteredVendas = vendas.filter(venda => {
                const vendaDate = new Date(venda.data);
                return vendaDate.getMonth() === now.getMonth() && 
                       vendaDate.getFullYear() === now.getFullYear();
            });
            break;
            
        case 'quarter':
            // Este trimestre
            const currentQuarter = Math.floor(now.getMonth() / 3);
            filteredVendas = vendas.filter(venda => {
                const vendaDate = new Date(venda.data);
                const vendaQuarter = Math.floor(vendaDate.getMonth() / 3);
                return vendaQuarter === currentQuarter && 
                       vendaDate.getFullYear() === now.getFullYear();
            });
            break;
            
        case 'year':
            // Este ano
            filteredVendas = vendas.filter(venda => 
                new Date(venda.data).getFullYear() === now.getFullYear()
            );
            break;
    }
    
    // Agrupar por data e calcular totais
    const salesByDate = {};
    filteredVendas.forEach(venda => {
        const date = new Date(venda.data).toLocaleDateString();
        if (!salesByDate[date]) {
            salesByDate[date] = 0;
        }
        salesByDate[date] += venda.valor || venda.total || 0;
    });
    
    return {
        labels: Object.keys(salesByDate),
        values: Object.values(salesByDate)
    };
}

// Função para criar gráfico de vendas
function createSalesChart(data, period) {
    const ctx = document.getElementById('salesChart');
    if (!ctx) {
        console.error('Canvas do gráfico de vendas não encontrado');
        return;
    }
    
    // Destruir gráfico anterior se existir
    if (salesChart) {
        salesChart.destroy();
    }
    
    const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark' || 
                      window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Vendas',
                data: data.values,
                borderColor: CHART_COLORS.primary,
                backgroundColor: isDarkMode ? 
                    'rgba(37, 99, 235, 0.1)' : 
                    'rgba(37, 99, 235, 0.05)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: CHART_COLORS.primary,
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: isDarkMode ? 'rgba(39, 39, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                    titleColor: isDarkMode ? '#fafafa' : '#18181b',
                    bodyColor: isDarkMode ? '#fafafa' : '#18181b',
                    borderColor: isDarkMode ? '#3f3f46' : '#e4e4e7',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            return `Vendas: R$ ${context.parsed.y.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: isDarkMode ? 'rgba(63, 63, 70, 0.3)' : 'rgba(228, 228, 231, 0.6)'
                    },
                    ticks: {
                        color: isDarkMode ? '#a1a1aa' : '#52525b'
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: isDarkMode ? 'rgba(63, 63, 70, 0.3)' : 'rgba(228, 228, 231, 0.6)'
                    },
                    ticks: {
                        color: isDarkMode ? '#a1a1aa' : '#52525b',
                        callback: function(value) {
                            return 'R$ ' + value.toFixed(2);
                        }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'nearest'
            },
            animations: {
                tension: {
                    duration: 1000,
                    easing: 'linear'
                }
            }
        }
    });
}

// Função para carregar dados de produtos
async function loadProductsData() {
    const chartContainer = document.querySelector('.chart-card:last-child .chart-container');
    const placeholder = chartContainer.querySelector('.chart-placeholder');
    
    try {
        // Mostrar loading
        chartContainer.classList.add('loading');
        
        // Buscar dados da API
        const response = await fetch(API_URL_PRODUTOS);
        if (!response.ok) throw new Error('Erro ao carregar dados de produtos');
        
        const produtos = await response.json();
        
        // Processar dados para gráfico de pizza
        const processedData = processProductsData(produtos);
        
        // Criar gráfico de distribuição
        createProductsChart(processedData);
        
        // Remover placeholder
        if (placeholder) {
            placeholder.style.display = 'none';
        }
        
    } catch (error) {
        console.error('Erro ao carregar dados de produtos:', error);
        showError(chartContainer, 'Erro ao carregar dados de produtos');
    } finally {
        chartContainer.classList.remove('loading');
    }
}

// Função para processar dados de produtos
function processProductsData(produtos) {
    // Agrupar por categoria
    const categories = {};
    
    produtos.forEach(produto => {
        const categoria = produto.categoria || 'Sem Categoria';
        if (!categories[categoria]) {
            categories[categoria] = 0;
        }
        categories[categoria]++;
    });
    
    return {
        labels: Object.keys(categories),
        values: Object.values(categories)
    };
}

// Função para criar gráfico de produtos
function createProductsChart(data) {
    const ctx = document.getElementById('productsChart');
    if (!ctx) {
        console.error('Canvas do gráfico de produtos não encontrado');
        return;
    }
    
    // Destruir gráfico anterior se existir
    if (productsChart) {
        productsChart.destroy();
    }
    
    const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark' || 
                      window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const backgroundColors = [
        CHART_COLORS.primary,
        CHART_COLORS.secondary,
        CHART_COLORS.success,
        CHART_COLORS.warning,
        CHART_COLORS.info,
        CHART_COLORS.error,
        '#8b5cf6',
        '#f97316',
        '#84cc16',
        '#14b8a6'
    ];
    
    productsChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.values,
                backgroundColor: backgroundColors,
                borderColor: isDarkMode ? '#27272a' : '#ffffff',
                borderWidth: 2,
                hoverOffset: 15
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: isDarkMode ? '#a1a1aa' : '#52525b',
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: isDarkMode ? 'rgba(39, 39, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                    titleColor: isDarkMode ? '#fafafa' : '#18181b',
                    bodyColor: isDarkMode ? '#fafafa' : '#18181b',
                    borderColor: isDarkMode ? '#3f3f46' : '#e4e4e7',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            },
            animation: {
                animateScale: true,
                animateRotate: true
            }
        }
    });
}

// Função para mostrar erro
function showError(container, message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'chart-error';
    errorDiv.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: var(--error);
        text-align: center;
        padding: 2rem;
    `;
    errorDiv.innerHTML = `
        <div>
            <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
            <p>${message}</p>
        </div>
    `;
    
    container.appendChild(errorDiv);
}

// Atualizar HTML para incluir os canvases
function updateHTMLWithCanvases() {
    const salesContainer = document.querySelector('.chart-card:first-child .chart-container');
    const productsContainer = document.querySelector('.chart-card:last-child .chart-container');
    
    if (salesContainer && !salesContainer.querySelector('canvas')) {
        salesContainer.innerHTML = '<canvas id="salesChart" class="chart-canvas"></canvas>';
    }
    
    if (productsContainer && !productsContainer.querySelector('canvas')) {
        productsContainer.innerHTML = '<canvas id="productsChart" class="chart-canvas"></canvas>';
    }
}

// Chamar a função para atualizar o HTML quando o script carregar
updateHTMLWithCanvases();

// google chats