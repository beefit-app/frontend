import { IonCol, IonGrid, IonRow } from "@ionic/react";
import {
  Copy,
  Crown,
  Ellipsis,
  Plus,
  Search,
  Trophy,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion as Motion } from "motion/react";
import { forwardRef, useEffect, useState, type ReactNode } from "react";
import { BeeButton } from "../../BeeButton";
import { BeeInput } from "../../BeeInput";
import { PageBackground } from "../../PageBackground";
import { PublicProfilePage } from "../../profile/components/PublicProfileSheet";
import { HexAvatar } from "../../workout-post";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../../ui/sheet";
import type { useSocialState } from "../hooks/useSocialState";
import type { FriendProfile, Hive, HiveRankingPeriod } from "../types";

type SocialState = ReturnType<typeof useSocialState>;
const HEX_CLIP = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";

function HiveIcon({ active = false, size = 17 }: { active?: boolean; size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: size,
        height: Math.round(size * 1.14),
        clipPath: HEX_CLIP,
        background: active ? "#0A0A0A" : "#FFD700",
        opacity: active ? 1 : 0.92,
      }}
    />
  );
}

function SectionTitle({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      {icon}
      <h2 className="font-montserrat text-[11px] font-bold uppercase tracking-[0.1em] text-[#737373]">
        {children}
      </h2>
    </div>
  );
}

