import { Request, Response } from "express";
import { prisma } from "../../database/client";
import { z, ZodError } from "zod";

// Alinhado ao model Produto do Prisma
const produtoSchema = z.object({
	nome: z.string().min(1, "O nome é obrigatório."),
	produto: z.string().min(1, "O produto é obrigatório."),
	estoque: z.number().int().min(0, "Estoque deve ser inteiro >= 0"),
	pais: z.string().min(1, "O país é obrigatório."),
	regiao: z.string().min(1, "A região é obrigatória."),
	safra: z.string().min(1, "A safra é obrigatória."),
	tipo: z.string().min(1, "O tipo é obrigatório."),
	garrafa: z.string().min(1, "A garrafa é obrigatória."),
	teor: z.string().min(1, "O teor é obrigatório."),
	valor: z.number().min(0, "O valor deve ser >= 0"),
	harmonizacao: z.string().optional(),
	desconto: z.boolean().optional(),
	descricao: z.string().min(1, "A descrição é obrigatória."),
	imagem: z.string().url("URL de imagem inválida"),
});

type Produto = z.infer<typeof produtoSchema>;

export const CreateProdutoController = async (req: Request, res: Response) => {
	try {
		if (!req.userId) {
			return res.status(401).json({ message: "Não autorizado" });
		}

		const data: Produto = produtoSchema.parse(req.body);

		const produto = await prisma.produto.create({
			data: {
				...data,
				usuarioId: Number(req.userId),
			},
		});

		return res.status(201).json({
			message: "Produto cadastrado com sucesso!",
			produto,
		});
	} catch (error: unknown) {
		if (error instanceof ZodError) {
			return res.status(400).json(
				error.issues.map((issue) => ({ message: issue.message }))
			);
		}

		return res.status(500).json({ message: "Erro no servidor" });
	}
};
