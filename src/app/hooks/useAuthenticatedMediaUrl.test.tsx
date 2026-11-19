import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSocialVisibility } from "./useSocialVisibility";
import { clearMediaCache } from "../services/mediaCache";
import type { SocialEvent } from "../services/socialEventsService";
import { useAuthenticatedMediaUrl } from "./useAuthenticatedMediaUrl";

const getBlob = vi.hoisted(() => vi.fn());
vi.mock("../services/apiClient", () => ({ apiClient: { getBlob } }));
const subscribeSocialEvents = vi.hoisted(() => vi.fn<(listener: (event: SocialEvent) => void, signal: AbortSignal) => Promise<void>>());
vi.mock("../services/socialEventsService", () => ({ subscribeSocialEvents }));

const createObjectURL = vi.fn();
const revokeObjectURL = vi.fn();
const photo = new Blob(["foto"], { type: "image/png" });
const protectedPath = "/api/media/foto-1";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
}

describe("useAuthenticatedMediaUrl", () => {
  beforeEach(() => {
    let sequence = 0;
    createObjectURL.mockReset().mockImplementation(() => `blob:foto-${++sequence}`);
    revokeObjectURL.mockReset();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    getBlob.mockReset().mockResolvedValue(photo);
    subscribeSocialEvents.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    clearMediaCache();
  });

  it("esconde a mídia já montada na invalidação e só a reapresenta depois de novo GET autorizado", async () => {
    const { result } = renderHook(() => {
      // Não há feed montado; a sessão continua responsável por invalidar a mídia.
      useSocialVisibility("user-1");
      return {
        first: useAuthenticatedMediaUrl(protectedPath),
        second: useAuthenticatedMediaUrl(protectedPath),
        public: useAuthenticatedMediaUrl("/images/publica.png"),
      };
    });
    await waitFor(() => expect(result.current.first).toBe("blob:foto-1"));
    expect(result.current.second).toBe("blob:foto-1");
    expect(getBlob).toHaveBeenCalledTimes(1);

    expect(subscribeSocialEvents).toHaveBeenCalledTimes(1);
    const [onEvent] = subscribeSocialEvents.mock.calls[0];
    const revalidation = deferred<Blob>();
    getBlob.mockReturnValueOnce(revalidation.promise);
    act(() => onEvent({ type: "SOCIAL_VISIBILITY_CHANGED", data: {} }));

    expect(result.current).toEqual({ first: null, second: null, public: "/images/publica.png" });
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:foto-1");
    expect(getBlob).toHaveBeenCalledTimes(2);
    expect(getBlob).toHaveBeenLastCalledWith(protectedPath, { auth: true });

    await act(async () => revalidation.reject(new Error("Acesso negado")));
    expect(result.current.first).toBeNull();
    expect(result.current.second).toBeNull();

    act(() => window.dispatchEvent(new Event("beefit:social-connected")));
    await waitFor(() => expect(result.current.first).toBe("blob:foto-2"));
    expect(result.current.second).toBe("blob:foto-2");
    expect(getBlob).toHaveBeenCalledTimes(3);
  });

  it("não publica o blob do pedido anterior se ele só terminar depois da invalidação", async () => {
    const previous = deferred<Blob>();
    const revalidation = deferred<Blob>();
    getBlob.mockReturnValueOnce(previous.promise).mockReturnValueOnce(revalidation.promise);
    const { result } = renderHook(() => useAuthenticatedMediaUrl(protectedPath));

    act(() => clearMediaCache());
    await act(async () => previous.resolve(photo));
    expect(result.current).toBeNull();

    await act(async () => revalidation.resolve(photo));
    expect(result.current).not.toBeNull();
    expect(getBlob).toHaveBeenCalledTimes(2);
  });
});
