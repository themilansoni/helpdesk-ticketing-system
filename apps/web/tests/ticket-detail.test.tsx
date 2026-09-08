import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/lib/auth";
import { TooltipProvider } from "@/components/ui/tooltip";
import TicketDetailPage from "@/pages/tickets/ticket-detail-page";
import { createTestQueryClient, mockApiFetch } from "./test-utils";

const TICKET_FIXTURE = {
  id: "t1",
  ticketNumber: "HD-2026-000007",
  subject: "Cannot access shared drive",
  description: "I lost access after switching teams.",
  requester: { id: "u1", firstName: "Emma", lastName: "Employee", email: "e@x.com", employeeId: "EMP-1" },
  department: { id: "dep-1", name: "Sales", description: null },
  location: { id: "loc-1", name: "HQ", address: null, city: null, country: null },
  category: { id: "cat-1", name: "Access", description: null, subcategories: [] },
  subcategory: { id: "sub-1", name: "Shared Drive", categoryId: "cat-1" },
  priority: { id: "pri-1", name: "Medium", level: 2, colorHex: "#2563eb" },
  status: { id: "status-open", name: "Open", order: 1, isClosed: false, isDefault: false },
  assignedTechnician: { id: "tech-1", firstName: "Tom", lastName: "Tech", email: "tom@x.com" },
  asset: null,
  preferredContactMethod: "email",
  pendingReason: null,
  slaFirstResponseDeadline: new Date(Date.now() + 1000_000).toISOString(),
  slaResolutionDeadline: new Date(Date.now() + 5000_000).toISOString(),
  firstRespondedAt: null,
  resolvedAt: null,
  closedAt: null,
  reopenedCount: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  sla: { firstResponseHealth: "healthy", resolutionHealth: "healthy", resolutionPercentElapsed: 20, resolutionMsRemaining: 5000_000, overallHealth: "healthy" },
};

function renderTicketDetail() {
  const queryClient = createTestQueryClient();
  return render(
    <MemoryRouter initialEntries={["/tickets/t1"]}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Routes>
              <Route path="/tickets/:id" element={<TicketDetailPage />} />
            </Routes>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe("TicketDetailPage", () => {
  it("renders ticket header, SLA panel, and sidebar details", async () => {
    vi.stubGlobal(
      "fetch",
      mockApiFetch({
        "GET tickets/t1/comments": [],
        "GET tickets/t1/history": [],
        "GET tickets/t1": TICKET_FIXTURE,
      })
    );

    renderTicketDetail();

    expect(await screen.findByText(/HD-2026-000007/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Cannot access shared drive/ })).toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getAllByText("Medium").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Tom Tech/).length).toBeGreaterThan(0);
    expect(screen.getByText("Sales")).toBeInTheDocument();

    // Not logged in (no auth token) -> no technician action buttons should render.
    expect(screen.queryByRole("button", { name: /assign/i })).not.toBeInTheDocument();
  });
});
