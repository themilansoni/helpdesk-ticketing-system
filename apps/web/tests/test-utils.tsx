import type { ReactElement, ReactNode } from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { CurrentUser } from "@/types";

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

export function renderWithProviders(
  ui: ReactElement,
  { route = "/", queryClient = createTestQueryClient() }: { route?: string; queryClient?: QueryClient } = {}
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[route]}>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>{children}</TooltipProvider>
        </QueryClientProvider>
      </MemoryRouter>
    );
  }
  return render(ui, { wrapper: Wrapper });
}

export const TEST_EMPLOYEE: CurrentUser = {
  id: "emp-1",
  employeeId: "EMP-0004",
  firstName: "Emma",
  lastName: "Employee",
  email: "employee@helpdesk.local",
  phone: null,
  jobTitle: null,
  status: "active",
  lastLoginAt: null,
  role: { name: "Employee" },
  department: { id: "dep-1", name: "Sales" },
  location: { id: "loc-1", name: "HQ" },
  managerId: null,
};

export const TEST_TECHNICIAN: CurrentUser = {
  ...TEST_EMPLOYEE,
  id: "tech-1",
  firstName: "Tom",
  lastName: "Technician",
  email: "technician@helpdesk.local",
  role: { name: "Technician" },
};

export const TEST_ADMIN: CurrentUser = {
  ...TEST_EMPLOYEE,
  id: "admin-1",
  firstName: "Ava",
  lastName: "Admin",
  email: "admin@helpdesk.local",
  role: { name: "Administrator" },
};
