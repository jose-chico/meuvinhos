/* eslint-disable no-undef */
// Verificação de idade 18+ com overlay bloqueando navegação até confirmar
// Mostra apenas uma vez por navegador (usa localStorage: age_verified=true)

(function () {
  const KEY = "age_verified";
  try {
    const verified = localStorage.getItem(KEY) === "true";
    if (verified) return; // já verificado, segue normalmente
  } catch (e) {
    console.warn("AgeGate: localStorage indisponível (get)", e);
  }

  function createOverlay() {
    const overlay = document.createElement("div");
    overlay.className = "age-gate-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Verificação de idade");

    overlay.innerHTML = `
      <div class="age-gate-modal">
        <div class="age-brand">🍷 Casa de Vinho</div>
        <h2 class="age-title">Você tem mais de 18 anos?</h2>
        <div class="age-actions">
          <button class="age-btn age-no" aria-label="Não, tenho menos de 18">Não</button>
          <button class="age-btn age-yes" aria-label="Sim, tenho 18 ou mais">Sim</button>
        </div>
        <p class="age-disclaimer">Se beber, não dirija. Não compartilhe este conteúdo com menores de 18 anos.</p>
        <p class="age-msg" aria-live="polite" style="display:none"></p>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";

    const yesBtn = overlay.querySelector(".age-yes");
    const noBtn = overlay.querySelector(".age-no");
    const msg = overlay.querySelector(".age-msg");

    function approve() {
      try { localStorage.setItem(KEY, "true"); } catch (e) {
        console.warn("AgeGate: localStorage indisponível (set)", e);
      }
      document.body.style.overflow = "";
      overlay.remove();
    }

    function deny() {
      // Mantém overlay visível e reforça mensagem. Pergunta permanece.
      if (msg) {
        msg.style.display = "block";
        msg.textContent = "Conteúdo restrito a maiores de 18 anos.";
      }
    }

    if (yesBtn) yesBtn.addEventListener("click", approve);
    if (noBtn) noBtn.addEventListener("click", deny);

    // Acessibilidade: foco inicial no botão "Sim"
    setTimeout(() => { if (yesBtn) yesBtn.focus(); }, 0);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createOverlay);
  } else {
    createOverlay();
  }
})();