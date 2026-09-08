import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import TicketDetailPage from "@/pages/tickets/ticket-detail-page";
import { createTestQueryClient } from "./test-utils";
import { setMockUser } from "./mocks/auth-mock";

vi.mock("@/lib/auth", () => import("./mocks/auth-mock"));
// comment-thread.tsx imports @/lib/db/storage directly (a sub-path the
// @/lib/db barrel mock below doesn't cover), which otherwise pulls in the
// real Firebase app initialization from @/lib/firebase.
vi.mock("@/lib/firebase", () => ({ auth: {}, db: {}, storage: {}, firebaseApp: {} }));

const TICKET_FIXTURE = vi.hoisted(() => ({
  id: "t1",
  ticketNumber: "HD-2026-000007",
  subject: "Cannot access shared drive",
  description: "I lost access after switching teams.",
  requester: { id: "u1", firstName: "Emma", lastName: "Employee", email: "e@x.com", employeeId: "EMP-1" },
  department: { id: "dep-1", name: "Sales" },
  location: { id: "loc-1", name: "HQ" },
  category: { id: "cat-1", name: "Access" },
  subcategory: { id: "sub-1", name: "Shared Drive" },
  priority: { id: "pri-1", name: "Medium", level: 2, colorHex: "#2563eb" },
  status: "Open" as const,
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
  attachments: [],
  sla: { firstResponseHealth: "healthy" as const, resolutionHealth: "healthy" as const, resolutionPercentElapsed: 20, resolutionMsRemaining: 5000_000, overallHealth: "healthy" as const },
}));

vi.mock("@/lib/db", () => ({
  ticketsDb: {
    getTicketById: vi.fn().mockResolvedValue(TICKET_FIXTURE),
    listTicketComments: vi.fn().mockResolvedValue([]),
    listTicketHistory: vi.fn().mockResolvedValue([]),
  },
}));

function renderTicketDetail() {
  const queryClient = createTestQueryClient();
  return render(
    <MemoryRouter initialEntries={["/tickets/t1"]}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Routes>
            <Route path="/tickets/:id" element={<TicketDetailPage />} />
          </Routes>
        </TooltipProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe("TicketDetailPage", () => {
  it("renders ticket header, SLA panel, and sidebar details", async () => {
    setMockUser(null);

    renderTicketDetail();

    expect(await screen.findByText(/HD-2026-000007/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Cannot access shared drive/ })).toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getAllByText("Medium").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Tom Tech/).length).toBeGreaterThan(0);
    expect(screen.getByText("Sales")).toBeInTheDocument();

    // Not signed in -> no technician action buttons should render.
    expect(screen.queryByRole("button", { name: /assign/i })).not.toBeInTheDocument();
  });
});
