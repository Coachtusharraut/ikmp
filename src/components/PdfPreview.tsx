import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Eye, Download } from "lucide-react";
import { openFile } from "@/lib/download-file";

export function isPdf(url: string, name?: string) {
  const s = `${name ?? ""} ${url}`.toLowerCase();
  return /\.pdf(\?|#|$)/.test(s) || s.includes("application/pdf");
}

export function FileChip({ url, name }: { url: string; name: string }) {
  const [open, setOpen] = useState(false);
  const pdf = isPdf(url, name);

  return (
    <>
      <span className="inline-flex items-center gap-1 rounded-full border bg-card overflow-hidden">
        {pdf ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 hover:bg-accent transition"
          >
            <Eye className="size-3.5" /> {name}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => openFile(url, name)}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 hover:bg-accent transition"
          >
            <FileText className="size-3.5" /> {name}
          </button>
        )}
        {pdf && (
          <button
            type="button"
            onClick={() => openFile(url, name)}
            title="Download"
            className="px-2 py-1.5 text-muted-foreground hover:text-foreground hover:bg-accent border-l transition"
          >
            <Download className="size-3.5" />
          </button>
        )}
      </span>

      {pdf && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-0 gap-0 flex flex-col">
            <DialogHeader className="p-4 border-b flex-row items-center justify-between space-y-0">
              <DialogTitle className="text-base flex items-center gap-2 truncate">
                <FileText className="size-4 text-spice shrink-0" />
                <span className="truncate">{name}</span>
              </DialogTitle>
              <Button size="sm" variant="outline" onClick={() => openFile(url, name)}>
                <Download className="size-3.5 mr-1.5" /> Download
              </Button>
            </DialogHeader>
            <div className="flex-1 min-h-0 bg-muted">
              <iframe
                src={`${url}#toolbar=1&view=FitH`}
                title={name}
                className="w-full h-full"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
