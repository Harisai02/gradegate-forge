import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { BookOpen, CheckCircle, FileText, Award, Plus } from "lucide-react";
import EnrollmentDialog from "@/components/student/EnrollmentDialog";
import SubmissionDialog from "@/components/student/SubmissionDialog";
import { toast } from "sonner";

export default function StudentDashboard() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch all courses
      const { data: coursesData } = await supabase
        .from("courses")
        .select(`
          *,
          profiles:teacher_id (name)
        `)
        .order("created_at", { ascending: false });

      // Fetch enrollments
      const { data: enrollmentsData } = await supabase
        .from("enrollments")
        .select(`
          *,
          courses:course_id (
            *,
            profiles:teacher_id (name)
          )
        `)
        .eq("student_id", user!.id)
        .order("enrolled_at", { ascending: false });

      // Fetch assignments for enrolled courses
      const enrolledCourseIds = enrollmentsData?.map((e) => e.course_id) || [];
      const { data: assignmentsData } = await supabase
        .from("assignments")
        .select(`
          *,
          courses:course_id (title),
          submissions:submissions(id, submitted_at)
        `)
        .in("course_id", enrolledCourseIds)
        .order("due_date", { ascending: true });

      // Fetch grades
      const { data: gradesData } = await supabase
        .from("grades")
        .select(`
          *,
          submissions:submission_id (
            assignments:assignment_id (
              title,
              courses:course_id (title)
            )
          )
        `)
        .eq("submissions.student_id", user!.id)
        .order("graded_at", { ascending: false });

      setCourses(coursesData || []);
      setEnrollments(enrollmentsData || []);
      setAssignments(assignmentsData || []);
      setGrades(gradesData || []);
    } catch (error: any) {
      toast.error("Error loading dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const enrolledCourseIds = enrollments.map((e) => e.course_id);
  const availableCourses = courses.filter((c) => !enrolledCourseIds.includes(c.id));

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* View All Courses */}
        <Card className="shadow-card hover:shadow-card-hover transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                VIEW ALL COURSES
              </CardTitle>
            </div>
            <CardDescription>Browse available courses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {availableCourses.map((course) => (
                <div key={course.id} className="p-3 rounded-lg bg-gradient-card border">
                  <h4 className="font-semibold text-sm mb-1">{course.title}</h4>
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                    {course.description || "No description"}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      by {course.profiles?.name}
                    </span>
                    <EnrollmentDialog courseId={course.id} onEnrollSuccess={fetchData} />
                  </div>
                </div>
              ))}
              {availableCourses.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No available courses
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* My Enrollments */}
        <Card className="shadow-card hover:shadow-card-hover transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-secondary" />
              MY ENROLLMENTS
            </CardTitle>
            <CardDescription>Courses you're enrolled in</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {enrollments.map((enrollment) => (
                <div key={enrollment.id} className="p-3 rounded-lg bg-gradient-card border">
                  <h4 className="font-semibold text-sm mb-1">{enrollment.courses.title}</h4>
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                    {enrollment.courses.description || "No description"}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      by {enrollment.courses.profiles?.name}
                    </span>
                    <Badge variant="secondary" className="text-xs">Enrolled</Badge>
                  </div>
                </div>
              ))}
              {enrollments.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No enrollments yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Assignments */}
        <Card className="shadow-card hover:shadow-card-hover transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-accent" />
              ASSIGNMENTS
            </CardTitle>
            <CardDescription>Submit your work</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {assignments.map((assignment) => (
                <div key={assignment.id} className="p-3 rounded-lg bg-gradient-card border">
                  <h4 className="font-semibold text-sm mb-1">{assignment.title}</h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    {assignment.courses?.title}
                  </p>
                  {assignment.due_date && (
                    <p className="text-xs text-muted-foreground mb-2">
                      Due: {new Date(assignment.due_date).toLocaleDateString()}
                    </p>
                  )}
                  {assignment.submissions && assignment.submissions.length > 0 ? (
                    <Badge variant="secondary" className="text-xs">Submitted</Badge>
                  ) : (
                    <SubmissionDialog assignmentId={assignment.id} onSubmitSuccess={fetchData} />
                  )}
                </div>
              ))}
              {assignments.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No assignments yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Grades */}
        <Card className="shadow-card hover:shadow-card-hover transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-success" />
              GRADES
            </CardTitle>
            <CardDescription>Your performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {grades.map((grade) => (
                <div key={grade.id} className="p-3 rounded-lg bg-gradient-card border">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm mb-1">
                        {grade.submissions?.assignments?.title}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {grade.submissions?.assignments?.courses?.title}
                      </p>
                    </div>
                    <Badge className="bg-success text-success-foreground">
                      {grade.score}/100
                    </Badge>
                  </div>
                  {grade.feedback && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {grade.feedback}
                    </p>
                  )}
                </div>
              ))}
              {grades.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No grades yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
