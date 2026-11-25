'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Aviso, Botao, Campo, Cartao, Selecao } from '@/components/ui';
import { buscarCnae, CnaeInfo, criarEmpresa, enviarLogoEmpresa, meuPlano, MeuPlano } from '@/lib/api';
import { avisoCnpj } from '@/lib/documentosBr';

export default function NovaEmpresa() {
  const router = useRouter();
  const [cnaeInfo, setCnaeInfo] = useState<CnaeInfo | null>(null);
  const [cnaeAviso, setCnaeAviso] = useState<string | null>(null);
  const [grau, setGrau] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [cnpjAviso, setCnpjAviso] = useState<string | null>(null);
  const [plano, setPlano] = useState<MeuPlano | null>(null);

  // Já no limite do plano: avisa antes de a pessoa preencher tudo.
  useEffect(() => { meuPlano.ver().then(setPlano).catch(() => setPlano(null)); }, []);
  const noLimite = !!plano && !plano.acessoTotal && plano.limiteEmpresas !== null && plano.empresas >= plano.limiteEmpresas;

  async function consultarCnae(codigo: string) {
    setCnaeInfo(null);
    setCnaeAviso(null);
    if (codigo.replace(/\D/g, '').length < 5) return;
    try {
      const info = await buscarCnae(codigo);
      setCnaeInfo(info);
      setGrau(String(info.grauRisco));
    } catch (e) {
      setCnaeAviso((e as Error).message);
    }
  }

  async function salvar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    const dados = new FormData(evento.currentTarget);
    const problemaCnpj = avisoCnpj(String(dados.get('cnpj') ?? ''));
    if (problemaCnpj) { setCnpjAviso(problemaCnpj); return; }
    setSalvando(true);
    try {
      const empresa = await criarEmpresa({
        razaoSocial: String(dados.get('razaoSocial')),
        cnpj: String(dados.get('cnpj')),
        cnae: String(dados.get('cnae')) || undefined,
        grauRisco: grau ? Number(grau) : undefined,
        numFuncionarios: Number(dados.get('numFuncionarios') || 0),
      });
      const logo = dados.get('logo');
      // A empresa já foi criada: se só a logo falhar, segue para a empresa e avisa (dá para enviar a logo depois).
      let aviso = '';
      if (logo instanceof File && logo.size > 0) await enviarLogoEmpresa(empresa.id, logo).catch((e: Error) => { aviso = `?aviso=${encodeURIComponent(`Empresa cadastrada, mas a logo não foi enviada: ${e.message} Envie de novo na página da empresa.`)}`; });
      router.push(`/empresas/${empresa.id}${aviso}`);
    } catch (e) {
      setErro((e as Error).message);
      setSalvando(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-6 md:p-10">
      <Link href="/" className="inline-flex min-h-[44px] items-center text-sm font-semibold text-primary">← Voltar</Link>
      <h1 className="mt-4 text-3xl font-semibold text-primary">Nova empresa</h1>
      <p className="mt-1 text-text/60">Comece pelos dados básicos. Os documentos desta empresa vão sair com a logo dela no cabeçalho.</p>

      {noLimite && plano ? (
        <div className="mt-8">
          <Cartao titulo="Seu plano já está completo">
            <p className="text-text/70">
              O plano {plano.nomePlano} permite {plano.limiteEmpresas} empresa{plano.limiteEmpresas === 1 ? '' : 's'} e você já tem {plano.empresas}.
              {plano.emTeste ? ' Durante o teste, todos os recursos ficam liberados, mas o número de empresas continua o do plano.' : ''}
              {' '}Para cadastrar outra, escolha um plano com mais empresas.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/plano" className="rounded-card bg-primary px-4 py-2 text-sm font-semibold text-white">Ver os planos</Link>
              <Link href="/" className="rounded-card border border-border px-4 py-2 text-sm font-semibold text-primary">Voltar ao painel</Link>
            </div>
          </Cartao>
        </div>
      ) : (
      <form onSubmit={salvar} className="mt-8">
        <Cartao titulo="Dados da empresa">
          <div className="grid gap-5">
            <Campo id="razaoSocial" name="razaoSocial" rotulo="Razão social" required placeholder="Ex.: Padaria Pão Quente Ltda" />
            <div>
              <Campo id="cnpj" name="cnpj" rotulo="CNPJ" required placeholder="00.000.000/0000-00" onBlur={(e) => setCnpjAviso(avisoCnpj(e.target.value))} />
              {cnpjAviso && <p className="mt-2 text-sm text-danger">{cnpjAviso}</p>}
            </div>
            <div>
              <Campo id="cnae" name="cnae" rotulo="CNAE principal" placeholder="Ex.: 10.91-1-01" onBlur={(e) => consultarCnae(e.target.value)} />
              {cnaeInfo && <p className="mt-2 text-sm text-success">{cnaeInfo.denominacao} · grau de risco {cnaeInfo.grauRisco}</p>}
              {cnaeAviso && <p className="mt-2 text-sm text-warning">{cnaeAviso}</p>}
            </div>
            <div>
              <Selecao id="grauRisco" rotulo="Grau de risco" required value={grau} onChange={(e) => setGrau(e.target.value)}>
                <option value="">Selecione</option>
                {[1, 2, 3, 4].map((g) => <option key={g} value={g}>{g}</option>)}
              </Selecao>
              <p className="mt-1 text-xs text-text/60">Preenchido pelo CNAE quando o sistema encontra o código. Ele define CIPA e SESMT.</p>
            </div>
            <Campo id="numFuncionarios" name="numFuncionarios" type="number" min={0} rotulo="Número de funcionários" placeholder="Ex.: 25" />
            <Campo id="logo" name="logo" type="file" accept="image/png,image/jpeg" rotulo="Logo da empresa (opcional)" dica="PNG ou JPG, até 2 MB." />
          </div>
        </Cartao>
        {erro && <div className="mt-4"><Aviso tipo="erro">{erro}</Aviso></div>}
        {erro?.includes('limite de empresas') && <p className="mt-2 text-sm"><Link href="/plano" className="font-semibold text-primary">Ver os planos</Link></p>}
        <div className="mt-6 flex justify-end">
          <Botao type="submit" disabled={salvando}>{salvando ? 'Salvando…' : 'Cadastrar empresa'}</Botao>
        </div>
      </form>
      )}
    </main>
  );
}
