import { useEffect, useState } from "react";
import {
  AlertCircle,
  Ban,
  BarChart3,
  Loader2,
  LogOut,
  Newspaper,
  Save,
  Search,
  Shield,
  Trash2,
  Undo2,
  Users,
} from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import {
  adminService,
  type AdminDashboardMetrics,
  type AdminPage,
  type AdminPost,
  type AdminUser,
} from "../../services/adminService";
import { ApiError } from "../../services/apiClient";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

type AdminView = "dashboard" | "users" | "posts";

const ADMIN_NAV_ITEMS: { id: AdminView; label: string; Icon: typeof BarChart3 }[] = [
  { id: "dashboard", label: "Dashboard", Icon: BarChart3 },
  { id: "users", label: "Usuários", Icon: Users },
  { id: "posts", label: "Posts", Icon: Newspaper },
];

const EMPTY_USERS_PAGE: AdminPage<AdminUser> = {
  content: [],
  number: 0,
  size: 10,
  totalElements: 0,
  totalPages: 1,
  first: true,
  last: true,
};

const EMPTY_POSTS_PAGE: AdminPage<AdminPost> = {
  content: [],
  number: 0,
  size: 10,
  totalElements: 0,
  totalPages: 1,
  first: true,
  last: true,
};

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      const errorCode =
        error.data && typeof error.data === "object" && "error" in error.data
          ? (error.data as Record<string, unknown>).error
          : null;
      if (errorCode === "AUTH_REQUIRED") {
        return "A requisição foi enviada sem autenticação. Faça login novamente e recarregue o painel.";
      }
      return "Sua sessão expirou ou é inválida. Faça login novamente.";
    }
    if (error.status === 403) {
      return "Você não tem permissão para acessar o painel administrativo.";
    }
    return error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return "Não foi possível carregar os dados administrativos.";
}

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR").format(value ?? 0);
}

function formatWeight(value: number | null | undefined) {
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value ?? 0)} kg`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatShortDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatDuration(seconds: number | null | undefined) {
  if (!seconds) return "-";
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} min`;
}

