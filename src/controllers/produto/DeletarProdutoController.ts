import { Request, Response } from "express";
import { prisma } from "../../database/client";
import { z } from "zod";

const paramsSchema = z.object({
	nome: z.string().min(1, "O nome é obrigatório"),
});

export const DeletarProdutoController = async (req: Request, res: Response) => {
	try {
		if (!req.userId) {
			return res.status(401).json({ message: "Não autorizado" });
		}

		const { nome } = paramsSchema.parse(req.params);

		const produtoExiste = await prisma.produto.findFirst({
			where: { nome: String(nome), usuarioId: Number(req.userId) },
		});

		if (!produtoExiste) {
			return res.status(404).json({ message: "Produto não encontrado." });
		}

		const produto = await prisma.produto.delete({
			where: { id: produtoExiste.id },
		});

		return res.status(200).json({
			message: "Produto deletado com sucesso!",
			produto,
		});
	} catch {
		return res.status(500).json({ message: "Erro no servidor" });
	}
};
