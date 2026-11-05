// DDS vivencial, para cada tema, uma situação para contar (caso de exemplo, sem nomes reais)
// e uma dinâmica de cerca de 3 minutos para a equipe viver o assunto, não só ouvir.
// As dinâmicas são seguras: usam simulação, objetos do dia a dia e EPI sem exposição ao risco.
export type VivenciaDds = { situacao: string; dinamica: string };

export const VIVENCIAS_DDS: Record<string, VivenciaDds> = {
  "Por que usar o EPI": {
    situacao: "Um ajudante tirou os óculos só para ver melhor um corte rápido. Uma lasca pulou e atingiu o olho dele. Foram dois minutos sem óculos e trinta dias afastado.",
    dinamica: "Peça para um voluntário enfiar uma linha numa agulha (ou abotoar uma camisa) usando luva grossa, e depois sem luva. Pergunte: a luva atrapalha? Mostre que o desconforto se resolve trocando o modelo, não tirando o EPI. Lição: se o EPI incomoda, avise; não tire.",
  },
  "Ordem e limpeza": {
    situacao: "No fim do turno, uma mangueira ficou atravessada no corredor. De manhã, a colega que chegou primeiro tropeçou no escuro e torceu o tornozelo.",
    dinamica: "Dê 60 segundos para a equipe apontar, ali mesmo, tudo que está fora do lugar no setor. Anote em voz alta. Depois, cada um arruma um item. Lição: o que parece pequeno é o que derruba a gente.",
  },
  "Levantamento manual de cargas": {
    situacao: "Um repositor levantou uma caixa de 25 kg girando o tronco para colocá-la na prateleira. Sentiu uma pontada nas costas e passou a semana com dor.",
    dinamica: "Coloque uma caixa leve no chão. Um voluntário levanta do jeito errado (pernas esticadas, girando o corpo) e outro do jeito certo (joelhos dobrados, carga perto do corpo, vira com os pés). A equipe aponta as diferenças. Lição: quem levanta é a perna, não a coluna.",
  },
  "Quase acidente: por que relatar": {
    situacao: "Uma prateleira balançou quando alguém apoiou uma caixa. Ninguém contou. Na semana seguinte, ela caiu com tudo em cima de um carrinho, por sorte sem ninguém do lado.",
    dinamica: "Peça para cada um lembrar de um susto que teve no trabalho (algo que quase deu errado). Dois ou três contam em 30 segundos. Pergunte: alguém registrou? Lição: o quase acidente é um aviso de graça; relatar é o que impede o acidente de verdade.",
  },
  "Prevenção de incêndio": {
    situacao: "Um pano com óleo ficou jogado perto de uma tomada aquecida. No meio da noite, começou a soltar fumaça. O vigia viu a tempo.",
    dinamica: "Desenhe no chão (ou num papel) o triângulo do fogo: calor, combustível e oxigênio. Peça para a equipe citar, no setor, um exemplo de cada. Depois, digam como tirar um dos três lados. Lição: sem um dos três, não tem fogo.",
  },
  "Uso de extintores": {
    situacao: "Num princípio de incêndio, o funcionário pegou o extintor e não conseguia tirar o lacre. Perdeu segundos preciosos porque nunca tinha segurado um.",
    dinamica: "Leve um extintor (sem disparar). Cada um segura, mostra onde está o pino e o manômetro, e fala em voz alta os passos: puxar o pino, apontar para a base do fogo, apertar o gatilho, varrer. Lição: quem já segurou um extintor age mais rápido.",
  },
  "Riscos da eletricidade": {
    situacao: "Um funcionário viu um fio desencapado atrás da máquina e resolveu passar fita isolante com o equipamento ligado. Levou um choque e caiu da escada.",
    dinamica: "Mostre a equipe três fotos ou objetos: um fio descascado, uma tomada derretida e uma extensão emendada. Pergunte o que cada um faria. Combine que a resposta certa é sempre a mesma: não mexer, avisar e isolar. Lição: eletricidade não dá segunda chance.",
  },
  "Trabalho em altura": {
    situacao: "Um eletricista subiu \"só um minutinho\" no forro sem prender o cinto. Escorregou numa telha e caiu de 3 metros.",
    dinamica: "Faça o teste do cinto: um voluntário veste o cinto paraquedista na frente de todos, e a equipe confere cada ponto (fivelas, ajuste nas pernas, argola nas costas). Quem achar um erro fala. Lição: o cinto mal vestido não segura ninguém.",
  },
  "Proteção das mãos": {
    situacao: "Um ajudante segurou uma chapa sem luva porque estava com pressa. A borda cortou dois dedos e ele levou pontos.",
    dinamica: "Teste da luva molhada: um voluntário tenta segurar um copo molhado com luva de pano e depois com luva emborrachada. A equipe percebe a diferença de firmeza. Lição: cada risco pede a luva certa.",
  },
  "Proteção auditiva": {
    situacao: "Um operador trabalhou 15 anos perto de uma prensa sem protetor. Hoje ele pede para a família repetir tudo e não escuta o neto ao telefone.",
    dinamica: "Fale uma frase baixinho para a equipe, de costas, com uma máquina ou um rádio ligado. Depois repita sem barulho. Pergunte quem entendeu nas duas vezes. Lição: a perda auditiva é lenta, não dói e não volta.",
  },
  "Produtos químicos": {
    situacao: "Uma funcionária guardou desengraxante numa garrafa de refrigerante, sem rótulo. Um colega achou que era água e bebeu um gole.",
    dinamica: "Mostre duas embalagens: uma com rótulo e uma garrafa sem nada escrito. Pergunte o que tem dentro de cada uma. Ninguém sabe a segunda. Lição: produto sem rótulo é produto desconhecido; nunca troque de embalagem.",
  },
  "Ergonomia no posto de trabalho": {
    situacao: "Uma operadora passava o turno com o braço esticado para alcançar as peças. Em poucos meses, começou a ter dor no ombro todo dia.",
    dinamica: "Peça para cada um mostrar, com o próprio corpo, a posição em que mais trabalha. A equipe aponta o que força (braço alto, pescoço torto, costas curvadas). Juntos, pensem em uma mudança simples. Lição: o posto se ajusta à pessoa, não o contrário.",
  },
  "Máquinas e equipamentos": {
    situacao: "Um operador tirou a proteção da máquina porque ela \"atrapalhava a limpeza\". Na hora de limpar, a máquina voltou a girar e prendeu a mão dele.",
    dinamica: "Vá até uma máquina do setor (desligada). Peça para a equipe apontar todas as proteções e o botão de emergência. Um voluntário mostra como apertar o botão. Lição: proteção não é enfeite; tirar a proteção é tirar a segurança.",
  },
  "Saúde mental e estresse": {
    situacao: "Um supervisor dormia mal há semanas por causa de problemas em casa. Ficou irritado, distraído e quase bateu a empilhadeira numa coluna.",
    dinamica: "Faça um minuto de respiração em grupo: inspirar contando até 4, segurar até 4, soltar até 6, três vezes. Depois pergunte como cada um se sente numa palavra. Lição: cuidar da cabeça também é segurança, e pedir ajuda é normal.",
  },
  "Assédio no trabalho": {
    situacao: "Uma funcionária nova recebia apelidos e comentários sobre o corpo. Ela parou de falar nas reuniões e pensou em pedir demissão.",
    dinamica: "Leia três frases curtas (uma brincadeira saudável, um apelido ofensivo e um comentário sobre o corpo). A equipe levanta a mão quando achar que passou do limite. Converse sobre as diferenças. Lição: se constrange, não é brincadeira. Mostre o canal para denunciar.",
  },
  "Comunicação de acidentes": {
    situacao: "Um funcionário cortou o dedo e escondeu por medo de levar bronca. A ferida infeccionou e ele precisou se afastar.",
    dinamica: "Simule: um voluntário finge que se machucou. A equipe fala, passo a passo, o que fazer: atender, avisar o líder, registrar. Cronometre. Lição: todo acidente, mesmo pequeno, é comunicado; a CAT protege o trabalhador.",
  },
  "Trânsito interno e empilhadeiras": {
    situacao: "Um pedestre atravessou o galpão olhando o celular, fora da faixa. A empilhadeira vinha de ré e o operador não o viu.",
    dinamica: "Coloque um voluntário sentado como se fosse o operador e outro andando atrás dele. Peça para o \"operador\" dizer quando enxerga o colega sem virar o corpo. A equipe vê o ponto cego. Lição: pedestre na faixa e contato visual com o operador.",
  },
  "Hidratação e calor": {
    situacao: "Num dia quente, um auxiliar trabalhou a manhã toda sem beber água. Na hora do almoço, sentiu tontura e desmaiou.",
    dinamica: "Mostre a \"tabela da cor da urina\" (clara é bom, escura é sinal de alerta) e peça para todos beberem um copo de água juntos ali mesmo. Combine pausas para água. Lição: não espere ter sede para beber água.",
  },
  "Ferramentas manuais": {
    situacao: "Um mecânico usou a chave de fenda como talhadeira. A ponta escapou e furou a mão dele.",
    dinamica: "Espalhe algumas ferramentas, incluindo uma gasta ou quebrada. A equipe separa as que estão boas das que devem ser trocadas e explica por quê. Lição: cada ferramenta para a sua função, e ferramenta ruim vai para troca.",
  },
  "Atenção e pressa": {
    situacao: "Para fechar o pedido antes do horário, uma equipe pulou a conferência. Uma carga mal amarrada caiu do palete no corredor.",
    dinamica: "Peça para a equipe escrever o próprio nome o mais rápido possível com a mão que não usa. Depois, devagar. Compare. Lição: a pressa piora o resultado e aumenta o risco; o tempo \"ganho\" vira prejuízo.",
  },
  "Óculos de proteção": {
    situacao: "Um soldador ajudante ficou olhando a solda sem óculos para \"aprender\". À noite, os olhos arderam como areia e ele não dormiu.",
    dinamica: "Coloque água num borrifador. De longe, borrife na direção de um voluntário que está de óculos (só água, com cuidado). Mostre as gotas na lente. Pergunte: e se fosse limalha? Lição: o óculos protege o que não tem conserto.",
  },
  "Calçado de segurança": {
    situacao: "Um estoquista veio de tênis porque a botina estava molhada. Uma caixa de ferragens caiu no pé e quebrou um dedo.",
    dinamica: "Mostre uma botina com biqueira e bata de leve na ponta com um objeto. Depois mostre um tênis. Peça para a equipe conferir a sola e o estado das próprias botinas. Lição: o pé só tem uma proteção; troque a botina gasta.",
  },
  "Luvas: a certa para cada risco": {
    situacao: "Um funcionário usou luva de pano para manusear um produto de limpeza forte. O líquido atravessou o tecido e queimou a pele.",
    dinamica: "Coloque sobre a mesa três ou quatro tipos de luva (pano, nitrílica, couro, anticorte). Diga um serviço e a equipe escolhe a luva certa. Lição: não existe luva para tudo; leia o CA e a indicação.",
  },
  "Proteção respiratória": {
    situacao: "Um pintor usou a máscara pendurada no pescoço, porque esquentava. No fim do dia, estava com dor de cabeça e enjoo.",
    dinamica: "Faça o teste de vedação: um voluntário coloca a máscara, tampa a entrada com as mãos e puxa o ar. Se a máscara afunda no rosto, está vedada. A equipe testa a sua. Lição: máscara mal ajustada deixa o ar entrar pelos lados.",
  },
  "Uniforme e roupas adequadas": {
    situacao: "Um operador usava uma blusa larga com cordão. O cordão enroscou no eixo da furadeira de bancada e puxou o braço dele.",
    dinamica: "Peça para todos se olharem e acharem algo que pode enroscar ou pegar fogo: manga solta, cordão, anel, pulseira, cabelo solto. Cada um ajusta na hora. Lição: no trabalho, roupa justa e sem adornos.",
  },
  "Cuidar e guardar o EPI": {
    situacao: "Um funcionário deixava o protetor auricular jogado no bolso junto com moedas. O plug ficou sujo e ele teve infecção no ouvido.",
    dinamica: "Peça para cada um mostrar onde guarda o seu EPI agora. A equipe avalia o que está limpo e o que está sujo ou estragado. Combine um lugar certo no setor. Lição: EPI sujo ou estragado não protege.",
  },
  "CA: o documento do EPI": {
    situacao: "Na fiscalização, as luvas do setor estavam com o CA vencido. A empresa foi autuada e as luvas tiveram de ser trocadas no mesmo dia.",
    dinamica: "Entregue alguns EPIs para a equipe procurar o número do CA gravado neles. Quem achar primeiro lê em voz alta. Explique que dá para consultar a validade na internet. Lição: EPI sem CA válido não vale como proteção.",
  },
  "Capacete": {
    situacao: "Um ajudante usava o capacete virado para trás e sem a jugular. Ao se abaixar, o capacete caiu e logo depois uma ferramenta caiu do andaime.",
    dinamica: "Pegue um capacete e mostre a parte de dentro (suspensão). Um voluntário ajusta na cabeça e coloca a jugular. A equipe confere se está firme quando ele se abaixa. Lição: capacete solto na cabeça não protege na hora da queda.",
  },
  "Programa 5S": {
    situacao: "Um técnico levou 20 minutos para achar a chave certa no meio da bagunça da bancada. Na pressa, usou uma ferramenta errada e estragou a peça.",
    dinamica: "Dê 2 minutos para a equipe aplicar o primeiro S numa gaveta ou bancada: separar o que usa do que não usa. Mostre o antes e o depois. Lição: com tudo no lugar, se trabalha mais rápido e com menos risco.",
  },
  "Piso escorregadio": {
    situacao: "Alguém derramou detergente no chão da cozinha e foi buscar o pano. Nesse tempo, uma colega passou carregando uma panela e escorregou.",
    dinamica: "Simule: derrame um pouco de água num canto seguro. Pergunte: quem vê, o que faz primeiro? A equipe responde na ordem: sinalizar, avisar, limpar. Pratique colocando a placa. Lição: viu molhado, sinaliza na hora.",
  },
  "Empilhamento de materiais": {
    situacao: "Caixas foram empilhadas com as mais pesadas em cima. A pilha tombou quando alguém puxou uma caixa de baixo.",
    dinamica: "Com copos plásticos ou caixas vazias, peça para um voluntário montar uma pilha alta e torta, e outro uma pilha baixa, alinhada, com o mais pesado embaixo. Toque nas duas. Lição: pesado embaixo, pilha alinhada e na altura permitida.",
  },
  "Corredores e saídas livres": {
    situacao: "Na hora de um alarme de incêndio, a saída de emergência estava bloqueada por paletes. A equipe teve que voltar e sair pelo outro lado.",
    dinamica: "Caminhe com a equipe até a saída de emergência mais próxima, cronometrando. No caminho, todos apontam o que atrapalharia a passagem. Retirem os obstáculos juntos. Lição: saída de emergência é para estar sempre livre.",
  },
  "Descarte correto de resíduos": {
    situacao: "Uma lâmpada fluorescente quebrada foi jogada no lixo comum. O coletor cortou a mão no saco.",
    dinamica: "Coloque alguns itens (papel, copo plástico, pilha, pano com óleo) e as lixeiras do setor. A equipe decide onde vai cada um. Converse sobre os erros. Lição: descartar certo protege quem vem depois.",
  },
  "Fim de turno organizado": {
    situacao: "O turno da noite deixou uma máquina ligada e sem aviso. O primeiro da manhã foi limpar achando que estava desligada.",
    dinamica: "Monte com a equipe, em 2 minutos, uma lista de 5 coisas que devem estar feitas antes de ir embora (máquina desligada, ferramentas guardadas, piso limpo, recado ao próximo turno...). Cole no setor. Lição: o fim do seu turno é o começo do turno do colega.",
  },
  "Trabalho em pé por muito tempo": {
    situacao: "Uma operadora de caixa ficava em pé a jornada toda, sem tapete nem pausa. No fim do dia, as pernas estavam inchadas e doloridas.",
    dinamica: "Faça com a equipe 1 minuto de exercícios: ficar na ponta dos pés e voltar, mexer os tornozelos, dobrar os joelhos. Pergunte quem sentiu alívio. Lição: alternar a posição e mexer as pernas evita dor e varizes.",
  },
  "Movimentos repetitivos": {
    situacao: "Uma embaladora fazia o mesmo movimento milhares de vezes por dia. Começou com formigamento na mão e acabou afastada com tendinite.",
    dinamica: "Peça para todos abrirem e fecharem a mão bem rápido por 30 segundos. Pergunte como está o antebraço. Depois façam juntos um alongamento de punho. Lição: pausas e rodízio de tarefas protegem os tendões.",
  },
  "Alongamento antes do trabalho": {
    situacao: "Um ajudante de carga chegou atrasado, pulou o aquecimento e já pegou peso. Puxou um músculo das costas na primeira hora.",
    dinamica: "Conduza 3 minutos de alongamento com a equipe: pescoço, ombros, braços, costas e pernas, sem forçar e sem dor. Quem tiver uma lesão faz só o que conseguir. Lição: corpo aquecido se machuca menos.",
  },
  "Empurrar e puxar carrinhos": {
    situacao: "Um funcionário puxava um carrinho pesado andando de costas. Não viu o degrau, caiu e o carrinho passou por cima do pé.",
    dinamica: "Com um carrinho do setor (vazio ou leve), um voluntário mostra puxando de costas e depois empurrando de frente. A equipe compara a visão do caminho e o esforço. Lição: empurre de frente, olhando o caminho, e peça ajuda se pesar.",
  },
  "Uso do celular e postura": {
    situacao: "Um funcionário passava todo intervalo com a cabeça baixa no celular. Começou a ter dor no pescoço que não passava.",
    dinamica: "Peça para todos olharem o celular como fazem sempre. Depois, levantem o aparelho até a altura dos olhos. Pergunte qual posição cansa mais o pescoço. Lição: a cabeça inclinada pesa muito mais para o pescoço.",
  },
  "Plano de abandono": {
    situacao: "No alarme, metade da equipe saiu pela porta errada e a outra metade voltou para pegar a bolsa. Ninguém sabia o ponto de encontro.",
    dinamica: "Pergunte a cada um: por onde você sai e onde é o ponto de encontro? Depois, caminhem juntos até o ponto de encontro e contem as pessoas. Lição: no abandono, não volte por nada e vá direto ao ponto de encontro.",
  },
  "Gás de cozinha (GLP)": {
    situacao: "Uma cozinheira sentiu cheiro de gás e acendeu a luz para procurar o vazamento. Por sorte o gás ainda estava fraco.",
    dinamica: "Simule: alguém diz \"estou sentindo cheiro de gás\". A equipe fala, em ordem, o que fazer: não acender nada, fechar o registro, abrir portas e janelas, sair e chamar ajuda. Mostre onde fica o registro. Lição: com cheiro de gás, nada de faísca.",
  },
  "Brigada de emergência": {
    situacao: "Num desmaio no refeitório, todo mundo ficou olhando e ninguém sabia quem chamar. O brigadista estava a 20 metros e ninguém lembrava quem era.",
    dinamica: "Pergunte: quem são os brigadistas do nosso setor? Peça para eles levantarem a mão. Combine como chamá-los (rádio, telefone, grito combinado). Lição: todos precisam saber quem é a brigada e como acioná-la.",
  },
  "Números de emergência": {
    situacao: "Num acidente, o colega ligou para o número errado e perdeu tempo sendo transferido. A ambulância demorou mais a chegar.",
    dinamica: "Faça um quiz rápido: qual é o número do SAMU (192), dos Bombeiros (193) e da Polícia (190)? Depois, cada um salva os números no celular ali mesmo. Treinem o que falar ao ligar: onde, o que houve, quantas vítimas. Lição: na emergência, cada segundo conta.",
  },
  "Princípio de incêndio": {
    situacao: "Uma lixeira pegou fogo por uma bituca. Um funcionário tentou apagar sozinho com água, quando havia um extintor ao lado e o fogo era de plástico.",
    dinamica: "Narre um início de fogo e pergunte, em ordem: avisar, desligar a energia se for seguro, usar o extintor certo, sair se não controlar. Cada voluntário diz um passo. Lição: só combata se for pequeno e seguro; sua vida vem primeiro.",
  },
  "Sinalização de emergência": {
    situacao: "Com a luz apagada no blecaute, um visitante não achou a saída. A placa estava atrás de uma estante.",
    dinamica: "Peça para a equipe, em 1 minuto, contar quantas placas de saída e de extintor conseguem ver dali. Depois confiram se alguma está escondida ou apagada. Lição: placa escondida é placa que não existe.",
  },
  "Extensões e benjamins": {
    situacao: "Um escritório ligava aquecedor, cafeteira e computador num único benjamim. A tomada esquentou, derreteu e começou a soltar fumaça.",
    dinamica: "Mostre um benjamim e uma extensão do setor. A equipe confere: tem marca do Inmetro? Está aquecida, emendada ou rachada? Quantos aparelhos estão ligados? Lição: tomada sobrecarregada é incêndio esperando para acontecer.",
  },
  "Choque elétrico: como socorrer": {
    situacao: "Ao ver o colega levando choque, um funcionário correu para puxá-lo com as mãos. Também levou o choque.",
    dinamica: "Simule com um voluntário \"preso\" num fio imaginário. A equipe diz o primeiro passo: desligar a energia ou afastar com um objeto seco que não conduz (cabo de vassoura de madeira). Ninguém encosta. Lição: primeiro corte a energia, depois socorra.",
  },
  "Bloqueio e etiquetagem": {
    situacao: "Um mecânico desligou a máquina para a manutenção, mas não colocou cadeado. Outro funcionário, sem saber, ligou de novo.",
    dinamica: "Mostre um cadeado e uma etiqueta de bloqueio. Um voluntário faz o passo a passo em voz alta numa chave ou painel desligado: desligar, bloquear, etiquetar, testar. Lição: quem bloqueia é quem tem a chave; sem cadeado, a máquina não está segura.",
  },
  "Eletricidade e água": {
    situacao: "Uma funcionária lavava o chão da cozinha e espirrou água na tomada baixa do freezer. Houve um estalo e a luz caiu.",
    dinamica: "Peça para a equipe apontar, no setor, as tomadas e equipamentos perto de água ou pia. Combinem o que fazer em cada um (secar as mãos, desligar antes de lavar, proteger a tomada). Lição: água e eletricidade não se misturam.",
  },
  "Quadro elétrico não é armário": {
    situacao: "Em frente ao quadro de luz havia caixas e vassouras. Na hora de desligar a energia num curto, ninguém conseguiu chegar até ele.",
    dinamica: "Vá até o quadro elétrico com a equipe. Todos conferem: está livre na frente, fechado, sinalizado? Retirem o que estiver atrapalhando. Lição: o quadro precisa estar sempre livre para ser desligado na emergência.",
  },
  "Uso correto da escada": {
    situacao: "Um funcionário subiu na escada até o último degrau para alcançar uma lâmpada. Perdeu o equilíbrio e caiu de lado.",
    dinamica: "Abra uma escada do setor. Um voluntário mostra os três pontos de apoio (duas mãos e um pé, ou dois pés e uma mão). A equipe confere os pés de borracha, a trava e os degraus. Lição: nunca suba nos últimos degraus.",
  },
  "Andaimes": {
    situacao: "Um andaime foi montado sem travar as rodas. Quando o pintor se inclinou, a estrutura andou e ele quase caiu.",
    dinamica: "Mostre um andaime (ou uma foto). A equipe procura, em 1 minuto, os pontos de inspeção: base nivelada, rodas travadas, guarda-corpo, piso completo e preso. Lição: andaime só sobe depois de inspecionado.",
  },
  "Inspeção do cinto paraquedista": {
    situacao: "Na hora do resgate num treinamento, o talabarte se rompeu. Estava ressecado e com costura desfiada, e ninguém tinha olhado antes.",
    dinamica: "Passe um cinto de mão em mão. Cada um confere uma parte: fitas, costuras, fivelas, argolas e talabarte. Quem achar defeito mostra a todos. Lição: o cinto é inspecionado antes de cada uso, não só na compra.",
  },
  "Aberturas no piso e bordas": {
    situacao: "A tampa de uma caixa de inspeção foi retirada para o serviço e ficou sem proteção. Um colega distraído pisou no buraco.",
    dinamica: "Pergunte à equipe: onde temos buracos, bordas ou desníveis no nosso local? Andem até um deles e decidam como proteger (tampa, guarda-corpo, sinalização). Lição: abertura no piso sempre fica tampada ou cercada.",
  },
  "Telhados": {
    situacao: "Um ajudante andou sobre uma telha de fibrocimento para alcançar a calha. A telha quebrou e ele caiu dentro do galpão.",
    dinamica: "Mostre um pedaço de telha (ou uma foto) e pergunte: aguenta o peso de uma pessoa? Explique que só se anda sobre tábuas apoiadas na estrutura, com cinto preso na linha de vida. Lição: telha não é piso.",
  },
  "Esmerilhadeira": {
    situacao: "Um serralheiro tirou a capa de proteção da esmerilhadeira para alcançar um canto. O disco estourou e os pedaços voaram.",
    dinamica: "Mostre uma esmerilhadeira desligada e o disco. A equipe confere: tem capa? O disco é para o material certo? Está trincado? A rotação é compatível? Lição: esmerilhadeira só com capa, disco certo e protetor facial.",
  },
  "Facas e utensílios cortantes": {
    situacao: "Uma auxiliar deixou a faca de molho na pia cheia de espuma. A colega foi lavar a louça e cortou a mão.",
    dinamica: "Com uma faca sem fio ou um objeto que simule, mostre o jeito certo de passar a faca (pelo cabo, apoiada na mesa) e de cortar (para longe do corpo). Combinem onde a faca fica guardada. Lição: faca nunca vai para dentro da pia cheia.",
  },
  "Ferramentas elétricas portáteis": {
    situacao: "Uma furadeira com o fio emendado com fita foi usada num dia úmido. O funcionário levou choque ao segurar o corpo da ferramenta.",
    dinamica: "Passe uma ferramenta elétrica (desligada da tomada) para a equipe inspecionar: fio, plugue, carcaça e gatilho. Quem achar problema explica. Lição: ferramenta com defeito sai de uso e vai para o conserto.",
  },
  "Masseira, cilindro e batedeira industrial": {
    situacao: "Um padeiro colocou a mão no cilindro para ajeitar a massa com a máquina ligada. A mão foi puxada para dentro.",
    dinamica: "Vá até a máquina (desligada). A equipe mostra onde ficam a proteção, o sensor e o botão de emergência. Um voluntário aperta o botão e todos confirmam que a máquina não liga com a proteção aberta. Lição: mão na massa só com a máquina parada.",
  },
  "Compressores e ar comprimido": {
    situacao: "Dois colegas brincaram de soprar ar comprimido um no outro. O jato acertou o ouvido de um deles e causou lesão.",
    dinamica: "Mostre a pistola de ar e o manômetro do compressor. Pergunte o que pode acontecer se o ar for apontado para o corpo. Combinem as regras: nunca no corpo, nunca para limpar roupa. Lição: ar comprimido não é brinquedo.",
  },
  "Partes móveis e roupas": {
    situacao: "Uma operadora com cabelo comprido e solto se inclinou sobre a furadeira de coluna. O cabelo enroscou na broca.",
    dinamica: "Peça a um voluntário para girar devagar um lápis entre os dedos perto de um barbante ou fio solto. O fio se enrola rapidamente. Lição: cabelo preso, sem anéis, pulseiras ou mangas soltas perto de partes que giram.",
  },
  "Manutenção só com máquina parada": {
    situacao: "Para não parar a produção, um mecânico tentou desenroscar uma peça com a esteira andando. A luva foi puxada junto com os dedos.",
    dinamica: "Pergunte: quantos segundos uma máquina leva para puxar uma mão? Bata palmas uma vez: é mais ou menos esse tempo. Depois, revise os passos: parar, bloquear, esperar parar tudo, testar. Lição: nenhuma produção vale um dedo.",
  },
  "Rotulagem e o símbolo de perigo": {
    situacao: "Um funcionário novo não sabia o que significava o desenho de chama no frasco e guardou o produto perto do fogão.",
    dinamica: "Mostre os símbolos de perigo impressos (chama, caveira, corrosão, exclamação). A equipe adivinha o que cada um quer dizer. Depois, procurem esses símbolos nos produtos do setor. Lição: o rótulo conta o perigo antes de você abrir.",
  },
  "Ficha de segurança (FDS)": {
    situacao: "Num respingo de produto no rosto, ninguém sabia se devia lavar com água ou não. A ficha de segurança estava na pasta, mas ninguém sabia onde.",
    dinamica: "Mostre onde ficam as FDS do setor. Entregue a ficha de um produto e peça a um voluntário que ache, em 1 minuto, o que fazer em caso de contato com os olhos. Lição: a FDS diz o que fazer antes de precisar.",
  },
  "Vazamento de produto": {
    situacao: "Um galão de produto caiu e vazou no estoque. O funcionário jogou água para limpar e o produto espalhou até o ralo.",
    dinamica: "Simule com água num balde: \"vazou produto\". A equipe fala os passos: afastar as pessoas, usar o EPI, conter com material absorvente, avisar o responsável. Mostre o kit de emergência, se houver. Lição: vazamento se contém, não se espalha.",
  },
  "Produtos de limpeza": {
    situacao: "Para limpar melhor o banheiro, uma funcionária misturou água sanitária com outro produto. O cheiro forte deu falta de ar.",
    dinamica: "Mostre dois produtos de limpeza do setor e pergunte: pode misturar? Leiam juntos o rótulo. Combine a regra: nunca misturar e sempre usar luva. Lição: misturar produtos pode soltar gases tóxicos.",
  },
  "Armazenamento de químicos": {
    situacao: "Produtos ácidos e alcalinos ficavam na mesma prateleira. Uma embalagem vazou na outra e as duas reagiram, soltando fumaça.",
    dinamica: "Vá até o local onde ficam os produtos. A equipe confere: estão rotulados, tampados, separados, longe do calor e de alimentos? Arrumem juntos o que estiver errado. Lição: cada produto no seu lugar, longe dos incompatíveis.",
  },
  "Sono e segurança": {
    situacao: "Um motorista dormiu só três horas antes de uma viagem. Cochilou ao volante por um segundo e saiu da pista.",
    dinamica: "Pergunte, levantando a mão: quem dormiu menos de 6 horas esta noite? Converse sem julgar. Façam juntos o teste: fechar os olhos e ficar num pé só por 10 segundos. Quem está cansado perde o equilíbrio mais rápido. Lição: sono é parte da segurança.",
  },
  "Alimentação e energia": {
    situacao: "Um funcionário pulava o café da manhã e o almoço para sair mais cedo. No meio da tarde teve uma tontura em cima da escada.",
    dinamica: "Faça uma enquete: quem tomou café da manhã hoje? Peça a cada um para citar um lanche rápido e saudável que dá para levar. Lição: corpo sem energia perde atenção e força.",
  },
  "Álcool, drogas e trabalho": {
    situacao: "Um operador voltou do almoço depois de beber \"só uma\". À tarde, errou a manobra da empilhadeira e derrubou um palete.",
    dinamica: "Peça a um voluntário para andar em linha reta olhando para cima, girando antes 5 vezes no lugar (com cuidado, longe de obstáculos). A equipe vê como o equilíbrio muda. Converse sobre reflexo e julgamento. Lição: álcool e drogas tiram o controle; e existe ajuda sem julgamento.",
  },
  "Exames ocupacionais": {
    situacao: "Um funcionário faltou ao exame periódico porque \"estava se sentindo bem\". Meses depois, descobriu uma perda auditiva que já estava avançada.",
    dinamica: "Pergunte quem sabe quando vence o próprio exame. Mostre onde essa data aparece (ASO ou sistema). Converse sobre o que cada exame procura. Lição: o exame acha o problema antes de ele virar doença.",
  },
  "Vacinação": {
    situacao: "Um ajudante de obra pisou num prego enferrujado. Não sabia se a vacina do tétano estava em dia e teve que correr para o posto.",
    dinamica: "Pergunte: quem lembra quando tomou a última vacina de tétano? Mostre como ver a carteira de vacinação (papel ou aplicativo do SUS). Combine que cada um vai conferir. Lição: vacina em dia é proteção que não ocupa espaço.",
  },
  "Proteção contra o sol": {
    situacao: "Um trabalhador de campo nunca usava chapéu nem protetor solar. Depois de anos, apareceu uma ferida no rosto que não cicatrizava.",
    dinamica: "Peça para a equipe mostrar as partes do corpo mais expostas ao sol durante o trabalho (rosto, nuca, orelhas, braços). Mostre como aplicar o protetor e como usar o chapéu com abas. Lição: sol do dia a dia também queima e se acumula.",
  },
  "Cuidado com a voz": {
    situacao: "Uma atendente gritava o dia inteiro para ser ouvida no barulho. Em poucos meses ficou rouca e precisou de tratamento.",
    dinamica: "Peça para todos falarem uma frase como se estivessem em local barulhento e depois com voz normal, mais perto. Converse sobre beber água, fazer pausas e usar sinais. Lição: a voz é ferramenta de trabalho e se cansa.",
  },
  "Cuidar da coluna fora do trabalho": {
    situacao: "Um funcionário que tomava todo cuidado no trabalho machucou as costas no fim de semana levantando um saco de cimento em casa.",
    dinamica: "Peça para cada um contar uma atividade de casa que força a coluna (pegar criança, carregar compras, lavar roupa). A equipe sugere o jeito certo de fazer. Lição: a coluna é a mesma no trabalho e em casa.",
  },
  "Direito de recusa": {
    situacao: "Um eletricista recebeu ordem de trabalhar num painel energizado sem o EPI certo. Ficou com medo de falar e quase sofreu um acidente.",
    dinamica: "Faça uma encenação: um voluntário é o líder que pede um serviço arriscado, outro é o trabalhador que recusa com calma e explica o risco. A equipe ajuda nas palavras. Lição: diante de risco grave, o trabalhador pode recusar e deve avisar.",
  },
  "Excesso de confiança": {
    situacao: "Um operador com 20 anos de casa sempre fazia o serviço \"de olho fechado\". Num dia diferente, a peça estava mal presa e ele não conferiu.",
    dinamica: "Pergunte: qual tarefa você faz tão automaticamente que nem pensa mais? Peça a 3 pessoas que descrevam o passo a passo dessa tarefa. Quase sempre alguém esquece um passo de segurança. Lição: experiência ajuda, mas não substitui a atenção.",
  },
  "Atalhos perigosos": {
    situacao: "Para não dar a volta, um funcionário pulou a esteira parada. Escorregou e bateu o joelho na estrutura.",
    dinamica: "Peça para a equipe citar, sem dar nomes, atalhos que já viu no setor (pular, passar por baixo, subir em caixa). Para cada um, perguntem: quanto tempo economiza? E o que pode acontecer? Lição: o atalho economiza segundos e pode custar muito.",
  },
  "Cuidar do colega": {
    situacao: "Um funcionário viu o colega trabalhando sem óculos e não falou nada \"para não parecer chato\". Uma hora depois, o colega levou uma lasca no olho.",
    dinamica: "Treinem frases para alertar o colega com respeito. Um voluntário faz algo errado de mentira e outro alerta: \"Ei, posso te dar um toque? Coloca o óculos que eu te espero.\" Lição: cuidar do colega não é dedurar; é ser parceiro.",
  },
  "Percepção de risco": {
    situacao: "Num setor onde todos passavam por baixo de uma carga suspensa todo dia, ninguém mais via isso como perigo. Até o dia em que a cinta arrebentou.",
    dinamica: "Mostre uma foto de um local de trabalho (pode ser do próprio setor). Dê 1 minuto para cada um contar quantos riscos enxerga. Compare os números. Lição: quanto mais a gente se acostuma, menos enxerga o risco.",
  },
  "Brincadeiras no trabalho": {
    situacao: "Num empurrão de brincadeira, um funcionário caiu sobre uma bancada e cortou a cabeça.",
    dinamica: "Pergunte à equipe: qual brincadeira é boa para o clima e qual pode machucar? Separem em duas colunas num papel. Lição: alegria é bem-vinda; brincadeira com empurrão, ar comprimido ou máquina, nunca.",
  },
  "Sinalização de segurança": {
    situacao: "Um funcionário entrou na área pintada de amarelo onde a empilhadeira manobrava. Achava que a faixa era só decoração.",
    dinamica: "Mostre placas e cores (vermelho, amarelo, verde, azul). A equipe diz o que cada cor significa e procura exemplos no setor. Lição: sinalização é uma regra escrita no chão e na parede.",
  },
  "Mudanças no trabalho": {
    situacao: "Uma máquina foi trocada por um modelo novo, e ninguém explicou que o botão de emergência mudou de lugar. Na hora da urgência, o operador procurou no lugar antigo.",
    dinamica: "Pergunte: o que mudou no nosso setor no último mês (máquina, layout, produto, pessoas)? Para cada mudança, a equipe diz que risco novo pode ter surgido. Lição: toda mudança pede uma nova olhada nos riscos.",
  },
  "Direção defensiva": {
    situacao: "Um motorista da empresa seguia colado no caminhão da frente. Quando o caminhão freou de repente, não houve tempo de parar.",
    dinamica: "Ensine a regra dos 2 segundos: escolha um poste, conte \"mil e um, mil e dois\" quando o carro da frente passar por ele. Treinem em voz alta. Lição: distância é o que dá tempo de reagir.",
  },
  "Motociclistas": {
    situacao: "Um entregador seguia pelo corredor entre os carros com pressa. Um carro trocou de faixa sem sinalizar e o derrubou.",
    dinamica: "Peça para os motociclistas da equipe mostrarem o seu equipamento (capacete, jaqueta, luvas, botas). Os colegas avaliam o estado. Conversem sobre ser visto (farol aceso, roupa clara). Lição: na moto, o corpo é o para-choque.",
  },
  "Carga e descarga de caminhões": {
    situacao: "Um caminhão saiu da doca enquanto a empilhadeira ainda estava dentro da carroceria. A empilhadeira caiu.",
    dinamica: "Simule a comunicação entre o motorista e o operador: um voluntário é o motorista, outro é o conferente. Combinem o sinal de \"pode sair\" e a regra das rodas calçadas. Lição: caminhão só sai com o sinal combinado e a área livre.",
  },
  "Acidente de trajeto": {
    situacao: "Um funcionário saiu correndo do turno, atravessou fora da faixa para pegar o ônibus e foi atropelado.",
    dinamica: "Peça para cada um contar, em uma frase, o maior risco no seu caminho para o trabalho. A equipe sugere uma solução para cada. Lição: o caminho de casa também faz parte do cuidado.",
  },
  "Ponto cego dos veículos": {
    situacao: "Um ajudante ficou atrás do caminhão manobrando para ajudar, mas fora do espelho. O motorista não o viu e deu ré.",
    dinamica: "Se houver um veículo parado, peça a um voluntário para sentar no lugar do motorista e outros para andarem ao redor. O \"motorista\" diz quando vê cada um. Marquem os pontos cegos no chão. Lição: se você não vê o motorista no espelho, ele não vê você.",
  },
  "O que é espaço confinado": {
    situacao: "Um funcionário entrou num tanque vazio \"só para pegar uma ferramenta\". O ar lá dentro não tinha oxigênio suficiente e ele desmaiou.",
    dinamica: "Mostre fotos de locais (caixa d'água, poço, tanque, silo, galeria) e a equipe decide se é espaço confinado. Depois, listem os do nosso local. Lição: espaço confinado só com permissão, medição e vigia.",
  },
  "Resgate em espaço confinado": {
    situacao: "Um trabalhador caiu desmaiado dentro de um poço. O colega desceu para ajudar e também desmaiou. Muitas vítimas são os próprios socorristas.",
    dinamica: "Pergunte: se o colega cair lá dentro, você entra? Encene com um voluntário como vigia: ele não entra, chama o resgate e usa o tripé ou a corda. Lição: sem equipamento e treinamento, quem entra vira a próxima vítima.",
  },
  "Medição da atmosfera": {
    situacao: "A medição foi feita só na boca do tanque. Lá no fundo, o gás estava acumulado e o trabalhador passou mal.",
    dinamica: "Mostre o medidor de gases (ou uma foto) e explique os quatro valores: oxigênio, inflamável, monóxido de carbono e gás sulfídrico. A equipe diz por que medir em cima, no meio e embaixo. Lição: o ar que não se vê é o que mata.",
  },
  "Economia de água": {
    situacao: "Uma torneira pingando no vestiário desperdiçou milhares de litros num mês. Ninguém avisou porque \"não era da conta\".",
    dinamica: "Peça para cada um citar um lugar onde vê desperdício de água no trabalho. Anote e escolham um para resolver esta semana. Lição: economizar água é responsabilidade de todos.",
  },
  "Economia de energia": {
    situacao: "As luzes e o ar-condicionado de uma sala ficavam ligados a noite toda. Ninguém se sentia responsável por desligar.",
    dinamica: "Façam uma volta rápida no setor e contem as luzes, telas e máquinas ligadas sem uso. Combinem quem desliga o quê no fim do turno. Lição: energia desperdiçada é dinheiro e recurso jogado fora.",
  },
  "Óleo usado de cozinha": {
    situacao: "O óleo de fritura era jogado no ralo da pia. Em poucos meses, o esgoto entupiu e a cozinha teve de parar para o conserto.",
    dinamica: "Mostre um pote fechado para guardar óleo usado. Perguntem: onde está o nosso? Para onde vai? Combinem o caminho certo (pote, coleta, reciclagem). Lição: óleo no ralo entope e polui a água.",
  },
  "Coleta seletiva": {
    situacao: "Na lixeira de recicláveis havia restos de comida. Todo o material foi para o lixo comum e o esforço dos outros foi perdido.",
    dinamica: "Faça um jogo rápido: diga um item (casca de fruta, garrafa PET, papel engordurado, lata) e a equipe aponta a cor da lixeira. Lição: separar certo é o que faz a reciclagem acontecer.",
  },
  "Queimaduras": {
    situacao: "Uma cozinheira queimou o braço no forno e passou pasta de dente, como tinha ouvido falar. A queimadura piorou.",
    dinamica: "Faça um verdadeiro ou falso: pasta de dente, manteiga, gelo, água corrente fria. A equipe responde levantando a mão. Depois, mostre o certo: água corrente fria por vários minutos e cobrir com pano limpo. Lição: na queimadura, só água fria corrente.",
  },
  "Cortes e sangramentos": {
    situacao: "Um funcionário cortou a mão e o colega ficou sem saber o que fazer, procurando o kit de primeiros socorros que ninguém sabia onde estava.",
    dinamica: "Mostre onde fica o kit de primeiros socorros. Com um pano limpo, um voluntário simula a compressão sobre um \"corte\" no braço do colega, de luva. Lição: comprimir com pano limpo, elevar o membro e chamar ajuda.",
  },
  "Desmaio": {
    situacao: "Um trabalhador desmaiou no calor e os colegas o colocaram sentado e jogaram água no rosto. Ele desmaiou de novo.",
    dinamica: "Com um voluntário deitado no chão (num lugar limpo), mostre a posição certa: deitado de costas, pernas elevadas, roupa afrouxada e ambiente arejado. A equipe repete. Lição: desmaiou, deita e eleva as pernas; não dê nada para beber.",
  },
  "Engasgo": {
    situacao: "No refeitório, um funcionário engasgou com um pedaço de carne. Os colegas davam tapas nas costas e ele continuava sem ar.",
    dinamica: "Mostre a manobra de Heimlich com um voluntário, só a posição das mãos, sem fazer força: atrás da pessoa, punho fechado acima do umbigo, a outra mão por cima. A equipe treina em duplas a posição. Lição: pessoa engasgada que não fala nem tosse precisa da manobra.",
  },
  "Parada cardíaca": {
    situacao: "Um funcionário caiu no pátio sem respirar. Ninguém começou a massagem até a ambulância chegar, 15 minutos depois.",
    dinamica: "Mostre o ritmo das compressões no peito: forte e rápido, cerca de 100 a 120 por minuto (no ritmo de uma música animada). A equipe bate palmas nesse ritmo por 30 segundos. Mostre onde fica o desfibrilador (DEA), se houver. Lição: ligue 192 e comece a massagem.",
  },
  "Produto químico nos olhos": {
    situacao: "Um respingo de produto de limpeza atingiu o olho de uma auxiliar. Ela esfregou com a mão e piorou.",
    dinamica: "Caminhem até o lava-olhos ou à pia mais próxima. Cronometrem quanto tempo leva. Um voluntário mostra como manter o olho aberto debaixo da água. Lição: lavar com bastante água corrente por pelo menos 15 minutos e procurar atendimento.",
  },
  "Picadas de animais peçonhentos": {
    situacao: "Um jardineiro calçou a bota sem olhar e foi picado por um escorpião que estava dentro dela.",
    dinamica: "Peça para cada um contar onde já viu escorpião, aranha ou cobra no trabalho. Mostre o hábito: sacudir botas e luvas antes de vestir e não colocar a mão em buracos. Lição: em caso de picada, lavar, manter a pessoa calma e procurar atendimento logo.",
  },
  "Postura no computador": {
    situacao: "Uma analista trabalhava com o notebook baixo, na mesa da cozinha. Em um mês, tinha dor no pescoço e nas costas todo dia.",
    dinamica: "Peça para cada um ajustar o próprio posto agora: topo da tela na altura dos olhos, braços apoiados, pés no chão, costas no encosto. Os colegas conferem em duplas. Lição: o posto ajustado evita dor que aparece aos poucos.",
  },
  "Descanso dos olhos": {
    situacao: "Um funcionário passava 8 horas olhando para a tela sem pausa. No fim do dia, tinha olhos ardendo e dor de cabeça.",
    dinamica: "Façam juntos a regra 20-20-20: a cada 20 minutos, olhar para algo a 6 metros (20 pés) por 20 segundos. Pratiquem agora olhando pela janela ou para o fundo da sala. Lição: os olhos também precisam de pausa.",
  },
  "Cadeiras e tropeços no escritório": {
    situacao: "Uma funcionária subiu numa cadeira com rodinhas para pegar uma pasta no alto. A cadeira girou e ela caiu.",
    dinamica: "Peça para a equipe apontar riscos no escritório em 1 minuto: fios no chão, gavetas abertas, cadeira com rodinha usada como escada. Arrumem um deles na hora. Lição: escritório também tem acidente.",
  },
  "Atendimento a clientes difíceis": {
    situacao: "Uma atendente foi xingada por um cliente e respondeu no mesmo tom. A discussão quase virou agressão.",
    dinamica: "Encenação: um voluntário é o cliente irritado (sem exagero) e outro é o atendente. O atendente pratica ouvir, falar baixo e chamar o líder se precisar. A equipe dá dicas. Lição: manter a calma protege você; e ninguém precisa aceitar agressão.",
  },
  "Escavações e valas": {
    situacao: "Um trabalhador desceu numa vala de 2 metros sem escoramento para ajeitar um cano. A parede desmoronou sobre as pernas dele.",
    dinamica: "Com um pouco de terra ou areia num balde, faça um \"barranco\" e jogue água ao lado. A equipe vê como desmorona. Converse sobre escoramento, distância da terra retirada e escada para sair. Lição: vala funda sem escora pode virar armadilha.",
  },
  "Movimentação de cargas com guindaste ou talha": {
    situacao: "Um ajudante guiou a carga suspensa com as mãos, ficando embaixo dela. A cinta escorregou e a carga desceu de lado.",
    dinamica: "Mostre os sinais de mão para o operador (levantar, abaixar, parar). A equipe repete com um voluntário de \"sinaleiro\". Reforce o uso de cabo guia. Lição: ninguém fica embaixo de carga suspensa.",
  },
  "Solda e corte": {
    situacao: "Faíscas da solda caíram em papelão no andar de baixo. Meia hora depois do serviço, começou um incêndio.",
    dinamica: "Pergunte: o que tem num raio de 10 metros de onde fazemos solda? A equipe lista o que pode pegar fogo. Combinem a vigia de fogo depois do serviço e o extintor ao lado. Lição: o fogo da solda pode aparecer depois que o serviço acaba.",
  },
  "Perfuração de paredes": {
    situacao: "Um montador furou a parede para fixar uma prateleira e atingiu um cano de água e um fio que passavam ali.",
    dinamica: "Mostre a planta ou peça para a equipe adivinhar por onde passam fios e canos numa parede do setor (perto de tomadas, interruptores e pias). Lição: antes de furar, confira por onde passam canos e fios e use óculos e máscara.",
  },
  "Poeira de sílica": {
    situacao: "Um pedreiro cortava pisos a seco por anos, sem máscara. Hoje tem silicose e cansa ao subir uma escada.",
    dinamica: "Bata um pano com pó de giz ou farinha à luz do sol ou de uma lanterna. A equipe vê o tanto de poeira no ar que normalmente não se vê. Converse sobre corte úmido, aspiração e máscara certa. Lição: a poeira fina entra no pulmão e não sai mais.",
  },
  "Fornos e superfícies quentes": {
    situacao: "Um padeiro pegou a forma no forno com um pano úmido. O calor atravessou o pano e queimou a palma da mão.",
    dinamica: "Mostre uma luva térmica e um pano úmido. Pergunte qual protege melhor e por quê. Combinem o aviso \"quente!\" ao passar com bandejas. Lição: pano úmido conduz calor; use luva térmica seca.",
  },
  "Fritura e óleo quente": {
    situacao: "Uma cozinheira jogou água numa frigideira com óleo pegando fogo. As chamas subiram até o teto.",
    dinamica: "Pergunte: o que fazer se o óleo pegar fogo? Mostre o certo com uma panela vazia: desligar o fogo e abafar com a tampa ou um pano úmido bem torcido; nunca jogar água. Mostre o extintor classe K, se houver. Lição: óleo em chamas se abafa, nunca se molha.",
  },
  "Câmara fria": {
    situacao: "Um repositor entrou na câmara fria sem avisar ninguém. A porta fechou e o botão de abertura por dentro estava quebrado.",
    dinamica: "Vá até a câmara fria e mostre o dispositivo de abertura interna e o alarme. Um voluntário testa. Combine a regra de avisar antes de entrar e usar a roupa térmica. Lição: ninguém entra na câmara fria sem alguém saber.",
  },
  "Higiene das mãos": {
    situacao: "Um surto de diarreia atingiu metade da equipe da cozinha depois de um funcionário não lavar as mãos ao sair do banheiro.",
    dinamica: "Passe um pouco de tinta guache ou creme nas mãos de um voluntário (como se fosse sujeira) e peça que ele lave com os olhos fechados. A equipe vê onde ficou sujo (entre os dedos, unhas, punhos). Lição: lavar direito leva 20 a 30 segundos.",
  },
  "Fatiadores e processadores": {
    situacao: "Uma atendente empurrou o frio no fatiador com a mão, sem o empurrador, para terminar o último pedaço. Cortou a ponta do dedo.",
    dinamica: "Mostre o fatiador desligado da tomada e o empurrador. Um voluntário mostra o jeito certo de usar e de limpar (desligado da tomada, com luva anticorte). Lição: o último pedaço vai com empurrador; o dedo não.",
  },
  "Agrotóxicos": {
    situacao: "Um trabalhador rural aplicou veneno sem roupa de proteção e comeu sem lavar as mãos. Passou mal com tontura e vômito no mesmo dia.",
    dinamica: "Mostre a roupa de proteção completa (ou uma foto) e peça para a equipe dizer a ordem certa de vestir e de tirar. Converse sobre lavar a roupa separada. Lição: o veneno entra pela pele, pela boca e pelo nariz.",
  },
  "Tratores e implementos": {
    situacao: "Um trabalhador pegou carona no para-lama do trator. Num buraco, foi jogado para fora e quase foi atingido pela roda.",
    dinamica: "Perto de um trator parado, a equipe aponta os riscos: tomada de força sem proteção, carona, ponto cego, capotamento. Mostrem onde fica a estrutura de proteção e o cinto. Lição: trator leva só o operador, com cinto.",
  },
  "Ferramentas de corte no campo": {
    situacao: "Um trabalhador usava o facão com o cabo solto. Num golpe, a lâmina escapou e cortou a perna dele.",
    dinamica: "Passe um facão ou foice (com a lâmina protegida) para a equipe conferir o cabo, a bainha e o afiado. Mostre a distância segura entre colegas. Lição: ferramenta de corte em bom estado, guardada na bainha e com perneira.",
  },
  "Calor no campo": {
    situacao: "Na colheita, sob sol forte, um trabalhador ficou confuso e parou de suar. Era sinal de insolação, e ele precisou ser levado ao hospital.",
    dinamica: "Mostre os sinais de alerta do calor (tontura, dor de cabeça, pele quente e seca, confusão). A equipe combina um \"parceiro de olho\" para cada um e onde fica a sombra e a água. Lição: no calor, um cuida do outro.",
  },
  "Diversidade e respeito": {
    situacao: "Um funcionário novo, de outro estado, era imitado pelo sotaque. Ele começou a evitar falar e a se isolar da equipe.",
    dinamica: "Peça para cada um contar uma coisa da sua origem ou da sua vida que poucos sabem. Mostre como a equipe é diferente e se completa. Lição: respeito é tratar o outro como ele quer ser tratado.",
  },
  "Comunicação clara": {
    situacao: "O líder pediu para \"desligar a máquina do canto\". O funcionário desligou a errada e o colega continuou a manutenção na que estava ligada.",
    dinamica: "Telefone sem fio: passe uma instrução de segurança no ouvido de um para o outro. Compare o que chegou ao último com a frase original. Lição: na segurança, repita e confirme a instrução.",
  },
  "Conflitos no trabalho": {
    situacao: "Dois colegas brigados pararam de se falar. Um deixou de avisar o outro que a peça estava solta, e o problema virou acidente.",
    dinamica: "Encenação curta: dois voluntários discordam sobre a organização da bancada. A equipe sugere como resolver: ouvir, falar do problema e não da pessoa, chamar o líder se precisar. Lição: briga mal resolvida também é risco.",
  },
  "Integração de novatos": {
    situacao: "Um funcionário novo foi colocado na máquina no primeiro dia sem ninguém mostrar o botão de emergência. Ficou com vergonha de perguntar.",
    dinamica: "Peça para os mais antigos lembrarem como foi o primeiro dia deles. Combinem um \"padrinho\" para o próximo novato e três coisas que todo novato precisa saber no primeiro dia. Lição: quem chega não sabe os riscos que já não vemos.",
  },
  "Ansiedade e pedido de ajuda": {
    situacao: "Uma funcionária tinha crises de ansiedade e escondia de todos. Um dia passou mal no trabalho e os colegas acharam que era um problema no coração.",
    dinamica: "Mostre a técnica 5-4-3-2-1: diga 5 coisas que você vê, 4 que toca, 3 que ouve, 2 que cheira e 1 que sente o gosto. Façam juntos. Diga onde a pessoa pode buscar ajuda (líder, RH, CAPS, CVV 188). Lição: pedir ajuda é coragem.",
  },
  "Pausas que recarregam": {
    situacao: "Uma equipe passou a usar o intervalo só no celular, sem levantar. No fim do turno, todos estavam mais cansados e com mais erros.",
    dinamica: "Façam uma pausa ativa de 2 minutos agora: levantar, andar, alongar e respirar fundo. Depois perguntem como se sentem. Lição: a pausa bem feita devolve atenção.",
  },
  "Cansaço e jornada longa": {
    situacao: "Depois de dobrar o turno, um operador errou a regulagem da máquina e só percebeu quando a peça foi lançada.",
    dinamica: "Pergunte, sem julgar: quem está fazendo hora extra demais? Conversem sobre os sinais de cansaço (bocejo, irritação, erro bobo). Combinem avisar o líder quando estiver no limite. Lição: cansaço é risco, não falta de vontade.",
  },
  "Doenças transmissíveis no trabalho": {
    situacao: "Um funcionário veio trabalhar com gripe forte para \"não faltar\". Na semana seguinte, metade do setor estava doente.",
    dinamica: "Passe um pouco de purpurina ou talco na mão de um voluntário e peça que ele cumprimente três colegas. Vejam até onde chegou. Lição: lavar as mãos, cobrir a tosse e não compartilhar copo.",
  },
  "Ruído: você está exposto?": {
    situacao: "Um funcionário achava que o barulho do setor era normal porque \"se acostumou\". Na audiometria, já aparecia perda auditiva.",
    dinamica: "Teste do braço: dois colegas ficam a um braço de distância e conversam normalmente. Se precisarem gritar para se ouvir, o ruído está alto. Façam o teste em pontos do setor. Lição: se precisa gritar, precisa de protetor.",
  },
  "Como colocar o protetor tipo plug": {
    situacao: "Um operador usava o plug só na entrada do ouvido, quase caindo. Achava que estava protegido, mas o ruído passava.",
    dinamica: "Distribua plugs de espuma. Mostre: enrolar bem fino, puxar a orelha para cima e para trás, colocar e segurar uns segundos até expandir. Todos fazem juntos. Fale algo e veja a diferença. Lição: plug mal colocado não protege.",
  },
  "Vibração em mãos e braços": {
    situacao: "Um operador de martelete usava a ferramenta horas a fio. Começou a sentir os dedos brancos e dormentes no frio.",
    dinamica: "Peça a um voluntário que segure firme um celular vibrando por 30 segundos e diga o que sentiu. Converse sobre pausas, rodízio e ferramentas com antivibração. Lição: a vibração cansa os nervos e os vasos das mãos.",
  },
  "Calor intenso no ambiente": {
    situacao: "Na lavanderia, sem ventilação, uma funcionária teve câimbras e tontura na hora mais quente do dia.",
    dinamica: "Peça para a equipe apontar os pontos mais quentes do setor e o que pode ajudar (ventilação, pausa, água fresca, revezamento). Combinem uma regra de pausa para os dias mais quentes. Lição: calor demais é risco, não frescura.",
  },
  "Choque térmico": {
    situacao: "Um repositor saía da câmara fria direto para a frente do forno, várias vezes ao dia, sem roupa adequada. Passou a ter resfriados e dores constantes.",
    dinamica: "Pergunte quem passa por ambientes muito quentes e muito frios no mesmo turno. Combinem uma pausa de transição e o uso da roupa certa. Lição: o corpo precisa de tempo para se adaptar à mudança de temperatura.",
  },
  "Extintor certo para cada fogo": {
    situacao: "No fogo de um painel elétrico, alguém usou o extintor de água. Levou choque e o fogo continuou.",
    dinamica: "Faça um jogo: mostre as letras A, B, C e K. Diga um tipo de fogo (papel, gasolina, painel elétrico, óleo de cozinha) e a equipe aponta a classe e o extintor certo. Confiram os extintores do setor. Lição: extintor errado pode piorar o fogo.",
  },
  "Simulado de abandono": {
    situacao: "No primeiro simulado, a equipe levou 12 minutos para sair. Pessoas voltaram para pegar o celular e ninguém contou quem faltava.",
    dinamica: "Combine agora um mini simulado: ao sinal, todos caminham até o ponto de encontro sem correr. Cronometre e contem as pessoas. Depois, conversem sobre o que atrasou. Lição: o simulado mostra os erros antes da emergência real.",
  },
  "Enchentes e temporais": {
    situacao: "Num temporal, um funcionário tentou atravessar a rua alagada para ir embora. A correnteza o derrubou.",
    dinamica: "Pergunte: o que fazer se o pátio alagar? A equipe lista, em ordem: desligar a energia, subir materiais, não atravessar água corrente, ficar em local seguro. Lição: água na altura do joelho já derruba uma pessoa.",
  },
  "Empilhadeira e paleteira": {
    situacao: "Um funcionário sem habilitação usou a empilhadeira \"só para tirar um palete do caminho\". Bateu na estante e derrubou a carga.",
    dinamica: "Mostre a empilhadeira parada e o checklist diário. Um operador habilitado faz o checklist em voz alta: freio, buzina, garfos, pneus, cinto. A equipe acompanha. Lição: empilhadeira só com operador habilitado e checklist feito.",
  },
  "Caldeiras e vasos de pressão": {
    situacao: "A válvula de segurança de um vaso de pressão estava travada com arame para \"não ficar disparando\". O vaso estourou.",
    dinamica: "Mostre uma panela de pressão e pergunte: o que acontece se travar a válvula? Relacione com os equipamentos do local. Mostre a placa de identificação e o manômetro. Lição: válvula de segurança nunca é travada.",
  },
  "Ferramentas improvisadas": {
    situacao: "Sem martelo por perto, um funcionário usou uma chave de boca para bater num pino. A chave escorregou e quebrou o dedo dele.",
    dinamica: "Peça para cada um contar uma \"gambiarra\" que já viu no trabalho. A equipe avalia o risco de cada uma e a ferramenta certa. Lição: improviso é atalho para o acidente.",
  },
  "Relato de condição insegura": {
    situacao: "Uma lâmpada da escada ficou queimada por semanas. Todos reclamavam, mas ninguém registrou. Um colega caiu no escuro.",
    dinamica: "Mostre como fazer um relato (QR code do Safety Nexo, papel ou falar com o líder). Peça a um voluntário que faça um relato real agora, de algo que ele viu no setor. Lição: falar no corredor não resolve; registrar resolve.",
  },
  "Pare, pense e faça": {
    situacao: "Um funcionário foi trocar uma peça e percebeu que algo estava diferente, mas continuou. A peça estava sob pressão e soltou com força.",
    dinamica: "Escolham uma tarefa comum do setor. A equipe faz em voz alta o \"pare, pense e faça\": o que vou fazer, o que pode dar errado, como evito. Lição: um minuto de pausa antes do serviço evita muita dor.",
  },
  "Distrações no trabalho": {
    situacao: "Um operador respondia mensagens enquanto alimentava a máquina. Olhou para o celular no momento errado e prendeu o dedo.",
    dinamica: "Peça a um voluntário para contar de 1 a 20 em voz alta enquanto escreve o alfabeto. Ele vai errar. Converse sobre fazer duas coisas ao mesmo tempo. Lição: no serviço com risco, atenção total; o celular espera.",
  },
  "Exemplo da liderança": {
    situacao: "O encarregado passava pela área sem capacete \"porque era rapidinho\". Em pouco tempo, a equipe começou a fazer o mesmo.",
    dinamica: "Pergunte à equipe, de forma anônima ou levantando a mão: vocês já viram um líder dando mau exemplo? E bom exemplo? Peça para o líder presente assumir um compromisso em voz alta. Lição: a equipe faz o que vê, não o que ouve.",
  },
  "Armazenamento em prateleiras": {
    situacao: "Caixas pesadas ficavam na prateleira mais alta. Ao puxar uma, ela caiu na cabeça da estoquista.",
    dinamica: "Vá até uma estante do setor. A equipe confere: o pesado está embaixo? A estante está fixada? Tem a carga máxima indicada? Reorganizem uma prateleira juntos. Lição: pesado embaixo, leve em cima, e nada saindo para fora.",
  },
  "Iluminação adequada": {
    situacao: "Com a luz fraca na bancada, um funcionário não viu que a peça estava trincada e montou mesmo assim.",
    dinamica: "Apague parte das luzes e peça para alguém ler um rótulo pequeno. Acenda e repita. Pergunte onde no setor falta luz. Lição: o que não se vê não se evita; avise lâmpada queimada.",
  },
  "Trabalho sentado por muito tempo": {
    situacao: "Um motorista passava horas sentado sem pausa. Começou a ter dor lombar e inchaço nas pernas.",
    dinamica: "Todos ficam de pé por um minuto e fazem: girar os ombros, esticar as costas, andar no lugar. Combinem levantar a cada hora. Lição: o corpo foi feito para se mexer.",
  },
  "Organização do posto de trabalho": {
    situacao: "Uma operadora precisava se esticar e girar o corpo dezenas de vezes por hora para pegar as peças que ficavam atrás dela.",
    dinamica: "Peça para cada um desenhar com o dedo, no ar, a área que alcança sem esticar o braço. Depois, olhem o posto e vejam o que está fora dessa área. Mudem um item de lugar. Lição: o que mais se usa fica mais perto.",
  },
  "Inflamáveis no dia a dia": {
    situacao: "Um funcionário guardava álcool e tíner no carro, ao sol. Ao abrir a porta, sentiu cheiro forte e por sorte nada pegou fogo.",
    dinamica: "Peça para a equipe listar produtos inflamáveis que usa no trabalho e em casa (álcool, gasolina, tíner, spray). Para cada um, digam onde guardar e o que evitar perto. Lição: inflamável longe do calor e da faísca.",
  },
  "Serviços de terceiros": {
    situacao: "Uma empresa terceirizada veio consertar o telhado e ninguém conferiu o treinamento nem o cinto. O trabalhador caiu no primeiro dia.",
    dinamica: "Pergunte: quando chega um terceiro, o que conferimos? A equipe monta em 2 minutos um checklist (documentos, treinamentos, EPI, APR, quem acompanha). Lição: o terceiro trabalha no nosso risco e é responsabilidade de todos.",
  },
  "Canal de denúncia e CIPA": {
    situacao: "Uma funcionária sofria assédio e não sabia que existia um canal sigiloso. Quando descobriu, o problema foi resolvido em poucas semanas.",
    dinamica: "Mostre o canal de denúncia (QR code, telefone ou caixa) e quem são os membros da CIPA. Peça para cada um salvar o contato ou tirar foto do QR. Lição: denunciar com segurança protege você e o colega.",
  },
};
