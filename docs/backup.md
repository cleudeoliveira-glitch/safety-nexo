# Backup do Safety Nexo

Os documentos de SST precisam ser guardados por muitos anos (até 20, no caso de PCMSO, ASO e laudos de quem tem exposição). Por isso o sistema faz cópias sozinho, todos os dias.

## O que é copiado e onde fica

| Cópia | Quando | Onde fica | Por quanto tempo |
|---|---|---|---|
| Banco de dados inteiro | Todo dia, às 3h | GitHub, aba **Actions > Backup**, no fim da página de cada execução | 90 dias |
| Banco de dados (cópia do mês) | Dia 1º de cada mês | Supabase Storage, bucket `safety-nexo-backup`, pasta `mensal/` | Não é apagada |
| Arquivos (logos, PDFs de ASO, fotos) | Domingos | GitHub, junto com a cópia do dia | 90 dias |

Toda cópia sai trancada com senha (AES-256) antes de deixar o servidor. Sem a senha, ninguém abre, nem quem tiver acesso ao GitHub ou ao Supabase.

## Para ligar (uma vez só)

No GitHub, vá em **Settings > Secrets and variables > Actions > New repository secret** e crie:

1. `BACKUP_DATABASE_URL`: no Supabase, clique em **Connect**, escolha **Session pooler** e copie o endereço (troque `[YOUR-PASSWORD]` pela senha do banco).
2. `BACKUP_SENHA`: uma senha longa, com pelo menos 16 caracteres, só para os backups. **Anote essa senha num lugar seguro e fora do sistema** (um cofre de senhas, por exemplo). Se ela se perder, as cópias não abrem.
3. `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`: os mesmos valores que estão no Render.

Depois, em **Actions > Backup > Run workflow**, rode uma vez à mão para conferir se tudo está certo. A execução manual faz as três cópias de uma vez.

## Como restaurar

Só precisa disso se o banco se perder ou for estragado.

1. Baixe a cópia (o `.zip` da execução no GitHub, ou o arquivo da pasta `mensal/` no Supabase) e descompacte.
2. Abra a cópia com a senha:

   ```sh
   gpg -d -o banco.dump banco-AAAA-MM-DD.dump.gpg
   ```

3. Restaure num banco vazio, de preferência um projeto novo do Supabase. Assim o banco antigo fica intacto até você conferir:

   ```sh
   pg_restore --no-owner -d "ENDERECO_DO_BANCO_NOVO" banco.dump
   ```

   O aviso `schema "public" already exists` é normal e pode ser ignorado.

4. Para os arquivos, faça o mesmo com `arquivos-AAAA-MM-DD.tar.gz.gpg` (`gpg -d` e depois `tar -xzf`). Em seguida, suba as pastas para o bucket `safety-nexo` do Supabase com os mesmos nomes.
5. Troque o `DATABASE_URL` no Render pelo endereço do banco novo e reinicie o servidor.

## Se o backup falhar

O GitHub manda um e-mail para o dono do repositório quando uma execução dá erro. A mensagem diz o que faltou. Na maioria das vezes é um segredo que não foi cadastrado ou uma senha do banco que mudou.
