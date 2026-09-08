import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "@/pages/login-page";
import { renderWithProviders } from "./test-utils";

describe("LoginPage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows an error message on invalid credentials", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ error: "Invalid email or password." }), {
          status: 401,
          headers: { "content-type": "application/json" },
        })
      )
    );

    renderWithProviders(<LoginPage />, { route: "/login" });

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/work email/i), "wrong@helpdesk.local");
    await user.type(screen.getByLabelText(/password/i), "wrongpassword");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/invalid email or password/i);
    });
    expect(localStorage.getItem("helpdesk.accessToken")).toBeNull();
  });

  it("logs in successfully and stores tokens", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            accessToken: "fake-access-token",
            refreshToken: "fake-refresh-token",
            user: {
              id: "u1",
              employeeId: "EMP-0001",
              firstName: "Ava",
              lastName: "Admin",
              email: "admin@helpdesk.local",
              phone: null,
              jobTitle: null,
              status: "active",
              lastLoginAt: null,
              role: { id: "r1", name: "Administrator" },
              department: null,
              location: null,
              managerId: null,
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
    );

    renderWithProviders(<LoginPage />, { route: "/login" });

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/work email/i), "admin@helpdesk.local");
    await user.type(screen.getByLabelText(/password/i), "Passw0rd!123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(localStorage.getItem("helpdesk.accessToken")).toBe("fake-access-token");
    });
  });

  it("fills in demo credentials when a demo account is clicked", async () => {
    vi.stubGlobal("fetch", vi.fn());
    renderWithProviders(<LoginPage />, { route: "/login" });

    const user = userEvent.setup();
    await user.click(screen.getByText("admin@helpdesk.local"));

    expect(screen.getByLabelText(/work email/i)).toHaveValue("admin@helpdesk.local");
    expect(screen.getByLabelText(/password/i)).toHaveValue("Passw0rd!123");
  });
});
