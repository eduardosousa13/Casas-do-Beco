import { useEffect, useState } from 'react';
import { authClient } from './auth-client';
export default function Recovery({reset}: {reset:boolean}) {
  const [token,setToken]=useState(''),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[complete,setComplete]=useState(false);
  useEffect(()=>{
    if (reset) {
      setToken(new URLSearchParams(window.location.hash.slice(1)).get('token') || '');
      window.history.replaceState(null,'','/admin/reset-password');
    }
    setReady(true);
  },[reset]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();const form=event.currentTarget,data=new FormData(form);
    setBusy(true);setError('');
    try {
      if (reset) {
        const password=String(data.get('password'));
        if (password !== data.get('confirmation')) throw new Error('As palavras-passe não coincidem.');
        const result=await authClient.resetPassword({token,newPassword:password});
        if (result.error) throw new Error('Não foi possível alterar a palavra-passe. A ligação pode ter expirado ou já ter sido usada; peça uma nova.');
        form.reset();setToken('');
      } else {
        const result=await authClient.requestPasswordReset({email:String(data.get('email')),redirectTo:'/admin/reset-password'});
        if (result.error) throw new Error(result.error.status===503 ? 'A recuperação por email ainda não está disponível. É necessário configurar o envio de email.' : result.error.status===429 ? 'Demasiadas tentativas. Aguarde um minuto antes de repetir.' : 'Não foi possível processar o pedido. Tente novamente mais tarde.');
      }
      setComplete(true);
    } catch(error) {setError(error instanceof Error ? error.message : 'Não foi possível concluir.');}
    finally {setBusy(false);}
  }
  return <section className="access-card"><p className="eyebrow">Área de gestão</p><h1>{reset ? 'Nova palavra-passe' : 'Recuperar acesso'}</h1>
    <p>{reset ? 'Escolha uma palavra-passe com pelo menos 12 caracteres. Depois, volte a entrar com o segundo fator.' : 'Introduza o email da sua conta administrativa. A recuperação da palavra-passe não substitui o segundo fator.'}</p>
    {error && <p className="notice error" role="alert">{error}</p>}
    {complete ? <p className="notice" role="status">{reset ? 'Palavra-passe alterada e sessões anteriores terminadas. Pode voltar a iniciar sessão.' : 'Se o email corresponder a uma conta administrativa ativa, o pedido de envio foi registado. Verifique também o spam. A ligação é válida durante 15 minutos.'}</p> : !ready ? <p role="status">A preparar…</p> : reset && !token ? <p className="notice error" role="alert">Falta uma ligação válida. Abra a ligação recebida por email ou peça uma nova.</p> : <form onSubmit={submit}><fieldset disabled={busy}>
      {reset ? <><label>Nova palavra-passe<input name="password" type="password" minLength={12} maxLength={128} required autoComplete="new-password" /></label><label>Confirmar palavra-passe<input name="confirmation" type="password" minLength={12} maxLength={128} required autoComplete="new-password" /></label></> : <label>Email da conta<input name="email" type="email" required maxLength={254} autoComplete="username" /></label>}
      <button type="submit">{busy ? 'A processar…' : reset ? 'Guardar nova palavra-passe' : 'Pedir recuperação'}</button>
    </fieldset></form>}
    {reset && !complete && <p><a href="/admin/recover">Pedir nova ligação</a></p>}<p><a href="/admin/login">Voltar ao início de sessão</a></p>
  </section>;
}
