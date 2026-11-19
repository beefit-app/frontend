import { act, render, screen } from "@testing-library/react";
import type { SocialEvent } from "../../../services/socialEventsService";
import { useSocialVisibility } from "../../../hooks/useSocialVisibility";
import { PublicProfilePage } from "./PublicProfileSheet";

const { subscribe, getProfile } = vi.hoisted(() => ({
  subscribe: vi.fn<(listener: (event: SocialEvent) => void, signal: AbortSignal) => Promise<void>>(),
  getProfile: vi.fn(),
}));

vi.mock("../../../services/socialEventsService", () => ({ subscribeSocialEvents: subscribe }));
vi.mock("../../../services/profileService", () => ({ profileService: {
  getPublicProfile: getProfile,
  getPublicPosts: vi.fn().mockResolvedValue([]),
  getPublicTrainedDays: vi.fn().mockResolvedValue([]),
} }));
vi.mock("./ProfileView", () => ({ ProfileView: ({ profile }: { profile: { displayName: string } }) => (
  <div>{profile.displayName}</div>
) }));
vi.mock("../../ReportSheet", () => ({ ReportSheet: () => null }));

function OpenProfile() {
  useSocialVisibility("viewer-1");
  return <PublicProfilePage username="amiga" onBack={() => {}} />;
}

describe("PublicProfilePage", () => {
  it("retira a leitura anterior quando muda a visibilidade e aguarda a API", async () => {
    subscribe.mockReset().mockResolvedValue(undefined);
    getProfile.mockReset().mockResolvedValueOnce({ userId: "friend-1", displayName: "Perfil da amiga" });
    let rejectRead!: (error: Error) => void;
    getProfile.mockReturnValueOnce(new Promise((_resolve, reject) => { rejectRead = reject; }));

    render(<OpenProfile />);
    expect(await screen.findByText("Perfil da amiga")).toBeInTheDocument();

    const [onEvent] = subscribe.mock.calls[0];
    act(() => onEvent({ type: "SOCIAL_VISIBILITY_CHANGED", data: {} }));
    expect(screen.queryByText("Perfil da amiga")).not.toBeInTheDocument();
    expect(screen.getByText("Carregando perfil...")).toBeInTheDocument();

    await act(async () => rejectRead(new Error("Perfil indisponível")));
    expect(screen.getByText("Perfil indisponível")).toBeInTheDocument();
    expect(screen.queryByText("Perfil da amiga")).not.toBeInTheDocument();
    expect(getProfile).toHaveBeenCalledTimes(2);
    expect(subscribe).toHaveBeenCalledTimes(1);
  });
});
