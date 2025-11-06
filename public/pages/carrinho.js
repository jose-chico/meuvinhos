/* eslint-disable no-undef */
document.addEventListener("DOMContentLoaded", () => {
    // Esta página não consome a API; remove variável não utilizada para evitar alerta do linter
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
			const precoNum = Number(produto.preco) || 0;
			const precoFmt = precoNum.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
			item.innerHTML = `
        <div class="item-nome">${produto.nome}</div>
        <div class="item-preco">${precoFmt}</div>
        <button class="btn-remove">Remover</button>
      `;
			item.querySelector(".btn-remove").addEventListener("click", () => {
				carrinho.splice(index, 1);
				salvarCarrinho();
				renderizarCarrinho();
			});
			lista.appendChild(item);
			total += precoNum;
		});
		totalEl.textContent = `Total: ${total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`;
		btnFinalizar.disabled = false;
		btnFinalizar.textContent = "Finalizar compra";
	}

    btnFinalizar.addEventListener("click", () => {
        if (carrinho.length === 0) {
            msg.style.color = "red";
            msg.textContent = "Adicione produtos antes de finalizar a compra.";
            return;
        }
        // Calcula total atual (preço numérico) e envia para página de CEP
        const total = carrinho.reduce((acc, p) => acc + (Number(p.preco) || 0), 0);
        const totalParam = encodeURIComponent(Number(total.toFixed(2)));
        msg.style.color = "#2563eb";
        msg.textContent = "Abrindo endereço para pagamento...";
        window.location.href = `/pages/checkout-cep.html?total=${totalParam}`;
    });

	renderizarCarrinho();
	atualizarContador();
});
