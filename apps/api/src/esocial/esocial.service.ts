import { BadGatewayException, BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { abrirCertificado } from './certificado';
import { cifrar, decifrar } from './cifra';
import { assinarEvento } from './assinatura';
import { Ambiente, AMBIENTES, gerarIdEvento, MAX_EVENTOS_POR_LOTE } from './configuracao';
import { Identificacao, montarS2210, montarS2220, montarS2230, montarS2240, soDocumento } from './eventos';
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
    };
  }

  // ---------- geração dos eventos ----------
  // Monta, confere o que falta, assina e põe na fila. Um evento ainda não enviado da mesma origem é substituído.
  private async enfileirar(
    consultoriaId: string, empresaId: string, tipo: 'S-2210' | 'S-2220' | 'S-2230' | 'S-2240', referenciaId: string, descricao: string, retificar: boolean,
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
        atualizados++;
      }
    }
    return { atualizados };
  }
}
