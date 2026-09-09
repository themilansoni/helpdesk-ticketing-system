import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusCircle, Trash2 } from "lucide-react";
import { referenceDb } from "@/lib/db";
import { getErrorMessage } from "@/lib/firebase-errors";
import { useAssetTypes, useManufacturers, useAssetModels } from "@/hooks/use-reference-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";

const NONE = "__none__";

export function CatalogManagerDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: manufacturers } = useManufacturers();
  const { data: models } = useAssetModels();
  const { data: assetTypes } = useAssetTypes();

  const [manufacturerName, setManufacturerName] = useState("");
  const [modelName, setModelName] = useState("");
  const [modelManufacturerId, setModelManufacturerId] = useState("");
  const [modelAssetTypeId, setModelAssetTypeId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createManufacturer = useMutation({
    mutationFn: () => referenceDb.createManufacturer({ name: manufacturerName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manufacturers"] });
      setManufacturerName("");
      toast({ title: "Manufacturer added" });
    },
    onError: (err) => setError(getErrorMessage(err, "Unable to add manufacturer.")),
  });

  const deleteManufacturer = useMutation({
    mutationFn: (id: string) => referenceDb.deleteManufacturer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manufacturers"] });
      toast({ title: "Manufacturer removed" });
    },
    onError: (err) => toast({ title: "Unable to remove", description: getErrorMessage(err) }),
  });

  const createModel = useMutation({
    mutationFn: () =>
      referenceDb.createAssetModel({
        name: modelName,
        manufacturerId: modelManufacturerId || undefined,
        assetTypeId: modelAssetTypeId || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-models"] });
      setModelName("");
      toast({ title: "Model added" });
    },
    onError: (err) => setError(getErrorMessage(err, "Unable to add model.")),
  });

  const deleteModel = useMutation({
    mutationFn: (id: string) => referenceDb.deleteAssetModel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-models"] });
      toast({ title: "Model removed" });
    },
    onError: (err) => toast({ title: "Unable to remove", description: getErrorMessage(err) }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Asset Catalog</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="manufacturers">
          <TabsList>
            <TabsTrigger value="manufacturers">Manufacturers</TabsTrigger>
            <TabsTrigger value="models">Models</TabsTrigger>
          </TabsList>

          <TabsContent value="manufacturers" className="space-y-3">
            <div className="flex gap-2">
              <Input placeholder="e.g. Dell" value={manufacturerName} onChange={(e) => setManufacturerName(e.target.value)} />
              <Button size="icon" disabled={!manufacturerName || createManufacturer.isPending} onClick={() => createManufacturer.mutate()}>
                <PlusCircle className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex max-h-56 flex-wrap gap-1.5 overflow-y-auto">
              {manufacturers?.length ? (
                manufacturers.map((m) => (
                  <Badge key={m.id} variant="secondary" className="cursor-pointer gap-1" onClick={() => deleteManufacturer.mutate(m.id)}>
                    {m.name}
                    <Trash2 className="h-2.5 w-2.5" />
                  </Badge>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No manufacturers yet.</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="models" className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2 space-y-1.5">
                <Label>Model name</Label>
                <Input placeholder="e.g. Latitude 5540" value={modelName} onChange={(e) => setModelName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Manufacturer</Label>
                <Select value={modelManufacturerId || NONE} onValueChange={(v) => setModelManufacturerId(v === NONE ? "" : v)}>
                  <SelectTrigger aria-label="Manufacturer"><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {manufacturers?.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Asset type</Label>
                <Select value={modelAssetTypeId || NONE} onValueChange={(v) => setModelAssetTypeId(v === NONE ? "" : v)}>
                  <SelectTrigger aria-label="Asset type"><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {assetTypes?.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 flex justify-end">
                <Button size="sm" disabled={!modelName || createModel.isPending} onClick={() => createModel.mutate()}>
                  <PlusCircle className="h-3.5 w-3.5" /> Add Model
                </Button>
              </div>
            </div>
            <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto">
              {models?.length ? (
                models.map((m) => (
                  <Badge key={m.id} variant="secondary" className="cursor-pointer gap-1" onClick={() => deleteModel.mutate(m.id)}>
                    {m.name}
                    {m.manufacturer && <span className="opacity-70">· {m.manufacturer.name}</span>}
                    <Trash2 className="h-2.5 w-2.5" />
                  </Badge>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No models yet.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
