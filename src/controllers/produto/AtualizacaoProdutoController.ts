import { Request, Response } from "express";
import { prisma } from "../../database/client";
import { z } from "zod";

const paramsSchema = z.object({
	nome: z.string().min(1, "O nome é obrigatório"),
});

// Alinhado ao model Produto do Prisma
const bodySchema = z
	.object({
		produto: z.string().optional(),
		estoque: z.number().int().min(0).optional(),
		pais: z.string().optional(),
		regiao: z.string().optional(),
		safra: z.string().optional(),
		tipo: z.string().optional(),
		garrafa: z.string().optional(),
		teor: z.string().optional(),
		valor: z.number().min(0).optional(),
		harmonizacao: z.string().optional(),
		desconto: z.boolean().optional(),
		descricao: z.string().optional(),
		imagem: z.string().optional(),
	})
	.strict()
	.refine((data) => Object.keys(data).length > 0, {
		message: "Informe ao menos um campo para atualizar.",
	});

export const AtualizacaoProdutoController = async (req: Request, res: Response) => {
	try {
		if (!req.userId) {
			return res.status(401).json({ message: "Não autorizado" });
		}

		const { nome } = paramsSchema.parse(req.params);
		const data = bodySchema.parse(req.body);

		const produtoExiste = await prisma.produto.findFirst({
			where: { nome: String(nome), usuarioId: Number(req.userId) },
		});

		if (!produtoExiste) {
			return res.status(404).json({ message: "Produto não encontrado." });
		}

		const produtoAtualizado = await prisma.produto.update({
			where: { id: produtoExiste.id },
			data,
		});

		return res.status(200).json({
			message: "Produto atualizado com sucesso!",
			produto: produtoAtualizado,
		});
	} catch (error) {
		return res.status(500).json({ message: "Erro no servidor" });
	}
};
