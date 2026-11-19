import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../../auth/AuthContext";
import { commentService } from "../../../services/commentService";
import { subscribeSocialEvents } from "../../../services/socialEventsService";
import { pageCacheStorage } from "../../../storage/pageCacheStorage";
import type { PostComment } from "../../../types/comments";

export const COMMENT_MAX_LENGTH = 360;

export function usePostComments(postId: string, initialCount: number, open: boolean) {
  const { user } = useAuth();
  const [count, setCount] = useState(initialCount);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const generation = useRef(0);
  const request = useRef(0);
  const busy = useRef(false);
  const loadingRef = useRef(false);

  useEffect(() => { setCount(initialCount); }, [initialCount]);

  useEffect(() => {
    generation.current += 1;
    setComments([]);
    setText("");
    setCount(initialCount);
    setActionError("");
    busy.current = false;
    setSending(false);
    setDeletingId(null);
    return () => { generation.current += 1; request.current += 1; };
  }, [postId, user?.id]);

  const load = useCallback(async (nextPage = 0) => {
    const id = ++request.current;
    const currentGeneration = generation.current;
    loadingRef.current = true;
    setLoading(true);
    setError("");
    try {
      const result = await commentService.list(postId, nextPage);
      if (id !== request.current || currentGeneration !== generation.current) return;
      setComments((current) => nextPage === 0 ? result.content
        : [...current, ...result.content.filter((item) => !current.some((existing) => existing.id === item.id))]);
      setCount(result.totalElements);
      setHasMore(!result.last);
      setPage(nextPage);
    } catch (cause) {
      if (id !== request.current || currentGeneration !== generation.current) return;
      // Não manter conteúdo na tela quando a autorização foi revogada.
      setComments([]);
      setHasMore(false);
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar os comentários.");
    } finally {
      if (id === request.current && currentGeneration === generation.current) {
        loadingRef.current = false;
        setLoading(false);
      }
    }
  }, [postId, user?.id]);

  useEffect(() => {
    if (!open) {
      request.current += 1;
      loadingRef.current = false;
      return;
    }
    void load();
  }, [open, load]);

  useEffect(() => {
    let active = true;
    let countRequest = 0;
    const refresh = () => {
      void pageCacheStorage.remove(user?.id, "profile.posts");
      if (open) { void load(); return; }
      const id = ++countRequest;
      void commentService.count(postId).then((value) => {
        if (active && id === countRequest) setCount(value);
      }).catch(() => { /* A leitura do painel continua sendo autorizada por REST. */ });
    };
    const unsubscribe = commentService.subscribe((changedId) => { if (changedId === postId) refresh(); });
    const controller = new AbortController();
    void subscribeSocialEvents((event) => {
      if (event.type === "POST_COMMENTS_CHANGED" && event.data.postId === postId) commentService.invalidate(postId);
    }, controller.signal);
    // A lista é revalidada após retomar o app/rede; SSE não tem replay.
    const resume = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("online", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("beefit:social-connected", refresh);
    document.addEventListener("visibilitychange", resume);
    return () => {
      active = false;
      unsubscribe();
      controller.abort();
      window.removeEventListener("online", refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("beefit:social-connected", refresh);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [postId, user?.id, open, load]);

  async function send() {
    if (busy.current || !text.trim() || text.length > COMMENT_MAX_LENGTH) return;
    busy.current = true;
    setSending(true);
    setActionError("");
    const currentGeneration = generation.current;
    try {
      await commentService.create(postId, text);
      if (currentGeneration !== generation.current) return;
      setText("");
      await load();
    } catch (cause) {
      if (currentGeneration === generation.current) setActionError(cause instanceof Error ? cause.message : "Não foi possível enviar. Tente novamente.");
    } finally {
      if (currentGeneration === generation.current) { busy.current = false; setSending(false); }
    }
  }

  async function remove(commentId: string) {
    if (busy.current) return;
    busy.current = true;
    setDeletingId(commentId);
    setActionError("");
    const currentGeneration = generation.current;
    try {
      await commentService.remove(postId, commentId);
      if (currentGeneration === generation.current) await load();
    } catch (cause) {
      if (currentGeneration === generation.current) setActionError(cause instanceof Error ? cause.message : "Não foi possível excluir o comentário.");
    } finally {
      if (currentGeneration === generation.current) { busy.current = false; setDeletingId(null); }
    }
  }

  return { count, comments, text, setText, loading, sending, deletingId, error, actionError, hasMore,
    send, remove, retry: () => load(), loadMore: () => { if (!loadingRef.current && hasMore) void load(page + 1); } };
}
