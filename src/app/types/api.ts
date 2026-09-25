import type { components } from "./api.generated";

/**
 * Apelidos estaveis para os schemas gerados de /v3/api-docs.
 *
 * O ponto nao e encurtar nome: e que os corpos enviados aos endpoints sejam
 * tipados pelo contrato do backend, e nao por interface escrita a mao. Campo
 * obrigatorio que o frontend esqueca passa a quebrar `npm run typecheck` em vez
 * de virar 400 em producao — foi assim que o cadastro (sem acceptedTermsVersion)
 * e a exclusao de conta (sem corpo) chegaram ao ar.
 *
 * Regenerar com `npm run api:types` com o backend local de pe, e versionar o
 * resultado: build e typecheck nao podem depender de servidor rodando.
 */
type Schemas = components["schemas"];

// Autenticacao
export type RegisterRequest = Schemas["RegisterDTO"];
export type LoginRequest = Schemas["AuthenticationDTO"];
export type LogoutRequest = Schemas["LogoutRequestDTO"];
export type RefreshTokenRequest = Schemas["RefreshTokenRequestDTO"];
export type LegalVersionsResponse = Schemas["LegalVersionsResponseDTO"];

// Perfil e conta
export type UpdateProfileRequest = Schemas["UpdateProfileRequestDTO"];
export type UpdateAccountSettingsRequest = Schemas["UpdateAccountSettingsRequestDTO"];
export type ChangePasswordRequest = Schemas["ChangePasswordDTO"];
export type DeleteAccountRequest = Schemas["DeleteUserRequestDTO"];

// Treino e templates
export type StartWorkoutRequest = Schemas["StartWorkoutRequestDTO"];
export type FinishWorkoutRequest = Schemas["FinishWorkoutSnapshotRequestDTO"];
export type WorkoutTemplateRequest = Schemas["WorkoutTemplateRequestDTO"];

// Social e moderacao
export type CreateHiveRequest = Schemas["HiveCreationDTO"];
export type UpdatePostMetadataRequest = Schemas["UpdatePostMetadataDTO"];
export type CreateReportRequest = Schemas["CreateReportDTO"];
export type ReportResponse = Schemas["ReportResponseDTO"];
export type ReportTargetType = CreateReportRequest["targetType"];
export type ReportReason = CreateReportRequest["reason"];
