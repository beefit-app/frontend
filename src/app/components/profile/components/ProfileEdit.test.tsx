import { useEffect } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileEdit } from "./ProfileEdit";
import type { ProfileData } from "../types";
import { profileService } from "../../../services/profileService";
import { cropImageFile } from "../../../platform/imageCompression";

const { CROP_AREA } = vi.hoisted(() => ({ CROP_AREA: { x: 120, y: 40, width: 800, height: 924 } }));

// O Cropper real mede o DOM, que o jsdom nao tem; basta devolver uma area escolhida.
vi.mock("react-easy-crop", () => ({
  default: function MockCropper({ onCropComplete }: { onCropComplete: (area: unknown, pixels: unknown) => void }) {
    // Só na montagem, como o Cropper real ao medir a imagem; o callback muda a cada render.
    useEffect(() => onCropComplete(CROP_AREA, CROP_AREA), []);
    return <div data-testid="cropper" />;
  },
}));

vi.mock("../../../platform/mediaValidation", () => ({
  validateImageFile: vi.fn().mockResolvedValue(undefined),
  revokeObjectUrl: vi.fn(),
}));

vi.mock("../../../platform/imageCompression", () => ({
  cropImageFile: vi.fn(),
}));

vi.mock("../../../services/profileService", () => ({
  profileService: { uploadProfilePhoto: vi.fn() },
}));

const profile: ProfileData = {
  id: "user-1",
  displayName: "Davi",
  username: "davi",
  email: "davi@beefit.test",
  weight: 80,
  bio: "",
  avatarUrl: null,
  weeklyGoal: 3,
  cards: 0,
  streak: 0,
  totalWorkouts: 0,
};

const croppedFile = new File(["cropped"], "selfie.jpg", { type: "image/jpeg" });
const originalCreateObjectURL = URL.createObjectURL;

function renderEdit(onSave = vi.fn().mockResolvedValue(undefined)) {
  render(<ProfileEdit profile={profile} onSave={onSave} onCancel={vi.fn()} />);
  return onSave;
}

function pickPhoto() {
  const input = screen.getByLabelText("Escolher foto de perfil");
  fireEvent.change(input, { target: { files: [new File(["raw"], "selfie.png", { type: "image/png" })] } });
}

describe("ProfileEdit — recorte da foto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn(() => "blob:preview");
    vi.mocked(cropImageFile).mockResolvedValue(croppedFile);
    vi.mocked(profileService.uploadProfilePhoto).mockResolvedValue("https://cdn/avatar.jpg");
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
  });

  it("abre o ajuste ao escolher a foto, sem recortar nem enviar ainda", async () => {
    renderEdit();

    pickPhoto();

    expect(await screen.findByText("Ajustar foto")).toBeInTheDocument();
    expect(cropImageFile).not.toHaveBeenCalled();
    expect(profileService.uploadProfilePhoto).not.toHaveBeenCalled();
  });

  it("cancelar mantém o avatar anterior e o salvar não envia foto", async () => {
    const onSave = renderEdit();
    pickPhoto();
    await screen.findByText("Ajustar foto");

    fireEvent.click(within(screen.getByRole("dialog")).getByText("Cancelar"));
    await waitFor(() => expect(screen.queryByText("Ajustar foto")).not.toBeInTheDocument());
    fireEvent.click(screen.getByText("Salvar Alterações"));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(cropImageFile).not.toHaveBeenCalled();
    expect(profileService.uploadProfilePhoto).not.toHaveBeenCalled();
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ avatarUrl: null }));
  });

  it("usar foto recorta a área escolhida no formato do avatar e o salvar envia o recorte", async () => {
    const onSave = renderEdit();
    pickPhoto();
    await screen.findByText("Ajustar foto");

    fireEvent.click(screen.getByText("Usar foto"));
    await waitFor(() => expect(screen.queryByText("Ajustar foto")).not.toBeInTheDocument());
    fireEvent.click(screen.getByText("Salvar Alterações"));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(cropImageFile).toHaveBeenCalledWith(expect.any(File), CROP_AREA, { width: 512, height: 591, quality: 0.8 });
    expect(profileService.uploadProfilePhoto).toHaveBeenCalledWith(croppedFile);
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ avatarUrl: "https://cdn/avatar.jpg" }));
  });

  it("mostra o erro quando o recorte falha e mantém a folha aberta", async () => {
    vi.mocked(cropImageFile).mockRejectedValue(new Error("Não foi possível recortar a imagem neste dispositivo."));
    renderEdit();
    pickPhoto();
    await screen.findByText("Ajustar foto");

    fireEvent.click(screen.getByText("Usar foto"));

    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível recortar");
    expect(screen.getByText("Ajustar foto")).toBeInTheDocument();
  });
});
