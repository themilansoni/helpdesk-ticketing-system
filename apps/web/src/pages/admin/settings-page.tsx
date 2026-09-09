import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, X } from "lucide-react";
import { referenceDb } from "@/lib/db";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

const LOGO_MAX_DIMENSION = 256;
// Firestore documents cap out at 1MiB; keep the encoded logo well under that.
const LOGO_MAX_BYTES = 700_000;

function resizeImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file doesn't look like a valid image."));
      img.onload = () => {
        const scale = Math.min(1, LOGO_MAX_DIMENSION / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas is not supported in this browser."));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/png"));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function CompanyLogoField({ value }: { value: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const save = useMutation({
    mutationFn: (dataUrl: string) => referenceDb.updateSystemSetting("company_logo", dataUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast({ title: "Company logo updated" });
    },
    onError: (err) => toast({ title: "Couldn't save the logo", description: (err as Error).message, variant: "destructive" }),
  });

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please choose an image file", variant: "destructive" });
      return;
    }
    setIsProcessing(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      if (dataUrl.length > LOGO_MAX_BYTES) {
        toast({ title: "That image is still too large after resizing. Try a simpler image.", variant: "destructive" });
        return;
      }
      save.mutate(dataUrl);
    } catch (err) {
      toast({ title: "Couldn't process that image", description: (err as Error).message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <Label>Company logo</Label>
      <p className="text-xs text-muted-foreground">Shown on the sign-in page and in the sidebar. PNG or JPG, any size (it's resized automatically).</p>
      <div className="flex items-center gap-3 pt-1">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-secondary/40">
          {value ? (
            <img src={value} alt="Company logo" className="h-full w-full object-contain" />
          ) : (
            <ImagePlus className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isProcessing || save.isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            {isProcessing || save.isPending ? "Saving..." : value ? "Replace logo" : "Upload logo"}
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isProcessing || save.isPending}
              onClick={() => save.mutate("")}
            >
              <X className="h-3.5 w-3.5" />
              Remove
            </Button>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>
    </div>
  );
}

function CompanyNameField({ value }: { value: string }) {
  const [name, setName] = useState(value);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const save = useMutation({
    mutationFn: () => referenceDb.updateSystemSetting("company_name", name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast({ title: "Company name updated" });
    },
  });

  return (
    <div className="space-y-1.5">
      <Label htmlFor="company-name">Company name</Label>
      <p className="text-xs text-muted-foreground">Displayed in the header and on the sign-in page.</p>
      <div className="flex items-center gap-2 pt-1">
        <Input id="company-name" value={name} onChange={(e) => setName(e.target.value)} className="max-w-xs" />
        <Button size="sm" disabled={name === value || save.isPending} onClick={() => save.mutate()}>
          Save
        </Button>
      </div>
    </div>
  );
}

function SettingRow({ setting }: { setting: Setting }) {
  const [value, setValue] = useState(setting.value);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const save = useMutation({
    mutationFn: () => referenceDb.updateSystemSetting(setting.key, value),
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

const COMPANY_DETAIL_KEYS = new Set(["company_name", "company_logo"]);

export default function SettingsPage() {
  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: () => referenceDb.getSystemSettings(),
  });

  const companyName = settings?.find((s) => s.key === "company_name")?.value ?? "";
  const companyLogo = settings?.find((s) => s.key === "company_logo")?.value ?? "";
  const otherSettings = settings?.filter((s) => !COMPANY_DETAIL_KEYS.has(s.key));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="System Settings" description="Global configuration for HelpDesk Pro." />

      <Card>
        <CardHeader>
          <p className="text-sm font-semibold text-foreground">Company details</p>
        </CardHeader>
        <CardContent className="space-y-5">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-10" />
            </div>
          ) : (
            <>
              <CompanyLogoField value={companyLogo} />
              <CompanyNameField value={companyName} />
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <p className="text-sm font-semibold text-foreground">Advanced settings</p>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : (
            otherSettings?.map((s) => <SettingRow key={s.id} setting={s} />)
          )}
        </CardContent>
      </Card>
    </div>
  );
}
