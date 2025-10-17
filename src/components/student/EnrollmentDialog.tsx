import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus } from "lucide-react";

interface EnrollmentDialogProps {
  courseId: string;
  onEnrollSuccess: () => void;
}

export default function EnrollmentDialog({ courseId, onEnrollSuccess }: EnrollmentDialogProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleEnroll = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("enrollments")
        .insert({
          course_id: courseId,
          student_id: user.id,
        });

      if (error) {
        if (error.code === "23505") {
          toast.error("Already enrolled in this course");
        } else {
          toast.error("Failed to enroll");
        }
      } else {
        toast.success("Enrolled successfully!");
        onEnrollSuccess();
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      size="sm"
      onClick={handleEnroll}
      disabled={isLoading}
      className="text-xs"
    >
      <Plus className="w-3 h-3 mr-1" />
      Enroll
    </Button>
  );
}
