import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Upload } from "lucide-react";

interface SubmissionDialogProps {
  assignmentId: string;
  onSubmitSuccess: () => void;
}

export default function SubmissionDialog({ assignmentId, onSubmitSuccess }: SubmissionDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !file) return;

    setIsLoading(true);
    try {
      // Upload file to storage
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${assignmentId}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("assignment-submissions")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create submission record
      const { error: submitError } = await supabase
        .from("submissions")
        .insert({
          assignment_id: assignmentId,
          student_id: user.id,
          file_path: filePath,
          file_name: file.name,
        });

      if (submitError) {
        if (submitError.code === "23505") {
          toast.error("You have already submitted this assignment");
        } else {
          throw submitError;
        }
      } else {
        toast.success("Assignment submitted successfully!");
        setOpen(false);
        setFile(null);
        onSubmitSuccess();
      }
    } catch (error: any) {
      toast.error("Failed to submit assignment");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="text-xs">
          <Upload className="w-3 h-3 mr-1" />
          Submit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit Assignment</DialogTitle>
          <DialogDescription>Upload your assignment file</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">Assignment File</Label>
            <Input
              id="file"
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
            />
          </div>
          <div className="flex gap-3">
            <Button type="submit" disabled={isLoading || !file}>
              {isLoading ? "Submitting..." : "Submit"}
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
