/* eslint-disable no-mixed-spaces-and-tabs */
/* eslint-disable no-undef */
document.addEventListener("DOMContentLoaded", () => {
	const themeToggle = document.getElementById("theme-toggle");
	const html = document.documentElement;

	const temaSalvo = localStorage.getItem("tema");
	if (temaSalvo) {
		html.setAttribute("data-theme", temaSalvo);
	} else {
		html.setAttribute("data-theme", "dark");
	}

	// Injeta estilos do interruptor (sol/lua) uma única vez
	if (!document.getElementById("theme-switch-styles")) {
		const style = document.createElement("style");
		style.id = "theme-switch-styles";
		style.textContent = `
			.btn-theme { display: inline-flex; align-items: center; justify-content: center; padding: 4px; border-radius: 999px; }
			.btn-theme .theme-switch { position: relative; display: inline-flex; align-items: center; justify-content: space-between; gap: 6px; width: 64px; height: 28px; border-radius: 999px; padding: 0 8px; background: var(--bg-surface); border: 1px solid var(--border-color); box-shadow: var(--shadow-1); }
			.btn-theme .theme-switch i { font-size: 0.95rem; color: var(--accent-contrast); opacity: 0.55; transition: opacity .2s ease; }
			.btn-theme .theme-switch .knob { position: absolute; top: 3px; left: 3px; width: 22px; height: 22px; border-radius: 50%; background: var(--accent-contrast); box-shadow: var(--shadow-2); transition: transform .2s ease; }
			html[data-theme="light"] .btn-theme .theme-switch .knob { transform: translateX(0px); }
			html[data-theme="dark"] .btn-theme .theme-switch .knob { transform: translateX(32px); }
			html[data-theme="light"] .btn-theme .theme-switch .fa-sun { opacity: 1; }
			html[data-theme="dark"] .btn-theme .theme-switch .fa-moon { opacity: 1; }
		`;
		document.head.appendChild(style);
	}

	// Renderiza o interruptor com ícones de sol e lua
	function renderSwitch() {
		if (!themeToggle) return;
		themeToggle.innerHTML = `
			<span class="theme-switch" aria-hidden="true">
				<i class="fa-solid fa-sun"></i>
				<span class="knob"></span>
				<i class="fa-solid fa-moon"></i>
			</span>
		`;
	}

	function atualizarIcone() {
		const atual = html.getAttribute("data-theme");
		if (themeToggle) {
			themeToggle.setAttribute("aria-pressed", atual === "dark" ? "true" : "false");
			themeToggle.setAttribute("title", "Alternar tema");
		}
	}

	renderSwitch();
	atualizarIcone();

	themeToggle.addEventListener("click", () => {
		const atual = html.getAttribute("data-theme") === "light" ? "dark" : "light";
		html.setAttribute("data-theme", atual);
		localStorage.setItem("tema", atual);
		atualizarIcone();
	});
});
