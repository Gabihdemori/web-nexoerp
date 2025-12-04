// =============================================
// DASHBOARD COMPLETO E CORRIGIDO
// =============================================

const API_CONFIG = {
    VENDAS: "https://api-nexoerp.vercel.app/api/vendas",
    PRODUTOS: "https://api-nexoerp.vercel.app/api/produtos", 
    CLIENTES: "https://api-nexoerp.vercel.app/api/clientes"
};

// Configuração do Google Charts já está no HTML
// Apenas definimos o callback
google.charts.setOnLoadCallback(iniciarDashboard);

async function iniciarDashboard() {
    console.log('📊 Google Charts carregado, iniciando dashboard...');
    await carregarDados();
    
    // Configurar event listeners
    const salesPeriod = document.getElementById('salesPeriod');
    if (salesPeriod) {
        salesPeriod.addEventListener('change', carregarDados);
    }
}

// Função principal que carrega tudo
async function carregarDados() {
    try {
        console.log('📊 Iniciando carregamento do dashboard...');
        
        const [vendasData, produtosData, clientesData] = await Promise.all([
            fetch(API_CONFIG.VENDAS).then(r => r.json()).catch(erro => {
                console.error('❌ Erro ao carregar vendas:', erro);
                return { vendas: [] };
            }),
            fetch(API_CONFIG.PRODUTOS).then(r => r.json()).catch(erro => {
                console.error('❌ Erro ao carregar produtos:', erro);
                return { produtos: [] };
            }),
            fetch(API_CONFIG.CLIENTES).then(r => r.json()).catch(erro => {
                console.error('❌ Erro ao carregar clientes:', erro);
                return { clientes: [] };
            })
        ]);

        const vendas = Array.isArray(vendasData) ? vendasData : vendasData.vendas || vendasData.data || [];
        const produtos = Array.isArray(produtosData) ? produtosData : produtosData.produtos || produtosData.data || [];
        const clientes = Array.isArray(clientesData) ? clientesData : clientesData.clientes || clientesData.data || [];

        console.log(`📊 Dados carregados: ${vendas.length} vendas, ${produtos.length} produtos, ${clientes.length} clientes`);
        
        // DEBUG: Verificar todas as datas
        debugDatasDashboard(vendas);

        // Atualiza TODOS os números
        atualizarVendasDoDia(vendas);
        atualizarTotalClientes(clientes);
        atualizarTotalEstoque(produtos);
        atualizarFaturamentoMensal(vendas);
        
        // Cria os gráficos
        criarGraficoVendas(vendas);
        criarGraficoRegioes(vendas, clientes);
        
    } catch (error) {
        console.error('❌ Erro ao carregar dashboard:', error);
        definirValoresPadrao();
    }
}

// Função para debug de datas no dashboard
function debugDatasDashboard(vendas) {
    console.log('🔍 DEBUG DATAS DASHBOARD');
    console.log('========================');
    
    const hoje = new Date();
    const hojeBR = hoje.toLocaleDateString('pt-BR');
    console.log('Hoje (local):', hojeBR);
    console.log('Hoje (ISO):', hoje.toISOString());
    
    vendas.forEach((venda, index) => {
        console.log(`\n📦 Venda ${index + 1}:`);
        console.log('ID:', venda.id);
        console.log('Data do backend:', venda.data);
        console.log('Total:', venda.total);
        
        try {
            const dataParseada = parseDate(venda.data);
            console.log('Data parseada (local):', dataParseada.toLocaleDateString('pt-BR'));
            console.log('Data parseada (ISO):', dataParseada.toISOString());
            
            const mesmoDia = dataParseada.toLocaleDateString('pt-BR') === hojeBR;
            console.log('É hoje?', mesmoDia);
        } catch (error) {
            console.error('Erro ao parsear data:', error);
        }
    });
}

