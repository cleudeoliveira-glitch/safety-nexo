import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as QRCode from 'qrcode';
import { ContextoDocumentoService } from '../documentos/contexto.service';
import { PdfService } from '../documentos/pdf.service';
import { calcular } from '../fap/calculo';
import { PrismaService } from '../prisma/prisma.service';
import { diasNoMes, diasUteis, fimMes, inicioMes, mesesAte, taxa, variacao } from './calculo';
import { painelSsmaHtml } from './template';

const DIA = 86_400_000;
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : null);
const mesDe = (d: Date) => d.toISOString().slice(0, 7);

export type Filtro = { fim?: string; gheId?: string };

@Injectable()
export class SsmaService {
  constructor(private readonly prisma: PrismaService, private readonly contexto: ContextoDocumentoService, private readonly pdf: PdfService) {}

  async montar(c: string, e: string, f: Filtro, hoje = new Date()) {
    const emp = await this.prisma.empresa.findFirst({ where: { id: e, consultoriaId: c }, select: { id: true, razaoSocial: true, jornadaDiariaHoras: true, custoDiaFalta: true, ghes: { select: { id: true, nome: true }, orderBy: { nome: 'asc' } } } });
    if (!emp) throw new NotFoundException('Empresa não encontrada');
    const fim = f.fim && /^\d{4}-\d{2}$/.test(f.fim) ? f.fim : mesDe(hoje);
    const meses = mesesAte(fim);
    const ini = inicioMes(meses[0]); const fimData = new Date(fimMes(fim).getTime() + DIA - 1);
    const filtroColab = f.gheId ? { gheId: f.gheId } : {};
    const setor = f.gheId ? emp.ghes.find((g) => g.id === f.gheId)?.nome ?? null : null;
    if (f.gheId && !setor) throw new BadRequestException('Setor não encontrado.');

    const [colabs, cats, afast, atestados, horas, ddss, acoes, fap] = await Promise.all([
      this.prisma.colaborador.findMany({ where: { empresaId: e, ...filtroColab }, select: {
        id: true, dataAdmissao: true, ghe: { select: { nome: true } },
        asos: { orderBy: { dataExame: 'desc' }, take: 1, select: { proximoExame: true } },
        entregasEpi: { orderBy: { dataEntrega: 'desc' }, select: { epi: true, validadeCa: true } },
        treinamentos: { select: { turma: { select: { nome: true, fim: true, validadeMeses: true } } } },
      } }),
      this.prisma.cat.findMany({ where: { empresaId: e, dataHora: { gte: ini, lte: fimData }, colaborador: filtroColab }, select: { id: true, dataHora: true, tipoCat: true, houveAfastamento: true, houveObito: true, diasTratamento: true, colaborador: { select: { ghe: { select: { nome: true } } } } } }),
      this.prisma.afastamento.findMany({ where: { empresaId: e, motivo: { in: ['01', '03'] }, inicio: { lte: fimData }, OR: [{ fim: null }, { fim: { gte: ini } }], colaborador: filtroColab }, select: { motivo: true, inicio: true, fim: true, catId: true } }),
      this.prisma.atestado.findMany({ where: { empresaId: e, inicio: { gte: ini, lte: fimData }, colaborador: filtroColab }, select: { inicio: true, dias: true, cid: true } }),
      this.prisma.horasTrabalhadas.findMany({ where: { empresaId: e, mes: { in: meses } } }),
      this.prisma.dds.findMany({ where: { empresaId: e, data: { gte: new Date(hoje.getTime() - 30 * DIA) } }, select: { participantes: true } }),
      this.prisma.acaoPsicossocial.findMany({ where: { avaliacao: { empresaId: e }, ...(setor ? { OR: [{ setor }, { setor: null }] } : {}) }, select: { feita: true } }),
      this.prisma.fapRat.findFirst({ where: { empresaId: e }, orderBy: { ano: 'desc' } }),
    ]);

    // ---------- Taxas mês a mês ----------
    const horasInformadas = new Map(horas.map((h) => [h.mes, h.horas]));
    const catComAfast = new Set(afast.filter((a) => a.catId).map((a) => a.catId));
    const serie = meses.map((mes) => {
      const fm = fimMes(mes);
      const ativos = colabs.filter((x) => !x.dataAdmissao || x.dataAdmissao <= fm).length;
      // As horas digitadas valem para a empresa toda; com filtro de setor, estima pelo setor.
      const informado = !f.gheId && horasInformadas.has(mes);
      const hht = informado ? horasInformadas.get(mes)! : Math.round(ativos * emp.jornadaDiariaHoras * diasUteis(mes, hoje));
      const doMes = cats.filter((x) => mesDe(x.dataHora) === mes && x.tipoCat !== 'REABERTURA');
      const ate = new Date(Math.min(hoje.getTime(), fm.getTime()));
      const diasAfast = afast.filter((a) => a.motivo === '01').reduce((s, a) => s + diasNoMes(a.inicio, a.fim ?? ate, mes), 0);
      const diasCat = doMes.filter((x) => x.houveAfastamento && !catComAfast.has(x.id)).reduce((s, x) => s + (x.diasTratamento ?? 0), 0);
      const dias = diasAfast + diasCat;
      return { mes, acidentes: doMes.length, comAfastamento: doMes.filter((x) => x.houveAfastamento).length, obitos: doMes.filter((x) => x.houveObito || x.tipoCat === 'OBITO').length, diasPerdidos: dias, hht, hhtEstimado: !informado, tf: taxa(doMes.length, hht), tg: taxa(dias, hht) };
    });
    const atual = serie[serie.length - 1]; const anterior = serie[serie.length - 2];
    const iniciais = cats.filter((x) => x.tipoCat !== 'REABERTURA');
    const porSetor = new Map<string, number>();
    for (const x of iniciais) { const n = x.colaborador.ghe?.nome ?? 'Sem GHE'; porSetor.set(n, (porSetor.get(n) ?? 0) + 1); }
    const ranking = [...porSetor.entries()].map(([nome, n]) => ({ nome, acidentes: n })).sort((a, b) => b.acidentes - a.acidentes).slice(0, 8);

    // ---------- Em dia (situação de hoje) ----------
    const total = colabs.length;
    const asoOk = colabs.filter((x) => x.asos[0]?.proximoExame && x.asos[0].proximoExame >= hoje).length;
    const comEpi = colabs.filter((x) => x.entregasEpi.length);
    const epiOk = comEpi.filter((x) => { const visto = new Set<string>(); return x.entregasEpi.every((ep) => { if (visto.has(ep.epi)) return true; visto.add(ep.epi); return !ep.validadeCa || ep.validadeCa >= hoje; }); }).length;
    const comTrein = colabs.filter((x) => x.treinamentos.length);
    const treinOk = comTrein.filter((x) => {
      const ultimo = new Map<string, Date | null>();
      for (const p of x.treinamentos) {
        const v = p.turma.validadeMeses ? new Date(Date.UTC(p.turma.fim.getUTCFullYear(), p.turma.fim.getUTCMonth() + p.turma.validadeMeses, p.turma.fim.getUTCDate())) : null;
        const a = ultimo.get(p.turma.nome);
        if (a === undefined || (a !== null && (v === null || v > a))) ultimo.set(p.turma.nome, v);
      }
      return [...ultimo.values()].every((v) => v === null || v >= hoje);
    }).length;
    const ids = new Set(colabs.map((x) => x.id));
    const noDds = new Set(ddss.flatMap((d) => d.participantes).filter((p) => ids.has(p))).size;
    const emDia = [
      { item: 'ASO', ok: asoOk, de: total, pct: pct(asoOk, total) },
      { item: 'EPI (CA válido)', ok: epiOk, de: comEpi.length, pct: pct(epiOk, comEpi.length) },
      { item: 'Treinamentos', ok: treinOk, de: comTrein.length, pct: pct(treinOk, comTrein.length) },
      { item: 'DDS nos últimos 30 dias', ok: noDds, de: total, pct: pct(noDds, total) },
      { item: 'Plano de ação psicossocial', ok: acoes.filter((a) => a.feita).length, de: acoes.length, pct: pct(acoes.filter((a) => a.feita).length, acoes.length) },
    ];
    const validos = emDia.filter((x) => x.pct != null);
    const saude = validos.length ? Math.round(validos.reduce((s, x) => s + (x.pct as number), 0) / validos.length) : null;

    // ---------- Estratégico ----------
    const custoDia = emp.custoDiaFalta == null ? null : Number(emp.custoDiaFalta);
    const diasAtestadoMes = atestados.filter((a) => mesDe(a.inicio) === fim).reduce((s, a) => s + a.dias, 0);
    const diasAtestado12 = atestados.reduce((s, a) => s + a.dias, 0);
    const cids = new Map<string, number>();
    for (const a of atestados) if (a.cid) cids.set(a.cid.toUpperCase(), (cids.get(a.cid.toUpperCase()) ?? 0) + a.dias);
    // A partir do 16º dia de afastamento quem paga é o INSS (Lei 8.213/1991, art. 60).
    const diasInss = afast.reduce((s, a) => { const f2 = a.fim ?? hoje; const dias = Math.floor((f2.getTime() - a.inicio.getTime()) / DIA) + 1; return s + Math.max(0, dias - 15); }, 0);
    const fapCalc = fap ? calcular(fap.rat, Number(fap.fap), fap.folhaMensal == null ? null : Number(fap.folhaMensal)) : null;

    return {
      empresa: { id: emp.id, razaoSocial: emp.razaoSocial, jornadaDiariaHoras: emp.jornadaDiariaHoras, custoDiaFalta: custoDia },
      filtro: { fim, gheId: f.gheId ?? null, setor }, setores: emp.ghes,
      saude, emDia,
      atual: { ...atual, variacaoTf: variacao(atual.tf, anterior.tf), variacaoTg: variacao(atual.tg, anterior.tg) },
      serie, ranking,
      afastamento: { com: iniciais.filter((x) => x.houveAfastamento).length, sem: iniciais.filter((x) => !x.houveAfastamento).length },
      estrategico: {
        diasAtestadoMes, custoAbsenteismoMes: custoDia == null ? null : Math.round(diasAtestadoMes * custoDia * 100) / 100,
        diasAtestado12, custoAbsenteismo12: custoDia == null ? null : Math.round(diasAtestado12 * custoDia * 100) / 100,
        cids: [...cids.entries()].map(([cid, dias]) => ({ cid, dias })).sort((a, b) => b.dias - a.dias).slice(0, 5),
        diasInss12: diasInss,
        fap: fap && fapCalc ? { ano: fap.ano, fap: Number(fap.fap), diferencaMensal: fapCalc.diferencaMensal } : null,
        setorMaisCat: ranking[0] ?? null,
      },
    };
  }

