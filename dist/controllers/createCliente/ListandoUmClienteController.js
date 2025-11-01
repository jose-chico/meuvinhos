"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListandoUmClienteController = void 0;
const client_1 = require("../../database/client");
const ListandoUmClienteController = async (req, res) => {
    try {
        if (!req.userId) {
            return res.status(401).json({ message: "Não autorizado" });
        }
        const { nome } = req.params;
        const cliente = await client_1.prisma.cliente.findFirst({
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
    }
    catch (error) {
        return res.status(400).json({ message: "Error Servidor" });
    }
};
exports.ListandoUmClienteController = ListandoUmClienteController;
