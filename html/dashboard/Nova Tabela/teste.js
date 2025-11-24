// scripts/formUsuarios.js

// Toggle de senha funcionando
function togglePassword() {
    const senhaInput = document.getElementById('senha');
    const toggleBtn = document.querySelector('.toggle-password');
    
    if (!senhaInput || !toggleBtn) {
        console.error('Elementos de senha não encontrados!');
        return;
    }
    
    if (senhaInput.type === 'password') {
        senhaInput.type = 'text';
        toggleBtn.textContent = '🔒';
        toggleBtn.setAttribute('aria-label', 'Ocultar senha');
        toggleBtn.style.background = 'var(--primary)';
        toggleBtn.style.borderColor = 'var(--primary)';
        toggleBtn.style.color = 'white';
    } else {
        senhaInput.type = 'password';
        toggleBtn.textContent = '👁️';
        toggleBtn.setAttribute('aria-label', 'Mostrar senha');
        toggleBtn.style.background = '';
        toggleBtn.style.borderColor = '';
        toggleBtn.style.color = '';
    }
}

// Máscaras automáticas
function aplicarMascaras() {
    // Máscara de telefone
    const telefoneInput = document.getElementById('telefone');
    if (telefoneInput) {
        telefoneInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length <= 11) {
                if (value.length <= 10) {
                    value = value.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
                } else {
                    value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
                }
            }
            e.target.value = value;
        });
    }

    // Máscara de CPF
    const cpfInput = document.getElementById('cpf');
    if (cpfInput) {
        cpfInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length <= 11) {
                value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
            }
            e.target.value = value;
        });
    }
}

// Validação do formulário
function setupValidacao() {
    const form = document.getElementById('user-form');
    if (!form) {
        console.error('Formulário não encontrado!');
        return;
    }
    
    const inputs = form.querySelectorAll('input[required], select[required]');
    
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            validarCampo(this);
        });
        
        input.addEventListener('input', function() {
            // Reset da borda quando o usuário começa a digitar
            this.style.borderColor = '';
            this.style.background = '';
        });
    });
}

function validarCampo(campo) {
    if (!campo.value.trim()) {
        campo.style.borderColor = 'var(--error)';
        campo.style.background = 'rgba(239, 68, 68, 0.05)';
        return false;
    }
    
    if (campo.type === 'email' && !validarEmail(campo.value)) {
        campo.style.borderColor = 'var(--error)';
        campo.style.background = 'rgba(239, 68, 68, 0.05)';
        return false;
    }
    
    campo.style.borderColor = 'var(--success)';
    campo.style.background = 'rgba(16, 185, 129, 0.05)';
    return true;
}

function validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

// Submit do formulário
function setupFormSubmit() {
    const form = document.getElementById('user-form');
    if (!form) return;
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!validarFormulario()) {
            mostrarMensagem('Por favor, preencha todos os campos obrigatórios corretamente.', 'error');
            return;
        }
        
        await enviarFormulario();
    });
}

function validarFormulario() {
    const form = document.getElementById('user-form');
    const inputs = form.querySelectorAll('input[required], select[required]');
    let valido = true;
    
    inputs.forEach(input => {
        if (!validarCampo(input)) {
            valido = false;
        }
    });
    
    return valido;
}

async function enviarFormulario() {
    const form = document.getElementById('user-form');
    const submitBtn = form.querySelector('button[type="submit"]');
    
    // Coletar dados do formulário
    const formData = {
        nome: document.getElementById('nome').value,
        email: document.getElementById('email').value,
        senha: document.getElementById('senha').value,
        telefone: document.getElementById('telefone').value.replace(/\D/g, ''),
        cpf: document.getElementById('cpf').value.replace(/\D/g, ''),
        dataNascimento: document.getElementById('dataNascimento').value,
        endereco: document.getElementById('endereco').value,
        perfil: document.getElementById('perfil').value,
        status: document.getElementById('status').value
    };
    
    // Mostrar loading no botão
    const originalText = submitBtn.textContent;
    submitBtn.innerHTML = '<div class="loading-spinner"></div> Cadastrando...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch('https://api-nexoerp.vercel.app/api/usuarios', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            mostrarMensagem('✅ Usuário cadastrado com sucesso!', 'success');
            form.reset();
            // Reset dos estilos dos campos
            const inputs = form.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                input.style.borderColor = '';
                input.style.background = '';
            });
        } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao cadastrar usuário');
        }
    } catch (error) {
        console.error('Erro:', error);
        mostrarMensagem(`❌ ${error.message}`, 'error');
    } finally {
        // Restaurar botão
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

function mostrarMensagem(mensagem, tipo) {
    const elementId = tipo === 'success' ? 'successMsg' : 'errorMsg';
    const element = document.getElementById(elementId);
    
    if (!element) {
        console.error('Elemento de mensagem não encontrado:', elementId);
        return;
    }
    
    element.textContent = mensagem;
    element.style.display = 'flex';
    
    // Auto-esconder após 5 segundos
    setTimeout(() => {
        element.style.display = 'none';
    }, 5000);
}

// Inicialização quando o DOM carregar
document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando formulário de usuários...');
    aplicarMascaras();
    setupValidacao();
    setupFormSubmit();
});