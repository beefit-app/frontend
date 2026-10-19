import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PostComments } from "./index";
import { commentService } from "../../services/commentService";
import { parseSocialEvent, type SocialEvent } from "../../services/socialEventsService";
import { pageCacheStorage } from "../../storage/pageCacheStorage";

const events = vi.hoisted(() => ({ listener: null as ((event: SocialEvent) => void) | null, changed: null as ((postId: string) => void) | null }));
vi.mock("../../auth/AuthContext", () => ({ useAuth: () => ({ user: { id: "user1" } }) }));
vi.mock("../../services/commentService", () => ({ commentService: {
  list: vi.fn(), count: vi.fn(), create: vi.fn(), remove: vi.fn(),
  invalidate: vi.fn((postId: string) => events.changed?.(postId)),
  subscribe: vi.fn((listener: (postId: string) => void) => { events.changed = listener; return () => { events.changed = null; }; }),
} }));
vi.mock("../../services/socialEventsService", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../services/socialEventsService")>(),
  subscribeSocialEvents: vi.fn((listener: (event: SocialEvent) => void) => { events.listener = listener; return Promise.resolve(); }),
}));
vi.mock("../../storage/pageCacheStorage", () => ({ pageCacheStorage: { remove: vi.fn() } }));
vi.mock("../../hooks/useConfirm", () => ({ useConfirm: () => ({ confirm: vi.fn().mockResolvedValue(true), dialog: null }) }));

const comment = { id: "c1", authorId: "user1", username: "ana", avatarUrl: null, developer: false, text: "Bom treino!", createdAt: "2026-10-17T12:00:00", canDelete: true, canReport: false };
function page(content = [comment], last = true) { return { content, last, number: 0, totalElements: content.length }; }
function open() { fireEvent.click(screen.getByRole("button", { name: /Comentários:/ })); }

