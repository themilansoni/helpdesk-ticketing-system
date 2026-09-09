import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute, RequirePermission } from "@/components/layout/protected-route";
import { AppLayout } from "@/components/layout/app-layout";

import LoginPage from "@/pages/login-page";
import DashboardPage from "@/pages/dashboard-page";
import TicketListPage from "@/pages/tickets/ticket-list-page";
import CreateTicketPage from "@/pages/tickets/create-ticket-page";
import TicketDetailPage from "@/pages/tickets/ticket-detail-page";
import KnowledgeBaseListPage from "@/pages/knowledge-base-list-page";
import KnowledgeArticlePage from "@/pages/knowledge-article-page";
import AssetsPage from "@/pages/assets-page";
import ConsumablesPage from "@/pages/consumables-page";
import AccessoriesPage from "@/pages/accessories-page";
import LicensesPage from "@/pages/licenses-page";
import NotificationsPage from "@/pages/notifications-page";
import ProfilePage from "@/pages/profile-page";
import ReportsPage from "@/pages/reports-page";
import UsersPage from "@/pages/admin/users-page";
import DepartmentsPage from "@/pages/admin/departments-page";
import CategoriesPage from "@/pages/admin/categories-page";
import PrioritiesPage from "@/pages/admin/priorities-page";
import BusinessRulesPage from "@/pages/admin/business-rules-page";
import AuditLogsPage from "@/pages/admin/audit-logs-page";
import SettingsPage from "@/pages/admin/settings-page";
import NotFoundPage from "@/pages/not-found-page";
import ForbiddenPage from "@/pages/forbidden-page";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forbidden" element={<ForbiddenPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />

          <Route path="/tickets" element={<TicketListPage />} />
          <Route path="/tickets/new" element={<CreateTicketPage />} />
          <Route path="/tickets/:id" element={<TicketDetailPage />} />

          <Route path="/knowledge-base" element={<KnowledgeBaseListPage />} />
          <Route path="/knowledge-base/:idOrSlug" element={<KnowledgeArticlePage />} />

          <Route path="/assets" element={<AssetsPage />} />
          <Route
            path="/consumables"
            element={
              <RequirePermission permission="ASSET_VIEW">
                <ConsumablesPage />
              </RequirePermission>
            }
          />
          <Route
            path="/accessories"
            element={
              <RequirePermission permission="ASSET_VIEW">
                <AccessoriesPage />
              </RequirePermission>
            }
          />
          <Route
            path="/licenses"
            element={
              <RequirePermission permission="ASSET_VIEW">
                <LicensesPage />
              </RequirePermission>
            }
          />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/profile" element={<ProfilePage />} />

          <Route
            path="/reports"
            element={
              <RequirePermission permission="REPORTS_VIEW">
                <ReportsPage />
              </RequirePermission>
            }
          />

          <Route
            path="/admin/users"
            element={
              <RequirePermission permission="USER_MANAGE">
                <UsersPage />
              </RequirePermission>
            }
          />
          <Route
            path="/admin/departments"
            element={
              <RequirePermission permission="DEPARTMENT_MANAGE">
                <DepartmentsPage />
              </RequirePermission>
            }
          />
          <Route
            path="/admin/categories"
            element={
              <RequirePermission permission="CATEGORY_MANAGE">
                <CategoriesPage />
              </RequirePermission>
            }
          />
          <Route
            path="/admin/priorities"
            element={
              <RequirePermission permission="PRIORITY_MANAGE">
                <PrioritiesPage />
              </RequirePermission>
            }
          />
          <Route
            path="/admin/automation"
            element={
              <RequirePermission permission="AUTOMATION_MANAGE">
                <BusinessRulesPage />
              </RequirePermission>
            }
          />
          <Route
            path="/admin/audit-logs"
            element={
              <RequirePermission permission="AUDIT_LOG_VIEW">
                <AuditLogsPage />
              </RequirePermission>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <RequirePermission permission="SYSTEM_SETTINGS_MANAGE">
                <SettingsPage />
              </RequirePermission>
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
