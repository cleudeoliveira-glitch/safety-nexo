// "Como usar esta tela": o passo a passo de cada tela do sistema, em linguagem simples.
// Cada guia vale para um endereço; "aba" liga a parte do guia à aba aberta (o "#" do endereço).
export type ParteGuia = { titulo: string; aba?: string; passos: string[] };
export type GuiaTela = { id: string; endereco: RegExp; titulo: string; paraQue: string; partes: ParteGuia[]; dicas?: string[] };

const EMP = '/empresas/[^/]+';
const rota = (resto: string) => new RegExp(`^${EMP}${resto}$`);

export const GUIAS: GuiaTela[] = [
  {
    id: 'calculadoras',
    endereco: /^\/calculadoras$/,
    titulo: 'Calculadoras de SST',
    paraQue: 'Contas rápidas das normas, sem precisar abrir a NR: CIPA, SESMT, brigada, ruído, calor e taxas de acidentes.',
    partes: [{ titulo: 'Como usar', passos: ['Escolha a calculadora.', 'Preencha os números pedidos. O "?" ao lado de cada campo explica o que colocar.', 'O resultado aparece na hora, com a norma usada.', 'Para guardar o resultado na empresa, use a tela da própria empresa (CIPA, Emergência e brigada, Laudos).'] }],
  },
  {
    id: 'painel',
    endereco: /^\/$/,
    titulo: 'Painel',
    paraQue: 'É a primeira tela depois de entrar. Mostra a empresa em foco, quanto do cadastro está pronto, o que fazer hoje, os vencimentos e os números de segurança.',
    partes: [
      {
        titulo: 'Como usar',
        passos: [
          'Escolha a empresa no alto do menu da esquerda (no celular, o menu abre pelo botão ☰).',
          'Olhe o círculo "Saúde da Empresa": é quanto do cadastro está completo. A meta é 100%.',
          'Em "O que fazer hoje", cada linha diz o próximo passo. Vermelho é vencido, laranja é pendente.',
          'Em "Indicadores da empresa" você vê, em números, o que está em dia (ASO, EPI, treinamentos, DDS) e os acidentes do mês.',
          'Use o "Acesso rápido" para abrir os módulos mais usados. Os outros ficam no menu.',
        ],
      },
    ],
    dicas: ['Sem empresa cadastrada, o painel mostra só as boas-vindas. Cadastre a primeira empresa e ele se enche de informação.'],
  },
  {
    id: 'geral',
    endereco: /^\/geral$/,
    titulo: 'Visão geral das empresas',
    paraQue: 'Dashboard da consultoria: todas as empresas clientes numa tela só, da que mais precisa de atenção para a que menos precisa.',
    partes: [
      {
        titulo: 'Como usar',
        passos: [
          'No topo aparecem os totais: quantas empresas, a saúde média e quantos itens vencidos existem.',
          'Cada linha é uma empresa, com o percentual preenchido, os vencidos, os pendentes e o principal problema.',
          'Clique numa empresa para abrir o painel dela.',
        ],
      },
    ],
  },
  {
    id: 'nova-empresa',
    endereco: /^\/empresas\/nova$/,
    titulo: 'Cadastrar empresa',
    paraQue: 'Aqui entra cada empresa cliente. Com o CNAE, o sistema já sugere o grau de risco.',
    partes: [
      {
        titulo: 'Como preencher',
        passos: [
          'Razão social e CNPJ: copie do cartão CNPJ da empresa.',
          'CNAE principal: também está no cartão CNPJ (ex.: 10.91-1-02 para padaria). O grau de risco aparece sozinho.',
          'Confira o grau de risco. Se precisar, ajuste (ele vai de 1 a 4, pela NR-04).',
          'Número de funcionários: o total de hoje. Ele define CIPA, brigada e outras obrigações.',
          'Logo da empresa: opcional. Ela sai no cabeçalho dos documentos.',
          'Clique em salvar. A empresa passa a ser a "empresa em foco" no menu.',
        ],
      },
    ],
    dicas: ['Cada campo tem um "?" ao lado com o que é, onde achar e um exemplo.'],
  },
  {
    id: 'empresa',
    endereco: rota(''),
    titulo: 'Cadastro da empresa',
    paraQue: 'É a base de tudo: dados da empresa, grupos de exposição (GHE), riscos, exames, colaboradores e os documentos em PDF.',
    partes: [
      { titulo: '1. Dados da empresa', aba: 'dados', passos: ['Confira CNAE, grau de risco e número de funcionários.', 'Envie a logo da empresa cliente (sai no cabeçalho dos PDFs).', 'Preencha o responsável técnico, o registro profissional e o representante legal.', 'Clique em salvar.'] },
      {
        titulo: '2. GHEs, riscos e exames',
        aba: 'ghes',
        passos: [
          'GHE é um grupo de pessoas que têm os mesmos riscos (ex.: "Produção", "Escritório"). Crie um para cada grupo.',
          'Dentro de cada GHE, inclua os riscos: escolha o tipo (físico, químico, biológico, ergonômico, acidente), o agente, a fonte e a severidade.',
          'Escreva as medidas de controle que já existem (EPC, EPI, procedimentos).',
          'Inclua os exames do PCMSO para o GHE, com o tipo (admissional, periódico...) e de quantos em quantos meses.',
          'Tem um PGR antigo em PDF? Use "Traga com IA" para preencher mais rápido.',
        ],
      },
      { titulo: '3. Colaboradores', aba: 'colaboradores', passos: ['Cadastre nome, CPF, cargo, data de admissão e o GHE.', 'Clique no nome para abrir a ficha: ASO, entrega de EPI e ordem de serviço.', 'Muitos funcionários? Use "Importar funcionários do RH" no menu, com a planilha.'] },
      { titulo: '4. Médico do PCMSO', passos: ['Informe o nome e o CRM do médico responsável. Ele sai no PCMSO.'] },
      { titulo: '5. CIPA', aba: 'cipa', passos: ['O sistema calcula quantos membros a empresa precisa pela NR-05.', 'Informe o início do mandato para receber os avisos de prazo.', 'A eleição completa fica em "Eleição da CIPA" no menu.'] },
      { titulo: '6. Documentos', aba: 'documentos', passos: ['Com os dados completos, clique para gerar o PGR, PCMSO, LTCAT, LIP, LPP e os outros.', 'O PDF sai com a logo da empresa no cabeçalho e a da consultoria no rodapé.', 'Cada documento gerado fica guardado com a versão e a data de vencimento.'] },
      { titulo: '7. Acesso da empresa', passos: ['Crie um login para a empresa cliente usar o sistema no dia a dia (DDS, EPI, inspeções).', 'Ela vê só os dados dela.'] },
    ],
  },
  {
    id: 'colaborador',
    endereco: rota('/colaboradores/[^/]+'),
    titulo: 'Ficha do colaborador',
    paraQue: 'Tudo de uma pessoa: ASO, entregas de EPI, foto para a lista de presença e reconhecimento facial.',
    partes: [
      { titulo: 'ASO', passos: ['Escolha o tipo de exame, a data, o resultado e o médico com CRM.', 'O sistema calcula o próximo exame e avisa no painel quando estiver vencendo.', 'Baixe o ASO em PDF para assinar.'] },
      { titulo: 'Entrega de EPI', passos: ['Escolha o EPI do almoxarifado (a baixa no estoque é automática) ou digite um novo.', 'Informe o número do CA e a validade, a quantidade e o motivo (primeira entrega, troca, perda).', 'Baixe a ficha de EPI para o colaborador assinar. Se o reconhecimento facial estiver ligado, a entrega pode ser confirmada pelo rosto.'] },
    ],
    dicas: ['O CA do EPI se consulta no site do Ministério do Trabalho. CA vencido aparece em vermelho no painel.'],
  },
  {
    id: 'operacao',
    endereco: rota('/operacao'),
    titulo: 'Operação diária',
    paraQue: 'O dia a dia no campo: análise de risco (APR), permissão de trabalho (PT), DDS e inspeções das NRs.',
    partes: [
      { titulo: 'APR (análise de risco)', aba: 'apr', passos: ['Descreva a atividade, o local, a data e o responsável.', 'Divida o serviço em etapas. Para cada etapa, escreva os riscos e as medidas de controle.', 'Se quiser, envie uma foto do local.', 'Salve e baixe o PDF para a equipe assinar.'] },
      { titulo: 'Permissão de trabalho', aba: 'pt', passos: ['Escolha o tipo: altura, espaço confinado, quente ou elétrico. Os itens de verificação da NR aparecem prontos.', 'Ligue a PT a uma APR da mesma atividade.', 'Informe de quando até quando ela vale e quem emitiu.', 'Marque os itens conferidos no local. Ao terminar o serviço, encerre a PT.'] },
      {
        titulo: 'DDS',
        aba: 'dds',
        passos: [
          'Escolha um assunto ou procure um tema (ex.: "escada"). Abra a lista "Tema pronto" e escolha.',
          'O roteiro aparece pronto: um caso para contar, o que falar, a dinâmica vivencial de 3 minutos e a pergunta para a equipe.',
          'O texto vai para o campo "O que foi falado". Você pode mudar à vontade.',
          'Informe a data, a duração, quem conduziu e marque os participantes.',
          'Clique em "Registrar DDS" e use a lista de presença (no papel, pelo toque no celular ou pelo rosto).',
        ],
      },
      { titulo: 'Checklist de NRs', aba: 'checklist', passos: ['Escolha um modelo (NR-06, 10, 12, 23, 24...) ou monte o seu.', 'Informe o local, a data e quem inspecionou.', 'Marque cada item como conforme, não conforme ou não se aplica. No "não conforme", descreva o problema e tire foto.', 'Salve: os itens não conformes viram pendências e o relatório sai em PDF.'] },
    ],
    dicas: ['Para ver os 150 temas de DDS com calma, no celular, use "Biblioteca de DDS" no menu.'],
  },
  {
    id: 'dds',
    endereco: /^\/dds$/,
    titulo: 'Biblioteca de DDS',
    paraQue: '150 temas de DDS prontos para usar no campo. Cada um tem um caso para contar, o que falar, uma dinâmica vivencial e uma pergunta para a equipe.',
    partes: [
      {
        titulo: 'Como usar no campo',
        passos: [
          'Procure pelo assunto (ex.: "calor", "extintor") ou escolha uma categoria.',
          'Toque no tema para abrir o roteiro completo.',
          'Siga a ordem: 1) conte o caso, 2) fale o texto, 3) faça a dinâmica com a equipe, 4) termine com a pergunta.',
          'Sem ideia? Toque em "Sortear um tema para hoje".',
          'Para guardar o registro, toque em "Registrar este DDS": o tema já vai escolhido e você só marca quem participou.',
        ],
      },
    ],
    dicas: ['Abra esta tela uma vez com internet: depois ela funciona mesmo sem sinal no campo.'],
  },
  {
    id: 'campo',
    endereco: /^\/campo$/,
    titulo: 'Campo sem internet',
    paraQue: 'Para entregar EPI com o rosto, fazer inspeção, DDS e APR em lugares sem sinal. Tudo fica guardado no aparelho e é enviado quando a internet voltar.',
    partes: [
      { titulo: 'Antes de ir ao campo', passos: ['Abra esta tela uma vez com internet, para o aparelho guardar as empresas, os modelos de inspeção e os rostos dos funcionários.', 'No celular, use "Adicionar à tela inicial" para abrir o Safety Nexo como aplicativo.', 'Escolha a empresa no alto da tela.'] },
      { titulo: 'Entrega de EPI pelo rosto', aba: 'rosto', passos: ['Escolha o funcionário.', 'Escolha o EPI do almoxarifado (nome, CA e validade vêm prontos) ou digite o EPI e o CA.', 'Informe a quantidade e o motivo.', 'Aponte a câmera para o rosto do funcionário e peça para ele piscar: isso confirma que é a pessoa de verdade.', 'Pronto: a entrega fica registrada com o comprovante facial, mesmo sem internet.'] },
      { titulo: 'Inspeção', aba: 'inspecao', passos: ['Escolha o modelo de inspeção da norma e o local.', 'Marque cada item como conforme, não conforme ou não se aplica.', 'Nos itens não conformes, tire foto e escreva a ação de correção.', 'Salve. O relatório em PDF sai quando a internet voltar.'] },
      { titulo: 'DDS', aba: 'dds', passos: ['Procure o tema ou use o DDS do dia.', 'Leia o caso e faça a dinâmica com a equipe.', 'Colha a presença na lista de toque ou pelo rosto.', 'Salve.'] },
      { titulo: 'APR', aba: 'apr', passos: ['Escreva a atividade, o local, o responsável e a equipe.', 'Para cada passo do serviço, anote os riscos e as medidas de controle.', 'Salve e mostre a APR para a equipe antes de começar.'] },
      { titulo: 'Quando a internet voltar', passos: ['O envio é automático. No alto aparece quantos registros ainda estão esperando.', 'Se o sistema recusar algum, aparece o motivo e o botão "Tentar de novo".'] },
    ],
  },
  {
    id: 'saude',
    endereco: rota('/saude'),
    titulo: 'Saúde ocupacional',
    paraQue: 'Ergonomia (AET), acidentes (CAT) e afastamentos.',
    partes: [
      { titulo: 'Ergonomia (AET)', aba: 'aet', passos: ['Informe o posto ou atividade analisada, a data e o responsável.', 'Preencha as etapas da NR-17 na ordem: demanda, como o trabalho funciona, métodos, diagnóstico e recomendações.', 'Salve e baixe a AET em PDF.'] },
      { titulo: 'Acidentes (CAT)', aba: 'cat', passos: ['Escolha o acidentado, a data e a hora.', 'Descreva onde aconteceu, a parte do corpo, o que causou e o tipo de lesão.', 'Informe se houve afastamento e os dados do atendimento médico.', 'O sistema mostra o prazo legal de envio. Depois de enviar no eSocial, registre o número do recibo.'] },
      { titulo: 'Afastamentos', aba: 'afast', passos: ['Escolha o colaborador e o motivo.', 'Informe o primeiro dia afastado e, quando voltar, o último.', 'Afastamento de 30 dias ou mais pede ASO de retorno: o painel avisa.'] },
    ],
  },
  {
    id: 'prontuario',
    endereco: rota('/prontuario'),
    titulo: 'Prontuário de saúde',
    paraQue: 'Histórico de saúde de cada funcionário: exames, vacinas, audiometria e espirometria.',
    partes: [{ titulo: 'Como registrar', passos: ['Escolha o funcionário e o tipo de registro.', 'Preencha a data e os resultados (cada tipo mostra os seus campos).', 'Se houver próxima data (vacina, exame), o painel avisa quando chegar.'] }],
  },
  {
    id: 'psicossocial',
    endereco: rota('/psicossocial'),
    titulo: 'Psicossocial',
    paraQue: 'Avaliação anônima dos riscos psicossociais (estresse, sobrecarga) e o plano de ação.',
    partes: [
      { titulo: 'Nova avaliação', passos: ['Escolha o questionário e dê um nome à avaliação.', 'Defina o mínimo de respostas por setor (para ninguém ser identificado).', 'Compartilhe o link ou QR code com os funcionários. As respostas são anônimas.'] },
      { titulo: 'Resultado e plano', passos: ['Com respostas suficientes, aparece o mapa por setor.', 'Crie ações com responsável e prazo no plano de ação.', 'Os resultados entram no PGR como risco ergonômico.'] },
    ],
  },
  {
    id: 'prevencao',
    endereco: rota('/prevencao'),
    titulo: 'Prevenção',
    paraQue: 'Relatos dos trabalhadores pelo QR code, plano de ação e investigação de acidentes.',
    partes: [
      { titulo: 'Relatos pelo QR code', aba: 'relatos', passos: ['Imprima o QR code e cole no setor.', 'O trabalhador aponta o celular e relata um risco ou quase acidente, com foto, sem precisar de login.', 'Os relatos chegam aqui. Transforme o relato em ação do plano.'] },
      { titulo: 'Plano de ação', aba: 'acoes', passos: ['Escreva o que fazer, o local, o responsável e o prazo.', 'Escolha a prioridade e o esforço.', 'Quando terminar, marque como feita e anexe a foto de como ficou. Ações atrasadas aparecem no painel.'] },
      { titulo: 'Investigação de acidentes', aba: 'investigacao', passos: ['Dê um título, informe o local, a data e quem investigou.', 'Ligue à CAT, se houver.', 'Descreva as causas e gere as ações para não acontecer de novo.'] },
    ],
  },
  {
    id: 'almoxarifado',
    endereco: rota('/almoxarifado'),
    titulo: 'Almoxarifado de EPI',
    paraQue: 'Estoque de EPI da empresa, com aviso de compra e de CA vencido.',
    partes: [{ titulo: 'Como usar', passos: ['Inclua cada EPI com o número do CA, a validade, o tamanho e a quantidade.', 'Em "Avisar quando chegar a", coloque o estoque mínimo.', 'Ao entregar EPI na ficha do colaborador escolhendo "Do almoxarifado", a baixa é automática.', 'O painel avisa quando precisa comprar ou quando o CA venceu.'] }],
  },
  {
    id: 'treinamentos',
    endereco: rota('/treinamentos'),
    titulo: 'Treinamentos das NRs',
    paraQue: 'Turmas de treinamento com lista de presença, certificado com QR code e aviso de reciclagem.',
    partes: [{ titulo: 'Nova turma', passos: ['Comece de um modelo (são 41 modelos de 28 NRs): o conteúdo e a carga horária vêm prontos.', 'Informe o local, o início, o fim, o instrutor e a qualificação dele.', 'Inclua os participantes.', 'Salve. Depois baixe a lista de presença e os certificados. O QR code do certificado confirma que ele é verdadeiro.'] }],
    dicas: ['A validade em meses faz o painel avisar quando a reciclagem estiver chegando.'],
  },
  {
    id: 'trabalhador',
    endereco: rota('/trabalhador'),
    titulo: 'Espaço do trabalhador',
    paraQue: 'Um link para cada funcionário ver no celular os próprios ASOs, EPIs e certificados.',
    partes: [{ titulo: 'Como usar', passos: ['Gere o link do funcionário.', 'Mande o link por WhatsApp.', 'Ele abre sem senha e vê só as informações dele.'] }],
  },
  {
    id: 'cipa',
    endereco: rota('/cipa'),
    titulo: 'Eleição da CIPA',
    paraQue: 'A eleição completa: edital, inscrições, votação, ata de eleição, posse e certificados.',
    partes: [
      { titulo: '1. Datas e edital', passos: ['Preencha a data do edital, o período de inscrição, o dia, o local e o horário da eleição.', 'Baixe o edital e a ficha de inscrição para publicar.'] },
      { titulo: '2. Candidatos e votos', passos: ['Inscreva os candidatos.', 'Baixe as cédulas ou use a votação pelo celular.', 'Depois da eleição, informe os votos e quantos funcionários votaram.'] },
      { titulo: '3. Indicados pela empresa', passos: ['Escolha os representantes que a empresa indica (o mesmo número dos eleitos).'] },
      { titulo: '4. Posse e treinamento', passos: ['Informe a data da posse e o treinamento.', 'Baixe a ata de eleição, a ata de posse e os certificados.'] },
    ],
  },
  {
    id: 'cultura',
    endereco: rota('/cultura'),
    titulo: 'SIPAT e 5S',
    paraQue: 'Semana de prevenção (SIPAT) e auditorias do programa 5S.',
    partes: [
      { titulo: 'SIPAT', aba: 'sipat', passos: ['Escolha o tema e os dias.', 'Monte a programação: dia, horário, atividade, quem conduz, local e duração.', 'Baixe a programação em PDF para divulgar.'] },
      { titulo: 'Auditoria 5S', aba: '5s', passos: ['Escolha o setor, a data e quem auditou.', 'Dê a nota de cada senso e escreva as observações.', 'Veja a evolução de cada setor ao longo do tempo.'] },
    ],
  },
  {
    id: 'emergencia',
    endereco: rota('/emergencia'),
    titulo: 'Emergência e brigada',
    paraQue: 'Tamanho da brigada de incêndio, controle de AVCB e extintores, e plano de emergência.',
    partes: [
      { titulo: 'Brigada', passos: ['Escolha a ocupação e o risco de incêndio. O sistema calcula quantos brigadistas a empresa precisa.', 'Informe o coordenador, o ponto de encontro, as rotas de fuga e os telefones.', 'Baixe o plano de emergência em PDF.'] },
      { titulo: 'AVCB, extintores e equipamentos', passos: ['Inclua cada item com o tipo, o local, o número e a validade.', 'O painel avisa antes de vencer.'] },
    ],
  },
  {
    id: 'esocial',
    endereco: rota('/esocial'),
    titulo: 'eSocial',
    paraQue: 'Gera e envia os eventos de SST: S-2210 (CAT), S-2220 (ASO) e S-2240 (riscos).',
    partes: [{ titulo: 'Como usar', passos: ['Envie o certificado digital da consultoria (arquivo A1) com a senha.', 'Escolha o evento e confira os dados. O que faltar aparece em destaque.', 'Os eventos entram na fila de envio. Acompanhe a situação e o recibo de cada um.'] }],
  },
  {
    id: 'ssma',
    endereco: rota('/ssma'),
    titulo: 'Dashboard de indicadores (SSMA)',
    paraQue: 'Os números de segurança e saúde da empresa: o que está em dia, taxas de acidentes, dias perdidos, setores que mais acidentam e custos.',
    partes: [{ titulo: 'Como ler', passos: ['"O que está em dia hoje" mostra o percentual de ASO, EPI, treinamentos e DDS em dia.', '"Evolução em 12 meses" mostra os acidentes e as taxas mês a mês.', 'Use o filtro de setor para ver só um GHE.', 'Em "Dados para o cálculo", informe as horas trabalhadas e o custo de um dia de falta para as contas ficarem exatas.', 'Baixe o painel em PDF para mostrar ao cliente.'] }],
  },
  {
    id: 'fap',
    endereco: rota('/fap'),
    titulo: 'FAP e RAT',
    paraQue: 'Mostra quanto o FAP pesa na folha e quanto a empresa economiza reduzindo acidentes.',
    partes: [{ titulo: 'Como usar', passos: ['Informe o ano, o RAT (1, 2 ou 3%) e o FAP do ano (está no site da Previdência).', 'Se quiser o valor em reais, informe a folha mensal.', 'Use "E se o FAP fosse…" para simular.'] }],
  },
  {
    id: 'conectores',
    endereco: rota('/conectores'),
    titulo: 'RH, terceirizadas e atestados',
    paraQue: 'Trazer funcionários da planilha do RH, controlar terceirizadas e lançar atestados.',
    partes: [
      { titulo: 'Importar do RH', aba: 'rh', passos: ['Exporte a planilha de funcionários do sistema de RH.', 'Envie aqui e confira a lista antes de gravar.', 'Clique em gravar: os colaboradores entram de uma vez.'] },
      { titulo: 'Terceirizadas', aba: 'terceiros', passos: ['Cadastre a empresa terceirizada com o serviço, o responsável e as datas do contrato.', 'Inclua os documentos (com validade) e os trabalhadores com ASO e treinamentos.', 'Documento vencido aparece no painel.'] },
      { titulo: 'Atestados e faltas', aba: 'faltas', passos: ['Escolha o funcionário, o primeiro dia, quantos dias e o motivo.', 'Se o atestado tiver CID, informe.', 'Passou de 15 dias pela mesma doença, o painel avisa para encaminhar ao INSS.'] },
    ],
  },
  {
    id: 'arquivo',
    endereco: rota('/arquivo'),
    titulo: 'Arquivo de documentos',
    paraQue: 'Guarda todos os documentos da empresa num lugar só, por pasta.',
    partes: [{ titulo: 'Como usar', passos: ['Clique em enviar documento, dê um nome e escolha a pasta.', 'Os documentos gerados pelo sistema também aparecem aqui.', 'Use a busca para achar um documento.'] }],
  },
  {
    id: 'assinaturas',
    endereco: rota('/assinaturas'),
    titulo: 'Assinaturas',
    paraQue: 'Pedir assinatura de documentos pelo celular.',
    partes: [{ titulo: 'Como pedir', passos: ['Escolha o documento (PDF do arquivo).', 'Inclua quem precisa assinar.', 'Mande o link. A pessoa assina com o dedo na tela, e o comprovante fica guardado.'] }],
  },
  {
    id: 'historico',
    endereco: rota('/historico'),
    titulo: 'Histórico de alterações',
    paraQue: 'Mostra quem fez o quê e quando, nesta empresa.',
    partes: [{ titulo: 'Como usar', passos: ['Role a lista para ver as mudanças da mais nova para a mais antiga.', 'Use para conferir quem alterou um dado.'] }],
  },
  {
    id: 'importar-pdf',
    endereco: rota('/importar-pdf'),
    titulo: 'Trazer PGR antigo (IA)',
    paraQue: 'Envie um PGR antigo em PDF e a inteligência artificial lê e sugere os GHEs e os riscos.',
    partes: [{ titulo: 'Como usar', passos: ['Envie o PDF.', 'Espere a leitura terminar.', 'Confira o que foi encontrado e aceite o que estiver certo. Nada entra sem você conferir.'] }],
  },
  {
    id: 'comercial',
    endereco: /^\/comercial$/,
    titulo: 'Comercial',
    paraQue: 'Propostas, contratos, ordens de serviço e cobranças da consultoria.',
    partes: [
      { titulo: 'Propostas', aba: 'propostas', passos: ['Escreva o cliente, a data, a validade e os serviços com valores.', 'Baixe a proposta em PDF para enviar.'] },
      { titulo: 'Contratos', aba: 'contratos', passos: ['Comece de uma proposta aceita, se quiser.', 'Informe a empresa, o início, os serviços, a mensalidade e o dia de vencimento.'] },
      { titulo: 'Ordens de serviço', aba: 'servicos', passos: ['Escolha o cliente e o contrato, a data prevista, o que fazer e o responsável.'] },
      { titulo: 'Cobranças', aba: 'cobrancas', passos: ['As mensalidades dos contratos aparecem sozinhas.', 'Para uma cobrança avulsa, informe cliente, descrição, valor e vencimento.'] },
      { titulo: 'Dados e Pix', aba: 'config', passos: ['Informe o CNPJ da consultoria, a cidade e a chave Pix. Eles saem nas cobranças.'] },
    ],
  },
  {
    id: 'normas',
    endereco: /^\/normas$/,
    titulo: 'Mudanças nas normas',
    paraQue: 'Avisos quando uma NR ou regra do eSocial muda, com o que fazer.',
    partes: [{ titulo: 'Como usar', passos: ['Leia os avisos novos e marque como lido.', 'Ligue o resumo semanal por e-mail se quiser receber toda segunda-feira.'] }],
  },
  {
    id: 'emitir',
    endereco: /^\/emitir$/,
    titulo: 'Emitir documento',
    paraQue: 'Todos os documentos do sistema num lugar só, para achar rápido o que você precisa emitir.',
    partes: [{ titulo: 'Como usar', passos: ['Confira a empresa em foco no alto do menu.', 'Procure o documento pela busca ou pelos grupos.', 'Clique no cartão: ele abre a tela onde o documento é montado, já com os dados da empresa.'] }],
  },
  {
    id: 'integracoes',
    endereco: /^\/integracoes$/,
    titulo: 'Integrações',
    paraQue: 'Mostra tudo o que o Safety Nexo conecta, o que já está ligado e o que ainda falta.',
    partes: [{ titulo: 'Como usar', passos: ['Veja em cada cartão se a integração está ligada.', 'Para ligar uma que falta, siga o caminho indicado no próprio cartão.'] }],
  },
  {
    id: 'perfil',
    endereco: /^\/perfil$/,
    titulo: 'Meu perfil',
    paraQue: 'Seus dados de acesso e, para a consultoria, os dados e a logo que saem no rodapé de todos os documentos.',
    partes: [
      { titulo: 'Meus dados e senha', passos: ['Confira o nome e o e-mail de acesso.', 'Para trocar a senha, digite a atual, a nova e repita a nova.'] },
      { titulo: 'Minha consultoria', passos: ['Preencha o nome da consultoria, o CNPJ e a cidade.', 'Envie a logo da consultoria: ela sai no rodapé dos PDFs.'] },
    ],
  },
  {
    id: 'plano',
    endereco: /^\/plano$/,
    titulo: 'Meu plano',
    paraQue: 'Mostra o plano atual, quantas empresas você já usa e deixa pedir a troca de plano.',
    partes: [{ titulo: 'Como usar', passos: ['Veja o seu plano e o limite de empresas.', 'Para mudar, escolha o novo plano e envie o pedido.'] }],
  },
  {
    id: 'esocial-geral',
    endereco: /^\/esocial-geral$/,
    titulo: 'eSocial de todas e multas',
    paraQue: 'Diagnóstico do eSocial de todas as empresas, com a multa estimada do que falta, e envio de tudo de uma vez.',
    partes: [{ titulo: 'Como usar', passos: ['Veja, empresa por empresa, os eventos que faltam enviar e a multa estimada.', 'Confira se o certificado digital da consultoria está enviado.', 'Envie os eventos de todas as empresas de uma vez e acompanhe os recibos.'] }],
  },
];

// Guia da tela aberta. Telas sem guia próprio usam o do painel.
export function guiaDoEndereco(caminho: string): GuiaTela | null {
  return GUIAS.find((g) => g.endereco.test(caminho)) ?? null;
}
