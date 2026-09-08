import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";

interface Setting {
  id: string;
  key: string;
  value: string;
  description: string | null;
}

function SettingRow({ setting }: { setting: Setting }) {
  const [value, setValue] = useState(setting.value);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const save = useMutation({
    mutationFn: () => api.put(`/settings/${setting.key}`, { value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast({ title: `${setting.key} updated` });
    },
  });

  return (
    <div className="flex flex-col gap-2 border-b border-border py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <Label className="font-mono text-xs text-muted-foreground">{setting.key}</Label>
        {setting.description && <p className="text-xs text-muted-foreground">{setting.description}</p>}
      </div>
      <div className="flex items-center gap-2">
        <Input value={value} onChange={(e) => setValue(e.target.value)} className="w-64" />
        <Button size="sm" disabled={value === setting.value || save.isPending} onClick={() => save.mutate()}>
          Save
        </Button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get<Setting[]>("/settings"),
  });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="System Settings" description="Global configuration for HelpDesk Pro." />
      <Card>
        <CardContent className="p-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : (
            settings?.map((s) => <SettingRow key={s.id} setting={s} />)
          )}
        </CardContent>
      </Card>
    </div>
  );
}
