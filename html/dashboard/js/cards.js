// cards.js - Visualização em Cards para Produtos
class CardsView {
    constructor() {
        this.container = document.getElementById('cardsView');
        this.produtos = [];
        this.init();
    }

    init() {
        // Inicializa a visualização em cards
        this.container.innerHTML = this.getLoadingTemplate();
    }

    carregarProdutos(produtos, filtros = {}) {
        this.produtos = produtos || [];
        
        if (!Array.isArray(this.produtos) || this.produtos.length === 0) {
            this.container.innerHTML = this.getEmptyTemplate();
            return;
        }

        // Aplicar filtros client-side
        let produtosFiltrados = [...this.produtos];
        
        if (filtros.stock === 'out') {
            produtosFiltrados = produtosFiltrados.filter(p => p.estoque === 0);
        } else if (filtros.stock === 'available') {
            produtosFiltrados = produtosFiltrados.filter(p => p.estoque > 0);
        } else if (filtros.stock === 'low') {
            produtosFiltrados = produtosFiltrados.filter(p => p.estoque <= 10 && p.estoque > 0);
        }

        this.renderizarCards(produtosFiltrados);
    }

    renderizarCards(produtos) {
        if (!Array.isArray(produtos) || produtos.length === 0) {
            this.container.innerHTML = this.getEmptyTemplate();
            return;
        }

        const cardsHTML = produtos.map(produto => this.createCard(produto)).join('');
        this.container.innerHTML = `
            <div class="cards-grid">
                ${cardsHTML}
            </div>
        `;
    }

    createCard(produto) {
        const precoFormatado = (produto.preco ?? 0).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });

        const statusClass = produto.status === 'Ativo' ? 'active' : 'inactive';
        const tipoIcon = produto.tipo === 'Servico' ? 'fa-concierge-bell' : 'fa-box';
        const tipoText = produto.tipo === 'Servico' ? 'Serviço' : 'Produto';
        const estoqueClass = this.getEstoqueClass(produto.estoque);
        const estoqueIcon = this.getEstoqueIcon(produto.estoque);

        return `
            <div class="product-card" data-id="${produto.id}">
                <div class="card-header">
                    <div class="product-type">
                        <i class="fas ${tipoIcon}"></i>
                        <span>${tipoText}</span>
                    </div>
                    <span class="status-badge ${statusClass}">
                        ${produto.status || 'Inativo'}
                    </span>
                </div>

                <div class="card-body">
                    <h3 class="product-name">${produto.nome}</h3>
                    <p class="product-description">${produto.descricao || 'Sem descrição'}</p>
                    
                    <div class="product-details">
                        <div class="detail-item">
                            <i class="fas fa-tag"></i>
                            <span class="value price">${precoFormatado}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-box"></i>
                            <span class="value stock ${estoqueClass}">
                                ${produto.estoque ?? 0} unidades
                            </span>
                        </div>
                        <div class="detail-item">
                            <i class="fas ${estoqueIcon}"></i>
                            <span class="value ${estoqueClass}">
                                ${this.getEstoqueTexto(produto.estoque)}
                            </span>
                        </div>
                    </div>
                </div>

                <div class="card-footer">
                    <div class="card-actions">
                        <a href="../editar/editar_produto.html?id=${produto.id}" class="btn-card btn-edit">
                            <i class="fas fa-edit"></i>
                            Editar
                        </a>
                        <button class="btn-card btn-delete" onclick="cardsView.excluirProduto(${produto.id})">
                            <i class="fas fa-trash"></i>
                            Excluir
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    getEstoqueClass(estoque) {
        if (estoque === 0) return 'out-of-stock';
        if (estoque <= 10) return 'low-stock';
        return 'in-stock';
    }

    getEstoqueIcon(estoque) {
        if (estoque === 0) return 'fa-times-circle';
        if (estoque <= 10) return 'fa-exclamation-triangle';
        return 'fa-check-circle';
    }

    getEstoqueTexto(estoque) {
        if (estoque === 0) return 'Sem estoque';
        if (estoque <= 10) return 'Estoque baixo';
        return 'Em estoque';
    }

    async excluirProduto(id) {
        if (!confirm('Tem certeza que deseja excluir este produto?')) {
            return;
        }

        try {
            const response = await fetch(`https://api-nexoerp.vercel.app/api/produtos/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                if (window.produtosManager) {
                    window.produtosManager.mostrarMensagem('Produto excluído com sucesso!', 'success');
                    window.produtosManager.carregarProdutos();
                }
            } else {
                const error = await response.json();
                alert(error.error || 'Erro ao excluir produto');
            }
        } catch (error) {
            console.error('Erro ao excluir produto:', error);
            alert('Erro ao excluir produto');
        }
    }

    getLoadingTemplate() {
        return `
            <div class="cards-loading">
                <div class="loading-spinner"></div>
                <p>Carregando produtos...</p>
            </div>
        `;
    }

    getEmptyTemplate() {
        return `
            <div class="cards-empty">
                <i class="fas fa-box-open"></i>
                <h3>Nenhum produto cadastrado</h3>
                <p>Clique em "Novo Item" para adicionar seu primeiro produto</p>
            </div>
        `;
    }

    getErrorTemplate() {
        return `
            <div class="cards-error">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Erro ao carregar produtos</h3>
                <p>Tente novamente mais tarde</p>
                <button class="btn-card btn-primary" onclick="location.reload()">
                    <i class="fas fa-redo"></i>
                    Tentar Novamente
                </button>
            </div>
        `;
    }
}

// Inicialização quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    window.cardsView = new CardsView();
    
    // Quando mudar para visualização de cards, atualizar os dados
    const cardsViewElement = document.getElementById('cardsView');
    if (cardsViewElement) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const displayStyle = cardsViewElement.style.display;
                    if (displayStyle === 'block' && window.produtosManager) {
                        window.cardsView.carregarProdutos(window.produtosManager.produtos, window.produtosManager.filtros);
                    }
                }
            });
        });

        observer.observe(cardsViewElement, { attributes: true });
    }
});