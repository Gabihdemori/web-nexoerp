// nova_venda.js - VERSÃO CORRIGIDA COM DESCONTO EM PORCENTAGEM E OBSERVAÇÕES
class VendasManager {
    constructor() {
        this.token = localStorage.getItem('token');
        this.userData = JSON.parse(localStorage.getItem('user') || 'null');
        this.produtos = [];
        this.clientes = [];
        this.vendaAtual = {
            clienteId: null,
            data: new Date().toISOString().split('T')[0],
            itens: [],
            descontoPercentual: 0, // Mudança: desconto em porcentagem
            descontoValor: 0,      // Valor absoluto do desconto
            subtotal: 0,
            total: 0,
            observacoes: '',
            status: 'Concluida',
            usuarioId: this.userData?.id
        };
        this.init();
    }

    init() {
        this.carregarDadosIniciais();
        this.configurarEventListeners();
        this.atualizarDataAtual();
    }

    async carregarDadosIniciais() {
        try {
            await Promise.all([
                this.carregarClientes(),
                this.carregarProdutos()
            ]);
            this.adicionarItem();
        } catch (error) {
            console.error('Erro ao carregar dados iniciais:', error);
        }
    }

    async carregarClientes() {
        try {
            const response = await this.fetchAuth('https://api-nexoerp.vercel.app/api/clientes');
            this.clientes = response.clientes || [];
            this.popularSelectClientes();
        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
        }
    }

    async carregarProdutos() {
        try {
            const response = await this.fetchAuth('https://api-nexoerp.vercel.app/api/produtos');
            const produtosData = response.produtos || [];
            this.produtos = produtosData.filter(produto => 
                (produto.status === 'Ativo' || produto.status === 'active') && produto.estoque > 0
            );
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
        }
    }

    popularSelectClientes() {
        const select = document.getElementById('cliente');
        if (!select) return;

        select.innerHTML = '<option value="">Selecione um cliente</option>';
        
        this.clientes.forEach(cliente => {
            const option = document.createElement('option');
            option.value = cliente.id;
            option.textContent = `${cliente.nome} - ${this.formatarDocumento(cliente.documento, cliente.tipo)}`;
            select.appendChild(option);
        });
    }

    configurarEventListeners() {
        const form = document.getElementById('sale-form');
        const addItemBtn = document.getElementById('add-item');
        const descontoInput = document.getElementById('desconto');
        const observacoesInput = document.getElementById('observacoes');

        if (form) form.addEventListener('submit', (e) => this.salvarVenda(e));
        if (addItemBtn) addItemBtn.addEventListener('click', () => this.adicionarItem());
        if (descontoInput) descontoInput.addEventListener('input', (e) => this.atualizarDesconto(e.target.value));
        if (observacoesInput) observacoesInput.addEventListener('input', (e) => {
            this.vendaAtual.observacoes = e.target.value;
        });
        
        const clienteSelect = document.getElementById('cliente');
        if (clienteSelect) {
            clienteSelect.addEventListener('change', (e) => {
                this.vendaAtual.clienteId = e.target.value ? parseInt(e.target.value) : null;
            });
        }
    }

    adicionarItem() {
        const container = document.querySelector('.sale-items');
        if (!container) return;

        const itemId = Date.now();
        const itemRow = document.createElement('div');
        itemRow.className = 'item-row';
        itemRow.setAttribute('data-item-id', itemId);
        itemRow.innerHTML = this.getItemHTML();
        container.appendChild(itemRow);

        this.vendaAtual.itens.push({
            id: itemId,
            produtoId: null,
            quantidade: 1,
            precoUnit: 0, // CORREÇÃO: Mudado para precoUnit (igual ao backend)
            total: 0
        });

        this.configurarEventListenersItem(itemRow);
        this.popularSelectProdutos(itemRow);
    }

    getItemHTML() {
        return `
            <select class="item-product" required>
                <option value="">Selecione um produto</option>
            </select>
            <input type="number" class="item-quantity" min="1" value="1" required>
            <input type="number" class="item-price" step="0.01" readonly>
            <span class="item-stock">Estoque: 0</span>
            <span class="item-total">R$ 0,00</span>
            <button type="button" class="btn btn-danger remove-item">Remover</button>
        `;
    }

