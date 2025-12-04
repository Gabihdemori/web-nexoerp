
class VendasManager {
    constructor() {
        this.token = localStorage.getItem('token');
        this.userData = JSON.parse(localStorage.getItem('user') || 'null');
        this.produtos = [];
        this.clientes = [];
        this.itemCounter = 0;
        this.init();
    }

    async init() {
        try {
            await this.carregarDadosIniciais();
            this.configurarEventListeners();
            this.atualizarDataAtual();
            this.adicionarEstilos();
            this.configurarObservacoesStatus(); // Novo: configura observações baseadas no status
        } catch (error) {
            console.error('Erro na inicialização:', error);
        }
    }

    async carregarDadosIniciais() {
        try {
            await Promise.all([
                this.carregarClientes(),
                this.carregarProdutosEServicos()
            ]);
            this.adicionarItem();
        } catch (error) {
            console.error('Erro ao carregar dados iniciais:', error);
        }
    }

    async carregarClientes() {
        try {
            const response = await fetch('https://api-nexoerp.vercel.app/api/clientes');
            const data = await response.json();
            
            console.log('📋 Resposta da API de clientes:', data);
            
            if (Array.isArray(data)) {
                this.clientes = data;
            } else if (data.clientes && Array.isArray(data.clientes)) {
                this.clientes = data.clientes;
            } else if (data.data && Array.isArray(data.data)) {
                this.clientes = data.data;
            }
            
            this.popularSelectClientes();
        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
        }
    }

    async carregarProdutosEServicos() {
        try {
            const response = await fetch('https://api-nexoerp.vercel.app/api/produtos');
            const data = await response.json();
            
            console.log('📦 Resposta da API de produtos:', data);
            
            let itensData = [];
            if (Array.isArray(data)) {
                itensData = data;
            } else if (data.produtos && Array.isArray(data.produtos)) {
                itensData = data.produtos;
            } else if (data.data && Array.isArray(data.data)) {
                itensData = data.data;
            }
            
            this.produtos = itensData.filter(item => {
                const status = item.status || 'Ativo';
                return status === 'Ativo' || status === 'active';
            });
            
            console.log('✅ Itens carregados (produtos e serviços):', this.produtos.length);
            
            const produtos = this.produtos.filter(item => item.tipo === 'Produto');
            const servicos = this.produtos.filter(item => item.tipo === 'Servico');
            console.log(`📊 Produtos: ${produtos.length}, Serviços: ${servicos.length}`);
            
        } catch (error) {
            console.error('Erro ao carregar produtos e serviços:', error);
        }
    }

    popularSelectClientes() {
        const select = document.getElementById('cliente');
        if (!select) return;
        
        select.innerHTML = '<option value="">Selecione um cliente</option>';
        
        this.clientes.forEach(cliente => {
            const option = document.createElement('option');
            option.value = cliente.id;
            option.textContent = `${cliente.nome || 'Cliente'}${cliente.email ? ' - ' + cliente.email : ''}`;
            select.appendChild(option);
        });
    }

    // Novo método para configurar observações baseadas no status
    configurarObservacoesStatus() {
        const statusSelect = document.getElementById('status');
        const observacoesTextarea = document.getElementById('observacoes');
        
        if (!statusSelect || !observacoesTextarea) return;
        
        statusSelect.addEventListener('change', (e) => {
            const status = e.target.value;
            
            // Limpar placeholder baseado no status
            switch(status) {
                case 'Pendente':
                    observacoesTextarea.placeholder = 'Observações sobre a venda pendente...';
                    this.mostrarNotificacao('Venda será registrada como Pendente. O estoque não será alterado.', 'info');
                    break;
                case 'Concluida':
                    observacoesTextarea.placeholder = 'Observações sobre a venda concluída...';
                    this.mostrarNotificacao('Venda será registrada como Concluída. O estoque será atualizado para produtos.', 'success');
                    break;
                case 'Cancelada':
                    observacoesTextarea.placeholder = 'Motivo do cancelamento da venda...';
                    this.mostrarNotificacao('Venda será registrada como Cancelada. O estoque não será alterado.', 'warning');
                    break;
            }
        });
    }

