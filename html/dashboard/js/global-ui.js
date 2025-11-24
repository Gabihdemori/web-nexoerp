// global-ui.js - Script global para todas as páginas
class GlobalUI {
    constructor() {
        this.currentTheme = 'light';
        this.userData = null;
        this.init();
    }

    init() {
        console.log('Inicializando Global UI...');
        
        // Carregar configurações primeiro
        this.loadTheme();
        this.loadUserData();
        
        // Configurar event listeners
        this.setupThemeToggle();
        this.setupUserDropdown();
        this.setupSidebar();
        
        // Aplicar configurações
        this.applyTheme();
        this.updateUserInfo();
        
        console.log('Global UI inicializada');
    }

    loadTheme() {
        try {
            const savedConfig = localStorage.getItem('nexoerp-config');
            if (savedConfig) {
                const config = JSON.parse(savedConfig);
                this.currentTheme = config.theme || 'light';
                
                // Se modo automático estiver ativado, verificar preferência do sistema
                if (config.autoDarkMode) {
                    this.applyAutoDarkMode();
                }
            }
        } catch (error) {
            console.error('Erro ao carregar tema:', error);
            this.currentTheme = 'light';
        }
    }

    applyAutoDarkMode() {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const hour = new Date().getHours();
        const isNight = hour >= 18 || hour <= 6;
        
        if (prefersDark || isNight) {
            this.currentTheme = 'dark';
        } else {
            this.currentTheme = 'light';
        }
    }

    applyTheme() {
        console.log('Aplicando tema:', this.currentTheme);
        
        // Aplicar tema imediatamente para evitar flash
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        
        // Forçar repaint para evitar bugs visuais
        document.body.style.opacity = '0';
        setTimeout(() => {
            document.body.style.opacity = '1';
        }, 10);
    }

    loadUserData() {
        try {
            const userData = localStorage.getItem('user');
            if (userData) {
                this.userData = JSON.parse(userData);
                console.log('Dados do usuário carregados:', this.userData);
            }
        } catch (error) {
            console.error('Erro ao carregar dados do usuário:', error);
        }
    }

    updateUserInfo() {
        if (!this.userData) {
            console.warn('Nenhum dado de usuário para atualizar');
            return;
        }

        console.log('Atualizando informações do usuário na UI...');

        // Atualizar header em todas as páginas
        const headerUserName = document.getElementById('headerUserName');
        if (headerUserName) {
            headerUserName.textContent = this.userData.nome || 'Usuário';
        }

        // Atualizar sidebar
        const sidebarUserName = document.getElementById('sidebarUserName');
        const sidebarUserRole = document.getElementById('sidebarUserRole');
        
        if (sidebarUserName) {
            sidebarUserName.textContent = this.userData.nome || 'Usuário';
        }
        if (sidebarUserRole) {
            sidebarUserRole.textContent = this.userData.perfil || 'Usuário';
        }

        // Atualizar avatares
        this.updateAvatars();
    }

    updateAvatars() {
        const avatarUrl = localStorage.getItem(`user-avatar-${this.userData.id}`) || 
                         'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27%23666%27%3E%3Cpath d=%27M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z%27/%3E%3C/svg%3E';

        const avatars = [
            document.getElementById('headerAvatar'),
            document.getElementById('sidebarAvatar'),
            document.getElementById('profileAvatar')
        ].filter(Boolean);

        avatars.forEach(avatar => {
            if (avatar) {
                avatar.src = avatarUrl;
                avatar.onerror = () => {
                    avatar.src = 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27%23666%27%3E%3Cpath d=%27M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z%27/%3E%3C/svg%3E';
                };
            }
        });
    }

    setupThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        if (!themeToggle) {
            console.warn('Botão de tema não encontrado');
            return;
        }

        themeToggle.addEventListener('click', () => {
            this.toggleTheme();
        });

        // Atualizar estado visual do toggle
        this.updateThemeToggleVisual();
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        
        // Salvar no localStorage
        this.saveTheme();
        
        // Aplicar tema
        this.applyTheme();
        
        // Atualizar visual do toggle
        this.updateThemeToggleVisual();
        
        console.log('Tema alterado para:', this.currentTheme);
    }

    saveTheme() {
        try {
            const savedConfig = localStorage.getItem('nexoerp-config');
            const config = savedConfig ? JSON.parse(savedConfig) : {};
            
            config.theme = this.currentTheme;
            localStorage.setItem('nexoerp-config', JSON.stringify(config));
        } catch (error) {
            console.error('Erro ao salvar tema:', error);
        }
    }

    updateThemeToggleVisual() {
        const themeToggle = document.getElementById('themeToggle');
        if (!themeToggle) return;

        const themeIcon = themeToggle.querySelector('.theme-icon');
        if (themeIcon) {
            if (this.currentTheme === 'dark') {
                themeIcon.style.left = '23px';
            } else {
                themeIcon.style.left = '3px';
            }
        }
    }

    setupUserDropdown() {
        const dropdownBtn = document.getElementById('userDropdownBtn');
        const dropdownMenu = document.getElementById('userDropdown');

        if (!dropdownBtn || !dropdownMenu) {
            console.warn('Elementos do dropdown do usuário não encontrados');
            return;
        }

        dropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isExpanded = dropdownBtn.getAttribute('aria-expanded') === 'true';
            dropdownBtn.setAttribute('aria-expanded', !isExpanded);
            dropdownMenu.classList.toggle('show', !isExpanded);
        });

        // Fechar dropdown ao clicar fora
        document.addEventListener('click', () => {
            dropdownBtn.setAttribute('aria-expanded', 'false');
            dropdownMenu.classList.remove('show');
        });

        // Prevenir fechamento ao clicar dentro do dropdown
        dropdownMenu.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Configurar logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }
    }

    setupSidebar() {
        const sidebarToggle = document.getElementById('sidebarToggle');
        const menuToggle = document.getElementById('menuToggle');
        const sidebar = document.querySelector('.sidebar');

        if (sidebarToggle && sidebar) {
            sidebarToggle.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
                this.adjustMainContent();
            });
        }

        if (menuToggle && sidebar) {
            menuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('show');
            });
        }

        // Fechar sidebar ao clicar em um link (mobile)
        const sidebarLinks = document.querySelectorAll('.sidebar-nav a');
        sidebarLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 1024) {
                    sidebar.classList.remove('show');
                }
            });
        });
    }

    adjustMainContent() {
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.getElementById('main-content');
        
        if (sidebar && mainContent) {
            if (sidebar.classList.contains('collapsed')) {
                mainContent.style.marginLeft = '80px';
            } else {
                mainContent.style.marginLeft = '280px';
            }
        }
    }

    logout() {
        console.log('Executando logout...');
        
        // Limpar dados de autenticação
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Redirecionar para login
        window.location.href = '../../login/login.html';
    }

    // Método para forçar atualização das informações do usuário
    refreshUserData() {
        this.loadUserData();
        this.updateUserInfo();
    }
}

// Inicialização global
document.addEventListener('DOMContentLoaded', () => {
    // Criar instância global
    window.globalUI = new GlobalUI();
    
    // Adicionar classe de carregamento para evitar flash
    document.body.classList.add('ui-loaded');
});

// Fallback para quando o DOM já estiver carregado
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(() => {
        if (!window.globalUI) {
            window.globalUI = new GlobalUI();
            document.body.classList.add('ui-loaded');
        }
    }, 100);
}