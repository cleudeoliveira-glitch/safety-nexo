import type { Ajuda } from '@/components/CampoAjuda';

// Base de conhecimento dos campos: um texto só para cada campo.
// O mesmo texto aparece em dois lugares, sem escrever duas vezes:
//  - no "?" do lado do campo, na tela de preenchimento;
//  - na Base de Conhecimento (/ajuda, aba "Campos"), para quem quer estudar tudo junto.
//
// Como o campo acha o seu texto (components/ui.tsx):
//  1. ajuda escrita na própria tela (só para textos que mudam com os dados, ex.: carga horária da CIPA);
//  2. pelo id do campo (ids);
//  3. pelo começo do id, para campos repetidos por linha (prefixos, ex.: "av-epi-" + id do risco);
//  4. pelo nome do campo (rotulos), para siglas que valem em qualquer tela (CNPJ, CA, CID...).
// Campo novo: inclua aqui o id ou o nome dele. Campos óbvios (nome, e-mail, senha, busca) ficam sem "?".

export type ItemAjuda = { campo: string; area: string; ids?: string[]; prefixos?: string[]; rotulos?: string[]; ajuda: Ajuda };

export const AREAS = [
  'Empresa', 'Funcionários', 'PGR: GHE e riscos', 'Laudos: LTCAT, insalubridade e periculosidade', 'Saúde: ASO e PCMSO',
  'Prontuário de saúde', 'EPI e almoxarifado', 'Treinamentos', 'CIPA', 'DDS', 'APR e Permissão de Trabalho', 'Inspeções',
  'Plano de ação e investigação', 'CAT e afastamentos', 'eSocial', 'Emergência e brigada', 'Psicossocial', 'Ergonomia (AET)',
  'Terceiros e atestados', 'FAP e RAT', 'Calculadoras', 'SIPAT e 5S', 'Comercial', 'Sua conta', 'Normas (administração)',
] as const;

