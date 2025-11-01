/* eslint-disable no-undef */
const API_URL = (/^https?:/i.test(window.location.origin)) ? window.location.origin : "http://localhost:8000";

document.getElementById("forgotForm").addEventListener("submit", async (e) => {
	e.preventDefault();
	const email = document.getElementById("email").value;
	const msg = document.getElementById("msg");
	msg.textContent = "";
	msg.className = "form-msg";

	try {
		const res = await fetch(`${API_URL}/auth/forgot-password`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email }),
		});
		const data = await res.json();

		if (res.ok) {
			msg.textContent = data.message || "E-mail de recuperação enviado!";
			msg.classList.add("msg-ok");
		} else {
			msg.textContent = data.message || "Erro ao enviar e-mail.";
			msg.classList.add("msg-err");
		}
	} catch {
		msg.textContent = "Erro de conexão.";
		msg.classList.add("msg-err");
	}
});
