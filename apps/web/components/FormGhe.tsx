'use client';

import { useState } from 'react';
import { Botao, Campo, Selecao } from '@/components/ui';
import type { AmbienteGhe, DadosGhe, FuncaoGhe } from '@/lib/api';

// Cadastro do GHE por setor e função (NR-01, 1.5.7.3.2), com a ficha do ambiente do setor.
// O GHE nunca é de uma pessoa só: quem tem a mesma função entra nele sozinho.

const EDIFICACOES = ['Sala fechada em prédio de alvenaria', 'Galpão de alvenaria', 'Galpão aberto de estrutura metálica', 'Galpão pré-moldado', 'Contêiner', 'Área externa', 'Canteiro de obra', 'Veículo'];
const PISOS = ['Cerâmica', 'Porcelanato', 'Concreto', 'Concreto com pintura epóxi', 'Vinílico', 'Terra', 'Asfalto', 'Madeira'];
const PAREDES = ['Alvenaria pintada', 'Alvenaria com azulejo', 'Divisórias', 'Chapa metálica', 'Sem paredes (aberto)', 'Vidro'];
const COBERTURAS = ['Laje', 'Laje com forro', 'Telha metálica', 'Telha de fibrocimento', 'Telha cerâmica', 'Sem cobertura'];

type Props = {
  chave: string; // "novo" ou o id do GHE: deixa os ids dos campos únicos
  inicial?: DadosGhe;
  cargos: string[]; // funções já cadastradas nos colaboradores, como sugestão
  textoBotao: string;
  salvar: (dados: DadosGhe) => Promise<boolean>;
  cancelar?: () => void;
};

const vazio = (): FuncaoGhe => ({ nome: '', cbo: '', atividades: '' });

