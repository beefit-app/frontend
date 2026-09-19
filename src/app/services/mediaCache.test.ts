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

  it("descarta o download que termina depois do logout", async () => {
    // A requisicao em voo nao e cancelada pelo logout. Sem uma guarda, ela resolve
    // depois e reinsere a foto do usuario anterior no cache — o mesmo vazamento
    // entre contas que clearMediaCache existe para evitar.
    let resolverDownload: (blob: Blob) => void = () => {};
    getBlob.mockReturnValueOnce(new Promise<Blob>((resolve) => {
      resolverDownload = resolve;
    }));

    const { acquireMediaUrl, clearMediaCache } = await import("./mediaCache");
    const pendente = acquireMediaUrl("/api/media/foto-de-A").catch(() => "descartado");

    clearMediaCache();
    resolverDownload(new Blob(["foto"], { type: "image/png" }));
    await pendente;

    // O object URL criado tarde precisa ser revogado, senao vaza memoria e a foto
    // continua acessivel.
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:foto-1");

    // E a proxima exibicao tem de buscar de novo, em vez de achar a foto de A no cache.
    getBlob.mockResolvedValueOnce(new Blob(["outra"], { type: "image/png" }));
    await acquireMediaUrl("/api/media/foto-de-A");
    expect(getBlob).toHaveBeenCalledTimes(2);
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

  it("protege fotos com pinned: true contra evicção LRU quando o cache atinge o limite", async () => {
    const { acquireMediaUrl, releaseMediaUrl } = await import("./mediaCache");

    // Fixa o avatar do amigo
    await acquireMediaUrl("/api/media/avatar-amigo", { pinned: true });
    releaseMediaUrl("/api/media/avatar-amigo"); // refs = 0, mas pinned = true

    // Adiciona 40 fotos normais do feed que unmountam (refs = 0)
    for (let i = 1; i <= 40; i++) {
      await acquireMediaUrl(`/api/media/feed-foto-${i}`);
      releaseMediaUrl(`/api/media/feed-foto-${i}`);
    }

    // O avatar fixado não pode ter sido revogado por evicção
    expect(revokeObjectURL).not.toHaveBeenCalledWith("blob:foto-1");

    // E ao pedir novamente o avatar do amigo, ele é servido da memória sem nova requisição
    await acquireMediaUrl("/api/media/avatar-amigo");
    // getBlob foi chamado 1 vez pro avatar + 40 pro feed = 41 vezes (e NÃO 42)
    expect(getBlob).toHaveBeenCalledTimes(41);
  });

  it("preloadMedia pré-carrega URLs válidas ignorando nulos e strings não-mídia", async () => {
    const { preloadMedia, acquireMediaUrl } = await import("./mediaCache");

    await preloadMedia([
      "/api/media/avatar-1",
      null,
      undefined,
      "https://external.com/avatar.jpg",
      "/api/media/avatar-2",
      "/api/media/avatar-1", // duplicata
    ], { pinned: true });

    // Apenas os dois caminhos /api/media distintos foram baixados
    expect(getBlob).toHaveBeenCalledTimes(2);

    // E já estão em memória
    await acquireMediaUrl("/api/media/avatar-1");
    await acquireMediaUrl("/api/media/avatar-2");
    expect(getBlob).toHaveBeenCalledTimes(2);
  });
});
