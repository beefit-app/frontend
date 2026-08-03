import { PageBackground } from "./PageBackground";

type LegalDocument = "privacy" | "terms";

const CONTENT: Record<LegalDocument, { title: string; sections: Array<[string, string]> }> = {
  privacy: {
    title: "Política de Privacidade",
    sections: [
      ["Rascunho para revisão jurídica", "Este texto é um rascunho técnico e deve ser aprovado por responsável jurídico antes da publicação nas lojas."],
      ["Dados tratados", "Tratamos dados de conta, perfil, treinos, imagens enviadas e dados técnicos necessários para autenticar e operar o aplicativo."],
      ["Finalidade", "Os dados são usados para fornecer os recursos de treino, perfil, conteúdo social, segurança e suporte."],
      ["Seus controles", "Você pode editar dados do perfil e solicitar a exclusão permanente da conta nas Configurações de conta."],
    ],
  },
  terms: {
    title: "Termos de Uso",
    sections: [
      ["Rascunho para revisão jurídica", "Este texto é um rascunho técnico e deve ser aprovado por responsável jurídico antes da publicação nas lojas."],
      ["Uso do serviço", "Use o BeeFit de forma lícita, respeitosa e compatível com a finalidade de acompanhamento de treinos."],
      ["Conteúdo e conta", "Você é responsável pelas informações e imagens que publica e deve proteger as credenciais de acesso à conta."],
      ["Saúde", "O BeeFit não substitui orientação médica, profissional de educação física ou avaliação clínica."],
    ],
  },
};

export function LegalDocuments({ document }: { document: LegalDocument }) {
  const content = CONTENT[document];
  return (
    <PageBackground>
      <main className="mx-auto max-w-[720px] px-6 py-10 font-inter text-[#D4D4D4]">
        <a href="/" className="text-sm text-[#FFD700]">Voltar ao BeeFit</a>
        <h1 className="mt-6 font-montserrat text-3xl font-bold text-white">{content.title}</h1>
        <p className="mt-2 text-sm text-[#A3A3A3]">Última atualização: rascunho de pré-publicação.</p>
        {content.sections.map(([heading, text]) => (
          <section key={heading} className="mt-7">
            <h2 className="font-montserrat text-lg font-bold text-white">{heading}</h2>
            <p className="mt-2 leading-7">{text}</p>
          </section>
        ))}
      </main>
    </PageBackground>
  );
}
