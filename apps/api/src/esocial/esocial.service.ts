import { BadGatewayException, BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { abrirCertificado } from './certificado';
import { cifrar, decifrar } from './cifra';
import { assinarEvento } from './assinatura';
import { Ambiente, AMBIENTES, gerarIdEvento, MAX_EVENTOS_POR_LOTE } from './configuracao';
import { Identificacao, montarS2210, montarS2220, montarS2221, montarS2230, montarS2240, montarS3000, soDocumento } from './eventos';
import { ToxicologicoDto } from './dto';
import { Faltas, INICIO_SST, multaDiagnostico, MULTA_S2220, MULTA_S2240, multaS2210, NOTA_DIAGNOSTICO } from './diagnostico';
import { consultarLote, enviarLote, montarLote } from './transmissao';

@Injectable()
export class EsocialService {
  constructor(private readonly prisma: PrismaService) {}

  // Certificado: só os dados públicos saem da API; arquivo e senha ficam cifrados no banco.
  async certificado(consultoriaId: string) {
    const c = await this.prisma.certificadoDigital.findUnique({ where: { consultoriaId } });
    return c ? { titular: c.titular, documento: c.documento, tipoDocumento: c.tipoDocumento, validoDe: c.validoDe, validoAte: c.validoAte } : null;
  }

  async salvarCertificado(consultoriaId: string, arquivo: Express.Multer.File | undefined, senha: string | undefined) {
    if (!arquivo?.buffer?.length) throw new BadRequestException('Envie o arquivo do certificado (.pfx ou .p12).');
    if (!senha) throw new BadRequestException('Preencha a senha do certificado.');
    let aberto;
    try { aberto = abrirCertificado(arquivo.buffer, senha); } catch (e) { throw new BadRequestException((e as Error).message); }
    if (aberto.validoAte < new Date()) throw new BadRequestException(`Este certificado venceu em ${aberto.validoAte.toLocaleDateString('pt-BR')}.`);
    const dados = {
      titular: aberto.titular, documento: aberto.documento, tipoDocumento: aberto.tipoDocumento,
      validoDe: aberto.validoDe, validoAte: aberto.validoAte, pfxCifrado: cifrar(arquivo.buffer), senhaCifrada: cifrar(senha),
    };
    await this.prisma.certificadoDigital.upsert({ where: { consultoriaId }, create: { consultoriaId, ...dados }, update: dados });
    return this.certificado(consultoriaId);
  }

  async removerCertificado(consultoriaId: string) {
    await this.prisma.certificadoDigital.deleteMany({ where: { consultoriaId } });
    return { ok: true };
  }

  // Uso interno: abre o certificado para assinar e transmitir.
  async credencial(consultoriaId: string) {
    const c = await this.prisma.certificadoDigital.findUnique({ where: { consultoriaId } });
    if (!c) throw new BadRequestException('Cadastre o certificado digital da consultoria antes de transmitir.');
    if (c.validoAte < new Date()) throw new BadRequestException('O certificado digital da consultoria está vencido.');
    const pfx = decifrar(c.pfxCifrado);
    const senha = decifrar(c.senhaCifrada).toString('utf8');
    return { pfx, senha, aberto: abrirCertificado(pfx, senha), transmissor: { tipo: c.tipoDocumento as 'CNPJ' | 'CPF', documento: c.documento } };
  }

  // Falha de rede com o eSocial vira mensagem clara; os eventos continuam pendentes.
  private async falar<T>(chamada: () => Promise<T>): Promise<T> {
    try { return await chamada(); } catch (e) { throw new BadGatewayException((e as Error).message); }
  }

  private async empresa(consultoriaId: string, empresaId: string) {
    const e = await this.prisma.empresa.findFirst({ where: { id: empresaId, consultoriaId } });
    if (!e) throw new NotFoundException('Empresa não encontrada');
    return e;
  }

  async listar(consultoriaId: string, empresaId: string) {
    await this.empresa(consultoriaId, empresaId);
    const eventos = await this.prisma.eventoEsocial.findMany({ where: { empresaId }, orderBy: { createdAt: 'desc' } });
    return eventos.map(({ xml: _xml, ...e }) => e);
  }

  async xml(consultoriaId: string, empresaId: string, id: string) {
    await this.empresa(consultoriaId, empresaId);
    const e = await this.prisma.eventoEsocial.findFirst({ where: { id, empresaId } });
    if (!e) throw new NotFoundException('Evento não encontrado');
    return e;
  }

  // Tudo o que pode virar evento nesta empresa, com a situação do último evento de cada origem.
  async origens(consultoriaId: string, empresaId: string) {
    const empresa = await this.empresa(consultoriaId, empresaId);
    const [colaboradores, cats, eventos] = await Promise.all([
      this.prisma.colaborador.findMany({
        where: { empresaId }, orderBy: { nome: 'asc' },
        select: { id: true, nome: true, cpf: true, matricula: true, codCateg: true, cargo: true, dataAdmissao: true, ghe: { select: { nome: true } },
          asos: { select: { id: true, tipo: true, dataExame: true, resultado: true }, orderBy: { dataExame: 'desc' } } },
      }),
      this.prisma.cat.findMany({ where: { empresaId }, orderBy: { dataHora: 'desc' }, include: { colaborador: { select: { nome: true } } } }),
      this.prisma.eventoEsocial.findMany({ where: { empresaId }, orderBy: { createdAt: 'desc' }, select: { tipo: true, referenciaId: true, status: true, recibo: true } }),
    ]);
    const afastamentos = await this.prisma.afastamento.findMany({ where: { empresaId }, orderBy: { inicio: 'desc' }, include: { colaborador: { select: { nome: true } } } });
    const toxicologicos = await this.prisma.toxicologico.findMany({ where: { empresaId }, orderBy: { dataExame: 'desc' }, include: { colaborador: { select: { nome: true } } } });
    const ultimo = (tipo: string, ref: string) => eventos.find((e) => e.tipo === tipo && e.referenciaId === ref) ?? null;
    return {
      empresa: {
        esocialAmbiente: empresa.esocialAmbiente, medicoPcmsoNome: empresa.medicoPcmsoNome, medicoPcmsoCrm: empresa.medicoPcmsoCrm,
        medicoPcmsoCpf: empresa.medicoPcmsoCpf, medicoPcmsoUf: empresa.medicoPcmsoUf, responsavelTecnicoNome: empresa.responsavelTecnicoNome,
        responsavelTecnicoRegistro: empresa.responsavelTecnicoRegistro, responsavelTecnicoCpf: empresa.responsavelTecnicoCpf,
        responsavelTecnicoConselho: empresa.responsavelTecnicoConselho, responsavelTecnicoUf: empresa.responsavelTecnicoUf,
      },
      colaboradores: colaboradores.map((c) => ({
        ...c, ghe: c.ghe?.nome ?? null, s2240: ultimo('S-2240', c.id),
        asos: c.asos.map((a) => ({ ...a, s2220: ultimo('S-2220', a.id) })),
      })),
      cats: cats.map(({ colaborador, ...c }) => ({ ...c, colaborador: colaborador.nome, s2210: ultimo('S-2210', c.id) })),
      afastamentos: afastamentos.map(({ colaborador, ...a }) => ({ ...a, colaborador: colaborador.nome, inicioEvento: ultimo('S-2230', a.id), fimEvento: ultimo('S-2230', `${a.id}:fim`) })),
      toxicologicos: toxicologicos.map(({ colaborador, ...t }) => ({ ...t, colaborador: colaborador.nome, s2221: ultimo('S-2221', t.id) })),
    };
  }

  // ---------- geração dos eventos ----------
  // Monta, confere o que falta, assina e põe na fila. Um evento ainda não enviado da mesma origem é substituído.
  private async enfileirar(
    consultoriaId: string, empresaId: string, tipo: 'S-2210' | 'S-2220' | 'S-2221' | 'S-2230' | 'S-2240' | 'S-3000', referenciaId: string, descricao: string, retificar: boolean,
    montar: (id: Identificacao) => { xml: string; pendencias: string[] },
  ) {
    const empresa = await this.empresa(consultoriaId, empresaId);
    const ambiente = (empresa.esocialAmbiente in AMBIENTES ? empresa.esocialAmbiente : 'PRODUCAO_RESTRITA') as Ambiente;
    const anteriores = await this.prisma.eventoEsocial.findMany({ where: { empresaId, tipo, referenciaId, ambiente }, orderBy: { createdAt: 'desc' } });
    if (anteriores.some((a) => a.status === 'ENVIADO')) throw new BadRequestException('Já existe um envio deste evento aguardando a resposta do governo. Veja a resposta antes de gerar outro.');
    const aceito = anteriores.find((a) => a.status === 'PROCESSADO' && a.recibo);
    if (retificar && !aceito) throw new BadRequestException('Não há evento aceito pelo governo para corrigir. Gere o evento normal.');
    const total = await this.prisma.eventoEsocial.count({ where: { empresaId } });
    const id: Identificacao = {
      idEvento: gerarIdEvento(1, soDocumento(empresa.cnpj).slice(0, 8), new Date(), (total % 99_999) + 1),
      tpAmb: AMBIENTES[ambiente].tpAmb as 1 | 2,
      retificaRecibo: retificar ? aceito!.recibo : null,
    };
    const { xml, pendencias } = montar(id);
    if (pendencias.length) throw new BadRequestException(`Para gerar o ${tipo} falta preencher: ${pendencias.join('; ')}.`);
    const cred = await this.credencial(consultoriaId);
    const assinado = assinarEvento(xml, cred.aberto.chavePem, cred.aberto.certificadoBase64);
    await this.prisma.eventoEsocial.deleteMany({ where: { id: { in: anteriores.filter((a) => a.status === 'PENDENTE' || a.status === 'ERRO').map((a) => a.id) } } });
    const ev = await this.prisma.eventoEsocial.create({
      data: { empresaId, tipo, referenciaId, descricao: retificar ? `${descricao} (correção)` : descricao, idEvento: id.idEvento, xml: assinado, ambiente },
    });
    const { xml: _x, ...semXml } = ev;
    return semXml;
  }

  async gerarS2220(consultoriaId: string, empresaId: string, asoId: string, retificar = false) {
    const aso = await this.prisma.aso.findFirst({ where: { id: asoId, colaborador: { empresaId, empresa: { consultoriaId } } }, include: { colaborador: { include: { ghe: { include: { exames: true } } } } } });
    if (!aso) throw new NotFoundException('ASO não encontrado');
    const empresa = await this.empresa(consultoriaId, empresaId);
    const quando = aso.dataExame.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    return this.enfileirar(consultoriaId, empresaId, 'S-2220', aso.id, `ASO de ${aso.colaborador.nome} (${quando})`, retificar,
      (id) => montarS2220(id, empresa, aso.colaborador, aso, aso.colaborador.ghe?.exames ?? []));
  }

  async gerarS2240(consultoriaId: string, empresaId: string, colaboradorId: string, inicio: string | undefined, retificar = false) {
    const col = await this.prisma.colaborador.findFirst({ where: { id: colaboradorId, empresaId, empresa: { consultoriaId } }, include: { ghe: { include: { riscos: true } } } });
    if (!col) throw new NotFoundException('Colaborador não encontrado');
    const empresa = await this.empresa(consultoriaId, empresaId);
    const dia = inicio?.slice(0, 10) ?? col.dataAdmissao?.toISOString().slice(0, 10);
    const data = dia ? new Date(`${dia}T12:00:00-03:00`) : null;
    if (!data || Number.isNaN(data.getTime())) throw new BadRequestException('Preencha, ao lado do botão, a data em que o trabalhador começou nessas condições.');
    if (col.dataAdmissao && data < col.dataAdmissao) throw new BadRequestException('A data de início não pode ser antes da admissão.');
    return this.enfileirar(consultoriaId, empresaId, 'S-2240', col.id, `Riscos de ${col.nome}${col.ghe ? ` (${col.ghe.nome})` : ''}`, retificar,
      (id) => montarS2240(id, empresa, col, data));
  }

  async gerarS2210(consultoriaId: string, empresaId: string, catId: string, retificar = false) {
    const cat = await this.prisma.cat.findFirst({ where: { id: catId, empresaId, empresa: { consultoriaId } }, include: { colaborador: true } });
    if (!cat) throw new NotFoundException('CAT não encontrada');
    const empresa = await this.empresa(consultoriaId, empresaId);
    const quando = cat.dataHora.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    return this.enfileirar(consultoriaId, empresaId, 'S-2210', cat.id, `CAT de ${cat.colaborador.nome} (${quando})`, retificar,
      (id) => montarS2210(id, empresa, cat.colaborador, cat));
  }

  // Afastamento: o início vai com a volta, se já houver; depois de aceito o início, a volta vai num evento só dela.
  async gerarS2230(consultoriaId: string, empresaId: string, afastamentoId: string, retificar = false) {
    const af = await this.prisma.afastamento.findFirst({ where: { id: afastamentoId, empresaId, empresa: { consultoriaId } }, include: { colaborador: true } });
    if (!af) throw new NotFoundException('Afastamento não encontrado');
    const empresa = await this.empresa(consultoriaId, empresaId);
    const inicioAceito = await this.prisma.eventoEsocial.findFirst({ where: { empresaId, tipo: 'S-2230', referenciaId: af.id, status: 'PROCESSADO' } });
    const fase = inicioAceito && !retificar ? 'fim' : 'inicio';
    if (fase === 'fim' && !af.fim) throw new BadRequestException('O início do afastamento já foi aceito. Registre a data da volta para enviar o término.');
    const anteriores = await this.prisma.afastamento.findMany({ where: { colaboradorId: af.colaboradorId } });
    const quando = af.inicio.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    const ref = fase === 'fim' ? `${af.id}:fim` : af.id;
    const texto = fase === 'fim' ? `Volta de ${af.colaborador.nome} (afastado desde ${quando})` : `Afastamento de ${af.colaborador.nome} desde ${quando}`;
    return this.enfileirar(consultoriaId, empresaId, 'S-2230', ref, texto, retificar,
      (id) => montarS2230(id, empresa, af.colaborador, af, fase, anteriores));
  }

  // ---------- S-2221: exame toxicológico ----------
  async registrarToxicologico(consultoriaId: string, empresaId: string, d: ToxicologicoDto) {
    await this.empresa(consultoriaId, empresaId);
    const col = await this.prisma.colaborador.findFirst({ where: { id: d.colaboradorId, empresaId } });
    if (!col) throw new NotFoundException('Colaborador não encontrado');
    return this.prisma.toxicologico.create({
      data: {
        empresaId, colaboradorId: col.id, dataExame: new Date(d.dataExame.slice(0, 10)), cnpjLaboratorio: d.cnpjLaboratorio.replace(/\D/g, ''),
        codigoExame: d.codigoExame.toUpperCase().replace(/[^A-Z0-9]/g, ''), medicoNome: d.medicoNome.trim(), medicoCrm: d.medicoCrm?.trim() || null, medicoUf: d.medicoUf?.trim().toUpperCase() || null,
      },
    });
  }

  async removerToxicologico(consultoriaId: string, empresaId: string, id: string) {
    await this.empresa(consultoriaId, empresaId);
    const enviado = await this.prisma.eventoEsocial.findFirst({ where: { empresaId, tipo: 'S-2221', referenciaId: id, status: { in: ['ENVIADO', 'PROCESSADO'] } } });
    if (enviado) throw new BadRequestException('Este exame já foi enviado ao eSocial. Para tirar, exclua o evento no eSocial (S-3000).');
    const { count } = await this.prisma.toxicologico.deleteMany({ where: { id, empresaId } });
    if (!count) throw new NotFoundException('Exame não encontrado');
    return { ok: true };
  }

  async gerarS2221(consultoriaId: string, empresaId: string, toxicologicoId: string, retificar = false) {
    const t = await this.prisma.toxicologico.findFirst({ where: { id: toxicologicoId, empresaId, empresa: { consultoriaId } }, include: { colaborador: true } });
    if (!t) throw new NotFoundException('Exame toxicológico não encontrado');
    const empresa = await this.empresa(consultoriaId, empresaId);
    const quando = t.dataExame.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    return this.enfileirar(consultoriaId, empresaId, 'S-2221', t.id, `Toxicológico de ${t.colaborador.nome} (${quando})`, retificar,
      (id) => montarS2221(id, empresa, t.colaborador, t));
  }

  // ---------- S-3000: excluir um evento aceito ----------
  async gerarS3000(consultoriaId: string, empresaId: string, eventoId: string) {
    const empresa = await this.empresa(consultoriaId, empresaId);
    const ev = await this.prisma.eventoEsocial.findFirst({ where: { id: eventoId, empresaId } });
    if (!ev) throw new NotFoundException('Evento não encontrado');
    if (ev.tipo === 'S-3000') throw new BadRequestException('Não dá para excluir uma exclusão.');
    if (ev.status !== 'PROCESSADO' || !ev.recibo) throw new BadRequestException('Só dá para excluir evento aceito pelo governo (com recibo). Evento pendente ou com erro pode ser apagado gerando de novo.');
    const cpf = await this.cpfDoEvento(ev.tipo, ev.referenciaId, empresaId);
    return this.enfileirar(consultoriaId, empresaId, 'S-3000', ev.id, `Exclusão do ${ev.tipo}: ${ev.descricao}`, false,
      (id) => montarS3000(id, empresa, ev.tipo, ev.recibo!, cpf));
  }

  // CPF do trabalhador do evento original (a origem é ASO, colaborador, CAT, afastamento ou toxicológico).
  private async cpfDoEvento(tipo: string, referenciaId: string, empresaId: string) {
    const ref = referenciaId.split(':')[0];
    const sel = { select: { colaborador: { select: { cpf: true } } } } as const;
    if (tipo === 'S-2240') return (await this.prisma.colaborador.findFirst({ where: { id: ref, empresaId }, select: { cpf: true } }))?.cpf ?? null;
    if (tipo === 'S-2220') return (await this.prisma.aso.findFirst({ where: { id: ref }, ...sel }))?.colaborador.cpf ?? null;
    if (tipo === 'S-2210') return (await this.prisma.cat.findFirst({ where: { id: ref, empresaId }, ...sel }))?.colaborador.cpf ?? null;
    if (tipo === 'S-2230') return (await this.prisma.afastamento.findFirst({ where: { id: ref, empresaId }, ...sel }))?.colaborador.cpf ?? null;
    if (tipo === 'S-2221') return (await this.prisma.toxicologico.findFirst({ where: { id: ref, empresaId }, ...sel }))?.colaborador.cpf ?? null;
    return null;
  }

  // Envia os eventos pendentes da empresa em lotes de até 50 e guarda o protocolo.
  async enviarPendentes(consultoriaId: string, empresaId: string) {
    const empresa = await this.empresa(consultoriaId, empresaId);
    const pendentes = await this.prisma.eventoEsocial.findMany({ where: { empresaId, status: { in: ['PENDENTE', 'ERRO'] }, protocolo: null }, orderBy: { createdAt: 'asc' } });
    if (!pendentes.length) throw new BadRequestException('Não há eventos pendentes para enviar.');
    const cred = await this.credencial(consultoriaId);
    const resultados = [];
    for (const ambiente of [...new Set(pendentes.map((p) => p.ambiente))]) {
      const doAmbiente = pendentes.filter((p) => p.ambiente === ambiente);
      for (let i = 0; i < doAmbiente.length; i += MAX_EVENTOS_POR_LOTE) {
        const grupo = doAmbiente.slice(i, i + MAX_EVENTOS_POR_LOTE);
        const r = await this.falar(() => enviarLote(ambiente as 'PRODUCAO' | 'PRODUCAO_RESTRITA', montarLote(empresa.cnpj, cred.transmissor, grupo), cred));
        // 201 = lote recebido com sucesso; o processamento é consultado depois pelo protocolo.
        const aceito = r.cdResposta === '201' && r.protocolo;
        await this.prisma.eventoEsocial.updateMany({
          where: { id: { in: grupo.map((g) => g.id) } },
          data: aceito
            ? { status: 'ENVIADO', protocolo: r.protocolo, mensagens: [] }
            : { status: 'ERRO', mensagens: [{ codigo: r.cdResposta, descricao: r.descResposta }, ...r.ocorrencias] },
        });
        resultados.push({ eventos: grupo.length, cdResposta: r.cdResposta, descResposta: r.descResposta, protocolo: r.protocolo });
      }
    }
    return resultados;
  }

  // ---------- todas as empresas de uma vez ----------
  // Situação dos eventos de cada empresa, para a tela geral do eSocial.
  async resumoGeral(consultoriaId: string) {
    const empresas = await this.prisma.empresa.findMany({ where: { consultoriaId }, orderBy: { razaoSocial: 'asc' }, select: { id: true, razaoSocial: true, cnpj: true, esocialAmbiente: true } });
    const grupos = await this.prisma.eventoEsocial.groupBy({ by: ['empresaId', 'status'], where: { empresa: { consultoriaId } }, _count: { _all: true } });
    return empresas.map((e) => {
      const n = (st: string) => grupos.find((g) => g.empresaId === e.id && g.status === st)?._count._all ?? 0;
      return { ...e, pendentes: n('PENDENTE'), enviados: n('ENVIADO'), aceitos: n('PROCESSADO'), erros: n('ERRO'), excluidos: n('EXCLUIDO') };
    });
  }

  // Diagnóstico: o que falta enviar em cada empresa e a multa estimada (só olha o que está cadastrado no Safety Nexo).
  async diagnostico(consultoriaId: string) {
    const empresas = await this.prisma.empresa.findMany({
      where: { consultoriaId }, orderBy: { razaoSocial: 'asc' },
      select: {
        id: true, razaoSocial: true, cnpj: true,
        colaboradores: { select: { id: true, nome: true, cpf: true, matricula: true, codCateg: true, asos: { where: { dataExame: { gte: INICIO_SST } }, select: { id: true } } } },
        cats: { select: { id: true } },
        afastamentos: { where: { motivo: { in: ['01', '03'] } }, select: { id: true } },
        eventosEsocial: { select: { tipo: true, referenciaId: true, status: true } },
      },
    });
    const lista = empresas.map((e) => {
      const aceitos = new Set(e.eventosEsocial.filter((x) => x.status === 'PROCESSADO' || x.status === 'ENVIADO').map((x) => `${x.tipo}|${x.referenciaId}`));
      const tem = (tipo: string, ref: string) => aceitos.has(`${tipo}|${ref}`);
      const semS2240 = e.colaboradores.filter((c) => !tem('S-2240', c.id));
      const asosSemS2220 = e.colaboradores.flatMap((c) => c.asos.filter((a) => !tem('S-2220', a.id)));
      const faltas: Faltas = {
        s2240: semS2240.length,
        s2220: asosSemS2220.length,
        s2210: e.cats.filter((c) => !tem('S-2210', c.id)).length,
        s2230: e.afastamentos.filter((a) => !tem('S-2230', a.id)).length,
        cadastros: e.colaboradores.filter((c) => !c.cpf || (!c.matricula && !c.codCateg)).length,
        erros: e.eventosEsocial.filter((x) => x.status === 'ERRO').length,
      };
      return { empresaId: e.id, razaoSocial: e.razaoSocial, cnpj: e.cnpj, trabalhadores: e.colaboradores.length, faltas, multa: multaDiagnostico(faltas) };
    });
    const total = lista.reduce((t, x) => ({ minimo: t.minimo + x.multa.minimo, maximo: t.maximo + x.multa.maximo }), { minimo: 0, maximo: 0 });
    return { empresas: lista, total, valores: { s2220: MULTA_S2220, s2240: MULTA_S2240, s2210: multaS2210() }, nota: NOTA_DIAGNOSTICO };
  }

  // Envia os pendentes de todas as empresas com o certificado da consultoria. Uma empresa com problema não para as outras.
  async enviarTodas(consultoriaId: string) {
    await this.credencial(consultoriaId);
    const empresas = await this.prisma.empresa.findMany({ where: { consultoriaId, eventosEsocial: { some: { status: { in: ['PENDENTE', 'ERRO'] }, protocolo: null } } }, select: { id: true, razaoSocial: true } });
    if (!empresas.length) throw new BadRequestException('Nenhuma empresa tem eventos pendentes para enviar.');
    const resultado = [];
    for (const e of empresas) {
      try {
        const r = await this.enviarPendentes(consultoriaId, e.id);
        resultado.push({ empresa: e.razaoSocial, ok: r.every((x) => x.cdResposta === '201'), eventos: r.reduce((s, x) => s + x.eventos, 0), mensagem: r.map((x) => x.descResposta).filter(Boolean).join('; ') });
      } catch (err) {
        resultado.push({ empresa: e.razaoSocial, ok: false, eventos: 0, mensagem: (err as Error).message });
      }
    }
    return resultado;
  }

  async consultarTodas(consultoriaId: string) {
    await this.credencial(consultoriaId);
    const empresas = await this.prisma.empresa.findMany({ where: { consultoriaId, eventosEsocial: { some: { status: 'ENVIADO', protocolo: { not: null } } } }, select: { id: true, razaoSocial: true } });
    if (!empresas.length) throw new BadRequestException('Nenhuma empresa tem envios aguardando a resposta do governo.');
    const resultado = [];
    for (const e of empresas) {
      try { const r = await this.consultarEnviados(consultoriaId, e.id); resultado.push({ empresa: e.razaoSocial, ok: true, atualizados: r.atualizados, mensagem: '' }); }
      catch (err) { resultado.push({ empresa: e.razaoSocial, ok: false, atualizados: 0, mensagem: (err as Error).message }); }
    }
    return resultado;
  }

  // Consulta os lotes enviados e grava recibo (aceito) ou ocorrências (rejeitado) em cada evento.
  async consultarEnviados(consultoriaId: string, empresaId: string) {
    await this.empresa(consultoriaId, empresaId);
    const enviados = await this.prisma.eventoEsocial.findMany({ where: { empresaId, status: 'ENVIADO', protocolo: { not: null } } });
    if (!enviados.length) throw new BadRequestException('Não há lotes aguardando retorno.');
    const cred = await this.credencial(consultoriaId);
    let atualizados = 0;
    for (const protocolo of [...new Set(enviados.map((e) => e.protocolo!))]) {
      const ambiente = enviados.find((e) => e.protocolo === protocolo)!.ambiente as 'PRODUCAO' | 'PRODUCAO_RESTRITA';
      const r = await this.falar(() => consultarLote(ambiente, protocolo, cred));
      for (const ev of r.eventos) {
        const alvo = enviados.find((e) => e.idEvento === ev.idEvento);
        if (!alvo) continue;
        // 201 = evento processado com sucesso.
        const ok = ev.cdResposta === '201' && ev.recibo;
        await this.prisma.eventoEsocial.update({
          where: { id: alvo.id },
          data: ok ? { status: 'PROCESSADO', recibo: ev.recibo, mensagens: ev.ocorrencias } : { status: 'ERRO', protocolo: null, mensagens: [{ codigo: ev.cdResposta, descricao: ev.descResposta }, ...ev.ocorrencias] },
        });
        if (ok && alvo.tipo === 'S-2210') await this.prisma.cat.updateMany({ where: { id: alvo.referenciaId }, data: { recibo: ev.recibo, enviadaEm: new Date() } });
        // Exclusão aceita: o evento original deixa de valer no eSocial.
        if (ok && alvo.tipo === 'S-3000') await this.prisma.eventoEsocial.updateMany({ where: { id: alvo.referenciaId }, data: { status: 'EXCLUIDO' } });
        atualizados++;
      }
    }
    return { atualizados };
  }
}
