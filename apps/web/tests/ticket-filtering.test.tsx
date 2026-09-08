import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TicketListPage from "@/pages/tickets/ticket-list-page";
import { renderWithProviders, mockApiFetch } from "./test-utils";

// See tests/mocks/select-mock.tsx - Radix Select's pointerdown-based
// opening isn't simulable in jsdom, so these tests use a plain <select>.
vi.mock("@/components/ui/select", () => import("./mocks/select-mock"));

const TICKET_FIXTURE = {
  id: "t1",
  ticketNumber: "HD-2026-000001",
  subject: "VPN will not connect",
  description: "",
  requester: { id: "u1", firstName: "Emma", lastName: "Employee", email: "e@x.com", employeeId: "EMP-1" },
  department: null,
  location: null,
  category: { id: "cat-1", name: "Network", description: null, subcategories: [] },
  subcategory: null,
  priority: { id: "pri-1", name: "High", level: 3, colorHex: "#d97706" },
  status: { id: "status-open", name: "Open", order: 1, isClosed: false, isDefault: false },
  assignedTechnician: null,
  asset: null,
  preferredContactMethod: "email",
  pendingReason: null,
  slaFirstResponseDeadline: null,
  slaResolutionDeadline: new Date(Date.now() + 3600_000).toISOString(),
  firstRespondedAt: null,
  resolvedAt: null,
  closedAt: null,
  reopenedCount: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  sla: { firstResponseHealth: "healthy", resolutionHealth: "healthy", resolutionPercentElapsed: 10, resolutionMsRemaining: 3600_000, overallHealth: "healthy" },
};

describe("Ticket filtering", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("re-fetches tickets with the selected status filter applied", async () => {
    const fetchMock = mockApiFetch({
      "GET categories": [{ id: "cat-1", name: "Network", description: null, subcategories: [] }],
      "GET priorities": [{ id: "pri-1", name: "High", level: 3, colorHex: "#d97706" }],
      "GET statuses": [
        { id: "status-open", name: "Open", order: 1, isClosed: false, isDefault: false },
        { id: "status-closed", name: "Closed", order: 5, isClosed: true, isDefault: false },
      ],
      "GET departments": [{ id: "dep-1", name: "IT", description: null }],
      "GET tickets": (url: URL) => {
        if (url.searchParams.get("statusId") === "status-closed") {
          return { data: [], total: 0, page: 1, pageSize: 15 };
        }
        return { data: [TICKET_FIXTURE], total: 1, page: 1, pageSize: 15 };
      },
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(<TicketListPage />, { route: "/tickets" });

    expect(await screen.findByText("HD-2026-000001")).toBeInTheDocument();

    const user = userEvent.setup();
    await user.selectOptions(await screen.findByRole("combobox", { name: "Status" }), "Closed");

    await waitFor(() => {
      expect(screen.getByText("No tickets found")).toBeInTheDocument();
    });

    const lastTicketsCall = fetchMock.mock.calls
      .map(([url]) => new URL(url.toString()))
      .filter((u) => u.pathname.includes("/tickets"))
      .pop();
    expect(lastTicketsCall?.searchParams.get("statusId")).toBe("status-closed");
  });
});
