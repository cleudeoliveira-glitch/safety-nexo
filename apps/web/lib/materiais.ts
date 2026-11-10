// Material pronto dos treinamentos: slides, fala do instrutor (roteiro) e prova com gabarito.
// Fica no próprio site, então abre sem internet depois da primeira visita (tela /material).
// Conteúdo-base escrito a partir do texto das NRs: o profissional responsável deve revisar e adaptar à empresa antes de aplicar.

export type Slide = { titulo: string; pontos: string[]; fala: string };
export type Questao = { pergunta: string; opcoes: [string, string, string, string]; certa: 0 | 1 | 2 | 3 };
export type Material = {
  codigo: string; norma: string; nome: string; cargaHoraria: string; publico: string;
  slides: Slide[]; prova: Questao[];
};

export const MATERIAIS: Material[] = [
  {
    codigo: 'nr35', norma: 'NR-35', nome: 'Trabalho em altura', cargaHoraria: 'Inicial: 8 horas, teórico e prático. Periódico: a cada 2 anos, 8 horas.',
    publico: 'Quem trabalha acima de 2,00 m do nível inferior, onde haja risco de queda.',
    slides: [
      { titulo: 'Trabalho em altura (NR-35)', pontos: ['Treinamento obrigatório para quem trabalha acima de 2 metros', 'Teoria + prática', 'Objetivo: ninguém cai'], fala: 'Apresente-se, diga quanto tempo vai durar e combine as regras: celular no silencioso e perguntas a qualquer hora. Pergunte quem já viu ou soube de uma queda. Use as respostas para mostrar que o assunto é real.' },
      { titulo: 'O que é trabalho em altura', pontos: ['Toda atividade acima de 2,00 m do nível inferior', 'Onde haja risco de queda', 'Exemplos: telhado, andaime, escada, plataforma, caminhão'], fala: 'Peça exemplos da própria empresa. Reforce que a altura conta a partir do nível de baixo, e não do chão onde a pessoa está.' },
      { titulo: 'Quem pode trabalhar em altura', pontos: ['Capacitado: fez este treinamento', 'Autorizado pela empresa', 'Apto no ASO (exame médico)', 'Em boas condições no dia'], fala: 'Explique que capacitação sozinha não basta: precisa da autorização formal e da aptidão médica. Quem não estiver bem no dia (tontura, remédio, mal-estar) deve avisar e não sobe.' },
      { titulo: 'Análise de risco e permissão de trabalho', pontos: ['Todo trabalho em altura começa pela análise de risco', 'Atividade fora da rotina: Permissão de Trabalho (PT)', 'Condições impeditivas: chuva, vento forte, raio, falta de luz', 'Na dúvida, pare e pergunte'], fala: 'Mostre um modelo de APR e de PT do sistema. Pergunte: quais condições fariam vocês pararem hoje? Liste no quadro.' },
      { titulo: 'Riscos e como evitar', pontos: ['Queda de pessoas e de materiais', 'Choque elétrico perto de redes', 'Piso frágil (telha, forro)', 'Isolar e sinalizar a área de baixo'], fala: 'Conte que muitas quedas acontecem em trabalhos rápidos ("é só um minutinho"). Mostre como isolar a área de baixo para proteger quem passa.' },
      { titulo: 'Proteção coletiva primeiro', pontos: ['Guarda-corpo, rodapé e tela', 'Plataformas e andaimes montados e liberados', 'Linha de vida instalada por profissional', 'O EPI vem depois da proteção coletiva'], fala: 'Explique a ordem: primeiro eliminar o risco, depois proteger todos (coletiva), e só então proteger a pessoa (EPI).' },
      { titulo: 'Cinto, talabarte e ancoragem', pontos: ['Cinto tipo paraquedista com talabarte e absorvedor de energia', 'Ancorar acima da cabeça, em ponto resistente', 'Inspecionar antes de cada uso', 'Cinto que segurou queda sai de uso'], fala: 'Faça a prática: cada um veste o cinto, ajusta e mostra onde ancoraria. Mostre o que procurar na inspeção: costuras, fitas, fivelas, mosquetões e etiqueta.' },
      { titulo: 'Zona livre de queda e suspensão', pontos: ['Espaço livre abaixo precisa caber a queda + abertura do absorvedor', 'Pessoa pendurada no cinto corre risco à saúde (suspensão inerte)', 'O resgate precisa ser rápido e planejado antes'], fala: 'Explique com desenho no quadro: se não houver espaço embaixo, a pessoa bate no chão mesmo usando cinto. Reforce que ninguém sobe sem saber como será o resgate.' },
      { titulo: 'Emergência e resgate', pontos: ['Plano de resgate antes de começar', 'Equipe treinada e material no local', 'Acionar socorro: SAMU 192 e Bombeiros 193', 'Não improvisar resgate'], fala: 'Simule: alguém ficou pendurado. Quem faz o quê? Quem liga? Onde está o material? Anote as respostas e corrija.' },
      { titulo: 'Resumo', pontos: ['Analise o risco e respeite as condições impeditivas', 'Proteção coletiva primeiro', 'Cinto inspecionado e ancorado acima da cabeça', 'Resgate planejado', 'Direito de recusa diante de risco grave'], fala: 'Retome os pontos, tire as dúvidas e aplique a prova. Depois faça a prática supervisionada e registre a lista de presença.' },
    ],
    prova: [
      { pergunta: 'A partir de qual altura a NR-35 considera trabalho em altura?', opcoes: ['1,50 m', '2,00 m', '3,00 m', '5,00 m'], certa: 1 },
      { pergunta: 'Antes de começar o trabalho em altura, o que deve ser feito?', opcoes: ['Só vestir o cinto', 'Análise de risco', 'Avisar o almoxarifado', 'Nada, se for rápido'], certa: 1 },
      { pergunta: 'Qual destas é uma condição que impede o trabalho em altura?', opcoes: ['Dia nublado', 'Chuva ou vento forte', 'Trabalho depois do almoço', 'Equipe com 3 pessoas'], certa: 1 },
      { pergunta: 'Qual a ordem certa de proteção?', opcoes: ['EPI, depois coletiva', 'Só o EPI', 'Proteção coletiva primeiro, depois EPI', 'Tanto faz'], certa: 2 },
      { pergunta: 'Onde ancorar o talabarte, sempre que possível?', opcoes: ['Na altura do pé', 'Acima da cabeça, em ponto resistente', 'No guarda-corpo de madeira solto', 'Na escada'], certa: 1 },
      { pergunta: 'Um cinto que segurou uma queda deve:', opcoes: ['Ser lavado e usado de novo', 'Sair de uso', 'Ser emprestado para outro setor', 'Ser guardado como reserva'], certa: 1 },
      { pergunta: 'Para trabalhar em altura, além do treinamento, a pessoa precisa:', opcoes: ['Ter mais de 10 anos de empresa', 'Estar autorizada e apta no exame médico', 'Ser do sexo masculino', 'Ter carteira de motorista'], certa: 1 },
      { pergunta: 'Por que a pessoa pendurada no cinto precisa ser resgatada rápido?', opcoes: ['Porque o cinto pode rasgar', 'Porque ficar suspensa traz risco à saúde', 'Porque atrapalha o serviço', 'Não precisa ser rápido'], certa: 1 },
      { pergunta: 'O plano de resgate deve ser feito:', opcoes: ['Depois do acidente', 'Antes de começar o trabalho', 'Só em obras grandes', 'Pelo próprio acidentado'], certa: 1 },
      { pergunta: 'De quanto em quanto tempo é o treinamento periódico de NR-35?', opcoes: ['Todo ano', 'A cada 2 anos', 'A cada 5 anos', 'Não tem periódico'], certa: 1 },
    ],
  },
  {
    codigo: 'nr10', norma: 'NR-10', nome: 'Segurança em eletricidade (básico)', cargaHoraria: 'Básico: 40 horas (Anexo II da NR-10). Reciclagem: a cada 2 anos.',
    publico: 'Quem trabalha em instalações elétricas ou nas proximidades delas.',
    slides: [
      { titulo: 'Segurança em eletricidade (NR-10)', pontos: ['Curso básico obrigatório', 'Choque, arco elétrico e incêndio', 'Objetivo: trabalhar desenergizado e com segurança'], fala: 'Apresente o curso e o tempo total. Pergunte quem já levou choque. Use as histórias para mostrar o tamanho do risco.' },
      { titulo: 'Riscos da eletricidade', pontos: ['Choque elétrico', 'Arco elétrico e queimaduras', 'Incêndio e explosão', 'Queda por reação ao choque'], fala: 'Explique que a corrente que passa pelo corpo pode parar o coração, e que o arco elétrico queima mesmo sem encostar.' },
      { titulo: 'Quem pode trabalhar com eletricidade', pontos: ['Qualificado: curso na área elétrica', 'Habilitado: qualificado e com registro no conselho', 'Capacitado: treinado por profissional habilitado', 'Autorizado: com anuência formal da empresa'], fala: 'Mostre que só o trabalhador autorizado pode intervir em instalações elétricas, e que a autorização fica registrada.' },
      { titulo: 'Desenergizar: a sequência', pontos: ['1. Seccionamento', '2. Impedir a reenergização (bloqueio)', '3. Constatar a ausência de tensão', '4. Aterramento temporário com equipotencialização', '5. Proteger os elementos energizados próximos', '6. Sinalizar o impedimento de reenergização'], fala: 'Faça a turma repetir a sequência em voz alta. Mostre cadeado, etiqueta e detector de tensão. Reforce: a instalação só é considerada desenergizada depois de todos os passos.' },
      { titulo: 'Zonas de risco', pontos: ['Zona de risco: só profissional autorizado, com técnica e equipamento próprios', 'Zona controlada: só autorizado', 'Zona livre: fora das anteriores'], fala: 'Desenhe as zonas em volta de um ponto energizado. Pergunte onde cada um da turma pode estar.' },
      { titulo: 'Proteção coletiva e individual', pontos: ['Primeiro: desenergizar, isolar e sinalizar', 'Barreiras, invólucros e aterramento', 'EPI com CA: luvas isolantes, capacete, óculos, vestimenta para arco', 'Proibido adornos: anel, relógio, corrente'], fala: 'Peça que todos tirem um adorno e explique por que metal no corpo aumenta o risco.' },
      { titulo: 'Rotina e documentação', pontos: ['Procedimento escrito para cada tarefa', 'Ordem de serviço antes de intervir', 'Esquemas e diagramas atualizados', 'Prontuário das instalações quando a carga passar de 75 kW'], fala: 'Mostre um procedimento simples e uma ordem de serviço. Explique que sem papel não se começa o serviço.' },
      { titulo: 'Incêndio e primeiros socorros', pontos: ['Desligar a energia antes de combater o fogo', 'Extintor adequado (CO₂ ou pó químico para equipamento energizado)', 'Vítima de choque: desligar a energia antes de tocar', 'Chamar SAMU 192 e iniciar reanimação se souber'], fala: 'Simule: colega encostado no fio. O que fazer primeiro? A resposta certa é desligar a energia, nunca puxar com a mão.' },
      { titulo: 'Direito de recusa', pontos: ['Diante de risco grave e iminente, o trabalhador pode recusar a tarefa', 'Comunicar o superior imediatamente', 'Ninguém deve ser punido por isso'], fala: 'Reforce que parar é uma atitude de segurança e não de desobediência.' },
      { titulo: 'Resumo', pontos: ['Só trabalha quem é autorizado', 'Desenergizar seguindo os 6 passos', 'EPI com CA e sem adornos', 'Procedimento e ordem de serviço', 'Na dúvida, pare'], fala: 'Retome os pontos, tire as dúvidas e aplique a prova. Lembre que o curso básico completo tem 40 horas e este material é um apoio.' },
    ],
    prova: [
      { pergunta: 'Qual é a carga horária mínima do curso básico de NR-10?', opcoes: ['8 horas', '16 horas', '40 horas', '80 horas'], certa: 2 },
      { pergunta: 'Qual é o primeiro passo da desenergização?', opcoes: ['Aterramento', 'Seccionamento', 'Sinalização', 'Teste de tensão'], certa: 1 },
      { pergunta: 'O que garante que ninguém religue o circuito durante o serviço?', opcoes: ['Avisar no rádio', 'Bloqueio e sinalização de impedimento', 'Trabalhar rápido', 'Usar luva'], certa: 1 },
      { pergunta: 'Antes de tocar em quem está levando choque, você deve:', opcoes: ['Puxar pelo braço', 'Jogar água', 'Desligar a energia', 'Esperar passar'], certa: 2 },
      { pergunta: 'Quem pode intervir em instalações elétricas?', opcoes: ['Qualquer funcionário', 'Só o trabalhador autorizado pela empresa', 'Quem tiver curiosidade', 'Só o gerente'], certa: 1 },
      { pergunta: 'Adornos como anel e relógio, no trabalho com eletricidade, são:', opcoes: ['Permitidos', 'Proibidos', 'Permitidos se forem de ouro', 'Obrigatórios'], certa: 1 },
      { pergunta: 'Na zona controlada pode entrar:', opcoes: ['Qualquer pessoa', 'Só profissional autorizado', 'Visitantes', 'Ninguém, nunca'], certa: 1 },
      { pergunta: 'O arco elétrico pode causar:', opcoes: ['Só barulho', 'Queimaduras, mesmo sem encostar', 'Nada', 'Só choque'], certa: 1 },
      { pergunta: 'Diante de risco grave e iminente, o trabalhador:', opcoes: ['Deve continuar', 'Pode recusar a tarefa e comunicar o superior', 'Deve esconder', 'Deve fazer mais rápido'], certa: 1 },
      { pergunta: 'Qual extintor serve para equipamento energizado?', opcoes: ['Água', 'Espuma', 'CO₂ ou pó químico', 'Qualquer um'], certa: 2 },
    ],
  },
  {
    codigo: 'nr06', norma: 'NR-06', nome: 'Uso correto de EPI', cargaHoraria: 'A NR-06 não fixa carga horária: defina conforme os riscos e os EPIs da empresa.',
    publico: 'Todos os trabalhadores que recebem EPI.',
    slides: [
      { titulo: 'Equipamento de Proteção Individual (NR-06)', pontos: ['O que é EPI', 'Deveres da empresa e do trabalhador', 'Como usar, guardar e trocar'], fala: 'Comece pedindo que cada um mostre o EPI que usa hoje. Pergunte se está em bom estado.' },
      { titulo: 'O que é EPI', pontos: ['Dispositivo de uso individual que protege contra riscos', 'Precisa ter Certificado de Aprovação (CA)', 'Entregue de graça pela empresa'], fala: 'Mostre onde fica o número do CA no EPI e explique que sem CA válido não é EPI.' },
      { titulo: 'Primeiro, proteção coletiva', pontos: ['Eliminar ou reduzir o risco na fonte', 'Proteções coletivas e medidas de organização', 'EPI quando as outras medidas não bastam ou enquanto são implantadas'], fala: 'Explique que o EPI é a última barreira entre o risco e a pessoa.' },
      { titulo: 'Deveres da empresa', pontos: ['Fornecer o EPI adequado ao risco, de graça', 'Orientar e treinar sobre uso, guarda e conservação', 'Exigir o uso', 'Trocar quando danificado ou extraviado', 'Registrar a entrega (ficha, livro ou sistema)'], fala: 'Mostre a ficha de EPI do sistema e a entrega com o rosto, se a empresa usa.' },
      { titulo: 'Deveres do trabalhador', pontos: ['Usar só para a finalidade a que se destina', 'Cuidar da guarda e da conservação', 'Avisar quando o EPI estragar', 'Cumprir as orientações da empresa'], fala: 'Reforce que deixar de usar o EPI sem motivo pode gerar advertência, porque é uma regra de segurança.' },
      { titulo: 'Usar do jeito certo', pontos: ['Tamanho adequado e bem ajustado', 'Protetor auditivo bem inserido', 'Óculos e máscara sem folga', 'Luva certa para o risco (corte, químico, calor)'], fala: 'Faça a prática: cada um coloca o protetor auricular e a máscara. Corrija na hora.' },
      { titulo: 'Guardar, limpar e trocar', pontos: ['Guardar em local limpo e seco', 'Limpar conforme o fabricante', 'Não emprestar EPI de uso pessoal', 'Trocar quando rasgar, quebrar ou perder a proteção'], fala: 'Mostre um EPI danificado e pergunte o que está errado.' },
      { titulo: 'Resumo', pontos: ['EPI tem CA e é de graça', 'Use, cuide e avise quando estragar', 'A empresa registra cada entrega', 'O EPI só protege se estiver no corpo'], fala: 'Tire as dúvidas, aplique a prova e registre a presença.' },
    ],
    prova: [
      { pergunta: 'Todo EPI precisa ter:', opcoes: ['Nota fiscal', 'Certificado de Aprovação (CA)', 'Cor laranja', 'Nome do trabalhador'], certa: 1 },
      { pergunta: 'Quem paga o EPI?', opcoes: ['O trabalhador', 'A empresa, de graça', 'Metade cada um', 'O sindicato'], certa: 1 },
      { pergunta: 'O EPI deve ser usado:', opcoes: ['Quando o chefe estiver olhando', 'Sempre que houver o risco', 'Só na primeira semana', 'Quando der vontade'], certa: 1 },
      { pergunta: 'Se o EPI estragar, o trabalhador deve:', opcoes: ['Continuar usando', 'Avisar e pedir a troca', 'Jogar fora e ficar sem', 'Consertar com fita'], certa: 1 },
      { pergunta: 'A ordem certa de proteção é:', opcoes: ['EPI antes de tudo', 'Proteção coletiva primeiro, EPI como complemento', 'Só EPI', 'Só treinamento'], certa: 1 },
      { pergunta: 'A empresa deve registrar a entrega do EPI em:', opcoes: ['Lugar nenhum', 'Ficha, livro ou sistema eletrônico', 'Só de boca', 'Grupo de WhatsApp'], certa: 1 },
      { pergunta: 'Emprestar o protetor auricular para um colega é:', opcoes: ['Recomendado', 'Errado, é de uso pessoal', 'Obrigatório', 'Indiferente'], certa: 1 },
      { pergunta: 'O EPI deve ser guardado em:', opcoes: ['Qualquer lugar', 'Local limpo e seco', 'No chão da obra', 'Dentro do carro no sol'], certa: 1 },
    ],
  },
  {
    codigo: 'nr12', norma: 'NR-12', nome: 'Segurança em máquinas e equipamentos', cargaHoraria: 'Carga horária conforme a máquina e o que a NR-12 e seus anexos pedem para cada caso.',
    publico: 'Operadores e quem faz manutenção, limpeza e ajuste de máquinas.',
    slides: [
      { titulo: 'Segurança em máquinas (NR-12)', pontos: ['Riscos das máquinas', 'Proteções e dispositivos de segurança', 'Bloqueio na manutenção'], fala: 'Pergunte quais máquinas a turma opera e anote. Use as máquinas da empresa como exemplo em todo o curso.' },
      { titulo: 'Riscos das máquinas', pontos: ['Prensamento e esmagamento', 'Corte e amputação', 'Arrastamento por partes giratórias', 'Projeção de partículas', 'Choque elétrico'], fala: 'Mostre fotos ou a própria máquina e peça que apontem onde está cada risco.' },
      { titulo: 'Quem pode operar', pontos: ['Só trabalhador capacitado', 'Autorizado pela empresa', 'Conhece o manual e o procedimento da máquina'], fala: 'Explique que operar sem capacitação é proibido, mesmo que a pessoa "saiba mexer".' },
      { titulo: 'Proteções', pontos: ['Proteção fixa: só sai com ferramenta', 'Proteção móvel com intertravamento: a máquina para ao abrir', 'Nunca retirar, burlar ou anular uma proteção'], fala: 'Mostre uma proteção na máquina real. Conte um caso de proteção burlada que terminou em acidente.' },
      { titulo: 'Parada de emergência', pontos: ['Botão de emergência visível e ao alcance', 'Testar antes de começar', 'Depois de acionado, a máquina só volta com novo comando'], fala: 'Faça cada um localizar e testar o botão de emergência da máquina que opera.' },
      { titulo: 'Manutenção, limpeza e ajuste', pontos: ['Máquina parada e desenergizada', 'Bloqueio com cadeado e etiqueta', 'Cuidado com energia acumulada (molas, ar, pressão)', 'Só pessoa capacitada'], fala: 'Faça a prática do bloqueio: desligar, bloquear, etiquetar e testar a partida para confirmar que não liga.' },
      { titulo: 'Antes de operar', pontos: ['Inspeção rápida: proteções no lugar, sem vazamentos, botões funcionando', 'Área limpa e organizada', 'Roupas justas, cabelo preso, sem adornos', 'EPI indicado para a máquina'], fala: 'Entregue o checklist da máquina e preencha junto com a turma.' },
      { titulo: 'Resumo', pontos: ['Só opera quem é capacitado e autorizado', 'Proteção no lugar, sempre', 'Bloqueio antes de manutenção e limpeza', 'Emergência testada', 'Na dúvida, pare'], fala: 'Tire as dúvidas, aplique a prova e registre a presença.' },
    ],
    prova: [
      { pergunta: 'Quem pode operar uma máquina?', opcoes: ['Qualquer um', 'Só o trabalhador capacitado e autorizado', 'Quem estiver livre', 'O estagiário'], certa: 1 },
      { pergunta: 'Retirar a proteção para trabalhar mais rápido é:', opcoes: ['Permitido', 'Proibido', 'Permitido à noite', 'Recomendado'], certa: 1 },
      { pergunta: 'Proteção móvel com intertravamento faz a máquina:', opcoes: ['Acelerar', 'Parar quando a proteção é aberta', 'Fazer barulho', 'Nada'], certa: 1 },
      { pergunta: 'Antes da manutenção, a máquina deve estar:', opcoes: ['Ligada', 'Parada, desenergizada e bloqueada', 'Em velocidade baixa', 'Com a proteção aberta'], certa: 1 },
      { pergunta: 'O botão de parada de emergência deve ser:', opcoes: ['Escondido', 'Visível e fácil de alcançar', 'Usado só pelo chefe', 'Desligado'], certa: 1 },
      { pergunta: 'Roupas largas e adornos perto de partes que giram podem causar:', opcoes: ['Nada', 'Arrastamento', 'Melhor ventilação', 'Mais produtividade'], certa: 1 },
      { pergunta: 'Depois de acionada a emergência, a máquina:', opcoes: ['Volta sozinha', 'Só volta com novo comando de partida', 'Fica para sempre parada', 'Explode'], certa: 1 },
      { pergunta: 'Energia acumulada (mola, ar comprimido) deve ser:', opcoes: ['Ignorada', 'Liberada ou contida antes da manutenção', 'Aumentada', 'Desconsiderada se a máquina está desligada'], certa: 1 },
    ],
  },
  {
    codigo: 'nr05', norma: 'NR-05', nome: 'CIPA: treinamento dos membros', cargaHoraria: 'Grau de risco 1: 8 h · grau 2: 12 h · grau 3: 16 h · grau 4: 20 h.',
    publico: 'Membros titulares e suplentes da CIPA e o representante nomeado.',
    slides: [
      { titulo: 'CIPA (NR-05)', pontos: ['Comissão Interna de Prevenção de Acidentes e de Assédio', 'Papel dos membros', 'Como agir no dia a dia'], fala: 'Apresente-se e peça que cada membro diga o setor em que trabalha. Explique que a CIPA é a ponte entre trabalhadores e empresa.' },
      { titulo: 'Para que serve a CIPA', pontos: ['Prevenir acidentes e doenças do trabalho', 'Tornar o trabalho compatível com a preservação da vida e a saúde', 'Prevenir o assédio sexual e outras formas de violência no trabalho'], fala: 'Destaque que a prevenção do assédio passou a fazer parte da CIPA. Explique que todos podem levar problemas para a comissão.' },
      { titulo: 'Como é formada', pontos: ['Representantes da empresa (indicados) e dos empregados (eleitos)', 'Mandato de 1 ano, com uma reeleição', 'Eleitos têm estabilidade desde o registro da candidatura até 1 ano depois do mandato'], fala: 'Mostre a composição da CIPA desta empresa no sistema.' },
      { titulo: 'Atribuições', pontos: ['Acompanhar o PGR e as medidas de prevenção', 'Verificar os ambientes e as condições de trabalho', 'Participar da análise de acidentes', 'Promover a SIPAT', 'Divulgar informações de segurança'], fala: 'Peça exemplos de situações perigosas que a turma conhece. Mostre como registrar um relato pelo QR code.' },
      { titulo: 'Acidentes e doenças do trabalho', pontos: ['Acidente típico, de trajeto e doença ocupacional', 'Quase acidente também é sinal de alerta', 'Comunicação: CAT'], fala: 'Conte um caso real (sem nomes) e pergunte o que poderia ter evitado.' },
      { titulo: 'Investigação de acidentes', pontos: ['Ir ao local e ouvir as pessoas', 'Buscar as causas, não culpados', 'Propor ações e acompanhar até o fim'], fala: 'Faça um exercício rápido com os "5 porquês" sobre um acidente simples.' },
      { titulo: 'Riscos e prevenção', pontos: ['Riscos físicos, químicos, biológicos, ergonômicos e de acidentes', 'Hierarquia: eliminar, proteger todos, organizar, EPI', 'Mapa dos riscos do setor'], fala: 'Peça que cada grupo aponte 3 riscos do seu setor e uma medida para cada um.' },
      { titulo: 'Assédio e violência no trabalho', pontos: ['O que é assédio sexual e moral', 'Como acolher e encaminhar uma denúncia', 'Sigilo e respeito a quem denuncia'], fala: 'Trate o tema com cuidado. Mostre o canal de denúncia da empresa.' },
      { titulo: 'Reuniões', pontos: ['Reuniões ordinárias mensais, conforme o calendário', 'Ata de cada reunião', 'Reunião extraordinária em caso de acidente grave'], fala: 'Mostre o calendário de reuniões gerado pelo sistema.' },
      { titulo: 'Resumo', pontos: ['CIPA previne acidentes, doenças e assédio', 'Membros observam, ouvem e propõem', 'Acompanhar as ações até o fim', 'Prevenção é trabalho de todos'], fala: 'Tire as dúvidas, aplique a prova e registre a presença com a carga horária do grau de risco da empresa.' },
    ],
    prova: [
      { pergunta: 'Qual é a duração do mandato da CIPA?', opcoes: ['6 meses', '1 ano', '2 anos', '4 anos'], certa: 1 },
      { pergunta: 'Além de acidentes, a CIPA também atua na prevenção de:', opcoes: ['Faltas', 'Assédio e violência no trabalho', 'Atrasos', 'Horas extras'], certa: 1 },
      { pergunta: 'Os representantes dos empregados na CIPA são:', opcoes: ['Indicados pela empresa', 'Eleitos pelos empregados', 'Sorteados', 'Escolhidos pelo sindicato'], certa: 1 },
      { pergunta: 'Ao investigar um acidente, o objetivo é:', opcoes: ['Achar um culpado', 'Entender as causas e evitar que se repita', 'Punir o acidentado', 'Arquivar rápido'], certa: 1 },
      { pergunta: 'Quase acidente deve ser:', opcoes: ['Ignorado', 'Comunicado e analisado', 'Escondido', 'Comemorado'], certa: 1 },
      { pergunta: 'A carga horária do treinamento da CIPA depende:', opcoes: ['Do tamanho da sala', 'Do grau de risco da empresa', 'Da vontade do instrutor', 'Do número de membros'], certa: 1 },
      { pergunta: 'O membro eleito tem estabilidade:', opcoes: ['Nenhuma', 'Desde a candidatura até 1 ano após o mandato', 'Só durante a eleição', 'Para sempre'], certa: 1 },
      { pergunta: 'Qual evento a CIPA ajuda a promover?', opcoes: ['Festa junina', 'SIPAT', 'Feira de vendas', 'Campeonato'], certa: 1 },
    ],
  },
];

export const materialDa = (norma: string | null | undefined) => MATERIAIS.find((m) => m.norma === norma);
