/* eslint-disable no-undef */
/* eslint-disable indent */
document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("produto-container");
  const countEl = document.querySelector(".cart-count");
  const btnCart = document.getElementById("btnCart"); // corrigido

  let carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];

  function atualizarContador() {
    countEl.textContent = carrinho.length;
  }

  function salvarCarrinho() {
    localStorage.setItem("carrinho", JSON.stringify(carrinho));
    atualizarContador();
  }

  function mostrarToast(msg) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  }

  // 🔹 Corrigido: botão do carrinho agora usa o id correto
  if (btnCart) {
    btnCart.addEventListener("click", () => {
      window.location.href = "carrinho.html";
    });
  }

  atualizarContador();

  // Pega o nome do produto da URL
  const params = new URLSearchParams(window.location.search);
  const produtoNome = params.get("nome");

  if (!produtoNome) {
    container.innerHTML = "<p style='text-align:center;color:#ff4d4d;'>Produto não encontrado.</p>";
    return;
  }

  async function buscarProduto() {
    try {
      const token = localStorage.getItem("token");
      const API_URL = (/^https?:/i.test(window.location.origin)) ? window.location.origin : "http://localhost:8000";
      const res = await fetch(`${API_URL}/produto/${produtoNome}`, {
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.produto || null;
    } catch {
      return null;
    }
  }

  const produto = await buscarProduto();
  if (!produto) {
    container.innerHTML = "<p style='text-align:center;color:#ff4d4d;'>Produto não encontrado.</p>";
    return;
  }

  const precoFinal = produto.desconto
    ? (Number(produto.valor) || 0) * 0.8
    : (Number(produto.valor) || 0);

  container.innerHTML = `
    <div class="produto-detalhe-card">
      <div class="produto-detalhe-imagem">
        <img src="${produto.imagem}" alt="${produto.nome}">
      </div>
      <div class="produto-detalhe-info">
        <h1>${produto.nome}</h1>
        
        <div class="produto-detalhes">
          <div class="detalhe-item">
            <span class="detalhe-label">Produto:</span>
            <span class="detalhe-valor">${produto.produto || "—"}</span>
          </div>
          
          <div class="detalhe-item">
            <span class="detalhe-label">País/Região:</span>
            <span class="detalhe-valor">${produto.pais || "—"}${produto.regiao ? " / " + produto.regiao : ""}</span>
          </div>
          
          <div class="detalhe-item">
            <span class="detalhe-label">Safra:</span>
            <span class="detalhe-valor">${produto.safra || "—"}</span>
          </div>
          
          <div class="detalhe-item">
            <span class="detalhe-label">Teor:</span>
            <span class="detalhe-valor">${produto.teor ? produto.teor + "%" : "—"}</span>
          </div>
          
          <div class="detalhe-item preco-item">
            <span class="detalhe-label">Preço:</span>
            <span class="detalhe-valor preco-destaque">R$ ${precoFinal.toFixed(2)}</span>
          </div>
          
          <div class="detalhe-item">
            <span class="detalhe-label">Harmonização:</span>
            <span class="detalhe-valor">${produto.harmonizacao || "—"}</span>
          </div>
          
          <div class="detalhe-item descricao-item">
            <span class="detalhe-label">Descrição:</span>
            <span class="detalhe-valor">${produto.descricao || "Descrição não disponível."}</span>
          </div>
        </div>
        
        <div class="acoes-produto">
          <button id="btnAddCarrinho" class="btn-add-cart">
            <i class="fa-solid fa-cart-plus"></i> Adicionar ao carrinho
          </button>
          <a href="index.html" class="btn-voltar">
            <i class="fa-solid fa-arrow-left"></i> Voltar
          </a>
        </div>
      </div>
    </div>
  `;

  document.getElementById("btnAddCarrinho").addEventListener("click", () => {
    carrinho.push({
      id: produto.id,
      nome: produto.nome,
      preco: precoFinal.toFixed(2),
      imagem: produto.imagem,
    });
    salvarCarrinho();
    mostrarToast(`${produto.nome} adicionado ao carrinho!`);
  });
});
