import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const API_URL = "http://api.test";

function createJsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

describe("useStreakState", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("VITE_API_URL", API_URL);
    window.localStorage.clear();
    window.localStorage.setItem("beefit.auth.accessToken", "jwt-backend");
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("carrega honeys do perfil remoto", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      createJsonResponse({
        offensiveHoneys: 9,
      }),
    );

    const { useStreakState } = await import("./useStreakState");
    const { result } = renderHook(() =>
      useStreakState({ id: "user-1", name: "Bee Fit", email: "bee@fit.com" }),
    );

    await waitFor(() => expect(result.current.streak.count).toBe(9));
  });
});
