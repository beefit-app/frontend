import { describe, expect, it } from "vitest";
import { SOCIAL_LOGIN_GENERIC_ERROR, socialLoginErrorMessage } from "./socialLoginErrors";

describe("socialLoginErrorMessage", () => {
  it("explica o cadastro fechado", () => {
    expect(socialLoginErrorMessage("registration_closed")).toMatch(/temporariamente fechado/);
  });

  it("explica o beta restrito", () => {
    expect(socialLoginErrorMessage("registration_restricted")).toMatch(/restrito a participantes/);
  });

  it("explica a recusa do provedor", () => {
    expect(socialLoginErrorMessage("oauth_failed")).toMatch(/provedor rejeitou/);
  });

  it("usa a mensagem genérica para códigos desconhecidos ou ausentes", () => {
    expect(socialLoginErrorMessage("social_login_failed")).toBe(SOCIAL_LOGIN_GENERIC_ERROR);
    expect(socialLoginErrorMessage("toString")).toBe(SOCIAL_LOGIN_GENERIC_ERROR);
    expect(socialLoginErrorMessage(null)).toBe(SOCIAL_LOGIN_GENERIC_ERROR);
  });
});
