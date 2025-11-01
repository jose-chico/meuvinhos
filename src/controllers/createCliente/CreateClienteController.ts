import { Request, Response } from "express";
import { prisma } from "../../database/client";
import { z, ZodError } from "zod";

// Validação com Zod - Alinhado ao schema Prisma
const clienteSchema = z.object({
	nome: z.string().min(1, "O campo nome é obrigatório."),
	endereco: z.string().min(1, "O campo endereco é obrigatório."),
	datass: z.string().min(1, "O campo datass é obrigatório."),
});

type Cliente = z.infer<typeof clienteSchema>;

export const CreateClienteController = async (req: Request, res: Response) => {
	try {
		if (!req.userId) {
			return res.status(401).json({ message: "Não autorizado" });
		}

		const { nome, endereco, datass }: Cliente = clienteSchema.parse(
			req.body
		);

		const cliente = await prisma.cliente.create({
			data: {
				nome,
				endereco,
				datass,
				usuarioId: Number(req.userId),
			},
		});

		return res.status(201).json({
			message: "Cliente cadastrado com sucesso!",
			cliente,
		});
	} catch (error: unknown) {
		if (error instanceof ZodError) {
			return res.status(400).json(
				error.issues.map((issue) => ({
					message: issue.message,
				}))
			);
		}

		return res.status(500).json({ message: "Erro no servidor" });
	}
};
