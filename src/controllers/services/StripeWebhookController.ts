import { Request, Response } from 'express';
import Stripe from 'stripe';
import { prisma } from '../../database/client';

// Não definir apiVersion para usar a versão padrão do SDK/conta
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const StripeWebhookController = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!endpointSecret) {
    console.error('STRIPE_WEBHOOK_SECRET não configurado');
    return res.status(400).send('Webhook secret não configurado');
  }

  let event: Stripe.Event;

  try {
    // Verificar assinatura do webhook
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err: any) {
    console.error('Erro na verificação do webhook:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // Processar eventos do Stripe
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      default:
        console.log(`Evento não tratado: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('💰 Pagamento bem-sucedido:', paymentIntent.id);

  try {
    // Buscar dados da sessão de checkout relacionada
    const sessions = await stripe.checkout.sessions.list({
      payment_intent: paymentIntent.id,
      limit: 1,
    });

    const session = sessions.data[0];
    
    // Extrair produtos do metadata da sessão
    let products = [];
    if (session?.metadata?.products) {
      try {
        products = JSON.parse(session.metadata.products);
      } catch (e) {
        console.error('Erro ao parsear produtos do metadata:', e);
      }
    }

    // Determinar método de pagamento
    let paymentMethod = 'unknown';
    if (paymentIntent.payment_method) {
      const pm = await stripe.paymentMethods.retrieve(paymentIntent.payment_method as string);
      paymentMethod = pm.type; // 'card', 'pix', etc.
    }

    // Preparar endereço de entrega em formato JSON serializável
    const shippingAddressJson = session?.customer_details?.address
      ? {
          city: session.customer_details.address.city || null,
          country: session.customer_details.address.country || null,
          line1: session.customer_details.address.line1 || null,
          line2: session.customer_details.address.line2 || null,
          postal_code: session.customer_details.address.postal_code || null,
          state: session.customer_details.address.state || null,
        }
      : null;

    // Salvar pagamento no banco
    const payment = await prisma.payment.create({
      data: {
        stripePaymentId: paymentIntent.id,
        stripeSessionId: session?.id || null,
        amount: paymentIntent.amount / 100, // Stripe usa centavos
        currency: paymentIntent.currency.toUpperCase(),
        status: paymentIntent.status,
        paymentMethod: paymentMethod,
        customerEmail: session?.customer_details?.email || null,
        customerName: session?.customer_details?.name || null,
        products: products,
        metadata: {
          stripeMetadata: paymentIntent.metadata,
          sessionMetadata: session?.metadata || {},
          shippingAddress: shippingAddressJson,
          shippingPhone: session?.customer_details?.phone || null,
          shippingName: session?.customer_details?.name || null,
          shippingAmount: (session as any)?.shipping_cost?.amount_total ?? null,
        },
        paidAt: new Date(),
      },
    });

    console.log('✅ Pagamento salvo no banco:', payment.id);

    // TODO: Aqui você pode adicionar lógica adicional como:
    // - Atualizar estoque dos produtos
    // - Enviar email de confirmação
    // - Integrar com sistema de entrega

  } catch (error) {
    console.error('Erro ao salvar pagamento:', error);
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log('🛒 Checkout completado:', session.id);
  
  // Este evento é disparado quando o checkout é finalizado
  // Mas o pagamento pode ainda estar processando (especialmente para Pix)
  // O evento payment_intent.succeeded é mais confiável para confirmar o pagamento
}