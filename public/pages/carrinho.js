/* eslint-disable no-undef */
document.addEventListener("DOMContentLoaded", () => {
    // Base da API: usa o mesmo host em produção; localhost em dev
    const API_URL = (/^https?:/i.test(window.location.origin)) ? window.location.origin : "http://localhost:8000";
	const lista = document.getElementById("checkout-lista");
	const totalEl = document.getElementById("checkout-total");
	const msg = document.getElementById("checkout-msg");
	const btnFinalizar = document.getElementById("btn-finalizar");
	const countEl = document.querySelector(".cart-count");

	let carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];

	function atualizarContador() {
		countEl.textContent = carrinho.length;
	}

	function salvarCarrinho() {
		localStorage.setItem("carrinho", JSON.stringify(carrinho));
		atualizarContador();
	}

	function renderizarCarrinho() {
		lista.innerHTML = "";
		if (carrinho.length === 0) {
			lista.innerHTML = "<p style='text-align:center;color:#aaa;'>Seu carrinho está vazio.</p>";
			totalEl.textContent = "Total: R$ 0,00";
			btnFinalizar.disabled = true;
			btnFinalizar.textContent = "Adicione itens para finalizar";
			return;
		}

		let total = 0;
		carrinho.forEach((produto, index) => {
			const item = document.createElement("div");
			item.className = "checkout-item";
			item.innerHTML = `
        <div class="item-nome">${produto.nome}</div>
        <div class="item-preco">R$ ${produto.preco}</div>
        <button class="btn-remove">Remover</button>
      `;
			item.querySelector(".btn-remove").addEventListener("click", () => {
				carrinho.splice(index, 1);
				salvarCarrinho();
				renderizarCarrinho();
			});
			lista.appendChild(item);
			total += parseFloat(produto.preco);
		});
		totalEl.textContent = `Total: R$ ${total.toFixed(2)}`;
		btnFinalizar.disabled = false;
		btnFinalizar.textContent = "Finalizar compra";
	}

    btnFinalizar.addEventListener("click", async () => {
        if (carrinho.length === 0) {
            msg.style.color = "red";
            msg.textContent = "Adicione produtos antes de finalizar a compra.";
            return;
        }
        // Calcula total atual
        const total = carrinho.reduce((acc, p) => acc + parseFloat(p.preco), 0);

        msg.style.color = "#2563eb"; // azul
        msg.textContent = "Iniciando pagamento...";

        try {
            const res = await fetch(`${API_URL}/checkout/stripe`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ total: Number(total.toFixed(2)), currency: "BRL" })
            });
            const data = await res.json();

            if (!res.ok) {
                msg.style.color = "red";
                msg.textContent = data.message || "Falha ao iniciar pagamento.";
                return;
            }

            // Redireciona para Stripe Checkout
            window.location.href = data.url;

            // Opcional: limpar carrinho local após iniciar checkout
            carrinho = [];
            salvarCarrinho();
            renderizarCarrinho();
        } catch {
            msg.style.color = "red";
            msg.textContent = "Erro de conexão ao iniciar pagamento.";
        }
    });

	renderizarCarrinho();
	atualizarContador();
});