    popularSelectProdutos(itemRow) {
        const select = itemRow.querySelector('.item-product');
        if (!select) return;

        select.innerHTML = '<option value="">Selecione um produto</option>';
        
        this.produtos.forEach(produto => {
            const option = document.createElement('option');
            option.value = produto.id;
            option.textContent = `${produto.nome} - R$ ${this.formatarPreco(produto.preco)}`;
            option.dataset.preco = produto.preco;
            option.dataset.estoque = produto.estoque;
            select.appendChild(option);
        });
    }

    configurarEventListenersItem(itemRow) {
        const productSelect = itemRow.querySelector('.item-product');
        const quantityInput = itemRow.querySelector('.item-quantity');
        const removeBtn = itemRow.querySelector('.remove-item');

        productSelect.addEventListener('change', (e) => this.selecionarProduto(itemRow, e.target));
        quantityInput.addEventListener('input', (e) => this.atualizarQuantidade(itemRow, e.target.value));
        removeBtn.addEventListener('click', () => this.removerItem(itemRow));
    }

    selecionarProduto(itemRow, select) {
        const selectedOption = select.options[select.selectedIndex];
        const preco = parseFloat(selectedOption.dataset.preco) || 0;
        const estoque = parseInt(selectedOption.dataset.estoque) || 0;
        const produtoId = select.value ? parseInt(select.value) : null;

        const priceInput = itemRow.querySelector('.item-price');
        const stockSpan = itemRow.querySelector('.item-stock');
        const quantityInput = itemRow.querySelector('.item-quantity');

        priceInput.value = preco;
        stockSpan.textContent = `Estoque: ${estoque}`;
        quantityInput.max = estoque;

        const itemId = parseInt(itemRow.getAttribute('data-item-id'));
        const itemIndex = this.vendaAtual.itens.findIndex(item => item.id === itemId);
        
        if (itemIndex !== -1) {
            this.vendaAtual.itens[itemIndex].produtoId = produtoId;
            this.vendaAtual.itens[itemIndex].precoUnit = preco; // CORREÇÃO: precoUnit
            this.calcularTotalItem(itemRow);
        }
    }

    atualizarQuantidade(itemRow, quantidade) {
        const itemId = parseInt(itemRow.getAttribute('data-item-id'));
        const itemIndex = this.vendaAtual.itens.findIndex(item => item.id === itemId);
        
        if (itemIndex !== -1) {
            this.vendaAtual.itens[itemIndex].quantidade = parseInt(quantidade) || 0;
            this.calcularTotalItem(itemRow);
        }
    }

    calcularTotalItem(itemRow) {
        const itemId = parseInt(itemRow.getAttribute('data-item-id'));
        const itemIndex = this.vendaAtual.itens.findIndex(item => item.id === itemId);
        
        if (itemIndex === -1) return;

        const item = this.vendaAtual.itens[itemIndex];
        item.total = item.quantidade * item.precoUnit; // CORREÇÃO: precoUnit

        const totalSpan = itemRow.querySelector('.item-total');
        totalSpan.textContent = `R$ ${this.formatarPreco(item.total)}`;

        this.calcularTotaisVenda();
    }

    calcularTotaisVenda() {
        // Calcular subtotal
        this.vendaAtual.subtotal = this.vendaAtual.itens.reduce((total, item) => total + item.total, 0);
        
        // Calcular valor do desconto baseado na porcentagem
        this.vendaAtual.descontoValor = (this.vendaAtual.subtotal * this.vendaAtual.descontoPercentual) / 100;
        
        // Calcular total final
        this.vendaAtual.total = Math.max(0, this.vendaAtual.subtotal - this.vendaAtual.descontoValor);

        // Atualizar interface
        this.atualizarInterfaceTotais();
    }

    atualizarInterfaceTotais() {
        const subtotalElement = document.getElementById('subtotal');
        const descontoElement = document.getElementById('desconto-valor');
        const totalElement = document.getElementById('total');

        if (subtotalElement) {
            subtotalElement.textContent = `R$ ${this.formatarPreco(this.vendaAtual.subtotal)}`;
        }

        if (descontoElement) {
            descontoElement.textContent = `R$ ${this.formatarPreco(this.vendaAtual.descontoValor)} (${this.vendaAtual.descontoPercentual}%)`;
        }

        if (totalElement) {
            totalElement.textContent = `R$ ${this.formatarPreco(this.vendaAtual.total)}`;
        }
    }

