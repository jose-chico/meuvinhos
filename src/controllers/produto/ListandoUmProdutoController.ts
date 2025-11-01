import { Request, Response } from "express";
import { prisma } from "../../database/client";

export const ListandoUmProdutoController = async (req: Request, res: Response) => {
	try {
		const { nome } = req.params;

		// Detalhe público: busca por nome em todos os produtos.
		// Se autenticado, pode preferir filtrar pelo usuário.
		const where = req.userId
			? { nome: String(nome), usuarioId: Number(req.userId) }
			: { nome: String(nome) };
		const produto = await prisma.produto.findFirst({ where });

		if (!produto) {
			return res.status(404).json({ message: "Produto não encontrado!" });
		}

		return res.status(200).json({ message: "Produto encontrado", produto });
	} catch {
		return res.status(500).json({ message: "Erro no servidor" });
	}
};
