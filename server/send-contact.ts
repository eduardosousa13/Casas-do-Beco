import nodemailer from 'nodemailer';
import type { ContactMessage } from './contact';

export class ContactEmailNotConfigured extends Error {}

const houseNames: Record<ContactMessage['casa'], string> = {
  nascente: 'Casa Nascente (T4)',
  poente: 'Casa Poente (T1)',
  geral: 'Dúvida geral',
  outra: 'Outro assunto',
};

export async function sendContactEmail(message: ContactMessage): Promise<void> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  const port = Number(process.env.SMTP_PORT ?? '465');

  if (!host || !user || !password || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new ContactEmailNotConfigured('SMTP is not configured');
  }

  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: { user, pass: password },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });

  await transport.sendMail({
    from: process.env.SMTP_FROM_EMAIL || user,
    to: process.env.CONTACT_TO_EMAIL || 'casasdobecoladoeiro@gmail.com',
    replyTo: message.email,
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
