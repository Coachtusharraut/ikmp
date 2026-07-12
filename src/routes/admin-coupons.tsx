import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2, Ticket, CheckCircle2, Clock, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin-coupons")({
  component: AdminCouponsPage,
});

type Coupon = {
  id: string;
  code: string;
  course_id: string | null;
  discount_type: "percent" | "fixed";
  discount_value: number;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  active: boolean;
  notes: string | null;
  created_at: string;
};

type CourseLite = { id: string; title: string; price: number; is_free: boolean };

type PendingEnrollment = {
  id: string;
  user_id: string;
  course_id: string;
  payment_status: string;
  amount_paid: number | null;
  coupon_code: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  created_at: string;
};

function AdminCouponsPage() {
  const { user, isAdmin, loading } = useAuth();
  const [tab, setTab] = useState<"coupons" | "pending">("coupons");

  if (loading) return <div className="container mx-auto px-4 py-16">Loading…</div>;
  if (!user || !isAdmin) {
    return (
      <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">
        Admin access required.
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <Link
        to="/admin"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="size-4" /> Back to admin
      </Link>
      <h1 className="font-display text-3xl font-semibold flex items-center gap-2">
        <Ticket className="size-7 text-spice" /> Coupons & payments
      </h1>
      <p className="text-sm text-muted-foreground mt-1">
        Create discount codes and approve users who have paid directly.
      </p>

      <div className="flex gap-2 mt-6 border-b">
        <button
          onClick={() => setTab("coupons")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === "coupons" ? "border-spice text-spice" : "border-transparent text-muted-foreground"
          }`}
        >
          Coupons
        </button>
        <button
          onClick={() => setTab("pending")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === "pending" ? "border-spice text-spice" : "border-transparent text-muted-foreground"
          }`}
        >
          Pending payments
        </button>
      </div>

      <div className="mt-6">{tab === "coupons" ? <CouponManager /> : <PendingManager />}</div>
    </div>
  );
}

