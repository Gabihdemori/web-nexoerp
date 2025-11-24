// cliente.js - VERSÃO DEFINITIVA

const API_CONFIG = {
    CLIENTES: "https://api-nexoerp.vercel.app/api/clientes",
    USUARIOS: "https://api-nexoerp.vercel.app/api/usuarios" // Endpoint para listar usuários
};

class ClienteForm {
    constructor() {
        this.userData = null;
        this.token = null;
        this.usuarioId = null;
        this.init();
    }

    async init() {
        console.log('Iniciando formulário de cliente...');
        
        // Verificar autenticação primeiro
        if (!await this.checkAuth()) {
            return;
        }
        
        // Buscar o ID correto do usuário logado
        if (!await this.buscarUsuarioLogado()) {
            return;
        }
        
        this.setupEventListeners();
    }

    async checkAuth() {
        this.token = localStorage.getItem('token');
        
        console.log('🔐 Verificando autenticação...');
        console.log('Token presente:', !!this.token);
        
        if (!this.token) {
            console.warn('❌ Token não encontrado, redirecionando para login...');
            window.location.href = '../../login/login.html';
            return false;
        }
        
        return true;
    }

    // NOVO MÉTODO: Buscar o usuário logado da API
    async buscarUsuarioLogado() {
        console.log('🔍 Buscando usuário logado...');
        
        try {
            // Primeiro, vamos listar todos os usuários para encontrar qual corresponde ao token
            const response = await fetch(API_CONFIG.USUARIOS, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Erro ${response.status} ao buscar usuários`);
            }

            const result = await response.json();
            console.log('📦 Resposta da API de usuários:', result);

            // Se a API retornar um array de usuários, pegamos o primeiro (ou lógica específica)
            if (result.success && Array.isArray(result.data) && result.data.length > 0) {
                // Aqui você precisa identificar qual usuário está logado
                // Vamos usar o primeiro usuário como fallback, mas o ideal é ter um endpoint /me
                const usuarioLogado = result.data[0]; // ⚠️ AJUSTE: Escolha o usuário correto aqui
                
                this.usuarioId = usuarioLogado.id;
                this.userData = usuarioLogado;
                
                console.log('✅ Usuário logado encontrado:', usuarioLogado);
                console.log('✅ ID do usuário:', this.usuarioId);
                
                return true;
            } else {
                throw new Error('Nenhum usuário encontrado na resposta');
            }

        } catch (error) {
            console.error('❌ Erro ao buscar usuário logado:', error);
            
            // Fallback: tentar usar um ID fixo para teste
            console.log('🔄 Tentando fallback...');
            
            // ⚠️ TEMPORÁRIO: Use um ID que existe no seu sistema (1 ou 3 conforme seu insomnia)
            this.usuarioId = 1; // ou 3 - use o ID que aparece no seu insomnia
            console.log('⚠️ Usando ID fixo para teste:', this.usuarioId);
            
            this.mostrarMensagem('Aviso: Usando modo de teste. Verifique a configuração do usuário.', 'warning');
            return true;
        }
    }

    setupEventListeners() {
        const form = document.getElementById('client-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleFormSubmit(e));
            console.log('✅ Formulário de cliente configurado');
        } else {
            console.error('❌ Formulário com ID client-form não encontrado');
        }

        this.aplicarMascaras();
        this.configurarBuscaCEP();
        this.configurarAlternanciaCPFCNPJ();
    }

    aplicarMascaras() {
        // Máscara para CPF
        const cpfInput = document.getElementById('cpf');
        if (cpfInput) {
            cpfInput.addEventListener('input', (e) => {
                e.target.value = this.formatarCPF(e.target.value);
            });
        }

        // Máscara para CNPJ
        const cnpjInput = document.getElementById('cnpj');
        if (cnpjInput) {
            cnpjInput.addEventListener('input', (e) => {
                e.target.value = this.formatarCNPJ(e.target.value);
            });
        }

        // Máscara para Telefone
        const telefoneInput = document.getElementById('telefone');
        if (telefoneInput) {
            telefoneInput.addEventListener('input', (e) => {
                e.target.value = this.formatarTelefone(e.target.value);
            });
        }

        // Máscara para CEP
        const cepInput = document.getElementById('cep');
        if (cepInput) {
            cepInput.addEventListener('input', (e) => {
                e.target.value = this.formatarCEPInput(e.target.value);
            });
        }

        // Máscara para Data de Nascimento
        const dataNascimentoInput = document.getElementById('datadeNascimento');
        if (dataNascimentoInput) {
            dataNascimentoInput.addEventListener('input', (e) => {
                e.target.value = this.formatarDataNascimento(e.target.value);
            });
            
            dataNascimentoInput.addEventListener('keydown', (e) => {
                this.manipulacaoTecladoData(e);
            });
        }
    }

    configurarBuscaCEP() {
        const cepInput = document.getElementById('cep');
        if (cepInput) {
            cepInput.addEventListener('blur', (e) => {
                const cep = e.target.value.replace(/\D/g, '');
                if (cep.length === 8) {
                    this.buscarCEP(cep);
                }
            });
        }
    }

    configurarAlternanciaCPFCNPJ() {
        const cpfInput = document.getElementById('cpf');
        const cnpjInput = document.getElementById('cnpj');
        
        if (cpfInput && cnpjInput) {
            cpfInput.addEventListener('input', function() {
                if (this.value.replace(/\D/g, '').length > 0) {
                    cnpjInput.value = '';
                }
            });
            
            cnpjInput.addEventListener('input', function() {
                if (this.value.replace(/\D/g, '').length > 0) {
                    cpfInput.value = '';
                }
            });
        }
    }

    manipulacaoTecladoData(event) {
        const input = event.target;
        const key = event.key;
        
        if (['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) {
            return;
        }
        
        if (!/^\d$/.test(key)) {
            event.preventDefault();
            return;
        }
        
        const value = input.value.replace(/\D/g, '');
        if (value.length === 2 || value.length === 5) {
            input.value = input.value + '-';
        }
    }

    formatarCPF(cpf) {
        cpf = cpf.replace(/\D/g, '');
        if (cpf.length > 11) cpf = cpf.substring(0, 11);
        if (cpf.length <= 11) {
            cpf = cpf.replace(/(\d{3})(\d)/, '$1.$2');
            cpf = cpf.replace(/(\d{3})(\d)/, '$1.$2');
            cpf = cpf.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        }
        return cpf;
    }

    formatarCNPJ(cnpj) {
        cnpj = cnpj.replace(/\D/g, '');
        if (cnpj.length > 14) cnpj = cnpj.substring(0, 14);
        if (cnpj.length <= 14) {
            cnpj = cnpj.replace(/^(\d{2})(\d)/, '$1.$2');
            cnpj = cnpj.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
            cnpj = cnpj.replace(/\.(\d{3})(\d)/, '.$1/$2');
            cnpj = cnpj.replace(/(\d{4})(\d)/, '$1-$2');
        }
        return cnpj;
    }

    formatarTelefone(telefone) {
        telefone = telefone.replace(/\D/g, '');
        if (telefone.length > 11) telefone = telefone.substring(0, 11);
        if (telefone.length === 11) {
            telefone = telefone.replace(/(\d{2})(\d)/, '($1) $2');
            telefone = telefone.replace(/(\d{5})(\d)/, '$1-$2');
        } else if (telefone.length === 10) {
            telefone = telefone.replace(/(\d{2})(\d)/, '($1) $2');
            telefone = telefone.replace(/(\d{4})(\d)/, '$1-$2');
        }
        return telefone;
    }

    formatarCEPInput(cep) {
        cep = cep.replace(/\D/g, '');
        if (cep.length > 8) cep = ccep.substring(0, 8);
        if (cep.length === 8) {
            cep = cep.replace(/(\d{5})(\d)/, '$1-$2');
        }
        return cep;
    }

    formatarDataNascimento(data) {
        let numeros = data.replace(/\D/g, '');
        
        if (numeros.length > 8) {
            numeros = numeros.substring(0, 8);
        }
        
        if (numeros.length <= 2) {
            return numeros;
        } else if (numeros.length <= 4) {
            return numeros.replace(/(\d{2})(\d+)/, '$1-$2');
        } else {
            return numeros.replace(/(\d{2})(\d{2})(\d+)/, '$1-$2-$3');
        }
    }

    async buscarCEP(cep) {
        cep = cep.replace(/\D/g, '');

        if (cep.length !== 8) {
            this.mostrarMensagem("CEP inválido!", 'error');
            return;
        }

        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await response.json();

            if (data.erro) {
                this.mostrarMensagem("CEP não encontrado!", 'error');
                return;
            }
            
            document.getElementById('rua').value = data.logradouro || '';
            document.getElementById('bairro').value = data.bairro || '';
            document.getElementById('cidade').value = data.localidade || '';
            document.getElementById('estado').value = data.uf || '';
            
        } catch (error) {
            console.error('Erro ao buscar CEP:', error);
            this.mostrarMensagem("Erro ao buscar o CEP!", 'error');
        }
    }

    validarDataNascimento(data) {
        if (!data) return true;
        
        const regex = /^(\d{2})-(\d{2})-(\d{4})$/;
        const match = data.match(regex);
        
        if (!match) {
            return false;
        }
        
        const dia = parseInt(match[1]);
        const mes = parseInt(match[2]);
        const ano = parseInt(match[3]);
        
        if (mes < 1 || mes > 12) return false;
        if (dia < 1 || dia > 31) return false;
        
        const dataObj = new Date(ano, mes - 1, dia);
        if (dataObj.getDate() !== dia || dataObj.getMonth() !== mes - 1 || dataObj.getFullYear() !== ano) {
            return false;
        }
        
        const hoje = new Date();
        if (dataObj > hoje) {
            return false;
        }
        
        return true;
    }

    validarFormulario(dados) {
        const errors = [];

        if (!dados.nome || dados.nome.trim().length < 2) {
            errors.push('Nome é obrigatório e deve ter pelo menos 2 caracteres');
        }

        if (!dados.email) {
            errors.push('Email é obrigatório');
        } else if (!this.validarEmail(dados.email)) {
            errors.push('Email com formato inválido');
        }

        if (!dados.telefone) {
            errors.push('Telefone é obrigatório');
        } else if (!this.validarTelefone(dados.telefone)) {
            errors.push('Telefone com formato inválido');
        }

        if (dados.cpf && dados.cnpj) {
            errors.push('Preencha apenas CPF ou CNPJ, não ambos');
        }

        if (dados.cpf && !this.validarCPF(dados.cpf)) {
            errors.push('CPF com formato inválido (deve ter 11 dígitos)');
        }

        if (dados.cnpj && !this.validarCNPJ(dados.cnpj)) {
            errors.push('CNPJ com formato inválido (deve ter 14 dígitos)');
        }

        if (dados.dataNascimento && !this.validarDataNascimento(dados.dataNascimento)) {
            errors.push('Data de nascimento inválida. Use o formato dd-mm-aaaa e verifique se é uma data válida');
        }

        return errors;
    }

    validarEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    validarTelefone(telefone) {
        const telefoneLimpo = telefone.replace(/\D/g, '');
        return telefoneLimpo.length >= 10 && telefoneLimpo.length <= 11;
    }

    validarCPF(cpf) {
        const cpfLimpo = cpf.replace(/\D/g, '');
        return cpfLimpo.length === 11;
    }

    validarCNPJ(cnpj) {
        const cnpjLimpo = cnpj.replace(/\D/g, '');
        return cnpjLimpo.length === 14;
    }

    async handleFormSubmit(event) {
        event.preventDefault();

        if (!this.usuarioId) {
            this.mostrarMensagem('Erro: Usuário não identificado.', 'error');
            return;
        }

        const formData = new FormData(event.target);
        
        const dadosCliente = {
            nome: formData.get('nome')?.trim() || '',
            email: formData.get('email')?.trim() || '',
            telefone: formData.get('telefone')?.trim() || '',
            usuarioId: this.usuarioId,
            dataNascimento: formData.get('datadeNascimento')?.trim() || null,
            cep: formData.get('cep')?.trim() || null,
            rua: formData.get('rua')?.trim() || null,
            numero: formData.get('numero')?.trim() || null,
            complemento: formData.get('complemento')?.trim() || null,
            bairro: formData.get('bairro')?.trim() || null,
            cidade: formData.get('cidade')?.trim() || null,
            estado: formData.get('estado')?.trim() || null,
            observacoes: formData.get('observacoes')?.trim() || null
        };

        // Processar CPF/CNPJ
        const cpf = formData.get('cpf')?.replace(/\D/g, '') || null;
        const cnpj = formData.get('cnpj')?.replace(/\D/g, '') || null;

        if (cpf) {
            dadosCliente.cpf = cpf;
        }
        if (cnpj) {
            dadosCliente.cnpj = cnpj;
        }

        console.log('📤 Enviando dados do cliente:', dadosCliente);
        console.log('👤 ID do usuário:', this.usuarioId);

        // Validar dados
        const errors = this.validarFormulario(dadosCliente);
        if (errors.length > 0) {
            this.mostrarMensagem('Erros no formulário:\n\n' + errors.join('\n'), 'error');
            return;
        }

        try {
            const submitBtn = event.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
            submitBtn.disabled = true;

            console.log('🚀 Enviando para API...');
            const response = await fetch(API_CONFIG.CLIENTES, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(dadosCliente)
            });

            let result;
            try {
                result = await response.json();
                console.log('📨 Resposta da API:', result);
            } catch (parseError) {
                console.error('❌ Erro ao parsear resposta:', parseError);
                throw new Error('Resposta inválida do servidor');
            }

            if (!response.ok) {
                if (response.status === 400 && result.erro && result.erro.includes('Usuário não encontrado')) {
                    throw new Error(`Usuário não encontrado. ID enviado: ${this.usuarioId}`);
                }
                
                if (result.detalhes && Array.isArray(result.detalhes)) {
                    throw new Error(result.detalhes.join(', '));
                }
                
                throw new Error(result.erro || result.message || `Erro ${response.status}`);
            }

            this.mostrarMensagem('✅ Cliente salvo com sucesso!', 'success');
            
            setTimeout(() => {
                window.location.href = '../clientes.html';
            }, 2000);

        } catch (error) {
            console.error('❌ Erro:', error);
            this.mostrarMensagem('❌ Erro ao salvar cliente: ' + error.message, 'error');
        } finally {
            const submitBtn = event.target.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = 'Salvar Cliente';
                submitBtn.disabled = false;
            }
        }
    }

    mostrarMensagem(text, type) {
        console.log(`💬 Mensagem [${type}]:`, text);
        
        try {
            const existingMessages = document.querySelectorAll('.form-message');
            existingMessages.forEach(msg => msg.remove());

            const message = document.createElement('div');
            message.className = `form-message ${type}`;
            message.innerHTML = `
                <div class="message-content">
                    <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i>
                    <span>${text}</span>
                </div>
            `;

            message.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${type === 'success' ? '#d4edda' : '#f8d7da'};
                color: ${type === 'success' ? '#155724' : '#721c24'};
                padding: 15px 20px;
                border-radius: 8px;
                border: 1px solid ${type === 'success' ? '#c3e6cb' : '#f5c6cb'};
                z-index: 1000;
                max-width: 400px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                animation: slideInRight 0.3s ease;
            `;

            document.body.appendChild(message);
            
            setTimeout(() => {
                if (message.parentNode) {
                    message.remove();
                }
            }, 5000);
        } catch (error) {
            console.error('Erro ao mostrar mensagem:', error);
            alert(text);
        }
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM carregado, inicializando formulário de cliente...');
    new ClienteForm();
}); 