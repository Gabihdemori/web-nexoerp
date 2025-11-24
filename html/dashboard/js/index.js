 class ProfileViewer {
    constructor() {
        this.userData = null;
        this.init();
    }

    async init() {
        console.log('Iniciando ProfileViewer...');
        
        // Verificar autenticação primeiro
        if (!this.checkAuth()) {
            return;
        }
        
        await this.loadUserData();
        this.setupEventListeners();
    }

    checkAuth() {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        
        if (!token || !user) {
            console.warn('Usuário não autenticado, redirecionando para login...');
            window.location.href = '../../login/login.html';
            return false;
        }
        
        console.log('Usuário autenticado:', JSON.parse(user));
        return true;
    }
 }
       const API_CONFIG = {
            VENDAS: "http://localhost:3000/api/vendas",
            PRODUTOS: "http://localhost:3000/api/produtos",
            CLIENTES: "http://localhost:3000/api/clientes"
        };

        // Elementos DOM
        const elements = {
            sidebar: document.querySelector('.sidebar'),
            sidebarToggle: document.getElementById('sidebarToggle'),
            menuToggle: document.getElementById('menuToggle'),
            themeToggle: document.getElementById('themeToggle'),
            userDropdownBtn: document.getElementById('userDropdownBtn'),
            userDropdown: document.getElementById('userDropdown'),
            notificationBtn: document.getElementById('notificationBtn'),
            notificationDropdown: document.getElementById('notificationDropdown'),
            searchInput: document.getElementById('searchInput')
        };

        // Estado da aplicação
        const appState = {
            theme: localStorage.getItem('theme') || 'light',
            sidebarCollapsed: localStorage.getItem('sidebarCollapsed') === 'true',
            notifications: []
        };

        // Inicialização
        document.addEventListener('DOMContentLoaded', function() {
            initializeApp();
            loadDashboardData();
            setupEventListeners();
        });

        // Inicializar aplicação
        function initializeApp() {
            // Aplicar tema salvo
            document.documentElement.setAttribute('data-theme', appState.theme);
            
            // Aplicar estado do sidebar
            if (appState.sidebarCollapsed) {
                elements.sidebar.classList.add('collapsed');
            }
            
            // Atualizar data de último acesso
            updateLastAccess();
        }

        // Configurar event listeners
        function setupEventListeners() {
            // Toggle do sidebar
            elements.sidebarToggle.addEventListener('click', toggleSidebar);
            elements.menuToggle.addEventListener('click', toggleMobileSidebar);
            
            // Toggle do tema
            elements.themeToggle.addEventListener('click', toggleTheme);
            
            // Dropdown do usuário
            elements.userDropdownBtn.addEventListener('click', toggleUserDropdown);
            
            // Dropdown de notificações
            elements.notificationBtn.addEventListener('click', toggleNotifications);
            
            // Pesquisa
            elements.searchInput.addEventListener('input', debounce(handleSearch, 300));
            
            // Fechar dropdowns ao clicar fora
            document.addEventListener('click', closeAllDropdowns);
            
            // Responsividade
            window.addEventListener('resize', handleResize);
        }

        // Toggle do sidebar
        function toggleSidebar() {
            elements.sidebar.classList.toggle('collapsed');
            appState.sidebarCollapsed = elements.sidebar.classList.contains('collapsed');
            localStorage.setItem('sidebarCollapsed', appState.sidebarCollapsed);
        }

        // Toggle do sidebar mobile
        function toggleMobileSidebar() {
            elements.sidebar.classList.toggle('show');
        }

        // Toggle do tema
        function toggleTheme() {
            appState.theme = appState.theme === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', appState.theme);
            localStorage.setItem('theme', appState.theme);
        }

        // Toggle dropdown do usuário
        function toggleUserDropdown(e) {
            e.stopPropagation();
            elements.userDropdown.classList.toggle('show');
            elements.userDropdownBtn.setAttribute('aria-expanded', 
                elements.userDropdown.classList.contains('show')
            );
        }

        // Toggle notificações
        function toggleNotifications(e) {
            e.stopPropagation();
            elements.notificationDropdown.classList.toggle('show');
        }

        // Fechar todos os dropdowns
        function closeAllDropdowns(e) {
            if (!e.target.closest('.user-dropdown')) {
                elements.userDropdown.classList.remove('show');
                elements.userDropdownBtn.setAttribute('aria-expanded', 'false');
            }
            
            if (!e.target.closest('.notifications')) {
                elements.notificationDropdown.classList.remove('show');
            }
        }

        // Debounce para pesquisa
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

        // Manipular pesquisa
        function handleSearch(e) {
            const query = e.target.value.trim();
            if (query.length > 2) {
                // Implementar lógica de pesquisa
                console.log('Pesquisando por:', query);
            }
        }

        // Manipular redimensionamento
        function handleResize() {
            if (window.innerWidth > 1024) {
                elements.sidebar.classList.remove('show');
            }
        }

        // Atualizar último acesso
        function updateLastAccess() {
            const now = new Date();
            const formattedDate = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            document.getElementById('lastAccess').textContent = formattedDate;
        }

        // Carregar dados do dashboard
        async function loadDashboardData() {
            try {
                await Promise.all([
                    carregarVendas(),
                    carregarEstoque(),
                    carregarClientes(),
                    carregarFaturamentoMensal()
                ]);
            } catch (error) {
                console.error('Erro ao carregar dados do dashboard:', error);
                showError('Erro ao carregar dados. Tente novamente.');
            }
        }

        // Funções de carregamento de dados (do seu backend)
        async function carregarVendas() {
            try {
                const res = await fetch(API_CONFIG.VENDAS);
                if (!res.ok) throw new Error('Erro na requisição');
                
                const data = await res.json();
                const total = Array.isArray(data) 
                    ? data.reduce((soma, venda) => soma + (venda.total || 0), 0)
                    : 0;
                    
                document.getElementById("daily-sales-value").textContent =
                    total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    
                updateMetricTrend('daily-sales-value', total, 1000); // Valor de referência para comparação
            } catch (error) {
                console.error("Erro ao carregar vendas:", error);
                document.getElementById("daily-sales-value").textContent = "0,00";
            }
        }

        async function carregarEstoque() {
            try {
                const res = await fetch(API_CONFIG.PRODUTOS);
                if (!res.ok) throw new Error('Erro na requisição');
                
                const data = await res.json();
                const totalEstoque = Array.isArray(data)
                    ? data.reduce((soma, produto) => soma + (produto.estoque || 0), 0)
                    : 0;
                    
                document.getElementById("stock-products-value").textContent =
                    totalEstoque.toLocaleString('pt-BR');
                    
                updateMetricTrend('stock-products-value', totalEstoque, 1500);
            } catch (error) {
                console.error("Erro ao carregar estoque:", error);
                document.getElementById("stock-products-value").textContent = "0";
            }
        }

        async function carregarClientes() {
            try {
                const res = await fetch(API_CONFIG.CLIENTES);
                if (!res.ok) throw new Error('Erro na requisição');
                
                const data = await res.json();
                const clientesArray = Array.isArray(data) ? data : data.clientes;
                const totalClientes = Array.isArray(clientesArray) ? clientesArray.length : 0;
                
                document.getElementById("new-clients-value").textContent = totalClientes;
                
                updateMetricTrend('new-clients-value', totalClientes, 50);
            } catch (error) {
                console.error("Erro ao carregar clientes:", error);
                document.getElementById("new-clients-value").textContent = "0";
            }
        }

        async function carregarFaturamentoMensal() {
            try {
                const today = new Date();
                const mes = today.getMonth() + 1;
                const ano = today.getFullYear();
                
                const res = await fetch(`${API_CONFIG.VENDAS}?mes=${mes}&ano=${ano}`);
                if (!res.ok) throw new Error('Erro na requisição');
                
                const data = await res.json();
                const totalMensal = Array.isArray(data)
                    ? data.reduce((soma, venda) => soma + (venda.total || 0), 0)
                    : 0;
                    
                document.getElementById("monthly-revenue").textContent =
                    totalMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    
                updateMetricTrend('monthly-revenue', totalMensal, 50000);
            } catch (error) {
                console.error("Erro ao carregar faturamento mensal:", error);
                document.getElementById("monthly-revenue").textContent = "0,00";
            }
        }

        // Atualizar tendência das métricas
        function updateMetricTrend(metricId, currentValue, referenceValue) {
            const trendElement = document.querySelector(`#${metricId}`).closest('.metric-info').querySelector('.metric-trend');
            const percentage = ((currentValue - referenceValue) / referenceValue) * 100;
            
          
        }

        // Mostrar erro
        function showError(message) {
            // Implementar sistema de notificação de erro
            console.error('Erro:', message);
        }

        // Tratamento de erro global
        window.addEventListener('error', (e) => {
            console.error('Erro global:', e.error);
            showError('Ocorreu um erro inesperado.');
        });
        