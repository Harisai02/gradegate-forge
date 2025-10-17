import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus } from "lucide-react";

interface GradeDialogProps {
  submission: any;
  onSuccess: () => void;
}

export default function GradeDialog({ submission, onSuccess }: GradeDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const scoreNum = parseFloat(score);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      toast.error("Score must be between 0 and 100");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("grades")
        .insert({
          submission_id: submission.id,
          grader_id: user.id,
          score: scoreNum,
          feedback: feedback || null,
        });

      if (error) {
        if (error.code === "23505") {
          toast.error("This submission has already been graded");
        } else {
          throw error;
        }
      } else {
        toast.success("Grade submitted successfully!");
        setOpen(false);
        setScore("");
        setFeedback("");
        onSuccess();
      }
    } catch (error: any) {
      toast.error("Failed to submit grade");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="text-xs">
          <Plus className="w-3 h-3 mr-1" />
          Grade
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Grade Submission</DialogTitle>
          <DialogDescription>
            Grading {submission.profiles?.name}'s submission for {submission.assignments?.title}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="score">Score (0-100)</Label>
            <Input
              id="score"
              type="number"
              min="0"
              max="100"
              step="0.01"
              placeholder="85"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="feedback">Feedback (optional)</Label>
            <Textarea
              id="feedback"
              placeholder="Great work! Consider..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
            />
          </div>
          <div className="flex gap-3">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Submitting..." : "Submit Grade"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
