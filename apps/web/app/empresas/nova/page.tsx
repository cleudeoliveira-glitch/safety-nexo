'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Aviso, Botao, Campo, Cartao, Selecao } from '@/components/ui';
import { buscarCnae, CnaeInfo, criarEmpresa, enviarLogoEmpresa } from '@/lib/api';

export default function NovaEmpresa() {
  const router = useRouter();
  const [cnaeInfo, setCnaeInfo] = useState<CnaeInfo | null>(null);
  const [cnaeAviso, setCnaeAviso] = useState<string | null>(null);
  const [grau, setGrau] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

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
    setSalvando(true);
    const dados = new FormData(evento.currentTarget);
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
      <Link href="/" className="text-sm text-primary">← Voltar ao painel</Link>
      <h1 className="mt-4 text-3xl font-semibold text-primary">Nova empresa cliente</h1>
      <p className="mt-1 text-text/60">Os documentos desta empresa vão sair com a logo dela no cabeçalho.</p>

      <form onSubmit={salvar} className="mt-8">
        <Cartao titulo="Dados da empresa">
          <div className="grid gap-5">
            <Campo id="razaoSocial" name="razaoSocial" rotulo="Razão social" required placeholder="Ex.: Padaria Pão Quente Ltda" />
            <Campo id="cnpj" name="cnpj" rotulo="CNPJ" required placeholder="00.000.000/0000-00" />
            <div>
              <Campo id="cnae" name="cnae" rotulo="CNAE principal" placeholder="Ex.: 10.91-1-01" onBlur={(e) => consultarCnae(e.target.value)} />
              {cnaeInfo && <p className="mt-2 text-sm text-success">{cnaeInfo.denominacao} · grau de risco {cnaeInfo.grauRisco}</p>}
              {cnaeAviso && <p className="mt-2 text-sm text-warning">{cnaeAviso}</p>}
            </div>
            <Selecao id="grauRisco" rotulo="Grau de risco" value={grau} onChange={(e) => setGrau(e.target.value)}>
              <option value="">Selecione</option>
              {[1, 2, 3, 4].map((g) => <option key={g} value={g}>{g}</option>)}
            </Selecao>
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
    </main>
  );
}
