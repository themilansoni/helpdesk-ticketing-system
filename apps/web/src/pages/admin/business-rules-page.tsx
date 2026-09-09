import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, PlusCircle, Zap } from "lucide-react";
import { businessRulesDb } from "@/lib/db";
import { getErrorMessage } from "@/lib/firebase-errors";
import { useCategories, usePriorities, useDepartments, useTechnicians } from "@/hooks/use-reference-data";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import type { BusinessRule } from "@/types";

const NONE = "__none__";

interface RuleFormState {
  name: string;
  keyword: string;
  setCategoryId: string;
  setPriorityId: string;
  setDepartmentId: string;
  assignTechnicianId: string;
  tags: string;
}

const EMPTY_FORM: RuleFormState = { name: "", keyword: "", setCategoryId: NONE, setPriorityId: NONE, setDepartmentId: NONE, assignTechnicianId: NONE, tags: "" };

function ruleSummary(rule: BusinessRule): string {
  const parts: string[] = [];
  if (rule.setCategoryName) parts.push(`Category: ${rule.setCategoryName}`);
  if (rule.setPriorityName) parts.push(`Priority: ${rule.setPriorityName}`);
  if (rule.setDepartmentName) parts.push(`Department: ${rule.setDepartmentName}`);
  if (rule.assignTechnicianName) parts.push(`Assign: ${rule.assignTechnicianName}`);
  if (rule.addTags.length > 0) parts.push(`Tags: ${rule.addTags.join(", ")}`);
  return parts.length > 0 ? parts.join(" · ") : "No actions configured";
}

function fromForm(form: RuleFormState): businessRulesDb.BusinessRuleInput {
  return {
    name: form.name.trim(),
    keyword: form.keyword.trim(),
    setCategoryId: form.setCategoryId === NONE ? null : form.setCategoryId,
    setPriorityId: form.setPriorityId === NONE ? null : form.setPriorityId,
    setDepartmentId: form.setDepartmentId === NONE ? null : form.setDepartmentId,
    assignTechnicianId: form.assignTechnicianId === NONE ? null : form.assignTechnicianId,
    addTags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
  };
}

function toForm(rule: BusinessRule): RuleFormState {
  return {
    name: rule.name,
    keyword: rule.keyword,
    setCategoryId: rule.setCategoryId ?? NONE,
    setPriorityId: rule.setPriorityId ?? NONE,
    setDepartmentId: rule.setDepartmentId ?? NONE,
    assignTechnicianId: rule.assignTechnicianId ?? NONE,
    tags: rule.addTags.join(", "),
  };
}

function hasAnyAction(form: RuleFormState): boolean {
  return form.setCategoryId !== NONE || form.setPriorityId !== NONE || form.setDepartmentId !== NONE || form.assignTechnicianId !== NONE || form.tags.trim() !== "";
}

