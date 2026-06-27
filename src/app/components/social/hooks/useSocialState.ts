import { useEffect, useState } from "react";
import { socialService } from "../../../services/socialService";
import { useAuth } from "../../../auth/AuthContext";
import { subscribeSocialEvents, type FriendRemovedEvent, type FriendRequestAcceptedEvent, type FriendRequestPendingEvent } from "../../../services/socialEventsService";
import type { FriendProfile, Hive, HiveRankingPeriod, SocialSection } from "../types";

const MAX_HIVES = 2;

export function useSocialState(isActive = false) {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<SocialSection>("friends");
  const [friends, setFriends] = useState<ReturnType<typeof socialService.loadFriends> extends Promise<infer T> ? T : never>([]);
  const [friendRequests, setFriendRequests] = useState<Awaited<ReturnType<typeof socialService.loadIncomingRequests>>>([]);
  const [sentRequests, setSentRequests] = useState<Awaited<ReturnType<typeof socialService.loadOutgoingRequests>>>([]);
  const [discoverablePeople, setDiscoverablePeople] = useState<typeof friends>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [hives, setHives] = useState<Hive[]>([]);
  const [selectedHiveId, setSelectedHiveId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedHive = hives.find((hive) => hive.id === selectedHiveId) ?? hives[0] ?? null;
  const isHiveLimitReached = hives.length >= MAX_HIVES;
  const searchResults = searchTerm.trim()
    ? discoverablePeople.map((person) => {
        const friend = friends.find((item) => item.id === person.id);
        if (friend) return friend;
        const sentRequest = sentRequests.find((item) => item.profile.id === person.id);
        if (sentRequest) return { ...person, status: "sent" as const, friendshipId: sentRequest.id };
        return person;
      })
    : [];

  function initials(name: string) {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }

  function buildFriendProfile(user: { id: string; fullName: string; username: string }, status: FriendProfile["status"], friendshipId?: string) {
    return {
      id: user.id,
      name: user.fullName,
      username: `@${user.username.replace(/^@/, "")}`,
      initials: initials(user.fullName),
      status,
      friendshipId,
    };
  }

  function mergeFriend(current: typeof friends, nextFriend: FriendProfile) {
    if (current.some((friend) => friend.friendshipId === nextFriend.friendshipId || friend.id === nextFriend.id)) {
      return current.map((friend) => (friend.id === nextFriend.id ? { ...friend, ...nextFriend } : friend));
    }

    return [nextFriend, ...current];
  }

  async function refreshFriendships(surfaceError = false) {
    const [friendsResult, requestsResult, sentRequestsResult] = await Promise.allSettled([
      socialService.loadFriends(),
      socialService.loadIncomingRequests(),
      socialService.loadOutgoingRequests(),
    ]);

    if (friendsResult.status === "fulfilled") {
      setFriends(friendsResult.value);
    }
    if (requestsResult.status === "fulfilled") {
      setFriendRequests(requestsResult.value);
    }
    if (sentRequestsResult.status === "fulfilled") {
      setSentRequests(sentRequestsResult.value);
    }

    if (surfaceError) {
      const firstError = [friendsResult, requestsResult, sentRequestsResult]
        .find((result) => result.status === "rejected");
      if (firstError?.status === "rejected") {
        throw firstError.reason;
      }
    }
  }

  async function refreshHives(surfaceError = false) {
    const hivesResult = await Promise.allSettled([
      socialService.loadHives(user?.id ?? ""),
    ]);
    const [result] = hivesResult;

    if (result.status === "fulfilled") {
      setHives(result.value);
      setSelectedHiveId((current) => current ?? result.value[0]?.id ?? null);
      return;
    }

    if (surfaceError) {
      throw result.reason;
    }
  }

  async function refresh() {
    try {
      await refreshFriendships(false);
      await refreshHives(false);
    } catch {
      // Background refresh should not surface unrelated errors on screen load.
    }
  }

  useEffect(() => { void refresh(); }, [user?.id]);
  useEffect(() => {
    if (!isActive) return;
    void refresh();
  }, [isActive, user?.id]);
  useEffect(() => {
    if (isActive) return;
    setSearchTerm("");
    setDiscoverablePeople([]);
  }, [isActive]);
  useEffect(() => {
    if (!searchTerm.trim()) { setDiscoverablePeople([]); return; }
    const timer = window.setTimeout(() => void socialService.search(searchTerm).then(setDiscoverablePeople).catch(() => setDiscoverablePeople([])), 300);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);
  useEffect(() => {
    if (!feedback && !error) return;
    const timer = window.setTimeout(() => {
      setFeedback(null);
      setError(null);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [feedback, error]);

  useEffect(() => {
    if (!user?.id) return;

    const controller = new AbortController();
    void subscribeSocialEvents((type, data) => {
      if (type === "FRIEND_REQUEST_PENDING") {
        const event = data as FriendRequestPendingEvent;
        setFriendRequests((current) => {
          if (current.some((request) => request.id === event.friendshipId)) return current;
          return [
            {
              id: event.friendshipId,
              profile: buildFriendProfile(
                {
                  id: event.requesterId,
                  fullName: event.requesterFullName,
                  username: event.requesterUsername,
                },
                "available",
              ),
            },
            ...current,
          ];
        });
        return;
      }

      if (type === "FRIEND_REQUEST_ACCEPTED") {
        const event = data as FriendRequestAcceptedEvent;
        const nextFriend = buildFriendProfile(
          {
            id: event.addresseeId,
            fullName: event.addresseeFullName,
            username: event.addresseeUsername,
          },
          "friend",
          event.friendshipId,
        );

        setFriends((current) => mergeFriend(current, nextFriend));
        setSentRequests((current) => current.filter((request) => request.id !== event.friendshipId && request.profile.id !== event.addresseeId));
        setFriendRequests((current) => current.filter((request) => request.id !== event.friendshipId && request.profile.id !== event.addresseeId));
        setDiscoverablePeople((current) => current.map((person) => (
          person.id === event.addresseeId ? { ...person, ...nextFriend } : person
        )));
        return;
      }

      if (type === "FRIEND_REMOVED") {
        const event = data as FriendRemovedEvent;
        setFriends((current) => current.filter((friend) => friend.friendshipId !== event.friendshipId && friend.id !== event.friendId));
        setSentRequests((current) => current.filter((request) => request.id !== event.friendshipId && request.profile.id !== event.friendId));
        setFriendRequests((current) => current.filter((request) => request.id !== event.friendshipId && request.profile.id !== event.friendId));
        setDiscoverablePeople((current) => current.map((person) => (
          person.id === event.friendId ? { ...person, status: "available", friendshipId: undefined } : person
        )));
      }
    }, controller.signal);

    return () => {
      controller.abort();
    };
  }, [user?.id]);

  async function action(operation: () => Promise<unknown>, message: string, refreshAfter?: () => Promise<void>) {
    try {
      await operation();
      if (refreshAfter) {
        await refreshAfter();
      } else {
        await refresh();
      }
      setError(null);
      setFeedback(message);
    } catch (cause) {
      setFeedback(null);
      setError(cause instanceof Error ? cause.message : "Não foi possível concluir a ação.");
    }
  }

  return {
    activeSection, friends, friendRequests, sentRequests, searchTerm, searchResults, hives, selectedHive, feedback, error, isHiveLimitReached,
    setActiveSection, setSearchTerm, setSelectedHiveId,
    acceptFriendRequest: (id: string) => void action(async () => {
      const response = await socialService.acceptRequest(id);
      const nextFriend = buildFriendProfile(
        {
          id: response.user.id,
          fullName: response.user.fullName,
          username: response.user.username,
        },
        "friend",
        response.id,
      );
      setFriendRequests((current) => current.filter((request) => request.id !== id && request.profile.id !== response.user.id));
      setFriends((current) => mergeFriend(current, nextFriend));
      setDiscoverablePeople((current) => current.map((person) => (
        person.id === response.user.id ? { ...person, ...nextFriend } : person
      )));
    }, "Solicitação aceita.", () => refreshFriendships(false)),
    rejectFriendRequest: (id: string) => void action(async () => {
      const request = friendRequests.find((item) => item.id === id);
      await socialService.rejectRequest(id);
      setFriendRequests((current) => current.filter((item) => item.id !== id));
      if (request) {
        setDiscoverablePeople((current) => current.map((person) => (
          person.id === request.profile.id ? { ...person, status: "available" } : person
        )));
      }
    }, "Solicitação recusada.", () => refreshFriendships(false)),
    removeFriend: (id: string) => void action(async () => {
      const friend = friends.find((item) => item.friendshipId === id);
      await socialService.removeFriend(id);
      setFriends((current) => current.filter((item) => item.friendshipId !== id));
      if (friend) {
        setDiscoverablePeople((current) => current.map((person) => (
          person.id === friend.id ? { ...person, status: "available", friendshipId: undefined } : person
        )));
      }
    }, "Amigo removido.", () => refreshFriendships(false)),
    sendFriendRequest: (id: string) => void action(async () => {
      const response = await socialService.sendRequest(id);
      const nextRequest = {
        id: response.id,
        profile: buildFriendProfile(
          {
            id: response.user.id,
            fullName: response.user.fullName,
            username: response.user.username,
          },
          "sent",
          response.id,
        ),
      };
      setSentRequests((current) => current.some((request) => request.id === nextRequest.id || request.profile.id === nextRequest.profile.id)
        ? current
        : [nextRequest, ...current]);
      setDiscoverablePeople((current) => current.map((person) => (
        person.id === response.user.id ? { ...person, status: "sent", friendshipId: response.id } : person
      )));
    }, "Solicitação enviada.", () => refreshFriendships(false)),
    createHive: (name: string, period: HiveRankingPeriod) => { if (isHiveLimitReached) { setError("Você já participa de duas Colmeias."); return false; } void action(() => socialService.createHive(name, period, user?.id ?? ""), "Colmeia criada.", () => refreshHives(true)); return true; },
    joinHive: (code: string) => { if (isHiveLimitReached) { setError("Você já participa de duas Colmeias."); return false; } void action(() => socialService.joinHive(code, user?.id ?? ""), "Você entrou na Colmeia.", () => refreshHives(true)); return true; },
    showHiveLimitWarning: () => setError("Você já participa de duas Colmeias."),
    leaveHive: (id: string) => void action(() => socialService.leaveHive(id), "Você saiu da Colmeia.", () => refreshHives(true)),
    copyInviteCode: (hive: Hive) => { void navigator.clipboard?.writeText(hive.inviteCode); setFeedback("Código copiado."); },
    rankMembers: (hive: Hive) => [...hive.members].sort((first, second) => second.workouts - first.workouts || second.honeys - first.honeys),
    clearMessage: () => { setFeedback(null); setError(null); },
  };
}