    getItemHTML() {
        this.itemCounter++;
        
        const produtos = this.produtos.filter(item => item.tipo === 'Produto');
        const servicos = this.produtos.filter(item => item.tipo === 'Servico');
        
        let produtoOptions = '';
        if (produtos.length > 0) {
            produtoOptions = produtos.map(produto => 
                `<option value="${produto.id}" 
                        data-tipo="${produto.tipo || 'Produto'}"
                        data-preco="${produto.preco || 0}" 
                        data-estoque="${produto.estoque !== null && produto.estoque !== undefined ? produto.estoque : 'null'}"
                        data-nome="${produto.nome || 'Produto'}">
                    🏷️ ${produto.nome || 'Produto'} - R$ ${(produto.preco || 0).toFixed(2)} ${produto.estoque !== null ? `(Estoque: ${produto.estoque})` : ''}
                </option>`
            ).join('');
        } else {
            produtoOptions = '<option value="" disabled>Nenhum produto disponível</option>';
        }
        
        let servicoOptions = '';
        if (servicos.length > 0) {
            servicoOptions = servicos.map(servico => 
                `<option value="${servico.id}" 
                        data-tipo="${servico.tipo || 'Servico'}"
                        data-preco="${servico.preco || 0}" 
                        data-estoque="null"
                        data-nome="${servico.nome || 'Serviço'}">
                    🔧 ${servico.nome || 'Serviço'} - R$ ${(servico.preco || 0).toFixed(2)}
                </option>`
            ).join('');
        } else {
            servicoOptions = '<option value="" disabled>Nenhum serviço disponível</option>';
        }
        
        return `
            <select class="item-select" name="itemId" required>
                <option value="">Selecione um item</option>
                ${produtoOptions}
                ${servicoOptions}
            </select>
            <input type="number" class="quantidade" name="quantidade" min="1" value="1" required>
            <input type="number" class="preco-unit" name="precoUnit" step="0.01" min="0" value="0" required readonly>
            <span class="estoque-disponivel">-</span>
            <span class="item-total">R$ 0,00</span>
            <button type="button" class="btn-remover" data-action="remover">
                <i class="fas fa-trash"></i>
            </button>
        `;
    }

    adicionarItem() {
        const container = document.getElementById('sale-items');
        if (!container) return;

        const itemDiv = document.createElement('div');
        itemDiv.className = 'sale-item';
        itemDiv.dataset.index = this.itemCounter;
        itemDiv.innerHTML = this.getItemHTML();
        
        container.appendChild(itemDiv);
        this.configurarEventListenersItem(itemDiv);
        this.calcularTotais();
    }

    configurarEventListenersItem(itemDiv) {
        const select = itemDiv.querySelector('.item-select');
        const quantidade = itemDiv.querySelector('.quantidade');
        const precoUnit = itemDiv.querySelector('.preco-unit');
        const btnRemover = itemDiv.querySelector('[data-action="remover"]');
        
        if (select) {
            select.addEventListener('change', (e) => this.atualizarItem(e.target));
        }
        
        if (quantidade) {
            quantidade.addEventListener('input', (e) => this.calcularItem(e.target));
        }
        
        if (precoUnit) {
            precoUnit.addEventListener('input', (e) => this.calcularItem(e.target));
        }
        
        if (btnRemover) {
            btnRemover.addEventListener('click', () => this.removerItem(btnRemover));
        }
    }

    atualizarItem(select) {
        const itemDiv = select.closest('.sale-item');
        if (!itemDiv) return;
        
        const selectedOption = select.options[select.selectedIndex];
        
        if (selectedOption.value) {
            const tipo = selectedOption.dataset.tipo || 'Produto';
            const preco = parseFloat(selectedOption.dataset.preco) || 0;
            const estoqueValue = selectedOption.dataset.estoque;
            const estoque = estoqueValue === 'null' ? null : parseInt(estoqueValue);
            
            const precoInput = itemDiv.querySelector('.preco-unit');
            if (precoInput) {
                precoInput.value = preco.toFixed(2);
            }
            
            const estoqueSpan = itemDiv.querySelector('.estoque-disponivel');
            if (estoqueSpan) {
                if (tipo === 'Servico' || estoque === null) {
                    estoqueSpan.textContent = '∞';
                    estoqueSpan.title = 'Serviço - estoque ilimitado';
                    estoqueSpan.style.color = '#27ae60';
                    estoqueSpan.style.fontWeight = 'bold';
                } else {
                    estoqueSpan.textContent = estoque;
                    estoqueSpan.title = `Estoque disponível: ${estoque}`;
                    estoqueSpan.style.color = '#2c3e50';
                }
            }
            
            // Para produtos com estoque definido, validar quantidade
            if (tipo === 'Produto' && estoque !== null) {
                const quantidadeInput = itemDiv.querySelector('.quantidade');
                if (quantidadeInput) {
                    const quantidadeAtual = parseInt(quantidadeInput.value) || 1;
                    
                    if (quantidadeAtual > estoque) {
                        quantidadeInput.value = estoque > 0 ? estoque : 1;
                        this.mostrarNotificacao(`Quantidade ajustada para o estoque disponível (${estoque})`, 'warning');
                    }
                }
            }
            
            this.calcularItem(select);
        } else {
            const precoInput = itemDiv.querySelector('.preco-unit');
            if (precoInput) {
                precoInput.value = 0;
            }
            const estoqueSpan = itemDiv.querySelector('.estoque-disponivel');
            if (estoqueSpan) {
                estoqueSpan.textContent = '-';
                estoqueSpan.style.color = '#6c757d';
            }
            const totalSpan = itemDiv.querySelector('.item-total');
            if (totalSpan) {
                totalSpan.textContent = 'R$ 0,00';
            }
            this.calcularTotais();
        }
    }

