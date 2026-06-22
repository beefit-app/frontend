import { useEffect, useMemo, useState } from "react";
import { socialService } from "../../../services/socialService";
import { useAuth } from "../../../auth/AuthContext";
import type { Hive, HiveRankingPeriod, SocialSection } from "../types";

const MAX_HIVES = 2;

export function useSocialState() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<SocialSection>("friends");
  const [friends, setFriends] = useState<ReturnType<typeof socialService.loadFriends> extends Promise<infer T> ? T : never>([]);
  const [friendRequests, setFriendRequests] = useState<Awaited<ReturnType<typeof socialService.loadRequests>>>([]);
  const [discoverablePeople, setDiscoverablePeople] = useState<typeof friends>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [hives, setHives] = useState<Hive[]>([]);
  const [selectedHiveId, setSelectedHiveId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedHive = hives.find((hive) => hive.id === selectedHiveId) ?? hives[0] ?? null;
  const isHiveLimitReached = hives.length >= MAX_HIVES;
  const searchResults = searchTerm.trim() ? discoverablePeople : [];

  async function refresh() {
    try {
      const [nextFriends, nextRequests, nextHives] = await Promise.all([
        socialService.loadFriends(), socialService.loadRequests(), socialService.loadHives(user?.id ?? ""),
      ]);
      setFriends(nextFriends); setFriendRequests(nextRequests); setHives(nextHives); setSelectedHiveId((current) => current ?? nextHives[0]?.id ?? null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível carregar dados sociais."); }
  }

  useEffect(() => { void refresh(); }, [user?.id]);
  useEffect(() => {
    if (!searchTerm.trim()) { setDiscoverablePeople([]); return; }
    const timer = window.setTimeout(() => void socialService.search(searchTerm).then(setDiscoverablePeople).catch(() => setDiscoverablePeople([])), 300);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  async function action(operation: () => Promise<unknown>, message: string) {
    try { await operation(); await refresh(); setError(null); setFeedback(message); } catch (cause) { setFeedback(null); setError(cause instanceof Error ? cause.message : "Não foi possível concluir a ação."); }
  }

  return {
    activeSection, friends, friendRequests, searchTerm, searchResults, hives, selectedHive, feedback, error, isHiveLimitReached,
    setActiveSection, setSearchTerm, setSelectedHiveId,
    acceptFriendRequest: (id: string) => void action(() => socialService.acceptRequest(id), "Solicitação aceita."),
    rejectFriendRequest: (id: string) => void action(() => socialService.rejectRequest(id), "Solicitação recusada."),
    sendFriendRequest: (id: string) => void action(() => socialService.sendRequest(id), "Solicitação enviada."),
    createHive: (name: string, period: HiveRankingPeriod) => { if (isHiveLimitReached) { setError("Você já participa de duas Colmeias."); return false; } void action(() => socialService.createHive(name, period, user?.id ?? ""), "Colmeia criada."); return true; },
    joinHive: (code: string) => { if (isHiveLimitReached) { setError("Você já participa de duas Colmeias."); return false; } void action(() => socialService.joinHive(code, user?.id ?? ""), "Você entrou na Colmeia."); return true; },
    showHiveLimitWarning: () => setError("Você já participa de duas Colmeias."),
    leaveHive: (id: string) => void action(() => socialService.leaveHive(id), "Você saiu da Colmeia."),
    copyInviteCode: (hive: Hive) => { void navigator.clipboard?.writeText(hive.inviteCode); setFeedback("Código copiado."); },
    rankMembers: (hive: Hive) => [...hive.members].sort((first, second) => second.workouts - first.workouts || second.honeys - first.honeys),
    clearMessage: () => { setFeedback(null); setError(null); },
  };
}
