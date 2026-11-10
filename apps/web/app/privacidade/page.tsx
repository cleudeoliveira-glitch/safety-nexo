import type { Metadata } from 'next';
import { TextoLegal } from '@/components/TextoLegal';
import { contatoPrivacidade, PLATAFORMA } from '@/lib/plataforma';

export const metadata: Metadata = { title: 'Política de privacidade · Safety Nexo' };

export default function Privacidade() {
  return (
    <TextoLegal titulo="Política de privacidade" atualizado="10/11/2026">
      <p>
        O Safety Nexo é usado por profissionais e consultorias de segurança do trabalho para cuidar das empresas que atendem. Por isso ele guarda
        dados de trabalhadores, alguns deles sensíveis, como exames e atestados. Aqui explicamos, sem rodeio, o que guardamos, para quê e como
        você pode pedir alguma coisa.
      </p>

      <h2>Quem faz o quê</h2>
      <p>
        Quem decide quais dados entram no sistema e para que eles servem é a consultoria (ou o profissional) que contratou o Safety Nexo. Pela LGPD,
        ela é a <strong>controladora</strong> dos dados dos trabalhadores. O Safety Nexo guarda e processa esses dados em nome dela, como
        <strong> operador</strong>, e não usa essas informações para nenhum outro fim.
      </p>
      <p>
        Já os dados da própria conta (nome, e-mail, plano e pagamentos de quem assina o Safety Nexo) são tratados por nós como controladores.
      </p>

      <h2>Que dados ficam no sistema</h2>
      <ul>
        <li>Da conta: nome, e-mail, senha (guardada embaralhada, ninguém consegue ler), logo e dados de cobrança.</li>
        <li>Das empresas atendidas: razão social, CNPJ, endereço, responsáveis e documentos de SST.</li>
        <li>Dos trabalhadores: nome, CPF, função, setor, data de admissão, treinamentos, entregas de EPI, ASO, atestados, afastamentos, CAT e prontuário de saúde ocupacional.</li>
        <li>Biometria facial, só quando o trabalhador concorda: guardamos números que descrevem o rosto (não a foto do cadastro), embaralhados, e a foto tirada na hora da confirmação.</li>
        <li>Respostas de questionários psicossociais, sem identificar quem respondeu, e denúncias anônimas.</li>
        <li>Registros técnicos: data, hora e endereço de rede de quem entrou, assinou ou abriu um documento.</li>
      </ul>

      <h2>Para que usamos</h2>
      <ul>
        <li>Fazer o que a lei de SST exige das empresas: PGR, PCMSO, laudos, ASO, ficha de EPI, CIPA, treinamentos e envio ao eSocial.</li>
        <li>Avisar o que está vencendo e o que está pendente.</li>
        <li>Comprovar entregas, presenças e assinaturas.</li>
        <li>Manter a conta funcionando, cobrar o plano e dar suporte.</li>
      </ul>
      <p>
        A maior parte disso acontece porque a empresa tem obrigação legal de fazer (LGPD, art. 7º, II, e art. 11, II, a). A biometria facial depende de
        consentimento do trabalhador, que pode recusar: nesse caso a entrega ou a presença é registrada por assinatura.
      </p>

      <h2>Dados de saúde</h2>
      <p>
        Exames, prontuário e o CID dos atestados ficam com a consultoria. O login da empresa cliente vê o resultado do ASO (apto ou inapto), como a
        lei prevê, mas não vê o prontuário nem o CID. Denúncias e respostas psicossociais também não aparecem para a empresa cliente de forma que
        identifique alguém.
      </p>

      <h2>Com quem compartilhamos</h2>
      <p>Não vendemos nem emprestamos dados. Eles só passam por serviços que fazem o sistema funcionar:</p>
      <ul>
        <li>Hospedagem do site e do servidor (Netlify e Render) e do banco de dados e arquivos (Supabase).</li>
        <li>Envio de e-mails de aviso (Resend).</li>
        <li>Governo, quando a consultoria transmite eventos ao eSocial.</li>
        <li>Leitura de PDF antigo por inteligência artificial (Anthropic), só quando a consultoria usa essa função.</li>
      </ul>
      <p>Alguns desses serviços ficam fora do Brasil. Eles seguem regras de proteção compatíveis com a LGPD.</p>

      <h2>Por quanto tempo guardamos</h2>
      <p>
        Enquanto a conta existir. Documentos de SST e de saúde têm prazos legais longos (o prontuário médico, por exemplo, deve ser guardado por
        20 anos), então não apagamos esses registros por conta própria. Se a consultoria encerrar a conta, ela pode baixar os documentos, e
        combinamos o destino do restante.
      </p>

      <h2>Segurança</h2>
      <p>
        Conexão sempre criptografada, senhas embaralhadas, biometria e certificados digitais cifrados, cada consultoria isolada das outras,
        limite de tentativas de login e registro de quem abriu cada documento. Se acontecer algum incidente que coloque dados em risco,
        avisamos as consultorias afetadas e a ANPD.
      </p>

      <h2>Seus direitos</h2>
      <p>
        Você pode pedir para saber quais dados temos, corrigir, levar para outro serviço ou apagar o que não for obrigatório guardar.
        Se você é trabalhador de uma empresa atendida, o caminho mais rápido é falar com a sua empresa ou com a consultoria dela. Se preferir,
        fale direto com a gente.
      </p>

      <h2>Contato</h2>
      <p>
        Responsável pelos dados (encarregado): {PLATAFORMA.encarregado || 'equipe Safety Nexo'}. Contato: {contatoPrivacidade()}.
        {PLATAFORMA.nome !== 'Safety Nexo' && <> Serviço oferecido por {PLATAFORMA.nome}{PLATAFORMA.documento && `, ${PLATAFORMA.documento}`}.</>}
      </p>
    </TextoLegal>
  );
}
