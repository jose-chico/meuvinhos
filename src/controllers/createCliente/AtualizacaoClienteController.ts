// src/controllers/cliente/AtualizacaoClienteController.ts
import { Request, Response } from "express";
import { prisma } from "../../database/client";
import { Prisma } from "@prisma/client";
import { z } from "zod";

// Validação com Zod - Alinhado ao schema Prisma
const bodySchema = z
	.object({
		nome: z.string().optional(),
		endereco: z.string().optional(),
		datass: z.string().optional(),
	})
	.refine((data) => Object.values(data).some((value) => value !== undefined), {
		message: "Pelo menos um campo deve ser fornecido para atualização.",
	});

const paramsSchema = z.object({
	nome: z.string().min(1, "O parâmetro nome é obrigatório."),
});

type BodyType = z.infer<typeof bodySchema>;
type ParamsType = z.infer<typeof paramsSchema>;

export const AtualizacaoClienteController = async (
	req: Request,
	res: Response
) => {
	try {
		if (!req.userId) {
			return res.status(401).json({ message: "Não autorizado" });
		}

		const { nome }: ParamsType = paramsSchema.parse(req.params);
		const body: BodyType = bodySchema.parse(req.body);

		const cliente = await prisma.cliente.findFirst({
			where: {
				nome,
				usuarioId: Number(req.userId),
			},
		});

		if (!cliente) {
			return res.status(404).json({ message: "Cliente não encontrado" });
		}

		const clienteAtualizado = await prisma.cliente.update({
			where: {
				id: cliente.id,
			},
			data: body,
		});

		return res.status(200).json({
			message: "Cliente atualizado com sucesso!",
			cliente: clienteAtualizado,
		});
	} catch (error: unknown) {
		if (error instanceof z.ZodError) {
			return res
				.status(400)
				.json(error.issues.map((issue) => ({ message: issue.message })));
		}

		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002"
		) {
			return res.status(409).json({
				message:
					"Valor já existente para campo único (provável conflito em 'consumidor').",
			});
		}

		return res.status(500).json({ message: "Erro de servidor" });
	}
};
