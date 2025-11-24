// global-ui.js - Script global simplificado
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
        document.documentElement.setAttribute('data-theme', this.currentTheme);
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
}

// Inicialização global
document.addEventListener('DOMContentLoaded', () => {
    window.globalUI = new GlobalUI();
});








// =============================================
// GERENCIADOR DE INTERFACE DO USUÁRIO
// =============================================

class UIManager {
    constructor() {
        this.state = {
            theme: localStorage.getItem('theme') || 'light',
            sidebarCollapsed: localStorage.getItem('sidebarCollapsed') === 'true',
            currentView: localStorage.getItem('currentView') || 'table'
        };
        
        this.elements = this.initializeElements();
        this.init();
    }

    initializeElements() {
        return {
            sidebar: document.querySelector('.sidebar'),
            sidebarToggle: document.getElementById('sidebarToggle'),
            menuToggle: document.getElementById('menuToggle'),
            themeToggle: document.getElementById('themeToggle'),
            userDropdownBtn: document.getElementById('userDropdownBtn'),
            userDropdown: document.getElementById('userDropdown'),
            viewButtons: document.querySelectorAll('.view-btn'),
            lastAccess: document.getElementById('lastAccess')
        };
    }

    init() {
        this.applySavedState();
        this.setupEventListeners();
        this.updateLastAccess();
    }

    applySavedState() {
        // Aplicar tema
        document.documentElement.setAttribute('data-theme', this.state.theme);
        
        // Aplicar estado do sidebar
        if (this.state.sidebarCollapsed) {
            this.elements.sidebar.classList.add('collapsed');
        }
        
        // Aplicar view
        this.setActiveView(this.state.currentView);
    }

    setupEventListeners() {
        // Sidebar
        if (this.elements.sidebarToggle) {
            this.elements.sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        }
        
        if (this.elements.menuToggle) {
            this.elements.menuToggle.addEventListener('click', () => this.toggleMobileSidebar());
        }
        
        // Tema
        if (this.elements.themeToggle) {
            this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());
        }
        
        // Dropdown do usuário
        if (this.elements.userDropdownBtn) {
            this.elements.userDropdownBtn.addEventListener('click', (e) => this.toggleUserDropdown(e));
        }
        
        // Botões de visualização
        this.elements.viewButtons.forEach(btn => {
            btn.addEventListener('click', () => this.handleViewChange(btn.dataset.view));
        });
        
