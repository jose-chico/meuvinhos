import { Request, Response } from "express";
import { prisma } from "../../database/client";

export const ListandoUmClienteController = async (
	req: Request,
	res: Response,
) => {
	try {
		if (!req.userId) {
			return res.status(401).json({ message: "Não autorizado" });
		}

		const { nome } = req.params;

		const cliente = await prisma.cliente.findFirst({
			where: {
				nome: String(nome),
				usuarioId: Number(req.userId),
			},
		});

		if (!cliente) {
			return res
				.status(404)
				.json({ message: "Cliente não encontrado!" });
		}

		return res.status(200).json({ message: "Cliente", cliente });
	} catch (error) {
		return res.status(400).json({ message: "Error Servidor" });
	}
};
