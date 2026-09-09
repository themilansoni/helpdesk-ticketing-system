import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FirebaseError } from "firebase/app";
import LoginPage from "@/pages/login-page";
import { renderWithProviders } from "./test-utils";

const mockLogin = vi.fn();

vi.mock("@/lib/db", () => ({
  referenceDb: {
    getSystemSettings: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/lib/auth", async () => {
  const mod = await import("./mocks/auth-mock");
  return {
    ...mod,
    useAuth: () => ({ ...mod.useAuth(), login: mockLogin }),
  };
});

describe("LoginPage", () => {
  beforeEach(() => {
    mockLogin.mockReset();
  });

  it("shows an error message on invalid credentials", async () => {
    mockLogin.mockRejectedValueOnce(new FirebaseError("auth/invalid-credential", "Invalid credentials"));

    renderWithProviders(<LoginPage />, { route: "/login" });

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/work email/i), "wrong@helpdesk.local");
    await user.type(screen.getByLabelText(/password/i), "wrongpassword");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/invalid email or password/i);
    });
    expect(mockLogin).toHaveBeenCalledWith("wrong@helpdesk.local", "wrongpassword");
  });

  it("calls login and navigates on success", async () => {
    mockLogin.mockResolvedValueOnce(undefined);

    renderWithProviders(<LoginPage />, { route: "/login" });

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/work email/i), "admin@helpdesk.local");
    await user.type(screen.getByLabelText(/password/i), "Passw0rd!123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("admin@helpdesk.local", "Passw0rd!123");
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("fills in demo credentials when a demo account is clicked", async () => {
    renderWithProviders(<LoginPage />, { route: "/login" });

    const user = userEvent.setup();
    await user.click(screen.getByText("Administrator"));

    expect(screen.getByLabelText(/work email/i)).toHaveValue("admin@helpdesk.local");
    expect(screen.getByLabelText(/password/i)).toHaveValue("Passw0rd!123");
  });
});
