import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, Paperclip, Send } from "lucide-react";
import { ticketsDb } from "@/lib/db";
import { getAttachmentDownloadUrl } from "@/lib/db/storage";
import { useAuth } from "@/lib/auth";
import { getErrorMessage } from "@/lib/firebase-errors";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { cn, formatDateTime } from "@/lib/utils";
import type { TicketAttachmentMeta } from "@/types";

export function AttachmentLink({ attachment }: { attachment: TicketAttachmentMeta }) {
  const { data: url } = useQuery({
    queryKey: ["attachment-url", attachment.storagePath],
    queryFn: () => getAttachmentDownloadUrl(attachment.storagePath),
    staleTime: 60 * 60 * 1000,
  });

  return (
    <a
      href={url ?? "#"}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => !url && e.preventDefault()}
      className="flex items-center gap-1 rounded-md border border-border bg-secondary px-2 py-1 text-xs hover:bg-secondary/70"
    >
      <Paperclip className="h-3 w-3" />
      {attachment.fileName}
    </a>
  );
}

export function CommentThread({ ticketId }: { ticketId: string }) {
  const { user, can } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isStaff = can("TICKET_ADD_INTERNAL_NOTE");

  const { data: comments, isLoading } = useQuery({
    queryKey: ["ticket-comments", ticketId],
    queryFn: () => ticketsDb.listTicketComments(ticketId),
  });

  const [body, setBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addComment = useMutation({
    mutationFn: () => ticketsDb.addTicketComment(ticketId, user!, body, isInternal, files),
    onSuccess: () => {
      setBody("");
      setFiles([]);
      setIsInternal(false);
      queryClient.invalidateQueries({ queryKey: ["ticket-comments", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["ticket-history", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      toast({ title: "Comment posted" });
    },
    onError: (err) => setError(getErrorMessage(err, "Unable to post comment.")),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!body.trim()) return;
    addComment.mutate();
  }

  const visibleComments = isStaff ? comments : comments?.filter((c) => !c.isInternal);

  return (
    <div className="space-y-4">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading conversation...</p>
      ) : visibleComments && visibleComments.length > 0 ? (
        <div className="space-y-3">
          {visibleComments.map((c) => (
            <div
              key={c.id}
              className={cn(
                "flex gap-3 rounded-lg border p-3",
                c.isInternal ? "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40" : "border-border bg-card"
              )}
            >
              <Avatar firstName={c.author.firstName} lastName={c.author.lastName} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">
                    {c.author.firstName} {c.author.lastName}
                  </span>
                  {c.isInternal && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                      <Lock className="h-2.5 w-2.5" /> Internal Note
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">{formatDateTime(c.createdAt)}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{c.body}</p>
                {c.attachments.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {c.attachments.map((a) => (
                      <AttachmentLink key={a.storagePath} attachment={a} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No replies yet.</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-2 rounded-lg border border-border bg-card p-3">
        <Textarea
          rows={3}
          placeholder={isInternal ? "Add an internal note (not visible to the requester)..." : "Write a reply..."}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <label htmlFor="comment-attachments" className="flex cursor-pointer items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <Paperclip className="h-3.5 w-3.5" />
              {files.length > 0 ? `${files.length} attached` : "Attach files"}
            </label>
            <input
              id="comment-attachments"
              type="file"
              multiple
              className="hidden"
              onChange={(e) => setFiles(e.target.files ? Array.from(e.target.files) : [])}
            />
            {isStaff && (
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
                Internal note (staff only)
              </label>
            )}
          </div>
          <Button type="submit" size="sm" disabled={!body.trim() || addComment.isPending}>
            <Send className="h-3.5 w-3.5" />
            {addComment.isPending ? "Sending..." : isInternal ? "Add Note" : "Reply"}
          </Button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </form>
    </div>
  );
}
