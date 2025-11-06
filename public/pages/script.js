/* eslint-disable no-undef, no-unused-vars */
document.addEventListener("DOMContentLoaded", () => {
    // Base da API: usa o mesmo host em produção; localhost em dev
    const API_URL = (/^https?:/i.test(window.location.origin)) ? window.location.origin : "http://localhost:8000";
	const lista = document.getElementById("lista-produtos");
	const btnAtualizar = document.getElementById("btnAtualizar");
	const btnCart = document.getElementById("btnCart");
	const searchInput = document.getElementById("search-input");
	const searchButton = document.getElementById("search-button");

	// Modal de imagem (reutilizável)
	const modalOverlay = document.getElementById("img-modal");
	const modalImg = modalOverlay ? modalOverlay.querySelector(".modal-img") : null;
	const modalClose = modalOverlay ? modalOverlay.querySelector(".modal-close") : null;

	/* eslint-disable-next-line no-unused-vars */
	function abrirModalImagem(src, alt) {
		if (!modalOverlay || !modalImg) return;
		modalImg.src = src;
		modalImg.alt = alt || "Imagem do vinho";
		modalOverlay.classList.add("active");
		document.body.style.overflow = "hidden";
	}

	function fecharModalImagem() {
		if (!modalOverlay || !modalImg) return;
		modalOverlay.classList.remove("active");
		modalImg.src = "";
		modalImg.alt = "";
		document.body.style.overflow = "";
	}

	if (modalOverlay) {
		modalOverlay.addEventListener("click", (e) => { if (e.target === modalOverlay) fecharModalImagem(); });
		document.addEventListener("keydown", (e) => { if (e.key === "Escape") fecharModalImagem(); });
		if (modalClose) modalClose.addEventListener("click", fecharModalImagem);
	}

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

	// 🔹 Util para normalizar valores em BRL (suporta "99,90")
	function parsePrecoBRL(valor) {
		if (typeof valor === "number") return valor;
		if (typeof valor === "string") {
			const cleaned = valor
				.replace(/[^\d.,-]/g, "")
				.replace(/\.(?=\d{3}(\D|$))/g, "")
				.replace(",", ".");
			const num = parseFloat(cleaned);
			return Number.isFinite(num) ? num : 0;
		}
		return 0;
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

    // 📑 Carrega submenu de vinhos dinamicamente, agrupando por tipo
    async function carregarSubmenu() {
        if (!submenuVinhos) return;
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/produtos`, {
                headers: { Authorization: token ? `Bearer ${token}` : undefined },
            });
            const data = await response.json();

            const produtos = Array.isArray(data.produtos) ? data.produtos : [];

            if (produtos.length === 0) {
            submenuVinhos.innerHTML = "<span style=\"color:#aaa\">Nenhum vinho cadastrado</span>";
                return;
            }

            // Agrupar nomes por tipo de vinho
            const gruposPorTipo = new Map();
            for (const p of produtos) {
                const tipoBruto = (p.tipo || "Outros").trim();
                // Normaliza capitalização: "tinto" -> "Tinto"
                const tipo = tipoBruto.charAt(0).toUpperCase() + tipoBruto.slice(1).toLowerCase();
                if (!gruposPorTipo.has(tipo)) gruposPorTipo.set(tipo, new Set());
                gruposPorTipo.get(tipo).add(p.nome);
            }

            // Ordem sugerida para tipos comuns; demais por ordem alfabética
            const ordemPreferida = ["Tinto", "Branco", "Rosé", "Espumante", "Fortificado", "Sobremesa", "Outros"]; 
            const tiposOrdenados = Array.from(gruposPorTipo.keys()).sort((a, b) => {
                const ia = ordemPreferida.indexOf(a);
                const ib = ordemPreferida.indexOf(b);
                if (ia !== -1 && ib !== -1) return ia - ib;
                if (ia !== -1) return -1;
                if (ib !== -1) return 1;
                return a.localeCompare(b);
            });

            const colunasHtml = tiposOrdenados.map((tipo) => {
                const nomes = Array.from(gruposPorTipo.get(tipo)).sort((a, b) => a.localeCompare(b));
                const links = nomes.map((nome) => {
                    const href = `index.html?tipo=${encodeURIComponent(tipo)}`;
                    return `<a href="${href}">${nome}</a>`;
                }).join("");
                const verTipo = `<a class="submenu-title" href="index.html?tipo=${encodeURIComponent(tipo)}" title="Ver todos ${tipo}">${tipo}</a>`;
                const verTodos = `<a href="index.html?tipo=${encodeURIComponent(tipo)}" style="color:#aaa">Ver todos ${tipo}</a>`;
                return `<div class="submenu-column">${verTipo}${links}${verTodos}</div>`;
            }).join("");

            const searchBoxHtml = `
              <div class="submenu-search">
                <input id="submenu-search-input" type="text" placeholder="Buscar vinhos pelo menu..." />
                <button id="submenu-search-button" title="Buscar"><i class="fa-solid fa-magnifying-glass"></i></button>
              </div>
            `;

            submenuVinhos.innerHTML = (searchBoxHtml + colunasHtml) || "<span style=\"color:#aaa\">Nenhum vinho cadastrado</span>";

            const submenuInput = submenuVinhos.querySelector("#submenu-search-input");
            const submenuButton = submenuVinhos.querySelector("#submenu-search-button");
            const enviarBuscaSubmenu = () => {
              const termo = (submenuInput?.value || "").trim();
              if (!termo) return;
              window.location.href = `index.html?busca=${encodeURIComponent(termo)}`;
            };
            if (submenuButton && submenuInput) {
              submenuButton.addEventListener("click", enviarBuscaSubmenu);
              submenuInput.addEventListener("keydown", (e) => { if (e.key === "Enter") enviarBuscaSubmenu(); });
            }

            // Filtrar visualmente por tipo dentro do submenu e navegar para o catálogo filtrado
            const tipoLinks = submenuVinhos.querySelectorAll(".submenu-title");
            tipoLinks.forEach((link) => {
              link.addEventListener("click", (e) => {
                e.preventDefault();
                const tipoSelecionado = link.textContent?.trim() || "";
                const nomesDoTipo = Array.from(gruposPorTipo.get(tipoSelecionado) || []);

                const linksTipoHtml = nomesDoTipo
                  .sort((a, b) => a.localeCompare(b))
                  .map((nome) => {
                    const href = `index.html?tipo=${encodeURIComponent(tipoSelecionado)}`;
                    return `<a href="${href}">${nome}</a>`;
                  }).join("");

                const verTodosTipo = `<a href="index.html?tipo=${encodeURIComponent(tipoSelecionado)}" style="color:#aaa">Ver todos ${tipoSelecionado}</a>`;
                const voltar = `<a href="#" class="submenu-title" style="color:#aaa" id="submenu-voltar-tipos">← Voltar aos tipos</a>`; /* eslint-disable-line quotes */

                submenuVinhos.innerHTML = `
                  ${searchBoxHtml}
                  <div class="submenu-column">
                    <div class="submenu-title">${tipoSelecionado}</div>
                    ${linksTipoHtml}
                    ${verTodosTipo}
                  </div>
                  <div class="submenu-column">
                    ${voltar}
                  </div>
                `;

                // Reanexar handlers de busca após re-render
                const novoInput = submenuVinhos.querySelector("#submenu-search-input");
                const novoBotao = submenuVinhos.querySelector("#submenu-search-button");
                if (novoInput && novoBotao) {
                  novoBotao.addEventListener("click", enviarBuscaSubmenu);
                  novoInput.addEventListener("keydown", (evt) => { if (evt.key === "Enter") enviarBuscaSubmenu(); });
                }

                // Handler para voltar a ver todos os tipos
                const voltarTipos = submenuVinhos.querySelector("#submenu-voltar-tipos");
                if (voltarTipos) {
                  voltarTipos.addEventListener("click", (evt) => {
                    evt.preventDefault();
                    submenuVinhos.innerHTML = searchBoxHtml + colunasHtml;
                    // Reanexar novamente handlers após restaurar conteúdo
                    const restInput = submenuVinhos.querySelector("#submenu-search-input");
                    const restButton = submenuVinhos.querySelector("#submenu-search-button");
                    if (restButton && restInput) {
                      restButton.addEventListener("click", enviarBuscaSubmenu);
                      restInput.addEventListener("keydown", (ev) => { if (ev.key === "Enter") enviarBuscaSubmenu(); });
                    }
                    // Reanexar handlers de tipo
                    const restTipoLinks = submenuVinhos.querySelectorAll(".submenu-title");
                    restTipoLinks.forEach((lnk) => {
                      lnk.addEventListener("click", (evt2) => {
                        evt2.preventDefault();
                        lnk.click(); // delega ao comportamento padrão recriado acima
                      });
                    });
                  });
                }

                // Navegar para catálogo filtrado por tipo (em outra aba via Ctrl+Click; padrão abre direto)
                window.location.href = `index.html?tipo=${encodeURIComponent(tipoSelecionado)}`;
              });
            });
        } catch (err) {
            console.error("Erro ao carregar submenu de vinhos", err);
            submenuVinhos.innerHTML = "<span style=\"color:red\">Erro ao carregar vinhos</span>";
        }
    }

	// 📦 Carrega os produtos
	async function carregarProdutos() {
        lista.innerHTML = "<p style=\"text-align:center;color:#aaa;\">Carregando produtos...</p>";

		try {
			const token = localStorage.getItem("token");
			const response = await fetch(`${API_URL}/produtos`, {
				headers: { Authorization: token ? `Bearer ${token}` : undefined },
			});
			const data = await response.json();
			lista.innerHTML = "";

            if (!data.produtos || data.produtos.length === 0) {
                lista.innerHTML = "<p style=\"text-align:center;color:#aaa;\">Nenhum produto cadastrado ainda.</p>";
                return;
            }

			// 🔹 Filtros por querystring: tipo e busca
			const params = new URLSearchParams(window.location.search);
			const tipoParam = params.get("tipo");
			const buscaParam = params.get("busca");

			let produtos = data.produtos;
			if (tipoParam) {
				const tipoFiltro = tipoParam.trim().toLowerCase();
				produtos = produtos.filter((p) => ((p.tipo || "").trim().toLowerCase().includes(tipoFiltro)));
			}
			if (buscaParam) {
				const termo = buscaParam.toLowerCase();
				produtos = produtos.filter((p) => (p.nome || "").toLowerCase().includes(termo));
			}

            if (!produtos || produtos.length === 0) {
                lista.innerHTML = "<p style=\"text-align:center;color:#aaa;\">Nenhum produto encontrado para o filtro.</p>";
                return;
            }



			// 🔹 Renderiza os produtos
			produtos.forEach((produto) => {
				const baseValor = parsePrecoBRL(produto.valor);
				const precoFinal = produto.desconto ? baseValor * 0.8 : baseValor;

				const parcelaValor = precoFinal / 3;
				const parcelaFormatada = parcelaValor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

				const card = document.createElement("div");
				card.className = "card card-produto-completo";

				card.innerHTML = `
          <div class="card-img-wrapper">
            ${produto.desconto ? "<span class=\"promo-tag\">-20% OFF</span>" : ""}
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
						preco: Number(precoFinal.toFixed(2)),
						imagem: produto.imagem,
					});
				});

				// 👁️ Ver detalhes
				card.querySelector(".btn-detalhes").addEventListener("click", () => {
					const nome = encodeURIComponent(produto.nome);
					window.location.href = `produto.html?id=${produto.id}&nome=${nome}`;
				});

				// 🖼️ Clique na imagem abre modal
				const imgEl = card.querySelector(".card-img-wrapper img");
				if (imgEl) {
					imgEl.style.cursor = "zoom-in";
					imgEl.addEventListener("click", () => abrirModalImagem(produto.imagem, produto.nome));
				}

				lista.appendChild(card);
			});
		} catch (err) {
			console.error(err);
            lista.innerHTML = "<p style=\"text-align:center;color:red;\">Erro ao carregar produtos.</p>";
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