function SmallButton({
  children,
  onClick,
  variant = "neutral",
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  variant?: "gold" | "neutral" | "danger";
  disabled?: boolean;
}) {
  const tones = {
    gold: "border-[rgba(255,215,0,0.4)] bg-[rgba(255,215,0,0.12)] text-[#FFD700]",
    neutral: "border-[#404040] bg-[#202020] text-[#D4D4D4]",
    danger: "border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.1)] text-[#FCA5A5]",
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full border px-3 py-2 font-montserrat text-[10px] font-bold uppercase tracking-[0.04em] transition-opacity disabled:cursor-not-allowed disabled:opacity-45 ${tones[variant]}`}
    >
      {children}
    </button>
  );
}

function Notice({
  message,
  tone,
  onClose,
}: {
  message: string;
  tone: "success" | "error";
  onClose: () => void;
}) {
  const toneStyle =
    tone === "success"
      ? "border-[rgba(255,215,0,0.28)] bg-[rgba(255,215,0,0.09)] text-[#FFE44D]"
      : "border-[rgba(239,68,68,0.26)] bg-[rgba(239,68,68,0.1)] text-[#FCA5A5]";

  return (
    <Motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18 }}
      className={`mb-5 flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${toneStyle}`}
    >
      <p className="font-inter text-[12px] font-medium leading-5">{message}</p>
      <button type="button" aria-label="Fechar mensagem" onClick={onClose} className="shrink-0">
        <X size={14} />
      </button>
    </Motion.div>
  );
}

function PersonIdentity({ person }: { person: FriendProfile }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <HexAvatar initials={person.initials} size={36} />
      <div className="min-w-0">
        <p className="truncate font-montserrat text-[13px] font-bold text-white">{person.name}</p>
        <p className="truncate font-inter text-[11px] font-medium text-[#737373]">{person.username}</p>
      </div>
    </div>
  );
}

const EllipsisActionButton = forwardRef<HTMLButtonElement, React.ComponentProps<"button">>(
  ({ className, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={`beefit-tap-target flex h-10 w-10 items-center justify-center rounded-[12px] border border-[#2D2D2D] bg-[#181818] text-[#A3A3A3] transition-colors hover:border-[#525252] hover:text-white ${className ?? ""}`}
      {...props}
    >
      <Ellipsis size={16} />
    </button>
  ),
);

EllipsisActionButton.displayName = "EllipsisActionButton";

function FriendsPanel({
  state,
  onOpenProfile,
}: {
  state: SocialState;
  onOpenProfile: (username: string) => void;
}) {
  const [selectedFriend, setSelectedFriend] = useState<FriendProfile | null>(null);
  const [friendActionsOpen, setFriendActionsOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      {state.friendRequests.length > 0 && (
        <section>
          <SectionTitle icon={<UserPlus size={14} color="#FFD700" />}>
            Solicitações recebidas
          </SectionTitle>
          <div className="flex flex-col gap-2.5">
            {state.friendRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between gap-2 rounded-[18px] border border-[#2D2D2D] bg-[#171717] p-3"
              >
                <button
                  type="button"
                  onClick={() => onOpenProfile(request.profile.username)}
                  className="min-w-0 flex-1 text-left"
                >
                  <PersonIdentity person={request.profile} />
                </button>
                <div className="flex shrink-0 gap-1.5">
                  <SmallButton variant="gold" onClick={() => state.acceptFriendRequest(request.id)}>
                    Aceitar
                  </SmallButton>
                  <SmallButton onClick={() => state.rejectFriendRequest(request.id)}>Recusar</SmallButton>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {state.sentRequests.length > 0 && (
        <section>
          <SectionTitle icon={<UserPlus size={14} color="#737373" />}>
            Solicitações enviadas
          </SectionTitle>
          <div className="flex flex-col gap-2.5">
            {state.sentRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between gap-2 rounded-[18px] border border-[#2D2D2D] bg-[#171717] p-3"
              >
                <button
                  type="button"
                  onClick={() => onOpenProfile(request.profile.username)}
                  className="min-w-0 flex-1 text-left"
                >
                  <PersonIdentity person={request.profile} />
                </button>
                <span className="rounded-full bg-[#202020] px-3 py-1.5 font-inter text-[10px] font-bold uppercase tracking-wide text-[#A3A3A3]">
                  Enviada
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <SectionTitle icon={<Users size={14} color="#FFD700" />}>Seus amigos</SectionTitle>
          <span className="font-montserrat text-[14px] font-bold text-[#FFD700]">{state.friends.length}</span>
        </div>
        <div className="flex flex-col gap-2.5">
          {state.friends.map((friend) => (
            <div key={friend.id} className="flex items-center justify-between rounded-[18px] border border-[#2D2D2D] bg-[#171717] p-3">
              <button
                type="button"
                onClick={() => onOpenProfile(friend.username)}
                className="min-w-0 flex-1 text-left"
              >
                <PersonIdentity person={friend} />
              </button>
              <EllipsisActionButton
                aria-label={`Abrir ações de ${friend.name}`}
                onClick={() => {
                  setSelectedFriend(friend);
                  setFriendActionsOpen(true);
                }}
              />
            </div>
          ))}
        </div>
      </section>

      <Sheet open={friendActionsOpen} onOpenChange={setFriendActionsOpen}>
        <SheetContent side="bottom" className="beefit-sheet-width rounded-t-[28px] border-[#2D2D2D] bg-[#141414] px-5 pb-7 pt-3 text-white">
          <SheetHeader className="px-0 pb-3 pt-3 text-left">
            <SheetTitle className="font-montserrat text-[20px] font-bold text-white">
              {selectedFriend?.name ?? "Ações do amigo"}
            </SheetTitle>
            <SheetDescription className="font-inter text-[13px] text-[#737373]">
              Escolha uma ação para este amigo.
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-2.5">
            <BeeButton
              variant="dark"
              fullWidth
              onClick={() => {
                if (selectedFriend) onOpenProfile(selectedFriend.username);
                setFriendActionsOpen(false);
              }}
            >
              Ver perfil
            </BeeButton>
            <BeeButton
              variant="red"
              fullWidth
              onClick={() => {
                if (selectedFriend?.friendshipId) state.removeFriend(selectedFriend.friendshipId);
                setFriendActionsOpen(false);
              }}
            >
              Remover amigo
            </BeeButton>
          </div>
        </SheetContent>
      </Sheet>

    </div>
  );
}

function HiveCard({
  hive,
  active,
  position,
  onSelect,
}: {
  hive: Hive;
  active: boolean;
  position: number;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`min-w-[270px] rounded-[20px] border p-4 text-left transition-colors ${
        active
          ? "border-[rgba(255,215,0,0.45)] bg-[linear-gradient(145deg,rgba(255,215,0,0.12),#171717_46%)]"
          : "border-[#2D2D2D] bg-[#171717]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="mb-2 block font-inter text-[10px] font-bold uppercase tracking-[0.1em] text-[#B8A65A]">
            {hive.period}
          </span>
          <span className="block font-montserrat text-[15px] font-bold text-white">{hive.name}</span>
          <span className="mt-1 block font-inter text-[11px] text-[#737373]">{hive.members.length} membros</span>
        </div>
        <div className="flex h-11 w-11 flex-col items-center justify-center rounded-[13px] border border-[rgba(255,215,0,0.24)] bg-[rgba(255,215,0,0.1)]">
          <span className="font-montserrat text-[16px] font-extrabold leading-none text-[#FFD700]">#{position}</span>
          <span className="font-inter text-[8px] uppercase text-[#B8A65A]">você</span>
        </div>
      </div>
    </button>
  );
}

function AddHiveCard({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-w-[270px] rounded-[20px] border border-dashed border-[rgba(255,215,0,0.5)] bg-[rgba(255,215,0,0.1)] p-4 text-left transition-colors"
      style={{ height: 100 }}
    >
      <div className="flex h-full items-center justify-center">
        <div className="flex h-[58px] w-[58px] items-center justify-center rounded-[18px] border border-[rgba(255,228,77,0.25)] bg-[rgba(255,215,0,0.14)] text-[#FFE44D]">
          <Plus size={24} />
        </div>
      </div>
    </button>
  );
}

function RankingPanel({
  hive,
  state,
  onOpenProfile,
  onRequestLeave,
}: {
  hive: Hive;
  state: SocialState;
  onOpenProfile: (username: string) => void;
  onRequestLeave: () => void;
}) {
  const rankedMembers = state.rankMembers(hive);
  const [hiveActionsOpen, setHiveActionsOpen] = useState(false);

  return (
    <div className="rounded-[22px] border border-[#2D2D2D] bg-[#141414] p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <span className="font-inter text-[10px] font-bold uppercase tracking-[0.1em] text-[#737373]">
            Ranking {hive.period.toLocaleLowerCase()}
          </span>
          <h3 className="mt-1 font-montserrat text-[17px] font-bold text-white">{hive.name}</h3>
        </div>
        <EllipsisActionButton aria-label="Ações da colmeia" onClick={() => setHiveActionsOpen(true)} />
      </div>

      <div className="flex flex-col gap-2">
        {rankedMembers.map((member, index) => (
          <button
            type="button"
            key={member.id}
            onClick={() => onOpenProfile(member.username)}
            className={`flex w-full items-center gap-3 rounded-[16px] border px-3 py-2.5 text-left transition-colors ${
              member.isCurrentUser
                ? "border-[rgba(255,215,0,0.3)] bg-[rgba(255,215,0,0.07)]"
                : "border-[#262626] bg-[#181818] hover:border-[#404040]"
            }`}
          >
            <span className={`w-6 font-montserrat text-[13px] font-bold ${index === 0 ? "text-[#FFD700]" : "text-[#737373]"}`}>
              {index === 0 ? <Crown size={14} color="#FFD700" /> : index + 1}
            </span>
            <HexAvatar initials={member.initials} size={22} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-montserrat text-[12px] font-bold text-white">{member.name}</p>
              <p className="font-inter text-[10px] text-[#737373]">{member.honeys} Honeys</p>
            </div>
            <span className="font-montserrat text-[13px] font-bold text-[#FFD700]">{member.workouts}</span>
            <span className="font-inter text-[10px] text-[#737373]">treinos</span>
          </button>
        ))}
      </div>

      <Sheet open={hiveActionsOpen} onOpenChange={setHiveActionsOpen}>
        <SheetContent side="bottom" className="beefit-sheet-width rounded-t-[28px] border-[#2D2D2D] bg-[#141414] px-5 pb-7 pt-3 text-white">
          <SheetHeader className="px-0 pb-3 pt-3 text-left">
            <SheetTitle className="font-montserrat text-[20px] font-bold text-white">
              {hive.name}
            </SheetTitle>
            <SheetDescription className="font-inter text-[13px] text-[#737373]">
              Escolha uma ação para esta colmeia.
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-2.5">
            <BeeButton
              variant="dark"
              fullWidth
              onClick={() => {
                state.copyInviteCode(hive);
                setHiveActionsOpen(false);
              }}
            >
              Copiar código
            </BeeButton>
            <BeeButton
              variant="red"
              fullWidth
              onClick={() => {
                setHiveActionsOpen(false);
                onRequestLeave();
              }}
            >
              Sair da colmeia
            </BeeButton>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function HiveSheet({
  mode,
  open,
  onOpenChange,
  state,
}: {
  mode: "create" | "join";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: SocialState;
}) {
  const [name, setName] = useState("");
  const [period, setPeriod] = useState<HiveRankingPeriod>("Semanal");
  const [code, setCode] = useState("");
  const title = mode === "create" ? "Criar Colmeia" : "Entrar por convite";

  function submit() {
    const saved = mode === "create" ? state.createHive(name, period) : state.joinHive(code);
    if (!saved) return;

    setName("");
    setCode("");
    setPeriod("Semanal");
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="beefit-sheet-width rounded-t-[28px] border-[#2D2D2D] bg-[#141414] px-5 pb-7 pt-3 text-white">
        <SheetHeader className="px-0 pb-3 pt-3 text-left">
          <SheetTitle className="font-montserrat text-[20px] font-bold text-white">{title}</SheetTitle>
          <SheetDescription className="font-inter text-[13px] text-[#737373]">
            {mode === "create"
              ? "Defina a disputa e compartilhe o código com seus amigos."
              : "Use o código recebido para participar do ranking."}
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4">
          {mode === "create" ? (
            <>
              <BeeInput label="Nome" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex: Colmeia do Leg Day" />
              <div>
                <p className="mb-2 font-montserrat text-[12px] font-bold uppercase tracking-wide text-[#D4D4D4]">Período</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["Semanal", "Mensal"] as HiveRankingPeriod[]).map((option) => (
                    <button
                      type="button"
                      key={option}
                      onClick={() => setPeriod(option)}
                      className={`rounded-[14px] border px-3 py-3 font-montserrat text-[12px] font-bold ${
                        period === option
                          ? "border-[#FFD700] bg-[rgba(255,215,0,0.12)] text-[#FFD700]"
                          : "border-[#404040] bg-[#1A1A1A] text-[#A3A3A3]"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <BeeInput label="Código do convite" value={code} onChange={(event) => setCode(event.target.value)} placeholder="Ex: BEE-POWER" />
          )}
          <BeeButton variant="primary" fullWidth onClick={submit}>
            {mode === "create" ? "Criar Colmeia" : "Entrar na Colmeia"}
          </BeeButton>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function HivesPanel({ state, onOpenProfile }: { state: SocialState; onOpenProfile: (username: string) => void }) {
  const [actionOpen, setActionOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [leaveConfirmationOpen, setLeaveConfirmationOpen] = useState(false);

  const currentPosition = (hive: Hive) =>
    state.rankMembers(hive).findIndex((member) => member.isCurrentUser) + 1;

  function openHiveAction(action: "create" | "join") {
    if (state.isHiveLimitReached) {
      state.showHiveLimitWarning();
      return;
    }

    if (action === "create") setCreateOpen(true);
    else setJoinOpen(true);
  }

  return (
    <div className="flex flex-col gap-5">
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <SectionTitle icon={<HiveIcon size={13} />}>Suas Colmeias</SectionTitle>
          <span className="font-montserrat text-[14px] font-bold text-[#FFD700]">{state.hives.length}</span>
        </div>
        {(state.hives.length > 0 || !state.isHiveLimitReached) && (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {state.hives.map((hive) => (
              <HiveCard
                key={hive.id}
                hive={hive}
                active={state.selectedHive?.id === hive.id}
                position={currentPosition(hive)}
                onSelect={() => state.setSelectedHiveId(hive.id)}
              />
            ))}
            {!state.isHiveLimitReached && (
              <AddHiveCard onClick={() => setActionOpen(true)} />
            )}
          </div>
        )}
      </section>

      {state.selectedHive && (
        <section>
          <SectionTitle icon={<Trophy size={14} color="#FFD700" />}>Classificação</SectionTitle>
          <RankingPanel
            hive={state.selectedHive}
            state={state}
            onOpenProfile={onOpenProfile}
            onRequestLeave={() => setLeaveConfirmationOpen(true)}
          />
        </section>
      )}

      <Sheet open={actionOpen} onOpenChange={setActionOpen}>
        <SheetContent side="bottom" className="beefit-sheet-width rounded-t-[28px] border-[#2D2D2D] bg-[#141414] px-5 pb-7 pt-3 text-white">
          <SheetHeader className="px-0 pb-3 pt-3 text-left">
            <SheetTitle className="font-montserrat text-[20px] font-bold text-white">Adicionar Colmeia</SheetTitle>
            <SheetDescription className="font-inter text-[13px] text-[#737373]">
              Escolha se você quer criar uma colmeia nova ou entrar com um convite.
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-2.5">
            <BeeButton
              variant="primary"
              fullWidth
              onClick={() => {
                setActionOpen(false);
                openHiveAction("create");
              }}
            >
              Criar Colmeia
            </BeeButton>
            <BeeButton
              variant="dark"
              fullWidth
              onClick={() => {
                setActionOpen(false);
                openHiveAction("join");
              }}
            >
              Entrar por convite
            </BeeButton>
          </div>
        </SheetContent>
      </Sheet>
      <HiveSheet mode="create" open={createOpen} onOpenChange={setCreateOpen} state={state} />
      <HiveSheet mode="join" open={joinOpen} onOpenChange={setJoinOpen} state={state} />
      <Sheet open={leaveConfirmationOpen} onOpenChange={setLeaveConfirmationOpen}>
        <SheetContent side="bottom" className="beefit-sheet-width rounded-t-[28px] border-[#2D2D2D] bg-[#141414] px-5 pb-7 pt-4 text-white">
          <SheetHeader className="px-0 text-left">
            <SheetTitle className="font-montserrat text-[18px] font-bold text-white">Sair da Colmeia?</SheetTitle>
            <SheetDescription className="font-inter text-[13px] text-[#737373]">
              {state.selectedHive?.creatorId === state.user?.id
                ? (state.selectedHive?.members.length ?? 0) <= 1
                  ? "Como você é o criador e único membro, a Colmeia será excluída permanentemente."
                  : "Como você é o criador, a posse da Colmeia será transferida para o primeiro colocado do ranking."
                : "Sua posição deixará de aparecer neste ranking."}
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-2.5">
            <BeeButton
              variant="red"
              fullWidth
              onClick={() => {
                if (state.selectedHive) state.leaveHive(state.selectedHive.id);
                setLeaveConfirmationOpen(false);
              }}
            >
              Confirmar saída
            </BeeButton>
            <BeeButton variant="dark" fullWidth onClick={() => setLeaveConfirmationOpen(false)}>
              Cancelar
            </BeeButton>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function SocialView({
  state,
  profileUsername,
  onOpenProfileFromSocial,
  onProfileClosed,
}: {
  state: SocialState;
  profileUsername?: string | null;
  onOpenProfileFromSocial?: () => void;
  onProfileClosed?: () => void;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedProfileUsername, setSelectedProfileUsername] = useState<string | null>(null);
  const activeProfileUsername = profileUsername ?? selectedProfileUsername;

  function openProfileFromSocial(username: string) {
    onOpenProfileFromSocial?.();
    setSelectedProfileUsername(username);
  }

  useEffect(() => {
    if (!state.activeSection || state.activeSection !== "friends") {
      setSearchOpen(false);
      state.setSearchTerm("");
      return;
    }
  }, [state.activeSection, state.setSearchTerm]);

  function openFriendsUtility() {
    state.setActiveSection("friends");
    setSearchOpen((current) => !current);
  }

  if (activeProfileUsername) {
    return (
      <PublicProfilePage
        username={activeProfileUsername}
        onBack={() => {
          setSelectedProfileUsername(null);
          onProfileClosed?.();
        }}
        onFriendshipChange={() => {
          void state.refreshFriendships(false);
        }}
      />
    );
  }

  return (
    <PageBackground>
      <IonGrid fixed className="relative z-10 px-3 pb-8 pt-7">
        <IonRow className="ion-justify-content-center">
          <IonCol size="12">
            <header className="relative mb-6">
              <div className="absolute right-0 top-0 flex gap-2">
                <button
                  type="button"
                  onClick={() => openFriendsUtility()}
                  aria-label={searchOpen ? "Fechar busca de amigos" : "Pesquisar amigos"}
                  className={`beefit-tap-target flex h-10 w-10 items-center justify-center rounded-[13px] border transition-colors ${
                    searchOpen
                      ? "border-[rgba(255,215,0,0.32)] bg-[rgba(255,215,0,0.1)] text-[#FFD700]"
                      : "border-[#2D2D2D] bg-[#141414] text-[#A3A3A3]"
                  }`}
                >
                  <Search size={18} />
                </button>
              </div>

              <div className="pr-[98px]">
                <h1 className="font-montserrat text-[34px] font-[800] leading-none text-[#FFD700]">
                  Social.
                </h1>
              </div>
              <p className="mt-2 max-w-[320px] font-inter text-[14px] leading-[1.45] text-[#A3A3A3]">
                Conecte-se com amigos e dispute consistencia em suas Colmeias.
              </p>
            </header>

            {state.activeSection === "friends" && (
              <AnimatePresence initial={false}>
                {searchOpen && (
                  <Motion.section
                    key="search"
                    initial={{ opacity: 0, height: 0, y: -8 }}
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -8 }}
                    transition={{ duration: 0.22 }}
                    className="mb-5 overflow-hidden"
                  >
                    <BeeInput
                      value={state.searchTerm}
                      onChange={(event) => state.setSearchTerm(event.target.value)}
                      icon={<Search size={17} />}
                      placeholder="Buscar por nome ou usuário"
                    />
                    {state.searchTerm.trim() && (
                      <div className="mt-3 flex flex-col gap-2.5">
                        {state.searchResults.length === 0 && (
                          <p className="rounded-[18px] border border-dashed border-[#2D2D2D] px-4 py-4 text-center font-inter text-[12px] text-[#737373]">
                            Nenhuma pessoa encontrada.
                          </p>
                        )}
                        {state.searchResults.map((person) => (
                          <div key={person.id} className="flex items-center justify-between gap-3 rounded-[18px] border border-[#2D2D2D] bg-[#171717] p-3">
                            <button
                              type="button"
                              onClick={() => openProfileFromSocial(person.username)}
                              className="min-w-0 flex-1 bg-transparent p-0 text-left"
                            >
                              <PersonIdentity person={person} />
                            </button>
                            {person.status === "friend" ? (
                              <span className="rounded-full bg-[rgba(34,197,94,0.12)] px-3 py-1.5 font-inter text-[10px] font-bold uppercase tracking-wide text-[#4ADE80]">
                                Amigo
                              </span>
                            ) : (
                              <SmallButton
                                variant={person.status === "sent" ? "neutral" : "gold"}
                                disabled={person.status === "sent"}
                                onClick={() => state.sendFriendRequest(person.id)}
                              >
                                {person.status === "sent" ? "Enviada" : "Adicionar"}
                              </SmallButton>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </Motion.section>
                )}
              </AnimatePresence>
            )}

            <AnimatePresence initial={false}>
              {(state.feedback || state.error) && (
                <Notice
                  message={state.error ?? state.feedback ?? ""}
                  tone={state.error ? "error" : "success"}
                  onClose={state.clearMessage}
                />
              )}
            </AnimatePresence>

            <nav className="mb-6 grid grid-cols-2 rounded-[18px] border border-[#2D2D2D] bg-[#141414] p-1.5" aria-label="Seções sociais">
              {[
                { id: "friends" as const, label: "Amigos", icon: <Users size={15} /> },
                { id: "hives" as const, label: "Colmeias", icon: <HiveIcon /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => state.setActiveSection(tab.id)}
                  className={`relative flex min-h-11 items-center justify-center gap-2 rounded-[13px] px-3 py-3 font-montserrat text-[12px] font-bold uppercase tracking-wide ${
                    state.activeSection === tab.id ? "text-[#0A0A0A]" : "text-[#737373]"
                  }`}
                >
                  {state.activeSection === tab.id && (
                    <Motion.span
                      layoutId="social-tab-highlight"
                      className="absolute inset-0 rounded-[13px] bg-[#FFD700]"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    {tab.id === "hives" ? <HiveIcon active={state.activeSection === tab.id} /> : tab.icon}
                    {tab.label}
                  </span>
                </button>
              ))}
            </nav>

            <AnimatePresence mode="wait" initial={false}>
              <Motion.div
                key={state.activeSection}
                initial={{ opacity: 0, x: state.activeSection === "friends" ? -12 : 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: state.activeSection === "friends" ? -12 : 12 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                {state.activeSection === "friends" ? (
                  <FriendsPanel state={state} onOpenProfile={openProfileFromSocial} />
                ) : (
                  <HivesPanel state={state} onOpenProfile={openProfileFromSocial} />
                )}
              </Motion.div>
            </AnimatePresence>
          </IonCol>
        </IonRow>
      </IonGrid>
    </PageBackground>
  );
}
