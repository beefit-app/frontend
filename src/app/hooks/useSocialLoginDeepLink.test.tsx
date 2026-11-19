import { act, renderHook, waitFor } from "@testing-library/react";
import { useSocialLoginDeepLink } from "./useSocialLoginDeepLink";

const fixture = vi.hoisted(() => ({
  booting: true,
  onOpen: null as ((event: { url: string }) => void) | null,
  getLaunchUrl: vi.fn<() => Promise<{ url: string } | undefined>>(),
  loginWithSocialCode: vi.fn<(code: string) => Promise<void>>(),
  setSocialLoginError: vi.fn(),
  close: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => true } }));
vi.mock("@capacitor/app", () => ({
  App: {
    addListener: async (_event: string, onOpen: typeof fixture.onOpen) => {
      fixture.onOpen = onOpen;
      return { remove: fixture.remove };
    },
    getLaunchUrl: fixture.getLaunchUrl,
  },
}));
vi.mock("@capacitor/browser", () => ({ Browser: { close: fixture.close } }));
vi.mock("../auth/AuthContext", () => ({ useAuth: () => ({ ...fixture, isBootstrapping: fixture.booting }) }));

describe("useSocialLoginDeepLink", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    fixture.booting = true;
    fixture.onOpen = null;
    fixture.loginWithSocialCode.mockResolvedValue(undefined);
    fixture.getLaunchUrl.mockResolvedValue(undefined);
    fixture.close.mockResolvedValue(undefined);
    fixture.remove.mockResolvedValue(undefined);
  });

  it("aguarda o boot no cold start e não troca duas vezes quando o evento nativo se repete", async () => {
    const url = "com.beefit.app://auth/callback?code=codigo-fixture";
    fixture.getLaunchUrl.mockResolvedValue({ url });
    const { rerender, unmount } = renderHook(useSocialLoginDeepLink);
    await act(async () => { await fixture.getLaunchUrl.mock.results[0]?.value; });
    expect(fixture.loginWithSocialCode).not.toHaveBeenCalled();

    fixture.booting = false;
    rerender();
    expect(fixture.loginWithSocialCode).toHaveBeenCalledExactlyOnceWith("codigo-fixture");
    act(() => { fixture.onOpen?.({ url }); });
    expect(fixture.loginWithSocialCode).toHaveBeenCalledOnce();
    expect(fixture.close).toHaveBeenCalledOnce();
    unmount();
    await waitFor(() => expect(fixture.remove).toHaveBeenCalledOnce());
  });

  it("exibe a recusa do provedor no retorno ao app sem tentar estabelecer sessão", () => {
    fixture.booting = false;
    renderHook(useSocialLoginDeepLink);
    act(() => { fixture.onOpen?.({ url: "com.beefit.app://auth/callback?error=registration_closed" }); });
    expect(fixture.setSocialLoginError).toHaveBeenCalledWith("O cadastro de novas contas está temporariamente fechado.");
    expect(fixture.loginWithSocialCode).not.toHaveBeenCalled();
  });
});
