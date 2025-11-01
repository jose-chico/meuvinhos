import { Request, Response } from 'express';
import { prisma } from '../../database/client';

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
      return res.status(404).json({ error: 'Pagamento não encontrado' });
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