    atualizarDesconto(descontoPercentual) {
        this.vendaAtual.descontoPercentual = parseFloat(descontoPercentual) || 0;
        this.calcularTotaisVenda();
    }

    removerItem(itemRow) {
        const itemId = parseInt(itemRow.getAttribute('data-item-id'));
        this.vendaAtual.itens = this.vendaAtual.itens.filter(item => item.id !== itemId);
        itemRow.remove();
        this.calcularTotaisVenda();

        if (this.vendaAtual.itens.length === 0) {
            this.adicionarItem();
        }
    }

    async salvarVenda(event) {
        event.preventDefault();
        
        if (!this.validarVenda()) return;

        try {
            const vendaData = this.prepararDadosVenda();
            console.log('Enviando dados para API:', vendaData);
            
            const response = await this.fetchAuth('https://api-nexoerp.vercel.app/api/vendas', {
                method: 'POST',
                body: JSON.stringify(vendaData)
            });

            console.log('Resposta da API:', response);
            alert('Venda realizada com sucesso!');
            window.location.href = 'dasboard/vendas.html';

        } catch (error) {
            console.error('Erro ao salvar venda:', error);
            alert(`Erro ao salvar venda: ${error.message}`);
        }
    }

    validarVenda() {
        if (!this.vendaAtual.clienteId) {
            alert('Selecione um cliente');
            return false;
        }

        const itensValidos = this.vendaAtual.itens.filter(item => 
            item.produtoId && item.quantidade > 0 && item.precoUnit > 0
        );

        if (itensValidos.length === 0) {
            alert('Adicione pelo menos um item válido à venda');
            return false;
        }

        for (const item of itensValidos) {
            const produto = this.produtos.find(p => p.id === item.produtoId);
            if (produto && item.quantidade > produto.estoque) {
                alert(`Estoque insuficiente para ${produto.nome}. Disponível: ${produto.estoque}`);
                return false;
            }
        }

        return true;
    }

    prepararDadosVenda() {
        const itensValidos = this.vendaAtual.itens.filter(item => 
            item.produtoId && item.quantidade > 0
        );

        // CORREÇÃO: Formatar dados conforme esperado pelo backend
        const vendaData = {
            clienteId: this.vendaAtual.clienteId,
            usuarioId: this.userData.id,
            data: this.formatarDataParaBackend(document.getElementById('data')?.value || this.vendaAtual.data),
            status: 'Concluida',
            itens: itensValidos.map(item => ({
                produtoId: item.produtoId,
                quantidade: item.quantidade,
                precoUnit: item.precoUnit // CORREÇÃO: precoUnit (igual ao backend)
            })),
            total: this.vendaAtual.total,
            observacoes: this.vendaAtual.observacoes || null // CORREÇÃO: Incluir observações
        };

        return vendaData;
    }

    formatarDataParaBackend(dataString) {
        if (!dataString) return new Date().toISOString();
        
        if (dataString.includes('T')) {
            return dataString;
        }
        
        return new Date(dataString + 'T00:00:00').toISOString();
    }

    async fetchAuth(url, options = {}) {
        const config = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            },
            ...options
        };

        if (options.body) {
            config.body = options.body;
        }

        const response = await fetch(url, config);

        if (!response.ok) {
            let errorMessage = `Erro ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorData.message || errorMessage;
                if (errorData.detalhes) {
                    errorMessage += ` - ${JSON.stringify(errorData.detalhes)}`;
                }
            } catch (e) {
            }
            throw new Error(errorMessage);
        }

        return await response.json();
    }

    atualizarDataAtual() {
        const dataInput = document.getElementById('data');
        if (dataInput) {
            dataInput.value = this.vendaAtual.data;
        }
    }

    formatarPreco(valor) {
        return parseFloat(valor || 0).toFixed(2).replace('.', ',');
    }

    formatarDocumento(documento, tipo) {
        if (!documento) return 'Sem documento';
        
        const numeros = documento.replace(/\D/g, '');
        
        if (tipo === 'PJ') {
            return numeros.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
        } else {
            return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        }
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    if (!window.authUnico || !window.authUnico.isLoggedIn()) {
        alert('Você precisa estar logado para acessar esta página');
        window.location.href = '../../login/login.html';
        return;
    }

    window.vendasManager = new VendasManager();
});