export default function BusinessRulesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: categories } = useCategories();
  const { data: priorities } = usePriorities();
  const { data: departments } = useDepartments();
  const { data: technicians } = useTechnicians();

  const { data: rules, isLoading } = useQuery({ queryKey: ["businessRules"], queryFn: () => businessRulesDb.listBusinessRules() });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BusinessRule | null>(null);
  const [form, setForm] = useState<RuleFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BusinessRule | null>(null);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(rule: BusinessRule) {
    setEditing(rule);
    setForm(toForm(rule));
    setFormError(null);
    setFormOpen(true);
  }

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["businessRules"] });

  const save = useMutation({
    mutationFn: async () => {
      if (editing) await businessRulesDb.updateBusinessRule(editing.id, fromForm(form));
      else await businessRulesDb.createBusinessRule(fromForm(form));
    },
    onSuccess: () => {
      invalidate();
      toast({ title: editing ? "Rule updated" : "Rule created" });
      setFormOpen(false);
    },
    onError: (err) => setFormError(getErrorMessage(err, "Unable to save this rule.")),
  });

  const toggleEnabled = useMutation({
    mutationFn: (rule: BusinessRule) => businessRulesDb.setBusinessRuleEnabled(rule.id, !rule.enabled),
    onSuccess: invalidate,
  });

  const move = useMutation({
    mutationFn: ({ id, direction }: { id: string; direction: "up" | "down" }) => businessRulesDb.moveBusinessRule(rules ?? [], id, direction),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: () => businessRulesDb.deleteBusinessRule(deleteTarget!.id),
    onSuccess: () => {
      invalidate();
      toast({ title: "Rule deleted" });
      setDeleteTarget(null);
    },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Automation"
        description="Auto-categorize, prioritize, tag, or assign new tickets by keyword. Runs the instant a ticket is submitted."
        actions={
          <Button onClick={openCreate}>
            <PlusCircle className="h-4 w-4" /> New Rule
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : !rules || rules.length === 0 ? (
        <EmptyState
          icon={Zap}
          title="No automation rules yet"
          description='e.g. "when a ticket mentions VPN, set category to Network and assign to IT" — matches against the subject and description.'
        />
      ) : (
        <div className="space-y-2">
          {rules.map((rule, i) => (
            <div key={rule.id} className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
              <div className="flex flex-col gap-0.5 pt-0.5">
                <Button variant="ghost" size="icon" className="h-6 w-6" disabled={i === 0} onClick={() => move.mutate({ id: rule.id, direction: "up" })}>
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" disabled={i === rules.length - 1} onClick={() => move.mutate({ id: rule.id, direction: "down" })}>
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{rule.name}</p>
                  <Badge variant="outline" className="font-mono text-[10px]">contains "{rule.keyword}"</Badge>
                  {!rule.enabled && <Badge variant="destructive">Disabled</Badge>}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{ruleSummary(rule)}</p>
              </div>

              <div className="flex shrink-0 gap-1">
                <Button variant="outline" size="sm" onClick={() => toggleEnabled.mutate(rule)}>
                  {rule.enabled ? "Disable" : "Enable"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => openEdit(rule)}>Edit</Button>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteTarget(rule)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Rule" : "New Rule"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Rule name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Route VPN issues to IT" />
            </div>
            <div className="space-y-1.5">
              <Label>Keyword</Label>
              <Input value={form.keyword} onChange={(e) => setForm({ ...form, keyword: e.target.value })} placeholder="vpn" />
              <p className="text-xs text-muted-foreground">Matched against the ticket's subject and description, case-insensitive.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
              <div className="space-y-1.5">
                <Label>Set category</Label>
                <Select value={form.setCategoryId} onValueChange={(v) => setForm({ ...form, setCategoryId: v })}>
                  <SelectTrigger aria-label="Set category"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>No change</SelectItem>
                    {categories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Set priority</Label>
                <Select value={form.setPriorityId} onValueChange={(v) => setForm({ ...form, setPriorityId: v })}>
                  <SelectTrigger aria-label="Set priority"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>No change</SelectItem>
                    {priorities?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Set department</Label>
                <Select value={form.setDepartmentId} onValueChange={(v) => setForm({ ...form, setDepartmentId: v })}>
                  <SelectTrigger aria-label="Set department"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>No change</SelectItem>
                    {departments?.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Assign to</Label>
                <Select value={form.assignTechnicianId} onValueChange={(v) => setForm({ ...form, assignTechnicianId: v })}>
                  <SelectTrigger aria-label="Assign to"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>No change</SelectItem>
                    {technicians?.map((t) => <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Add tags</Label>
                <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="vpn, network (comma-separated)" />
              </div>
            </div>

            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button
              disabled={!form.name.trim() || !form.keyword.trim() || !hasAnyAction(form) || save.isPending}
              onClick={() => save.mutate()}
            >
              {save.isPending ? "Saving..." : editing ? "Save Changes" : "Create Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.name}"?`}
        description="This rule will stop applying to new tickets immediately. This can't be undone."
        confirmLabel="Delete"
        variant="destructive"
        isLoading={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </div>
  );
}
