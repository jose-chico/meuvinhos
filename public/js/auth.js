/* eslint-disable no-undef */
const API_URL = (/^https?:/i.test(window.location.origin)) ? window.location.origin : "http://localhost:8000";

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

async function doLogin(email, senha) {
	const msg = document.getElementById("msg");
	msg.textContent = "";
	msg.className = "form-msg";

	try {
		const res = await fetch(`${API_URL}/auth/login`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, senha }),
		});

		const data = await res.json();

		if (res.ok) {
			localStorage.setItem("token", data.token);
			window.location.href = "dashboard.html";
		} else {
			msg.textContent = data.message || "Erro no login.";
			msg.classList.add("msg-err");
		}
	} catch {
		msg.textContent = "Erro de conexão com o servidor.";
		msg.classList.add("msg-err");
	}
}

async function doRegister(email, senha) {
	const msg = document.getElementById("msg");
	msg.textContent = "";
	msg.className = "form-msg";

	try {
		const res = await fetch(`${API_URL}/usuario`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, senha }),
		});

		const data = await res.json();

		if (res.ok) {
			msg.textContent = data.message || "Usuário cadastrado!";
			msg.classList.add("msg-ok");
			setTimeout(() => {
				window.location.href = "index.html";
			}, 1500);
		} else {
			msg.textContent = data.message || "Erro ao cadastrar.";
			msg.classList.add("msg-err");
		}
	} catch {
		msg.textContent = "Erro de conexão com o servidor.";
		msg.classList.add("msg-err");
	}
}

if (loginForm) {
	loginForm.addEventListener("submit", (e) => {
		e.preventDefault();
		const email = (document.getElementById("email")).value;
		const senha = (document.getElementById("senha")).value;
		doLogin(email, senha);
	});
}

if (registerForm) {
	registerForm.addEventListener("submit", (e) => {
		e.preventDefault();
		const email = (document.getElementById("email")).value;
		const senha = (document.getElementById("senha")).value;
		doRegister(email, senha);
	});
}
