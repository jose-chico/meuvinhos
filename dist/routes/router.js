"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
// src/routes/router.ts
const express_1 = require("express");
// Usuário / Auth (públicas)
const RegisterUsuarioController_1 = require("../controllers/createCliente/RegisterUsuarioController");
const LoginUsuarioController_1 = require("../controllers/createCliente/LoginUsuarioController");
// Reset de senha (públicas)
const ForgotPasswordController_1 = require("../controllers/auth/ForgotPasswordController");
// Middleware de autenticação
const authMiddleware_1 = require("../controllers/createCliente/authMiddleware");
// Cliente (protegidas)
const CreateClienteController_1 = require("../controllers/createCliente/CreateClienteController");
const ListandoClienteController_1 = require("../controllers/createCliente/ListandoClienteController");
const ListandoUmClienteController_1 = require("../controllers/createCliente/ListandoUmClienteController");
const DeletandoClienteController_1 = require("../controllers/createCliente/DeletandoClienteController");
const AtualizacaoClienteController_1 = require("../controllers/createCliente/AtualizacaoClienteController");
const CreateProdutoController_1 = require("../controllers/produto/CreateProdutoController");
const ListandoProdutoController_1 = require("../controllers/produto/ListandoProdutoController");
const ListandoUmProdutoController_1 = require("../controllers/produto/ListandoUmProdutoController");
const AtualizacaoProdutoController_1 = require("../controllers/produto/AtualizacaoProdutoController");
const DeletarProdutoController_1 = require("../controllers/produto/DeletarProdutoController");
const ResetPasswordController_1 = require("../controllers/auth/ResetPasswordController");
const CheckoutController_1 = require("../controllers/services/CheckoutController");
const StripeCheckoutController_1 = require("../controllers/services/StripeCheckoutController");
const router = (0, express_1.Router)();
exports.router = router;
/**
 * Rotas públicas
 */
router.post("/usuario", RegisterUsuarioController_1.RegisterUsuarioController);
router.post("/auth/login", LoginUsuarioController_1.LoginUsuarioController);
// Reset de senha
router.post("/auth/forgot-password", ForgotPasswordController_1.ForgotPasswordController);
router.post("/auth/reset-password", ResetPasswordController_1.ResetPasswordController);
// Checkout de pagamento (pública)
router.get("/checkout", CheckoutController_1.CheckoutController);
router.get("/checkout/stripe", StripeCheckoutController_1.StripeCheckoutController);
router.post("/checkout/stripe", StripeCheckoutController_1.StripeCheckoutControllerPost);
/**
 * Rotas protegidas (exigem Bearer Token)
 */
router.post("/cliente", authMiddleware_1.authMiddleware, CreateClienteController_1.CreateClienteController);
router.get("/clientes", authMiddleware_1.authMiddleware, ListandoClienteController_1.ListandoClienteController);
router.get("/cliente/:nome", authMiddleware_1.authMiddleware, ListandoUmClienteController_1.ListandoUmClienteController);
router.put("/cliente/:nome", authMiddleware_1.authMiddleware, AtualizacaoClienteController_1.AtualizacaoClienteController);
router.delete("/cliente/:nome", authMiddleware_1.authMiddleware, DeletandoClienteController_1.DeletarClienteController);
// Rotas protegidas de produto
router.post("/produto", authMiddleware_1.authMiddleware, CreateProdutoController_1.CreateProdutoController);
router.get("/produtos", ListandoProdutoController_1.ListandoProdutoController);
router.get("/produto/:nome", ListandoUmProdutoController_1.ListandoUmProdutoController);
router.put("/produto/:nome", authMiddleware_1.authMiddleware, AtualizacaoProdutoController_1.AtualizacaoProdutoController);
router.delete("/produto/:nome", authMiddleware_1.authMiddleware, DeletarProdutoController_1.DeletarProdutoController);
