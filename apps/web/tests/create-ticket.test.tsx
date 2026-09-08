import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateTicketPage from "@/pages/tickets/create-ticket-page";
import { renderWithProviders, TEST_EMPLOYEE } from "./test-utils";
import { setMockUser } from "./mocks/auth-mock";

// See tests/mocks/select-mock.tsx - Radix Select's pointerdown-based
// opening isn't simulable in jsdom, so these tests use a plain <select>.
vi.mock("@/components/ui/select", () => import("./mocks/select-mock"));
vi.mock("@/lib/auth", () => import("./mocks/auth-mock"));

const mockCreateTicket = vi.fn();

vi.mock("@/lib/db", () => ({
  referenceDb: {
    listCategories: vi.fn().mockResolvedValue([
      { id: "cat-1", name: "Hardware", description: null, subcategories: [{ id: "sub-1", name: "Laptop", categoryId: "cat-1" }] },
    ]),
    listPriorities: vi.fn().mockResolvedValue([{ id: "pri-1", name: "Medium", level: 2, colorHex: "#2563eb", slaPolicy: { firstResponseMinutes: 240, resolutionMinutes: 2880, businessHoursOnly: false } }]),
    listDepartments: vi.fn().mockResolvedValue([{ id: "dep-1", name: "IT", description: null }]),
    listLocations: vi.fn().mockResolvedValue([{ id: "loc-1", name: "HQ", address: null, city: null, country: null }]),
  },
  assetsDb: {
    listAssets: vi.fn().mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 50 }),
  },
  ticketsDb: {
    createTicket: (...args: unknown[]) => mockCreateTicket(...args),
  },
}));

describe("CreateTicketPage", () => {
  it("submits the form and creates a ticket with an auto-generated number", async () => {
    setMockUser(TEST_EMPLOYEE);
    mockCreateTicket.mockResolvedValueOnce({ id: "ticket-1", ticketNumber: "HD-2026-000042" });

    renderWithProviders(<CreateTicketPage />, { route: "/tickets/new" });

    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/subject/i), "My monitor stopped working");
    await user.type(screen.getByLabelText(/description/i), "The external monitor shows no signal after waking the laptop.");

    await user.selectOptions(await screen.findByRole("combobox", { name: "Category" }), "Hardware");
    await user.selectOptions(screen.getByRole("combobox", { name: "Priority" }), "Medium");

    await user.click(screen.getByRole("button", { name: /submit ticket/i }));

    await waitFor(() => {
      expect(mockCreateTicket).toHaveBeenCalledWith(
        expect.objectContaining({ subject: "My monitor stopped working", categoryId: "cat-1", priorityId: "pri-1" }),
        TEST_EMPLOYEE,
        []
      );
    });
  });

  it("shows a validation error when submitting without a category or priority", async () => {
    setMockUser(TEST_EMPLOYEE);

    renderWithProviders(<CreateTicketPage />, { route: "/tickets/new" });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/subject/i), "Short issue");
    await user.type(screen.getByLabelText(/description/i), "Description text goes here for the issue.");
    await user.click(screen.getByRole("button", { name: /submit ticket/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/select a category and priority/i);
  });
});
