/* eslint-disable no-undef */
document.addEventListener("DOMContentLoaded", () => {
    // Base da API: usa o mesmo host em produção; localhost em dev
    const API_URL = (/^https?:/i.test(window.location.origin)) ? window.location.origin : "http://localhost:8000";
	const lista = document.getElementById("lista-produtos");
	const btnAtualizar = document.getElementById("btnAtualizar");
	const btnCart = document.getElementById("btnCart");
	const searchInput = document.getElementById("search-input");
	const searchButton = document.getElementById("search-button");

	// Submenu dinâmico: apenas nomes de vinhos cadastrados
	const submenuVinhos = document.getElementById("submenu-vinhos");

	// 🔹 Captura o botão "Todos" — funciona com id OU classe .btn-menu
	const btnTodos = document.getElementById("btnTodos") || document.querySelector(".btn-menu");

	let carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];

	// 🛒 Atualiza contador do carrinho
	function atualizarContador() {
		const count = carrinho.length;
		let contador = btnCart.querySelector(".cart-count");
		if (!contador) {
			contador = document.createElement("span");
			contador.className = "cart-count";
			btnCart.appendChild(contador);
		}
		contador.textContent = count;
	}

	// 💾 Salva carrinho
	function salvarCarrinho() {
		localStorage.setItem("carrinho", JSON.stringify(carrinho));
		atualizarContador();
	}

	// 🔔 Toast temporário
	function mostrarToast(msg) {
		const toast = document.createElement("div");
		toast.className = "toast";
		toast.textContent = msg;
		document.body.appendChild(toast);
		setTimeout(() => toast.remove(), 2000);
	}

	// ➕ Adicionar produto ao carrinho
	function adicionarAoCarrinho(produto) {
		carrinho.push(produto);
		salvarCarrinho();
		mostrarToast(`${produto.nome} adicionado ao carrinho!`);
	}

	// 🛍️ Ir para o carrinho
	btnCart.addEventListener("click", () => {
		window.location.href = "carrinho.html";
	});

	// 📑 Carrega submenu de vinhos dinamicamente
	async function carregarSubmenu() {
		if (!submenuVinhos) return;
		try {
			const token = localStorage.getItem("token");
		const response = await fetch(`${API_URL}/produtos`, {
				headers: { Authorization: token ? `Bearer ${token}` : undefined },
			});
			const data = await response.json();

			const produtos = Array.isArray(data.produtos) ? data.produtos : [];

			// Lista simples: somente nomes dos vinhos cadastrados (sem limite)
			if (produtos.length === 0) {
				submenuVinhos.innerHTML = "<span style='color:#aaa'>Nenhum vinho cadastrado</span>";
			} else {
				const nomesUnicos = Array.from(new Map(produtos.map((p) => [p.nome, p])).values())
					.map((p) => p.nome)
					.sort((a, b) => a.localeCompare(b));

				const itens = nomesUnicos
					.map((nome) => {
						const href = `produto.html?nome=${encodeURIComponent(nome)}`;
						return `<a href="${href}">${nome}</a>`;
					})
					.join("");

				submenuVinhos.innerHTML = itens || "<span style='color:#aaa'>Nenhum vinho cadastrado</span>";
			}
		} catch (err) {
			console.error("Erro ao carregar submenu de vinhos", err);
			submenuVinhos.innerHTML = "<span style='color:red'>Erro ao carregar vinhos</span>";
		}
	}

	// 📦 Carrega os produtos
	async function carregarProdutos() {
		lista.innerHTML = "<p style='text-align:center;color:#aaa;'>Carregando produtos...</p>";

		try {
			const token = localStorage.getItem("token");
			const response = await fetch(`${API_URL}/produtos`, {
				headers: { Authorization: token ? `Bearer ${token}` : undefined },
			});
			const data = await response.json();
			lista.innerHTML = "";

			if (!data.produtos || data.produtos.length === 0) {
				lista.innerHTML = "<p style='text-align:center;color:#aaa;'>Nenhum produto cadastrado ainda.</p>";
				return;
			}

			// 🔹 Filtros por querystring: tipo e busca
			const params = new URLSearchParams(window.location.search);
			const tipoParam = params.get("tipo");
			const buscaParam = params.get("busca");

			let produtos = data.produtos;
			if (tipoParam) {
				produtos = produtos.filter((p) => (p.tipo || "").toLowerCase() === tipoParam.toLowerCase());
			}
			if (buscaParam) {
				const termo = buscaParam.toLowerCase();
				produtos = produtos.filter((p) => (p.nome || "").toLowerCase().includes(termo));
			}

			if (!produtos || produtos.length === 0) {
				lista.innerHTML = "<p style='text-align:center;color:#aaa;'>Nenhum produto encontrado para o filtro.</p>";
				return;
			}

			// 🔹 Renderiza os produtos
			produtos.forEach((produto) => {
				const precoFinal = produto.desconto
					? (Number(produto.valor) || 0) * 0.8
					: (Number(produto.valor) || 0);

				const parcelaValor = precoFinal / 3;
				const parcelaFormatada = parcelaValor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

				const card = document.createElement("div");
				card.className = "card card-produto-completo";

				card.innerHTML = `
          <div class="card-img-wrapper">
            ${produto.desconto ? "<span class='promo-tag'>-20% OFF</span>" : ""}
            <img src="${produto.imagem}" alt="${produto.nome}" />
          </div>
          <div class="card-body">
            <h3 class="card-title">${produto.nome}</h3>

            <p class="country-label">${(produto.pais || "—")}</p>
            <div class="card-price">R$ ${precoFinal.toFixed(2)}</div>
            <p class="parcelas-text">Em até 3x de ${parcelaFormatada} s/ juros</p>

            <div class="card-actions">
              <button class="btn-add-cart"><i class="fa-solid fa-cart-plus"></i> Adicionar</button>
              <button class="btn-detalhes"><i class="fa-solid fa-eye"></i> Ver detalhes</button>
            </div>
          </div>
        `;

				// ➕ Botão adicionar
				card.querySelector(".btn-add-cart").addEventListener("click", () => {
					adicionarAoCarrinho({
						id: produto.id,
						nome: produto.nome,
						preco: precoFinal.toFixed(2),
						imagem: produto.imagem,
					});
				});

				// 👁️ Ver detalhes
				card.querySelector(".btn-detalhes").addEventListener("click", () => {
					const nome = encodeURIComponent(produto.nome);
					window.location.href = `produto.html?id=${produto.id}&nome=${nome}`;
				});

				lista.appendChild(card);
			});
		} catch (err) {
			console.error(err);
			lista.innerHTML = "<p style='text-align:center;color:red;'>Erro ao carregar produtos.</p>";
		}
	}

	// 🔄 Atualizar catálogo
	btnAtualizar.addEventListener("click", () => {
		btnAtualizar.classList.add("girando");
		carregarProdutos().finally(() => btnAtualizar.classList.remove("girando"));
	});

	// 🍷 Botão “Todos” — recarrega tudo
	if (btnTodos) {
		btnTodos.addEventListener("click", () => {
			btnTodos.classList.add("girando");
			carregarProdutos().finally(() => btnTodos.classList.remove("girando"));
		});
	} else {
		console.warn("Botão 'Todos' não encontrado.");
	}

	// 🚀 Inicialização
	atualizarContador();
	carregarSubmenu();
	carregarProdutos();

	// 🔎 Busca por vinhos
	function enviarBusca() {
		const termo = (searchInput?.value || "").trim();
		if (!termo) return;
		window.location.href = `index.html?busca=${encodeURIComponent(termo)}`;
	}
	if (searchButton && searchInput) {
		searchButton.addEventListener("click", enviarBusca);
		searchInput.addEventListener("keydown", (e) => {
			if (e.key === "Enter") enviarBusca();
		});
	}
});
