import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { render } from "@testing-library/react";
import { Sidebar } from "@/components/layout/sidebar";

function renderSidebar(role: "Employee" | "Technician" | "Administrator") {
  return render(
    <MemoryRouter>
      <Sidebar role={role} open={true} />
    </MemoryRouter>
  );
}

describe("Role-based navigation", () => {
  it("shows the employee navigation without admin-only links", () => {
    renderSidebar("Employee");
    expect(screen.getByText("My Tickets")).toBeInTheDocument();
    expect(screen.getByText("Create Ticket")).toBeInTheDocument();
    expect(screen.getByText("Knowledge Base")).toBeInTheDocument();
    expect(screen.queryByText("Users")).not.toBeInTheDocument();
    expect(screen.queryByText("Audit Logs")).not.toBeInTheDocument();
    expect(screen.queryByText("Unassigned Tickets")).not.toBeInTheDocument();
  });

  it("shows technician-specific links not available to employees", () => {
    renderSidebar("Technician");
    expect(screen.getByText("Unassigned Tickets")).toBeInTheDocument();
    expect(screen.getByText("SLA Breaches")).toBeInTheDocument();
    expect(screen.getByText("Reports")).toBeInTheDocument();
    expect(screen.queryByText("Users")).not.toBeInTheDocument();
  });

  it("shows the full admin navigation for administrators", () => {
    renderSidebar("Administrator");
    for (const label of ["Users", "Departments", "Categories", "SLA Policies", "Audit Logs", "System Settings"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });
});