    calcularItem(elemento) {
        const itemDiv = elemento.closest('.sale-item');
        if (!itemDiv) return;
        
        const quantidade = parseFloat(itemDiv.querySelector('.quantidade').value) || 0;
        const precoUnit = parseFloat(itemDiv.querySelector('.preco-unit').value) || 0;
        const total = quantidade * precoUnit;
        
        const totalSpan = itemDiv.querySelector('.item-total');
        if (totalSpan) {
            totalSpan.textContent = this.formatarMoeda(total);
        }
        
        this.calcularTotais();
    }

    removerItem(botao) {
        const itemDiv = botao.closest('.sale-item');
        if (itemDiv) {
            itemDiv.remove();
            this.calcularTotais();
        }
    }

    formatarMoeda(valor) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(valor || 0);
    }

    removerFormatacaoMoeda(valorFormatado) {
        if (!valorFormatado) return 0;
        return parseFloat(
            valorFormatado
                .replace(/[^\d,]/g, '')
                .replace(',', '.')
        ) || 0;
    }

    calcularTotais() {
        const items = document.querySelectorAll('.sale-item');
        let subtotal = 0;
        
        items.forEach(item => {
            const totalText = item.querySelector('.item-total').textContent;
            subtotal += this.removerFormatacaoMoeda(totalText);
        });
        
        const descontoPercent = parseFloat(document.getElementById('desconto').value) || 0;
        const descontoValor = subtotal * (descontoPercent / 100);
        const total = subtotal - descontoValor;
        
        document.getElementById('subtotal').value = this.formatarMoeda(subtotal);
        document.getElementById('desconto-valor').value = 
            `${this.formatarMoeda(descontoValor)} (${descontoPercent}%)`;
        document.getElementById('total').value = this.formatarMoeda(total);
    }

    atualizarDataAtual() {
    const hoje = new Date();
    const dia = hoje.getDate().toString().padStart(2, '0');
    const mes = (hoje.getMonth() + 1).toString().padStart(2, '0');
    const ano = hoje.getFullYear();
    const dataFormatada = `${ano}-${mes}-${dia}`; // Formato YYYY-MM-DD para input type="date"
    
    const dataInput = document.getElementById('data');
    if (dataInput) {
        dataInput.value = dataFormatada;
    }
}

    configurarEventListeners() {
        const addItemBtn = document.getElementById('add-item');
        if (addItemBtn) {
            addItemBtn.addEventListener('click', () => this.adicionarItem());
        }
        
        const descontoInput = document.getElementById('desconto');
        if (descontoInput) {
            descontoInput.addEventListener('input', () => this.calcularTotais());
        }
        
        const saleForm = document.getElementById('sale-form');
        if (saleForm) {
            saleForm.addEventListener('submit', (e) => this.enviarVenda(e));
        }
        
        const cancelBtn = document.getElementById('cancel-btn');
       if (cancelBtn) {
        cancelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = '../vendas.html';
    });
}}

    async enviarVenda(event) {
    event.preventDefault();
    console.log('📤 Iniciando envio da venda...');
    
    if (!this.token || !this.userData || !this.userData.id) {
        this.mostrarNotificacao('Usuário não autenticado. Faça login novamente.', 'error');
        setTimeout(() => window.location.href = '../login.html', 2000);
        return;
    }
    
    const clienteSelect = document.getElementById('cliente');
    if (!clienteSelect || !clienteSelect.value) {
        this.mostrarNotificacao('Selecione um cliente', 'error');
        clienteSelect?.focus();
        return;
    }
    
    const statusSelect = document.getElementById('status');
    const statusVenda = statusSelect ? statusSelect.value : 'Pendente';
    
    const items = document.querySelectorAll('.sale-item');
    if (items.length === 0) {
        this.mostrarNotificacao('Adicione pelo menos um item à venda', 'error');
        return;
    }
    
    // Validação especial para status "Cancelada"
    if (statusVenda === 'Cancelada') {
        const confirmacao = confirm('Deseja realmente criar uma venda com status "Cancelada"? Esta ação não pode ser desfeita facilmente.');
        if (!confirmacao) {
            return;
        }
    }
    
    const itensVenda = [];
    let erroNoItem = false;
    
    items.forEach((item, index) => {
        const itemSelect = item.querySelector('.item-select');
        const quantidadeInput = item.querySelector('.quantidade');
        const precoInput = item.querySelector('.preco-unit');
        
        if (!itemSelect || !itemSelect.value) {
            this.mostrarNotificacao(`Item ${index + 1}: Selecione um produto ou serviço`, 'error');
            erroNoItem = true;
            return;
        }
        
        if (!quantidadeInput || !quantidadeInput.value || parseFloat(quantidadeInput.value) <= 0) {
            this.mostrarNotificacao(`Item ${index + 1}: Informe uma quantidade válida`, 'error');
            erroNoItem = true;
            return;
        }
        
        if (!precoInput || !precoInput.value || parseFloat(precoInput.value) < 0) {
            this.mostrarNotificacao(`Item ${index + 1}: Informe um preço válido`, 'error');
            erroNoItem = true;
            return;
        }
        
        // Se a venda for "Concluida", validar estoque para produtos
        if (statusVenda === 'Concluida') {
            const selectedOption = itemSelect.options[itemSelect.selectedIndex];
            const tipo = selectedOption.dataset.tipo || 'Produto';
            const estoqueValue = selectedOption.dataset.estoque;
            
            if (tipo === 'Produto' && estoqueValue !== 'null') {
                const estoqueSpan = item.querySelector('.estoque-disponivel');
                const estoqueDisponivel = parseInt(estoqueSpan?.textContent) || 0;
                const quantidade = parseInt(quantidadeInput.value);
                
                if (quantidade > estoqueDisponivel) {
                    this.mostrarNotificacao(`Item ${index + 1}: Estoque insuficiente. Disponível: ${estoqueDisponivel}`, 'error');
                    erroNoItem = true;
                    return;
                }
            }
        }
        
        itensVenda.push({
            produtoId: parseInt(itemSelect.value),
            quantidade: parseInt(quantidadeInput.value),
            precoUnit: parseFloat(precoInput.value)
        });
    });
    
    if (erroNoItem) return;
    
    // CORREÇÃO CRÍTICA: DATA COM TIMEZONE CORRETO
    const dataInput = document.getElementById('data');
    let dataVenda;
    
    if (dataInput && dataInput.value) {
        // Usar a data selecionada pelo usuário
        const [anoInput, mesInput, diaInput] = dataInput.value.split('-');
        
        // Obter hora atual no fuso horário de Brasília (BRT/BRST)
        const agora = new Date();
        
        // Ajustar para o fuso horário de Brasília (UTC-3)
        const offsetBRT = -3 * 60; // Brasília é UTC-3
        const agoraBRT = new Date(agora.getTime() + (agora.getTimezoneOffset() - offsetBRT) * 60000);
        
        const horas = agoraBRT.getHours().toString().padStart(2, '0');
        const minutos = agoraBRT.getMinutes().toString().padStart(2, '0');
        
        // IMPORTANTE: Criar data no formato brasileiro com timezone ajustado
        // Usar Date.UTC para evitar problemas de timezone
        const dataUTC = new Date(Date.UTC(
            parseInt(anoInput),
            parseInt(mesInput) - 1,
            parseInt(diaInput),
            parseInt(horas),
            parseInt(minutos),
            0
        ));
        
        // Para debug
        console.log('🔍 DEBUG DATAS - Venda:');
        console.log('Data selecionada:', dataInput.value);
        console.log('Hora local (BRT):', `${horas}:${minutos}`);
        console.log('Data UTC criada:', dataUTC.toISOString());
        console.log('Data local BR:', dataUTC.toLocaleString('pt-BR'));
        
        // Formatar para backend: DD/MM/AAAA HH:MM
        const diaFormatado = diaInput.padStart(2, '0');
        const mesFormatado = mesInput.padStart(2, '0');
        dataVenda = `${diaFormatado}/${mesFormatado}/${anoInput} ${horas}:${minutos}`;
        
    } else {
        // Usar data/hora atual ajustada para BRT
        const agora = new Date();
        const offsetBRT = -3 * 60;
        const agoraBRT = new Date(agora.getTime() + (agora.getTimezoneOffset() - offsetBRT) * 60000);
        
        const dia = agoraBRT.getDate().toString().padStart(2, '0');
        const mes = (agoraBRT.getMonth() + 1).toString().padStart(2, '0');
        const ano = agoraBRT.getFullYear();
        const horas = agoraBRT.getHours().toString().padStart(2, '0');
        const minutos = agoraBRT.getMinutes().toString().padStart(2, '0');
        
        dataVenda = `${dia}/${mes}/${ano} ${horas}:${minutos}`;
    }
    
    console.log('📅 Data final para envio:', dataVenda);
    
    const totalVenda = this.removerFormatacaoMoeda(document.getElementById('total').value);
    const observacoes = document.getElementById('observacoes').value.trim() || null;
    
    const vendaData = {
        clienteId: parseInt(clienteSelect.value),
        usuarioId: parseInt(this.userData.id),
        data: dataVenda, // Formato: "DD/MM/AAAA HH:MM"
        status: statusVenda,
        itens: itensVenda,
        total: totalVenda,
        observacoes: observacoes
    };
    
    console.log('📤 Dados COMPLETOS da venda:', vendaData);
    
    try {
        const submitBtn = document.getElementById('submit-btn');
        const originalText = submitBtn.innerHTML;
        
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
        submitBtn.disabled = true;
        
        const response = await fetch('https://api-nexoerp.vercel.app/api/vendas', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(vendaData)
        });
        
        const result = await response.json();
        console.log('📥 Resposta da API:', result);
        
        if (response.ok) {
            this.mostrarNotificacao(`Venda ${statusVenda.toLowerCase()} criada com sucesso!`, 'success');
            
            setTimeout(() => {
                this.limparFormulario();
                
                setTimeout(() => {
                    window.location.href = '../vendas.html';
                }, 2000);
            }, 1000);
            
        } else {
            const errorMsg = result.error || result.message || 'Erro ao criar venda';
            const detalhes = result.detalhes ? ` Detalhes: ${JSON.stringify(result.detalhes)}` : '';
            this.mostrarNotificacao(`${errorMsg}${detalhes}`, 'error');
            console.error('❌ Erro na resposta:', result);
        }
        
    } catch (error) {
        console.error('❌ Erro ao enviar venda:', error);
        this.mostrarNotificacao('Erro de conexão. Verifique sua internet e tente novamente.', 'error');
    } finally {
        const submitBtn = document.getElementById('submit-btn');
        submitBtn.innerHTML = '<i class="fas fa-check"></i> Finalizar Venda';
        submitBtn.disabled = false;
    }
}

    limparFormulario() {
        const saleItems = document.getElementById('sale-items');
        if (saleItems) {
            saleItems.innerHTML = '';
        }
        
        const clienteSelect = document.getElementById('cliente');
        if (clienteSelect) {
            clienteSelect.value = '';
        }
        
        const dataInput = document.getElementById('data');
        if (dataInput) {
            const hoje = new Date();
            dataInput.value = hoje.toISOString().split('T')[0];
        }
        
        const statusSelect = document.getElementById('status');
        if (statusSelect) {
            statusSelect.value = 'Concluida';
        }
        
        const observacoes = document.getElementById('observacoes');
        if (observacoes) {
            observacoes.value = '';
        }
        
        const desconto = document.getElementById('desconto');
        if (desconto) {
            desconto.value = '0';
        }
        
        document.getElementById('subtotal').value = 'R$ 0,00';
        document.getElementById('desconto-valor').value = 'R$ 0,00 (0%)';
        document.getElementById('total').value = 'R$ 0,00';
        
        this.adicionarItem();
    }

    mostrarNotificacao(mensagem, tipo = 'success') {
        const notificacaoAnterior = document.querySelector('.notificacao');
        if (notificacaoAnterior) {
            notificacaoAnterior.remove();
        }
        
        const notificacao = document.createElement('div');
        notificacao.className = `notificacao ${tipo}`;
        notificacao.innerHTML = `
            <i class="fas ${tipo === 'success' ? 'fa-check-circle' : tipo === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${mensagem}</span>
        `;
        
        document.body.appendChild(notificacao);
        
        setTimeout(() => notificacao.classList.add('show'), 10);
        
        setTimeout(() => {
            notificacao.classList.remove('show');
            setTimeout(() => notificacao.remove(), 300);
        }, 5000);
    }

    adicionarEstilos() {
        const style = document.createElement('style');
        style.textContent = `
            .sale-item {
                display: grid;
                grid-template-columns: 2fr 100px 120px 80px 120px 60px;
                gap: 10px;
                align-items: center;
                margin-bottom: 10px;
                padding: 10px;
                background: #f8f9fa;
                border-radius: 8px;
                border: 1px solid #e9ecef;
            }
            
            .sale-item select,
            .sale-item input {
                padding: 8px 12px;
                border: 1px solid #ced4da;
                border-radius: 4px;
                font-size: 14px;
                background: white;
            }
            
            .sale-item select option[data-tipo="Produto"] {
                color: #2c3e50;
            }
            
            .sale-item select option[data-tipo="Servico"] {
                color: #27ae60;
            }
            
            .sale-item .estoque-disponivel {
                text-align: center;
                font-weight: bold;
                padding: 8px;
                border-radius: 4px;
                font-size: 14px;
                background: #e9ecef;
            }
            
            .sale-item .item-total {
                text-align: right;
                font-weight: bold;
                color: #2c3e50;
                padding: 8px;
                background: white;
                border-radius: 4px;
                border: 1px solid #dee2e6;
            }
            
            .btn-remover {
                background: #e74c3c;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 8px 12px;
                cursor: pointer;
                transition: all 0.3s;
            }
            
            .btn-remover:hover {
                background: #c0392b;
            }
            
            .items-header {
                display: grid;
                grid-template-columns: 2fr 100px 120px 80px 120px 60px;
                gap: 10px;
                padding: 12px 10px;
                background: #2c3e50;
                color: white;
                border-radius: 8px 8px 0 0;
                font-weight: bold;
                font-size: 14px;
            }
            
            .notificacao {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 8px;
                color: white;
                display: flex;
                align-items: center;
                gap: 10px;
                z-index: 10000;
                opacity: 0;
                transform: translateX(100%);
                transition: all 0.3s ease;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            }
            
            .notificacao.show {
                opacity: 1;
                transform: translateX(0);
            }
            
            .notificacao.success {
                background: linear-gradient(135deg, #27ae60, #2ecc71);
            }
            
            .notificacao.error {
                background: linear-gradient(135deg, #e74c3c, #c0392b);
            }
            
            .notificacao.warning {
                background: linear-gradient(135deg, #f39c12, #e67e22);
            }
            
            .notificacao.info {
                background: linear-gradient(135deg, #3498db, #2980b9);
            }
            
            .total-input.final {
                color: #27ae60;
                font-size: 18px;
                font-weight: bold;
            }
            
            /* Estilos para o campo de status */
            #status {
                background: white;
                border: 1px solid #ced4da;
                border-radius: 4px;
                padding: 8px 12px;
                font-size: 14px;
                color: #495057;
            }
            
            #status option[value="Pendente"] {
                color: #f39c12;
                font-weight: 500;
            }
            
            #status option[value="Concluida"] {
                color: #27ae60;
                font-weight: 500;
            }
            
            #status option[value="Cancelada"] {
                color: #e74c3c;
                font-weight: 500;
            }
            
            .form-row {
                display: flex;
                gap: 20px;
                margin-bottom: 20px;
                flex-wrap: wrap;
            }
            
            .form-group {
                flex: 1;
                min-width: 200px;
            }
            
            .form-group.full-width {
                flex: 100%;
                min-width: 100%;
            }
            
            @media (max-width: 768px) {
                .form-group {
                    flex: 100%;
                }
                
                .sale-item {
                    grid-template-columns: 1fr;
                    gap: 5px;
                }
                
                .items-header {
                    display: none;
                }
                
                .sale-item > * {
                    width: 100%;
                    margin-bottom: 5px;
                }
                
                .sale-item .btn-remover {
                    width: auto;
                    align-self: flex-start;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando VendasManager...');
    
    const token = localStorage.getItem('token');
    const userData = JSON.parse(localStorage.getItem('user') || 'null');
    
    if (!token || !userData || !userData.id) {
        console.log('❌ Usuário não autenticado, redirecionando...');
        window.location.href = '../login.html';
        return;
    }
    
    window.vendasManager = new VendasManager();
});