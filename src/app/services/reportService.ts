import { apiClient } from "./apiClient";
import type { CreateReportRequest, ReportResponse } from "../types/api";

export const reportService = {
  async createReport(payload: CreateReportRequest) {
    return apiClient.post<ReportResponse>("/api/reports", payload, { auth: true });
  },
};
