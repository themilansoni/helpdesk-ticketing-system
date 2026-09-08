import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Paperclip } from "lucide-react";
import { ticketsDb } from "@/lib/db";
import { useAuth } from "@/lib/auth";
import { getErrorMessage } from "@/lib/firebase-errors";
import { CONTACT_METHODS } from "@helpdesk/shared";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useCategories, usePriorities, useDepartments, useLocations, useMyAssets } from "@/hooks/use-reference-data";

export default function CreateTicketPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: categories } = useCategories();
  const { data: priorities } = usePriorities();
  const { data: departments } = useDepartments();
  const { data: locations } = useLocations();
  const { data: myAssets } = useMyAssets(user?.id);

  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [priorityId, setPriorityId] = useState("");
  const [departmentId, setDepartmentId] = useState(user?.department?.id ?? "");
  const [locationId, setLocationId] = useState(user?.location?.id ?? "");
  const [assetId, setAssetId] = useState("");
  const [contactMethod, setContactMethod] = useState<string>("email");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const selectedCategory = categories?.find((c) => c.id === categoryId);

  const createTicket = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("You must be signed in.");
      return ticketsDb.createTicket(
        {
          subject,
          description,
          categoryId,
          subcategoryId: subcategoryId || undefined,
          priorityId,
          departmentId: departmentId || undefined,
          locationId: locationId || undefined,
          assetId: assetId || undefined,
          preferredContactMethod: contactMethod as (typeof CONTACT_METHODS)[number],
        },
        user,
        files
      );
    },
    onSuccess: (ticket) => {
      toast({ title: "Ticket created", description: `${ticket.ticketNumber} has been submitted.` });
      navigate(`/tickets/${ticket.id}`);
    },
    onError: (err) => {
      setError(getErrorMessage(err, "Unable to create ticket. Please try again."));
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!categoryId || !priorityId) {
      setError("Please select a category and priority.");
      return;
    }
    createTicket.mutate();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Create Ticket" description="Submit a new IT support request." />

      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="space-y-5 p-5">
            <div className="space-y-1.5">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" required value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Brief summary of the issue" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                required
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue in detail: what happened, when it started, and any error messages."
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={categoryId}
                  onValueChange={(v) => {
                    setCategoryId(v);
                    setSubcategoryId("");
                  }}
                >
                  <SelectTrigger aria-label="Category"><SelectValue placeholder="Select a category" /></SelectTrigger>
                  <SelectContent>
                    {categories?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Subcategory</Label>
                <Select value={subcategoryId} onValueChange={setSubcategoryId} disabled={!selectedCategory}>
                  <SelectTrigger aria-label="Subcategory"><SelectValue placeholder="Select a subcategory" /></SelectTrigger>
                  <SelectContent>
                    {selectedCategory?.subcategories.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={priorityId} onValueChange={setPriorityId}>
                  <SelectTrigger aria-label="Priority"><SelectValue placeholder="Select priority" /></SelectTrigger>
                  <SelectContent>
                    {priorities?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Preferred contact method</Label>
                <Select value={contactMethod} onValueChange={setContactMethod}>
                  <SelectTrigger aria-label="Preferred contact method"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONTACT_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>{m[0].toUpperCase() + m.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Department</Label>
                <Select value={departmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger aria-label="Department"><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    {departments?.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Location</Label>
                <Select value={locationId} onValueChange={setLocationId}>
                  <SelectTrigger aria-label="Location"><SelectValue placeholder="Select location" /></SelectTrigger>
                  <SelectContent>
                    {locations?.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {myAssets && myAssets.data.length > 0 && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Related asset (optional)</Label>
                  <Select value={assetId} onValueChange={setAssetId}>
                    <SelectTrigger aria-label="Related asset"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      {myAssets.data.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.assetTag} - {a.model ?? a.assetType.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="attachments">Attachments (optional)</Label>
              <label
                htmlFor="attachments"
                className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-input px-3 py-3 text-sm text-muted-foreground hover:bg-secondary"
              >
                <Paperclip className="h-4 w-4" />
                {files.length > 0 ? `${files.length} file(s) selected` : "Click to attach screenshots or documents"}
              </label>
              <input
                id="attachments"
                type="file"
                multiple
                className="hidden"
                onChange={(e) => setFiles(e.target.files ? Array.from(e.target.files) : [])}
              />
            </div>

            {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTicket.isPending}>
                {createTicket.isPending ? "Submitting..." : "Submit Ticket"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
