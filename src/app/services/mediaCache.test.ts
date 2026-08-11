import { beforeEach, describe, expect, it, vi } from "vitest";

const getBlob = vi.hoisted(() => vi.fn());
vi.mock("./apiClient", () => ({ apiClient: { getBlob } }));

const createObjectURL = vi.fn();
const revokeObjectURL = vi.fn();

describe("mediaCache", () => {
  let urlCounter = 0;

  beforeEach(async () => {
    vi.resetModules();
    urlCounter = 0;
    createObjectURL.mockReset().mockImplementation(() => `blob:foto-${++urlCounter}`);
    revokeObjectURL.mockReset();
    // Substitui so os dois metodos: trocar o global URI inteiro quebraria o
    // construtor new URL() que o apiClient usa para montar a rota.
    URL.createObjectURL = createObjectURL as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = revokeObjectURL as unknown as typeof URL.revokeObjectURL;
    getBlob.mockReset().mockResolvedValue(new Blob(["foto"], { type: "image/png" }));
  });

  it("baixa uma vez so quando varios cards pedem a mesma foto", async () => {
    const { acquireMediaUrl } = await import("./mediaCache");

    const urls = await Promise.all([
      acquireMediaUrl("/api/media/foto-1"),
      acquireMediaUrl("/api/media/foto-1"),
      acquireMediaUrl("/api/media/foto-1"),
    ]);

    expect(getBlob).toHaveBeenCalledTimes(1);
    expect(new Set(urls).size).toBe(1);
  });

  it("nao rebaixa a mesma foto em uma nova montagem", async () => {
    const { acquireMediaUrl, releaseMediaUrl } = await import("./mediaCache");

    await acquireMediaUrl("/api/media/foto-1");
    releaseMediaUrl("/api/media/foto-1");
    await acquireMediaUrl("/api/media/foto-1");

    expect(getBlob).toHaveBeenCalledTimes(1);
  });

  it("nao revoga um object URL que outro card ainda exibe", async () => {
    const { acquireMediaUrl, releaseMediaUrl } = await import("./mediaCache");

    await acquireMediaUrl("/api/media/foto-1");
    await acquireMediaUrl("/api/media/foto-1");
    releaseMediaUrl("/api/media/foto-1");

    // Ainda ha uma referencia viva: revogar aqui quebraria a imagem na tela.
    expect(revokeObjectURL).not.toHaveBeenCalled();
  });

  it("clearMediaCache revoga tudo, para as fotos nao sobreviverem ao logout", async () => {
    const { acquireMediaUrl, clearMediaCache } = await import("./mediaCache");

    await acquireMediaUrl("/api/media/foto-1");
    await acquireMediaUrl("/api/media/foto-2");
    clearMediaCache();

    expect(revokeObjectURL).toHaveBeenCalledTimes(2);

    // Depois de limpo, a proxima exibicao precisa buscar de novo no servidor.
    await acquireMediaUrl("/api/media/foto-1");
    expect(getBlob).toHaveBeenCalledTimes(3);
  });
});
