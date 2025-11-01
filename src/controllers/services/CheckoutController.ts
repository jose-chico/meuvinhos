import { Request, Response } from "express";

// Controlador simples de checkout via GET
// Recebe ?total=valor e retorna uma URL simulada de pagamento
export const CheckoutController = async (req: Request, res: Response) => {
  try {
    const totalStr = String(req.query.total ?? "0");
    const total = parseFloat(totalStr);

    if (!Number.isFinite(total) || total <= 0) {
      return res.status(400).json({ message: "Total inválido para checkout." });
    }

    // Construir origem dinamicamente (respeita proxies/reverses quando disponível)
    const forwardedProto = (req.headers["x-forwarded-proto"] as string) || undefined;
    const protocol = forwardedProto || req.protocol || "http";
    const host = req.get("host") || "localhost:8000";
    const origin = `${protocol}://${host}`;

    // URL de confirmação de pagamento local usando a origem dinâmica
    const checkoutUrl = `${origin}/pages/confirmacao-pagamento.html?amount=${total.toFixed(2)}&currency=BRL`;

    return res.status(200).json({ message: "Checkout iniciado", url: checkoutUrl, amount: total });
  } catch {
    return res.status(500).json({ message: "Erro ao iniciar checkout" });
  }
};