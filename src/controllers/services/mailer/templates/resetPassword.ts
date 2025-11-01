export function resetPasswordTemplate(link: string) {
	return `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <h2 style="color:#065f46;">Redefinição de Senha</h2>
      <p>Olá!</p>
      <p>Você solicitou a redefinição da sua senha.</p>
      <p>
        Clique no botão abaixo para redefinir sua senha:
      </p>
      <p style="text-align:center;">
        <a href="${link}" 
          style="display:inline-block;padding:12px 24px;background-color:#10b981;
          color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">
          Redefinir Senha
        </a>
      </p>
      <p>Ou copie e cole este link no seu navegador:</p>
      <p style="word-break:break-all;"><a href="${link}" style="color:#10b981;">${link}</a></p>
      <p style="font-size:0.9rem;color:#6b7280;margin-top:15px;">
        Este link expira em <strong>1 hora</strong> por motivos de segurança.
      </p>
      <hr style="border:none;border-top:1px solid #d1d5db;margin:20px 0;">
      <p style="font-size:0.8rem;color:#6b7280;text-align:center;">
        Caso não tenha solicitado essa redefinição, ignore este e-mail.
      </p>
    </div>
  `;
}
