import { Request, Response } from "express";
import Stripe from "stripe";

export const StripeCheckoutController = async (req: Request, res: Response) => {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (typeof secretKey !== "string" || secretKey.trim().length === 0) {
      return res.status(500).json({ message: "Stripe não configurado. Defina STRIPE_SECRET_KEY no .env." });
    }

    // Proteção: não permitir chave LIVE fora de produção
    const isLiveKey = secretKey.startsWith("sk_live_");
    const isProduction = (process.env.NODE_ENV || "development") === "production";
    if (isLiveKey && !isProduction) {
      return res.status(400).json({
        message: "Chave live detectada em ambiente não-produtivo. Use sk_test_... localmente ou defina NODE_ENV=production no servidor."
      });
    }

    const stripe = new Stripe(secretKey);
    // Flag ENABLE_PIX controla oferta de Pix: "true" habilita, "false" desabilita, default (auto) tenta com fallback
    const enablePixEnv = String(process.env.ENABLE_PIX ?? 'auto').toLowerCase();
    const allowPix = enablePixEnv === 'true' ? true : enablePixEnv === 'false' ? false : true;

    const totalStr = String(req.query.total ?? "0");
    const total = parseFloat(totalStr);
    if (!Number.isFinite(total) || total <= 0) {
      return res.status(400).json({ message: "Total inválido para checkout." });
    }

    // Construção da origem dinâmica
    const forwardedProto = (req.headers["x-forwarded-proto"] as string) || undefined;
    const protocol = forwardedProto || req.protocol || "http";
    const host = req.get("host") || "localhost:8000";
    const origin = `${protocol}://${host}`;
    const appUrl = (process.env.APP_URL || origin).replace(/\/$/, "");

    const amountInCents = Math.round(total * 100);
    const currency = (String(req.query.currency || "BRL").toUpperCase());

    console.log('[Checkout GET] total, currency, allowPix, mode', { total, currency, allowPix, mode: isLiveKey ? 'live' : 'test' });
    let session;
    try {
      // Tentativa com cartão + Pix
      session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: allowPix ? ["card", "pix"] : ["card"],
        locale: "pt-BR",
        success_url: `${appUrl}/pages/confirmacao-pagamento.html?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/pages/carrinho.html`,
        line_items: [
          {
            price_data: {
              currency,
              product_data: { name: "Pedido Casa de Vinho" },
              unit_amount: amountInCents,
            },
            quantity: 1,
          },
        ],
      });
    } catch (e: any) {
      const msg = String(e?.message || "");
      // Fallback: se Pix não estiver habilitado na conta, tenta apenas cartão
      if (allowPix && (msg.toLowerCase().includes("pix is invalid") || msg.toLowerCase().includes("payment method type provided: pix"))) {
        console.warn("Pix não habilitado na Stripe. Fazendo fallback para 'card' apenas.");
        session = await stripe.checkout.sessions.create({
          mode: "payment",
          payment_method_types: ["card"],
          locale: "pt-BR",
          success_url: `${appUrl}/pages/confirmacao-pagamento.html?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${appUrl}/pages/carrinho.html`,
          line_items: [
            {
              price_data: {
                currency,
                product_data: { name: "Pedido Casa de Vinho" },
                unit_amount: amountInCents,
              },
              quantity: 1,
            },
          ],
        });
      } else {
        console.error('[Checkout GET] erro ao criar sessão', msg);
        throw e;
      }
    }

    return res.status(200).json({ message: "Stripe Checkout iniciado", url: session.url });
  } catch (err: unknown) {
    let message = "Erro ao iniciar checkout com Stripe.";
    if (err instanceof Error) {
      message = err.message;
    } else if (typeof err === "string") {
      message = err;
    }
    return res.status(500).json({ message });
  }
};

export const StripeCheckoutControllerPost = async (req: Request, res: Response) => {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (typeof secretKey !== "string" || secretKey.trim().length === 0) {
      return res.status(500).json({ message: "Stripe não configurado. Defina STRIPE_SECRET_KEY no .env." });
    }

    const isLiveKey = secretKey.startsWith("sk_live_");
    const isProduction = (process.env.NODE_ENV || "development") === "production";
    if (isLiveKey && !isProduction) {
      return res.status(400).json({
        message: "Chave live detectada em ambiente não-produtivo. Use sk_test_... localmente ou defina NODE_ENV=production no servidor."
      });
    }

    const stripe = new Stripe(secretKey);
    // Flag ENABLE_PIX controla oferta de Pix: "true" habilita, "false" desabilita, default (auto) tenta com fallback
    const enablePixEnv = String(process.env.ENABLE_PIX ?? 'auto').toLowerCase();
    const allowPix = enablePixEnv === 'true' ? true : enablePixEnv === 'false' ? false : true;

    const total = Number(req.body?.total);
    if (!Number.isFinite(total) || total <= 0) {
      return res.status(400).json({ message: "Total inválido para checkout." });
    }

    const currency = String(req.body?.currency || "BRL").toUpperCase();

    // Construção da origem dinâmica
    const forwardedProto = (req.headers["x-forwarded-proto"] as string) || undefined;
    const protocol = forwardedProto || req.protocol || "http";
    const host = req.get("host") || "localhost:8000";
    const origin = `${protocol}://${host}`;
    const appUrl = (process.env.APP_URL || origin).replace(/\/$/, "");

    const amountInCents = Math.round(total * 100);

    // Extrair produtos do carrinho (se enviados)
    const products = req.body?.products || [];
    
    console.log('[Checkout POST] total, currency, allowPix, mode', { total, currency, allowPix, mode: isLiveKey ? 'live' : 'test' });
    let session;
    try {
      session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: allowPix ? ["card", "pix"] : ["card"],
        locale: "pt-BR",
        success_url: `${appUrl}/pages/confirmacao-pagamento.html?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/pages/carrinho.html`,
        metadata: {
          products: JSON.stringify(products),
          total: total.toString(),
        },
        line_items: [
          {
            price_data: {
              currency,
              product_data: { name: "Pedido Casa de Vinho" },
              unit_amount: amountInCents,
            },
            quantity: 1,
          },
        ],
      });
    } catch (e: any) {
      const msg = String(e?.message || "");
      if (allowPix && (msg.toLowerCase().includes("pix is invalid") || msg.toLowerCase().includes("payment method type provided: pix"))) {
        console.warn("Pix não habilitado na Stripe. Fazendo fallback para 'card' apenas.");
        session = await stripe.checkout.sessions.create({
          mode: "payment",
          payment_method_types: ["card"],
          locale: "pt-BR",
          success_url: `${appUrl}/pages/confirmacao-pagamento.html?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${appUrl}/pages/carrinho.html`,
          metadata: {
            products: JSON.stringify(products),
            total: total.toString(),
          },
          line_items: [
            {
              price_data: {
                currency,
                product_data: { name: "Pedido Casa de Vinho" },
                unit_amount: amountInCents,
              },
              quantity: 1,
            },
          ],
        });
      } else {
        console.error('[Checkout POST] erro ao criar sessão', msg);
        throw e;
      }
    }

    return res.status(200).json({ message: "Stripe Checkout iniciado", url: session.url });
  } catch (err: unknown) {
    let message = "Erro ao iniciar checkout com Stripe.";
    if (err instanceof Error) {
      message = err.message;
    } else if (typeof err === "string") {
      message = err;
    }
    return res.status(500).json({ message });
  }
};