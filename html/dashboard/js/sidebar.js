const elements = {
            sidebar: document.querySelector('.sidebar'),
            sidebarToggle: document.getElementById('sidebarToggle'),
            menuToggle: document.getElementById('menuToggle'),
            themeToggle: document.getElementById('themeToggle'),
            userDropdownBtn: document.getElementById('userDropdownBtn'),
            userDropdown: document.getElementById('userDropdown'),
            notificationBtn: document.getElementById('notificationBtn'),
            notificationDropdown: document.getElementById('notificationDropdown'),
            searchInput: document.getElementById('searchInput'),
            usersTableBody: document.querySelector('.data-table tbody'),
            cardsView: document.getElementById('cardsView'),
            tableView: document.getElementById('tableView'),
            pagination: document.getElementById('pagination'),
            addUserBtn: document.getElementById('addUserBtn'),
            viewButtons: document.querySelectorAll('.view-btn'),
            statusFilter: document.getElementById('statusFilter'),
            perfilFilter: document.getElementById('perfilFilter'),
            searchFilter: document.getElementById('searchFilter'),
            itemsPerPage: document.getElementById('itemsPerPage'),
            cardsView: document.getElementById("cardsView"), 
        };

        // Estado da aplicação
        const appState = {
            theme: localStorage.getItem('theme') || 'light',
            sidebarCollapsed: localStorage.getItem('sidebarCollapsed') === 'true',
            currentView: localStorage.getItem('usersView') || 'table',
            currentPage: 1,
            itemsPerPage: 10,
            searchTerm: '',
            filters: {
                status: '',
                perfil: ''
            },
            users: []
        };

        // Inicialização
        document.addEventListener('DOMContentLoaded', function() {
            initializeApp();
            loadUsersData();
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
            
            // Aplicar visualização salva
            setView(appState.currentView);
            
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
            
            // Controles de visualização
            elements.viewButtons.forEach(btn => {
                btn.addEventListener('click', () => setView(btn.dataset.view));
            });
            
            // Filtros
            elements.statusFilter.addEventListener('change', handleFilterChange);
            elements.perfilFilter.addEventListener('change', handleFilterChange);
            elements.searchFilter.addEventListener('input', debounce(handleSearch, 300));
            elements.itemsPerPage.addEventListener('change', handleItemsPerPageChange);
            
            // Botão adicionar usuário
            elements.addUserBtn.addEventListener('click', openUserModal);
            
            // Fechar dropdowns ao clicar fora
            document.addEventListener('click', closeAllDropdowns);
            
            // Responsividade
            window.addEventListener('resize', handleResize);
        }

        // Funções de UI (as mesmas do dashboard)
        function toggleSidebar() {
            elements.sidebar.classList.toggle('collapsed');
            appState.sidebarCollapsed = elements.sidebar.classList.contains('collapsed');
            localStorage.setItem('sidebarCollapsed', appState.sidebarCollapsed);
        }

        function toggleMobileSidebar() {
            elements.sidebar.classList.toggle('show');
        }

        function toggleTheme() {
            appState.theme = appState.theme === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', appState.theme);
            localStorage.setItem('theme', appState.theme);
        }

        function toggleUserDropdown(e) {
            e.stopPropagation();
            elements.userDropdown.classList.toggle('show');
            elements.userDropdownBtn.setAttribute('aria-expanded', 
                elements.userDropdown.classList.contains('show')
            );
        }

        function toggleNotifications(e) {
            e.stopPropagation();
            elements.notificationDropdown.classList.toggle('show');
        }

        function closeAllDropdowns(e) {
            if (!e.target.closest('.user-dropdown')) {
                elements.userDropdown.classList.remove('show');
                elements.userDropdownBtn.setAttribute('aria-expanded', 'false');
            }
            
            if (!e.target.closest('.notifications')) {
                elements.notificationDropdown.classList.remove('show');
            }
        }

        function handleResize() {
            if (window.innerWidth > 1024) {
                elements.sidebar.classList.remove('show');
            }
        }

        function updateLastAccess() {
            const now = new Date();
            const formattedDate = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            document.getElementById('lastAccess').textContent = formattedDate;
        }

        // Funções específicas da página de usuários
        function setView(view) {
            appState.currentView = view;
            localStorage.setItem('usersView', view);
            
            // Atualizar botões ativos
            elements.viewButtons.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.view === view);
            });
            
            // Mostrar/ocultar visualizações
            elements.tableView.style.display = view === 'table' ? 'block' : 'none';
            elements.cardsView.style.display = view === 'cards' ? 'grid' : 'none';
            
            // Renderizar dados na visualização atual
            renderUsers();
        }

        function handleFilterChange(e) {
            const filterName = e.target.id.replace('Filter', '');
            appState.filters[filterName] = e.target.value;
            appState.currentPage = 1;
            renderUsers();
        }

        function handleSearch(e) {
            appState.searchTerm = e.target.value;
            appState.currentPage = 1;
            renderUsers();
        }

        function handleItemsPerPageChange(e) {
            appState.itemsPerPage = parseInt(e.target.value);
            appState.currentPage = 1;
            renderUsers();
        }