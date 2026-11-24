import { Injectable, Logger } from '@nestjs/common';
import { iaConfigurada } from '../importacao/leitor';
import { explicarMudancaNorma } from '../ia/ia';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push';
import { AtoDou, atoQueMudaNr, urlBuscaDou, baixar, lerAtoDou, lerBuscaDou, nrsCitadas, pontosDoTexto, vigencia } from './fontes';

// Quem costuma ser afetado por cada NR setorial (começo do CNAE). As NRs gerais valem para todas.
// A Cleude ajusta no rascunho antes de publicar.
export const CNAE_POR_NR: Record<string, string[]> = {
  'NR-18': ['41', '42', '43'],
  'NR-22': ['05', '07', '08', '09'],
  'NR-29': ['5231', '5232', '5239'],
  'NR-30': ['50'],
  'NR-31': ['01', '02', '03'],
  'NR-32': ['86', '87'],
  'NR-34': ['3011', '3012', '3317'],
  'NR-36': ['1011', '1012', '1013'],
  'NR-37': ['06', '0910'],
  'NR-38': ['3811', '3812', '3821', '3822', '3839', '8129'],
};

// Dica prática do que revisar, por NR. Entra no "O que fazer" do rascunho quando a IA está desligada.
const O_QUE_REVISAR: Record<string, string> = {
  'NR-01': 'Revise o PGR (inventário de riscos e plano de ação) das empresas afetadas.',
  'NR-04': 'Confira o dimensionamento do SESMT.',
  'NR-05': 'Confira a CIPA: dimensionamento, treinamento e calendário.',
  'NR-06': 'Revise as fichas de EPI e os CAs em uso.',
  'NR-07': 'Revise o PCMSO e a lista de exames por função.',
  'NR-09': 'Revise as avaliações de agentes físicos, químicos e biológicos no PGR.',
  'NR-10': 'Revise os treinamentos e procedimentos de eletricidade.',
  'NR-12': 'Revise os checklists e o inventário de máquinas.',
  'NR-15': 'Confira o LTCAT e os laudos de insalubridade.',
  'NR-16': 'Confira os laudos de periculosidade.',
  'NR-17': 'Revise a AEP/AET e os fatores psicossociais no PGR.',
  'NR-18': 'Revise o PGR de obra e os treinamentos da construção.',
  'NR-20': 'Revise o prontuário e os treinamentos de inflamáveis.',
  'NR-23': 'Confira o plano de emergência e a brigada.',
  'NR-24': 'Confira as condições sanitárias e de conforto nas inspeções.',
  'NR-33': 'Revise o cadastro de espaços confinados, as PETs e o plano de resgate.',
  'NR-35': 'Revise as PTs de trabalho em altura e os treinamentos.',
};

const dia = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : null);
// "PORTARIA MTE Nº 1.419, DE 27 DE AGOSTO DE 2024" -> "Portaria MTE nº 1.419, de 27 de agosto de 2024"
const nomeDoAto = (t: string) => t
  .replace(/^PORTARIA/i, 'Portaria').replace(/^RESOLU[ÇC][ÃA]O/i, 'Resolução').replace(/^INSTRU[ÇC][ÃA]O NORMATIVA/i, 'Instrução Normativa')
  .replace(/\bN[º°O](?=\s)/g, 'nº').replace(/\bDE\b/g, 'de')
  .replace(/\b(JANEIRO|FEVEREIRO|MARÇO|ABRIL|MAIO|JUNHO|JULHO|AGOSTO|SETEMBRO|OUTUBRO|NOVEMBRO|DEZEMBRO)\b/g, (m) => m.toLowerCase());
