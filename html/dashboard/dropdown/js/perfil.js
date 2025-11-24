// perfil.js - Versão corrigida com verificações de elementos
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

    async loadUserData() {
        try {
            const token = localStorage.getItem('token');
            const user = JSON.parse(localStorage.getItem('user'));
            
            if (!user || !user.id) {
                throw new Error('Dados do usuário não encontrados no localStorage');
            }

            console.log('Carregando dados do usuário ID:', user.id);

            const response = await fetch(`http://localhost:3000/api/usuarios/${user.id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 401) {
                console.warn('Token inválido, fazendo logout...');
                this.logout();
                return;
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Erro HTTP ${response.status}: ${errorText}`);
            }

            this.userData = await response.json();
            console.log('Dados do usuário carregados:', this.userData);
            
            this.populateProfile();
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            this.showMessage('Erro ao carregar dados do perfil: ' + error.message, 'error');
        }
    }

    populateProfile() {
        if (!this.userData) {
            console.error('Nenhum dado de usuário para popular o perfil');
            return;
        }

        console.log('Populando perfil com dados:', this.userData);

        // Função auxiliar para atualizar elementos de forma segura
        const updateElement = (id, value, isHTML = false) => {
            const element = document.getElementById(id);
            if (element) {
                if (isHTML) {
                    element.innerHTML = value;
                } else {
                    element.textContent = value || 'Não informado';
                }
            } else {
                console.warn(`Elemento com ID '${id}' não encontrado no DOM`);
            }
        };

        // Preenche informações básicas
        updateElement('infoNome', this.userData.nome);
        updateElement('infoEmail', this.userData.email);
        updateElement('infoTelefone', this.userData.telefone);
        updateElement('infoCpf', this.formatCPF(this.userData.cpf));
        updateElement('infoPerfil', this.userData.perfil);
        updateElement('infoDataNascimento', this.userData.dataNascimento);

        // Status com badge
        const statusElement = document.getElementById('infoStatus');
        if (statusElement) {
            statusElement.textContent = this.userData.status || 'Inativo';
            statusElement.className = `status-badge ${this.userData.status === 'Ativo' ? 'status-active' : 'status-inactive'}`;
        } else {
            console.warn('Elemento infoStatus não encontrado');
        }

        // Calcula dias trabalhados
        const diasTrabalhados = this.calcularDiasTrabalhados(this.userData.criadoEm);
        updateElement('infoDiasTrabalhados', diasTrabalhados);

        // Atualiza sidebar e header
        updateElement('sidebarUserName', this.userData.nome);
        updateElement('headerUserName', this.userData.nome);
        updateElement('sidebarUserRole', this.userData.perfil);

        // Carrega imagem do usuário
        this.loadUserImage();

        console.log('Perfil populado com sucesso');
    }

    calcularDiasTrabalhados(dataCriacao) {
        if (!dataCriacao) {
            console.warn('Data de criação não fornecida para cálculo de dias trabalhados');
            return '0';
        }
        
        try {
            console.log('Calculando dias trabalhados a partir de:', dataCriacao);
            
            // Tenta converter a data
            let criadoEm;
            if (typeof dataCriacao === 'string') {
                // Se for string no formato brasileiro DD/MM/AAAA
                if (dataCriacao.includes('/')) {
                    const [dia, mes, ano] = dataCriacao.split('/');
                    criadoEm = new Date(ano, mes - 1, dia);
                } else {
                    // Se for string ISO
                    criadoEm = new Date(dataCriacao);
                }
            } else {
                criadoEm = new Date(dataCriacao);
            }

            if (isNaN(criadoEm.getTime())) {
                console.error('Data de criação inválida:', dataCriacao);
                return '0';
            }
            
            const hoje = new Date();
            const diffTime = Math.abs(hoje - criadoEm);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            console.log(`Dias trabalhados calculados: ${diffDays}`);
            return diffDays.toString();
        } catch (error) {
            console.error('Erro ao calcular dias trabalhados:', error);
            return '0';
        }
    }

    formatCPF(cpf) {
        if (!cpf) return '';
        
        try {
            // Remove caracteres não numéricos
            const cleaned = cpf.replace(/\D/g, '');
            
            // Verifica se tem 11 dígitos
            if (cleaned.length !== 11) {
                console.warn('CPF com formato inválido:', cpf);
                return cpf; // Retorna o original se não puder formatar
            }
            
            return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        } catch (error) {
            console.error('Erro ao formatar CPF:', error);
            return cpf;
        }
    }

    loadUserImage() {
        try {
            // Tenta carregar imagem do localStorage primeiro
            const savedImage = localStorage.getItem(`user-avatar-${this.userData.id}`);
            if (savedImage) {
                console.log('Carregando imagem salva do localStorage');
                this.setUserImage(savedImage);
                return;
            }

            // Se não tiver imagem salva, usa o padrão
            const defaultAvatar = 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27%23666%27%3E%3Cpath d=%27M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z%27/%3E%3C/svg%3E';
            this.setUserImage(defaultAvatar);
        } catch (error) {
            console.error('Erro ao carregar imagem do usuário:', error);
        }
    }

    setUserImage(imageUrl) {
        try {
            const avatarElements = [
                document.getElementById('profileAvatar'),
                document.getElementById('sidebarAvatar'), 
                document.getElementById('headerAvatar')
            ].filter(Boolean); // Remove elementos null

            avatarElements.forEach(img => {
                if (img) {
                    img.src = imageUrl;
                    img.onerror = () => {
                        console.warn('Erro ao carregar imagem, usando fallback');
                        img.src = 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27%23666%27%3E%3Cpath d=%27M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z%27/%3E%3C/svg%3E';
                    };
                }
            });

            console.log('Imagens do usuário atualizadas');
        } catch (error) {
            console.error('Erro ao definir imagem do usuário:', error);
        }
    }

    setupEventListeners() {
        console.log('Configurando event listeners...');
        
        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Logout solicitado');
                this.logout();
            });
            console.log('Listener de logout configurado');
        } else {
            console.error('Botão de logout (logoutBtn) não encontrado no DOM');
        }

        // Escutar mudanças de configuração global
        window.addEventListener('configChanged', (event) => {
            console.log('Configuração global alterada:', event.detail);
            this.applyGlobalConfig(event.detail);
        });

        console.log('Event listeners configurados');
    }

    applyGlobalConfig(config) {
        // Reaplicar traduções se o idioma mudar
        if (config.language !== this.currentLanguage) {
            console.log('Idioma alterado para:', config.language);
            this.currentLanguage = config.language;
        }
    }

    logout() {
        console.log('Executando logout...');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '../../login/login.html';
    }

    showMessage(text, type) {
        console.log(`Mostrando mensagem [${type}]:`, text);
        
        try {
            // Remove mensagens existentes
            const existingMessages = document.querySelectorAll('.message');
            existingMessages.forEach(msg => msg.remove());

            const message = document.createElement('div');
            message.className = `message ${type}`;
            message.textContent = text;

            const pageHeader = document.querySelector('.page-header');
            if (pageHeader && pageHeader.parentNode) {
                pageHeader.parentNode.insertBefore(message, pageHeader.nextSibling);
                
                setTimeout(() => {
                    if (message.parentNode) {
                        message.remove();
                    }
                }, 5000);
            } else {
                console.error('Page header não encontrado para mostrar mensagem');
                // Fallback: adicionar no body
                document.body.insertBefore(message, document.body.firstChild);
                setTimeout(() => message.remove(), 5000);
            }
        } catch (error) {
            console.error('Erro ao mostrar mensagem:', error);
        }
    }
}

// Inicialização quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado, inicializando ProfileViewer...');
    new ProfileViewer();
});

// Fallback: se o DOM já estiver carregado
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM carregado (fallback), inicializando ProfileViewer...');
        new ProfileViewer();
    });
} else {
    console.log('DOM já carregado, inicializando ProfileViewer imediatamente...');
    new ProfileViewer();
}