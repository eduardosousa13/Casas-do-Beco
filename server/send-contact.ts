import {deliverEmail} from './email';
import type { ContactMessage } from './contact';

const houseNames: Record<ContactMessage['casa'], string> = {
  nascente: 'Casa Nascente (T4)',
  poente: 'Casa Poente (T1)',
  geral: 'Dúvida geral',
  outra: 'Outro assunto',
};

export async function sendContactEmail(message: ContactMessage,options:{id:string;recipient:string}): Promise<void> {
  await deliverEmail({
    to: options.recipient,
    replyTo: message.email,
    idempotencyKey:'contact/'+options.id,
    subject: `Nova mensagem do site — ${houseNames[message.casa]}`,
    text: [
      `Nome: ${message.nome}`,
      `Email: ${message.email}`,
      `Telefone: ${message.telefone || 'Não indicado'}`,
      `Assunto: ${houseNames[message.casa]}`,
      '',
      message.mensagem,
    ].join('\n'),
  });
}
