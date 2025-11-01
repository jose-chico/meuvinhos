"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeletarClienteController = void 0;
const client_1 = require("../../database/client");
const zod_1 = require("zod");
const paramsSchema = zod_1.z.object({
    nome: zod_1.z.string().min(1, "nome é obrigatório"),
});
const DeletarClienteController = async (req, res) => {
    try {
        if (!req.userId) {
            return res.status(401).json({ message: "Não autorizado" });
        }
        const { nome } = paramsSchema.parse(req.params);
        const clienteExiste = await client_1.prisma.cliente.findFirst({
            where: { nome: String(nome), usuarioId: Number(req.userId) },
        });
        if (!clienteExiste) {
            return res.status(404).json({ message: "Cliente não encontrado." });
        }
        const cliente = await client_1.prisma.cliente.delete({
            where: { id: clienteExiste.id },
        });
        return res.status(200).json({
            message: "Cliente deletado com sucesso!",
            cliente,
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res
                .status(400)
                .json(error.issues.map((issue) => ({ message: issue.message })));
        }
        return res.status(400).json({ message: "Error Servidor" });
    }
};
exports.DeletarClienteController = DeletarClienteController;
