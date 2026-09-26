import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminScreen } from "./AdminScreen";
import { adminService, type AdminPage, type AdminReport } from "../../services/adminService";

vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => ({ user: { name: "Admin" }, logout: vi.fn() }),
}));

vi.mock("../../services/adminService", () => ({
  adminService: {
    getDashboard: vi.fn(),
    getReports: vi.fn(),
    resolveReport: vi.fn(),
  },
}));

const getReports = vi.mocked(adminService.getReports);
const resolveReport = vi.mocked(adminService.resolveReport);

const postReport: AdminReport = {
  id: "report-post",
  reporterId: "user-auditor",
  reporterUsername: "auditor",
  targetType: "POST",
  targetId: "post-1",
  targetPostTitle: "Treino de peito",
  targetOwnerId: "user-amigo",
  targetOwnerUsername: "amigo",
  reason: "SPAM",
  details: "Posta a mesma coisa todo dia",
  status: "PENDING",
  createdAt: "2026-09-26T12:00:00",
};

const profileReport: AdminReport = {
  ...postReport,
  id: "report-profile",
  targetType: "USER",
  targetId: "user-amigo",
  targetPostTitle: null,
  reason: "HARASSMENT",
  details: null,
};

function page(content: AdminReport[]): AdminPage<AdminReport> {
  return { content, number: 0, size: 10, totalElements: content.length, totalPages: 1, first: true, last: true };
}

async function openReportsTab() {
  render(<AdminScreen />);
  fireEvent.click(screen.getByRole("button", { name: "Denúncias" }));
  await screen.findByText("Posta a mesma coisa todo dia");
}

describe("AdminScreen — denúncias", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminService.getDashboard).mockResolvedValue({
      totalActiveUsers: 0,
      workoutsLast24Hours: 0,
      totalVolumeLifted: 0,
    });
    getReports.mockResolvedValue(page([postReport, profileReport]));
  });

  it("mostra a fila pendente com os detalhes e só oferece remover post em denúncia de post", async () => {
    await openReportsTab();

    expect(getReports).toHaveBeenCalledWith("PENDING", 0);
    expect(screen.getByText("Treino de peito")).toBeInTheDocument();
    expect(screen.getByText("Sem detalhes")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Remover post/ })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: /Banir @amigo/ })).toHaveLength(2);
  });

  it("descarta sem pedir confirmação e avisa quantas denúncias fechou", async () => {
    resolveReport.mockResolvedValue({ reportId: "report-post", action: "DISMISS", status: "DISMISSED", closedReports: 1 });
    await openReportsTab();

    fireEvent.click(screen.getAllByRole("button", { name: /Descartar/ })[0]);

    await screen.findByText("Denúncia descartada. 1 denúncia fechada.");
    expect(resolveReport).toHaveBeenCalledWith("report-post", "DISMISS", undefined);
    expect(getReports).toHaveBeenCalledTimes(2);
  });

  it("banir pede confirmação e envia os dias escolhidos", async () => {
    resolveReport.mockResolvedValue({ reportId: "report-post", action: "BAN_USER", status: "REVIEWED", closedReports: 2 });
    await openReportsTab();

    fireEvent.click(screen.getAllByRole("button", { name: /Banir @amigo/ })[0]);
    const dialog = await screen.findByRole("alertdialog");
    expect(resolveReport).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Banir" }));

    await waitFor(() => expect(resolveReport).toHaveBeenCalledWith("report-post", "BAN_USER", 7));
    await screen.findByText("@amigo banido. 2 denúncias fechadas.");
  });

  it("trocar para Analisadas busca a fila desse status e esconde as decisões", async () => {
    await openReportsTab();
    getReports.mockResolvedValue(page([{ ...postReport, status: "REVIEWED" }]));

    fireEvent.click(screen.getByRole("button", { name: "Analisadas" }));

    await waitFor(() => expect(getReports).toHaveBeenLastCalledWith("REVIEWED", 0));
    await waitFor(() => expect(screen.queryByRole("button", { name: /Descartar/ })).not.toBeInTheDocument());
  });
});
