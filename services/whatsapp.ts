export const enviarNotificacaoWpp = async (telefone: string, mensagem: string) => {
  // Remove caracteres não numéricos
  const numeroLimpo = telefone.replace(/\D/g, '');
  
  // Codifica a mensagem para URL
  const textoCodificado = encodeURIComponent(mensagem);
  
  // Cria o link
  const link = `https://wa.me/55${numeroLimpo}?text=${textoCodificado}`;
  
  // Abre em nova aba
  window.open(link, '_blank');
  
  return true;
};