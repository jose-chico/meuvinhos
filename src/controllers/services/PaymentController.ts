import { Request, Response } from 'express';
import { prisma } from '../../database/client';
import Stripe from 'stripe';

export const GetPaymentBySessionController = async (req: Request, res: Response) => {
  try {
    const { session_id } = req.params;

    if (!session_id) {
      return res.status(400).json({ error: 'session_id é obrigatório' });
    }

    // Buscar pagamento pelo session_id
    const payment = await prisma.payment.findFirst({
      where: {
        stripeSessionId: session_id,
      },
    });

    if (!payment) {
      // Fallback: buscar diretamente a sessão no Stripe
      const secretKey = process.env.STRIPE_SECRET_KEY;
      if (!secretKey) {
        return res.status(404).json({ error: 'Pagamento não encontrado' });
      }
      const stripe = new Stripe(secretKey);
      try {
        const session = await stripe.checkout.sessions.retrieve(session_id);
        // Extrair produtos do metadata
        let products: any[] = [];
        if (session.metadata && session.metadata.products) {
          try {
            products = JSON.parse(session.metadata.products);
          } catch {}
        }
        return res.json({
          id: session.id,
          amount: typeof session.amount_total === 'number' ? session.amount_total / 100 : 0,
          currency: (session.currency || 'BRL').toUpperCase(),
          status: session.payment_status === 'paid' ? 'succeeded' : 'pending',
          payment_status: session.payment_status,
          paymentMethod: (session.payment_method_types && session.payment_method_types[0]) || 'unknown',
          customerEmail: session.customer_details?.email || null,
          customerName: session.customer_details?.name || null,
          products,
          paidAt: session.payment_status === 'paid' ? new Date().toISOString() : null,
          createdAt: new Date((session.created || Math.floor(Date.now()/1000)) * 1000).toISOString(),
        });
      } catch (e) {
        return res.status(404).json({ error: 'Pagamento não encontrado' });
      }
    }

    // Retornar dados do pagamento formatados
    return res.json({
      id: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      paymentMethod: payment.paymentMethod,
      customerEmail: payment.customerEmail,
      customerName: payment.customerName,
      products: payment.products,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
    });

  } catch (error) {
    console.error('Erro ao buscar pagamento:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};