import { apiClient } from "./apiClient";
import type { LegalVersions } from "../types/auth";

const LEGAL_VERSIONS_PATH = "/auth/legal-versions";

// As versoes so mudam quando os documentos sao republicados, entao uma busca por
// sessao basta. O cache guarda a promessa, e nao o resultado: duas telas montando
// ao mesmo tempo compartilham a mesma requisicao em vez de disparar duas.
let pendingRequest: Promise<LegalVersions> | null = null;

export async function fetchLegalVersions(): Promise<LegalVersions> {
  pendingRequest ??= apiClient.get<LegalVersions>(LEGAL_VERSIONS_PATH).catch((error) => {
    // Sem isto, uma falha de rede ficaria cacheada e toda tentativa seguinte
    // rejeitaria com o erro antigo, sem nunca voltar a chamar o servidor.
    pendingRequest = null;
    throw error;
  });

  return pendingRequest;
}

export function resetLegalVersionsCache() {
  pendingRequest = null;
}
