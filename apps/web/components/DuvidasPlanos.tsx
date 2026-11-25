// Dúvidas frequentes: aparecem na página de Planos e na tela de entrada.
// As respostas seguem o que o sistema faz hoje: teste de 14 dias sem cartão (common/plano.ts),
// pagamento em "Meu plano" pelo Asaas (cartão todo mês, Pix Automático ou boleto, pagamentos/pagamentos.ts),
// 5 dias de tolerância e depois só consulta (common/plano.ts), cancelamento volta para o Grátis no fim do mês pago,
// vencimento e vigência mês a mês em "Meu plano" (admin/vigencia.ts) e nada é apagado quando o plano muda (termos, item 4).
// Se alguma dessas regras mudar, ajuste o texto aqui.

type Duvida = { pergunta: string; resposta: React.ReactNode };

const WHATSAPP = (process.env.NEXT_PUBLIC_WHATSAPP_SUPORTE ?? '5562994343838').replace(/\D/g, '');

// Sobre o sistema em si: o que a pessoa pergunta antes de criar a conta.
export const DUVIDAS_SISTEMA: Duvida[] = [
  {
    pergunta: 'Preciso instalar alguma coisa?',
    resposta: (
      <>
        Não. O Safety Nexo abre no navegador, no computador ou no celular. Se quiser, no celular dá para colocar o ícone na tela
        inicial e usar como se fosse um aplicativo.
      </>
    ),
  },
  {
    pergunta: 'Funciona no celular?',
    resposta: (
      <>
        Funciona. Dá para fazer DDS, APR, inspeção, entrega de EPI e lista de presença direto do celular, na frente do trabalhador.
        Os documentos maiores, como PGR e PCMSO, também abrem no celular, mas a maioria das pessoas prefere montar no computador.
      </>
    ),
  },
  {
    pergunta: 'E se eu estiver numa obra ou fazenda sem internet?',
    resposta: (
      <>
        Os registros de campo funcionam sem internet: inspeção, APR, DDS, presença em treinamento e entrega de EPI. O celular guarda tudo
        e envia sozinho quando o sinal voltar.
      </>
    ),
  },
  {
    pergunta: 'Serve para qualquer ramo de empresa?',
    resposta: (
      <>
        Serve. Você informa o CNAE e o sistema puxa o grau de risco e o dimensionamento da CIPA e do SESMT. Já atende indústria,
        construção civil, comércio, clínicas e consultórios, agronegócio, transporte, restaurantes e padarias, escritórios e
        prestadoras de serviço.
      </>
    ),
  },
  {
    pergunta: 'Os documentos saem com a minha logo?',
    resposta: (
      <>
        Saem. A logo da empresa cliente vai no cabeçalho e a da sua consultoria no rodapé, nos planos pagos. No plano Grátis o PDF sai
        com a marca &quot;Versão Teste&quot;.
      </>
    ),
  },
  {
    pergunta: 'Preciso ter CNPJ para criar a conta?',
    resposta: (
      <>
        Não. Para criar a conta basta nome, e-mail e senha. Muita gente que trabalha como autônomo usa o sistema assim. O CNPJ só é
        pedido nas empresas que você atende, porque ele vai nos documentos.
      </>
    ),
  },
  {
    pergunta: 'Meu cliente consegue entrar e ver os documentos dele?',
    resposta: (
      <>
        Consegue. Você cria um login para cada empresa cliente, e ela vê só o que é dela: documentos, vencimentos, DDS, entregas de EPI.
        Ela nunca vê as outras empresas que você atende.
      </>
    ),
  },
  {
    pergunta: 'Os documentos têm assinatura?',
    resposta: (
      <>
        Têm. O trabalhador assina com o dedo na tela, e o sistema guarda a foto, a data e o local. Para quem tem certificado digital A1,
        dá para assinar com ICP-Brasil. Cada PDF sai com um QR code para qualquer pessoa conferir se ele é verdadeiro.
      </>
    ),
  },
  {
    pergunta: 'Ele manda os eventos para o eSocial?',
    resposta: (
      <>
        Manda. Os eventos de SST (S-2210, S-2220, S-2240) saem prontos a partir do que você já preencheu, e podem ser enviados com o
        certificado digital da empresa ou da consultoria. O eSocial entra a partir do plano Essencial.
      </>
    ),
  },
  {
    pergunta: 'Meus dados ficam seguros?',
    resposta: (
      <>
        Ficam. Cada conta só enxerga os próprios dados, as senhas são guardadas embaralhadas e o sistema faz cópia de segurança. O
        tratamento segue a LGPD, e você lê tudo na nossa <a href="/privacidade" className="font-semibold text-primary hover:underline">política de privacidade</a>.
      </>
    ),
  },
  {
    pergunta: 'Nunca usei um sistema assim. Vou conseguir?',
    resposta: (
      <>
        Vai. Cada campo tem um &quot;?&quot; do lado explicando o que preencher, com exemplo. Toda tela tem o botão &quot;Como usar esta
        tela?&quot;. E se travar em alguma coisa, chama a gente no WhatsApp que a gente ajuda.
      </>
    ),
  },
];

