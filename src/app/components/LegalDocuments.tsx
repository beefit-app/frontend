import { useEffect, useState } from "react";
import { PageBackground } from "./PageBackground";
import { HexagonPattern } from "./HexagonPattern";
import { fetchLegalVersions } from "../services/legalService";

type LegalDocument = "privacy" | "terms";

interface Section {
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

const DRAFT_NOTICE =
  "Este texto é um rascunho técnico, escrito a partir do funcionamento real do aplicativo, e deve ser aprovado por responsável jurídico antes da publicação nas lojas.";

/**
 * Marcadores deliberados. Preencher por suposição num documento legal é pior que
 * deixar a lacuna visível, entao eles aparecem na tela ate o time definir.
 */
const PENDING_DECISIONS = [
  "Identificação do controlador (razão social ou responsável).",
  "Canal de contato para o titular exercer seus direitos.",
  "Idade mínima de uso — hoje o aplicativo não verifica idade.",
  "Comarca de foro.",
];

const PLACEHOLDER = "[a definir]";

const CONTENT: Record<LegalDocument, { title: string; sections: Section[] }> = {
  privacy: {
    title: "Política de Privacidade",
    sections: [
      {
        title: "Quem trata seus dados",
        paragraphs: [
          `O BeeFit é um aplicativo de acompanhamento de treinos com recursos sociais. O controlador dos dados pessoais tratados aqui é ${PLACEHOLDER}, a quem você pode se dirigir pelo canal ${PLACEHOLDER}.`,
        ],
      },
      {
        title: "Dados que coletamos",
        paragraphs: ["Coletamos apenas o necessário para operar os recursos do aplicativo:"],
        bullets: [
          "Cadastro: nome completo, nome de usuário, e-mail, peso corporal e meta semanal de treinos. A senha nunca é armazenada em texto legível, apenas seu hash.",
          "Perfil: foto de perfil e biografia, quando você optar por preenchê-las.",
          "Treinos: sessões, exercícios, séries, cargas, repetições e modelos de treino que você criar.",
          "Imagens: fotos associadas aos treinos, limitadas a 10 MB por arquivo e a 100 arquivos por conta.",
          "Conteúdo social: publicações, curtidas, amizades e participação em colmeias.",
          "Dados técnicos: identificador do dispositivo e sessões de autenticação, com data de criação, último uso e expiração. O token de renovação é guardado apenas como hash e é rotacionado a cada uso.",
          "Segurança: contadores de tentativas de acesso, cujos identificadores são gravados como hash SHA-256, e não em texto legível.",
          "Consentimento: a versão dos documentos legais que você aceitou e a data do aceite.",
        ],
      },
      {
        title: "Para que usamos",
        paragraphs: [
          "Os dados são usados para autenticar seu acesso, registrar e exibir seus treinos, calcular estatísticas e cartas de recorde, operar os recursos sociais, proteger o serviço contra abuso e prestar suporte.",
          "Não usamos seus dados para publicidade e não os vendemos.",
        ],
      },
      {
        title: "Base legal",
        paragraphs: [
          "O tratamento se apoia na execução do contrato de uso do aplicativo, no seu consentimento para os recursos que dependem dele e no legítimo interesse quanto às medidas de segurança, como o limite de tentativas de acesso.",
        ],
      },
      {
        title: "Compartilhamento e transferência internacional",
        paragraphs: [
          "Não compartilhamos seus dados com terceiros para fins comerciais.",
          "A infraestrutura do aplicativo é hospedada em provedor de nuvem cujos servidores ficam nos Estados Unidos. Isso significa que seus dados são armazenados e processados fora do Brasil.",
        ],
      },
      {
        title: "Retenção e exclusão",
        paragraphs: [
          "Seus dados permanecem enquanto sua conta existir.",
          "Você pode excluir a conta nas configurações do aplicativo. A exclusão exige confirmação da sua senha e remove de forma permanente suas imagens, sessões de autenticação, amizades, curtidas, publicações e o registro da conta. A operação não pode ser desfeita.",
        ],
      },
      {
        title: "Seus direitos",
        paragraphs: [
          "Você pode confirmar a existência de tratamento, acessar seus dados, corrigir dados incompletos ou desatualizados, solicitar anonimização ou eliminação, revogar consentimento e pedir informações sobre compartilhamento.",
          `Alguns desses pedidos são atendidos diretamente no aplicativo, na edição de perfil e na exclusão de conta. Os demais podem ser solicitados pelo canal ${PLACEHOLDER}.`,
        ],
      },
      {
        title: "Segurança",
        paragraphs: [
          "A comunicação com o servidor exige conexão cifrada. Senhas são guardadas como hash, tokens de sessão são rotacionados e podem ser revogados, e há limite de tentativas de autenticação por conta e por origem.",
          "Nenhum sistema é imune a incidentes, mas mantemos essas medidas para reduzir o risco.",
        ],
      },
      {
        title: "Controle de visibilidade",
        paragraphs: [
          "O modo fantasma permite restringir sua visibilidade nos recursos sociais sem apagar seus dados nem encerrar a conta. Ele fica desativado por padrão e pode ser alterado a qualquer momento no perfil.",
        ],
      },
      {
        title: "Crianças e adolescentes",
        paragraphs: [
          `A idade mínima para uso é ${PLACEHOLDER}. O aplicativo não realiza verificação de idade no cadastro. Se identificarmos conta de pessoa abaixo da idade mínima sem o consentimento exigido, ela poderá ser removida.`,
        ],
      },
      {
        title: "Alterações desta política",
        paragraphs: [
          "Cada versão desta política é identificada, e o aplicativo registra qual versão você aceitou e quando. Alterações relevantes serão apresentadas para novo aceite.",
        ],
      },
    ],
  },
  terms: {
    title: "Termos de Uso",
    sections: [
      {
        title: "Aceite destes termos",
        paragraphs: [
          "Ao criar uma conta no BeeFit você declara ter lido e aceito estes Termos de Uso e a Política de Privacidade na versão vigente no momento do cadastro.",
          "O aplicativo registra qual versão foi aceita e a data do aceite. Se os documentos forem atualizados de forma relevante, um novo aceite poderá ser exigido.",
        ],
      },
      {
        title: "Quem pode usar",
        paragraphs: [
          `O uso é permitido a partir de ${PLACEHOLDER}. Você é responsável pela veracidade das informações fornecidas no cadastro.`,
        ],
      },
      {
        title: "Sua conta",
        paragraphs: [
          "Você é responsável por manter suas credenciais em sigilo e por toda atividade realizada na sua conta.",
          "Cada dispositivo mantém uma sessão própria, que pode ser encerrada por você a qualquer momento pelo logout. Se suspeitar de acesso indevido, troque sua senha imediatamente.",
        ],
      },
      {
        title: "Uso aceitável",
        paragraphs: ["Ao usar o BeeFit, você concorda em não:"],
        bullets: [
          "publicar conteúdo ilegal, ofensivo, discriminatório ou que viole direitos de terceiros;",
          "enviar imagens de pessoas sem autorização delas;",
          "tentar burlar limites de uso, mecanismos de segurança ou autenticação;",
          "automatizar acesso de forma a prejudicar o funcionamento do serviço;",
          "usar a conta de outra pessoa ou se passar por terceiro.",
        ],
      },
      {
        title: "Conteúdo que você publica",
        paragraphs: [
          "Você mantém a titularidade do conteúdo que publica e é responsável por ele.",
          "Ao publicar, você nos autoriza a armazenar e exibir esse conteúdo dentro do aplicativo, na medida necessária para operar os recursos que você utiliza. Essa autorização termina quando o conteúdo ou a conta são excluídos.",
        ],
      },
      {
        title: "Saúde e limites do serviço",
        paragraphs: [
          "O BeeFit é uma ferramenta de registro e acompanhamento de treinos. Ele não é um serviço de saúde e não substitui orientação médica, avaliação clínica ou acompanhamento de profissional de educação física.",
          "As sugestões, métricas e cartas de recorde do aplicativo são baseadas apenas nos dados que você informa. Consulte um profissional antes de iniciar ou alterar sua rotina de exercícios, especialmente se houver condição de saúde preexistente.",
        ],
      },
      {
        title: "Disponibilidade",
        paragraphs: [
          "O aplicativo está em fase de testes. Recursos podem mudar, ficar indisponíveis temporariamente ou ser descontinuados, e podem ocorrer falhas e perda de dados.",
          "Mantenha cópia própria de qualquer informação que considere importante.",
        ],
      },
      {
        title: "Suspensão e encerramento",
        paragraphs: [
          "Contas que violem estes termos podem ser suspensas temporariamente ou encerradas.",
          "Você pode encerrar sua conta quando quiser, pela exclusão de conta nas configurações — o que remove seus dados de forma permanente.",
        ],
      },
      {
        title: "Limitação de responsabilidade",
        paragraphs: [
          "Na máxima extensão permitida pela lei aplicável, o BeeFit não responde por danos decorrentes do uso ou da impossibilidade de uso do aplicativo, incluindo lesões associadas à prática de exercícios, perda de dados ou indisponibilidade do serviço.",
          "Nada nestes termos afasta direitos que a legislação consumerista garanta a você.",
        ],
      },
      {
        title: "Alterações destes termos",
        paragraphs: [
          "Estes termos podem ser atualizados. Cada versão é identificada, e alterações relevantes serão apresentadas para novo aceite antes de continuar usando o aplicativo.",
        ],
      },
      {
        title: "Lei aplicável",
        paragraphs: [
          `Estes termos são regidos pela lei brasileira. Fica eleito o foro da comarca de ${PLACEHOLDER}, sem prejuízo do foro do domicílio do consumidor quando a lei assim garantir.`,
        ],
      },
    ],
  },
};

/** Ícone de seção do styleguide (§6.4): hexágono amarelo à esquerda do título. */
function HexagonBullet() {
  return (
    <span
      aria-hidden="true"
      className="mt-1 shrink-0"
      style={{
        width: 18,
        height: 21,
        background: "#FFD700",
        clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
      }}
    />
  );
}

export function LegalDocuments({ document }: { document: LegalDocument }) {
  const content = CONTENT[document];
  const [version, setVersion] = useState<string | null>(null);

  // A versao apenas complementa o cabecalho, entao a tela nao espera por ela: a
  // instancia free do Render leva ~60s fria e prender o documento inteiro nisso
  // seria pior que exibi-lo sem o rotulo.
  useEffect(() => {
    let ativo = true;
    void fetchLegalVersions()
      .then((versions) => {
        if (ativo) setVersion(document === "terms" ? versions.termsVersion : versions.privacyVersion);
      })
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, [document]);

  return (
    <PageBackground>
      <HexagonPattern />
      <main className="relative mx-auto max-w-[720px] px-6 py-10 font-inter text-[#D4D4D4]">
        <a
          href="/"
          className="beefit-tap-target inline-flex items-center gap-2 text-sm font-medium text-[#FFD700]"
        >
          <span aria-hidden="true">←</span> Voltar ao BeeFit
        </a>

        <h1
          className="mt-6 font-montserrat font-extrabold text-white"
          style={{ fontSize: 34, lineHeight: 1.15, letterSpacing: "-1px" }}
        >
          {content.title}
        </h1>

        {version && (
          <p className="mt-2 text-sm text-[#8A8A8A]">
            Versão vigente: <span className="text-[#A3A3A3]">{version}</span>
          </p>
        )}

        {/* Superficie neutra de proposito: o styleguide reserva o amarelo para marca
            e CTA, e proibe usa-lo como status. */}
        <aside
          className="mt-6 border border-[#2D2D2D] bg-[#1A1A1A] p-4"
          style={{ borderRadius: 16 }}
        >
          <h2 className="font-montserrat text-sm font-bold uppercase tracking-wide text-[#A3A3A3]">
            Rascunho para revisão jurídica
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#8A8A8A]">{DRAFT_NOTICE}</p>
          <p className="mt-3 text-sm leading-6 text-[#8A8A8A]">
            Pendente de definição pelo time, marcado como {PLACEHOLDER} no texto:
          </p>
          <ul className="mt-2 list-disc pl-5 text-sm leading-6 text-[#8A8A8A]">
            {PENDING_DECISIONS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </aside>

        {content.sections.map((section) => (
          <section
            key={section.title}
            className="mt-6 border border-[#2D2D2D] bg-[#1A1A1A] p-6"
            style={{ borderRadius: 16 }}
          >
            <div className="flex items-start gap-3">
              <HexagonBullet />
              <h2 className="font-montserrat text-xl font-bold text-white">{section.title}</h2>
            </div>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="mt-3 leading-7">
                {paragraph}
              </p>
            ))}
            {section.bullets && (
              <ul className="mt-3 list-disc space-y-2 pl-5 leading-7">
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </main>
    </PageBackground>
  );
}
