/* eslint-disable no-undef */
const API_URL = "http://localhost:8000";

// Captura o token da URL automaticamente (sem mostrar)
window.addEventListener("DOMContentLoaded", () => {
	const params = new URLSearchParams(window.location.search);
	const tokenFromUrl = params.get("token");
	const tokenInput = document.getElementById("token");

	if (tokenFromUrl && tokenInput) {
		tokenInput.value = tokenFromUrl;
	}
});

// Envio do formulário
document.getElementById("resetForm").addEventListener("submit", async (e) => {
	e.preventDefault();

	const token = document.getElementById("token").value;
	const novaSenha = document.getElementById("novaSenha").value;
	const msg = document.getElementById("msg");
	const form = document.getElementById("resetForm");
	const successBox = document.getElementById("successAnimation");

	msg.textContent = "";
	msg.className = "form-msg";

	if (!novaSenha || novaSenha.length < 6) {
		msg.textContent = "A senha deve ter pelo menos 6 caracteres.";
		msg.classList.add("msg-err");
		return;
	}

	try {
		const res = await fetch(`${API_URL}/auth/reset-password`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ token, novaSenha }),
		});

		const data = await res.json();

		if (res.ok) {
			// Esconde o formulário e mostra animação
			form.style.display = "none";
			successBox.style.display = "flex";

			// Redireciona após 2.5 segundos
			setTimeout(() => {
				window.location.href = "index.html";
			}, 2500);
		} else {
			msg.textContent = data.message || "Erro ao redefinir senha.";
			msg.classList.add("msg-err");
		}
	} catch {
		msg.textContent = "Erro de conexão com o servidor.";
		msg.classList.add("msg-err");
	}
});
