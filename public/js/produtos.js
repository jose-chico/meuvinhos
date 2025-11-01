/* eslint-disable no-undef */
const API_URL = (/^https?:/i.test(window.location.origin)) ? window.location.origin : "http://localhost:8000";
const token = localStorage.getItem("token");
if (!token) window.location.href = "index.html";

const headers = {
	"Content-Type": "application/json",
	Authorization: `Bearer ${token}`,
};

const createProdutoForm = document.getElementById("createProdutoForm");
const createProdutoMsg = document.getElementById("createProdutoMsg");
const buscarProdutoBtn = document.getElementById("buscarProdutoBtn");
const buscaProdutoMsg = document.getElementById("buscaProdutoMsg");
const resultadoProduto = document.getElementById("resultadoProduto");
const listaProdutos = document.getElementById("listaProdutos");

const editProdutoModal = document.getElementById("editProdutoModal");
const editProdutoForm = document.getElementById("editProdutoForm");
const cancelEditProduto = document.getElementById("cancelEditProduto");

let produtoAtualParaEdicao = null; // nome original

function openEditProdutoModal(produto) {
    produtoAtualParaEdicao = produto.nome;

    document.getElementById("editProduto").value = produto.produto || "";
    document.getElementById("editEstoque").value = produto.estoque ?? "";
    document.getElementById("editPais").value = produto.pais || "";
    document.getElementById("editRegiao").value = produto.regiao || "";
    document.getElementById("editSafra").value = produto.safra || "";
    document.getElementById("editTipo").value = produto.tipo || "";
    document.getElementById("editGarrafa").value = produto.garrafa || "";
    document.getElementById("editTeor").value = produto.teor || "";
    document.getElementById("editValor").value = produto.valor ?? "";
    document.getElementById("editHarmonizacao").value = produto.harmonizacao || "";
    document.getElementById("editDescricao").value = produto.descricao || "";
    document.getElementById("editImagem").value = produto.imagem || "";
    document.getElementById("editDesconto").checked = !!produto.desconto;

    editProdutoModal.style.display = "flex";
}

function closeEditProdutoModal() {
	editProdutoModal.style.display = "none";
	produtoAtualParaEdicao = null;
}

cancelEditProduto.addEventListener("click", () => {
	closeEditProdutoModal();
});

window.addEventListener("click", (e) => {
	if (e.target === editProdutoModal) {
		closeEditProdutoModal();
	}
});

// Criar produto
createProdutoForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    createProdutoMsg.textContent = "";
    createProdutoMsg.className = "form-msg";

    const produto = {
        nome: document.getElementById("nome").value,
        produto: document.getElementById("produto").value,
        estoque: Number(document.getElementById("estoque").value || 0),
        pais: document.getElementById("pais").value,
        regiao: document.getElementById("regiao").value,
        safra: document.getElementById("safra").value,
        tipo: document.getElementById("tipo").value,
        garrafa: document.getElementById("garrafa").value,
        teor: document.getElementById("teor").value,
        valor: Number(document.getElementById("valor").value || 0),
        harmonizacao: document.getElementById("harmonizacao").value || undefined,
        desconto: document.getElementById("desconto").checked,
        descricao: document.getElementById("descricao").value,
        imagem: document.getElementById("imagem").value,
    };

	try {
		const res = await fetch(`${API_URL}/produto`, {
			method: "POST",
			headers,
			body: JSON.stringify(produto),
		});

		const data = await res.json();

        if (res.ok) {
            createProdutoMsg.textContent = data.message || "Produto cadastrado!";
            createProdutoMsg.classList.add("msg-ok");
            createProdutoForm.reset();
            listarProdutos();
        } else {
            createProdutoMsg.textContent = (data.message || data[0]?.message) || "Erro ao cadastrar.";
            createProdutoMsg.classList.add("msg-err");
        }
	} catch {
		createProdutoMsg.textContent = "Erro de conexão.";
		createProdutoMsg.classList.add("msg-err");
	}
});

// Buscar produto
buscarProdutoBtn.addEventListener("click", async () => {
	buscaProdutoMsg.textContent = "";
	buscaProdutoMsg.className = "busca-msg";
	resultadoProduto.innerHTML = "";

    const nome = document.getElementById("buscarNome").value;
	if (!nome) {
		buscaProdutoMsg.textContent = "Digite um nome para buscar.";
		buscaProdutoMsg.classList.add("msg-err");
		return;
	}

	try {
		const res = await fetch(`${API_URL}/produto/${nome}`, {
			headers,
		});

		const data = await res.json();

        if (res.ok) {
            const p = data.produto;
            resultadoProduto.innerHTML = `
        <p><b>Nome:</b> ${p.nome}</p>
        <p><b>Produto:</b> ${p.produto}</p>
        <p><b>Tipo:</b> ${p.tipo}</p>
        <p><b>País/Região:</b> ${p.pais} / ${p.regiao}</p>
        <p><b>Safra:</b> ${p.safra}</p>
        <p><b>Garrafa:</b> ${p.garrafa}</p>
        <p><b>Teor:</b> ${p.teor}</p>
        <p><b>Preço:</b> R$ ${Number(p.valor).toFixed(2)}</p>
        <p><b>Desconto:</b> ${p.desconto ? "Sim" : "Não"}</p>
        ${p.harmonizacao ? `<p><b>Harmonização:</b> ${p.harmonizacao}</p>` : ""}
        <p><b>Descrição:</b> ${p.descricao}</p>
        <img src="${p.imagem}" alt="${p.nome}" class="item-img"/>

        <div class="item-actions" style="margin-top:.75rem;">
          <button class="btn-edit" onclick="handleEditarProduto('${p.nome}')">✏️ Editar</button>
          <button class="btn-danger" onclick="deletarProduto('${p.nome}')">🗑 Deletar</button>
        </div>
      `;
        } else {
            buscaProdutoMsg.textContent = data.message || "Produto não encontrado.";
            buscaProdutoMsg.classList.add("msg-err");
        }
	} catch {
		buscaProdutoMsg.textContent = "Erro de conexão.";
		buscaProdutoMsg.classList.add("msg-err");
	}
});