const corta = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).replace(/\s+\S*$/, '')}…` : s);

export type Rascunho = {
  titulo: string; normas: string[]; resumo: string; oQueFazer: string; linkOficial: string;
  publicadaEm: string | null; vigenciaEm: string | null; cnaePrefixos: string[];
};

// Monta o aviso só com o texto oficial (sem IA): de onde veio, do que trata e os primeiros artigos.
export function rascunhoSemIa(ato: AtoDou, texto: string, normas: string[]): Rascunho {
  const { ementa, artigos } = pontosDoTexto(`${ato.titulo} ${texto}`);
  const assunto = (ato.ementa || ementa || ato.titulo).replace(/\.$/, '');
  const partes = [
    `Saiu no Diário Oficial${ato.publicadaEm ? ` de ${dia(ato.publicadaEm)}` : ''} a ${nomeDoAto(ato.titulo)}.`,
    `Do que trata: ${assunto}.`,
  ];
  if (artigos.length) partes.push(`Principais pontos do texto oficial:\n${artigos.map((a) => `• ${a}`).join('\n')}`);
  const vig = vigencia(texto, ato.publicadaEm);
  if (vig) partes.push(`Começa a valer em ${dia(vig)}.`);
  const dicas = normas.map((n) => O_QUE_REVISAR[n]).filter(Boolean);
  return {
    titulo: corta(`${normas.join(', ')}: ${assunto}`, 200),
    normas,
    resumo: corta(partes.join('\n\n'), 5000),
    oQueFazer: [...new Set(dicas)].concat('Leia o texto completo no link oficial antes de mudar os documentos.').join(' '),
    linkOficial: ato.url,
    publicadaEm: ato.publicadaEm,
    vigenciaEm: vig,
    cnaePrefixos: [...new Set(normas.flatMap((n) => CNAE_POR_NR[n] ?? []))],
  };
}

export type ResultadoBusca = {
  em: string; periodo: string; lidos: number; mudancas: number; novos: { titulo: string; comIa: boolean }[];
  jaCadastrados: number; erros: string[];
};

const CHAVE_ULTIMA = 'normas:ultima-busca';

@Injectable()
export class MonitorNormasService {
  private readonly log = new Logger('Normas');
  private rodando: Promise<ResultadoBusca> | null = null;

  constructor(private readonly prisma: PrismaService, private readonly push: PushService) {}

  async ultima(): Promise<ResultadoBusca | null> {
    const c = await this.prisma.configPlataforma.findUnique({ where: { chave: CHAVE_ULTIMA } });
    return c ? (JSON.parse(c.valor) as ResultadoBusca) : null;
  }

  // Duas buscas ao mesmo tempo (agendador + botão) viram uma só.
  buscar(): Promise<ResultadoBusca> {
    if (!this.rodando) this.rodando = this.executar().finally(() => { this.rodando = null; });
    return this.rodando;
  }

  private async executar(): Promise<ResultadoBusca> {
    // Na primeira vez olha o último ano (traz as mudanças recentes para conferir); depois, a última semana.
    const periodo: 'semana' | 'ano' = (await this.ultima()) ? 'semana' : 'ano';
    const r: ResultadoBusca = { em: new Date().toISOString(), periodo, lidos: 0, mudancas: 0, novos: [], jaCadastrados: 0, erros: [] };
    const atos = new Map<string, AtoDou>();
    // A busca devolve 20 por vez e mistura outros órgãos; a segunda frase puxa só o Ministério do Trabalho.
    for (const termo of ['"Norma Regulamentadora"', '"Norma Regulamentadora" "Ministério do Trabalho e Emprego"', '"NR-" "Ministério do Trabalho e Emprego"']) {
      try {
        const url = urlBuscaDou(termo, periodo);
        for (const a of lerBuscaDou((await baixar(url, 90000)).toString('utf-8'))) atos.set(a.url, a);
      } catch (e) { r.erros.push(`Busca no Diário Oficial (${termo}): ${(e as Error).message}`); }
    }
    r.lidos = atos.size;
    const mudancas = [...atos.values()].filter(atoQueMudaNr);
    r.mudancas = mudancas.length;

    for (const ato of mudancas) {
      const fonte = ato.chave ?? `dou:${ato.url.split('/-/')[1]}`;
      if (await this.prisma.avisoNorma.findUnique({ where: { fonte }, select: { id: true } })) { r.jaCadastrados++; continue; }
      try {
        // Se a página do ato não abrir, segue com o trecho que veio na busca (o link oficial vai junto).
        let texto = '';
        try {
          const lido = lerAtoDou((await baixar(ato.url, 60000)).toString('utf-8'));
          texto = lido.texto;
          if (lido.ementa) ato.ementa = lido.ementa;
        } catch (e) { this.log.warn(`Texto de ${ato.titulo} não abriu: ${(e as Error).message}`); }
        if (!atoQueMudaNr(ato)) continue; // com a ementa verdadeira, confere de novo
        const normas = nrsCitadas(`${ato.titulo} ${ato.ementa} ${texto}`);
        if (!normas.length) continue;
        let d = rascunhoSemIa(ato, texto, normas);
        let comIa = false;
        if (iaConfigurada()) {
          try {
            const ia = await explicarMudancaNorma(`${ato.titulo}\nPublicada no DOU em ${ato.publicadaEm ?? 'data não informada'}\n\n${texto || ato.ementa}`);
            d = {
              ...d,
              titulo: corta(ia.titulo, 200),
              normas: ia.normas.length ? ia.normas : d.normas,
              resumo: corta(ia.resumo, 5000),
              oQueFazer: corta(ia.oQueFazer, 5000),
              vigenciaEm: ia.vigenciaEm ?? d.vigenciaEm,
            };
            comIa = true;
          } catch (e) { this.log.warn(`IA não explicou ${ato.titulo}: ${(e as Error).message}`); }
        }
        await this.prisma.avisoNorma.create({
          data: {
            ...d,
            publicadaEm: d.publicadaEm ? new Date(d.publicadaEm) : null,
            vigenciaEm: d.vigenciaEm ? new Date(d.vigenciaEm) : null,
            status: 'RASCUNHO', origem: 'AUTOMATICO', fonte, textoOficial: texto ? texto.slice(0, 20000) : null,
          },
        });
        r.novos.push({ titulo: d.titulo, comIa });
      } catch (e) { r.erros.push(`${ato.titulo}: ${(e as Error).message}`); }
    }

    await this.prisma.configPlataforma.upsert({ where: { chave: CHAVE_ULTIMA }, create: { chave: CHAVE_ULTIMA, valor: JSON.stringify(r) }, update: { valor: JSON.stringify(r) } });
    if (r.novos.length) {
      this.push.avisarAdmins({
        titulo: r.novos.length === 1 ? 'Mudança em NR para conferir' : `${r.novos.length} mudanças em NRs para conferir`,
        corpo: r.novos.map((n) => n.titulo).join(' · ').slice(0, 180),
        url: '/admin/normas', tag: 'normas',
      });
    }
    this.log.log(`Busca de normas: ${r.lidos} atos lidos, ${r.mudancas} mudam NR, ${r.novos.length} novos, ${r.erros.length} erros.`);
    return r;
  }
}
