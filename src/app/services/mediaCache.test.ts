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

    const url = await acquireMediaUrl("/api/media/foto-1");
    releaseMediaUrl("/api/media/foto-1", url);
    await acquireMediaUrl("/api/media/foto-1");

    expect(getBlob).toHaveBeenCalledTimes(1);
  });

  it("nao revoga um object URL que outro card ainda exibe", async () => {
    const { acquireMediaUrl, releaseMediaUrl } = await import("./mediaCache");

    const url = await acquireMediaUrl("/api/media/foto-1");
    await acquireMediaUrl("/api/media/foto-1");
    releaseMediaUrl("/api/media/foto-1", url);

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
    const pendente = acquireMediaUrl("/api/media/foto-de-A");
    const descartado = expect(pendente).rejects.toThrow();

    clearMediaCache();
    resolverDownload(new Blob(["foto"], { type: "image/png" }));
    await descartado;

    expect(createObjectURL).not.toHaveBeenCalled();

    // E a proxima exibicao tem de buscar de novo, em vez de achar a foto de A no cache.
    getBlob.mockResolvedValueOnce(new Blob(["outra"], { type: "image/png" }));
    await acquireMediaUrl("/api/media/foto-de-A");
    expect(getBlob).toHaveBeenCalledTimes(2);
  });

  it("mantém o download novo compartilhado mesmo que o pedido anterior termine primeiro", async () => {
    const { acquireMediaUrl, clearMediaCache } = await import("./mediaCache");
    const path = "/api/media/foto-1";
    let finishOld!: (blob: Blob) => void;
    let finishNew!: (blob: Blob) => void;
    getBlob
      .mockReturnValueOnce(new Promise<Blob>((resolve) => { finishOld = resolve; }))
      .mockReturnValueOnce(new Promise<Blob>((resolve) => { finishNew = resolve; }));

    const oldDownload = expect(acquireMediaUrl(path)).rejects.toThrow();
    clearMediaCache();
    const newDownload = acquireMediaUrl(path);
    finishOld(new Blob(["anterior"]));
    await oldDownload;

    const sharedDownload = acquireMediaUrl(path);
    expect(getBlob).toHaveBeenCalledTimes(2);
    finishNew(new Blob(["nova"]));
    expect(await sharedDownload).toBe(await newDownload);
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
    const avatar = await acquireMediaUrl("/api/media/avatar-amigo", { pinned: true });
    releaseMediaUrl("/api/media/avatar-amigo", avatar); // refs = 0, mas pinned = true

    // Adiciona 40 fotos normais do feed que unmountam (refs = 0)
    for (let i = 1; i <= 40; i++) {
      const path = `/api/media/feed-foto-${i}`;
      releaseMediaUrl(path, await acquireMediaUrl(path));
    }

    // O avatar fixado não pode ter sido revogado por evicção
    expect(revokeObjectURL).not.toHaveBeenCalledWith("blob:foto-1");

    // E ao pedir novamente o avatar do amigo, ele é servido da memória sem nova requisição
    await acquireMediaUrl("/api/media/avatar-amigo");
    // getBlob foi chamado 1 vez pro avatar + 40 pro feed = 41 vezes (e NÃO 42)
    expect(getBlob).toHaveBeenCalledTimes(41);
  });

  it("um cleanup antigo não deixa a nova URL em uso ser removida pelo LRU", async () => {
    const { acquireMediaUrl, releaseMediaUrl, clearMediaCache } = await import("./mediaCache");
    const path = "/api/media/foto-1";
    const oldUrl = await acquireMediaUrl(path);
    clearMediaCache();
    const currentUrl = await acquireMediaUrl(path);
    releaseMediaUrl(path, oldUrl);

    for (let i = 0; i < 40; i++) {
      const otherPath = `/api/media/outra-${i}`;
      releaseMediaUrl(otherPath, await acquireMediaUrl(otherPath));
    }

    expect(revokeObjectURL).not.toHaveBeenCalledWith(currentUrl);
    expect(await acquireMediaUrl(path)).toBe(currentUrl);
    expect(getBlob).toHaveBeenCalledTimes(42);
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
