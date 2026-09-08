import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TicketListPage from "@/pages/tickets/ticket-list-page";
import { renderWithProviders, TEST_TECHNICIAN } from "./test-utils";
import { setMockUser } from "./mocks/auth-mock";

vi.mock("@/components/ui/select", () => import("./mocks/select-mock"));
vi.mock("@/lib/auth", () => import("./mocks/auth-mock"));

const TICKET_FIXTURE = {
  id: "t1",
  ticketNumber: "HD-2026-000001",
  subject: "VPN will not connect",
  description: "",
  requester: { id: "u1", firstName: "Emma", lastName: "Employee", email: "e@x.com", employeeId: "EMP-1" },
  department: null,
  location: null,
  category: { id: "cat-1", name: "Network" },
  subcategory: null,
  priority: { id: "pri-1", name: "High", level: 3, colorHex: "#d97706" },
  status: "Open" as const,
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
  attachments: [],
  sla: { firstResponseHealth: "healthy" as const, resolutionHealth: "healthy" as const, resolutionPercentElapsed: 10, resolutionMsRemaining: 3600_000, overallHealth: "healthy" as const },
};

const mockListTickets = vi.fn();

vi.mock("@/lib/db", () => ({
  referenceDb: {
    listCategories: vi.fn().mockResolvedValue([{ id: "cat-1", name: "Network", description: null, subcategories: [] }]),
    listPriorities: vi.fn().mockResolvedValue([{ id: "pri-1", name: "High", level: 3, colorHex: "#d97706", slaPolicy: { firstResponseMinutes: 30, resolutionMinutes: 480, businessHoursOnly: false } }]),
    listDepartments: vi.fn().mockResolvedValue([{ id: "dep-1", name: "IT", description: null }]),
  },
  ticketsDb: {
    listTickets: (...args: unknown[]) => mockListTickets(...args),
  },
}));

describe("Ticket filtering", () => {
  it("re-fetches tickets with the selected status filter applied", async () => {
    mockListTickets.mockImplementation(async (params: { status?: string }) => {
      if (params.status === "Closed") return { data: [], total: 0, page: 1, pageSize: 15 };
      return { data: [TICKET_FIXTURE], total: 1, page: 1, pageSize: 15 };
    });
    setMockUser(TEST_TECHNICIAN);

    renderWithProviders(<TicketListPage />, { route: "/tickets" });

    expect(await screen.findByText("HD-2026-000001")).toBeInTheDocument();

    const user = userEvent.setup();
    await user.selectOptions(await screen.findByRole("combobox", { name: "Status" }), "Closed");

    await waitFor(() => {
      expect(screen.getByText("No tickets found")).toBeInTheDocument();
    });

    const lastCall = mockListTickets.mock.calls.at(-1)?.[0];
    expect(lastCall.status).toBe("Closed");
  });
});
