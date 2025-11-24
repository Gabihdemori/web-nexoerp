document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 DOM Carregado - Iniciando script de login');
    
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) {
        console.error('❌ FORMULÁRIO NÃO ENCONTRADO');
        return;
    }

    const elements = {
        passwordToggle: document.getElementById('passwordToggle'),
        username: document.getElementById('username'),
        password: document.getElementById('password'),
        errorMsg: document.getElementById('errorMsg'),
        loginButton: document.getElementById('loginButton')
    };

    // Criar elemento de erro se não existir
    if (!elements.errorMsg) {
        elements.errorMsg = document.createElement('div');
        elements.errorMsg.id = 'errorMsg';
        elements.errorMsg.style.cssText = 'color: red; margin-top: 10px; padding: 10px; background: #ffe6e6; border-radius: 5px; display: none;';
        loginForm.appendChild(elements.errorMsg);
        console.log('🛠️ Elemento errorMsg criado dinamicamente');
    }

    // Mostrar / ocultar senha
    if (elements.passwordToggle) {
        elements.passwordToggle.addEventListener('click', () => {
            const isPassword = elements.password.type === 'password';
            elements.password.type = isPassword ? 'text' : 'password';
            elements.passwordToggle.querySelector('i').className =
                isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
        });
    }

    // Submit do formulário
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const usernameValue = elements.username.value.trim();
        const passwordValue = elements.password.value.trim();

        if (!usernameValue || !passwordValue) {
            showError('Por favor, preencha todos os campos');
            return;
        }

        setLoadingState(true);

        try {
            const response = await fetch("https://api-nexoerp.vercel.app/login", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({
                    email: usernameValue,
                    senha: passwordValue
                })
            });

            const data = await response.json();
            console.log('📊 RESPOSTA COMPLETA:', data);

            // 🔥 CORREÇÃO CRÍTICA: Condição de sucesso corrigida
            const isSuccess = response.ok && (data.success === true || data.token);
            
            console.log('✅ Status do login:', {
                responseOk: response.ok,
                dataSuccess: data.success,
                dataToken: !!data.token,
                isSuccess: isSuccess
            });

            if (isSuccess) {
                console.log('🎉 Login bem-sucedido');
                showSuccess();

                // 🔥 SALVA OS DADOS MESMO SEM TOKEN (CRIA UM TEMPORÁRIO)
                saveUserData(data, usernameValue);

                setTimeout(() => {
                    window.location.href = "../dashboard/index.html";
                }, 800);

            } else {
                console.warn('❌ Login falhou');
                const errorMessage = data.message || data.error || data.erro || "Email ou senha incorretos";
                showError(errorMessage);
            }

        } catch (error) {
            console.error('💥 Erro:', error);
            showError("Erro de conexão. Tente novamente.");
        } finally {
            setLoadingState(false);
        }
    });

    // =========================
    // FUNÇÕES AUXILIARES
    // =========================

    function showError(message) {
        console.log('❌ Exibindo erro:', message);
        if (elements.errorMsg) {
            elements.errorMsg.textContent = message;
            elements.errorMsg.style.display = "block";
        }
    }

    function showSuccess() {
        console.log('✅ Exibindo sucesso');
        if (elements.loginButton) {
            elements.loginButton.innerHTML = '<i class="fas fa-check"></i><span>Login realizado!</span>';
            elements.loginButton.style.backgroundColor = "#4CAF50";
        }
    }

    function setLoadingState(loading) {
        console.log('🔄 Alterando estado de carregamento:', loading);
        if (elements.loginButton) {
            if (loading) {
                elements.loginButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Entrando...</span>';
                elements.loginButton.disabled = true;
            } else {
                elements.loginButton.innerHTML = '<span>Entrar</span>';
                elements.loginButton.disabled = false;
                elements.loginButton.style.backgroundColor = "";
            }
        }

        if (!loading && elements.errorMsg) {
            elements.errorMsg.style.display = "none";
        }
    }

    function saveUserData(data, usernameValue) {
        console.log('💾 Salvando dados do login...');
        
        // 🔥 CORREÇÃO: Cria token temporário se não existir
        let token = data.token;
        if (!token) {
            token = 'temp_token_' + Date.now();
            console.log('🛠️ Token temporário criado:', token);
        }

        // 🔥 CORREÇÃO: Cria estrutura de usuário consistente
        let userData = {
            nome: "Usuário",
            email: usernameValue,
            tipo: "operador",
            id: Date.now().toString()
        };

        // Tenta extrair dados reais se existirem
        if (data.usuario) {
            userData = { ...userData, ...data.usuario };
        } else if (data.user) {
            userData = { ...userData, ...data.user };
        } else if (data.data && Array.isArray(data.data) && data.data.length > 0) {
            userData = { ...userData, ...data.data[0] };
        }

        // Salva no localStorage
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(userData));
        localStorage.setItem("lastAccess", new Date().toLocaleString("pt-BR"));

        console.log('✅ Dados salvos no localStorage:');
        console.log('- Token:', token);
        console.log('- User:', userData);
    }

    // Recuperação de senha
    const requestAccess = document.getElementById("requestAccess");
    if (requestAccess) {
        requestAccess.addEventListener("click", (e) => {
            e.preventDefault();
            alert("Entre em contato com o administrador do sistema para redefinir sua senha.");
        });
    }

    console.log('🎯 Script de login carregado');
});