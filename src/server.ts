import express from "express";
import { router } from "./routes/router";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";
import { verifySMTP } from "./controllers/services/mailer/mailer"; // ✅ caminho corrigido

dotenv.config();

const PORT = process.env.PORT || 8000;
const app = express();

// Respeita cabeçalhos X-Forwarded-* quando estiver atrás de proxy/CDN
app.set("trust proxy", 1);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));
app.use(router);

// Inicializa o verificador do Mailer
verifySMTP();

app.listen(PORT, () => {
	console.log(`Server Rodando na Porta ${PORT}`);
});