// Atualiza VENDAS DO DIA
function atualizarVendasDoDia(vendas) {
    console.log('💰 Calculando vendas do dia...');
    
    const hoje = new Date();
    const hojeStr = hoje.toLocaleDateString('pt-BR'); // Formato: DD/MM/YYYY
    
    let totalVendasDia = 0;
    let vendasDoDia = 0;
    
    vendas.forEach(venda => {
        if (!venda.data) return;
        
        try {
            // Converter data da venda para string no mesmo formato
            const dataVendaObj = parseDate(venda.data);
            const dataVendaStr = dataVendaObj.toLocaleDateString('pt-BR');
            
            if (dataVendaStr === hojeStr) {
                const valor = parseFloat(venda.total) || 0;
                totalVendasDia += valor;
                vendasDoDia++;
                console.log(`✅ Venda do dia encontrada: ${dataVendaStr} - R$ ${valor}`);
            }
        } catch (error) {
            console.error('❌ Erro ao processar venda:', venda.data, error);
        }
    });
    
    console.log(`💰 Vendas do dia: ${vendasDoDia} vendas, total: R$ ${totalVendasDia}`);
    
    const dailySalesElement = document.getElementById("daily-sales-value");
    if (dailySalesElement) {
        dailySalesElement.textContent = 
            totalVendasDia.toLocaleString('pt-BR', { 
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
    }
}

// Atualiza TOTAL DE CLIENTES
function atualizarTotalClientes(clientes) {
    const newClientsElement = document.getElementById("new-clients-value");
    if (newClientsElement) {
        newClientsElement.textContent = clientes.length;
    }
}

// Atualiza TOTAL DE ESTOQUE
function atualizarTotalEstoque(produtos) {
    const totalEstoque = produtos.reduce((soma, produto) => {
        const estoque = parseInt(produto.estoque);
        return isNaN(estoque) ? soma : soma + estoque;
    }, 0);
    
    const stockProductsElement = document.getElementById("stock-products-value");
    if (stockProductsElement) {
        stockProductsElement.textContent = totalEstoque.toLocaleString('pt-BR');
    }
}

// Atualiza FATURAMENTO MENSAL
function atualizarFaturamentoMensal(vendas) {
    console.log('💰 Calculando faturamento mensal...');
    
    const hoje = new Date();
    const mesAtual = hoje.getMonth(); // 0-11
    const anoAtual = hoje.getFullYear();
    
    let faturamentoMensal = 0;
    let vendasMes = 0;
    
    vendas.forEach(venda => {
        if (!venda.data) return;
        
        try {
            const dataVenda = parseDate(venda.data);
            const vendaMes = dataVenda.getMonth();
            const vendaAno = dataVenda.getFullYear();
            
            if (vendaMes === mesAtual && vendaAno === anoAtual) {
                const total = parseFloat(venda.total) || 0;
                faturamentoMensal += total;
                vendasMes++;
            }
        } catch (error) {
            console.error('❌ Erro ao processar venda:', venda.data, error);
        }
    });
    
    console.log(`💰 ${vendasMes} vendas no mês, faturamento: R$ ${faturamentoMensal}`);
    
    const monthlyRevenueElement = document.getElementById("monthly-revenue");
    if (monthlyRevenueElement) {
        monthlyRevenueElement.textContent = 
            faturamentoMensal.toLocaleString('pt-BR', { 
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
    }
}

// Função para converter datas - SIMPLIFICADA
function parseDate(dataString) {
    if (!dataString) return new Date();
    
    // Se já for um objeto Date
    if (dataString instanceof Date) {
        return dataString;
    }
    
    // Remover espaços extras
    dataString = dataString.toString().trim();
    
    // Formato brasileiro: DD/MM/YYYY HH:MM ou DD/MM/YYYY
    const formatoBrasileiro = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/;
    const match = dataString.match(formatoBrasileiro);
    
    if (match) {
        const [, dia, mes, ano, horas = '00', minutos = '00'] = match;
        
        // Criar data no fuso horário local
        const date = new Date(
            parseInt(ano),
            parseInt(mes) - 1,
            parseInt(dia),
            parseInt(horas),
            parseInt(minutos)
        );
        
        if (!isNaN(date.getTime())) {
            return date;
        }
    }
    
    // Se for formato ISO
    if (/^\d{4}-\d{2}-\d{2}/.test(dataString)) {
        const date = new Date(dataString);
        if (!isNaN(date.getTime())) {
            return date;
        }
    }
    
    // Tentar como string de data padrão
    const date = new Date(dataString);
    if (!isNaN(date.getTime())) {
        return date;
    }
    
    console.warn(`❌ Não foi possível converter data: "${dataString}", usando data atual`);
    return new Date();
}

// Cria gráfico de vendas
function criarGraficoVendas(vendas) {
    try {
        console.log('📈 Criando gráfico de vendas...');
        
        const vendasPorData = {};
        let totalVendas = 0;
        
        vendas.forEach(venda => {
            if (!venda.data) return;
            
            try {
                const data = parseDate(venda.data);
                const dataFormatada = data.toLocaleDateString('pt-BR');
                const valor = parseFloat(venda.total) || 0;
                totalVendas += valor;
                
                if (vendasPorData[dataFormatada]) {
                    vendasPorData[dataFormatada] += valor;
                } else {
                    vendasPorData[dataFormatada] = valor;
                }
            } catch (error) {
                console.error('❌ Erro ao processar venda:', error);
            }
        });

        // Se não há dados, mostra mensagem
        const salesChartElement = document.getElementById('sales-chart');
        if (!salesChartElement) return;
        
        if (Object.keys(vendasPorData).length === 0) {
            salesChartElement.innerHTML = `
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

        // Ordenar por data
        const entries = Object.entries(vendasPorData)
            .map(([data, valor]) => {
                const [dia, mes, ano] = data.split('/');
                return { 
                    dataObj: new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia)), 
                    dataStr: data, 
                    valor: valor 
                };
            })
            .sort((a, b) => a.dataObj - b.dataObj);

        // Limitar a 15 datas para não sobrecarregar o gráfico
        const ultimasEntradas = entries.slice(-15);
        
        ultimasEntradas.forEach(({ dataStr, valor }) => {
            dataTable.addRow([dataStr, valor]);
        });

        // Configurações do gráfico
        const options = {
            title: 'Vendas por Data (Últimas 15 datas)',
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
                textStyle: { color: '#333' },
                minValue: 0
            },
            chartArea: {
                width: '85%',
                height: '70%',
                left: 70,
                top: 50
            },
            pointSize: 5,
            lineWidth: 2,
            animation: {
                duration: 1000,
                easing: 'out'
            }
        };

        const chart = new google.visualization.LineChart(salesChartElement);
        chart.draw(dataTable, options);
        
        console.log('✅ Gráfico de vendas criado com sucesso!');

    } catch (error) {
        console.error('❌ Erro ao criar gráfico de vendas:', error);
        const salesChartElement = document.getElementById('sales-chart');
        if (salesChartElement) {
            salesChartElement.innerHTML = 
                `<div class="chart-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Erro ao carregar gráfico de vendas</p>
                    <p style="font-size: 12px; margin-top: 10px;">${error.message}</p>
                </div>`;
        }
    }
}

// Cria gráfico de regiões (cidades dos clientes)
function criarGraficoRegioes(vendas, clientes) {
    try {
        console.log('🗺️ Criando gráfico de regiões...');
        
        // Mapear clienteId para cidade
        const clienteCidadeMap = {};
        clientes.forEach(cliente => {
            if (cliente.cidade) {
                clienteCidadeMap[cliente.id] = cliente.cidade;
            }
        });
        
        // Agrupar vendas por cidade
        const vendasPorCidade = {};
        let totalCidades = 0;
        
        vendas.forEach(venda => {
            if (venda.clienteId && clienteCidadeMap[venda.clienteId]) {
                const cidade = clienteCidadeMap[venda.clienteId];
                const valor = parseFloat(venda.total) || 0;
                
                if (vendasPorCidade[cidade]) {
                    vendasPorCidade[cidade] += valor;
                } else {
                    vendasPorCidade[cidade] = valor;
                    totalCidades++;
                }
            }
        });
        
        console.log(`🏙️ Vendas por cidade:`, vendasPorCidade);

        const categoriesChartElement = document.getElementById('categories-chart');
        if (!categoriesChartElement) return;
        
        // Se não há dados, mostra gráfico de estados
        if (Object.keys(vendasPorCidade).length === 0) {
            criarGraficoEstados(clientes);
            return;
        }

        // Preparar dados para o gráfico
        const dataTable = new google.visualization.DataTable();
        dataTable.addColumn('string', 'Cidade');
        dataTable.addColumn('number', 'Vendas (R$)');
        dataTable.addColumn({ type: 'string', role: 'tooltip' });

        Object.entries(vendasPorCidade).forEach(([cidade, valor]) => {
            const tooltip = `${cidade}: R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
            dataTable.addRow([cidade, valor, tooltip]);
        });

        // Configurações do gráfico
        const options = {
            title: `Vendas por Cidade (${totalCidades} cidades)`,
            pieHole: 0.4,
            colors: ['#2E86AB', '#F18F01', '#C73E1D', '#A23B72', '#2A9D8F', '#E9C46A'],
            backgroundColor: 'transparent',
            legend: {
                position: 'labeled',
                textStyle: { color: '#333', fontSize: 12 }
            },
            pieSliceText: 'value',
            tooltip: {
                text: 'value',
                showColorCode: true
            },
            chartArea: {
                width: '90%',
                height: '80%',
                top: 20
            },
            fontSize: 12
        };

        const chart = new google.visualization.PieChart(categoriesChartElement);
        chart.draw(dataTable, options);
        
        console.log('✅ Gráfico de regiões criado com sucesso!');

    } catch (error) {
        console.error('❌ Erro ao criar gráfico de regiões:', error);
        const categoriesChartElement = document.getElementById('categories-chart');
        if (categoriesChartElement) {
            categoriesChartElement.innerHTML = `
                <div style="text-align: center; padding: 50px; color: #666;">
                    <i class="fas fa-map" style="font-size: 48px; margin-bottom: 20px;"></i>
                    <p>Gráfico de regiões</p>
                    <p style="font-size: 14px; margin-top: 10px;">Para ver vendas por região, cadastre a cidade dos clientes</p>
                </div>
            `;
        }
    }
}

function criarGraficoEstados(clientes) {
    try {
        console.log('🏛️ Criando gráfico de estados...');
        
        // Agrupar clientes por estado
        const clientesPorEstado = {};
        
        clientes.forEach(cliente => {
            if (cliente.estado) {
                const estado = cliente.estado.toUpperCase();
                if (clientesPorEstado[estado]) {
                    clientesPorEstado[estado]++;
                } else {
                    clientesPorEstado[estado] = 1;
                }
            }
        });
        
        const categoriesChartElement = document.getElementById('categories-chart');
        if (!categoriesChartElement) return;
        
        if (Object.keys(clientesPorEstado).length === 0) {
            categoriesChartElement.innerHTML = `
                <div style="text-align: center; padding: 50px; color: #666;">
                    <i class="fas fa-map-marker-alt" style="font-size: 48px; margin-bottom: 20px;"></i>
                    <p>Nenhum dado de localização disponível</p>
                </div>
            `;
            return;
        }

        const dataTable = new google.visualization.DataTable();
        dataTable.addColumn('string', 'Estado');
        dataTable.addColumn('number', 'Clientes');

        Object.entries(clientesPorEstado).forEach(([estado, quantidade]) => {
            dataTable.addRow([estado, quantidade]);
        });

        const options = {
            title: 'Clientes por Estado',
            pieHole: 0.4,
            colors: ['#2E86AB', '#F18F01', '#C73E1D', '#A23B72'],
            backgroundColor: 'transparent',
            legend: {
                position: 'labeled',
                textStyle: { color: '#333', fontSize: 12 }
            },
            pieSliceText: 'value',
            chartArea: {
                width: '90%',
                height: '80%',
                top: 20
            }
        };

        const chart = new google.visualization.PieChart(categoriesChartElement);
        chart.draw(dataTable, options);
        
    } catch (error) {
        console.error('Erro ao criar gráfico de estados:', error);
    }
}

function definirValoresPadrao() {
    console.log('⚠️ Definindo valores padrão');
    
    const elements = {
        'daily-sales-value': '0,00',
        'stock-products-value': '0',
        'new-clients-value': '0',
        'monthly-revenue': '0,00'
    };
    
    Object.entries(elements).forEach(([id, valor]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = valor;
        }
    });
}

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    console.log('📊 Dashboard inicializado');
    
    // Verificar se Google Charts está carregado
    if (typeof google !== 'undefined' && google.charts) {
        console.log('✅ Google Charts disponível');
        // O callback já está configurado no head
    } else {
        console.error('❌ Google Charts não carregado');
        
        // Mostrar mensagem de erro
        const salesChart = document.getElementById('sales-chart');
        const categoriesChart = document.getElementById('categories-chart');
        
        if (salesChart) {
            salesChart.innerHTML = `
                <div style="text-align: center; padding: 50px; color: #e74c3c;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px;"></i>
                    <p>Erro ao carregar Google Charts</p>
                    <p style="font-size: 14px;">Atualize a página ou verifique sua conexão</p>
                </div>
            `;
        }
        
        if (categoriesChart) {
            categoriesChart.innerHTML = `
                <div style="text-align: center; padding: 50px; color: #e74c3c;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px;"></i>
                    <p>Erro ao carregar Google Charts</p>
                </div>
            `;
        }
    }
    
    // Atualização automática a cada 2 minutos
    setInterval(() => {
        console.log('🔄 Atualização automática do dashboard');
        carregarDados();
    }, 120000);
});

// Adicione estilos para mensagens de erro
const style = document.createElement('style');
style.textContent = `
    .chart-error {
        text-align: center;
        padding: 50px;
        color: #666;
        background: #f8f9fa;
        border-radius: 8px;
        border: 1px solid #dee2e6;
    }
    .chart-error i {
        font-size: 48px;
        margin-bottom: 20px;
        display: block;
        color: #dc3545;
    }
`;
document.head.appendChild(style);