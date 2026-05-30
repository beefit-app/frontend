import { useEffect, useMemo, useRef, useState } from "react";
import { socialService } from "../../../services/socialService";
import type { Hive, HiveRankingPeriod, SocialSection } from "../types";

const MAX_HIVES = 2;

export function useSocialState() {
  const initialState = useMemo(() => socialService.getInitialState(), []);
  const newHiveCounter = useRef(0);
  const limitWarningTimer = useRef<number | null>(null);
  const [activeSection, setActiveSection] = useState<SocialSection>("friends");
  const [friends, setFriends] = useState(initialState.friends);
  const [friendRequests, setFriendRequests] = useState(initialState.friendRequests);
  const [discoverablePeople, setDiscoverablePeople] = useState(initialState.discoverablePeople);
  const [searchTerm, setSearchTerm] = useState("");
  const [hives, setHives] = useState(initialState.hives);
  const [selectedHiveId, setSelectedHiveId] = useState<string | null>(initialState.hives[0]?.id ?? null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const normalizedTerm = searchTerm.trim().toLocaleLowerCase();
  const searchResults = normalizedTerm
    ? discoverablePeople.filter(
        (person) =>
          person.name.toLocaleLowerCase().includes(normalizedTerm) ||
          person.username.toLocaleLowerCase().includes(normalizedTerm),
      )
    : [];
  const selectedHive = hives.find((hive) => hive.id === selectedHiveId) ?? hives[0] ?? null;
  const isHiveLimitReached = hives.length >= MAX_HIVES;

  useEffect(() => {
    return () => {
      if (limitWarningTimer.current !== null) {
        window.clearTimeout(limitWarningTimer.current);
      }
    };
  }, []);

  function clearLimitWarningTimer() {
    if (limitWarningTimer.current === null) return;
    window.clearTimeout(limitWarningTimer.current);
    limitWarningTimer.current = null;
  }

  function announce(message: string) {
    clearLimitWarningTimer();
    setError(null);
    setFeedback(message);
  }

  function fail(message: string) {
    clearLimitWarningTimer();
    setFeedback(null);
    setError(message);
  }

  function showHiveLimitWarning() {
    clearLimitWarningTimer();
    setFeedback(null);
    setError("Voce ja participa de duas Colmeias. Saia de uma delas para continuar.");
    limitWarningTimer.current = window.setTimeout(() => {
      setError(null);
      limitWarningTimer.current = null;
    }, 5000);
  }

  function acceptFriendRequest(requestId: string) {
    const request = friendRequests.find((item) => item.id === requestId);
    if (!request) return;

    setFriendRequests((current) => current.filter((item) => item.id !== requestId));
    setFriends((current) => [...current, { ...request.profile, status: "friend" }]);
    announce(`${request.profile.name} agora esta na sua lista de amigos.`);
  }

  function rejectFriendRequest(requestId: string) {
    const request = friendRequests.find((item) => item.id === requestId);
    if (!request) return;

    setFriendRequests((current) => current.filter((item) => item.id !== requestId));
    announce(`Solicitacao de ${request.profile.name} recusada.`);
  }

  function sendFriendRequest(personId: string) {
    const person = discoverablePeople.find((item) => item.id === personId);
    if (!person || person.status === "sent") return;

    setDiscoverablePeople((current) =>
      current.map((item) => (item.id === personId ? { ...item, status: "sent" } : item)),
    );
    announce(`Solicitacao enviada para ${person.name}.`);
  }

  function createHive(name: string, period: HiveRankingPeriod) {
    const trimmedName = name.trim();
    if (isHiveLimitReached) {
      showHiveLimitWarning();
      return false;
    }
    if (!trimmedName) {
      fail("Informe um nome para a nova Colmeia.");
      return false;
    }

    newHiveCounter.current += 1;
    const inviteCode = `BEE-${String(newHiveCounter.current).padStart(3, "0")}`;
    const hive: Hive = {
      id: `created-hive-${newHiveCounter.current}`,
      name: trimmedName,
      period,
      inviteCode,
      creatorId: "me",
      members: [socialService.getCurrentUserMember()],
    };

    setHives((current) => [...current, hive]);
    setSelectedHiveId(hive.id);
    announce(`Colmeia ${trimmedName} criada. Compartilhe o codigo ${inviteCode}.`);
    return true;
  }

  function joinHive(inviteCode: string) {
    if (isHiveLimitReached) {
      showHiveLimitWarning();
      return false;
    }

    const hive = socialService.getInvitedHive(inviteCode);
    if (!hive) {
      fail("Convite invalido. Verifique o codigo informado.");
      return false;
    }
    if (hives.some((item) => item.id === hive.id)) {
      fail("Voce ja participa desta Colmeia.");
      return false;
    }

    setHives((current) => [...current, hive]);
    setSelectedHiveId(hive.id);
    announce(`Voce entrou na Colmeia ${hive.name}.`);
    return true;
  }

  function leaveHive(hiveId: string) {
    const hive = hives.find((item) => item.id === hiveId);
    if (!hive) return;

    const remainingHives = hives.filter((item) => item.id !== hiveId);
    setHives(remainingHives);
    setSelectedHiveId(remainingHives[0]?.id ?? null);
    announce(`Voce saiu da Colmeia ${hive.name}.`);
  }

  function copyInviteCode(hive: Hive) {
    announce(`Codigo ${hive.inviteCode} pronto para compartilhar.`);
  }

  function rankMembers(hive: Hive) {
    return [...hive.members].sort(
      (first, second) => second.workouts - first.workouts || second.honeys - first.honeys,
    );
  }

  return {
    activeSection,
    friends,
    friendRequests,
    searchTerm,
    searchResults,
    hives,
    selectedHive,
    feedback,
    error,
    isHiveLimitReached,
    setActiveSection,
    setSearchTerm,
    setSelectedHiveId,
    acceptFriendRequest,
    rejectFriendRequest,
    sendFriendRequest,
    createHive,
    joinHive,
    showHiveLimitWarning,
    leaveHive,
    copyInviteCode,
    rankMembers,
    clearMessage: () => {
      clearLimitWarningTimer();
      setFeedback(null);
      setError(null);
    },
  };
}
