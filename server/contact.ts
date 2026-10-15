export type ContactMessage = {
  nome: string;
  email: string;
  telefone: string;
  casa: 'nascente' | 'poente' | 'geral' | 'outra';
  mensagem: string;
};

const houses = new Set<ContactMessage['casa']>(['nascente', 'poente', 'geral', 'outra']);

export function validateContact(value: unknown): ContactMessage | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const input = value as Record<string, unknown>;
  if (Object.values(input).some((field) => typeof field !== 'string')) return null;

  const nome = (input.nome as string | undefined)?.trim() ?? '';
  const email = (input.email as string | undefined)?.trim() ?? '';
  const telefone = (input.telefone as string | undefined)?.trim() ?? '';
  const casa = (input.casa as string | undefined)?.trim() ?? '';
  const mensagem = (input.mensagem as string | undefined)?.trim() ?? '';

  if (nome.length < 2 || nome.length > 100 || /[\r\n\x00-\x1f]/.test(nome)) return null;
  if (email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) return null;
  if (telefone.length > 40 || /[\r\n\x00-\x1f]/.test(telefone)) return null;
  if (!houses.has(casa as ContactMessage['casa'])) return null;
  if (mensagem.length < 10 || mensagem.length > 3000 || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(mensagem)) return null;

  return { nome, email, telefone, casa: casa as ContactMessage['casa'], mensagem };
}
