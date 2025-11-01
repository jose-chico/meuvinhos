/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-var-requires */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  // Tenta achar um usuário existente; se não houver, cria um usuário demo
  let usuario = await prisma.usuario.findFirst();
  if (!usuario) {
    const email = "demo@vinho.local";
    const passwordHash = await bcrypt.hash("demo123", 10);
    usuario = await prisma.usuario.create({
      data: { email, passwordHash },
    });
    console.log(`[seed] Usuário demo criado: ${email} / senha: demo123`);
  }

  // Alguns produtos exemplo com campo uva
  const exemplos = [
    {
      nome: "Malbec Reserva 2020",
      marca: "Bodega Andina",
      tipo: "Tinto",
      uva: "Malbec",
      volume: "750",
      teor: "13",
      avaliacao: 4.6,
      avaliacoesQtd: 58,
      precoOriginal: 89.9,
      desconto: true,
      descricaoCurta: "Malbec encorpado com taninos macios.",
      descricaoLonga: "Notas de ameixa e chocolate, passagem por barrica de carvalho.",
      imagem: "https://via.placeholder.com/300x400?text=Malbec",
    },
    {
      nome: "Chardonnay Seleção 2022",
      marca: "Vinícola Serra",
      tipo: "Branco",
      uva: "Chardonnay",
      volume: "750",
      teor: "12",
      avaliacao: 4.3,
      avaliacoesQtd: 62,
      precoOriginal: 74.5,
      desconto: false,
      descricaoCurta: "Branco refrescante com notas cítricas.",
      descricaoLonga: "Aromas de maçã verde e manteiga, final elegante.",
      imagem: "https://via.placeholder.com/300x400?text=Chardonnay",
    },
    {
      nome: "Pinot Noir Clássico 2021",
      marca: "Terroir do Sul",
      tipo: "Tinto",
      uva: "Pinot Noir",
      volume: "750",
      teor: "12.5",
      avaliacao: 4.4,
      avaliacoesQtd: 46,
      precoOriginal: 99.0,
      desconto: false,
      descricaoCurta: "Leve, frutado e muito aromático.",
      descricaoLonga: "Frutas vermelhas e toque terroso, ideal com carnes leves.",
      imagem: "https://via.placeholder.com/300x400?text=Pinot+Noir",
    },
    {
      nome: "Syrah Reserva Especial",
      marca: "Vale do Sol",
      tipo: "Tinto",
      uva: "Syrah/Shiraz",
      volume: "750",
      teor: "14",
      avaliacao: 4.5,
      avaliacoesQtd: 94,
      precoOriginal: 129.9,
      desconto: true,
      descricaoCurta: "Aromas intensos e estrutura marcante.",
      descricaoLonga: "Notas de pimenta e frutas negras, ideal para churrasco.",
      imagem: "https://via.placeholder.com/300x400?text=Syrah",
    },
  ];

  for (const p of exemplos) {
    const existe = await prisma.produto.findFirst({
      where: { nome: p.nome, usuarioId: usuario.id },
    });
    if (!existe) {
      await prisma.produto.create({
        data: { ...p, usuarioId: usuario.id },
      });
      console.log(`[seed] Produto criado: ${p.nome}`);
    } else {
      console.log(`[seed] Produto já existe, pulando: ${p.nome}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });