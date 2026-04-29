import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ProtectedVideo } from "@/components/ProtectedVideo";
import { ArrowLeft, CheckCircle2, Lock } from "lucide-react";
import { toast } from "sonner";

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
};

function CourseDetail() {
  const { id } = useParams({ from: "/courses/$id" });
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: course, isLoading } = useQuery({
    queryKey: ["course", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
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
        .select("id,payment_status")
        .eq("course_id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
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
  if (isLoading || !course) {
    return <div className="container mx-auto px-4 py-16 text-muted-foreground">Loading…</div>;
  }

  const enrolled = !!enrollment;
  const canWatch = course.is_free || enrolled;

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
        <p className="mt-3 text-muted-foreground">{course.description}</p>
      )}

      <div className="mt-6">
        {canWatch && course.video_url ? (
          <ProtectedVideo
            url={course.video_url}
            type={course.video_type}
            title={course.title}
          />
        ) : (
          <div className="aspect-video rounded-2xl border bg-card grid place-items-center text-center p-8">
            <div>
              <Lock className="size-10 mx-auto text-muted-foreground mb-3" />
              <h2 className="font-display text-xl font-semibold">
                Enroll to watch this course
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                ₹{course.price} — payment setup coming soon
              </p>
              <Button disabled className="mt-4">
                Enroll for ₹{course.price}
              </Button>
              <p className="mt-3 text-xs text-muted-foreground">
                Admin can connect a payment gateway from the admin panel.
              </p>
            </div>
          </div>
        )}
      </div>

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

      <div className="mt-8 rounded-xl border bg-muted/30 p-4 text-xs text-muted-foreground">
        🔒 Videos are protected against casual download and right-click. Note:
        no web protection can fully prevent screen recording.
      </div>
    </div>
  );
}