export const AJUDA_CAMPOS: ItemAjuda[] = [
  // ───────── Empresa ─────────
  { campo: 'Razão social', area: 'Empresa', ids: ['razaoSocial'], rotulos: ['Razão social', 'Nome da empresa'],
    ajuda: { oQueE: 'É o nome oficial da empresa, do jeitinho que está registrado na Receita Federal. Vale copiar igual, para o documento não ter divergência.', ondeAcho: 'No cartão do CNPJ, campo "Nome empresarial".', exemplo: 'Padaria Pão Quente Ltda' } },
  { campo: 'CNPJ', area: 'Empresa', rotulos: ['CNPJ', 'CNPJ da consultoria'],
    ajuda: { oQueE: 'É o número de inscrição da empresa na Receita Federal. Ele aparece no cabeçalho de todos os documentos que você gerar.', ondeAcho: 'No cartão do CNPJ ou na nota fiscal da empresa.', exemplo: '12.345.678/0001-90' } },
  { campo: 'CNAE', area: 'Empresa', ids: ['cnae'], rotulos: ['CNAE', 'CNAE principal'],
    ajuda: { oQueE: 'É o código da atividade principal da empresa. Ele é importante porque é dele que sai o grau de risco, e o grau de risco mexe em quase tudo: CIPA, SESMT, brigada.', ondeAcho: 'No cartão do CNPJ, campo "Código e descrição da atividade econômica principal".', exemplo: '10.91-1-01 (fabricação de produtos de panificação)', baseLegal: 'NR-04, Anexo I' } },
  { campo: 'Grau de risco', area: 'Empresa', ids: ['grauRisco'], rotulos: ['Grau de risco', 'Grau de risco (NR-04, pelo CNAE)'],
    ajuda: { oQueE: 'Número de 1 a 4 que mostra o tamanho do risco da atividade. O sistema preenche pelo CNAE; altere só se o seu caso for diferente.', ondeAcho: 'Na NR-04, Anexo I, procurando o CNAE da empresa.', exemplo: 'Padaria (CNAE 10.91-1-01) = grau 3', baseLegal: 'NR-04, Anexo I' } },
  { campo: 'Número de funcionários', area: 'Empresa', ids: ['numFuncionarios'],
    ajuda: { oQueE: 'Quantas pessoas trabalham com carteira assinada na empresa. Junto com o grau de risco, esse número diz se a empresa precisa de CIPA, de SESMT e do tamanho da brigada.', ondeAcho: 'Com o RH ou na folha de pagamento.', exemplo: '25', baseLegal: 'NR-04 e NR-05' } },
  { campo: 'Logo da empresa', area: 'Empresa', ids: ['logo'],
    ajuda: { oQueE: 'A logo da empresa cliente vai no cabeçalho dos documentos. A logo da consultoria vai no rodapé.', ondeAcho: 'Peça ao cliente o arquivo da logo (PNG ou JPG, até 2 MB).' } },
  { campo: 'Responsável técnico', area: 'Empresa', ids: ['rtNome', 'tr-rt'],
    ajuda: { oQueE: 'Profissional legalmente habilitado que assina os documentos técnicos: engenheiro(a) de segurança ou médico(a) do trabalho para o LTCAT e o PPP; profissional qualificado para os treinamentos.', exemplo: 'Cleude Oliveira, Engenheira de Segurança do Trabalho', baseLegal: 'Lei 8.213/91, art. 58; NR-01' } },
  { campo: 'Registro profissional', area: 'Empresa', ids: ['rtRegistro'],
    ajuda: { oQueE: 'O número do registro profissional de quem assina, no conselho de classe (CREA, CRM...). Ele dá validade ao documento.', ondeAcho: 'Na carteira do CREA, CRM ou outro conselho.', exemplo: 'CREA-SP 1234567890' } },
  { campo: 'Representante legal', area: 'Empresa', ids: ['representante'],
    ajuda: { oQueE: 'É a pessoa que responde pela empresa e assina o PPP em nome dela: um sócio, um diretor ou alguém com procuração.', ondeAcho: 'No contrato social ou procuração da empresa.' } },
  { campo: 'Empresa de onde copiar', area: 'Empresa', ids: ['cp-origem'],
    ajuda: { oQueE: 'Traz os GHEs, riscos e exames de outra empresa já pronta, para não começar do zero. Depois você ajusta o que for diferente.' } },

  // ───────── Funcionários ─────────
  { campo: 'CPF', area: 'Funcionários', rotulos: ['CPF'],
    ajuda: { oQueE: 'O CPF da pessoa. Ele aparece no ASO, na ficha de EPI e no certificado, e é por ele que o eSocial reconhece o trabalhador.', ondeAcho: 'No documento da pessoa ou com o RH.', exemplo: '123.456.789-00' } },
  { campo: 'Cargo', area: 'Funcionários', ids: ['colab-cargo'], rotulos: ['Função'],
    ajuda: { oQueE: 'A função que a pessoa exerce no dia a dia. Ela aparece no ASO, na ficha de EPI e na Ordem de Serviço.', ondeAcho: 'Na carteira de trabalho ou com o RH.', exemplo: 'Auxiliar de padeiro' } },
  { campo: 'Admissão', area: 'Funcionários', ids: ['colab-admissao'],
    ajuda: { oQueE: 'Data em que a pessoa foi contratada. Também desempata a eleição da CIPA (quem tem mais tempo de casa).', ondeAcho: 'Na carteira de trabalho ou com o RH.', baseLegal: 'NR-05, item 5.5.3, j' } },
  { campo: 'CBO', area: 'Funcionários', ids: ['colab-cbo'], rotulos: ['CBO'],
    ajuda: { oQueE: 'É o número oficial do cargo na Classificação Brasileira de Ocupações. O PPP e o eSocial pedem esse código.', ondeAcho: 'Na carteira de trabalho, com o RH, ou no site do CBO (cbo.mte.gov.br).', exemplo: '8483-05 (padeiro)' } },
  { campo: 'Matrícula no eSocial', area: 'Funcionários', ids: ['colab-matricula'], prefixos: ['mat-'], rotulos: ['Matrícula no eSocial'],
    ajuda: { oQueE: 'A matrícula que o RH usou no evento de admissão do eSocial. Sem ela não dá para enviar ASO, riscos e CAT.', ondeAcho: 'Com o RH ou a contabilidade.', exemplo: '000123' } },
  { campo: 'GHE do funcionário', area: 'Funcionários', ids: ['colab-ghe'],
    ajuda: { oQueE: 'O grupo de exposição em que a pessoa trabalha. É o GHE que diz quais riscos, exames e EPIs valem para ela.', baseLegal: 'NR-01 e NR-07' } },
  { campo: 'Nome de quem vai usar', area: 'Funcionários', ids: ['acesso-nome'],
    ajuda: { oQueE: 'Pessoa da empresa cliente que vai entrar no sistema para ver a área da própria empresa (documentos, vencimentos, pendências).' } },

  // ───────── PGR ─────────
  { campo: 'GHE (Grupo Homogêneo de Exposição)', area: 'PGR: GHE e riscos', ids: ['ghe-nome'], rotulos: ['GHE'],
    ajuda: { oQueE: 'Grupo de trabalhadores expostos aos mesmos riscos, do mesmo jeito. O PGR e o PCMSO são organizados por GHE.', ondeAcho: 'Vendo os setores e as funções na visita à empresa.', exemplo: 'Produção, Escritório, Manutenção', baseLegal: 'NR-01, item 1.5.4.4' } },
  { campo: 'Descrição do GHE', area: 'PGR: GHE e riscos', ids: ['ghe-descricao'],
    ajuda: { oQueE: 'O que esse grupo faz, onde fica e quais funções fazem parte dele. Sai no inventário de riscos do PGR.', exemplo: 'Área de produção com forno, masseira e cilindro. Funções: padeiro e auxiliar.' } },
  { campo: 'Tipo de risco', area: 'PGR: GHE e riscos', prefixos: ['tipo-'],
    ajuda: { oQueE: 'Aqui você diz de que família é o risco: físico, químico, biológico, ergonômico ou de acidente.', exemplo: 'Ruído = físico; farinha = químico; cilindro = acidente', baseLegal: 'NR-01, item 1.5.4.3, e NR-09' } },
  { campo: 'Agente ou perigo', area: 'PGR: GHE e riscos', prefixos: ['agente-'],
    ajuda: { oQueE: 'É aquilo que pode machucar ou adoecer quem trabalha ali. Pense no que você viu na visita.', ondeAcho: 'Na visita, observando máquinas, produtos e tarefas.', exemplo: 'Ruído contínuo; poeira de farinha; prensagem de mãos no cilindro', baseLegal: 'NR-01, item 1.5.4.3' } },
  { campo: 'Fonte geradora', area: 'PGR: GHE e riscos', prefixos: ['fonte-'],
    ajuda: { oQueE: 'De onde o perigo vem: uma máquina, um produto, uma tarefa ou o próprio ambiente.', exemplo: 'Masseira; forno; carregamento de sacos de 25 kg', baseLegal: 'NR-01, item 1.5.4.3' } },
  { campo: 'Severidade', area: 'PGR: GHE e riscos', prefixos: ['sev-'],
    ajuda: { oQueE: 'O tamanho do dano se o acidente ou a doença acontecer. Junto com a probabilidade, dá o nível de risco.', exemplo: 'Leve (arranhão) até gravíssima (amputação ou morte)', baseLegal: 'NR-01, item 1.5.4.4.2' } },
  { campo: 'Medidas de controle', area: 'PGR: GHE e riscos', prefixos: ['medidas-'],
    ajuda: { oQueE: 'O que a empresa já faz ou vai fazer para reduzir o risco. Ordem: eliminar, proteção coletiva (EPC), medidas administrativas e, por último, EPI.', exemplo: 'Proteção fixa no cilindro; treinamento NR-12; luva de malha', baseLegal: 'NR-01, item 1.4.1, g' } },
  { campo: 'Exame do GHE', area: 'PGR: GHE e riscos', prefixos: ['exame-'],
    ajuda: { oQueE: 'É o exame que o PCMSO vai pedir para quem trabalha neste GHE, justamente por causa dos riscos que esse grupo tem.', exemplo: 'Audiometria para ruído; espirometria para poeira', baseLegal: 'NR-07, Anexos' } },
  { campo: 'Momento do exame', area: 'PGR: GHE e riscos', prefixos: ['exame-tipo-'],
    ajuda: { oQueE: 'Em quais exames ocupacionais esse exame entra: admissional, periódico, retorno, mudança de risco ou demissional.', baseLegal: 'NR-07, item 7.5.6' } },
  { campo: 'Periodicidade (meses)', area: 'PGR: GHE e riscos', prefixos: ['exame-per-'],
    ajuda: { oQueE: 'De quanto em quanto tempo esse exame precisa ser repetido.', exemplo: '12 (uma vez por ano)', baseLegal: 'NR-07, item 7.5.8 e Anexos' } },

  // ───────── Laudos ─────────
  { campo: 'Avaliação', area: 'Laudos: LTCAT, insalubridade e periculosidade', prefixos: ['av-tipo-'],
    ajuda: { oQueE: 'Quantitativa quando o agente foi medido com equipamento. Qualitativa quando a exposição foi caracterizada só por inspeção.', exemplo: 'Ruído medido com dosímetro = quantitativa', baseLegal: 'NR-09 e NR-15' } },
  { campo: 'Resultado da medição', area: 'Laudos: LTCAT, insalubridade e periculosidade', prefixos: ['av-int-'],
    ajuda: { oQueE: 'O número que o equipamento mostrou na medição.', ondeAcho: 'No relatório da dosimetria ou da avaliação.', exemplo: '88,5' } },
  { campo: 'Unidade da medição', area: 'Laudos: LTCAT, insalubridade e periculosidade', prefixos: ['av-un-'],
    ajuda: { oQueE: 'A unidade em que o resultado foi medido.', exemplo: 'dB(A) para ruído; °C IBUTG para calor; mg/m³ para poeira' } },
  { campo: 'Limite de tolerância', area: 'Laudos: LTCAT, insalubridade e periculosidade', prefixos: ['av-lim-'],
    ajuda: { oQueE: 'É o valor máximo aceito para a jornada de trabalho. Se a medição passar dele, existe insalubridade.', ondeAcho: 'No anexo da NR-15 do agente.', exemplo: '85 dB(A) para 8 horas de ruído', baseLegal: 'NR-15' } },
  { campo: 'Técnica utilizada', area: 'Laudos: LTCAT, insalubridade e periculosidade', prefixos: ['av-tec-'],
    ajuda: { oQueE: 'O método que você usou para medir. Essa informação vai para o PPP e para o eSocial.', exemplo: 'NHO 01 da Fundacentro (ruído)', baseLegal: 'Decreto 3.048/99, art. 68' } },
  { campo: 'Usa EPC?', area: 'Laudos: LTCAT, insalubridade e periculosidade', prefixos: ['av-uepc-'],
    ajuda: { oQueE: 'Marque se existe alguma proteção coletiva (EPC) contra esse agente, aquela que protege todo mundo de uma vez.', exemplo: 'Exaustor, enclausuramento da máquina, barreira acústica' } },
  { campo: 'EPC eficaz?', area: 'Laudos: LTCAT, insalubridade e periculosidade', prefixos: ['av-epc-'],
    ajuda: { oQueE: 'Se essa proteção coletiva realmente baixa a exposição para abaixo do limite. A resposta vai para o PPP e o eSocial (S-2240).' } },
  { campo: 'Usa EPI?', area: 'Laudos: LTCAT, insalubridade e periculosidade', prefixos: ['av-uepi-'],
    ajuda: { oQueE: 'Marque se o trabalhador usa algum EPI contra esse agente.' } },
  { campo: 'EPI eficaz?', area: 'Laudos: LTCAT, insalubridade e periculosidade', prefixos: ['av-epi-'],
    ajuda: { oQueE: 'Se o EPI de fato neutraliza a exposição. Essa resposta vai para o PPP e pesa bastante na aposentadoria especial, então vale ter certeza.', baseLegal: 'NR-06; Lei 8.213/91, art. 58' } },
  { campo: 'CA do EPI', area: 'Laudos: LTCAT, insalubridade e periculosidade', prefixos: ['av-ca-'],
    ajuda: { oQueE: 'O número do Certificado de Aprovação do EPI usado contra esse agente. Ele vai para o PPP e o eSocial.', ondeAcho: 'Gravado no EPI ou na embalagem.', baseLegal: 'NR-06' } },
  { campo: 'Código do Anexo IV', area: 'Laudos: LTCAT, insalubridade e periculosidade', prefixos: ['av-anexo-'],
    ajuda: { oQueE: 'É o código desse agente na lista de agentes nocivos da Previdência. O LTCAT e o eSocial usam esse código.', exemplo: '2.0.1 (ruído)', baseLegal: 'Decreto 3.048/99, Anexo IV' } },
  { campo: 'Enseja aposentadoria especial?', area: 'Laudos: LTCAT, insalubridade e periculosidade', prefixos: ['av-esp-'],
    ajuda: { oQueE: 'Sua conclusão técnica: a exposição dá direito à aposentadoria especial? Sai na conclusão do LTCAT.', baseLegal: 'Lei 8.213/91, art. 57 e 58' } },
  { campo: 'Anexo da NR-15', area: 'Laudos: LTCAT, insalubridade e periculosidade', prefixos: ['av-anexo15-'],
    ajuda: { oQueE: 'O anexo da NR-15 que fala desse agente. Ele entra no laudo de insalubridade (LIP).', exemplo: 'Anexo 1 (ruído contínuo); Anexo 3 (calor)', baseLegal: 'NR-15' } },
  { campo: 'Insalubridade', area: 'Laudos: LTCAT, insalubridade e periculosidade', prefixos: ['av-grau-'],
    ajuda: { oQueE: 'Sua conclusão para este agente, já considerando EPC e EPI. Grau mínimo (10%), médio (20%) ou máximo (40%). Quando o EPI neutraliza a exposição, marque "Não insalubre".', baseLegal: 'NR-15, itens 15.2 e 15.4' } },
  { campo: 'Periculosidade: enquadramento', area: 'Laudos: LTCAT, insalubridade e periculosidade', prefixos: ['per-'],
    ajuda: { oQueE: 'Se as atividades deste grupo se enquadram em algum anexo da NR-16 (inflamáveis, explosivos, eletricidade, segurança patrimonial, motocicleta, radiação). Quando sim, o adicional é de 30% sobre o salário.', baseLegal: 'CLT, art. 193, e NR-16' } },
  { campo: 'Periculosidade: fundamentação', area: 'Laudos: LTCAT, insalubridade e periculosidade', prefixos: ['per-just-'],
    ajuda: { oQueE: 'Por que você concluiu assim: a atividade, o tempo de exposição e o item da NR-16. Sai no laudo (LPP).', exemplo: 'Abastece empilhadeira a GLP diariamente, dentro da área de risco (NR-16, Anexo 2).' } },

  // ───────── Saúde: ASO ─────────
  { campo: 'Tipo de exame (ASO)', area: 'Saúde: ASO e PCMSO', ids: ['aso-tipo'],
    ajuda: { oQueE: 'O momento do exame: ao contratar (admissional), de tempos em tempos (periódico), ao voltar de afastamento de 30 dias ou mais (retorno), ao mudar de risco ou ao desligar (demissional).', baseLegal: 'NR-07, item 7.5.6' } },
  { campo: 'Data do exame', area: 'Saúde: ASO e PCMSO', ids: ['aso-data'],
    ajuda: { oQueE: 'O dia em que o médico fez o exame clínico. É a partir dessa data que o sistema conta quando vence o próximo periódico.', ondeAcho: 'No ASO assinado pelo médico.' } },
  { campo: 'Resultado do ASO', area: 'Saúde: ASO e PCMSO', ids: ['aso-resultado'],
    ajuda: { oQueE: 'A conclusão do médico: apto ou inapto para a função. Quem está inapto não pode trabalhar nessa função até passar por uma nova avaliação.', ondeAcho: 'No ASO, campo da conclusão do médico.', baseLegal: 'NR-07, item 7.5.19.1' } },
  { campo: 'Médico examinador', area: 'Saúde: ASO e PCMSO', ids: ['aso-medico'],
    ajuda: { oQueE: 'O médico que fez o exame. Ele pode ser outro, diferente do médico que coordena o PCMSO.', ondeAcho: 'Na assinatura e no carimbo do ASO.' } },
  { campo: 'Médico responsável pelo PCMSO', area: 'Saúde: ASO e PCMSO', ids: ['medico-nome'],
    ajuda: { oQueE: 'O médico do trabalho que coordena o PCMSO da empresa. O nome dele aparece no PCMSO e vai para o eSocial.', baseLegal: 'NR-07, item 7.3.2' } },
  { campo: 'CRM', area: 'Saúde: ASO e PCMSO', rotulos: ['CRM', 'CRM do médico'],
    ajuda: { oQueE: 'O número do registro do médico no Conselho Regional de Medicina.', ondeAcho: 'No carimbo do médico ou no site do CFM.', exemplo: '123456' } },
  { campo: 'UF do CRM', area: 'Saúde: ASO e PCMSO', rotulos: ['UF do CRM'],
    ajuda: { oQueE: 'O estado em que o médico tem o registro.', exemplo: 'SP' } },

  // ───────── Prontuário ─────────
  { campo: 'Vacina e dose / Exame', area: 'Prontuário de saúde', ids: ['pr-titulo'],
    ajuda: { oQueE: 'O que está sendo registrado: a vacina com a dose, ou o exame complementar.', exemplo: 'Hepatite B - 2ª dose; Espirometria' } },
  { campo: 'Lote da vacina', area: 'Prontuário de saúde', ids: ['pr-lote'],
    ajuda: { oQueE: 'O lote impresso na carteira de vacinação. Serve para rastrear a vacina.', ondeAcho: 'Na carteira de vacinação ou no comprovante do posto.' } },
  { campo: 'Espirometria: CVF e VEF1', area: 'Prontuário de saúde', ids: ['pr-cvf', 'pr-cvfp', 'pr-vef1', 'pr-vef1p', 'pr-rel'],
    ajuda: { oQueE: 'Valores da espirometria. CVF é quanto ar a pessoa consegue soprar; VEF1 é quanto sai no primeiro segundo. A relação VEF1/CVF baixa indica obstrução.', ondeAcho: 'No laudo da espirometria.', baseLegal: 'NR-07, Anexo II (exposição a poeiras)' } },
  { campo: 'Resultado do laudo', area: 'Prontuário de saúde', ids: ['pr-res'],
    ajuda: { oQueE: 'O que o laudo concluiu, com as palavras que estão nele.', exemplo: 'Espirometria dentro dos limites da normalidade' } },
  { campo: 'Próxima dose / próximo exame', area: 'Prontuário de saúde', ids: ['pr-prox'],
    ajuda: { oQueE: 'Quando precisa repetir. Pode deixar com a gente: o painel avisa antes da data chegar.' } },

  // ───────── EPI ─────────
  { campo: 'Número do CA', area: 'EPI e almoxarifado', ids: ['epi-ca', 'est-ca', 'rc-ca'], rotulos: ['Número do CA', 'CA'],
    ajuda: { oQueE: 'Certificado de Aprovação: número que prova que o EPI foi aprovado pelo Ministério do Trabalho. Sem CA válido o EPI não pode ser entregue.', ondeAcho: 'Gravado no próprio EPI ou na embalagem.', exemplo: '12345', baseLegal: 'NR-06, item 6.4' } },
  { campo: 'Validade do CA', area: 'EPI e almoxarifado', ids: ['epi-validade', 'est-validade'], rotulos: ['Validade do CA'],
    ajuda: { oQueE: 'Até quando o CA vale. Com o CA vencido, o EPI não deve ser entregue. O painel avisa antes de vencer.', ondeAcho: 'Na consulta de CA do Ministério do Trabalho (caepi.mte.gov.br).', baseLegal: 'NR-06' } },
  { campo: 'EPI', area: 'EPI e almoxarifado', ids: ['epi-nome', 'est-epi', 'rc-epi'],
    ajuda: { oQueE: 'O equipamento que a pessoa recebeu, com o mesmo nome que está no CA.', exemplo: 'Protetor auditivo tipo plug; Luva nitrílica', baseLegal: 'NR-06' } },
  { campo: 'EPI do almoxarifado', area: 'EPI e almoxarifado', ids: ['epi-estoque', 'rc-item'],
    ajuda: { oQueE: 'Escolha um EPI do estoque: o nome, o CA e a validade vêm preenchidos e a quantidade sai do estoque sozinha.' } },
  { campo: 'Quantidade entregue', area: 'EPI e almoxarifado', ids: ['epi-qtd', 'rc-qtd'],
    ajuda: { oQueE: 'Quantas unidades (ou pares) a pessoa recebeu desta vez.', exemplo: '1 par' } },
  { campo: 'Motivo da entrega', area: 'EPI e almoxarifado', ids: ['epi-motivo', 'rc-motivo'],
    ajuda: { oQueE: 'Por que o EPI foi entregue: primeira entrega, troca por desgaste, perda ou dano. Ajuda a ver quem troca demais.', baseLegal: 'NR-06, item 6.5.1' } },
  { campo: 'Data da entrega', area: 'EPI e almoxarifado', ids: ['epi-data'],
    ajuda: { oQueE: 'Dia em que o trabalhador recebeu o EPI. Sai na ficha de EPI assinada.', baseLegal: 'NR-06, item 6.5.1, h' } },
  { campo: 'Tamanho', area: 'EPI e almoxarifado', ids: ['est-tamanho'],
    ajuda: { oQueE: 'Tamanho do EPI, quando tiver. Ajuda a não entregar luva ou bota no tamanho errado.', exemplo: 'M; 42' } },
  { campo: 'Quantidade em estoque', area: 'EPI e almoxarifado', ids: ['est-qtd'],
    ajuda: { oQueE: 'Quantas unidades você tem hoje no almoxarifado.' } },
  { campo: 'Estoque mínimo', area: 'EPI e almoxarifado', ids: ['est-min'],
    ajuda: { oQueE: 'Quando o estoque chegar nesse número, o painel te avisa que está na hora de comprar mais.', exemplo: '10' } },

  // ───────── Treinamentos ─────────
  { campo: 'Modelo de treinamento', area: 'Treinamentos', ids: ['tr-modelo'],
    ajuda: { oQueE: 'Modelos prontos das NRs. Preenche nome, norma, carga horária, validade e conteúdo. Você pode ajustar tudo antes de salvar.' } },
  { campo: 'Nome do treinamento', area: 'Treinamentos', ids: ['tr-nome'],
    ajuda: { oQueE: 'O nome do treinamento, do jeito que você quer que apareça no certificado.', exemplo: 'NR-35 Trabalho em Altura - Inicial' } },
  { campo: 'Norma do treinamento', area: 'Treinamentos', ids: ['tr-norma'],
    ajuda: { oQueE: 'A norma que pede esse treinamento. Ela aparece no certificado.', exemplo: 'NR-35' } },
  { campo: 'Carga horária', area: 'Treinamentos', ids: ['tr-carga'],
    ajuda: { oQueE: 'Total de horas da turma. Algumas NRs definem o mínimo; outras deixam para o programa da empresa.', exemplo: 'NR-35 inicial: 8 horas', baseLegal: 'NR-01, item 1.7' } },
  { campo: 'Validade (meses)', area: 'Treinamentos', ids: ['tr-validade'],
    ajuda: { oQueE: 'Em quanto tempo precisa reciclar. Deixe em branco se não houver prazo fixo. O painel avisa 30 dias antes de vencer.', exemplo: 'NR-35: 24 meses', baseLegal: 'NR-01, item 1.7.1.1' } },
  { campo: 'Instrutor(a)', area: 'Treinamentos', ids: ['tr-instrutor'],
    ajuda: { oQueE: 'Quem deu o treinamento. O nome vai no certificado.' } },
  { campo: 'Qualificação do instrutor', area: 'Treinamentos', ids: ['tr-qualificacao'],
    ajuda: { oQueE: 'A formação ou habilitação de quem deu o treinamento. Ela aparece no certificado e mostra que a turma foi bem conduzida.', exemplo: 'Engenheira de Segurança do Trabalho, CREA-SP 1234567890', baseLegal: 'NR-01, item 1.7.1.3' } },
  { campo: 'Turma (presença por rosto)', area: 'Treinamentos', ids: ['rc-ref'],
    ajuda: { oQueE: 'A turma ou o DDS em que a presença está sendo registrada.' } },

  // ───────── CIPA ─────────
  { campo: 'Início do mandato atual', area: 'CIPA', ids: ['cipa-inicio'],
    ajuda: { oQueE: 'Data da posse da gestão atual. Com ela o sistema calcula o fim do mandato e os prazos da próxima eleição.', ondeAcho: 'Na ata de posse da CIPA.', baseLegal: 'NR-05, itens 5.4.6, 5.5.1 e 5.5.3' } },
  { campo: 'Representante nomeado', area: 'CIPA', ids: ['cipa-representante'],
    ajuda: { oQueE: 'Empregado nomeado para ajudar nas ações de prevenção quando a empresa não precisa de CIPA.', baseLegal: 'NR-05, item 5.4.13' } },
  { campo: 'Publicação do edital', area: 'CIPA', ids: ['edital'],
    ajuda: { oQueE: 'Dia em que o edital da eleição é afixado ou enviado aos funcionários.', baseLegal: 'NR-05, item 5.5.1: até 60 dias antes do fim do mandato' } },
  { campo: 'Início das inscrições', area: 'CIPA', ids: ['insc-inicio'],
    ajuda: { oQueE: 'O primeiro dia em que os empregados podem se candidatar.', baseLegal: 'NR-05, item 5.5.3' } },
  { campo: 'Fim das inscrições', area: 'CIPA', ids: ['insc-fim'],
    ajuda: { oQueE: 'As inscrições precisam ficar abertas por pelo menos 15 dias corridos.', baseLegal: 'NR-05, item 5.5.3, b' } },
  { campo: 'Dia da eleição', area: 'CIPA', ids: ['eleicao-dia'],
    ajuda: { oQueE: 'Em dia normal de trabalho, até 30 dias antes do fim do mandato.', baseLegal: 'NR-05, item 5.5.3, f e g' } },
  { campo: 'Local e horário da votação', area: 'CIPA', ids: ['eleicao-local', 'eleicao-horario'],
    ajuda: { oQueE: 'Onde e quando a votação acontece. Precisa permitir que todos os turnos votem.', baseLegal: 'NR-05, item 5.5.3, g' } },
  { campo: 'Inscrever candidato', area: 'CIPA', ids: ['candidato'],
    ajuda: { oQueE: 'Qualquer empregado pode se candidatar, sem precisar de aprovação da empresa.', baseLegal: 'NR-05, item 5.5.3, c' } },
  { campo: 'Quantos funcionários votaram', area: 'CIPA', ids: ['votantes'],
    ajuda: { oQueE: 'Se votarem menos da metade dos funcionários, a votação é prorrogada antes de apurar.', baseLegal: 'NR-05, item 5.5.4' } },
  { campo: 'Indicados pela empresa', area: 'CIPA', ids: ['indicado', 'indicado-tipo'],
    ajuda: { oQueE: 'Os representantes da empresa (titulares e suplentes) são escolhidos por ela, não eleitos. O presidente vem desse grupo.', baseLegal: 'NR-05, itens 5.4.1 e 5.4.9' } },
  { campo: 'Data da posse', area: 'CIPA', ids: ['posse'],
    ajuda: { oQueE: 'Primeiro dia útil depois do fim do mandato anterior. Abre o novo mandato de um ano.', baseLegal: 'NR-05, itens 5.4.6 e 5.4.7' } },
  { campo: 'Treinamento da CIPA', area: 'CIPA', ids: ['trein-inicio', 'trein-fim', 'instrutor'],
    ajuda: { oQueE: 'Feito antes da posse, com a carga mínima do grau de risco da empresa (8 a 20 horas), no máximo 8 horas por dia.', baseLegal: 'NR-05, itens 5.7.1 e 5.7.4' } },

  // ───────── DDS ─────────
  { campo: 'Assunto do DDS', area: 'DDS', ids: ['dds-categoria'],
    ajuda: { oQueE: 'Filtra os temas prontos por assunto (EPI, máquinas, ergonomia, saúde...).' } },
  { campo: 'Tema pronto', area: 'DDS', ids: ['dds-pronto', 'cd-tema'],
    ajuda: { oQueE: 'Conversa curta de segurança no início do turno. Cada tema traz um caso para contar, o texto, uma dinâmica de 3 minutos e uma pergunta para a equipe. Os marcados com ✓ já foram feitos nesta empresa.' } },
  { campo: 'Tema do DDS', area: 'DDS', ids: ['dds-tema'],
    ajuda: { oQueE: 'O assunto da conversa. Escolha algo ligado aos riscos daquela semana ou a um quase-acidente recente.', exemplo: 'Uso correto do protetor auditivo' } },
  { campo: 'Duração do DDS', area: 'DDS', ids: ['dds-duracao', 'cd-dur'],
    ajuda: { oQueE: 'Quanto tempo durou a conversa. Um DDS costuma levar de 5 a 15 minutos.', exemplo: '10' } },
  { campo: 'Ministrante do DDS', area: 'DDS', ids: ['dds-ministrante', 'cd-min'],
    ajuda: { oQueE: 'Quem conduziu a conversa. Pode ser o técnico, o líder ou um colega treinado.' } },

  // ───────── APR e PT ─────────
  { campo: 'Atividade da APR', area: 'APR e Permissão de Trabalho', ids: ['apr-atividade', 'ca-ativ'],
    ajuda: { oQueE: 'O serviço que será analisado. Faça uma APR para cada atividade fora da rotina ou com risco relevante.', exemplo: 'Troca de telhas do galpão', baseLegal: 'NR-01; NR-35, item 35.4.5' } },
  { campo: 'Responsável pela APR', area: 'APR e Permissão de Trabalho', ids: ['apr-responsavel', 'ca-resp'],
    ajuda: { oQueE: 'Quem coordena a atividade e responde pelas medidas de segurança combinadas.' } },
  { campo: 'Equipe da APR', area: 'APR e Permissão de Trabalho', ids: ['ca-equipe'],
    ajuda: { oQueE: 'Quem vai executar o serviço. Todos precisam conhecer os riscos e as medidas da APR antes de começar.' } },
  { campo: 'Tipo de trabalho (PT)', area: 'APR e Permissão de Trabalho', ids: ['pt-tipo'],
    ajuda: { oQueE: 'A permissão autoriza um trabalho de risco por um período curto (normalmente um turno), depois de conferir as condições de segurança.', exemplo: 'Altura, espaço confinado, trabalho a quente, eletricidade', baseLegal: 'NR-33, NR-35, NR-10 e NR-34' } },
  { campo: 'APR da atividade', area: 'APR e Permissão de Trabalho', ids: ['pt-apr'],
    ajuda: { oQueE: 'A APR que analisou esse serviço. A PT confirma, no dia, que as medidas da APR estão no lugar.' } },
  { campo: 'Validade da PT', area: 'APR e Permissão de Trabalho', ids: ['pt-inicio', 'pt-fim'],
    ajuda: { oQueE: 'Período em que a permissão vale. Passou desse horário, precisa emitir outra.', baseLegal: 'NR-35, item 35.4.7; NR-33' } },
  { campo: 'Emitente da PT', area: 'APR e Permissão de Trabalho', ids: ['pt-emitente'],
    ajuda: { oQueE: 'Quem confere as condições e autoriza o trabalho. Precisa ser alguém capacitado e autorizado pela empresa.' } },

  // ───────── Inspeções ─────────
  { campo: 'Modelo de inspeção', area: 'Inspeções', ids: ['ck-modelo', 'cp-mod'],
    ajuda: { oQueE: 'Escolha a norma para carregar os itens prontos. Você pode reescrever, tirar ou incluir itens antes de salvar.', exemplo: 'NR-12 Máquinas; NR-10 Eletricidade' } },
  { campo: 'Local inspecionado', area: 'Inspeções', ids: ['ck-local', 'cp-local'],
    ajuda: { oQueE: 'Use sempre o mesmo nome para o mesmo local: assim a linha do tempo junta as inspeções e mostra se melhorou.', exemplo: 'Galpão 1 - Produção' } },
  { campo: 'Inspetor(a)', area: 'Inspeções', ids: ['ck-inspetor', 'cp-insp'],
    ajuda: { oQueE: 'Quem fez a inspeção. O nome aparece no relatório em PDF.' } },
  { campo: 'Inspecionar de novo em', area: 'Inspeções', prefixos: ['prox-'],
    ajuda: { oQueE: 'Quando você quer voltar a esse local. O painel te lembra na data.' } },

  // ───────── Plano de ação e investigação ─────────
  { campo: 'O que fazer (ação)', area: 'Plano de ação e investigação', ids: ['acao-descricao'],
    ajuda: { oQueE: 'A ação para corrigir o problema, escrita de forma que qualquer um entenda o que precisa ser feito.', exemplo: 'Instalar proteção fixa no cilindro da padaria', baseLegal: 'NR-01, item 1.5.5.2 (plano de ação do PGR)' } },
  { campo: 'Responsável pela ação', area: 'Plano de ação e investigação', ids: ['acao-responsavel', 'os-resp'],
    ajuda: { oQueE: 'Uma pessoa com nome, não um setor. É quem vai cobrar e fazer acontecer.' } },
  { campo: 'Prazo', area: 'Plano de ação e investigação', ids: ['acao-prazo', 'pa-prazo'],
    ajuda: { oQueE: 'A data limite para a ação ficar pronta. Se passar, o painel mostra em vermelho para ninguém esquecer.' } },
  { campo: 'Prioridade e esforço', area: 'Plano de ação e investigação', ids: ['acao-prioridade', 'acao-esforco'],
    ajuda: { oQueE: 'Prioridade mostra o quanto a ação reduz o risco; esforço mostra o quanto custa ou demora. Comece pelas de prioridade alta e esforço baixo.' } },
  { campo: 'Investigação: é de uma CAT?', area: 'Plano de ação e investigação', ids: ['inv-cat'],
    ajuda: { oQueE: 'Ligue a investigação à CAT do acidente, se houver. Quase-acidentes também devem ser investigados.', baseLegal: 'NR-01, item 1.5.5.5' } },
  { campo: 'Quem investigou', area: 'Plano de ação e investigação', ids: ['inv-equipe'],
    ajuda: { oQueE: 'A equipe da análise. O ideal é ter o líder da área, alguém da CIPA e o profissional de SST.', baseLegal: 'NR-05, item 5.3.1, h' } },

  // ───────── CAT e afastamentos ─────────
  { campo: 'Tipo de CAT', area: 'CAT e afastamentos', ids: ['cat-tipo'],
    ajuda: { oQueE: 'Inicial para o primeiro registro. Reabertura quando a lesão volta a afastar. Óbito quando a morte acontece depois da CAT inicial.', baseLegal: 'Lei 8.213/91, art. 22; eSocial S-2210' } },
  { campo: 'Tipo de acidente', area: 'CAT e afastamentos', ids: ['cat-acidente'],
    ajuda: { oQueE: 'Típico (no trabalho), de trajeto (indo ou voltando do trabalho) ou doença do trabalho.', baseLegal: 'Lei 8.213/91, art. 19 a 21' } },
  { campo: 'Data e hora do acidente', area: 'CAT e afastamentos', ids: ['cat-data'],
    ajuda: { oQueE: 'Quando aconteceu. A CAT deve ser enviada até o 1º dia útil seguinte; em caso de morte, na hora.', baseLegal: 'Lei 8.213/91, art. 22' } },
  { campo: 'Horas trabalhadas antes', area: 'CAT e afastamentos', ids: ['cat-horas'], prefixos: ['horas-'],
    ajuda: { oQueE: 'Quantas horas a pessoa já tinha trabalhado no dia quando o acidente aconteceu. Ajuda a ver se o cansaço pesou.', exemplo: '06:30' } },
  { campo: 'Parte do corpo atingida', area: 'CAT e afastamentos', ids: ['cat-parte'], prefixos: ['lado-'],
    ajuda: { oQueE: 'Onde foi a lesão, e o lado (direito, esquerdo, ambos). Usa a tabela 13 do eSocial.', exemplo: 'Mão (exceto punho ou dedos), direita' } },
  { campo: 'Agente causador', area: 'CAT e afastamentos', ids: ['cat-agente'],
    ajuda: { oQueE: 'O que causou a lesão. O sistema usa as tabelas 14 e 15 do eSocial.', exemplo: 'Máquina de panificação; escada' } },
  { campo: 'Natureza da lesão', area: 'CAT e afastamentos', ids: ['cat-natureza'],
    ajuda: { oQueE: 'Que tipo de lesão foi. O sistema usa a tabela 17 do eSocial.', exemplo: 'Corte; fratura; queimadura' } },
  { campo: 'Como aconteceu', area: 'CAT e afastamentos', ids: ['cat-desc'],
    ajuda: { oQueE: 'Descrição do acidente em poucas linhas: o que a pessoa fazia, o que deu errado e qual foi a lesão. Só fatos, sem culpados.' } },
  { campo: 'Atendimento médico (CAT)', area: 'CAT e afastamentos', ids: ['cat-atend', 'cat-medico', 'cat-crm', 'cat-dias'], prefixos: ['at-', 'mn-', 'cons-', 'mc-', 'muf-', 'dias-'],
    ajuda: { oQueE: 'Dados do primeiro atendimento: data, médico, registro e quantos dias de tratamento ele previu.', ondeAcho: 'No atestado ou no relatório do pronto-socorro.' } },
  { campo: 'CID', area: 'CAT e afastamentos', rotulos: ['CID', 'CID (se vier no atestado)'],
    ajuda: { oQueE: 'Código da doença ou lesão. Só preencha se o médico escreveu no atestado e o trabalhador autorizou. Serve para juntar atestados da mesma doença.', ondeAcho: 'No atestado ou laudo médico.', exemplo: 'S61.0 (ferimento de dedo)' } },
  { campo: 'Número do recibo do eSocial', area: 'CAT e afastamentos', prefixos: ['recibo-', 'rec-'],
    ajuda: { oQueE: 'O número que o eSocial devolve quando aceita o evento. Prova que a CAT foi enviada; a reabertura pede o recibo da CAT anterior.', ondeAcho: 'No sistema de folha ou no portal do eSocial, após o envio.' } },
  { campo: 'Motivo do afastamento', area: 'CAT e afastamentos', ids: ['af-motivo'],
    ajuda: { oQueE: 'O motivo pela tabela 18 do eSocial: doença, acidente de trabalho, licença-maternidade etc. Vai no evento S-2230.', baseLegal: 'eSocial, Tabela 18' } },
  { campo: 'Período do afastamento', area: 'CAT e afastamentos', ids: ['af-inicio', 'af-fim'],
    ajuda: { oQueE: 'Primeiro e último dia fora. Afastamento de 30 dias ou mais pede ASO de retorno antes de voltar.', baseLegal: 'NR-07, item 7.5.9' } },
  { campo: 'CAT do acidente', area: 'CAT e afastamentos', ids: ['af-cat'],
    ajuda: { oQueE: 'Se o afastamento é por acidente de trabalho, ligue à CAT registrada.' } },
  { campo: 'Foi acidente de trânsito?', area: 'CAT e afastamentos', ids: ['af-transito'],
    ajuda: { oQueE: 'O eSocial pede essa informação quando o afastamento vem de um acidente.' } },

  // ───────── eSocial ─────────
  { campo: 'Para onde enviar', area: 'eSocial', ids: ['es-amb'],
    ajuda: { oQueE: 'Comece pelo ambiente de testes (produção restrita). Ele não vale para o governo e serve para conferir se está tudo certo. Depois troque para "valendo".' } },
  { campo: 'Responsável pelos registros ambientais', area: 'eSocial', ids: ['es-rt-cpf', 'es-rt-conselho', 'es-rt-uf'],
    ajuda: { oQueE: 'O profissional que responde pelas medições do S-2240: CPF, conselho (CREA, CRM...) e estado do registro.', baseLegal: 'eSocial S-2240' } },
  { campo: 'Categoria do trabalhador', area: 'eSocial', prefixos: ['cat-'],
    ajuda: { oQueE: 'Preencha só para quem não tem matrícula, como estagiário (901) ou diretor sem vínculo. Código da Tabela 01 do eSocial.' } },
  { campo: 'Local do acidente (eSocial)', area: 'eSocial', prefixos: ['loc-', 'logr-', 'num-', 'bai-', 'cep-', 'uf-', 'cnpjl-'],
    ajuda: { oQueE: 'Endereço de onde o acidente aconteceu. Se foi em outra empresa (cliente), informe o CNPJ dela.' } },
  { campo: 'Código IBGE do município', area: 'eSocial', prefixos: ['mun-'],
    ajuda: { oQueE: 'Código de 7 dígitos do município.', ondeAcho: 'No site do IBGE (cidades.ibge.gov.br), ao abrir a cidade.', exemplo: '3550308 (São Paulo)' } },
  { campo: 'Último dia trabalhado', area: 'eSocial', prefixos: ['ult-'],
    ajuda: { oQueE: 'Último dia em que a pessoa trabalhou antes do acidente ou do afastamento.' } },
  { campo: 'Exame toxicológico (motorista)', area: 'eSocial', ids: ['tx-col', 'tx-data', 'tx-cnpj', 'tx-med', 'tx-crm', 'tx-uf'],
    ajuda: { oQueE: 'Motoristas profissionais fazem o exame toxicológico na admissão e no desligamento. O resultado vai no evento S-2221.', ondeAcho: 'No laudo do laboratório.', baseLegal: 'CLT, art. 168, § 6º' } },
  { campo: 'Código do exame toxicológico', area: 'eSocial', ids: ['tx-cod'],
    ajuda: { oQueE: 'Número do exame que vem no laudo: 2 letras e 9 números.', ondeAcho: 'No laudo do exame toxicológico, emitido pelo laboratório.', exemplo: 'AB123456789' } },
  { campo: 'Senha do certificado digital', area: 'eSocial', ids: ['senha-cert'],
    ajuda: { oQueE: 'A senha do certificado A1 (arquivo .pfx) da empresa ou procuração. Fica guardada protegida e só é usada para assinar os eventos.', ondeAcho: 'Com quem comprou o certificado (contador ou dono da empresa).' } },

  // ───────── Emergência ─────────
  { campo: 'Ocupação e risco de incêndio', area: 'Emergência e brigada', ids: ['em-divisao', 'brig-div'],
    ajuda: { oQueE: 'A divisão de ocupação da edificação, como está no projeto ou no AVCB. O risco depende da carga de incêndio. Define o tamanho da brigada.', ondeAcho: 'No AVCB, no CLCB ou no projeto técnico aprovado pelos Bombeiros.', exemplo: 'C-1 Comércio com baixa carga de incêndio', baseLegal: 'IT 17/2025, Tabela A.1 (SP)' } },
  { campo: 'Coordenador(a) da emergência', area: 'Emergência e brigada', ids: ['em-coord'],
    ajuda: { oQueE: 'Quem comanda a brigada e decide o abandono da área numa emergência.' } },
  { campo: 'Ponto de encontro', area: 'Emergência e brigada', ids: ['em-ponto'],
    ajuda: { oQueE: 'Lugar seguro, fora do prédio, onde todos se reúnem para contar quem saiu.', exemplo: 'Estacionamento da frente, ao lado do portão 2' } },
  { campo: 'Rotas de fuga', area: 'Emergência e brigada', ids: ['em-rotas'],
    ajuda: { oQueE: 'Caminhos sinalizados até as saídas. Devem estar sempre livres.', baseLegal: 'NR-23' } },
  { campo: 'Equipamento de combate', area: 'Emergência e brigada', ids: ['ct-tipo', 'ct-numero', 'ct-validade'],
    ajuda: { oQueE: 'Extintores, hidrantes e alarmes, com o número e a validade da recarga ou inspeção. O painel avisa antes de vencer.', ondeAcho: 'Na etiqueta do extintor ou no relatório da empresa de manutenção.', baseLegal: 'NR-23' } },

  // ───────── Psicossocial ─────────
  { campo: 'Questionário psicossocial', area: 'Psicossocial', ids: ['ps-q'],
    ajuda: { oQueE: 'O questionário aplicado de forma anônima para avaliar os riscos psicossociais (carga de trabalho, apoio, assédio...).', baseLegal: 'NR-01, item 1.5.3.1.4 (riscos psicossociais no GRO)' } },
  { campo: 'Mínimo de respostas por setor', area: 'Psicossocial', ids: ['ps-min'],
    ajuda: { oQueE: 'Setor com menos respostas que isso não aparece no resultado, para ninguém ser identificado.', exemplo: '5' } },
  { campo: 'Ação psicossocial', area: 'Psicossocial', ids: ['pa-acao', 'pa-setor', 'pa-dim', 'pa-resp'],
    ajuda: { oQueE: 'Medida para o tema que ficou ruim na pesquisa, no setor afetado, com responsável e prazo. Entra no plano de ação do PGR.', exemplo: 'Rever a escala de folgas do setor de entregas' } },

  // ───────── AET ─────────
  { campo: 'Posto analisado (AET)', area: 'Ergonomia (AET)', ids: ['aet-posto', 'aet-resp'],
    ajuda: { oQueE: 'O posto ou atividade estudada e quem fez a Análise Ergonômica do Trabalho.', baseLegal: 'NR-17, item 17.3.2' } },
  { campo: 'Etapas da AET', area: 'Ergonomia (AET)', ids: ['aet-demanda', 'aet-func', 'aet-met', 'aet-diag', 'aet-rest'],
    ajuda: { oQueE: 'A AET segue as etapas da NR-17: análise da demanda, como o trabalho funciona, métodos usados, diagnóstico, recomendações e devolutiva aos trabalhadores.', baseLegal: 'NR-17, item 17.3.8' } },

  // ───────── Terceiros e atestados ─────────
  { campo: 'Serviço do terceiro', area: 'Terceiros e atestados', ids: ['tc-servico', 'tc-ini', 'tc-fim'],
    ajuda: { oQueE: 'O que a empresa terceira faz aqui e por quanto tempo. A contratante também responde pela segurança dos terceiros.', baseLegal: 'NR-01, item 1.5.8' } },
  { campo: 'Documento do terceiro', area: 'Terceiros e atestados', prefixos: ['td-tipo-', 'td-val-'],
    ajuda: { oQueE: 'Documentos que a terceirizada precisa apresentar (PGR, PCMSO, ASOs, treinamentos) e até quando valem. O painel avisa o vencimento.' } },
  { campo: 'Trabalhador terceiro', area: 'Terceiros e atestados', prefixos: ['tw-aso-', 'tw-integ-', 'tw-treino-', 'tw-treinoval-'],
    ajuda: { oQueE: 'Para liberar a entrada: ASO válido, integração de segurança feita e os treinamentos que a atividade exige.' } },
  { campo: 'Atestado: motivo e período', area: 'Terceiros e atestados', ids: ['at-colab', 'at-inicio', 'at-tipo', 'at-medico'],
    ajuda: { oQueE: 'Registro do atestado para acompanhar faltas por doença. Afastamento de mais de 15 dias vai para o INSS.', baseLegal: 'Lei 8.213/91, art. 60' } },

  // ───────── FAP e RAT ─────────
  { campo: 'RAT', area: 'FAP e RAT', ids: ['fap-rat'],
    ajuda: { oQueE: 'Alíquota do Risco Ambiental do Trabalho: 1%, 2% ou 3% sobre a folha, conforme o CNAE.', ondeAcho: 'Com a contabilidade ou no Decreto 3.048/99, Anexo V.', baseLegal: 'Lei 8.212/91, art. 22, II' } },
  { campo: 'FAP', area: 'FAP e RAT', ids: ['fap-fap', 'fap-sim'],
    ajuda: { oQueE: 'Fator Acidentário de Prevenção: multiplicador de 0,5 a 2,0 sobre o RAT. Menos acidentes e afastamentos, FAP menor e imposto menor.', ondeAcho: 'No site da Previdência (FAP), com a senha da empresa, ou com a contabilidade.', exemplo: '0,8732', baseLegal: 'Decreto 3.048/99, art. 202-A' } },
  { campo: 'Ano de vigência', area: 'FAP e RAT', ids: ['fap-ano'],
    ajuda: { oQueE: 'O ano em que esse FAP vale. Ele é calculado com os acidentes de dois anos antes.' } },
  { campo: 'Folha mensal', area: 'FAP e RAT', ids: ['fap-folha'],
    ajuda: { oQueE: 'Total da folha de salários do mês. Com ele o sistema mostra quanto a empresa paga de RAT x FAP em reais.', ondeAcho: 'Com a contabilidade.' } },

  // ───────── Calculadoras ─────────
  { campo: 'Número de empregados (CIPA)', area: 'Calculadoras', ids: ['cipa-n'],
    ajuda: { oQueE: 'Empregados do estabelecimento. Com o grau de risco, dá o tamanho da CIPA.', baseLegal: 'NR-05, Quadro I' } },
  { campo: 'Número de empregados (SESMT)', area: 'Calculadoras', ids: ['sesmt-n'],
    ajuda: { oQueE: 'Empregados do estabelecimento. Com o grau de risco, dá quantos técnicos, engenheiros e médicos o SESMT precisa.', baseLegal: 'NR-04, Anexo II' } },
  { campo: 'População por pavimento', area: 'Calculadoras', prefixos: ['brig-p'],
    ajuda: { oQueE: 'Quantas pessoas ficam em cada andar. É a base para o número de brigadistas.' } },
  { campo: 'Ruído: nível e tempo', area: 'Calculadoras', ids: ['ruido-q'], prefixos: ['ru-n', 'ru-h'],
    ajuda: { oQueE: 'Cada nível de ruído e quantas horas a pessoa fica nele. A calculadora soma a dose do dia.', baseLegal: 'NR-15, Anexo 1; NHO 01' } },
  { campo: 'Calor: IBUTG', area: 'Calculadoras', ids: ['calor-sol', 'calor-tbn', 'calor-tg', 'calor-tbs'],
    ajuda: { oQueE: 'Leituras do medidor de estresse térmico. Com sol direto usa as três temperaturas; sem sol, só tbn e tg.', ondeAcho: 'No equipamento de IBUTG (termômetro de globo).', baseLegal: 'NR-15, Anexo 3; NHO 06' } },
  { campo: 'Taxas de frequência e gravidade', area: 'Calculadoras', ids: ['tx-ac', 'tx-dias', 'tx-hht', 'tx-func', 'tx-hm'],
    ajuda: { oQueE: 'Acidentes e dias perdidos por milhão de horas trabalhadas. Servem para comparar períodos e empresas.', baseLegal: 'ABNT NBR 14280' } },

  // ───────── SIPAT e 5S ─────────
  { campo: 'Tema da SIPAT', area: 'SIPAT e 5S', ids: ['sp-tema', 'sp-ini', 'sp-fim'],
    ajuda: { oQueE: 'A Semana Interna de Prevenção de Acidentes do Trabalho é organizada pela CIPA uma vez por ano.', baseLegal: 'NR-05, item 5.3.1, o' } },
  { campo: 'Auditoria 5S', area: 'SIPAT e 5S', ids: ['a5-setor', 'a5-data', 'a5-aud'],
    ajuda: { oQueE: 'Nota de organização e limpeza do setor, nos 5 sensos (utilização, ordenação, limpeza, padronização e disciplina).' } },

  { campo: 'Dados do acidente (CAT)', area: 'CAT e afastamentos', ids: ['cat-colab', 'cat-local'],
    ajuda: { oQueE: 'Quem se acidentou e onde: no próprio estabelecimento, em cliente, em via pública ou no trajeto.', baseLegal: 'eSocial S-2210' } },
  { campo: 'Afastamento, óbito e registro policial', area: 'CAT e afastamentos', ids: ['cat-afast', 'cat-obito', 'cat-policia'],
    ajuda: { oQueE: 'O eSocial pede essas três respostas. Com afastamento de mais de 15 dias, o trabalhador vai para o INSS; com óbito, a CAT é imediata.', baseLegal: 'Lei 8.213/91, art. 22 e 60' } },
  { campo: 'Testemunhas', area: 'CAT e afastamentos', ids: ['cat-test'],
    ajuda: { oQueE: 'Quem viu o acidente ou chegou logo depois. Ajuda na investigação e confirma os fatos da CAT.' } },
  { campo: 'Observação do afastamento', area: 'CAT e afastamentos', ids: ['af-obs'],
    ajuda: { oQueE: 'Detalhe que ajude a entender o afastamento. Para o motivo 21 (outros) o eSocial obriga a explicar.' } },
  { campo: 'Data da ocorrência', area: 'Plano de ação e investigação', ids: ['inv-data'],
    ajuda: { oQueE: 'Quando o acidente ou quase-acidente aconteceu. Investigue o quanto antes, enquanto os fatos estão frescos.' } },
  { campo: 'Profissional do exame ou da vacina', area: 'Prontuário de saúde', ids: ['pr-prof'],
    ajuda: { oQueE: 'Quem fez o exame (nome e registro) ou onde a vacina foi aplicada.', exemplo: 'Dra. Ana Souza, CRM-GO 12345; UBS Centro' } },
  { campo: 'CPF do médico do PCMSO', area: 'eSocial', ids: ['es-med-cpf'],
    ajuda: { oQueE: 'CPF do médico responsável pelo PCMSO. Vai no evento S-2220 (ASO).', ondeAcho: 'Com o médico ou a clínica.' } },
  { campo: 'Datas do treinamento', area: 'Treinamentos', ids: ['tr-inicio', 'tr-fim'],
    ajuda: { oQueE: 'Quando a turma começou e terminou. A validade conta a partir do fim.', baseLegal: 'NR-01, item 1.7' } },
  { campo: 'Pasta do documento', area: 'Empresa', ids: ['ar-cat'],
    ajuda: { oQueE: 'Onde o documento fica guardado no Arquivo (PGR, PCMSO, laudos, certificados...). Facilita achar depois.' } },
  { campo: 'Documento para assinar', area: 'Empresa', ids: ['pa-doc'],
    ajuda: { oQueE: 'O PDF do Arquivo que vai receber as assinaturas. Cada pessoa recebe um link para assinar pelo celular.' } },
  { campo: 'Programação da SIPAT', area: 'SIPAT e 5S', prefixos: ['sa-data-', 'sa-hora-', 'sa-tit-', 'sa-resp-', 'sa-local-', 'sa-dur-'],
    ajuda: { oQueE: 'Cada atividade da semana: dia, horário, tema, quem apresenta, local e duração. Vira a programação em PDF para divulgar.', exemplo: 'Seg 8h - Palestra sobre ergonomia com fisioterapeuta, refeitório, 40 min' } },
  { campo: 'Movimento de estoque', area: 'EPI e almoxarifado', prefixos: ['q-', 'obs-'],
    ajuda: { oQueE: 'Entrada é quando chega EPI novo (anote a nota fiscal). Ajuste é quando a contagem física não bate com o sistema (anote o motivo).' } },
  { campo: 'Outros telefones de emergência', area: 'Emergência e brigada', ids: ['em-contatos'],
    ajuda: { oQueE: 'Contatos além de 193 (Bombeiros) e 192 (SAMU): hospital mais próximo, Defesa Civil, concessionária de energia, gestor da empresa.' } },
  { campo: 'Atividade da PT', area: 'APR e Permissão de Trabalho', ids: ['pt-atividade'],
    ajuda: { oQueE: 'O serviço que a permissão libera, do jeito que está na APR.', exemplo: 'Solda na tubulação do telhado' } },
  { campo: 'Serviços contratados', area: 'Comercial', ids: ['ct-obj', 'os-desc'],
    ajuda: { oQueE: 'O que está incluso, em itens. Evita discussão depois sobre o que é extra.', exemplo: 'PGR, PCMSO, 1 visita mensal, treinamentos NR-06 e NR-35' } },
  { campo: 'Condições da proposta', area: 'Comercial', ids: ['pr-obs', 'ct-obs'],
    ajuda: { oQueE: 'Prazo de entrega, forma de pagamento e o que não está incluso.', exemplo: 'Entrega em 15 dias. 50% na assinatura e 50% na entrega. Exames médicos à parte.' } },

  // ───────── Comercial ─────────
  { campo: 'Contrato: empresa', area: 'Comercial', ids: ['ct-emp'],
    ajuda: { oQueE: 'O contrato precisa de uma empresa cadastrada. Se o cliente for novo, cadastre a empresa antes em "+ Nova empresa".' } },
  { campo: 'Mensalidade e vencimento', area: 'Comercial', ids: ['ct-mensal', 'ct-dia'],
    ajuda: { oQueE: 'Valor por mês e o dia de vencimento. O sistema gera as cobranças todo mês e avisa as atrasadas.' } },
  { campo: 'Validade da proposta', area: 'Comercial', ids: ['pr-val'],
    ajuda: { oQueE: 'Por quantos dias o preço da proposta vale.', exemplo: '15' } },
  { campo: 'Chave Pix', area: 'Comercial', ids: ['cf-chave'],
    ajuda: { oQueE: 'A chave onde você quer receber: CPF, CNPJ, e-mail, celular com +55 ou a chave aleatória. Vai no QR Code das cobranças.', ondeAcho: 'No app do seu banco, na área Pix.' } },
  { campo: 'Nome do recebedor', area: 'Comercial', ids: ['cf-nome'],
    ajuda: { oQueE: 'O nome que aparece para o cliente na hora de pagar o Pix. Use o mesmo cadastrado no banco.' } },

  // ───────── Sua conta ─────────
  { campo: 'Nome que vai aparecer nos documentos', area: 'Sua conta', ids: ['nomeConsultoria'],
    ajuda: { oQueE: 'O nome da sua consultoria ou o seu nome profissional. Sai no rodapé dos documentos, junto com a sua logo.' } },
  { campo: 'Logo da consultoria', area: 'Sua conta', ids: ['logo-consultoria'],
    ajuda: { oQueE: 'Sai no rodapé de todos os documentos. A logo do cliente vai no cabeçalho.' } },

  // ───────── Normas (administração) ─────────
  { campo: 'Para quem a norma vale', area: 'Normas (administração)', ids: ['n-cnae', 'n-gr', 'n-func'],
    ajuda: { oQueE: 'Filtros para avisar só as empresas afetadas pela mudança: começo do CNAE, grau de risco mínimo e número mínimo de funcionários. Deixe em branco para avisar todas.' } },
  { campo: 'Datas da norma', area: 'Normas (administração)', ids: ['n-pub', 'n-vig'],
    ajuda: { oQueE: 'Quando a portaria saiu e quando começa a valer. O aviso mostra quanto tempo falta para se adequar.' } },
];

