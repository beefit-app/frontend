import { useEffect, useId, useRef, useState } from "react";
import { EllipsisVertical, Loader2, MessageCircle, Send } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../ui/sheet";
import { BeeButton } from "../BeeButton";
import { ReportSheet } from "../ReportSheet";
import { AuthenticatedImage } from "../AuthenticatedImage";
import { DeveloperBadge } from "../DeveloperBadge";
import { useConfirm } from "../../hooks/useConfirm";
import { formatPostDate } from "../../services/postDate";
import { COMMENT_MAX_LENGTH, usePostComments } from "./hooks/usePostComments";

export function PostComments({ postId, initialCount = 0 }: { postId: string; initialCount?: number }) {
  const [open, setOpen] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [viewport, setViewport] = useState<{ height: number; bottom: number } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const inputId = useId();
  const state = usePostComments(postId, initialCount, open);
  const { confirm, dialog } = useConfirm();

  useEffect(() => {
    if (!open || !window.visualViewport) return;
    const visualViewport = window.visualViewport;
    const resize = () => setViewport({ height: visualViewport.height, bottom: Math.max(0, window.innerHeight - visualViewport.height - visualViewport.offsetTop) });
    resize();
    visualViewport.addEventListener("resize", resize);
    visualViewport.addEventListener("scroll", resize);
    return () => { visualViewport.removeEventListener("resize", resize); visualViewport.removeEventListener("scroll", resize); };
  }, [open]);

  async function remove(id: string) {
    setMenuId(null);
    const ok = await confirm({ title: "Excluir comentário?", description: "Essa ação não pode ser desfeita.", confirmLabel: "Excluir", destructive: true });
    if (ok) await state.remove(id);
  }

  return (
    <>
      <button ref={trigger} type="button" onClick={() => setOpen(true)} aria-label={`Comentários: ${state.count}`}
        className="beefit-tap-target flex min-h-11 items-center gap-1.5 rounded-full border border-[#404040] bg-[#1A1A1A] px-3 text-[#A3A3A3]">
        <MessageCircle size={18} /><span className="font-inter text-xs">{state.count}</span>
      </button>
      <Sheet open={open} onOpenChange={(value) => { setOpen(value); setMenuId(null); }}>
        <SheetContent side="bottom" className="beefit-sheet-width gap-0 overflow-hidden rounded-t-[28px] border-[#2D2D2D] bg-[#141414] p-0 text-white"
          style={{ height: viewport ? Math.min(viewport.height * 0.9, 760) : "85dvh", bottom: viewport?.bottom ?? 0, maxHeight: "100dvh", paddingBottom: "var(--ion-safe-area-bottom, 0px)" }}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => { event.preventDefault(); trigger.current?.focus(); }}>
          <SheetHeader className="shrink-0 border-b border-[#2D2D2D] pr-12">
            <SheetTitle>Comentários</SheetTitle>
            <SheetDescription>{state.count} {state.count === 1 ? "comentário" : "comentários"} · mais recentes primeiro</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4" aria-busy={state.loading}>
            {state.loading && state.comments.length === 0 && <p role="status" className="py-8 text-center text-[#A3A3A3]">Carregando comentários...</p>}
            {state.error && <div role="alert" className="py-4 text-center"><p>{state.error}</p><BeeButton variant="dark" onClick={() => void state.retry()}>Tentar novamente</BeeButton></div>}
            {!state.loading && !state.error && state.comments.length === 0 && <p className="py-8 text-center text-[#A3A3A3]">Ainda não há comentários. Seja o primeiro!</p>}
            <ul className="flex flex-col gap-5">
              {state.comments.map((comment) => (
                <li key={comment.id} className="flex gap-3">
                  {comment.avatarUrl ? <AuthenticatedImage src={comment.avatarUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                    : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2D2D2D] text-xs">{comment.username.slice(0, 2).toUpperCase()}</span>}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><span className="font-montserrat text-sm font-bold">{comment.username}</span>{comment.developer && <DeveloperBadge compact />}</div>
                    <p className="whitespace-pre-wrap break-words font-inter text-sm text-[#D4D4D4]">{comment.text}</p>
                    <time dateTime={comment.createdAt} className="text-xs text-[#8A8A8A]">{formatPostDate(comment.createdAt)}</time>
                    {menuId === comment.id && <div className="mt-2 flex flex-wrap gap-2">
                      {comment.canDelete && <BeeButton variant="outline-red" size="sm" disabled={!!state.deletingId} onClick={() => void remove(comment.id)}>Excluir</BeeButton>}
                      {comment.canReport && <BeeButton variant="outline-red" size="sm" onClick={() => { setMenuId(null); setReportId(comment.id); }}>Denunciar</BeeButton>}
                    </div>}
                  </div>
                  {(comment.canDelete || comment.canReport) && <button type="button" className="flex h-11 w-11 shrink-0 items-center justify-center text-[#A3A3A3]" aria-label={`Ações do comentário de ${comment.username}`} aria-expanded={menuId === comment.id} onClick={() => setMenuId(menuId === comment.id ? null : comment.id)}><EllipsisVertical size={18} /></button>}
                </li>
              ))}
            </ul>
            {state.hasMore && <div className="mt-4 text-center"><BeeButton variant="dark" disabled={state.loading} onClick={state.loadMore}>{state.loading ? "Carregando..." : "Ver mais comentários"}</BeeButton></div>}
          </div>
          <form className="shrink-0 border-t border-[#2D2D2D] p-4" onSubmit={(event) => { event.preventDefault(); void state.send(); }}>
            <label htmlFor={inputId} className="sr-only">Seu comentário</label>
            <div className="flex items-end gap-2">
              <textarea id={inputId} name="comment" rows={2} maxLength={COMMENT_MAX_LENGTH} value={state.text} disabled={state.sending}
                onChange={(event) => state.setText(event.target.value)} placeholder="Adicione um comentário..."
                aria-describedby={`${inputId}-count`} className="min-w-0 flex-1 resize-none rounded-xl border border-[#404040] bg-[#1A1A1A] p-3 font-inter text-sm text-white focus:border-[#FFD700] focus:outline-none" />
              <button type="submit" disabled={!state.text.trim() || state.text.length > COMMENT_MAX_LENGTH || state.sending || !!state.deletingId || !!state.error}
                aria-label={state.sending ? "Enviando comentário" : "Enviar comentário"} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FFD700] text-black disabled:opacity-40">{state.sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}</button>
            </div>
            <p id={`${inputId}-count`} className="mt-1 text-right text-xs text-[#8A8A8A]">{state.text.length}/{COMMENT_MAX_LENGTH}</p>
            {state.actionError && <p role="alert" className="mt-2 text-sm text-[#FCA5A5]">{state.actionError}</p>}
          </form>
        </SheetContent>
      </Sheet>
      {dialog}
      <ReportSheet open={reportId !== null} onOpenChange={(value) => { if (!value) setReportId(null); }} targetType="COMMENT" targetId={reportId ?? ""} targetLabel="este comentário" />
    </>
  );
}
