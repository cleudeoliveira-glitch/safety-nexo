'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Aviso, Botao, Campo, Cartao } from '@/components/ui';
import { conta, equipe, MinhaConta } from '@/lib/api';
import { lerToken, lerUsuario, sair, salvarToken, salvarUsuario } from '@/lib/sessao';
import { CampoCnpj, preencherComCnpj } from '@/components/BuscaCepCnpj';

// Meu perfil: nome, e-mail e senha de quem entrou; para a consultoria, também os dados e a logo
// que saem no rodapé de todos os documentos.
export default function MeuPerfil() {
  const [dados, setDados] = useState<MinhaConta | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null);
  const [ocupado, setOcupado] = useState('');

  useEffect(() => {
    if (!lerToken()) { window.location.href = '/entrar'; return; }
    conta.ver().then(setDados).catch((e: Error) => setAviso({ tipo: 'erro', texto: e.message }));
  }, []);

  async function fazer(qual: string, acao: () => Promise<string>) {
    setOcupado(qual); setAviso(null);
    try { setAviso({ tipo: 'ok', texto: await acao() }); }
    catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); }
    setOcupado('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const consultoria = dados?.papel === 'CONSULTORIA';

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Meu perfil</h1>
          <p className="text-sm text-text/60">{consultoria ? 'Seus dados de acesso e os dados da consultoria que saem nos documentos.' : 'Seus dados de acesso ao sistema.'}</p>
        </div>
        <Botao type="button" variante="secundario" onClick={sair}>Sair da conta</Botao>
      </div>
      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}
      {!dados && !aviso && <div className="h-40 animate-pulse rounded-card bg-white" />}

      {dados && (
        <>
          <Cartao titulo="Meus dados">
            <form className="grid gap-4 md:grid-cols-2" onSubmit={(ev) => {
              ev.preventDefault();
              const d = new FormData(ev.currentTarget);
              fazer('dados', async () => {
                const novo = await conta.salvar({ nome: String(d.get('nome')), email: String(d.get('email')) });
                setDados(novo);
                const u = lerUsuario();
                if (u) salvarUsuario({ ...u, nome: novo.nome });
                return 'Dados salvos.';
              });
            }}>
              <Campo id="nome" name="nome" rotulo="Nome" required defaultValue={dados.nome} />
              <Campo id="email" name="email" type="email" rotulo="E-mail de acesso" required defaultValue={dados.email}
                disabled={dados.adminPlataforma} dica={dados.adminPlataforma ? 'É o e-mail do administrador da plataforma: não muda por aqui.' : 'É com ele que você entra no sistema.'} />
              <p className="text-xs text-text/60 md:col-span-2">
                {consultoria ? 'Acesso de consultoria' : `Acesso da empresa ${dados.empresa ?? ''}`} · conta criada em {new Date(dados.criadoEm).toLocaleDateString('pt-BR')}
              </p>
              <div className="flex justify-end md:col-span-2"><Botao type="submit" disabled={ocupado === 'dados'}>Salvar meus dados</Botao></div>
            </form>
          </Cartao>

          <Cartao titulo="Trocar a senha">
            <form className="grid gap-4 md:grid-cols-3" onSubmit={(ev) => {
              ev.preventDefault();
              const form = ev.currentTarget;
              const d = new FormData(form);
              const nova = String(d.get('nova'));
              if (nova !== String(d.get('repetir'))) { setAviso({ tipo: 'erro', texto: 'A nova senha e a repetição não estão iguais.' }); return; }
              fazer('senha', async () => {
                const r = await conta.trocarSenha(String(d.get('atual')), nova);
                if (r.token) { salvarToken(r.token); salvarUsuario(r.usuario); }
                form.reset();
                return 'Senha trocada. Este aparelho continua dentro; os outros vão pedir a senha nova.';
              });
            }}>
              <Campo id="atual" name="atual" type="password" rotulo="Senha atual" required autoComplete="current-password" />
              <Campo id="nova" name="nova" type="password" rotulo="Nova senha" required minLength={8} autoComplete="new-password" dica="Pelo menos 8 caracteres." />
              <Campo id="repetir" name="repetir" type="password" rotulo="Repita a nova senha" required minLength={8} autoComplete="new-password" />
              <div className="flex justify-end md:col-span-3"><Botao type="submit" disabled={ocupado === 'senha'}>Trocar a senha</Botao></div>
            </form>
          </Cartao>

          <Cartao titulo="Verificação em duas etapas">
            <p className="mb-3 text-sm text-text/70">
              {dados.doisFatores
                ? 'Ligada. Ao entrar, além da senha, você digita um código que chega no seu e-mail.'
                : 'Desligada. Ligando, além da senha, o sistema pede um código que chega no seu e-mail. Assim, quem descobrir a sua senha não entra.'}
            </p>
            {!dados.emailLigado && !dados.doisFatores ? (
              <p className="text-sm text-text/60">O envio de e-mails do sistema está desligado agora. Quando voltar, dá para ligar aqui.</p>
            ) : (
              <form className="flex flex-wrap items-end gap-3" onSubmit={(ev) => {
                ev.preventDefault();
                const form = ev.currentTarget;
                const senha = String(new FormData(form).get('senha2f'));
                const ligar = !dados.doisFatores;
                fazer('2f', async () => {
                  await conta.doisFatores(ligar, senha);
                  setDados({ ...dados, doisFatores: ligar });
                  form.reset();
                  return ligar ? 'Verificação em duas etapas ligada. Na próxima vez que entrar, o código chega no seu e-mail.' : 'Verificação em duas etapas desligada.';
                });
              }}>
                <Campo id="senha2f" name="senha2f" type="password" rotulo="Sua senha, para confirmar" required autoComplete="current-password" className="min-w-60 flex-1" />
                <Botao type="submit" variante={dados.doisFatores ? 'secundario' : 'primario'} disabled={ocupado === '2f'}>{dados.doisFatores ? 'Desligar' : 'Ligar'}</Botao>
              </form>
            )}
          </Cartao>

          {consultoria && !dados.dono && (
            <p className="card-pendente rounded-card p-3 text-sm">Você entra como <strong>técnico</strong>: faz todo o trabalho de SST, mas plano, pagamento, dados da consultoria, equipe e exclusão de empresa ficam com o dono da conta.</p>
          )}

          {consultoria && dados.dono && (
            <Cartao titulo="Minha consultoria">
              <form className="grid gap-4 md:grid-cols-2" onSubmit={(ev) => {
                ev.preventDefault();
                const d = new FormData(ev.currentTarget);
                fazer('consultoria', async () => {
                  const logo = d.get('logo');
                  if (logo instanceof File && logo.size > 0) await conta.enviarLogo(logo);
                  setDados(await conta.salvar({ nomeConsultoria: String(d.get('nomeConsultoria')), cnpj: String(d.get('cnpj')), cidade: String(d.get('cidade')) }));
                  return 'Dados da consultoria salvos. Os próximos documentos já saem assim.';
                });
              }}>
                <Campo id="nomeConsultoria" name="nomeConsultoria" rotulo="Nome da consultoria" required defaultValue={dados.consultoria.nome} className="md:col-span-2" />
                <CampoCnpj id="cnpj" name="cnpj" defaultValue={dados.consultoria.cnpj ?? ''}
                  aoAchar={(c, form) => { preencherComCnpj(form, { nomeConsultoria: c.nomeFantasia || c.razaoSocial, cidade: c.endereco.cidade ? `${c.endereco.cidade}/${c.endereco.uf}` : '' }); }} />
                <Campo id="cidade" name="cidade" rotulo="Cidade" defaultValue={dados.consultoria.cidade ?? ''} placeholder="Ex.: Campinas/SP" />
                <div className="md:col-span-2">
                  <div className="flex flex-wrap items-center gap-4">
                    {dados.consultoria.logo
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={dados.consultoria.logo} alt="Logo da consultoria" className="h-16 max-w-40 rounded-card border border-border bg-white object-contain p-1" />
                      : <span className="flex h-16 w-28 items-center justify-center rounded-card border border-dashed border-border text-xs text-text/50">sem logo</span>}
                    <Campo id="logo-consultoria" name="logo" type="file" accept="image/png,image/jpeg" rotulo="Logo da consultoria" className="min-w-60 flex-1"
                      dica="PNG ou JPG, até 2 MB. Sai no rodapé de todos os documentos." />
                  </div>
                </div>
                <p className="text-xs text-text/60 md:col-span-2">Chave Pix e dados de cobrança ficam em <Link href="/comercial" className="font-semibold text-primary">Comercial</Link>. O plano fica em <Link href="/plano" className="font-semibold text-primary">Meu plano</Link>.</p>
                <div className="flex justify-end md:col-span-2"><Botao type="submit" disabled={ocupado === 'consultoria'}>Salvar consultoria</Botao></div>
              </form>
            </Cartao>
          )}
          {consultoria && <Equipe />}
        </>
      )}
    </main>
  );
}

