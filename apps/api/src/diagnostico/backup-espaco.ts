import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Publica } from '../auth/publica.decorator';
import { conferirSegredo } from '../common/segredo';
import { PrismaService } from '../prisma/prisma.service';

// Diagnóstico do ADM: se o backup da noite deu certo (e se a cópia abriu no teste de restauração)
// e quanto do Supabase gratuito já foi usado. O aviso do backup vem do próprio GitHub (.github/workflows/backup.yml).

const HORA = 3_600_000;
const CHAVE = 'backup:ultimo';
// Plano gratuito do Supabase: 500 MB de banco e 1 GB de arquivos (conferir em supabase.com/pricing se mudar de plano).
export const LIMITE_BANCO_MB = Number(process.env.LIMITE_BANCO_MB ?? 500);
export const LIMITE_ARQUIVOS_MB = Number(process.env.LIMITE_ARQUIVOS_MB ?? 1024);

export class AvisoBackupDto {
  @IsBoolean() ok!: boolean;
  @IsOptional() @IsBoolean() restaurado?: boolean;
  @IsOptional() @IsInt() @Min(0) tabelas?: number;
  @IsOptional() @IsInt() @Min(0) colaboradores?: number;
  @IsOptional() @IsInt() @Min(0) tamanhoKb?: number;
  @IsOptional() @IsString() @MaxLength(500) mensagem?: string;
}

type Item = { id: string; grupo: string; titulo: string; situacao: 'ok' | 'atencao' | 'falha'; resumo: string; detalhes?: string[]; comoResolver?: string };
const quando = (d: string) => new Date(d).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export async function itemBackup(prisma: PrismaService, grupo: string): Promise<Item> {
  const salvo = await prisma.configPlataforma.findUnique({ where: { chave: CHAVE } });
  const comoResolver = 'No GitHub, abra Actions > Backup e veja a última execução. Se faltar segredo (BACKUP_DATABASE_URL, BACKUP_SENHA ou TAREFAS_SEGREDO), o próprio passo diz qual.';
  if (!salvo) return { id: 'backup', grupo, titulo: 'Backup: aguardando o primeiro aviso', situacao: 'atencao', resumo: 'O backup roda todo dia às 3h e avisa aqui quando termina. Ainda não chegou nenhum aviso.', comoResolver };
  const b = JSON.parse(salvo.valor) as AvisoBackupDto & { em: string };
  const horas = (Date.now() - new Date(b.em).getTime()) / HORA;
  const detalhes = [
    `Último backup: ${quando(b.em)}`,
    b.restaurado === undefined ? '' : b.restaurado ? `Teste de restauração: a cópia abriu (${b.tabelas ?? '?'} tabelas, ${b.colaboradores ?? '?'} colaboradores)` : 'Teste de restauração: a cópia NÃO abriu',
    b.tamanhoKb ? `Tamanho da cópia: ${(b.tamanhoKb / 1024).toFixed(1)} MB` : '',
    b.mensagem ?? '',
  ].filter(Boolean);
  if (!b.ok || b.restaurado === false) return { id: 'backup', grupo, titulo: 'Backup com problema', situacao: 'falha', resumo: b.mensagem || 'A última cópia não foi feita ou não abriu no teste de restauração.', detalhes, comoResolver };
  if (horas > 36) return { id: 'backup', grupo, titulo: 'Backup atrasado', situacao: 'falha', resumo: `O último backup foi em ${quando(b.em)}. Ele devia rodar todo dia às 3h.`, detalhes, comoResolver };
  return { id: 'backup', grupo, titulo: 'Backup em dia e testado', situacao: 'ok', resumo: `Cópia feita em ${quando(b.em)}${b.restaurado ? ' e aberta com sucesso no teste de restauração' : ''}.`, detalhes };
}

export function situacaoEspaco(usadoMb: number, limiteMb: number): 'ok' | 'atencao' | 'falha' {
  const p = usadoMb / limiteMb;
  return p >= 0.9 ? 'falha' : p >= 0.7 ? 'atencao' : 'ok';
}

export async function itensEspaco(prisma: PrismaService, grupo: string): Promise<Item[]> {
  const comoResolver = 'Quando passar de 70%, é hora de pensar no plano pago do Supabase (Pro). Até lá, nada precisa ser feito.';
  const itens: Item[] = [];
  const [{ bytes: banco }] = await prisma.$queryRaw<{ bytes: bigint }[]>`SELECT pg_database_size(current_database()) AS bytes`;
  const bancoMb = Number(banco) / 1_048_576;
  const sb = situacaoEspaco(bancoMb, LIMITE_BANCO_MB);
  itens.push({ id: 'espaco-banco', grupo, titulo: `Espaço do banco: ${Math.round((bancoMb / LIMITE_BANCO_MB) * 100)}% usado`, situacao: sb, resumo: `${bancoMb.toFixed(0)} MB de ${LIMITE_BANCO_MB} MB do plano gratuito do Supabase.`, ...(sb === 'ok' ? {} : { comoResolver }) });
  try {
    const [{ bytes }] = await prisma.$queryRaw<{ bytes: bigint | null }[]>`SELECT COALESCE(SUM((metadata->>'size')::bigint), 0) AS bytes FROM storage.objects`;
    const arqMb = Number(bytes ?? 0) / 1_048_576;
    const sa = situacaoEspaco(arqMb, LIMITE_ARQUIVOS_MB);
    itens.push({ id: 'espaco-arquivos', grupo, titulo: `Espaço dos arquivos: ${Math.round((arqMb / LIMITE_ARQUIVOS_MB) * 100)}% usado`, situacao: sa, resumo: `${arqMb.toFixed(0)} MB de ${LIMITE_ARQUIVOS_MB} MB (logos, PDFs e fotos).`, ...(sa === 'ok' ? {} : { comoResolver }) });
  } catch {
    // Banco sem o esquema "storage" (uso local): não há o que medir.
  }
  return itens;
}

// Chamado pelo GitHub ao fim do backup diário.
@Publica()
@Controller('tarefas')
export class BackupTarefaController {
  constructor(private readonly prisma: PrismaService) {}
  @Post('backup') @HttpCode(200)
  async avisar(@Headers('x-tarefa-segredo') segredo: string | undefined, @Body() d: AvisoBackupDto) {
    conferirSegredo(segredo, process.env.TAREFAS_SEGREDO, 'Falta TAREFAS_SEGREDO no servidor.', 'Segredo da tarefa incorreto.');
    const valor = JSON.stringify({ ...d, em: new Date().toISOString() });
    await this.prisma.configPlataforma.upsert({ where: { chave: CHAVE }, create: { chave: CHAVE, valor }, update: { valor } });
    return { ok: true };
  }
}