// Sobre planos, teste e pagamento.
export const DUVIDAS_PLANOS: Duvida[] = [
  {
    pergunta: 'Preciso de cartão para testar?',
    resposta: (
      <>
        Não. Para criar a conta basta nome, e-mail e senha. Nos primeiros 14 dias você usa todos os recursos do sistema, como no plano
        Profissional, com 1 empresa. Quer testar com mais empresas? Chame a gente no WhatsApp. Quando o teste acaba, a conta passa sozinha para o plano Grátis e nada é cobrado.
      </>
    ),
  },
  {
    pergunta: 'Qual plano devo escolher?',
    resposta: (
      <>
        O que mais pesa é quantas empresas você atende. Se trabalha dentro de uma empresa só, o Start resolve. Se está começando a
        atender clientes, o Essencial cobre até 5. Com uma carteira de até 15 empresas, ou se precisa de entrega de EPI pelo rosto,
        cobrança dos seus clientes e equipe, vá de Profissional. Acima disso, o Ilimitado. Na dúvida, use os 14 dias de teste e veja
        o que você realmente usa no dia a dia.
      </>
    ),
  },
  {
    pergunta: 'Tem fidelidade ou multa?',
    resposta: (
      <>
        Não tem. O plano mensal vale de mês em mês, e você para quando quiser, sem multa.
      </>
    ),
  },
  {
    pergunta: 'Posso cancelar quando quiser?',
    resposta: (
      <>
        Pode. Em <strong>Minha conta › Meu plano</strong> tem o botão para cancelar a cobrança automática. O plano continua valendo
        até o dia que já está pago e depois a conta volta para o Grátis. Ela continua sua, com tudo o que você fez.
      </>
    ),
  },
  {
    pergunta: 'O que acontece com os meus dados se eu cancelar?',
    resposta: (
      <>
        Nada é apagado. Empresas, funcionários e documentos continuam guardados, e você pode baixar o que já gerou. O que fica travado
        são os recursos do plano pago, que voltam assim que você assinar de novo. Se quiser encerrar a conta de vez, a gente combina com
        você o que fazer com os dados, respeitando o tempo que a lei manda guardar.
      </>
    ),
  },
  {
    pergunta: 'Dá para trocar de plano depois?',
    resposta: (
      <>
        Dá, para cima ou para baixo, quando quiser. Entre no sistema, abra <strong>Minha conta › Meu plano</strong> no menu e escolha o novo plano. Se o
        mês atual já está pago, a nova mensalidade começa no dia seguinte ao vencimento, sem pagar duas vezes. Se
        você descer para um plano com menos empresas do que já tem cadastradas, nenhuma é apagada. Você só não consegue cadastrar uma
        nova até ficar dentro do limite.
      </>
    ),
  },
  {
    pergunta: 'Quando acontece a cobrança?',
    resposta: (
      <>
        Só depois que você escolhe o plano em <strong>Meu plano</strong>. A primeira mensalidade vence no mesmo dia e o plano é liberado
        assim que o pagamento cai. Depois disso, a cobrança acontece todo mês no mesmo dia. Nada é cobrado durante o teste. Quer pagar
        o ano de uma vez (2 meses saem de graça)? Chame a gente no WhatsApp.
      </>
    ),
  },
  {
    pergunta: 'Quais as formas de pagamento?',
    resposta: (
      <>
        Cartão de crédito, Pix ou boleto. No cartão, você cadastra uma vez e a mensalidade é cobrada sozinha todo mês. No Pix, ao pagar
        o primeiro, o seu banco oferece o Pix Automático: aceitando, os meses seguintes saem sozinhos da conta, sem precisar lembrar. No
        boleto, a fatura chega por e-mail todo mês e nela também dá para pagar com Pix ou cartão. O pagamento é feito na página segura
        do Asaas, e os dados do cartão não ficam com o Safety Nexo.
      </>
    ),
  },
  {
    pergunta: 'E se o pagamento atrasar?',
    resposta: (
      <>
        Você tem 5 dias de tolerância, com aviso na tela e por e-mail, e tudo funciona normalmente. Depois disso, a conta fica só
        para consulta: você continua vendo e baixando tudo o que já fez, mas não consegue criar nem mudar nada até pagar. Nada é
        apagado. Assim que o pagamento cai, tudo volta a funcionar na hora.
      </>
    ),
  },
  {
    pergunta: 'Como sei quando o meu plano vence?',
    resposta: (
      <>
        Em <strong>Minha conta › Meu plano</strong> aparece a data de vencimento, quantos dias faltam e a vigência de cada mês, de que
        dia a que dia, além dos pagamentos já feitos. Se você paga no Pix ou no boleto, também chega um e-mail 3 dias antes.
      </>
    ),
  },
  {
    pergunta: 'Quantos funcionários posso cadastrar?',
    resposta: (
      <>
        Nos planos pagos, quantos precisar, sem limite. O que muda de um plano para outro é o número de empresas. Só o Grátis fica em
        10 funcionários, porque é para conhecer o sistema.
      </>
    ),
  },
];

