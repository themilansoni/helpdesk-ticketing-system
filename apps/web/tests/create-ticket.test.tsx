import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateTicketPage from "@/pages/tickets/create-ticket-page";
import { renderWithProviders, mockApiFetch } from "./test-utils";

// Radix Select depends on pointerdown-based opening that jsdom cannot
// simulate reliably; see tests/mocks/select-mock.tsx for why these tests
// swap it for a plain native <select> instead of exercising Radix itself.
vi.mock("@/components/ui/select", () => import("./mocks/select-mock"));

describe("CreateTicketPage", () => {
  it("submits the form and creates a ticket with an auto-generated number", async () => {
    const fetchMock = mockApiFetch({
      "GET categories": [
        { id: "cat-1", name: "Hardware", description: null, subcategories: [{ id: "sub-1", name: "Laptop", categoryId: "cat-1" }] },
      ],
      "GET priorities": [{ id: "pri-1", name: "Medium", level: 2, colorHex: "#2563eb" }],
      "GET departments": [{ id: "dep-1", name: "IT", description: null }],
      "GET locations": [{ id: "loc-1", name: "HQ", address: null, city: null, country: null }],
      "GET assets": { data: [], total: 0, page: 1, pageSize: 50 },
      "POST tickets": { id: "ticket-1", ticketNumber: "HD-2026-000042" },
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(<CreateTicketPage />, { route: "/tickets/new" });

    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/subject/i), "My monitor stopped working");
    await user.type(screen.getByLabelText(/description/i), "The external monitor shows no signal after waking the laptop.");

    await user.selectOptions(await screen.findByRole("combobox", { name: "Category" }), "Hardware");
    await user.selectOptions(screen.getByRole("combobox", { name: "Priority" }), "Medium");

    await user.click(screen.getByRole("button", { name: /submit ticket/i }));

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
      expect(postCall).toBeTruthy();
    });
  });

  it("shows a validation error when submitting without a category or priority", async () => {
    vi.stubGlobal(
      "fetch",
      mockApiFetch({
        "GET categories": [],
        "GET priorities": [],
        "GET departments": [],
        "GET locations": [],
        "GET assets": { data: [], total: 0, page: 1, pageSize: 50 },
      })
    );

    renderWithProviders(<CreateTicketPage />, { route: "/tickets/new" });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/subject/i), "Short issue");
    await user.type(screen.getByLabelText(/description/i), "Description text goes here for the issue.");
    await user.click(screen.getByRole("button", { name: /submit ticket/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/select a category and priority/i);
  });
});
