import type { Metadata } from 'next';
import Link from 'next/link';
import { TextoLegal } from '@/components/TextoLegal';
import { contatoPrivacidade, PLATAFORMA } from '@/lib/plataforma';

export const metadata: Metadata = { title: 'Termos de uso · Safety Nexo' };

export default function Termos() {
  return (
    <TextoLegal titulo="Termos de uso" atualizado="10/11/2026">
      <p>
        Estes termos valem para quem cria uma conta no Safety Nexo. Ao marcar que concorda, no cadastro, você aceita o que está escrito aqui
        e na <Link href="/privacidade" className="font-semibold text-primary hover:underline">política de privacidade</Link>.
      </p>

      <h2>1. O que é o Safety Nexo</h2>
      <p>
        Um sistema para profissionais e consultorias de segurança do trabalho organizarem o atendimento às empresas: cadastro de riscos,
        programas, laudos, ASO, EPI, CIPA, treinamentos, eSocial e o que mais estiver no seu plano.
      </p>

      <h2>2. O sistema ajuda, a responsabilidade técnica é sua</h2>
      <p>
        O Safety Nexo monta documentos a partir do que você cadastra e faz contas com base nas normas. Mas quem avalia os riscos, confere os
        documentos e assina é o profissional habilitado. Revise tudo antes de entregar ao cliente. Normas mudam, e cada empresa tem as suas
        particularidades.
      </p>

      <h2>3. Sua conta</h2>
      <ul>
        <li>Use dados verdadeiros e guarde a sua senha. O que for feito com o seu login é de sua responsabilidade.</li>
        <li>Os logins que você cria para empresas clientes ficam sob a sua gestão.</li>
        <li>Não use o sistema para nada ilegal, nem para tentar entrar em dados de outras contas.</li>
      </ul>

      <h2>4. Planos e pagamento</h2>
      <p>
        Toda conta começa com 14 dias de teste com tudo liberado. Depois, vale o plano escolhido, conforme a página de{' '}
        <Link href="/planos" className="font-semibold text-primary hover:underline">planos</Link>. Sem pagamento, a conta pode voltar para o plano
        grátis ou ser bloqueada, mas os seus dados não são apagados por isso.
      </p>

      <h2>5. Os dados dos trabalhadores (contrato de tratamento de dados)</h2>
      <p>Esta parte funciona como o contrato entre você, que decide sobre os dados (controlador), e o Safety Nexo, que trata os dados por você (operador):</p>
      <ul>
        <li>Só tratamos os dados para fazer o sistema funcionar para você, conforme o que você cadastra e pede.</li>
        <li>Você garante que tem base legal para colocar esses dados no sistema, como a obrigação legal de SST da empresa atendida ou o consentimento do trabalhador, quando for o caso.</li>
        <li>Mantemos os dados em sigilo, com as medidas de segurança descritas na política de privacidade, e só pessoas autorizadas da equipe acessam, quando for preciso para suporte.</li>
        <li>Usamos serviços de terceiros (hospedagem, banco de dados, e-mail) que seguem as mesmas obrigações de sigilo.</li>
        <li>Se acontecer um incidente de segurança com os seus dados, avisamos você assim que soubermos, para que você possa tomar as providências.</li>
        <li>Ajudamos você a atender pedidos de trabalhadores sobre os próprios dados.</li>
        <li>Quando a conta for encerrada, você pode baixar os seus documentos. Depois combinamos o destino do restante, respeitando os prazos que a lei manda guardar.</li>
      </ul>

      <h2>6. Disponibilidade</h2>
      <p>
        Trabalhamos para o sistema ficar no ar o tempo todo, mas pode haver paradas para manutenção ou por falha de serviços de terceiros.
        Guarde cópia dos documentos importantes que você entrega aos clientes.
      </p>

      <h2>7. Mudanças nestes termos</h2>
      <p>Se mudarmos algo importante, avisamos pelo sistema ou por e-mail antes de valer.</p>

      <h2>8. Contato</h2>
      <p>
        Dúvidas sobre estes termos ou sobre os seus dados: {contatoPrivacidade()}.
        {PLATAFORMA.nome !== 'Safety Nexo' && <> Serviço oferecido por {PLATAFORMA.nome}{PLATAFORMA.documento && `, ${PLATAFORMA.documento}`}{PLATAFORMA.cidade && `, ${PLATAFORMA.cidade}`}.</>}
      </p>
    </TextoLegal>
  );
}
