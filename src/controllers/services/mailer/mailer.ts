// src/services/mailer/mailer.ts
import nodemailer, { Transporter } from "nodemailer";

const env = (k: string) => (process.env[k] || "").trim();
const HOST = env("SMTP_HOST");
const PORT = Number(env("SMTP_PORT") || "587");
const USER = env("SMTP_USER");
const PASS = env("SMTP_PASS");
const FROM = env("MAIL_FROM") || "no-reply@example.com";
const FAKE = env("FAKE_MAIL") === "true"; // 👈 flag no .env

// usamos let para poder trocar por Ethereal se necessário
export let transporter: Transporter;

export async function verifySMTP(): Promise<void> {
	try {
		if (FAKE) {
			console.log("[mailer] FAKE_MAIL habilitado — usando Ethereal (modo dev)");
			const test = await nodemailer.createTestAccount();
			transporter = nodemailer.createTransport({
				host: test.smtp.host,
				port: test.smtp.port,
				secure: test.smtp.secure,
				auth: { user: test.user, pass: test.pass },
			});
			await transporter.verify();
			console.log("[mailer] Ethereal pronto (pré-visualização no console).");
			return;
		}

		console.log("[mailer] host:", HOST || "(none)", "port:", PORT, "from:", FROM);
		transporter = nodemailer.createTransport({
			host: HOST || undefined,
			port: HOST ? PORT : 587,
			secure: HOST ? PORT === 465 : false,
			auth: USER && PASS ? { user: USER, pass: PASS } : undefined,
		});

		await transporter.verify();
		console.log("[mailer] SMTP OK");
	} catch (e) {
		console.error("[mailer] SMTP verify error:", e);
		console.log("[mailer] Habilitando fallback Ethereal (somente DEV)...");
		const test = await nodemailer.createTestAccount();
		transporter = nodemailer.createTransport({
			host: test.smtp.host,
			port: test.smtp.port,
			secure: test.smtp.secure,
			auth: { user: test.user, pass: test.pass },
		});
		await transporter.verify();
		console.log("[mailer] Ethereal pronto (pré-visualização no console).");
	}
}

export async function sendMail(to: string, subject: string, html: string): Promise<void> {
	const info = await transporter.sendMail({ from: FROM, to, subject, html });
	const url = nodemailer.getTestMessageUrl(info);
	if (url) console.log("[mailer] Preview Ethereal:", url);
}
