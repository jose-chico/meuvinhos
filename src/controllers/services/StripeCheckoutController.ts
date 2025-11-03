import { Request, Response } from "express";
import Stripe from "stripe";

// Busca endereço por CEP na ViaCEP e retorna dados básicos
async function lookupCep(cepRaw: unknown): Promise<null | {
  cep: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
}> {
  try {
    const cep = String(cepRaw || "").replace(/\D/g, "");
    if (cep.length !== 8) return null;
    const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await r.json();
    if (!data || data.erro) return null;
    return {
      cep,
      logradouro: data.logradouro,
      bairro: data.bairro,
      localidade: data.localidade,
      uf: data.uf,
    };
  } catch {
    return null;
  }
}

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
  // Normaliza URLs: se variáveis de ambiente forem relativas, prefixa com appUrl
  const rawSuccessUrlEnv = (process.env.CHECKOUT_SUCCESS_URL || `${appUrl}/`).replace(/\/$/, "");
  const rawSuccessUrl = /^https?:\/\//.test(rawSuccessUrlEnv)
    ? rawSuccessUrlEnv
    : `${appUrl}${rawSuccessUrlEnv.startsWith('/') ? '' : '/'}${rawSuccessUrlEnv}`;
  const successUrl = /\{CHECKOUT_SESSION_ID\}/.test(rawSuccessUrl) || /session_id=/.test(rawSuccessUrl)
    ? rawSuccessUrl
    : `${rawSuccessUrl}${rawSuccessUrl.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`;
  const rawCancelUrlEnv = (process.env.CHECKOUT_CANCEL_URL || `${appUrl}/pages/carrinho.html`).replace(/\/$/, "");
  const cancelUrl = /^https?:\/\//.test(rawCancelUrlEnv)
    ? rawCancelUrlEnv
    : `${appUrl}${rawCancelUrlEnv.startsWith('/') ? '' : '/'}${rawCancelUrlEnv}`;

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
      // Tipar explicitamente os países permitidos para evitar erro TS (AllowedCountry[])
      const allowedCountriesGet = (
        String(process.env.SHIPPING_ALLOWED_COUNTRIES || 'BR')
          .split(',')
          .map(c => c.trim().toUpperCase())
          .filter(Boolean)
      ) as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[];
      session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: paymentMethods as any,
        locale: "pt-BR",
        billing_address_collection: 'required',
        shipping_address_collection: { allowed_countries: allowedCountriesGet },
        shipping_options: (() => {
          const rateId = process.env.SHIPPING_RATE_ID;
          if (rateId && rateId.trim().length > 0) {
            return [{ shipping_rate: rateId }];
          }
          const fixedCentsRaw = parseInt(String(process.env.SHIPPING_FIXED_AMOUNT_CENTS ?? '0'), 10);
          const fixedCents = Number.isFinite(fixedCentsRaw) && fixedCentsRaw >= 0 ? fixedCentsRaw : 0;
          const displayName = String(process.env.SHIPPING_DISPLAY_NAME || 'Entrega padrão');
          return [{
            shipping_rate_data: {
              display_name: displayName,
              type: 'fixed_amount',
              fixed_amount: { amount: fixedCents, currency: currency.toLowerCase() },
              delivery_estimate: {
                minimum: { unit: 'business_day', value: 3 },
                maximum: { unit: 'business_day', value: 10 }
              }
            }
          }];
        })(),
        success_url: successUrl,
        cancel_url: cancelUrl,
        payment_method_options: paymentMethodOptions,
        line_items: [
          {
            price_data: {
              currency: currency.toLowerCase(),
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
        const allowedCountriesGetFallback = (
          String(process.env.SHIPPING_ALLOWED_COUNTRIES || 'BR')
            .split(',')
            .map(c => c.trim().toUpperCase())
            .filter(Boolean)
        ) as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[];
        session = await stripe.checkout.sessions.create({
          mode: "payment",
          payment_method_types: ["card"],
          locale: "pt-BR",
          billing_address_collection: 'required',
          shipping_address_collection: { allowed_countries: allowedCountriesGetFallback },
          shipping_options: (() => {
            const rateId = process.env.SHIPPING_RATE_ID;
            if (rateId && rateId.trim().length > 0) {
              return [{ shipping_rate: rateId }];
            }
            const fixedCentsRaw = parseInt(String(process.env.SHIPPING_FIXED_AMOUNT_CENTS ?? '0'), 10);
            const fixedCents = Number.isFinite(fixedCentsRaw) && fixedCentsRaw >= 0 ? fixedCentsRaw : 0;
            const displayName = String(process.env.SHIPPING_DISPLAY_NAME || 'Entrega padrão');
            return [{
              shipping_rate_data: {
                display_name: displayName,
                type: 'fixed_amount',
                fixed_amount: { amount: fixedCents, currency: currency.toLowerCase() },
                delivery_estimate: {
                  minimum: { unit: 'business_day', value: 3 },
                  maximum: { unit: 'business_day', value: 10 }
                }
              }
            }];
          })(),
          success_url: successUrl,
          cancel_url: cancelUrl,
          line_items: [
            {
            price_data: {
              currency: currency.toLowerCase(),
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
  const rawSuccessUrlEnv = (process.env.CHECKOUT_SUCCESS_URL || `${appUrl}/`).replace(/\/$/, "");
  const rawSuccessUrl = /^https?:\/\//.test(rawSuccessUrlEnv)
    ? rawSuccessUrlEnv
    : `${appUrl}${rawSuccessUrlEnv.startsWith('/') ? '' : '/'}${rawSuccessUrlEnv}`;
  const successUrl = /\{CHECKOUT_SESSION_ID\}/.test(rawSuccessUrl) || /session_id=/.test(rawSuccessUrl)
    ? rawSuccessUrl
    : `${rawSuccessUrl}${rawSuccessUrl.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`;
  const rawCancelUrlEnv = (process.env.CHECKOUT_CANCEL_URL || `${appUrl}/pages/carrinho.html`).replace(/\/$/, "");
  const cancelUrl = /^https?:\/\//.test(rawCancelUrlEnv)
    ? rawCancelUrlEnv
    : `${appUrl}${rawCancelUrlEnv.startsWith('/') ? '' : '/'}${rawCancelUrlEnv}`;

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
      const allowedCountriesPost = (
        String(process.env.SHIPPING_ALLOWED_COUNTRIES || 'BR')
          .split(',')
          .map(c => c.trim().toUpperCase())
          .filter(Boolean)
      ) as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[];
      // Opcional: pré-preencher endereço e email através de Customer, baseado em CEP
      let customerId: string | undefined;
      const name = String(req.body?.name || '').trim() || undefined;
      const email = String(req.body?.email || '').trim() || undefined;
      const cepRaw = req.body?.cep;
      const numero = String(req.body?.numero || '').trim() || undefined;
      const complemento = String(req.body?.complemento || '').trim() || undefined;
      const via = await lookupCep(cepRaw);
      let prefillAddress: Stripe.AddressParam | undefined;
      if (via) {
        const line1 = [via.logradouro, numero].filter(Boolean).join(', ');
        prefillAddress = {
          line1: line1 || undefined,
          line2: complemento || undefined,
          city: via.localidade || undefined,
          state: via.uf || undefined,
          postal_code: via.cep,
          country: 'BR',
        };
      }

      try {
        if (email) {
          const existing = await stripe.customers.list({ email, limit: 1 });
          const found = existing.data?.[0];
          if (found) {
            customerId = found.id;
            // Atualiza endereço se obtido pelo CEP
            if (prefillAddress || name) {
              const params: Stripe.CustomerUpdateParams = {};
              if (name) params.name = name;
              if (prefillAddress) params.address = prefillAddress;
              if (prefillAddress && name) params.shipping = { name, address: prefillAddress };
              await stripe.customers.update(customerId, params);
            }
          } else {
            const params: Stripe.CustomerCreateParams = {};
            params.email = email;
            if (name) params.name = name;
            if (prefillAddress) params.address = prefillAddress;
            if (prefillAddress && name) params.shipping = { name, address: prefillAddress };
            const created = await stripe.customers.create(params);
            customerId = created.id;
          }
        } else if (prefillAddress || name) {
          const params: Stripe.CustomerCreateParams = {};
          if (name) params.name = name;
          if (prefillAddress) params.address = prefillAddress;
          if (prefillAddress && name) params.shipping = { name, address: prefillAddress };
          const created = await stripe.customers.create(params);
          customerId = created.id;
        }
      } catch (e) {
        console.warn('[Checkout POST] não foi possível preparar Customer para prefill:', String((e as any)?.message || e));
      }

      session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: paymentMethods as any,
        locale: "pt-BR",
        billing_address_collection: 'required',
        shipping_address_collection: { allowed_countries: allowedCountriesPost },
        customer: customerId,
        customer_email: customerId ? undefined : email,
        customer_update: customerId ? { address: 'auto', shipping: 'auto' } : undefined,
        shipping_options: (() => {
          const rateId = process.env.SHIPPING_RATE_ID;
          if (rateId && rateId.trim().length > 0) {
            return [{ shipping_rate: rateId }];
          }
          const fixedCentsRaw = parseInt(String(process.env.SHIPPING_FIXED_AMOUNT_CENTS ?? '0'), 10);
          const fixedCents = Number.isFinite(fixedCentsRaw) && fixedCentsRaw >= 0 ? fixedCentsRaw : 0;
          const displayName = String(process.env.SHIPPING_DISPLAY_NAME || 'Entrega padrão');
          return [{
            shipping_rate_data: {
              display_name: displayName,
              type: 'fixed_amount',
              fixed_amount: { amount: fixedCents, currency: currency.toLowerCase() },
              delivery_estimate: {
                minimum: { unit: 'business_day', value: 3 },
                maximum: { unit: 'business_day', value: 10 }
              }
            }
          }];
        })(),
        success_url: successUrl,
        cancel_url: cancelUrl,
        payment_method_options: paymentMethodOptions,
        metadata: {
          products: JSON.stringify(products),
          total: total.toString(),
          delivery_cep: via?.cep || undefined,
          delivery_bairro: via?.bairro || undefined,
          delivery_city: via?.localidade || undefined,
          delivery_state: via?.uf || undefined,
          delivery_line1: prefillAddress?.line1 || undefined,
          delivery_line2: prefillAddress?.line2 || undefined,
        },
        line_items: [
          {
            price_data: {
              currency: currency.toLowerCase(),
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
        const allowedCountriesPostFallback = (
          String(process.env.SHIPPING_ALLOWED_COUNTRIES || 'BR')
            .split(',')
            .map(c => c.trim().toUpperCase())
            .filter(Boolean)
        ) as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[];
        // Repete a lógica de customer no fallback
        let customerId: string | undefined;
        const name = String(req.body?.name || '').trim() || undefined;
        const email = String(req.body?.email || '').trim() || undefined;
        const cepRaw = req.body?.cep;
        const numero = String(req.body?.numero || '').trim() || undefined;
        const complemento = String(req.body?.complemento || '').trim() || undefined;
        const via = await lookupCep(cepRaw);
        let prefillAddress: Stripe.AddressParam | undefined;
        if (via) {
          const line1 = [via.logradouro, numero].filter(Boolean).join(', ');
          prefillAddress = {
            line1: line1 || undefined,
            line2: complemento || undefined,
            city: via.localidade || undefined,
            state: via.uf || undefined,
            postal_code: via.cep,
            country: 'BR',
          };
        }
        try {
          if (email) {
            const existing = await stripe.customers.list({ email, limit: 1 });
            const found = existing.data?.[0];
          if (found) {
            customerId = found.id;
            if (prefillAddress || name) {
              const params: Stripe.CustomerUpdateParams = {};
              if (name) params.name = name;
              if (prefillAddress) params.address = prefillAddress;
              if (prefillAddress && name) params.shipping = { name, address: prefillAddress };
              await stripe.customers.update(customerId, params);
            }
          } else {
            const params: Stripe.CustomerCreateParams = {};
            params.email = email;
            if (name) params.name = name;
            if (prefillAddress) params.address = prefillAddress;
            if (prefillAddress && name) params.shipping = { name, address: prefillAddress };
            const created = await stripe.customers.create(params);
            customerId = created.id;
          }
        } else if (prefillAddress || name) {
          const params: Stripe.CustomerCreateParams = {};
          if (name) params.name = name;
          if (prefillAddress) params.address = prefillAddress;
          if (prefillAddress && name) params.shipping = { name, address: prefillAddress };
          const created = await stripe.customers.create(params);
          customerId = created.id;
        }
        } catch (e) {
          console.warn('[Checkout POST] fallback: não foi possível preparar Customer para prefill:', String((e as any)?.message || e));
        }

        session = await stripe.checkout.sessions.create({
          mode: "payment",
          payment_method_types: ["card"],
          locale: "pt-BR",
          billing_address_collection: 'required',
          shipping_address_collection: { allowed_countries: allowedCountriesPostFallback },
          customer: customerId,
          customer_email: customerId ? undefined : email,
          customer_update: customerId ? { address: 'auto', shipping: 'auto' } : undefined,
          shipping_options: (() => {
            const rateId = process.env.SHIPPING_RATE_ID;
            if (rateId && rateId.trim().length > 0) {
              return [{ shipping_rate: rateId }];
            }
            const fixedCentsRaw = parseInt(String(process.env.SHIPPING_FIXED_AMOUNT_CENTS ?? '0'), 10);
            const fixedCents = Number.isFinite(fixedCentsRaw) && fixedCentsRaw >= 0 ? fixedCentsRaw : 0;
            const displayName = String(process.env.SHIPPING_DISPLAY_NAME || 'Entrega padrão');
            return [{
              shipping_rate_data: {
                display_name: displayName,
                type: 'fixed_amount',
                fixed_amount: { amount: fixedCents, currency: currency.toLowerCase() },
                delivery_estimate: {
                  minimum: { unit: 'business_day', value: 3 },
                  maximum: { unit: 'business_day', value: 10 }
                }
              }
            }];
          })(),
          success_url: successUrl,
          cancel_url: cancelUrl,
          metadata: {
            products: JSON.stringify(products),
            total: total.toString(),
            delivery_cep: via?.cep || undefined,
            delivery_bairro: via?.bairro || undefined,
            delivery_city: via?.localidade || undefined,
            delivery_state: via?.uf || undefined,
            delivery_line1: prefillAddress?.line1 || undefined,
            delivery_line2: prefillAddress?.line2 || undefined,
          },
          line_items: [
            {
            price_data: {
              currency: currency.toLowerCase(),
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