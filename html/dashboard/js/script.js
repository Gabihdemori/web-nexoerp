// =============================================
// DASHBOARD COM GOOGLE CHARTS - VERSÃO CORRIGIDA
// =============================================

const API_CONFIG = {
    VENDAS: "https://api-nexoerp.vercel.app/api/vendas",
    PRODUTOS: "https://api-nexoerp.vercel.app/api/produtos", 
    CLIENTES: "https://api-nexoerp.vercel.app/api/clientes"
};

// Carrega Google Charts
google.charts.load('current', {'packages':['corechart']});
google.charts.setOnLoadCallback(iniciarDashboard);

async function iniciarDashboard() {
    await carregarDados();
    // Configurar event listeners
    document.getElementById('salesPeriod').addEventListener('change', carregarDados);
}

// Função principal que carrega tudo
async function carregarDados() {
    try {
        // Busca dados das APIs
        const [vendasData, produtosData, clientesData] = await Promise.all([
            fetch(API_CONFIG.VENDAS).then(r => r.json()).catch(erro => {
                console.error('Erro ao carregar vendas:', erro);
                return [];
            }),
            fetch(API_CONFIG.PRODUTOS).then(r => r.json()).catch(erro => {
                console.error('Erro ao carregar produtos:', erro);
                return [];
            }),
            fetch(API_CONFIG.CLIENTES).then(r => r.json()).catch(erro => {
                console.error('Erro ao carregar clientes:', erro);
                return [];
            })
        ]);

        // Converte para array (funciona com qualquer formato da API)
        const vendas = Array.isArray(vendasData) ? vendasData : vendasData.vendas || vendasData.data || [];
        const produtos = Array.isArray(produtosData) ? produtosData : produtosData.produtos || produtosData.data || [];
        const clientes = Array.isArray(clientesData) ? clientesData : clientesData.clientes || clientesData.data || [];

        // Atualiza os números do dashboard
        atualizarNumeros(vendas, produtos, clientes);
        
        // Cria os gráficos
        criarGraficoVendas(vendas);
        criarGraficoProdutosServicos(produtos);
        
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        // Se der erro, coloca zeros
        definirValoresPadrao();
    }
}

