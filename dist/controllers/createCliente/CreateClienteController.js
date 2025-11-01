"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateClienteController = void 0;
const client_1 = require("../../database/client");
const zod_1 = require("zod");
// Validação com Zod - Alinhado ao schema Prisma
const clienteSchema = zod_1.z.object({
    nome: zod_1.z.string().min(1, "O campo nome é obrigatório."),
    endereco: zod_1.z.string().min(1, "O campo endereco é obrigatório."),
    datass: zod_1.z.string().min(1, "O campo datass é obrigatório."),
});
const CreateClienteController = async (req, res) => {
    try {
        if (!req.userId) {
            return res.status(401).json({ message: "Não autorizado" });
        }
        const { nome, endereco, datass } = clienteSchema.parse(req.body);
        const cliente = await client_1.prisma.cliente.create({
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
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            return res.status(400).json(error.issues.map((issue) => ({
                message: issue.message,
            })));
        }
        return res.status(500).json({ message: "Erro no servidor" });
    }
};
exports.CreateClienteController = CreateClienteController;
