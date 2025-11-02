import { Request, Response } from "express";
import Stripe from "stripe";

// Util: tenta converter valores em BRL (suporta strings "99,90")
function parsePrice(input: any): number {
  if (typeof input === 'number') return input;
  if (typeof input === 'string') {
    const cleaned = input
      .replace(/[^\d.,-]/g, '')
      .replace(/\.(?=\d{3}(\D|$))/g, '')
      .replace(',', '.');
    const num = parseFloat(cleaned);
    return Number.isFinite(num) ? num : 0;
  }
  return 0;
}

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
    // Flags de métodos: Pix e Boleto (true/false/auto)
    const enablePixEnv = String(process.env.ENABLE_PIX ?? 'auto').toLowerCase();
    const enableBoletoEnv = String(process.env.ENABLE_BOLETO ?? 'auto').toLowerCase();
    const allowPix = enablePixEnv === 'true' ? true : enablePixEnv === 'false' ? false : true;
    const allowBoleto = enableBoletoEnv === 'true' ? true : enableBoletoEnv === 'false' ? false : true;

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
    const successUrl = (process.env.CHECKOUT_SUCCESS_URL || `${appUrl}/`).replace(/\/$/, "");
    const cancelUrl = (process.env.CHECKOUT_CANCEL_URL || `${appUrl}/pages/carrinho.html`).replace(/\/$/, "");

    const amountInCents = Math.round(total * 100);
    const boletoExpiresDaysRaw = parseInt(String(process.env.BOLETO_EXPIRES_AFTER_DAYS ?? '3'), 10);
    const boletoExpiresDays = Number.isFinite(boletoExpiresDaysRaw) && boletoExpiresDaysRaw > 0 ? boletoExpiresDaysRaw : 3;
    const currency = (String(req.query.currency || "BRL").toUpperCase());

    console.log('[Checkout GET] total, currency, allowPix, allowBoleto, boletoExpiresDays, mode', { total, currency, allowPix, allowBoleto, boletoExpiresDays, mode: isLiveKey ? 'live' : 'test' });
    let session;
    try {
      // Métodos solicitados: sempre 'card', adiciona Pix/Boleto se permitido e BRL
      const paymentMethods: string[] = ['card'];
      if (currency === 'BRL' && allowPix) paymentMethods.push('pix');
      if (currency === 'BRL' && allowBoleto) paymentMethods.push('boleto');
      const paymentMethodOptions: any = {};
      if (paymentMethods.includes('boleto')) {
        paymentMethodOptions.boleto = { expires_after_days: boletoExpiresDays };
      }
      session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: paymentMethods as any,
        locale: "pt-BR",
        success_url: successUrl,
        cancel_url: cancelUrl,
        payment_method_options: paymentMethodOptions,
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
      console.warn("[Checkout GET] erro ao criar sessão com métodos solicitados:", msg, "— tentando fallback para cartão apenas.");
      try {
        session = await stripe.checkout.sessions.create({
          mode: "payment",
          payment_method_types: ["card"],
          locale: "pt-BR",
          success_url: successUrl,
          cancel_url: cancelUrl,
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
      } catch (e2: any) {
        console.error('[Checkout GET] fallback cartão falhou', String(e2?.message || e2));
        throw e2;
      }
    }

    console.log('[Checkout GET] sessão criada', { id: session.id, payment_method_types: session.payment_method_types, currency: session.currency });
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
    // Flags de métodos: Pix e Boleto (true/false/auto)
    const enablePixEnv = String(process.env.ENABLE_PIX ?? 'auto').toLowerCase();
    const enableBoletoEnv = String(process.env.ENABLE_BOLETO ?? 'auto').toLowerCase();
    const allowPix = enablePixEnv === 'true' ? true : enablePixEnv === 'false' ? false : true;
    const allowBoleto = enableBoletoEnv === 'true' ? true : enableBoletoEnv === 'false' ? false : true;

    // Total enviado pelo cliente; se inválido, tenta calcular a partir dos produtos
    let total = Number(req.body?.total);
    const rawProducts = req.body?.products;
    const products = Array.isArray(rawProducts) ? rawProducts : [];
    if (!Number.isFinite(total) || total <= 0) {
      const sumFromProducts = products.reduce((acc: number, p: any) => acc + parsePrice(p?.preco ?? p?.valor), 0);
      if (sumFromProducts > 0) {
        total = Number(sumFromProducts.toFixed(2));
      } else {
        return res.status(400).json({ message: "Total inválido para checkout." });
      }
    }

    const currency = String(req.body?.currency || "BRL").toUpperCase();

    // Construção da origem dinâmica
    const forwardedProto = (req.headers["x-forwarded-proto"] as string) || undefined;
    const protocol = forwardedProto || req.protocol || "http";
    const host = req.get("host") || "localhost:8000";
    const origin = `${protocol}://${host}`;
    const appUrl = (process.env.APP_URL || origin).replace(/\/$/, "");
    const successUrl = (process.env.CHECKOUT_SUCCESS_URL || `${appUrl}/`).replace(/\/$/, "");
    const cancelUrl = (process.env.CHECKOUT_CANCEL_URL || `${appUrl}/pages/carrinho.html`).replace(/\/$/, "");

    const amountInCents = Math.round(total * 100);
    const boletoExpiresDaysRaw = parseInt(String(process.env.BOLETO_EXPIRES_AFTER_DAYS ?? '3'), 10);
    const boletoExpiresDays = Number.isFinite(boletoExpiresDaysRaw) && boletoExpiresDaysRaw > 0 ? boletoExpiresDaysRaw : 3;

    // Extrair produtos do carrinho (se enviados)
    // já normalizado acima
    
    console.log('[Checkout POST] total, currency, allowPix, allowBoleto, boletoExpiresDays, mode', { total, currency, allowPix, allowBoleto, boletoExpiresDays, mode: isLiveKey ? 'live' : 'test' });
    let session;
    try {
      const paymentMethods: string[] = ['card'];
      if (currency === 'BRL' && allowPix) paymentMethods.push('pix');
      if (currency === 'BRL' && allowBoleto) paymentMethods.push('boleto');
      const paymentMethodOptions: any = {};
      if (paymentMethods.includes('boleto')) {
        paymentMethodOptions.boleto = { expires_after_days: boletoExpiresDays };
      }
      session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: paymentMethods as any,
        locale: "pt-BR",
        success_url: successUrl,
        cancel_url: cancelUrl,
        payment_method_options: paymentMethodOptions,
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
      console.warn("[Checkout POST] erro ao criar sessão com métodos solicitados:", msg, "— tentando fallback para cartão apenas.");
      try {
        session = await stripe.checkout.sessions.create({
          mode: "payment",
          payment_method_types: ["card"],
          locale: "pt-BR",
          success_url: successUrl,
          cancel_url: cancelUrl,
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
      } catch (e2: any) {
        console.error('[Checkout POST] fallback cartão falhou', String(e2?.message || e2));
        throw e2;
      }
    }

    console.log('[Checkout POST] sessão criada', { id: session.id, payment_method_types: session.payment_method_types, currency: session.currency });
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