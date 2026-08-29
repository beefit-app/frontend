import { describe, expect, it } from "vitest";
import { parseSocialEvent } from "./socialEventsService";

describe("parseSocialEvent", () => {
  it("aceita PROFILE_UPDATED completo e o devolve com discriminante", () => {
    expect(parseSocialEvent("PROFILE_UPDATED", {
      userId: "user-1",
      fullName: "Ana Silva",
      username: "ana",
      profilePicture: null,
    })).toEqual({
      type: "PROFILE_UPDATED",
      data: { userId: "user-1", fullName: "Ana Silva", username: "ana", profilePicture: null },
    });
  });

  it("descarta payloads malformados e tipos desconhecidos", () => {
    expect(parseSocialEvent("POST_LIKED", { postId: "post-1", totalLikes: -1 })).toBeNull();
    expect(parseSocialEvent("PROFILE_UPDATED", { userId: "user-1", fullName: "Ana" })).toBeNull();
    expect(parseSocialEvent("EVENTO_DESCONHECIDO", {})).toBeNull();
  });
});
