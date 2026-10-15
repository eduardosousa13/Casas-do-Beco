import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateContact } from '../server/contact';

const validMessage = {
  nome: 'Maria Santos',
  email: 'maria@example.com',
  telefone: '+351 912 345 678',
  casa: 'poente',
  mensagem: 'Gostaria de saber mais sobre a casa.',
};

test('normaliza uma mensagem válida', () => {
  assert.deepEqual(validateContact({ ...validMessage, nome: '  Maria Santos  ' }), validMessage);
});

test('rejeita endereços de email inválidos e texto de cabeçalho', () => {
  assert.equal(validateContact({ ...validMessage, email: 'sem-arroba' }), null);
  assert.equal(validateContact({ ...validMessage, nome: 'Maria\nBcc: outra@example.com' }), null);
});

test('rejeita assuntos desconhecidos e mensagens demasiado longas', () => {
  assert.equal(validateContact({ ...validMessage, casa: 'inexistente' }), null);
  assert.equal(validateContact({ ...validMessage, mensagem: 'x'.repeat(3001) }), null);
});
