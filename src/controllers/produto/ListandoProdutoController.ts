import { Request, Response } from "express";
import { prisma } from "../../database/client";

export const ListandoProdutoController = async (req: Request, res: Response) => {
	try {
		// Se houver userId (rotas protegidas/admin), filtra por usuário.
		// Caso contrário (rotas públicas), retorna todos os produtos.
		const where = req.userId ? { usuarioId: Number(req.userId) } : {};
		const produtos = await prisma.produto.findMany({ where });

		return res.status(200).json({ message: "Todos os produtos cadastrados", produtos });
	} catch {
		return res.status(500).json({ message: "Erro no servidor" });
	}
};
