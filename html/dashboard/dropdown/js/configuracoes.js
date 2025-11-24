// configuracoes.js
class SettingsManager {
    constructor() {
        this.init();
    }

    init() {
        // Verificar autenticação
        if (!this.checkAuth()) {
            return;
        }
        
        this.loadCurrentSettings();
        this.setupEventListeners();
    }

    checkAuth() {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login.html';
            return false;
        }
        return true;
    }

    loadCurrentSettings() {
        const config = window.globalConfig.getConfig();
        
        // Preenche os campos com as configurações atuais
        document.getElementById('autoDarkMode').checked = config.autoDarkMode;
        document.getElementById('idioma').value = config.language;
    }

    setupEventListeners() {
        // Formulário de alteração de senha
        document.getElementById('passwordForm').addEventListener('submit', (e) => this.changePassword(e));

        // Botão salvar preferências
        document.getElementById('savePreferencesBtn').addEventListener('click', () => this.savePreferences());

        // Escutar mudanças de configuração global
        window.addEventListener('configChanged', (event) => {
            this.loadCurrentSettings();
        });
    }

    async changePassword(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);

        // Validações
        if (!data.senhaAtual || !data.novaSenha || !data.confirmarSenha) {
            this.showMessage('Por favor, preencha todos os campos', 'error');
            return;
        }

        if (data.novaSenha !== data.confirmarSenha) {
            this.showMessage('As senhas não coincidem', 'error');
            return;
        }

        if (data.novaSenha.length < 8) {
            this.showMessage('A nova senha deve ter pelo menos 8 caracteres', 'error');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const user = JSON.parse(localStorage.getItem('user'));

            const response = await fetch(`http://localhost:3000/api/usuarios/${user.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    senha: data.novaSenha
                    // Nota: Para validação da senha atual, você precisaria modificar o backend
                })
            });

            if (response.status === 401) {
                this.logout();
                return;
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao alterar senha');
            }

            this.showMessage('Senha alterada com sucesso!', 'success');
            e.target.reset();
        } catch (error) {
            this.showMessage(error.message || 'Erro ao alterar senha', 'error');
        }
    }

    savePreferences() {
        const autoDarkMode = document.getElementById('autoDarkMode').checked;
        const language = document.getElementById('idioma').value;

        // Atualiza configurações globais
        window.globalConfig.updateConfig({
            autoDarkMode,
            language
        });

        this.showMessage('Preferências salvas com sucesso!', 'success');
    }

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login.html';
    }

    showMessage(text, type) {
        // Remove mensagens existentes
        const existingMessages = document.querySelectorAll('.message');
        existingMessages.forEach(msg => msg.remove());

        const message = document.createElement('div');
        message.className = `message ${type}`;
        message.textContent = text;

        const pageHeader = document.querySelector('.page-header');
        pageHeader.parentNode.insertBefore(message, pageHeader.nextSibling);

        setTimeout(() => {
            message.remove();
        }, 5000);
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    new SettingsManager();
});