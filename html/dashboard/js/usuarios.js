// usuarios.js - VERSÃO CORRIGIDA COM MODAIS FUNCIONAIS
class UsuariosManager {
    constructor() {
        this.usuarios = [];
        this.filtros = {
            search: '',
            status: '',
            perfil: '',
            page: 1,
            limit: 10
        };
        this.usuarioAtual = null;
        this.init();
    }

    init() {
        this.carregarUsuarios();
        this.configurarEventListeners();
        this.configurarFiltros();
    }

    async carregarUsuarios() {
        try {
            this.mostrarLoading();
            
            console.log("=== DEBUG: Iniciando carregamento ===");
            const response = await fetch('https://api-nexoerp.vercel.app/api/usuarios');
            console.log("Response status:", response.status);
            
            const rawText = await response.text();
            console.log("Raw response:", rawText);
            
            const data = JSON.parse(rawText);
            console.log("Parsed data:", data);
            
            // CORREÇÃO: Extrair array de usuários da estrutura correta
            this.usuarios = data.data || data || [];
            console.log("Usuários finais:", this.usuarios);
            
            this.renderizarTabela();
            this.renderizarPaginacao();

        } catch (error) {
            console.error("Erro detalhado:", error);
            this.mostrarErro();
        }
    }

    renderizarTabela() {
        const tabela = document.querySelector('#usersTableBody');
        if (!tabela) {
            console.error("Elemento #usersTableBody não encontrado!");
            return;
        }

        const usuariosArray = Array.isArray(this.usuarios) ? this.usuarios : [];
        let usuariosFiltrados = this.aplicarFiltros([...usuariosArray]);

        if (!Array.isArray(usuariosFiltrados) || usuariosFiltrados.length === 0) {
            tabela.innerHTML = this.getTemplateVazio();
            return;
        }

        const startIndex = (this.filtros.page - 1) * this.filtros.limit;
        const endIndex = startIndex + this.filtros.limit;
        const usuariosPaginados = usuariosFiltrados.slice(startIndex, endIndex);

        const rowsHTML = usuariosPaginados.map(usuario => this.createTableRow(usuario)).join('');
        tabela.innerHTML = rowsHTML;
    }

    aplicarFiltros(usuarios) {
        if (!Array.isArray(usuarios)) {
            console.warn("aplicarFiltros: usuarios não é array", usuarios);
            return [];
        }

        let filtrados = [...usuarios];

        if (this.filtros.search) {
            const searchTerm = this.filtros.search.toLowerCase();
            filtrados = filtrados.filter(usuario => {
                if (!usuario || typeof usuario !== 'object') return false;
                
                return (
                    (usuario.nome && usuario.nome.toLowerCase().includes(searchTerm)) ||
                    (usuario.email && usuario.email.toLowerCase().includes(searchTerm)) ||
                    (usuario.telefone && usuario.telefone.includes(searchTerm)) ||
                    (usuario.cpf && usuario.cpf.includes(searchTerm))
                );
            });
        }

        if (this.filtros.status) {
            const statusMap = {
                'active': 'Ativo',
                'inactive': 'Inativo'
            };
            filtrados = filtrados.filter(usuario => 
                usuario && usuario.status === statusMap[this.filtros.status]
            );
        }

        if (this.filtros.perfil) {
            filtrados = filtrados.filter(usuario => 
                usuario && usuario.perfil === this.filtros.perfil
            );
        }

        return filtrados;
    }

