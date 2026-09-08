import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Profile" description="Your account details." />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Avatar firstName={user.firstName} lastName={user.lastName} className="h-14 w-14 text-lg" />
            <div>
              <CardTitle className="text-base text-foreground">
                {user.firstName} {user.lastName}
              </CardTitle>
              <Badge variant="secondary" className="mt-1">{user.role.name}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Separator className="mb-2" />
          <Row label="Employee ID" value={user.employeeId} />
          <Row label="Email" value={user.email} />
          <Row label="Phone" value={user.phone ?? "-"} />
          <Row label="Job Title" value={user.jobTitle ?? "-"} />
          <Row label="Department" value={user.department?.name ?? "-"} />
          <Row label="Location" value={user.location?.name ?? "-"} />
          <Row label="Status" value={<Badge variant={user.status === "active" ? "success" : "destructive"}>{user.status}</Badge>} />
          <Row label="Last login" value={formatDateTime(user.lastLoginAt)} />
        </CardContent>
      </Card>

      <p className="mt-3 text-xs text-muted-foreground">
        To update your profile details or reset your password, contact your IT administrator.
      </p>
    </div>
  );
}