        // Eventos globais
        document.addEventListener('click', (e) => this.handleOutsideClick(e));
        window.addEventListener('resize', () => this.handleResize());
    }

    // ==================== SIDEBAR ====================

    toggleSidebar() {
        this.elements.sidebar.classList.toggle('collapsed');
        this.state.sidebarCollapsed = this.elements.sidebar.classList.contains('collapsed');
        localStorage.setItem('sidebarCollapsed', this.state.sidebarCollapsed);
    }

    toggleMobileSidebar() {
        this.elements.sidebar.classList.toggle('show');
    }

    // ==================== TEMA ====================

    toggleTheme() {
        this.state.theme = this.state.theme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', this.state.theme);
        localStorage.setItem('theme', this.state.theme);
    }

    // ==================== DROPDOWNS ====================

    toggleUserDropdown(e) {
        if (e) e.stopPropagation();
        
        if (this.elements.userDropdown) {
            this.elements.userDropdown.classList.toggle('show');
            const isExpanded = this.elements.userDropdown.classList.contains('show');
            this.elements.userDropdownBtn.setAttribute('aria-expanded', isExpanded);
        }
    }

    handleOutsideClick(e) {
        // Fechar dropdowns ao clicar fora
        if (this.elements.userDropdown && !e.target.closest('.user-dropdown')) {
            this.elements.userDropdown.classList.remove('show');
            this.elements.userDropdownBtn.setAttribute('aria-expanded', 'false');
        }
    }

    // ==================== VIEWS ====================

    handleViewChange(view) {
        this.setActiveView(view);
        
        // Notificar o gerenciador de usuários se existir
        if (window.usuariosManager) {
            window.usuariosManager.render();
        }
    }

    setActiveView(view) {
        this.state.currentView = view;
        localStorage.setItem('currentView', view);
        
        // Atualizar botões ativos
        this.elements.viewButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        // Mostrar/ocultar views
        const tableView = document.getElementById('tableView');
        const cardsView = document.getElementById('cardsView');
        
        if (tableView) tableView.style.display = view === 'table' ? 'block' : 'none';
        if (cardsView) cardsView.style.display = view === 'cards' ? 'block' : 'none';
    }

    // ==================== RESPONSIVIDADE ====================

    handleResize() {
        if (window.innerWidth > 1024 && this.elements.sidebar) {
            this.elements.sidebar.classList.remove('show');
        }
    }

    // ==================== UTILITÁRIOS ====================

    updateLastAccess() {
        if (this.elements.lastAccess) {
            const now = new Date();
            const formatted = now.toLocaleDateString('pt-BR') + ' ' + 
                            now.toLocaleTimeString('pt-BR', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                            });
            this.elements.lastAccess.textContent = formatted;
        }
    }

    showLoading() {
        const tableBody = document.getElementById('usersTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="loading-state">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Carregando usuários...</p>
                    </td>
                </tr>
            `;
        }
    }

    hideLoading() {
        // O conteúdo será preenchido pelo usuariosManager
    }

    showMessage(message, type = 'info') {
        // Criar notificação simples
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getMessageIcon(type)}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Estilos básicos para a notificação
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#f44336' : type === 'success' ? '#4CAF50' : '#2196F3'};
            color: white;
            padding: 16px;
            border-radius: 4px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 10px;
            max-width: 300px;
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remover após 5 segundos
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    getMessageIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
}

// ==================== INICIALIZAÇÃO ====================

let uiManager;

document.addEventListener('DOMContentLoaded', () => {
    uiManager = new UIManager();
    
    // Expor globalmente para outros scripts
    window.uiManager = uiManager;
});





// auth-unico.js - ÚNICO sistema de autenticação
class AuthUnico {
    constructor() {
        console.log('🎯 AuthUnico - Iniciando (SEM REDIRECIONAMENTOS AUTOMÁTICOS)');
        this.token = localStorage.getItem('token');
        this.userData = this.getUserData();
        this.updateUI();
    }

    getUserData() {
        try {
            const user = localStorage.getItem('user');
            return user ? JSON.parse(user) : null;
        } catch (e) {
            console.error('❌ Erro ao ler user:', e);
            return null;
        }
    }

    updateUI() {
        // Apenas atualiza a UI, NÃO REDIRECIONA
        const headerUserName = document.getElementById('headerUserName');
        if (headerUserName && this.userData) {
            headerUserName.textContent = this.userData.nome || this.userData.email;
        }
    }

    // Método para verificar se está logado (sem redirecionar)
    isLoggedIn() {
        return !!(this.token && this.userData);
    }

    // Método para logout manual
    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '../../login/login.html';
    }
}

// Inicialização SIMPLES - sem redirecionamentos
window.authUnico = new AuthUnico();

console.log('✅ AuthUnico carregado - Status:', window.authUnico.isLoggedIn() ? 'LOGADO' : 'NÃO LOGADO');








// Global pra mostrar se o usuário esta ativo ou inativo/
// status-checker.js - VERSÃO SIMPLIFICADA E FUNCIONAL
class StatusChecker {
    constructor() {
        console.log('🔒 StatusChecker - Iniciando');
        this.auth = window.authUnico;
        this.checkInterval = null;
        this.init();
    }

    init() {
        if (!this.auth) {
            console.warn('⚠️ AuthUnico não encontrado');
            return;
        }

        // Só monitora se estiver logado
        if (this.auth.isLoggedIn()) {
            console.log('👤 Usuário logado, iniciando monitoramento');
            this.startMonitoring();
        }
    }

    startMonitoring() {
        // Verificação imediata
        setTimeout(() => this.checkUserStatus(), 2000);
        
        // Verifica a cada 30 segundos
        this.checkInterval = setInterval(() => {
            this.checkUserStatus();
        }, 30000);
    }

    async checkUserStatus() {
        const user = this.auth.userData;
        if (!user || !user.email) {
            console.log('📧 Nenhum email de usuário encontrado');
            return;
        }

        try {
            console.log(`🔍 Verificando status do usuário: ${user.email}`);
            
            // Busca todos os usuários
            const response = await fetch('https://api-nexoerp.vercel.app/api/usuarios');
            
            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.success || !Array.isArray(data.data)) {
                throw new Error('Resposta da API inválida');
            }

            // Encontra o usuário pelo email
            const usuarioBackend = data.data.find(u => u.email === user.email);
            
            if (!usuarioBackend) {
                console.warn('⚠️ Usuário não encontrado no backend');
                return;
            }

            console.log(`✅ Usuário encontrado: ${usuarioBackend.nome} (Status: ${usuarioBackend.status})`);

            // Atualiza dados locais
            this.updateUserData(usuarioBackend);

            // Verifica se está inativo
            if (usuarioBackend.status === 'Inativo') {
                this.blockAccess();
            }

        } catch (error) {
            console.error('❌ Erro ao verificar status:', error);
        }
    }

    updateUserData(usuarioBackend) {
        try {
            // Atualiza AuthUnico
            this.auth.userData = { ...this.auth.userData, ...usuarioBackend };
            
            // Atualiza localStorage
            localStorage.setItem('user', JSON.stringify(usuarioBackend));
            
            console.log('📝 Dados atualizados com ID:', usuarioBackend.id);
        } catch (error) {
            console.error('Erro ao atualizar dados:', error);
        }
    }

    blockAccess() {
        console.log('🚫 BLOQUEANDO ACESSO - USUÁRIO INATIVO');
        
        this.stopMonitoring();
        this.showBlockModal();
        this.disablePage();
    }

    stopMonitoring() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    showBlockModal() {
        const user = this.auth.userData;
        
        const modalHTML = `
            <div id="blockModal" style="
                position: fixed;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background: rgba(0,0,0,0.95);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                color: white;
                font-family: Arial, sans-serif;
            ">
                <div style="
                    background: #dc3545;
                    padding: 30px;
                    border-radius: 10px;
                    text-align: center;
                    max-width: 400px;
                    margin: 20px;
                ">
                    <div style="font-size: 48px; margin-bottom: 20px;">🚫</div>
                    <h2 style="margin: 0 0 15px 0;">ACESSO BLOQUEADO</h2>
                    <p style="margin: 0 0 15px 0;">
                        <strong>${user?.nome || 'Usuário'}</strong><br>
                        Seu usuário está INATIVO no sistema.
                    </p>
                    <p style="margin: 0 0 20px 0; font-size: 14px;">
                        Entre em contato com o administrador.<br>
                        Redirecionando em <span id="countdown">5</span> segundos...
                    </p>
                    <button onclick="window.statusChecker.logoutNow()" style="
                        background: white;
                        color: #dc3545;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 5px;
                        cursor: pointer;
                        font-weight: bold;
                    ">
                        Sair Agora
                    </button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.startCountdown();
    }

    startCountdown() {
        let seconds = 5;
        const countdown = setInterval(() => {
            seconds--;
            const element = document.getElementById('countdown');
            if (element) element.textContent = seconds;
            
            if (seconds <= 0) {
                clearInterval(countdown);
                this.logoutNow();
            }
        }, 1000);
    }

    disablePage() {
        // Overlay bloqueador
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: transparent;
            z-index: 9999;
            cursor: not-allowed;
        `;
        overlay.id = 'blockOverlay';

        // Previne qualquer interação
        const block = (e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
        };

        overlay.addEventListener('click', block);
        overlay.addEventListener('mousedown', block);
        overlay.addEventListener('keydown', block);

        document.body.appendChild(overlay);
    }

    logoutNow() {
        console.log('🚪 Fazendo logout...');
        this.stopMonitoring();
        
        if (this.auth && this.auth.logout) {
            this.auth.logout();
        } else {
            window.location.href = '../../login/login.html';
        }
    }
}

// Inicialização automática
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏁 DOM carregado - Verificando AuthUnico');
    
    // Aguarda o AuthUnico carregar
    const waitForAuth = setInterval(() => {
        if (window.authUnico) {
            clearInterval(waitForAuth);
            
            // Só inicia se estiver logado
            if (window.authUnico.isLoggedIn()) {
                console.log('✅ Iniciando StatusChecker para usuário logado');
                window.statusChecker = new StatusChecker();
            } else {
                console.log('👤 Usuário não logado - StatusChecker não iniciado');
            }
        }
    }, 100);
});

console.log('✅ StatusChecker carregado - Aguardando inicialização');