  async configurar(c: string, e: string, custoDiaFalta: number | null) {
    const r = await this.prisma.empresa.updateMany({ where: { id: e, consultoriaId: c }, data: { custoDiaFalta } });
    if (!r.count) throw new NotFoundException('Empresa não encontrada');
    return { ok: true };
  }

  async horas(c: string, e: string, mes: string, horas: number | null) {
    const emp = await this.prisma.empresa.findFirst({ where: { id: e, consultoriaId: c }, select: { id: true } });
    if (!emp) throw new NotFoundException('Empresa não encontrada');
    if (horas == null) { await this.prisma.horasTrabalhadas.deleteMany({ where: { empresaId: e, mes } }); return { ok: true }; }
    await this.prisma.horasTrabalhadas.upsert({ where: { empresaId_mes: { empresaId: e, mes } }, create: { empresaId: e, mes, horas }, update: { horas } });
    return { ok: true };
  }

  async relatorio(c: string, e: string, f: Filtro) {
    const d = await this.montar(c, e, f);
    const ctx = await this.contexto.carregar(c, e, 'SSMA');
    const m = { titulo: 'Painel SSMA: indicadores de segurança e saúde', logoEmpresa: ctx.logoEmpresa, consultoria: ctx.consultoria, aviso: 'Documento gerado pelo Safety Nexo com os dados registrados no sistema.',
      infos: [['Empresa', ctx.empresa.razaoSocial], ['CNPJ', ctx.empresa.cnpj], ['Período', `${d.serie[0].mes.split('-').reverse().join('/')} a ${d.filtro.fim.split('-').reverse().join('/')}`], ['Setor', d.filtro.setor ?? 'Todos']] as [string, string][] };
    const url = `${(process.env.WEB_ORIGIN ?? 'http://localhost:3000').split(',')[0].trim().replace(/\/$/, '')}/empresas/${e}/ssma`;
    return this.pdf.render(painelSsmaHtml({ ...m, qr: await QRCode.toDataURL(url, { margin: 0, width: 160 }) }, d));
  }
}
