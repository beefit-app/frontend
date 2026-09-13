import { useEffect, useState } from "react";
import { socialService } from "../../../services/socialService";
import { useAuth } from "../../../auth/AuthContext";
import { subscribeSocialEvents } from "../../../services/socialEventsService";
import { pageCacheStorage } from "../../../storage/pageCacheStorage";
import type { FriendProfile, Hive, HiveRankingPeriod, SocialSection } from "../types";

const MAX_HIVES = 2;
const RELATIONSHIPS_TTL_MS = 2 * 60 * 1000;
const RELATIONSHIPS_CACHE_KEY = "social.relationships";
const HIVES_CACHE_KEY = "social.hives";
const HIVES_TTL_MS = 2 * 60 * 1000;

interface CachedRelationships {
  friends: FriendProfile[];
  friendRequests: Awaited<ReturnType<typeof socialService.loadIncomingRequests>>;
  sentRequests: Awaited<ReturnType<typeof socialService.loadOutgoingRequests>>;
}

type CachedHive = Omit<Hive, "inviteCode">;

function withoutInviteCodes(hives: Hive[]): CachedHive[] {
  return hives.map(({ inviteCode: _inviteCode, ...hive }) => hive);
}

export function useSocialState(isActive = false) {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<SocialSection>("friends");
  // FriendProfile, e nao o retorno de loadFriends: aquele tipo tem friendshipId
  // obrigatorio, enquanto busca e eventos produzem perfis sem friendship.
  const [friends, setFriends] = useState<FriendProfile[]>([]);
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

  function buildFriendProfile(user: { id: string; fullName: string; username: string; profilePicture?: string | null; developer?: boolean }, status: FriendProfile["status"], friendshipId?: string) {
    return {
      id: user.id,
      name: user.fullName,
      username: `@${user.username.replace(/^@/, "")}`,
      initials: initials(user.fullName),
      avatarUrl: user.profilePicture ?? null,
      isDeveloper: user.developer === true,
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

  async function refreshFriendships(surfaceError = false, useCache = false) {
    if (useCache) {
      const cached = await pageCacheStorage.get<CachedRelationships>(user?.id, RELATIONSHIPS_CACHE_KEY, RELATIONSHIPS_TTL_MS);
      if (cached) {
        setFriends(cached.friends);
        setFriendRequests(cached.friendRequests);
        setSentRequests(cached.sentRequests);
        return;
      }
    }

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

    if (friendsResult.status === "fulfilled" && requestsResult.status === "fulfilled" && sentRequestsResult.status === "fulfilled") {
      void pageCacheStorage.set(user?.id, RELATIONSHIPS_CACHE_KEY, {
        friends: friendsResult.value,
        friendRequests: requestsResult.value,
        sentRequests: sentRequestsResult.value,
      });
    }

    if (surfaceError) {
      const firstError = [friendsResult, requestsResult, sentRequestsResult]
        .find((result) => result.status === "rejected");
      if (firstError?.status === "rejected") {
        throw firstError.reason;
      }
    }
  }

  async function refreshHives(surfaceError = false, useCache = false) {
    if (useCache) {
      const cached = await pageCacheStorage.get<CachedHive[]>(user?.id, HIVES_CACHE_KEY, HIVES_TTL_MS);
      if (cached) {
        setHives(cached);
        setSelectedHiveId((current) => current ?? cached[0]?.id ?? null);
        return;
      }
    }

    const hivesResult = await Promise.allSettled([
      socialService.loadHives(user?.id ?? ""),
    ]);
    const [result] = hivesResult;

    if (result.status === "fulfilled") {
      setHives(result.value);
      setSelectedHiveId((current) => current ?? result.value[0]?.id ?? null);
      void pageCacheStorage.set(user?.id, HIVES_CACHE_KEY, withoutInviteCodes(result.value));
      return;
    }

    if (surfaceError) {
      throw result.reason;
    }
  }

  async function refresh(useCache = false) {
    try {
      await refreshFriendships(false, useCache);
      await refreshHives(false, useCache);
    } catch {
      // Background refresh should not surface unrelated errors on screen load.
    }
  }

  useEffect(() => { void refresh(true); }, [user?.id]);
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
    void subscribeSocialEvents((event) => {
      if (event.type === "FRIEND_REQUEST_PENDING" || event.type === "FRIEND_REQUEST_ACCEPTED" || event.type === "FRIEND_REMOVED") {
        void pageCacheStorage.remove(user?.id, RELATIONSHIPS_CACHE_KEY);
      }
      if (event.type === "PROFILE_UPDATED") {
        const { data } = event;
        const updateAvatar = (person: FriendProfile) => person.id === data.userId
          ? { ...person, name: data.fullName, username: `@${data.username.replace(/^@/, "")}`, initials: initials(data.fullName), avatarUrl: data.profilePicture }
          : person;
        setFriends((current) => current.map(updateAvatar));
        setFriendRequests((current) => current.map((request) => ({ ...request, profile: updateAvatar(request.profile) })));
        setSentRequests((current) => current.map((request) => ({ ...request, profile: updateAvatar(request.profile) })));
        setDiscoverablePeople((current) => current.map(updateAvatar));
        setHives((current) => current.map((hive) => ({
          ...hive,
          members: hive.members.map((member) => member.id === data.userId
            ? { ...member, name: data.fullName, username: `@${data.username.replace(/^@/, "")}`, initials: initials(data.fullName), avatarUrl: data.profilePicture }
            : member),
        })));
        void pageCacheStorage.remove(user?.id, RELATIONSHIPS_CACHE_KEY);
        void pageCacheStorage.remove(user?.id, HIVES_CACHE_KEY);
        return;
      }
      if (event.type === "FRIEND_REQUEST_PENDING") {
        const { data } = event;
        setFriendRequests((current) => {
          if (current.some((request) => request.id === data.friendshipId)) return current;
          return [
            {
              id: data.friendshipId,
              profile: buildFriendProfile(
                {
                  id: data.requesterId,
                  fullName: data.requesterFullName,
                  username: data.requesterUsername,
                  profilePicture: data.requesterProfilePicture,
                },
                "available",
              ),
            },
            ...current,
          ];
        });
        return;
      }

      if (event.type === "FRIEND_REQUEST_ACCEPTED") {
        const { data } = event;
        const nextFriend = buildFriendProfile(
          {
            id: data.addresseeId,
            fullName: data.addresseeFullName,
            username: data.addresseeUsername,
            profilePicture: data.addresseeProfilePicture,
          },
          "friend",
          data.friendshipId,
        );

        setFriends((current) => mergeFriend(current, nextFriend));
        setSentRequests((current) => current.filter((request) => request.id !== data.friendshipId && request.profile.id !== data.addresseeId));
        setFriendRequests((current) => current.filter((request) => request.id !== data.friendshipId && request.profile.id !== data.addresseeId));
        setDiscoverablePeople((current) => current.map((person) => (
          person.id === data.addresseeId ? { ...person, ...nextFriend } : person
        )));
        return;
      }

      if (event.type === "FRIEND_REMOVED") {
        const { data } = event;
        setFriends((current) => current.filter((friend) => friend.friendshipId !== data.friendshipId && friend.id !== data.friendId));
        setSentRequests((current) => current.filter((request) => request.id !== data.friendshipId && request.profile.id !== data.friendId));
        setFriendRequests((current) => current.filter((request) => request.id !== data.friendshipId && request.profile.id !== data.friendId));
        setDiscoverablePeople((current) => current.map((person) => (
          person.id === data.friendId ? { ...person, status: "available", friendshipId: undefined } : person
        )));
      }
    }, controller.signal);

    return () => {
      controller.abort();
    };
  }, [user?.id]);

  async function action(
    operation: () => Promise<unknown>,
    message: string,
    refreshAfter?: () => Promise<void>,
    invalidatesHives = false,
  ) {
    try {
      await operation();
      void pageCacheStorage.remove(user?.id, RELATIONSHIPS_CACHE_KEY);
      if (invalidatesHives) void pageCacheStorage.remove(user?.id, HIVES_CACHE_KEY);
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
    activeSection, friends, friendRequests, sentRequests, searchTerm, searchResults, hives, selectedHive, feedback, error, isHiveLimitReached, user,
    setActiveSection, setSearchTerm, setSelectedHiveId,
    refreshFriendships,
    acceptFriendRequest: (id: string) => void action(async () => {
      const response = await socialService.acceptRequest(id);
      const nextFriend = buildFriendProfile(
        {
          id: response.user.id,
          fullName: response.user.fullName,
          username: response.user.username,
          profilePicture: response.user.profilePicture,
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
    cancelFriendRequest: (id: string) => void action(async () => {
      const request = sentRequests.find((item) => item.id === id);
      await socialService.cancelRequest(id);
      setSentRequests((current) => current.filter((item) => item.id !== id));
      if (request) {
        setDiscoverablePeople((current) => current.map((person) => (
          person.id === request.profile.id ? { ...person, status: "available", friendshipId: undefined } : person
        )));
      }
    }, "Solicitação cancelada.", () => refreshFriendships(false)),
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
          profilePicture: response.user.profilePicture,
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
    createHive: (name: string, period: HiveRankingPeriod) => { if (isHiveLimitReached) { setError("Você já participa de duas Colmeias."); return false; } void action(() => socialService.createHive(name, period, user?.id ?? ""), "Colmeia criada.", () => refreshHives(true), true); return true; },
    joinHive: (code: string) => { if (isHiveLimitReached) { setError("Você já participa de duas Colmeias."); return false; } void action(() => socialService.joinHive(code, user?.id ?? ""), "Você entrou na Colmeia.", () => refreshHives(true), true); return true; },
    showHiveLimitWarning: () => setError("Você já participa de duas Colmeias."),
    leaveHive: (id: string) => void action(() => socialService.leaveHive(id), "Você saiu da Colmeia.", () => refreshHives(true), true),
    copyInviteCode: (hive: Hive) => void (async () => {
      try {
        let inviteCode = hive.inviteCode;
        if (!inviteCode) {
          const loadedHives = await socialService.loadHives(user?.id ?? "");
          const loadedHive = loadedHives.find((item) => item.id === hive.id);
          if (!loadedHive?.inviteCode) throw new Error("Não foi possível obter o código da Colmeia.");
          inviteCode = loadedHive.inviteCode;
          setHives(loadedHives);
          void pageCacheStorage.set(user?.id, HIVES_CACHE_KEY, withoutInviteCodes(loadedHives));
        }
        await navigator.clipboard?.writeText(inviteCode);
        setFeedback("Código copiado.");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Não foi possível copiar o código.");
      }
    })(),
    rankMembers: (hive: Hive) => [...hive.members].sort((first, second) => second.workouts - first.workouts || second.honeys - first.honeys),
    clearMessage: () => { setFeedback(null); setError(null); },
  };
}