describe("comentários de postagens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(commentService.list).mockReset();
    vi.mocked(commentService.create).mockReset();
    vi.mocked(commentService.list).mockResolvedValue(page([]));
    vi.mocked(commentService.count).mockResolvedValue(0);
    vi.mocked(commentService.create).mockResolvedValue(comment);
    vi.mocked(commentService.remove).mockResolvedValue(undefined);
  });

  it("carrega apenas ao abrir e mostra lista vazia", async () => {
    render(<PostComments postId="p1" initialCount={0} />);
    expect(commentService.list).not.toHaveBeenCalled();
    open();
    expect(await screen.findByText("Ainda não há comentários. Seja o primeiro!")).toBeInTheDocument();
    expect(commentService.list).toHaveBeenCalledWith("p1", 0);
  });

  it("limita a 360 e não permite enviar apenas espaços", async () => {
    render(<PostComments postId="p1" />);
    open();
    const input = await screen.findByRole("textbox", { name: "Seu comentário" });
    expect(input).toHaveAttribute("maxlength", "360");
    fireEvent.change(input, { target: { value: "   " } });
    expect(screen.getByRole("button", { name: "Enviar comentário" })).toBeDisabled();
    fireEvent.change(input, { target: { value: "a".repeat(360) } });
    expect(screen.getByText("360/360")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar comentário" })).toBeEnabled();
    fireEvent.change(input, { target: { value: "a".repeat(361) } });
    expect(screen.getByRole("button", { name: "Enviar comentário" })).toBeDisabled();
  });

  it("preserva texto após falha e limpa somente após confirmação", async () => {
    vi.mocked(commentService.create).mockRejectedValueOnce(new Error("Sem conexão"));
    render(<PostComments postId="p1" />);
    open();
    const input = await screen.findByRole("textbox", { name: "Seu comentário" });
    fireEvent.change(input, { target: { value: "Bom treino!" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar comentário" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Sem conexão");
    expect(input).toHaveValue("Bom treino!");
    fireEvent.click(screen.getByRole("button", { name: "Enviar comentário" }));
    await waitFor(() => expect(input).toHaveValue(""));
    expect(commentService.create).toHaveBeenCalledTimes(2);
  });

  it("bloqueia envio duplicado enquanto a requisição está em trânsito", async () => {
    let resolve!: (value: typeof comment) => void;
    vi.mocked(commentService.create).mockReturnValue(new Promise((done) => { resolve = done; }));
    render(<PostComments postId="p1" />);
    open();
    fireEvent.change(await screen.findByRole("textbox"), { target: { value: "Oi" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar comentário" }));
    expect(screen.getByRole("button", { name: "Enviando comentário" })).toBeDisabled();
    expect(commentService.create).toHaveBeenCalledTimes(1);
    await act(async () => resolve(comment));
  });

  it("lista texto sem interpretar HTML e permite excluir o próprio comentário", async () => {
    vi.mocked(commentService.list).mockResolvedValue(page([{ ...comment, text: "<script>alert(1)</script>" }]));
    render(<PostComments postId="p1" />);
    open();
    expect(await screen.findByText("<script>alert(1)</script>")).toBeInTheDocument();
    expect(document.querySelector("script")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Ações do comentário de ana" }));
    expect(screen.queryByText("Denunciar")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Excluir"));
    await waitFor(() => expect(commentService.remove).toHaveBeenCalledWith("p1", "c1"));
  });

  it("oferece denúncia para comentário de outra pessoa", async () => {
    vi.mocked(commentService.list).mockResolvedValue(page([{ ...comment, canDelete: false, canReport: true }]));
    render(<PostComments postId="p1" />);
    open();
    fireEvent.click(await screen.findByRole("button", { name: "Ações do comentário de ana" }));
    expect(screen.queryByText("Excluir")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Denunciar"));
    expect(await screen.findByRole("heading", { name: "Denunciar comentário" })).toBeInTheDocument();
  });

  it("pagina e remove duplicatas", async () => {
    vi.mocked(commentService.list).mockResolvedValueOnce(page([comment], false))
      .mockResolvedValueOnce(page([comment, { ...comment, id: "c2", text: "Outro comentário" }]));
    render(<PostComments postId="p1" />);
    open();
    fireEvent.click(await screen.findByText("Ver mais comentários"));
    expect(await screen.findByText("Outro comentário")).toBeInTheDocument();
    expect(screen.getAllByText("Bom treino!")).toHaveLength(1);
    expect(commentService.list).toHaveBeenLastCalledWith("p1", 1);
  });

  it("revalida via REST após SSE e reconexão, invalidando caches", async () => {
    render(<PostComments postId="p1" />);
    open();
    await screen.findByText("Ainda não há comentários. Seja o primeiro!");
    vi.mocked(commentService.list).mockResolvedValue(page());
    act(() => events.listener?.({ type: "POST_COMMENTS_CHANGED", data: { postId: "p1" } }));
    expect(await screen.findByText("Bom treino!")).toBeInTheDocument();
    expect(pageCacheStorage.remove).toHaveBeenCalledWith("user1", "profile.posts");
    const calls = vi.mocked(commentService.list).mock.calls.length;
    act(() => window.dispatchEvent(new Event("beefit:social-connected")));
    await waitFor(() => expect(commentService.list).toHaveBeenCalledTimes(calls + 1));
  });

  it("descarta resposta atrasada de outra postagem", async () => {
    let resolve!: (value: ReturnType<typeof page>) => void;
    vi.mocked(commentService.list).mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    const { rerender } = render(<PostComments postId="p1" />);
    open();
    rerender(<PostComments postId="p2" />);
    await screen.findByText("Ainda não há comentários. Seja o primeiro!");
    await act(async () => resolve(page()));
    expect(screen.queryByText("Bom treino!")).not.toBeInTheDocument();
  });

  it("valida os eventos remotos antes de consumi-los", () => {
    expect(parseSocialEvent("POST_COMMENTS_CHANGED", { postId: "p1" })).toEqual({ type: "POST_COMMENTS_CHANGED", data: { postId: "p1" } });
    expect(parseSocialEvent("POST_COMMENTS_CHANGED", { text: "invalido" })).toBeNull();
  });

  it("atualiza contador após publicar e devolve foco ao fechar o painel", async () => {
    vi.mocked(commentService.list).mockResolvedValueOnce(page([])).mockResolvedValue(page());
    render(<PostComments postId="p1" />);
    open();
    await screen.findByText("Ainda não há comentários. Seja o primeiro!");
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Bom treino!" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar comentário" }));
    expect(await screen.findByText("Bom treino!")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Comentários: 1" })).toHaveFocus());
  });

  it("remove conteúdo anterior quando a revalidação perde autorização", async () => {
    vi.mocked(commentService.list).mockResolvedValueOnce(page()).mockRejectedValue(new Error("Postagem indisponível"));
    render(<PostComments postId="p1" />);
    open();
    await screen.findByText("Bom treino!");
    act(() => events.listener?.({ type: "POST_COMMENTS_CHANGED", data: { postId: "p1" } }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Postagem indisponível");
    expect(screen.queryByText("Bom treino!")).not.toBeInTheDocument();
  });
});
