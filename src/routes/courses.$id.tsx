import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { ProtectedVideo } from "@/components/ProtectedVideo";
import { ArrowLeft, CheckCircle2, Lock, FileText, BookOpen, CheckCircle, Ticket, Clock, IndianRupee, Copy } from "lucide-react";
import { toast } from "sonner";
import { Linkify } from "@/lib/linkify";
import { openFile } from "@/lib/download-file";
import { FileChip } from "@/components/PdfPreview";

export const Route = createFileRoute("/courses/$id")({
  component: CourseDetail,
});


type Course = {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  video_type: "youtube" | "upload";
  price: number;
  is_free: boolean;
  is_published: boolean;
  created_by: string | null;
};

type Lesson = {
  id: string;
  course_id: string;
  module_id: string | null;
  title: string;
  description: string | null;
  video_url: string | null;
  video_type: "youtube" | "upload";
  homework: string | null;
  sort_order: number;
};

type Module = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  sort_order: number;
};

type LessonFile = {
  id: string;
  lesson_id: string;
  name: string;
  file_url: string;
};

function CourseDetail() {
  const { id } = useParams({ from: "/courses/$id" });
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: course, isLoading, error } = useQuery({
    queryKey: ["course", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Course not found");
      return data as Course;
    },
    enabled: !!user,
  });

  const { data: enrollment } = useQuery({
    queryKey: ["enrollment", id, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("course_enrollments")
        .select("id,payment_status,amount_paid,coupon_code")
        .eq("course_id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      return data as { id: string; payment_status: string; amount_paid: number | null; coupon_code: string | null } | null;
    },
    enabled: !!user,
  });

  const enrolled = !!enrollment && ["paid", "free", "coupon"].includes(enrollment.payment_status);
  const pending = enrollment?.payment_status === "pending";
  const canWatch = !!course && (course.is_free || enrolled);


  const { data: lessons = [] } = useQuery({
    queryKey: ["lessons", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_lessons")
        .select("*")
        .eq("course_id", id)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Lesson[];
    },
    enabled: !!user && canWatch,
  });

  const { data: modules = [] } = useQuery({
    queryKey: ["modules", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_modules")
        .select("*")
        .eq("course_id", id)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Module[];
    },
    enabled: !!user && canWatch,
  });

  const lessonIds = lessons.map((l) => l.id);
  const { data: files = [] } = useQuery({
    queryKey: ["lesson_files_all", id, lessonIds.join(",")],
    queryFn: async () => {
      if (lessonIds.length === 0) return [];
      const { data, error } = await supabase
        .from("course_lesson_files")
        .select("*")
        .in("lesson_id", lessonIds);
      if (error) throw error;
      return data as LessonFile[];
    },
    enabled: lessonIds.length > 0,
  });

  const { data: courseFiles = [] } = useQuery({
    queryKey: ["course_files", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("course_files")
        .select("*")
        .eq("course_id", id);
      if (error) throw error;
      return data as { id: string; name: string; file_url: string }[];
    },
    enabled: !!user && canWatch,
  });

  const { data: progress = [] } = useQuery({
    queryKey: ["lesson_progress", id, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("lesson_progress")
        .select("lesson_id")
        .eq("user_id", user.id)
        .eq("course_id", id);
      if (error) throw error;
      return data as { lesson_id: string }[];
    },
    enabled: !!user && canWatch,
  });

  const completedIds = new Set(progress.map((p) => p.lesson_id));
  const isOwner = !!user && !!course && course.created_by === user.id;

  const { data: isAdmin = false } = useQuery({
    queryKey: ["is_admin", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

  const bypassGate = isOwner || isAdmin;

  const markComplete = useMutation({
    mutationFn: async (lessonId: string) => {
      if (!user) return;
      const { error } = await supabase.from("lesson_progress").insert({
        user_id: user.id,
        lesson_id: lessonId,
        course_id: id,
      });
      if (error && !error.message.includes("duplicate")) throw error;
    },
    onSuccess: () => {
      toast.success("Lesson completed! Next lesson unlocked.");
      qc.invalidateQueries({ queryKey: ["lesson_progress", id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const enrolFree = useMutation({
    mutationFn: async () => {
      if (!user || !course) return;
      const { error } = await supabase.from("course_enrollments").insert({
        user_id: user.id,
        course_id: course.id,
        payment_status: "free",
        amount_paid: 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("You're enrolled!");
      qc.invalidateQueries({ queryKey: ["enrollment", id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Link to="/login" className="text-spice underline">
          Sign in to view courses
        </Link>
      </div>
    );
  }
  if (isLoading) {
    return <div className="container mx-auto px-4 py-16 text-muted-foreground">Loading…</div>;
  }
  if (error || !course) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">
          Course not found or unavailable.{" "}
          <Link to="/courses" className="text-spice underline">
            Back to courses
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link
        to="/courses"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="size-4" /> All courses
      </Link>

      <h1 className="font-display text-3xl md:text-4xl font-semibold leading-tight">
        {course.title}
      </h1>
      {course.description && (
        <Linkify text={course.description} className="mt-3 text-muted-foreground" />
      )}

      {/* Intro video */}
      <div className="mt-6">
        {canWatch && course.video_url ? (
          <ProtectedVideo
            url={course.video_url}
            type={course.video_type}
            title={course.title}
          />
        ) : !canWatch ? (
          <div className="rounded-2xl border bg-card p-8 text-center">
            <Lock className="size-10 mx-auto text-muted-foreground mb-3" />
            <h2 className="font-display text-xl font-semibold">
              {pending ? "Payment pending approval" : "Enrol to access this course"}
            </h2>
            {pending ? (
              <p className="mt-2 text-sm text-muted-foreground">
                <Clock className="inline size-3.5 mr-1" />
                We've received your details. Access unlocks once the admin verifies your
                payment. You'll get an announcement when it's approved.
              </p>
            ) : (
              <CheckoutBox courseId={course.id} price={course.price} />
            )}
          </div>
        ) : null}
      </div>


      {canWatch && courseFiles.length > 0 && (
        <div className="mt-6 rounded-2xl border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="size-4 text-spice" />
            <h2 className="font-display text-lg font-semibold">Course resources</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {courseFiles.map((f) => (
              <FileChip key={f.id} url={f.file_url} name={f.name} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center gap-3">
        {enrolled ? (
          <span className="inline-flex items-center gap-2 text-sm text-spice">
            <CheckCircle2 className="size-4" /> You're enrolled
          </span>
        ) : course.is_free ? (
          <Button
            onClick={() => enrolFree.mutate()}
            disabled={enrolFree.isPending}
            className="bg-spice text-spice-foreground hover:bg-spice/90"
          >
            Enroll for free
          </Button>
        ) : null}
      </div>

      {/* Lessons grouped by module */}
      {canWatch && lessons.length > 0 && (() => {
        // Build module groups in display order. Lessons without module_id go into a synthetic "Other" group at the end.
        const groups: { module: Module | null; lessons: Lesson[] }[] = [];
        modules.forEach((m) => {
          const list = lessons.filter((l) => l.module_id === m.id);
          if (list.length) groups.push({ module: m, lessons: list });
        });
        const orphans = lessons.filter((l) => !l.module_id || !modules.some((m) => m.id === l.module_id));
        if (orphans.length) groups.push({ module: null, lessons: orphans });

        // Global lesson order for sequential unlock
        const ordered = groups.flatMap((g) => g.lessons);
        const globalIndexById = new Map(ordered.map((l, idx) => [l.id, idx]));

        return (
          <div className="mt-12">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="size-5 text-spice" />
              <h2 className="font-display text-2xl font-semibold">Course content</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-6">
              Lessons unlock one at a time. Complete the current lesson to unlock the next.
            </p>

            <div className="space-y-10">
              {groups.map((g, gi) => (
                <div key={g.module?.id ?? "orphans"}>
                  <div className="mb-4 pb-2 border-b">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-spice">
                      {g.module ? `Module ${gi + 1}` : "Additional lessons"}
                    </div>
                    <h3 className="font-display text-xl font-semibold mt-0.5">
                      {g.module?.title ?? "Other"}
                    </h3>
                    {g.module?.description && (
                      <p className="text-sm text-muted-foreground mt-1">{g.module.description}</p>
                    )}
                  </div>

                  <div className="space-y-6">
                    {g.lessons.map((l) => {
                      const i = globalIndexById.get(l.id) ?? 0;
                      const lessonFiles = files.filter((f) => f.lesson_id === l.id);
                      const isCompleted = completedIds.has(l.id);
                      const prevAllDone = ordered
                        .slice(0, i)
                        .every((pl) => completedIds.has(pl.id));
                      const isUnlocked = bypassGate || i === 0 || prevAllDone;

                      return (
                        <div key={l.id} className="rounded-2xl border bg-card overflow-hidden">
                          <div className="p-5 border-b flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                Lesson {i + 1}
                                {isCompleted && (
                                  <span className="inline-flex items-center gap-1 text-spice normal-case tracking-normal">
                                    <CheckCircle className="size-3" /> Completed
                                  </span>
                                )}
                                {!isUnlocked && (
                                  <span className="inline-flex items-center gap-1 text-muted-foreground normal-case tracking-normal">
                                    <Lock className="size-3" /> Locked
                                  </span>
                                )}
                              </div>
                              <h4 className="font-display text-xl font-semibold mt-1">{l.title}</h4>
                              {isUnlocked && l.description && (
                                <Linkify text={l.description} className="text-sm text-muted-foreground mt-2" />
                              )}
                            </div>
                          </div>

                          {!isUnlocked ? (
                            <div className="p-6 text-center bg-muted/30">
                              <Lock className="size-8 mx-auto text-muted-foreground mb-2" />
                              <p className="text-sm text-muted-foreground">
                                Complete the previous lesson to unlock this one.
                              </p>
                            </div>
                          ) : (
                            <>
                              {l.video_url && (
                                <div className="p-5">
                                  <ProtectedVideo
                                    url={l.video_url}
                                    type={(l.video_type ?? "youtube") as "youtube" | "upload"}
                                    title={l.title}
                                  />
                                </div>
                              )}
                              {l.homework && (
                                <div className="px-5 pb-5">
                                  <div className="rounded-xl bg-accent/40 p-4">
                                    <div className="text-xs uppercase tracking-wider text-spice mb-1">
                                      Homework
                                    </div>
                                    <p className="text-sm whitespace-pre-line">{l.homework}</p>
                                  </div>
                                </div>
                              )}
                              {lessonFiles.length > 0 && (
                                <div className="px-5 pb-5">
                                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                                    Attachments
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {lessonFiles.map((f) => (
                                      <FileChip key={f.id} url={f.file_url} name={f.name} />
                                    ))}
                                  </div>
                                </div>
                              )}
                              {!bypassGate && (
                                <div className="px-5 pb-5">
                                  {isCompleted ? (
                                    <div className="inline-flex items-center gap-2 text-sm text-spice">
                                      <CheckCircle className="size-4" /> Lesson completed
                                    </div>
                                  ) : (
                                    <Button
                                      onClick={() => markComplete.mutate(l.id)}
                                      disabled={markComplete.isPending}
                                      className="bg-spice text-spice-foreground hover:bg-spice/90"
                                    >
                                      Mark as complete & unlock next
                                    </Button>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {canWatch && lessons.length === 0 && (
        <div className="mt-10 rounded-xl border bg-muted/30 p-6 text-sm text-muted-foreground text-center">
          More lessons coming soon.
        </div>
      )}

      <div className="mt-8 rounded-xl border bg-muted/30 p-4 text-xs text-muted-foreground">
        🔒 Videos are protected against casual download and right-click. Note: no web protection
        can fully prevent screen recording.
      </div>
    </div>
  );
}

/* ────────────── Checkout: coupon + direct payment ────────────── */

function CheckoutBox({ courseId, price }: { courseId: string; price: number }) {
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [payOpen, setPayOpen] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["payment_settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("upi_id,upi_qr_url,payment_instructions")
        .limit(1)
        .maybeSingle();
      return data as {
        upi_id: string | null;
        upi_qr_url: string | null;
        payment_instructions: string | null;
      } | null;
    },
  });

  const redeem = useMutation({
    mutationFn: async () => {
      const c = code.trim();
      if (!c) throw new Error("Enter a coupon code");
      const { data, error } = await (supabase as any).rpc("redeem_coupon", {
        _code: c,
        _course_id: courseId,
      });
      if (error) throw error;
      return data?.[0] as { enrollment_id: string; final_price: number; status: string };
    },
    onSuccess: (r) => {
      if (r.status === "coupon") {
        toast.success("Coupon applied — you're enrolled for free!");
      } else {
        toast.success(`Coupon applied — pay ₹${r.final_price} to unlock.`);
        setPayOpen(true);
      }
      qc.invalidateQueries({ queryKey: ["enrollment", courseId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="mt-2 max-w-md mx-auto text-left space-y-4">
      <div className="text-center">
        <div className="text-3xl font-display font-bold flex items-center justify-center gap-1">
          <IndianRupee className="size-6" />
          {price}
        </div>
        <p className="text-xs text-muted-foreground">One-time payment · Lifetime access</p>
      </div>

      <div>
        <Label className="text-xs uppercase tracking-wider flex items-center gap-1.5">
          <Ticket className="size-3.5" /> Have a coupon code?
        </Label>
        <div className="flex gap-2 mt-1.5">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ENTER CODE"
            className="uppercase"
          />
          <Button
            variant="outline"
            onClick={() => redeem.mutate()}
            disabled={redeem.isPending || !code.trim()}
          >
            Apply
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">
          100%-off codes enrol you instantly. Partial discounts show reduced amount to pay.
        </p>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">or</span>
        </div>
      </div>

      <Button
        className="w-full bg-spice text-spice-foreground hover:bg-spice/90"
        onClick={() => setPayOpen(true)}
      >
        Pay ₹{price} directly
      </Button>

      <PaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        courseId={courseId}
        amount={price}
        settings={settings ?? null}
      />
    </div>
  );
}

function PaymentDialog({
  open,
  onOpenChange,
  courseId,
  amount,
  settings,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  courseId: string;
  amount: number;
  settings: {
    upi_id: string | null;
    upi_qr_url: string | null;
    payment_instructions: string | null;
  } | null;
}) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [method, setMethod] = useState<string>("GPay");
  const [reference, setReference] = useState("");

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in required");
      if (!reference.trim()) throw new Error("Enter transaction reference / UTR");
      // Upsert to pending
      const { error } = await (supabase as any)
        .from("course_enrollments")
        .upsert(
          {
            user_id: user.id,
            course_id: courseId,
            payment_status: "pending",
            amount_paid: amount,
            payment_method: method,
            payment_reference: reference.trim(),
          },
          { onConflict: "user_id,course_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payment submitted — admin will approve shortly.");
      setReference("");
      onOpenChange(false);
      qc.invalidateQueries({ queryKey: ["enrollment", courseId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const upiLink = settings?.upi_id
    ? `upi://pay?pa=${encodeURIComponent(settings.upi_id)}&am=${amount}&cu=INR&tn=${encodeURIComponent(
        "Course " + courseId.slice(0, 8)
      )}`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pay ₹{amount}</DialogTitle>
          <DialogDescription>
            Pay via UPI (GPay, Paytm, PhonePe, BHIM) or card, then submit your transaction
            reference. Admin verifies and unlocks access.
          </DialogDescription>
        </DialogHeader>

        {settings?.upi_id ? (
          <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              UPI details
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="font-mono text-sm break-all">{settings.upi_id}</div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(settings.upi_id ?? "");
                  toast.success("Copied UPI ID");
                }}
              >
                <Copy className="size-3.5 mr-1" /> Copy
              </Button>
            </div>
            {upiLink && (
              <a
                href={upiLink}
                className="inline-flex items-center justify-center w-full px-3 py-2 rounded-md bg-spice text-spice-foreground text-sm font-medium"
              >
                Open in UPI app
              </a>
            )}
            {settings.upi_qr_url && (
              <img
                src={settings.upi_qr_url}
                alt="UPI QR"
                className="mx-auto max-h-56 rounded-lg border bg-white p-2"
              />
            )}
          </div>
        ) : (
          <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
            Payment details not yet configured. Please contact the admin.
          </div>
        )}

        {settings?.payment_instructions && (
          <p className="text-xs text-muted-foreground whitespace-pre-line">
            {settings.payment_instructions}
          </p>
        )}

        <div className="space-y-3 pt-2">
          <div>
            <Label>Payment method used</Label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="GPay">Google Pay (UPI)</option>
              <option value="Paytm">Paytm (UPI)</option>
              <option value="PhonePe">PhonePe (UPI)</option>
              <option value="BHIM">BHIM UPI</option>
              <option value="Other UPI">Other UPI app</option>
              <option value="Card">Credit / Debit card</option>
              <option value="Bank">Bank transfer</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <Label>Transaction reference / UTR</Label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. 4123456789 or UPI txn ID"
              className="mt-1.5"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Copy this from your UPI app after payment succeeds.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => submit.mutate()}
            disabled={submit.isPending}
            className="bg-spice text-spice-foreground hover:bg-spice/90"
          >
            {submit.isPending ? "Submitting…" : "I've paid — submit for approval"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