export function FormGhe({ chave, inicial, cargos, textoBotao, salvar, cancelar }: Props) {
  const [setor, setSetor] = useState(inicial?.setor ?? '');
  const [nome, setNome] = useState(inicial?.nome ?? '');
  const [funcoes, setFuncoes] = useState<FuncaoGhe[]>(inicial?.funcoes?.length ? inicial.funcoes : [vazio()]);
  const [amb, setAmb] = useState<AmbienteGhe>(inicial?.ambiente ?? {});
  const [enviando, setEnviando] = useState(false);

  const mudarFuncao = (i: number, campo: keyof FuncaoGhe, valor: string) => setFuncoes((l) => l.map((f, j) => (j === i ? { ...f, [campo]: valor } : f)));
  const a = (campo: keyof AmbienteGhe) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setAmb((x) => ({ ...x, [campo]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));
  const id = (c: string) => `${c}-${chave}`;

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    const ok = await salvar({
      setor: setor.trim(),
      nome: nome.trim() || undefined,
      funcoes: funcoes.filter((f) => f.nome.trim()).map((f) => ({ nome: f.nome.trim(), cbo: f.cbo?.trim() || undefined, atividades: f.atividades?.trim() || undefined })),
      ambiente: amb,
    });
    setEnviando(false);
    if (ok && !inicial) { setSetor(''); setNome(''); setFuncoes([vazio()]); setAmb({}); }
  }

  return (
    <form onSubmit={enviar} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Campo id={id('gs')} rotulo="Setor" required value={setor} onChange={(e) => setSetor(e.target.value)} placeholder="Ex.: Administrativo, Produção, Soldagem" />
        <Campo id={id('gn')} rotulo="Nome do GHE (opcional)" value={nome} onChange={(e) => setNome(e.target.value)}
          placeholder={inicial ? '' : 'Em branco, fica "GHE 01 · Setor"'} dica={inicial ? undefined : 'Deixe em branco para o sistema numerar sozinho.'} />
      </div>

      <fieldset className="rounded-card border border-border p-4">
        <legend className="px-1 text-sm font-semibold text-primary">Funções deste GHE</legend>
        <p className="mb-3 text-xs text-text/60">O GHE é formado por funções, não por pessoas. Quem tiver uma destas funções entra no GHE sozinho.</p>
        <datalist id={id('cargos')}>{cargos.map((c) => <option key={c} value={c} />)}</datalist>
        <div className="space-y-4">
          {funcoes.map((f, i) => (
            <div key={i} className="grid gap-3 border-b border-border/60 pb-4 last:border-0 last:pb-0 md:grid-cols-4">
              <Campo id={id(`gf-nome-${i}`)} rotulo="Função" required={i === 0} list={id('cargos')} value={f.nome} onChange={(e) => mudarFuncao(i, 'nome', e.target.value)} placeholder="Ex.: Soldador" className="md:col-span-2" />
              <Campo id={id(`gf-cbo-${i}`)} rotulo="CBO" value={f.cbo ?? ''} onChange={(e) => mudarFuncao(i, 'cbo', e.target.value)} placeholder="Ex.: 7243-15" />
              <div className="flex items-end">
                {funcoes.length > 1 && (
                  <button type="button" className="text-sm text-danger hover:underline" onClick={() => setFuncoes((l) => l.filter((_, j) => j !== i))}>Tirar esta função</button>
                )}
              </div>
              <Campo id={id(`gf-ativ-${i}`)} rotulo="O que essa função faz" value={f.atividades ?? ''} onChange={(e) => mudarFuncao(i, 'atividades', e.target.value)}
                placeholder="Ex.: Solda peças de aço com máquina MIG, corta e dá acabamento com esmerilhadeira." className="md:col-span-4" />
            </div>
          ))}
        </div>
        <Botao type="button" variante="secundario" className="mt-3" onClick={() => setFuncoes((l) => [...l, vazio()])}>+ Outra função</Botao>
      </fieldset>

      <fieldset className="rounded-card border border-border p-4">
        <legend className="px-1 text-sm font-semibold text-primary">Como é o ambiente deste setor</legend>
        <p className="mb-3 text-xs text-text/60">Cada GHE tem o seu ambiente. Escritório e solda não podem ter o mesmo texto no PGR. Escolha uma sugestão ou escreva do seu jeito.</p>
        <datalist id={id('edif')}>{EDIFICACOES.map((c) => <option key={c} value={c} />)}</datalist>
        <datalist id={id('piso')}>{PISOS.map((c) => <option key={c} value={c} />)}</datalist>
        <datalist id={id('paredes')}>{PAREDES.map((c) => <option key={c} value={c} />)}</datalist>
        <datalist id={id('cob')}>{COBERTURAS.map((c) => <option key={c} value={c} />)}</datalist>
        <div className="grid gap-3 md:grid-cols-3">
          <Campo id={id('ga-edificacao')} rotulo="Tipo de edificação" list={id('edif')} value={amb.edificacao ?? ''} onChange={a('edificacao')} placeholder="Ex.: Galpão aberto" />
          <Campo id={id('ga-piso')} rotulo="Piso" list={id('piso')} value={amb.piso ?? ''} onChange={a('piso')} placeholder="Ex.: Concreto" />
          <Campo id={id('ga-paredes')} rotulo="Paredes" list={id('paredes')} value={amb.paredes ?? ''} onChange={a('paredes')} placeholder="Ex.: Alvenaria pintada" />
          <Campo id={id('ga-cobertura')} rotulo="Teto ou cobertura" list={id('cob')} value={amb.cobertura ?? ''} onChange={a('cobertura')} placeholder="Ex.: Telha metálica" />
          <Campo id={id('ga-pedireito')} rotulo="Pé-direito" value={amb.peDireito ?? ''} onChange={a('peDireito')} placeholder="Ex.: 6 m" />
          <Selecao id={id('ga-iluminacao')} rotulo="Iluminação" value={amb.iluminacao ?? ''} onChange={a('iluminacao')}>
            <option value="">Escolha</option>
            <option value="NATURAL">Natural</option>
            <option value="ARTIFICIAL">Artificial</option>
            <option value="MISTA">Natural e artificial</option>
          </Selecao>
          <Selecao id={id('ga-ventilacao')} rotulo="Ventilação" value={amb.ventilacao ?? ''} onChange={a('ventilacao')}>
            <option value="">Escolha</option>
            <option value="NATURAL">Natural</option>
            <option value="ARTIFICIAL">Exaustor ou ventilador</option>
            <option value="MISTA">Natural e artificial</option>
            <option value="CLIMATIZADA">Ar-condicionado</option>
          </Selecao>
          <Campo id={id('ga-maquinas')} rotulo="Máquinas e equipamentos" value={amb.maquinas ?? ''} onChange={a('maquinas')} placeholder="Ex.: Máquina de solda, esmerilhadeira" className="md:col-span-2" />
          <Campo id={id('ga-ruido')} rotulo="Ruído de fundo" value={amb.ruidoFundo ?? ''} onChange={a('ruidoFundo')} placeholder="Ex.: Alto, da esmerilhadeira" />
          <div className="flex flex-wrap items-center gap-5 md:col-span-2">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!amb.ceuAberto} onChange={a('ceuAberto')} /> Trabalho a céu aberto</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!amb.confinado} onChange={a('confinado')} /> Tem espaço confinado</label>
          </div>
          <Campo id={id('ga-obs')} rotulo="Outros detalhes do ambiente" value={amb.observacoes ?? ''} onChange={a('observacoes')} placeholder="Ex.: Fumaça de solda perto das bancadas" className="md:col-span-3" />
        </div>
      </fieldset>

      <div className="flex flex-wrap justify-end gap-2">
        {cancelar && <Botao type="button" variante="secundario" onClick={cancelar}>Cancelar</Botao>}
        <Botao type="submit" disabled={enviando}>{enviando ? 'Salvando…' : textoBotao}</Botao>
      </div>
    </form>
  );
}