const semAcento = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s*\(opcional\)\s*/g, '').trim();

const porId = new Map<string, Ajuda>();
const porRotulo = new Map<string, Ajuda>();
const prefixos: { prefixo: string; ajuda: Ajuda }[] = [];
for (const item of AJUDA_CAMPOS) {
  item.ids?.forEach((id) => porId.set(id, item.ajuda));
  item.rotulos?.forEach((r) => porRotulo.set(semAcento(r), item.ajuda));
  item.prefixos?.forEach((p) => prefixos.push({ prefixo: p, ajuda: item.ajuda }));
}
// O prefixo mais comprido ganha ("exame-tipo-" antes de "exame-").
prefixos.sort((a, b) => b.prefixo.length - a.prefixo.length);

// O resto do id depois do prefixo precisa parecer um id do banco ou um número de linha,
// para "cat-" (categoria do eSocial) não pegar "cat-colab" (tela da CAT).
const restoDeLinha = (resto: string) => /^[a-z0-9]{8,}$/i.test(resto) || /^\d+$/.test(resto);

export function ajudaDoCampo(id?: string, rotulo?: string): Ajuda | undefined {
  if (id) {
    const exato = porId.get(id);
    if (exato) return exato;
    const p = prefixos.find((x) => id.startsWith(x.prefixo) && restoDeLinha(id.slice(x.prefixo.length)));
    if (p) return p.ajuda;
  }
  if (rotulo) return porRotulo.get(semAcento(rotulo));
  return undefined;
}
