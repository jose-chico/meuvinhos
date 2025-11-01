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

	function atualizarIcone() {
		const atual = html.getAttribute("data-theme");
		themeToggle.innerHTML =
      atual === "light"
      	? "<i class=\"fa-solid fa-moon\"></i>"
      	: "<i class=\"fa-solid fa-sun\"></i>";
	}

	atualizarIcone();

	themeToggle.addEventListener("click", () => {
		const atual = html.getAttribute("data-theme") === "light" ? "dark" : "light";
		html.setAttribute("data-theme", atual);
		localStorage.setItem("tema", atual);
		atualizarIcone();
	});
});
