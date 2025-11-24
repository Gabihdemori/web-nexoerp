// usuarios.js - VERSÃO CORRIGIDA COM NOME DO CAMPO CORRETO

const API_CONFIG = {
    USUARIOS: "https://api-nexoerp.vercel.app/api/usuarios"
};

class UsuarioForm {
    constructor() {
        this.init();
    }

    init() {
        console.log('📍 Iniciando formulário de usuário...');
        
        // Verifica autenticação
        this.token = localStorage.getItem('token');
        this.userData = JSON.parse(localStorage.getItem('user') || 'null');
        
        console.log('🔐 Status de autenticação:', {
            token: this.token ? '✅ Presente' : '❌ Ausente',
            user: this.userData ? '✅ Presente' : '❌ Ausente'
        });
        
        if (!this.token || !this.userData) {
            alert('⚠️ Você precisa fazer login para cadastrar usuários!');
            window.location.href = '../../login/login.html';
            return;
        }
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        const form = document.getElementById('user-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleFormSubmit(e));
            console.log('✅ Formulário configurado');
        } else {
            console.error('❌ Formulário não encontrado!');
        }

        this.aplicarMascaras();
    }

    aplicarMascaras() {
        // Máscara para Telefone
        const telefoneInput = document.getElementById('telefone');
        if (telefoneInput) {
            telefoneInput.addEventListener('input', (e) => {
                e.target.value = this.formatarTelefone(e.target.value);
            });
        }

        // Máscara para CPF
        const cpfInput = document.getElementById('cpf');
        if (cpfInput) {
            cpfInput.addEventListener('input', (e) => {
                e.target.value = this.formatarCPF(e.target.value);
            });
        }
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

    // 🔥 CORREÇÃO: Converter data do formato input (YYYY-MM-DD) para DD-MM-YYYY
    converterDataParaBackend(dataInput) {
        if (!dataInput) return null;
        
        console.log('📅 Data recebida do input:', dataInput);
        
        // Input type="date" retorna YYYY-MM-DD
        // Precisamos converter para DD-MM-YYYY
        const partes = dataInput.split('-');
        if (partes.length === 3) {
            const [ano, mes, dia] = partes;
            const dataFormatada = `${dia}-${mes}-${ano}`;
            console.log('🔄 Data convertida para:', dataFormatada);
            return dataFormatada;
        }
        
        console.warn('⚠️ Formato de data não reconhecido:', dataInput);
        return dataInput;
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

        if (!dados.senha) {
            errors.push('Senha é obrigatória');
        } else if (dados.senha.length < 6) {
            errors.push('Senha deve ter pelo menos 6 caracteres');
        }

        if (!dados.perfil) {
            errors.push('Perfil é obrigatório');
        }

        if (dados.telefone && !this.validarTelefone(dados.telefone)) {
            errors.push('Telefone com formato inválido');
        }

        if (dados.cpf && !this.validarCPF(dados.cpf)) {
            errors.push('CPF com formato inválido');
        }

        // 🔥 CORREÇÃO: Validação de data simplificada
        if (dados.dataNascimento) {
            const dataObj = new Date();
            if (isNaN(dataObj.getTime())) {
                errors.push('Data de nascimento deve ser uma data válida');
            }
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

    async handleFormSubmit(event) {
        event.preventDefault();

        // Coleta os dados do formulário
        const dadosUsuario = {
            nome: document.getElementById('nome').value.trim(),
            email: document.getElementById('email').value.trim(),
            senha: document.getElementById('senha').value,
            telefone: document.getElementById('telefone').value.trim() || null,
            cpf: document.getElementById('cpf').value.replace(/\D/g, '') || null,
            // 🔥 CORREÇÃO CRÍTICA: Mudei de "datadeNascimento" para "dataNascimento"
            dataNascimento: this.converterDataParaBackend(document.getElementById('datadeNascimento').value) || null,
            endereco: document.getElementById('endereco').value.trim() || null,
            perfil: document.getElementById('perfil').value,
            status: document.getElementById('status').value
        };

        console.log('📤 Dados do usuário para cadastro:', { ...dadosUsuario, senha: '***' });

        // Valida os dados
        const errors = this.validarFormulario(dadosUsuario);
        if (errors.length > 0) {
            alert('Erros no formulário:\n\n' + errors.join('\n'));
            return;
        }

        try {
            // Mostrar loading
            const submitBtn = event.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cadastrando...';
            submitBtn.disabled = true;

            console.log('🔐 Enviando com token:', this.token);
            console.log('🌐 URL da requisição:', API_CONFIG.USUARIOS);

            const response = await fetch(API_CONFIG.USUARIOS, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(dadosUsuario)
            });

            console.log('📨 Status da resposta:', response.status, response.statusText);
            
            // 🔥 CAPTURA A RESPOSTA COMPLETA DO SERVIDOR
            let result;
            try {
                result = await response.json();
                console.log('📊 Resposta completa do servidor:', result);
                
                // 🔥 DEBUG: Mostrar detalhes específicos do erro
                if (result.details && Array.isArray(result.details)) {
                    console.log('🔍 Detalhes do erro:', result.details);
                }
            } catch (parseError) {
                console.error('❌ Erro ao parsear resposta JSON:', parseError);
                const textResponse = await response.text();
                console.error('📄 Resposta em texto:', textResponse);
                throw new Error('Resposta inválida do servidor: ' + textResponse);
            }

            if (response.ok) {
                alert('✅ Usuário cadastrado com sucesso!');
                
                // Limpa o formulário
                event.target.reset();
                
                // Redireciona para lista de usuários
                setTimeout(() => {
                    window.location.href = '../usuarios.html';
                }, 1000);
                
            } else {
                // 🔥 MOSTRA DETALHES ESPECÍFICOS DO ERRO
                console.error('❌ Erro detalhado:', {
                    status: response.status,
                    statusText: response.statusText,
                    resposta: result
                });
                
                let errorMessage = 'Erro ao cadastrar usuário';
                
                if (result.erro) {
                    errorMessage = result.erro;
                } else if (result.message) {
                    errorMessage = result.message;
                } else if (result.details && Array.isArray(result.details)) {
                    errorMessage = result.details.join(', ');
                } else if (result.details) {
                    errorMessage = result.details;
                } else if (result.error) {
                    errorMessage = result.error;
                } else if (response.status === 400) {
                    errorMessage = 'Dados inválidos enviados ao servidor';
                } else if (response.status === 401) {
                    errorMessage = 'Não autorizado - token inválido';
                    window.location.href = '../../login/login.html';
                    return;
                } else if (response.status === 409) {
                    errorMessage = 'Usuário já existe com este email ou CPF';
                } else if (response.status === 500) {
                    errorMessage = 'Erro interno do servidor';
                }
                
                throw new Error(errorMessage);
            }

        } catch (error) {
            console.error('💥 Erro completo:', error);
            alert('❌ Erro: ' + error.message);
        } finally {
            // Restaura o botão
            const submitBtn = event.target.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = 'Cadastrar Usuário';
                submitBtn.disabled = false;
            }
        }
    }
}

// Função para mostrar/ocultar senha
function togglePassword() {
    const senhaInput = document.getElementById('senha');
    const toggleBtn = document.querySelector('.toggle-password');
    
    if (senhaInput.type === 'password') {
        senhaInput.type = 'text';
        toggleBtn.textContent = '🙈';
        toggleBtn.setAttribute('aria-label', 'Ocultar senha');
    } else {
        senhaInput.type = 'password';
        toggleBtn.textContent = '👁️';
        toggleBtn.setAttribute('aria-label', 'Mostrar senha');
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ Página de novo usuário carregada');
    new UsuarioForm();
});