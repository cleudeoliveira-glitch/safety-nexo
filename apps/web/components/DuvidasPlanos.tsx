// Dúvidas frequentes da página de Planos.
// As respostas seguem o que o sistema faz hoje: teste de 14 dias sem cartão (common/plano.ts),
// troca de plano pedida em "Meu plano" e liberada à mão no painel ADM, sem cobrança automática
// (admin/meu-plano.controller.ts), e nada é apagado quando o plano muda (termos, item 4).
// Se alguma dessas regras mudar, ajuste o texto aqui.
const DUVIDAS: { pergunta: string; resposta: React.ReactNode }[] = [
  {
    pergunta: 'Preciso de cartão para testar?',
    resposta: (
      <>
        Não. Para criar a conta basta nome, e-mail e senha. Nos primeiros 14 dias você usa o sistema com tudo liberado, como no plano
        Profissional. Quando o teste acaba, a conta passa sozinha para o plano Grátis e nada é cobrado.
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
    pergunta: 'Posso cancelar quando quiser?',
    resposta: (
      <>
        Pode. Não existe cobrança automática, então nada é descontado sem você saber. É só avisar a gente que não vai renovar. A conta
        volta para o plano Grátis e continua sua.
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
        Dá, para cima ou para baixo, quando quiser. Entre no sistema, abra <strong>Meu plano</strong> no menu e peça o novo plano. Se
        você descer para um plano com menos empresas do que já tem cadastradas, nenhuma é apagada. Você só não consegue cadastrar uma
        nova até ficar dentro do limite.
      </>
    ),
  },
  {
    pergunta: 'Quando acontece a cobrança?',
    resposta: (
      <>
        Só depois que você pede o plano. Quando o pedido chega pelo <strong>Meu plano</strong>, a nossa equipe fala com você para
        combinar o pagamento, mensal ou anual (no anual, 2 meses saem de graça), e libera o plano em seguida. Nada é cobrado antes
        disso.
      </>
    ),
  },
];

export function DuvidasPlanos() {
  return (
    <div>
      <h2 className="text-xl font-semibold">Dúvidas frequentes</h2>
      <div className="mt-4 divide-y divide-border overflow-hidden rounded-card border border-border bg-white">
        {DUVIDAS.map((d) => (
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
      <p className="mt-3 text-sm text-text/60">Ficou outra dúvida? Chame a gente no botão verde do WhatsApp, no canto da tela.</p>
    </div>
  );
}