// Listar produtos
async function listarProdutos() {
	listaProdutos.innerHTML = "";

	try {
		const res = await fetch(`${API_URL}/produtos`, {
			headers,
		});
		const data = await res.json();

        if (res.ok && data.produtos && data.produtos.length) {
            data.produtos.forEach((p) => {
                const li = document.createElement("li");
                li.className = "item-card";
                li.innerHTML = `
          <div class="item-headline">${p.nome}</div>
          <div class="item-row"><b>Produto:</b> ${p.produto}</div>
          <div class="item-row"><b>Tipo:</b> ${p.tipo}</div>
          <div class="item-row"><b>País/Região:</b> ${p.pais} / ${p.regiao}</div>
          <div class="item-row"><b>Safra:</b> ${p.safra}</div>
          <div class="item-row"><b>Teor:</b> ${p.teor}</div>
          <div class="item-row"><b>Preço:</b> R$ ${Number(p.valor).toFixed(2)}</div>
          <div class="item-row"><b>Desconto:</b> ${p.desconto ? "Sim" : "Não"}</div>
          ${p.harmonizacao ? `<div class="item-row"><b>Harmonização:</b> ${p.harmonizacao}</div>` : ""}
          <div class="item-row"><b>Descrição:</b> ${p.descricao || ""}</div>
          ${p.imagem ? `<img src="${p.imagem}" alt="${p.nome}" class="item-img" />` : ""}

          <div class="item-actions">
            <button class="btn-edit" onclick="handleEditarProduto('${p.nome}')">✏️ Editar</button>
            <button class="btn-danger" onclick="deletarProduto('${p.nome}')">🗑 Deletar</button>
          </div>
        `;
                listaProdutos.appendChild(li);
            });
        } else {
            listaProdutos.innerHTML = "<li class=\"item-card\"><div class=\"item-row\">Nenhum produto encontrado.</div></li>";
        }
	} catch {
		listaProdutos.innerHTML = "<li class=\"item-card\"><div class=\"item-row msg-err\">Erro ao carregar produtos.</div></li>";
	}
}
listarProdutos();

// Função abrir modal edição produto
window.handleEditarProduto = async (nome) => {
	try {
		const res = await fetch(`${API_URL}/produto/${nome}`, {
			headers,
		});
		const data = await res.json();
		if (!res.ok) return alert(data.message || "Erro ao carregar produto");

		openEditProdutoModal(data.produto);
	} catch {
		alert("Erro de conexão.");
	}
};

// Salvar edição produto (PUT)
editProdutoForm.addEventListener("submit", async (e) => {
	e.preventDefault();
	if (!produtoAtualParaEdicao) return;

    const body = {};
    const produtoField = document.getElementById("editProduto").value.trim();
    const estoque = document.getElementById("editEstoque").value.trim();
    const pais = document.getElementById("editPais").value.trim();
    const regiao = document.getElementById("editRegiao").value.trim();
    const safra = document.getElementById("editSafra").value.trim();
    const tipo = document.getElementById("editTipo").value.trim();
    const garrafa = document.getElementById("editGarrafa").value.trim();
    const teor = document.getElementById("editTeor").value.trim();
    const valor = document.getElementById("editValor").value.trim();
    const harmonizacao = document.getElementById("editHarmonizacao").value.trim();
    const descricao = document.getElementById("editDescricao").value.trim();
    const imagem = document.getElementById("editImagem").value.trim();
    const desconto = document.getElementById("editDesconto").checked;

    if (produtoField) body.produto = produtoField;
    if (estoque) body.estoque = Number(estoque);
    if (pais) body.pais = pais;
    if (regiao) body.regiao = regiao;
    if (safra) body.safra = safra;
    if (tipo) body.tipo = tipo;
    if (garrafa) body.garrafa = garrafa;
    if (teor) body.teor = teor;
    if (valor) body.valor = Number(valor);
    if (harmonizacao) body.harmonizacao = harmonizacao;
    if (descricao) body.descricao = descricao;
    if (imagem) body.imagem = imagem;
    body.desconto = desconto;

	if (Object.keys(body).length === 0) {
		alert("Nenhuma alteração feita.");
		return;
	}

	try {
		const res = await fetch(`${API_URL}/produto/${produtoAtualParaEdicao}`, {
			method: "PUT",
			headers,
			body: JSON.stringify(body),
		});
		const data = await res.json();

		if (res.ok) {
			alert("Produto atualizado com sucesso!");
			closeEditProdutoModal();
			listarProdutos();
		} else {
			alert(data.message || "Erro ao atualizar produto.");
		}
	} catch {
		alert("Erro de conexão.");
	}
});

// Deletar produto
window.deletarProduto = async (nome) => {
	if (!confirm("Deseja realmente deletar este produto?")) return;

	try {
		const res = await fetch(`${API_URL}/produto/${nome}`, {
			method: "DELETE",
			headers,
		});
		const data = await res.json();

		if (res.ok) {
			alert("Produto deletado!");
			listarProdutos();
		} else {
			alert(data.message || "Erro ao deletar.");
		}
	} catch {
		alert("Erro de conexão.");
	}
};

// Logout
document.getElementById("logout").addEventListener("click", () => {
	localStorage.removeItem("token");
	window.location.href = "index.html";
});