function CouponManager() {
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [courseId, setCourseId] = useState<string>("");
  const [type, setType] = useState<"percent" | "fixed">("percent");
  const [value, setValue] = useState<string>("10");
  const [maxUses, setMaxUses] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [notes, setNotes] = useState("");

  const { data: courses = [] } = useQuery({
    queryKey: ["admin_courses_lite"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id,title,price,is_free")
        .order("title");
      if (error) throw error;
      return data as CourseLite[];
    },
  });

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["admin_coupons"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Coupon[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const c = code.trim().toUpperCase();
      const v = parseFloat(value);
      if (!c) throw new Error("Code required");
      if (isNaN(v) || v < 0) throw new Error("Discount value invalid");
      if (type === "percent" && v > 100) throw new Error("Percent must be 0–100");
      const payload: any = {
        code: c,
        course_id: courseId || null,
        discount_type: type,
        discount_value: v,
        max_uses: maxUses ? parseInt(maxUses, 10) : null,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        notes: notes || null,
      };
      const { error } = await (supabase as any).from("coupons").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Coupon created");
      setCode("");
      setValue("10");
      setMaxUses("");
      setExpiresAt("");
      setNotes("");
      qc.invalidateQueries({ queryKey: ["admin_coupons"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async (c: Coupon) => {
      const { error } = await (supabase as any)
        .from("coupons")
        .update({ active: !c.active })
        .eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin_coupons"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("coupons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Coupon deleted");
      qc.invalidateQueries({ queryKey: ["admin_coupons"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">New coupon</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Code</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="WELCOME50"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Course (leave blank = works on any course)</Label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="">All courses</option>
              {courses
                .filter((c) => !c.is_free)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} (₹{c.price})
                  </option>
                ))}
            </select>
          </div>
          <div>
            <Label>Discount type</Label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="percent">Percent (%)</option>
              <option value="fixed">Fixed amount (₹)</option>
            </select>
          </div>
          <div>
            <Label>
              Discount value {type === "percent" ? "(0–100, use 100 for free)" : "(₹)"}
            </Label>
            <Input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Max uses (optional)</Label>
            <Input
              type="number"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              placeholder="unlimited"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Expires at (optional)</Label>
            <Input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div className="md:col-span-2">
            <Label>Notes (internal)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1.5"
            />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button
              onClick={() => create.mutate()}
              disabled={create.isPending}
              className="bg-spice text-spice-foreground hover:bg-spice/90"
            >
              <Plus className="size-4 mr-1" />
              {create.isPending ? "Creating…" : "Create coupon"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="font-display text-xl font-semibold mb-3">Active coupons</h2>
        {isLoading ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : coupons.length === 0 ? (
          <div className="text-sm text-muted-foreground">No coupons yet.</div>
        ) : (
          <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2">Code</th>
                    <th className="text-left px-4 py-2">Discount</th>
                    <th className="text-left px-4 py-2">Course</th>
                    <th className="text-left px-4 py-2">Uses</th>
                    <th className="text-left px-4 py-2">Expires</th>
                    <th className="text-left px-4 py-2">Status</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((c) => {
                    const course = courses.find((x) => x.id === c.course_id);
                    return (
                      <tr key={c.id} className="border-t">
                        <td className="px-4 py-2 font-mono font-semibold">{c.code}</td>
                        <td className="px-4 py-2">
                          {c.discount_type === "percent"
                            ? `${c.discount_value}% off`
                            : `₹${c.discount_value} off`}
                        </td>
                        <td className="px-4 py-2">{course?.title ?? "All courses"}</td>
                        <td className="px-4 py-2">
                          {c.uses_count}
                          {c.max_uses ? ` / ${c.max_uses}` : ""}
                        </td>
                        <td className="px-4 py-2 text-xs">
                          {c.expires_at ? new Date(c.expires_at).toLocaleString() : "—"}
                        </td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() => toggleActive.mutate(c)}
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              c.active
                                ? "bg-green-100 text-green-800"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {c.active ? "active" : "inactive"}
                          </button>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              if (confirm(`Delete coupon ${c.code}?`)) del.mutate(c.id);
                            }}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PendingManager() {
  const qc = useQueryClient();
  const { data: pending = [], isLoading } = useQuery({
    queryKey: ["admin_pending_enrollments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_enrollments")
        .select("*")
        .eq("payment_status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as PendingEnrollment[];
    },
  });

  const { data: courseMap = {} } = useQuery({
    queryKey: ["admin_courses_map"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("id,title,price");
      if (error) throw error;
      const m: Record<string, { title: string; price: number }> = {};
      (data ?? []).forEach((c: any) => {
        m[c.id] = { title: c.title, price: c.price };
      });
      return m;
    },
  });

  const approve = useMutation({
    mutationFn: async (e: PendingEnrollment) => {
      const { error } = await supabase
        .from("course_enrollments")
        .update({
          payment_status: "paid",
          approved_at: new Date().toISOString(),
        } as any)
        .eq("id", e.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Enrolment approved");
      qc.invalidateQueries({ queryKey: ["admin_pending_enrollments"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const reject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("course_enrollments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Enrolment rejected");
      qc.invalidateQueries({ queryKey: ["admin_pending_enrollments"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <div className="text-muted-foreground">Loading…</div>;
  if (pending.length === 0)
    return <div className="text-sm text-muted-foreground">No pending payments.</div>;

  return (
    <div className="space-y-3">
      {pending.map((p) => {
        const course = courseMap[p.course_id];
        return (
          <Card key={p.id}>
            <CardContent className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="size-3" />
                  {new Date(p.created_at).toLocaleString()}
                </div>
                <div className="font-medium">{course?.title ?? p.course_id}</div>
                <div className="text-xs text-muted-foreground">User: {p.user_id}</div>
                <div className="text-sm">
                  Amount:{" "}
                  <span className="font-semibold">₹{p.amount_paid ?? course?.price ?? 0}</span>
                  {p.coupon_code && (
                    <span className="ml-2 text-xs bg-accent px-2 py-0.5 rounded">
                      Coupon: {p.coupon_code}
                    </span>
                  )}
                </div>
                <div className="text-xs">
                  Method: <span className="font-medium">{p.payment_method ?? "—"}</span>
                  {p.payment_reference && (
                    <span className="ml-2">
                      Ref: <span className="font-mono">{p.payment_reference}</span>
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  onClick={() => approve.mutate(p)}
                  className="bg-spice text-spice-foreground hover:bg-spice/90"
                >
                  <CheckCircle2 className="size-4 mr-1" /> Approve
                </Button>
                <Button variant="outline" onClick={() => reject.mutate(p.id)}>
                  <X className="size-4 mr-1" /> Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