export function ListaDuvidas({ duvidas }: { duvidas: Duvida[] }) {
  return (
    <div className="divide-y divide-border overflow-hidden rounded-card border border-border bg-white">
      {duvidas.map((d) => (
        <details key={d.pergunta} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold hover:bg-primary/5 [&::-webkit-details-marker]:hidden">
            <span>{d.pergunta}</span>
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className="h-5 w-5 shrink-0 text-text/50 transition-transform group-open:rotate-180">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
            </svg>
          </summary>
          <p className="px-5 pb-5 text-sm leading-relaxed text-text/75">{d.resposta}</p>
        </details>
      ))}
    </div>
  );
}

export function LinkWhatsApp({ children }: { children: React.ReactNode }) {
  return (
    <a
      href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Olá! Tenho uma dúvida sobre o Safety Nexo.')}`}
      target="_blank"
      rel="noreferrer"
      className="font-semibold text-primary hover:underline"
    >
      {children}
    </a>
  );
}

// Página de Planos: primeiro as dúvidas de plano, depois as do sistema.
export function DuvidasPlanos() {
  return (
    <div>
      <h2 className="text-xl font-semibold">Dúvidas frequentes</h2>
      <h3 className="mt-5 text-sm font-semibold uppercase tracking-wide text-text/60">Planos e pagamento</h3>
      <div className="mt-2"><ListaDuvidas duvidas={DUVIDAS_PLANOS} /></div>
      <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-text/60">Sobre o sistema</h3>
      <div className="mt-2"><ListaDuvidas duvidas={DUVIDAS_SISTEMA} /></div>
      <p className="mt-3 text-sm text-text/60">Ficou outra dúvida? Chame a gente no botão verde do WhatsApp, no canto da tela.</p>
    </div>
  );
}