// Atualiza os números na tela
function atualizarNumeros(vendas, produtos, clientes) {

    // Total de clientes
    document.getElementById("new-clients-value").textContent = clientes.length;

    // Produtos em estoque
    const totalEstoque = produtos.reduce((soma, produto) => soma + (parseInt(produto.estoque) || 0), 0);
    document.getElementById("stock-products-value").textContent = totalEstoque;

    // Faturamento mensal
    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();
    
    const vendasMes = vendas.filter(venda => {
        if (!venda.data) return false;
        const dataVenda = parseDate(venda.data);
        return dataVenda.getMonth() === mesAtual && dataVenda.getFullYear() === anoAtual;
    });
    
    const faturamentoMensal = vendasMes.reduce((soma, venda) => soma + (parseFloat(venda.total) || 0), 0);
    document.getElementById("monthly-revenue").textContent = faturamentoMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

// Função auxiliar para converter datas
function parseDate(dataString) {
    // Tenta converter como Date
    let data = new Date(dataString);
    if (!isNaN(data.getTime())) {
        return data;
    }

    // Tenta formato DD/MM/YYYY
    const partes = dataString.split('/');
    if (partes.length === 3) {
        data = new Date(partes[2], partes[1] - 1, partes[0]);
        if (!isNaN(data.getTime())) {
            return data;
        }
    }

    // Tenta formato YYYY-MM-DD
    data = new Date(dataString.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1'));
    if (!isNaN(data.getTime())) {
        return data;
    }

    // Retorna data atual se não conseguir
    console.warn('Data inválida, usando data atual:', dataString);
    return new Date();
}

// Cria gráfico de vendas
function criarGraficoVendas(vendas) {
    try {
        // Agrupar vendas por data
        const vendasPorData = {};
        
        vendas.forEach(venda => {
            if (!venda.data) return;
            
            const data = parseDate(venda.data);
            const dataFormatada = data.toLocaleDateString('pt-BR');
            const valor = parseFloat(venda.total) || 0;
            
            if (vendasPorData[dataFormatada]) {
                vendasPorData[dataFormatada] += valor;
            } else {
                vendasPorData[dataFormatada] = valor;
            }
        });

        // Se não há dados, mostra mensagem
        if (Object.keys(vendasPorData).length === 0) {
            document.getElementById('sales-chart').innerHTML = `
                <div style="text-align: center; padding: 50px; color: #666;">
                    <i class="fas fa-chart-line" style="font-size: 48px; margin-bottom: 20px;"></i>
                    <p>Nenhum dado de venda disponível</p>
                </div>
            `;
            return;
        }

        // Preparar dados para o gráfico
        const dataTable = new google.visualization.DataTable();
        dataTable.addColumn('string', 'Data');
        dataTable.addColumn('number', 'Vendas (R$)');
        dataTable.addColumn({ type: 'string', role: 'tooltip' });

        // Ordenar por data
        const entries = Object.entries(vendasPorData)
            .map(([data, valor]) => {
                const [dia, mes, ano] = data.split('/');
                return { 
                    dataObj: new Date(ano, mes - 1, dia), 
                    dataStr: data, 
                    valor: valor 
                };
            })
            .sort((a, b) => a.dataObj - b.dataObj);

        entries.forEach(({ dataStr, valor }) => {
            const tooltip = `Data: ${dataStr}\nVendas: R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
            dataTable.addRow([dataStr, valor, tooltip]);
        });

        // Configurações do gráfico
        const options = {
            title: 'Vendas por Data',
            curveType: 'none',
            legend: { position: 'none' },
            colors: ['#2E86AB'],
            backgroundColor: 'transparent',
            hAxis: {
                title: 'Data',
                textStyle: { color: '#333' },
                slantedText: true,
                slantedTextAngle: 45
            },
            vAxis: {
                title: 'Valor (R$)',
                format: 'currency',
                currency: 'BRL',
                textStyle: { color: '#333' }
            },
            chartArea: {
                width: '85%',
                height: '70%',
                left: 70,
                top: 50
            },
            tooltip: {
                isHtml: false,
                textStyle: { fontSize: 12 }
            },
            pointSize: 5,
            lineWidth: 2
        };

        // Criar gráfico
        const chart = new google.visualization.LineChart(document.getElementById('sales-chart'));
        chart.draw(dataTable, options);

    } catch (error) {
        console.error('Erro ao criar gráfico de vendas:', error);
        document.getElementById('sales-chart').innerHTML = 
            '<div class="chart-error"><i class="fas fa-exclamation-triangle"></i><p>Erro ao carregar gráfico de vendas</p></div>';
    }
}

// Cria gráfico de Produtos vs Serviços
function criarGraficoProdutosServicos(produtos) {
    try {
        // Contar produtos e serviços
        let totalProdutos = 0;
        let totalServicos = 0;

        produtos.forEach(item => {
            // Lógica para identificar (ajuste conforme sua estrutura)
            const tipo = (item.tipo || item.categoria || '').toLowerCase();
            const nome = (item.nome || '').toLowerCase();
            const descricao = (item.descricao || '').toLowerCase();
            
            if (tipo.includes('serviço') || 
                tipo.includes('servico') ||
                nome.includes('serviço') ||
                nome.includes('servico') ||
                descricao.includes('serviço') ||
                descricao.includes('servico')) {
                totalServicos++;
            } else {
                totalProdutos++;
            }
        });

        // Preparar dados para o gráfico
        const dataTable = new google.visualization.DataTable();
        dataTable.addColumn('string', 'Categoria');
        dataTable.addColumn('number', 'Quantidade');
        dataTable.addColumn({ type: 'string', role: 'tooltip' });

        dataTable.addRows([
            [
                'Produtos', 
                totalProdutos, 
                `Produtos: ${totalProdutos} item(s)\n${calcularPercentual(totalProdutos, totalProdutos + totalServicos)}% do total`
            ],
            [
                'Serviços', 
                totalServicos, 
                `Serviços: ${totalServicos} item(s)\n${calcularPercentual(totalServicos, totalProdutos + totalServicos)}% do total`
            ]
        ]);

        // Configurações do gráfico
        const options = {
            title: 'Distribuição: Produtos vs Serviços',
            pieHole: 0.4,
            colors: ['#2E86AB', '#F18F01'],
            backgroundColor: 'transparent',
            legend: {
                position: 'labeled',
                textStyle: { color: '#333', fontSize: 12 }
            },
            pieSliceText: 'value',
            tooltip: {
                text: 'percentage',
                showColorCode: true
            },
            chartArea: {
                width: '90%',
                height: '80%',
                top: 20
            },
            fontSize: 12
        };

        // Criar gráfico
        const chart = new google.visualization.PieChart(document.getElementById('categories-chart'));
        chart.draw(dataTable, options);

    } catch (error) {
        console.error('Erro ao criar gráfico de categorias:', error);
        document.getElementById('categories-chart').innerHTML = 
            '<div class="chart-error"><i class="fas fa-exclamation-triangle"></i><p>Erro ao carregar gráfico de categorias</p></div>';
    }
}

// Função auxiliar para calcular percentual
function calcularPercentual(parte, total) {
    if (total === 0) return 0;
    return ((parte / total) * 100).toFixed(1);
}

// Define valores padrão em caso de erro
function definirValoresPadrao() {
    document.getElementById("daily-sales-value").textContent = "0,00";
    document.getElementById("stock-products-value").textContent = "0";
    document.getElementById("new-clients-value").textContent = "0";
    document.getElementById("monthly-revenue").textContent = "0,00";
}

// Inicialização quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    console.log('📊 Dashboard inicializado');
    
    // Se Google Charts já carregou, inicialize
    if (typeof google !== 'undefined' && google.charts) {
        google.charts.setOnLoadCallback(iniciarDashboard);
    }
});

// Atualização automática a cada 2 minutos
setInterval(carregarDados, 120000);