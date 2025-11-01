/* eslint-disable no-undef */
const API_URL = (/^https?:/i.test(window.location.origin)) ? window.location.origin : "http://localhost:8000";
const token = localStorage.getItem("token");
if (!token) window.location.href = "index.html";

const headers = {
	"Content-Type": "application/json",
	Authorization: `Bearer ${token}`,
};

const createClienteForm = document.getElementById("createClienteForm");
const createClienteMsg = document.getElementById("createClienteMsg");
const buscarBtn = document.getElementById("buscarBtn");
const buscaMsg = document.getElementById("buscaMsg");
const resultadoBusca = document.getElementById("resultadoBusca");
const listaClientes = document.getElementById("listaClientes");

const editClienteModal = document.getElementById("editClienteModal");
const editClienteForm = document.getElementById("editClienteForm");
const cancelEditCliente = document.getElementById("cancelEditCliente");

let clienteAtualParaEdicao = null; // nome original

function openEditClienteModal(cliente) {
	clienteAtualParaEdicao = cliente.nome;

	document.getElementById("editNome").value = cliente.nome || "";
	document.getElementById("editEndereco").value = cliente.endereco || "";
	document.getElementById("editDatass").value = cliente.datass || "";

	editClienteModal.style.display = "flex";
}

function closeEditClienteModal() {
	editClienteModal.style.display = "none";
	clienteAtualParaEdicao = null;
}

cancelEditCliente.addEventListener("click", () => {
	closeEditClienteModal();
});

window.addEventListener("click", (e) => {
	if (e.target === editClienteModal) {
		closeEditClienteModal();
	}
});

// Criar cliente
createClienteForm.addEventListener("submit", async (e) => {
	e.preventDefault();
	createClienteMsg.textContent = "";
	createClienteMsg.className = "form-msg";

	const nome = document.getElementById("nome").value;
	const endereco = document.getElementById("endereco").value;
	const datass = document.getElementById("datass").value;

	try {
		const res = await fetch(`${API_URL}/cliente`, {
			method: "POST",
			headers,
			body: JSON.stringify({ nome, endereco, datass }),
		});

		const data = await res.json();

		if (res.ok) {
			createClienteMsg.textContent = data.message || "Cliente cadastrado!";
			createClienteMsg.classList.add("msg-ok");
			createClienteForm.reset();
			listarClientes();
		} else {
			createClienteMsg.textContent = data.message || "Erro ao cadastrar.";
			createClienteMsg.classList.add("msg-err");
		}
	} catch {
		createClienteMsg.textContent = "Erro de conexão.";
		createClienteMsg.classList.add("msg-err");
	}
});

// Buscar cliente individual
buscarBtn.addEventListener("click", async () => {
	buscaMsg.textContent = "";
	buscaMsg.className = "busca-msg";
	resultadoBusca.innerHTML = "";

	const nome = document.getElementById("buscarNome").value;
	if (!nome) {
		buscaMsg.textContent = "Digite um nome para buscar.";
		buscaMsg.classList.add("msg-err");
		return;
	}

	try {
		const res = await fetch(`${API_URL}/cliente/${nome}`, {
			headers,
		});

		const data = await res.json();

		if (res.ok) {
			const c = data.cliente;
			resultadoBusca.innerHTML = `
        <p><b>Nome:</b> ${c.nome}</p>
        <p><b>Endereço:</b> ${c.endereco}</p>
        <p><b>Data:</b> ${c.datass}</p>

        <div class="item-actions" style="margin-top:.75rem;">
          <button class="btn-edit" onclick="handleEditarCliente('${c.nome}')">✏️ Editar</button>
          <button class="btn-danger" onclick="deletarCliente('${c.nome}')">🗑 Deletar</button>
        </div>
      `;
		} else {
			buscaMsg.textContent = data.message || "Cliente não encontrado.";
			buscaMsg.classList.add("msg-err");
		}
	} catch {
		buscaMsg.textContent = "Erro de conexão.";
		buscaMsg.classList.add("msg-err");
	}
});

// Lista todos clientes
async function listarClientes() {
	listaClientes.innerHTML = "";

	try {
		const res = await fetch(`${API_URL}/clientes`, {
			headers,
		});
		const data = await res.json();

		if (res.ok && data.cliente && data.cliente.length) {
			data.cliente.forEach((c) => {
				const li = document.createElement("li");
				li.className = "item-card";
				li.innerHTML = `
          <div class="item-headline">${c.nome}</div>
          <div class="item-row"><b>Endereço:</b> ${c.endereco}</div>
          <div class="item-row"><b>Data:</b> ${c.datass}</div>

          <div class="item-actions">
            <button class="btn-edit" onclick="handleEditarCliente('${c.nome}')">✏️ Editar</button>
            <button class="btn-danger" onclick="deletarCliente('${c.nome}')">🗑 Deletar</button>
          </div>
        `;
				listaClientes.appendChild(li);
			});
		} else {
			listaClientes.innerHTML = "<li class=\"item-card\"><div class=\"item-row\">Nenhum cliente encontrado.</div></li>";
		}
	} catch {
		listaClientes.innerHTML = "<li class=\"item-card\"><div class=\"item-row msg-err\">Erro ao carregar clientes.</div></li>";
	}
}
listarClientes();

// Função global para botão "Editar"
window.handleEditarCliente = async (nome) => {
	try {
		const res = await fetch(`${API_URL}/cliente/${nome}`, {
			headers,
		});
		const data = await res.json();
		if (!res.ok) return alert(data.message || "Erro ao carregar cliente");

		openEditClienteModal(data.cliente);
	} catch {
		alert("Erro de conexão.");
	}
};

// Salvar edição do cliente (PUT)
editClienteForm.addEventListener("submit", async (e) => {
	e.preventDefault();
	if (!clienteAtualParaEdicao) return;

	const novoNome = document.getElementById("editNome").value.trim();
	const novoEndereco = document.getElementById("editEndereco").value.trim();
	const novoDatass = document.getElementById("editDatass").value.trim();

	const body = {};
	if (novoNome) body.nome = novoNome;
	if (novoEndereco) body.endereco = novoEndereco;
	if (novoDatass) body.datass = novoDatass;

	if (Object.keys(body).length === 0) {
		alert("Nenhuma alteração feita.");
		return;
	}

	try {
		const res = await fetch(`${API_URL}/cliente/${clienteAtualParaEdicao}`, {
			method: "PUT",
			headers,
			body: JSON.stringify(body),
		});
		const data = await res.json();

		if (res.ok) {
			alert("Cliente atualizado com sucesso!");
			closeEditClienteModal();
			listarClientes();
		} else {
			alert(data.message || "Erro ao atualizar cliente.");
		}
	} catch {
		alert("Erro de conexão.");
	}
});

// Deletar cliente
window.deletarCliente = async (nome) => {
	if (!confirm("Deseja realmente deletar este cliente?")) return;

	try {
		const res = await fetch(`${API_URL}/cliente/${nome}`, {
			method: "DELETE",
			headers,
		});
		const data = await res.json();

		if (res.ok) {
			alert("Cliente deletado!");
			listarClientes();
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
