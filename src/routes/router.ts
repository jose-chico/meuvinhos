// src/routes/router.ts
import { Router } from "express";

// Usuário / Auth (públicas)
import { RegisterUsuarioController } from "../controllers/createCliente/RegisterUsuarioController";
import { LoginUsuarioController } from "../controllers/createCliente/LoginUsuarioController";

// Reset de senha (públicas)
import { ForgotPasswordController } from "../controllers/auth/ForgotPasswordController";


// Middleware de autenticação
import { authMiddleware } from "../controllers/createCliente/authMiddleware";

// Cliente (protegidas)
import { CreateClienteController } from "../controllers/createCliente/CreateClienteController";
import { ListandoClienteController } from "../controllers/createCliente/ListandoClienteController";
import { ListandoUmClienteController } from "../controllers/createCliente/ListandoUmClienteController";
import { DeletarClienteController } from "../controllers/createCliente/DeletandoClienteController";
import { AtualizacaoClienteController } from "../controllers/createCliente/AtualizacaoClienteController";

import { CreateProdutoController } from "../controllers/produto/CreateProdutoController";
import { ListandoProdutoController } from "../controllers/produto/ListandoProdutoController";
import { ListandoUmProdutoController } from "../controllers/produto/ListandoUmProdutoController";
import { AtualizacaoProdutoController } from "../controllers/produto/AtualizacaoProdutoController";
import { DeletarProdutoController } from "../controllers/produto/DeletarProdutoController";
import { ResetPasswordController } from "../controllers/auth/ResetPasswordController";
import { CheckoutController } from "../controllers/services/CheckoutController";
import { StripeCheckoutController, StripeCheckoutControllerPost } from "../controllers/services/StripeCheckoutController";
import { StripeWebhookController } from "../controllers/services/StripeWebhookController";
import { GetPaymentBySessionController } from "../controllers/services/PaymentController";

const router = Router();

/**
 * Rotas públicas
 */
router.post("/usuario", RegisterUsuarioController);
router.post("/auth/login", LoginUsuarioController);

// Reset de senha
router.post("/auth/forgot-password", ForgotPasswordController);
router.post("/auth/reset-password", ResetPasswordController);
// Checkout de pagamento (pública)
router.get("/checkout", CheckoutController);
router.get("/checkout/stripe", StripeCheckoutController);
router.post("/checkout/stripe", StripeCheckoutControllerPost);

// Webhook do Stripe (pública)
router.post("/webhook/stripe", StripeWebhookController);

// Buscar dados do pagamento (pública)
router.get("/payment/:session_id", GetPaymentBySessionController);

/**
 * Rotas protegidas (exigem Bearer Token)
 */
router.post("/cliente", authMiddleware, CreateClienteController);
router.get("/clientes", authMiddleware, ListandoClienteController);
router.get("/cliente/:nome", authMiddleware, ListandoUmClienteController);
router.put("/cliente/:nome", authMiddleware, AtualizacaoClienteController);
router.delete("/cliente/:nome", authMiddleware, DeletarClienteController);

// Rotas protegidas de produto
router.post("/produto", authMiddleware, CreateProdutoController);
router.get("/produtos", ListandoProdutoController);
router.get("/produto/:nome", ListandoUmProdutoController);
router.put("/produto/:nome", authMiddleware, AtualizacaoProdutoController);
router.delete("/produto/:nome", authMiddleware, DeletarProdutoController);

export { router };
