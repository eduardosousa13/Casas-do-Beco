import { useState } from 'react';
import { authClient } from './auth-client';

export default function Access({ mode, factorEnabled: initialFactor = false }: { mode: 'login' | 'security'; factorEnabled?: boolean }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [challenge, setChallenge] = useState(false), [backup, setBackup] = useState(false);
  const [setup, setSetup] = useState<{ totpURI: string; backupCodes: string[] } | null>(null);
  const [complete, setComplete] = useState(false);
  const [factorEnabled, setFactorEnabled] = useState(initialFactor);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    try {
      if (mode === 'security' && !setup) {
        const password = String(form.get('password'));
        if (factorEnabled) {
          const disabled = await authClient.twoFactor.disable({ password });
          if (disabled.error) throw new Error(disabled.error.message);
          setFactorEnabled(false);
        }
        const result = await authClient.twoFactor.enable({ password });
        if (result.error) throw new Error(result.error.message);
        if (result.data && 'totpURI' in result.data) setSetup(result.data);
      } else if (challenge || setup) {
        const code = String(form.get('code')).trim();
        const result = backup ? await authClient.twoFactor.verifyBackupCode({ code }) : await authClient.twoFactor.verifyTotp({ code, trustDevice: false });
        if (result.error) throw new Error(result.error.message);
        if (setup) setComplete(true); else window.location.assign('/admin');
      } else {
        const result = await authClient.signIn.email({ email: String(form.get('email')), password: String(form.get('password')) });
        if (result.error) throw new Error(result.error.message);
        if (result.data && 'twoFactorRedirect' in result.data && result.data.twoFactorRedirect) setChallenge(true);
        else window.location.assign('/admin');
      }
    } catch (error) { setError(error instanceof Error ? error.message : 'Não foi possível concluir.'); }
    finally { setBusy(false); }
  }
  return <section className="access-card">
    <p className="eyebrow">Área de gestão</p>
    <h1>{mode === 'security' ? factorEnabled ? 'Substituir segundo fator' : 'Proteger a sua conta' : challenge ? 'Confirmar acesso' : 'Bem-vindo de volta'}</h1>
    <p>{mode === 'security' ? factorEnabled ? 'Confirme a sua palavra-passe para gerar uma nova chave. A chave e os códigos de recuperação anteriores deixam de funcionar; as outras sessões são terminadas.' : 'Configure uma aplicação autenticadora antes de aceder aos alojamentos.' : 'Acompanhe as reservas, os hóspedes e o seu alojamento.'}</p>
    {error && <p role="alert" className="notice error">{error}</p>}
    {complete ? <><p className="notice">Segundo fator confirmado. Guarde os códigos abaixo antes de continuar; permitem recuperar o acesso se perder o dispositivo.</p><pre>{setup?.backupCodes.join('\n')}</pre><a className="button" href="/admin">Guardei os códigos — continuar</a></> : <form onSubmit={submit}>
      <fieldset disabled={busy}>
        {setup && <><p>Na aplicação autenticadora, adicione uma conta com esta chave (baseada no tempo):</p><code className="secret">{new URL(setup.totpURI).searchParams.get('secret')}</code><p>Conta: Casas do Beco. Nunca partilhe esta chave.</p></>}
        {challenge || setup ? <label>{backup ? 'Código de recuperação' : 'Código da aplicação'}<input name="code" required autoComplete="one-time-code" inputMode={backup ? 'text' : 'numeric'} autoFocus /></label> : <>
          {mode === 'login' && <label>Email<input name="email" type="email" required autoComplete="username" /></label>}
          <label>Palavra-passe<input name="password" type="password" required minLength={12} maxLength={128} autoComplete="current-password" /></label>
        </>}
        <button type="submit">{busy ? 'A verificar…' : mode === 'security' && !setup ? factorEnabled ? 'Substituir e gerar nova chave' : 'Configurar segundo fator' : 'Continuar'}</button>
        {challenge && <button className="secondary" type="button" onClick={() => setBackup(!backup)}>{backup ? 'Usar aplicação autenticadora' : 'Usar código de recuperação'}</button>}
      </fieldset>
    </form>}
    {mode === 'login' && !challenge && <p><a href="/admin/recover">Esqueci-me da palavra-passe</a></p>}
    {mode === 'security' && !setup && factorEnabled && <p><a href="/admin">Voltar ao painel</a></p>}
  </section>;
}