    createTableRow(usuario) {
        if (!usuario || typeof usuario !== 'object') {
            console.warn("Usuário inválido para criar linha:", usuario);
            return '<tr><td colspan="8">Dados inválidos</td></tr>';
        }

        const statusClass = usuario.status === 'Ativo' ? 'active' : 'inactive';
        const perfilClass = usuario.perfil === 'Admin' ? 'admin' : 'operador';

        return `
            <tr>
                <td>
                    <div class="user-info">
                        <div class="user-avatar-small">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="user-details">
                            <strong>${usuario.nome || 'Nome não informado'}</strong>
                            <small>ID: ${usuario.id || 'N/A'}</small>
                        </div>
                    </div>
                </td>
                <td>${usuario.email || 'Email não informado'}</td>
                <td>${usuario.telefone || 'Não informado'}</td>
                <td>${this.formatarCPF(usuario.cpf)}</td>
                <td>
                    <span class="perfil-badge ${perfilClass}">
                        <i class="fas ${usuario.perfil === 'Admin' ? 'fa-crown' : 'fa-user-check'}"></i>
                        ${usuario.perfil || 'Não definido'}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${statusClass}">
                        ${usuario.status || 'Não definido'}
                    </span>
                </td>
                <td>${usuario.dataNascimento || 'Não informada'}</td>
                <td class="actions">
                    <button class="btn-action edit" onclick="usuariosManager.editarUsuario(${usuario.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action delete" onclick="usuariosManager.excluirUsuario(${usuario.id})" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="btn-action view" onclick="usuariosManager.verDetalhes(${usuario.id})" title="Ver detalhes">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    }

    formatarCPF(cpf) {
        if (!cpf) return 'Não informado';
        const cpfLimpo = cpf.replace(/\D/g, '');
        if (cpfLimpo.length !== 11) return cpf;
        return cpfLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }

    renderizarPaginacao() {
        const paginacaoContainer = document.getElementById('pagination');
        if (!paginacaoContainer) return;

        const usuariosArray = Array.isArray(this.usuarios) ? this.usuarios : [];
        const usuariosFiltrados = this.aplicarFiltros([...usuariosArray]);
        const total = usuariosFiltrados.length;
        const totalPages = Math.ceil(total / this.filtros.limit);
        
        if (totalPages <= 1) {
            paginacaoContainer.innerHTML = '';
            return;
        }

        let paginacaoHTML = `
            <div class="pagination-info">
                Mostrando ${Math.min(this.filtros.limit, usuariosFiltrados.length - (this.filtros.page - 1) * this.filtros.limit)} de ${total} usuários
            </div>
            <div class="pagination-controls">
        `;

        if (this.filtros.page > 1) {
            paginacaoHTML += `
                <button class="pagination-btn" onclick="usuariosManager.mudarPagina(${this.filtros.page - 1})">
                    <i class="fas fa-chevron-left"></i>
                </button>
            `;
        }

        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.filtros.page - 2 && i <= this.filtros.page + 2)) {
                paginacaoHTML += `
                    <button class="pagination-btn ${i === this.filtros.page ? 'active' : ''}" 
                            onclick="usuariosManager.mudarPagina(${i})">
                        ${i}
                    </button>
                `;
            } else if (i === this.filtros.page - 3 || i === this.filtros.page + 3) {
                paginacaoHTML += `<span class="pagination-ellipsis">...</span>`;
            }
        }

        if (this.filtros.page < totalPages) {
            paginacaoHTML += `
                <button class="pagination-btn" onclick="usuariosManager.mudarPagina(${this.filtros.page + 1})">
                    <i class="fas fa-chevron-right"></i>
                </button>
            `;
        }

        paginacaoHTML += `</div>`;
        paginacaoContainer.innerHTML = paginacaoHTML;
    }

    mudarPagina(novaPagina) {
        this.filtros.page = novaPagina;
        this.renderizarTabela();
        this.renderizarPaginacao();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    configurarFiltros() {
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filtros.status = e.target.value;
                this.filtros.page = 1;
                this.renderizarTabela();
                this.renderizarPaginacao();
            });
        }

        const perfilFilter = document.getElementById('perfilFilter');
        if (perfilFilter) {
            perfilFilter.addEventListener('change', (e) => {
                this.filtros.perfil = e.target.value;
                this.filtros.page = 1;
                this.renderizarTabela();
                this.renderizarPaginacao();
            });
        }

        const itemsPerPage = document.getElementById('itemsPerPage');
        if (itemsPerPage) {
            itemsPerPage.addEventListener('change', (e) => {
                this.filtros.limit = parseInt(e.target.value);
                this.filtros.page = 1;
                this.renderizarTabela();
                this.renderizarPaginacao();
            });
        }
    }

    configurarEventListeners() {
        const searchFilter = document.getElementById('searchFilter');
        if (searchFilter) {
            let searchTimeout;
            searchFilter.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.filtros.search = e.target.value;
                    this.filtros.page = 1;
                    this.renderizarTabela();
                    this.renderizarPaginacao();
                }, 500);
            });
        }

        const addUserBtn = document.getElementById('addUserBtn');
        if (addUserBtn) {
            addUserBtn.addEventListener('click', () => {
                window.location.href = 'Nova Tabela/novo_usuario.html';
            });
        }

        this.configurarControleVisualizacao();
    }

    // CORREÇÃO: Método configurarControleVisualizacao adicionado
    configurarControleVisualizacao() {
        const toggleViewBtn = document.getElementById('toggleView');
        if (toggleViewBtn) {
            toggleViewBtn.addEventListener('click', () => {
                const tableContainer = document.querySelector('.table-container');
                const cardsContainer = document.querySelector('.cards-container');
                
                if (tableContainer && cardsContainer) {
                    const isTableView = tableContainer.style.display !== 'none';
                    
                    if (isTableView) {
                        tableContainer.style.display = 'none';
                        cardsContainer.style.display = 'grid';
                        toggleViewBtn.innerHTML = '<i class="fas fa-table"></i> Visualização em Tabela';
                        this.renderizarCards();
                    } else {
                        tableContainer.style.display = 'block';
                        cardsContainer.style.display = 'none';
                        toggleViewBtn.innerHTML = '<i class="fas fa-th"></i> Visualização em Cards';
                    }
                }
            });
        }
    }

    // MODAL DE EDIÇÃO - CORRIGIDO
    async editarUsuario(id) {
        try {
            const response = await fetch(`https://api-nexoerp.vercel.app/api/usuarios/${id}`);
            
            if (!response.ok) {
                throw new Error('Usuário não encontrado');
            }

            const data = await response.json();
            this.usuarioAtual = data.data || data;
            this.mostrarModalEdicao(this.usuarioAtual);
            
        } catch (error) {
            console.error('Erro:', error);
            this.mostrarMensagem('Erro ao carregar dados do usuário', 'error');
        }
    }

    mostrarModalEdicao(usuario) {
        // Remover modal existente se houver
        this.fecharModalEdicao();

        const modalHTML = `
            <div class="modal-overlay edicao-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
                <div class="modal-content" style="background: white; padding: 30px; border-radius: 12px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;">
                    <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h3 style="margin: 0;">Editar Usuário</h3>
                        <button class="close-modal" onclick="usuariosManager.fecharModalEdicao()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
                    </div>
                    <form id="user-edit-form">
                        <input type="hidden" id="usuarioId" value="${usuario.id}">
                        
                        <div class="form-group" style="margin-bottom: 15px;">
                            <label for="nome" style="display: block; margin-bottom: 5px; font-weight: bold;">Nome</label>
                            <input type="text" id="nome" value="${usuario.nome || ''}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" required>
                        </div>

                        <div class="form-group" style="margin-bottom: 15px;">
                            <label for="email" style="display: block; margin-bottom: 5px; font-weight: bold;">Email</label>
                            <input type="email" id="email" value="${usuario.email || ''}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" required>
                        </div>

                        <div class="form-group" style="margin-bottom: 15px;">
                            <label for="perfil" style="display: block; margin-bottom: 5px; font-weight: bold;">Perfil</label>
                            <select id="perfil" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                                <option value="Operador" ${usuario.perfil === 'Operador' ? 'selected' : ''}>Operador</option>
                                <option value="Admin" ${usuario.perfil === 'Admin' ? 'selected' : ''}>Admin</option>
                            </select>
                        </div>

                        <div class="form-group" style="margin-bottom: 15px;">
                            <label for="senha" style="display: block; margin-bottom: 5px; font-weight: bold;">
                                Senha <small style="font-weight: normal; color: #666;">(deixe em branco para manter a atual)</small>
                            </label>
                            <div style="position: relative;">
                                <input type="password" id="senha" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; padding-right: 40px;">
                                <button type="button" class="toggle-password" onclick="usuariosManager.togglePassword('senha')" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer;">👁️</button>
                            </div>
                        </div>

                        <div class="form-group" style="margin-bottom: 15px;">
                           <label for="status" style="display: block; margin-bottom: 5px; font-weight: bold;">Status</label>
                              <select id="status" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                                  <option value="Ativo" ${usuario.status === 'Ativo' ? 'selected' : ''}>Ativo</option>
                                  <option value="Inativo" ${usuario.status === 'Inativo' ? 'selected' : ''}>Inativo</option>
                              </select>
                          </div>

                        <div id="errorMsg" style="display: none; background: #fee; color: #c33; padding: 10px; border-radius: 4px; margin-bottom: 15px;"></div>
                        <div id="successMsg" style="display: none; background: #efe; color: #363; padding: 10px; border-radius: 4px; margin-bottom: 15px;"></div>

                        <div class="modal-footer" style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                            <button type="button" class="btn btn-danger" onclick="usuariosManager.confirmarExclusao(${usuario.id})" style="padding: 10px 15px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">Excluir</button>
                            <button type="button" class="btn btn-secondary" onclick="usuariosManager.fecharModalEdicao()" style="padding: 10px 15px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Cancelar</button>
                            <button type="submit" class="btn btn-primary" style="padding: 10px 15px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Salvar Alterações</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.configurarModalEdicao();
    }

    configurarModalEdicao() {
        const form = document.getElementById('user-edit-form');
        const closeBtn = document.querySelector('.edicao-modal .close-modal');
        const overlay = document.querySelector('.edicao-modal');

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.salvarEdicao();
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.fecharModalEdicao();
            });
        }

        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.fecharModalEdicao();
                }
            });
        }

        // Fechar com ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.fecharModalEdicao();
            }
        });
    }

    async salvarEdicao() {
        try {
            const formData = {
                nome: document.getElementById('nome').value,
                email: document.getElementById('email').value,
                perfil: document.getElementById('perfil').value,
                status: document.getElementById('status').value, 
                senha: document.getElementById('senha').value || undefined
            };

            const usuarioId = document.getElementById('usuarioId').value;

            const response = await fetch(`https://api-nexoerp.vercel.app/api/usuarios/${usuarioId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                this.mostrarMensagem('Usuário atualizado com sucesso!', 'success');
                this.fecharModalEdicao();
                this.carregarUsuarios(); // Recarregar a lista
            } else {
                throw new Error('Erro ao atualizar usuário');
            }

        } catch (error) {
            console.error('Erro:', error);
            this.mostrarMensagem('Erro ao atualizar usuário', 'error');
        }
    }

    fecharModalEdicao() {
        const modal = document.querySelector('.edicao-modal');
        if (modal) {
            modal.remove();
        }
    }

    togglePassword(fieldId) {
        const passwordField = document.getElementById(fieldId);
        if (passwordField) {
            passwordField.type = passwordField.type === 'password' ? 'text' : 'password';
        }
    }

    async confirmarExclusao(usuarioId) {
        if (confirm('Tem certeza que deseja excluir este usuário?')) {
            try {
                const response = await fetch(`https://api-nexoerp.vercel.app/api/usuarios/${usuarioId}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    this.mostrarMensagem('Usuário excluído com sucesso!', 'success');
                    this.fecharModalEdicao();
                    this.carregarUsuarios();
                } else {
                    throw new Error('Erro ao excluir usuário');
                }
            } catch (error) {
                console.error('Erro:', error);
                this.mostrarMensagem('Erro ao excluir usuário', 'error');
            }
        }
    }

    async excluirUsuario(id) {
        if (confirm('Tem certeza que deseja excluir este usuário?')) {
            try {
                const response = await fetch(`https://api-nexoerp.vercel.app/api/usuarios/${id}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    this.mostrarMensagem('Usuário excluído com sucesso!', 'success');
                    this.carregarUsuarios();
                } else {
                    throw new Error('Erro ao excluir usuário');
                }
            } catch (error) {
                console.error('Erro:', error);
                this.mostrarMensagem('Erro ao excluir usuário', 'error');
            }
        }
    }

    async verDetalhes(id) {
        try {
            const response = await fetch(`https://api-nexoerp.vercel.app/api/usuarios/${id}`);
            
            if (!response.ok) {
                throw new Error('Usuário não encontrado');
            }

            const data = await response.json();
            const usuario = data.data || data;
            this.mostrarModalDetalhes(usuario);
            
        } catch (error) {
            console.error('Erro:', error);
            this.mostrarMensagem('Erro ao carregar detalhes do usuário', 'error');
        }
    }

    mostrarModalDetalhes(usuario) {
        const modalHTML = `
            <div class="modal-overlay detalhes-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
                <div class="modal-content" style="background: white; padding: 30px; border-radius: 12px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;">
                    <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h3 style="margin: 0;">Detalhes do Usuário</h3>
                        <button class="close-modal" onclick="usuariosManager.fecharModalDetalhes()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
                    </div>
                    
                    <div class="user-details-content">
                        <div style="text-align: center; margin-bottom: 20px;">
                            <div class="user-avatar-large" style="width: 80px; height: 80px; border-radius: 50%; background: #007bff; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px; color: white; font-size: 2rem;">
                                <i class="fas fa-user"></i>
                            </div>
                            <h4 style="margin: 0;">${usuario.nome || 'Nome não informado'}</h4>
                            <p style="color: #666; margin: 5px 0;">${usuario.email || 'Email não informado'}</p>
                        </div>

                        <div class="details-grid" style="display: grid; gap: 15px;">
                            <div class="detail-item">
                                <strong>ID:</strong> <span>${usuario.id || 'N/A'}</span>
                            </div>
                            <div class="detail-item">
                                <strong>Telefone:</strong> <span>${usuario.telefone || 'Não informado'}</span>
                            </div>
                            <div class="detail-item">
                                <strong>CPF:</strong> <span>${this.formatarCPF(usuario.cpf)}</span>
                            </div>
                            <div class="detail-item">
                                <strong>Perfil:</strong> 
                                <span class="perfil-badge ${usuario.perfil === 'Admin' ? 'admin' : 'operador'}">
                                    ${usuario.perfil || 'Não definido'}
                                </span>
                            </div>
                            <div class="detail-item">
                                <strong>Status:</strong> 
                                <span class="status-badge ${usuario.status === 'Ativo' ? 'active' : 'inactive'}">
                                    ${usuario.status || 'Não definido'}
                                </span>
                            </div>
                            <div class="detail-item">
                                <strong>Data de Nascimento:</strong> <span>${usuario.dataNascimento || 'Não informada'}</span>
                            </div>
                        </div>
                    </div>

                    <div class="modal-footer" style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                        <button type="button" class="btn btn-secondary" onclick="usuariosManager.fecharModalDetalhes()" style="padding: 10px 15px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Fechar</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.configurarModalDetalhes();
    }

    configurarModalDetalhes() {
        const closeBtn = document.querySelector('.detalhes-modal .close-modal');
        const overlay = document.querySelector('.detalhes-modal');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.fecharModalDetalhes();
            });
        }

        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.fecharModalDetalhes();
                }
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.fecharModalDetalhes();
            }
        });
    }

    fecharModalDetalhes() {
        const modal = document.querySelector('.detalhes-modal');
        if (modal) {
            modal.remove();
        }
    }

    mostrarMensagem(mensagem, tipo) {
        // Implementação simples de mensagem
        alert(mensagem);
    }

    mostrarLoading() {
        const tabela = document.querySelector('#usersTableBody');
        if (tabela) {
            tabela.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 40px;">
                        <div class="loading-spinner"></div>
                        <p>Carregando usuários...</p>
                    </td>
                </tr>
            `;
        }
    }

    mostrarErro() {
        const tabela = document.querySelector('#usersTableBody');
        if (tabela) {
            tabela.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 40px; color: #ef4444;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                        <p>Erro ao carregar usuários. Tente novamente.</p>
                        <button onclick="usuariosManager.carregarUsuarios()" class="btn btn-primary" style="margin-top: 1rem;">
                            <i class="fas fa-redo"></i> Tentar Novamente
                        </button>
                    </td>
                </tr>
            `;
        }
    }

    getTemplateVazio() {
        return `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px;">
                    <i class="fas fa-users" style="font-size: 3rem; color: #9ca3af; margin-bottom: 1rem;"></i>
                    <p style="color: #6b7280; font-size: 1.1rem;">Nenhum usuário encontrado</p>
                    <p style="color: #9ca3af;">Tente ajustar os filtros ou adicionar um novo usuário.</p>
                </td>
            </tr>
        `;
    }

    renderizarCards() {
        // Implementação básica para visualização em cards
        const cardsContainer = document.querySelector('.cards-container');
        if (!cardsContainer) return;

        const usuariosArray = Array.isArray(this.usuarios) ? this.usuarios : [];
        const usuariosFiltrados = this.aplicarFiltros([...usuariosArray]);

        if (usuariosFiltrados.length === 0) {
            cardsContainer.innerHTML = this.getTemplateVazioCards();
            return;
        }

        const cardsHTML = usuariosFiltrados.map(usuario => this.createCard(usuario)).join('');
        cardsContainer.innerHTML = cardsHTML;
    }

    createCard(usuario) {
        const statusClass = usuario.status === 'Ativo' ? 'active' : 'inactive';
        const perfilClass = usuario.perfil === 'Admin' ? 'admin' : 'operador';

        return `
            <div class="user-card">
                <div class="card-header">
                    <div class="user-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="user-info">
                        <h4>${usuario.nome || 'Nome não informado'}</h4>
                        <p>${usuario.email || 'Email não informado'}</p>
                    </div>
                </div>
                <div class="card-body">
                    <p><strong>Telefone:</strong> ${usuario.telefone || 'Não informado'}</p>
                    <p><strong>CPF:</strong> ${this.formatarCPF(usuario.cpf)}</p>
                    <p><strong>Perfil:</strong> <span class="perfil-badge ${perfilClass}">${usuario.perfil || 'Não definido'}</span></p>
                    <p><strong>Status:</strong> <span class="status-badge ${statusClass}">${usuario.status || 'Não definido'}</span></p>
                </div>
                <div class="card-actions">
                    <button class="btn-action edit" onclick="usuariosManager.editarUsuario(${usuario.id})">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn-action view" onclick="usuariosManager.verDetalhes(${usuario.id})">
                        <i class="fas fa-eye"></i> Detalhes
                    </button>
                </div>
            </div>
        `;
    }

    getTemplateVazioCards() {
        return `
            <div class="empty-state">
                <i class="fas fa-users" style="font-size: 3rem; color: #9ca3af; margin-bottom: 1rem;"></i>
                <p style="color: #6b7280; font-size: 1.1rem;">Nenhum usuário encontrado</p>
                <p style="color: #9ca3af;">Tente ajustar os filtros ou adicionar um novo usuário.</p>
            </div>
        `;
    }
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    window.usuariosManager = new UsuariosManager();
});