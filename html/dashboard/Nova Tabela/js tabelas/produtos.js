// cadastrar_produto.js
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('product-form');

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Coletar dados do formulário
        const formData = {
            nome: document.getElementById('nome').value,
            descricao: document.getElementById('descricao').value,
            preco: parseFloat(document.getElementById('preco').value),
            estoque: parseInt(document.getElementById('estoque').value),
            tipo: document.getElementById('tipo').value,
            status: document.getElementById('status').value
        };

        // Validações básicas
        if (!formData.nome || !formData.preco || !formData.estoque || !formData.tipo || !formData.status) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        try {
            const response = await fetch('https://api-nexoerp.vercel.app/api/produtos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (response.ok) {
                alert('Produto cadastrado com sucesso!');
                window.location.href = '../produtos.html';
            } else {
                alert(`Erro ao cadastrar produto: ${result.error}`);
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao cadastrar produto. Tente novamente.');
        }
    });
});