// Equipe da consultoria: dono e técnicos. Convite por link, como o da empresa cliente.
function Equipe() {
  const [dados, setDados] = useState<Awaited<ReturnType<typeof equipe.listar>> | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null);
  const [link, setLink] = useState<{ nome: string; whatsapp: string; link: string } | null>(null);
  const carregar = () => equipe.listar().then(setDados).catch(() => undefined);
  useEffect(() => { carregar(); }, []);
  if (!dados) return null;
  const cheio = dados.limite != null && dados.pessoas.length >= dados.limite;
  return (
    <Cartao titulo="Minha equipe">
      <p className="mb-4 text-sm text-text/60">
        O <strong>dono</strong> cuida do plano, do pagamento, dos dados da consultoria, da equipe e pode excluir empresas. O <strong>técnico</strong> faz todo o trabalho de SST.{' '}
        {dados.limite == null ? 'Seu plano não tem limite de pessoas.' : `Seu plano permite ${dados.limite} pessoa${dados.limite === 1 ? '' : 's'}.`}
      </p>
      <ul className="mb-4 divide-y divide-border text-sm">
        {dados.pessoas.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span>
              {p.nome} · <span className="text-text/60">{p.email}</span>{p.id === dados.eu ? <span className="text-text/60"> (você)</span> : null}
              <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${p.dono ? 'bg-primary/10 text-primary' : 'bg-border/60 text-text/70'}`}>{p.dono ? 'Dono' : 'Técnico'}</span>
            </span>
            {dados.souDono && (
              <span className="flex gap-3">
                <button className="text-xs font-semibold text-primary hover:underline" onClick={async () => {
                  try { await equipe.mudarFuncao(p.id, !p.dono); await carregar(); setAviso({ tipo: 'ok', texto: p.dono ? `${p.nome} agora é técnico.` : `${p.nome} agora também é dono.` }); }
                  catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); }
                }}>{p.dono ? 'Tornar técnico' : 'Tornar dono'}</button>
                {p.id !== dados.eu && (
                  <button className="text-xs text-danger hover:underline" onClick={async () => {
                    try { await equipe.remover(p.id); await carregar(); setAviso({ tipo: 'ok', texto: 'Acesso removido.' }); }
                    catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); }
                  }}>Remover</button>
                )}
              </span>
            )}
          </li>
        ))}
      </ul>
      {aviso && <div className="mb-3"><Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso></div>}
      {!dados.souDono ? (
        <p className="text-sm text-text/60">Só o dono da conta convida ou remove pessoas da equipe.</p>
      ) : cheio ? (
        <p className="card-pendente rounded-card p-3 text-sm">
          Para pôr mais pessoas na equipe, <Link href="/plano?recurso=equipe" className="font-semibold text-primary">veja os planos</Link>.
        </p>
      ) : (
        <form className="grid gap-4 md:grid-cols-2" onSubmit={async (ev) => {
          ev.preventDefault();
          const form = ev.currentTarget;
          const d = new FormData(form);
          try {
            const r = await equipe.convidar({ nome: String(d.get('nome')), email: String(d.get('email')) });
            setLink({ nome: r.nome, whatsapp: r.whatsapp, link: r.link });
            form.reset(); await carregar();
          } catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); }
        }}>
          <Campo id="equipe-nome" name="nome" rotulo="Nome" required placeholder="Ex.: Ana Lima" icone="cracha" />
          <Campo id="equipe-email" name="email" type="email" rotulo="E-mail" required placeholder="Ex.: ana@consultoria.com.br" />
          <div className="flex justify-end md:col-span-2"><Botao type="submit">Convidar para a equipe</Botao></div>
        </form>
      )}
      {link && (
        <div className="card-ok mt-4 space-y-2 rounded-card p-4 text-sm">
          <p className="font-semibold">Link de {link.nome} pronto. Vale por 7 dias.</p>
          <p className="break-all text-xs text-text/70">{link.link}</p>
          <a href={link.whatsapp} target="_blank" rel="noreferrer" className="inline-block rounded-card bg-success px-4 py-2 text-sm font-semibold text-white">Mandar pelo WhatsApp</a>
        </div>
      )}
    </Cartao>
  );
}
