import { BadGatewayException, BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { abrirCertificado } from './certificado';
import { cifrar, decifrar } from './cifra';
import { MAX_EVENTOS_POR_LOTE } from './configuracao';
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
        atualizados++;
      }
    }
    return { atualizados };
  }
}