function PageStatus({
  loading,
  error,
  empty,
}: {
  loading: boolean;
  error: string | null;
  empty: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-[#D4D4D4]">
        <Loader2 className="size-4 animate-spin text-[#FFD700]" />
        Carregando dados
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-[#FCA5A5]">
        <AlertCircle className="size-4" />
        {error}
      </div>
    );
  }

  if (empty) {
    return <div className="py-10 text-center text-sm text-[#A3A3A3]">Nenhum registro encontrado.</div>;
  }

  return null;
}

function Pagination({
  page,
  totalPages,
  disabled,
  onChange,
}: {
  page: number;
  totalPages: number;
  disabled: boolean;
  onChange: (page: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-[#2D2D2D] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <span className="font-inter text-sm text-[#A3A3A3]">
        Página {page + 1} de {Math.max(totalPages, 1)}
      </span>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || page <= 0}
          onClick={() => onChange(page - 1)}
          className="border-[#3A3A3A] bg-[#141414] text-white hover:bg-[#202020]"
        >
          Anterior
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || page + 1 >= totalPages}
          onClick={() => onChange(page + 1)}
          className="border-[#3A3A3A] bg-[#141414] text-white hover:bg-[#202020]"
        >
          Próxima
        </Button>
      </div>
    </div>
  );
}

function DashboardView({
  metrics,
  loading,
  error,
}: {
  metrics: AdminDashboardMetrics | null;
  loading: boolean;
  error: string | null;
}) {
  const cards = [
    {
      label: "Usuários ativos",
      value: formatNumber(metrics?.totalActiveUsers),
      Icon: Users,
    },
    {
      label: "Treinos em 24h",
      value: formatNumber(metrics?.workoutsLast24Hours),
      Icon: BarChart3,
    },
    {
      label: "Volume total",
      value: formatWeight(metrics?.totalVolumeLifted),
      Icon: Shield,
    },
  ];

  return (
    <section className="space-y-4">
      <div>
        <h1 className="font-montserrat text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 font-inter text-sm text-[#A3A3A3]">Visão operacional da plataforma.</p>
      </div>

      <PageStatus loading={loading} error={error} empty={false} />

      {!loading && !error && (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {cards.map(({ label, value, Icon }) => (
            <div key={label} className="rounded-lg border border-[#2D2D2D] bg-[#141414] p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="font-inter text-sm text-[#A3A3A3]">{label}</span>
                <Icon className="size-5 text-[#FFD700]" />
              </div>
              <strong className="mt-4 block font-montserrat text-3xl font-bold text-white">{value}</strong>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function UsersView({
  page,
  search,
  banDays,
  loading,
  error,
  actionId,
  notice,
  onSearchChange,
  onSearchSubmit,
  onPageChange,
  onBanDaysChange,
  onBanUser,
  onUnbanUser,
}: {
  page: AdminPage<AdminUser>;
  search: string;
  banDays: number;
  loading: boolean;
  error: string | null;
  actionId: string | null;
  notice: string | null;
  onSearchChange: (search: string) => void;
  onSearchSubmit: () => void;
  onPageChange: (page: number) => void;
  onBanDaysChange: (days: number) => void;
  onBanUser: (userId: string) => void;
  onUnbanUser: (userId: string) => void;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-montserrat text-2xl font-bold text-white">Usuários</h1>
          <p className="mt-1 font-inter text-sm text-[#A3A3A3]">Busque contas e aplique ações de acesso.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative w-full sm:min-w-[260px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#737373]" />
            <Input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onSearchSubmit();
              }}
              placeholder="Buscar por nome, usuário ou email"
              className="border-[#3A3A3A] bg-[#101010] pl-9 text-white placeholder:text-[#737373]"
            />
          </div>
          <Input
            type="number"
            min={1}
            max={365}
            value={banDays}
            onChange={(event) => onBanDaysChange(Number(event.target.value) || 7)}
            className="w-full border-[#3A3A3A] bg-[#101010] text-white sm:w-24"
            aria-label="Dias de banimento"
          />
          <Button
            type="button"
            onClick={onSearchSubmit}
            className="bg-[#FFD700] text-[#0A0A0A] hover:bg-[#E0BC00]"
          >
            Buscar
          </Button>
        </div>
      </div>

      {notice && (
        <div className="rounded-lg border border-[#3A5F45] bg-[#122016] px-4 py-3 font-inter text-sm text-[#86EFAC]">
          {notice}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-[#2D2D2D] bg-[#141414]">
        <PageStatus loading={loading} error={error} empty={!loading && !error && page.content.length === 0} />
        {!loading && !error && page.content.length > 0 && (
          <>
            <Table>
              <TableHeader className="bg-[#101010]">
                <TableRow className="border-[#2D2D2D] hover:bg-[#101010]">
                  <TableHead className="px-4 text-[#D4D4D4]">Nome</TableHead>
                  <TableHead className="px-4 text-[#D4D4D4]">Usuário</TableHead>
                  <TableHead className="px-4 text-[#D4D4D4]">Email</TableHead>
                  <TableHead className="px-4 text-[#D4D4D4]">Meta</TableHead>
                  <TableHead className="px-4 text-[#D4D4D4]">Status</TableHead>
                  <TableHead className="px-4 text-right text-[#D4D4D4]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {page.content.map((user) => (
                  <TableRow key={user.id} className="border-[#2D2D2D] hover:bg-[#191919]">
                    <TableCell className="px-4 font-medium text-white">{user.fullName}</TableCell>
                    <TableCell className="px-4 text-[#D4D4D4]">@{user.username}</TableCell>
                    <TableCell className="max-w-[240px] truncate px-4 text-[#D4D4D4]">{user.email}</TableCell>
                    <TableCell className="px-4 text-[#D4D4D4]">{user.weeklyGoal ?? "-"}x/semana</TableCell>
                    <TableCell className="px-4">
                      <Badge
                        variant="outline"
                        className={user.banned ? "border-[#5F3B3B] text-[#FCA5A5]" : "border-[#3A5F45] text-[#86EFAC]"}
                      >
                        {user.banned ? `Banido ate ${formatShortDate(user.bannedUntil)}` : "Ativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={actionId === user.id || user.banned}
                          onClick={() => onBanUser(user.id)}
                          className="border-[#5F3B3B] bg-[#211313] text-[#FCA5A5] hover:bg-[#2A1717]"
                        >
                          {actionId === user.id ? <Loader2 className="size-4 animate-spin" /> : <Ban className="size-4" />}
                          Banir
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={actionId === user.id || !user.banned}
                          onClick={() => onUnbanUser(user.id)}
                          className="border-[#3A3A3A] bg-[#101010] text-white hover:bg-[#202020]"
                        >
                          <Undo2 className="size-4" />
                          Desbanir
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination page={page.number} totalPages={page.totalPages} disabled={loading} onChange={onPageChange} />
          </>
        )}
      </div>
    </section>
  );
}

function PostsView({
  page,
  loading,
  error,
  actionId,
  notice,
  editedTitles,
  onTitleChange,
  onPageChange,
  onSavePost,
  onRemovePost,
}: {
  page: AdminPage<AdminPost>;
  loading: boolean;
  error: string | null;
  actionId: string | null;
  notice: string | null;
  editedTitles: Record<string, string>;
  onTitleChange: (postId: string, title: string) => void;
  onPageChange: (page: number) => void;
  onSavePost: (postId: string) => void;
  onRemovePost: (postId: string) => void;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="font-montserrat text-2xl font-bold text-white">Posts</h1>
        <p className="mt-1 font-inter text-sm text-[#A3A3A3]">Modere publicações e ajuste títulos de treinos.</p>
      </div>

      {notice && (
        <div className="rounded-lg border border-[#3A5F45] bg-[#122016] px-4 py-3 font-inter text-sm text-[#86EFAC]">
          {notice}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-[#2D2D2D] bg-[#141414]">
        <PageStatus loading={loading} error={error} empty={!loading && !error && page.content.length === 0} />
        {!loading && !error && page.content.length > 0 && (
          <>
            <Table>
              <TableHeader className="bg-[#101010]">
                <TableRow className="border-[#2D2D2D] hover:bg-[#101010]">
                  <TableHead className="px-4 text-[#D4D4D4]">Título</TableHead>
                  <TableHead className="px-4 text-[#D4D4D4]">Autor</TableHead>
                  <TableHead className="px-4 text-[#D4D4D4]">Publicado</TableHead>
                  <TableHead className="px-4 text-[#D4D4D4]">Resumo</TableHead>
                  <TableHead className="px-4 text-[#D4D4D4]">Status</TableHead>
                  <TableHead className="px-4 text-right text-[#D4D4D4]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {page.content.map((post) => (
                  <TableRow key={post.id} className="border-[#2D2D2D] hover:bg-[#191919]">
                    <TableCell className="min-w-[240px] px-4">
                      <Input
                        value={editedTitles[post.id] ?? post.title ?? ""}
                        onChange={(event) => onTitleChange(post.id, event.target.value)}
                        className="border-[#3A3A3A] bg-[#101010] text-white placeholder:text-[#737373]"
                        placeholder="Sem título"
                        disabled={post.removed}
                      />
                    </TableCell>
                    <TableCell className="px-4 text-[#D4D4D4]">
                      <span className="block font-medium text-white">{post.userFullName}</span>
                      <span className="text-xs text-[#A3A3A3]">@{post.username}</span>
                    </TableCell>
                    <TableCell className="px-4 text-[#D4D4D4]">{formatDate(post.publishedAt)}</TableCell>
                    <TableCell className="max-w-[220px] truncate px-4 text-[#D4D4D4]">
                      {formatDuration(post.durationSeconds)} · {formatWeight(post.totalVolume)} · {post.totalLikes} likes
                    </TableCell>
                    <TableCell className="px-4">
                      <Badge
                        variant="outline"
                        className={post.removed ? "border-[#5F3B3B] text-[#FCA5A5]" : "border-[#3A5F45] text-[#86EFAC]"}
                      >
                        {post.removed ? "Removido" : "Publicado"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={actionId === post.id || post.removed}
                          onClick={() => onSavePost(post.id)}
                          className="border-[#3A3A3A] bg-[#101010] text-white hover:bg-[#202020]"
                        >
                          {actionId === post.id ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                          Salvar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={actionId === post.id || post.removed}
                          onClick={() => onRemovePost(post.id)}
                          className="border-[#5F3B3B] bg-[#211313] text-[#FCA5A5] hover:bg-[#2A1717]"
                        >
                          <Trash2 className="size-4" />
                          Remover
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination page={page.number} totalPages={page.totalPages} disabled={loading} onChange={onPageChange} />
          </>
        )}
      </div>
    </section>
  );
}

export function AdminScreen() {
  const { user, logout } = useAuth();
  const [view, setView] = useState<AdminView>("dashboard");
  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);
  const [usersPage, setUsersPage] = useState<AdminPage<AdminUser>>(EMPTY_USERS_PAGE);
  const [postsPage, setPostsPage] = useState<AdminPage<AdminPost>>(EMPTY_POSTS_PAGE);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [banDays, setBanDays] = useState(7);
  const [usersLoading, setUsersLoading] = useState(false);
  const [postsLoading, setPostsLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [usersNotice, setUsersNotice] = useState<string | null>(null);
  const [postsNotice, setPostsNotice] = useState<string | null>(null);
  const [editedTitles, setEditedTitles] = useState<Record<string, string>>({});

  const isPermissionError = dashboardError?.includes("não tem permissão") ?? false;

  async function loadDashboard() {
    setDashboardLoading(true);
    setDashboardError(null);
    try {
      setMetrics(await adminService.getDashboard());
    } catch (error) {
      setDashboardError(getErrorMessage(error));
    } finally {
      setDashboardLoading(false);
    }
  }

  async function loadUsers(page = usersPage.number) {
    setUsersLoading(true);
    setUsersError(null);
    setUsersNotice(null);
    try {
      setUsersPage(await adminService.getUsers(search, page));
    } catch (error) {
      setUsersError(getErrorMessage(error));
    } finally {
      setUsersLoading(false);
    }
  }

  async function loadPosts(page = postsPage.number) {
    setPostsLoading(true);
    setPostsError(null);
    setPostsNotice(null);
    try {
      const nextPage = await adminService.getPosts(page);
      setPostsPage(nextPage);
      setEditedTitles(
        Object.fromEntries(nextPage.content.map((post) => [post.id, post.title ?? ""])),
      );
    } catch (error) {
      setPostsError(getErrorMessage(error));
    } finally {
      setPostsLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  useEffect(() => {
    if (view === "users") {
      void loadUsers(0);
    }
  }, [view, search]);

  useEffect(() => {
    if (view === "posts") {
      void loadPosts(0);
    }
  }, [view]);

  async function handleBanUser(userId: string) {
    setActionId(userId);
    setUsersError(null);
    setUsersNotice(null);
    try {
      const response = await adminService.banUser(userId, banDays);
      await loadUsers(usersPage.number);
      setUsersNotice(
        `@${response.username} banido por ${response.banDays} dia(s). Termina em ${formatShortDate(response.bannedUntil)}.`,
      );
    } catch (error) {
      setUsersError(getErrorMessage(error));
    } finally {
      setActionId(null);
    }
  }

  async function handleUnbanUser(userId: string) {
    setActionId(userId);
    setUsersError(null);
    setUsersNotice(null);
    try {
      const response = await adminService.unbanUser(userId);
      await loadUsers(usersPage.number);
      setUsersNotice(`@${response.username} foi desbanido.`);
    } catch (error) {
      setUsersError(getErrorMessage(error));
    } finally {
      setActionId(null);
    }
  }

  async function handleSavePost(postId: string) {
    setActionId(postId);
    setPostsError(null);
    setPostsNotice(null);
    try {
      await adminService.updatePostTitle(postId, editedTitles[postId] ?? "");
      await loadPosts(postsPage.number);
      setPostsNotice("Titulo do post atualizado.");
    } catch (error) {
      setPostsError(getErrorMessage(error));
    } finally {
      setActionId(null);
    }
  }

  async function handleRemovePost(postId: string) {
    setActionId(postId);
    setPostsError(null);
    setPostsNotice(null);
    try {
      await adminService.removePost(postId);
      await loadPosts(postsPage.number);
      setPostsNotice("Post removido da plataforma.");
    } catch (error) {
      setPostsError(getErrorMessage(error));
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] pt-[env(safe-area-inset-top)] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col lg:flex-row">
        <aside className="border-b border-[#2D2D2D] bg-[#101010] px-4 py-4 lg:w-64 lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
          <div className="flex items-center justify-between gap-3 lg:block">
            <div>
              <div className="flex items-center gap-2 font-montserrat text-lg font-bold">
                <Shield className="size-5 text-[#FFD700]" />
                BeeFit Admin
              </div>
              <p className="mt-1 hidden text-sm text-[#A3A3A3] lg:block">{user?.name ?? "Administrador"}</p>
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => void logout()}
              className="text-[#A3A3A3] hover:bg-[#1A1A1A] hover:text-white lg:hidden"
              aria-label="Sair"
            >
              <LogOut className="size-5" />
            </Button>
          </div>

          <nav className="mt-4 flex gap-2 overflow-x-auto lg:mt-8 lg:flex-col lg:overflow-visible" aria-label="Administração">
            {ADMIN_NAV_ITEMS.map(({ id, label, Icon }) => {
              const active = view === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setView(id)}
                  className={`flex min-h-10 shrink-0 items-center gap-2 rounded-md px-3 py-2 font-montserrat text-sm font-bold transition-colors ${
                    active
                      ? "bg-[#FFD700] text-[#0A0A0A]"
                      : "text-[#D4D4D4] hover:bg-[#1A1A1A] hover:text-white"
                  }`}
                >
                  <Icon className="size-4" />
                  {label}
                </button>
              );
            })}
          </nav>

          <Button
            type="button"
            variant="ghost"
            onClick={() => void logout()}
            className="mt-8 hidden w-full justify-start text-[#A3A3A3] hover:bg-[#1A1A1A] hover:text-white lg:flex"
          >
            <LogOut className="size-4" />
            Sair
          </Button>
        </aside>

        <main className="flex-1 px-4 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8 lg:py-8">
          {isPermissionError ? (
            <div className="flex min-h-[60vh] items-center justify-center">
              <div className="max-w-md rounded-lg border border-[#5F3B3B] bg-[#141414] p-6 text-center">
                <AlertCircle className="mx-auto size-8 text-[#FCA5A5]" />
                <h1 className="mt-4 font-montserrat text-xl font-bold text-white">Acesso restrito</h1>
                <p className="mt-2 font-inter text-sm text-[#D4D4D4]">{dashboardError}</p>
              </div>
            </div>
          ) : (
            <>
              {view === "dashboard" && (
                <DashboardView metrics={metrics} loading={dashboardLoading} error={dashboardError} />
              )}
              {view === "users" && (
                <UsersView
                  page={usersPage}
                  search={searchDraft}
                  banDays={banDays}
                  loading={usersLoading}
                  error={usersError}
                  actionId={actionId}
                  notice={usersNotice}
                  onSearchChange={setSearchDraft}
                  onSearchSubmit={() => setSearch(searchDraft.trim())}
                  onPageChange={(page) => void loadUsers(page)}
                  onBanDaysChange={(days) => setBanDays(Math.min(365, Math.max(1, days)))}
                  onBanUser={(userId) => void handleBanUser(userId)}
                  onUnbanUser={(userId) => void handleUnbanUser(userId)}
                />
              )}
              {view === "posts" && (
                <PostsView
                  page={postsPage}
                  loading={postsLoading}
                  error={postsError}
                  actionId={actionId}
                  notice={postsNotice}
                  editedTitles={editedTitles}
                  onTitleChange={(postId, title) => setEditedTitles((current) => ({ ...current, [postId]: title }))}
                  onPageChange={(page) => void loadPosts(page)}
                  onSavePost={(postId) => void handleSavePost(postId)}
                  onRemovePost={(postId) => void handleRemovePost(postId)}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
