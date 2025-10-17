import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, FileText, Award } from "lucide-react";
import CourseDialog from "@/components/teacher/CourseDialog";
import AssignmentDialog from "@/components/teacher/AssignmentDialog";
import GradeDialog from "@/components/teacher/GradeDialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch teacher's courses
      const { data: coursesData } = await supabase
        .from("courses")
        .select("*")
        .eq("teacher_id", user!.id)
        .order("created_at", { ascending: false });

      const courseIds = coursesData?.map((c) => c.id) || [];

      // Fetch enrollments for teacher's courses
      const { data: enrollmentsData } = await supabase
        .from("enrollments")
        .select(`
          *,
          courses:course_id (title),
          profiles:student_id (name)
        `)
        .in("course_id", courseIds)
        .order("enrolled_at", { ascending: false });

      // Fetch assignments for teacher's courses
      const { data: assignmentsData } = await supabase
        .from("assignments")
        .select(`
          *,
          courses:course_id (title)
        `)
        .in("course_id", courseIds)
        .order("due_date", { ascending: true });

      // Fetch submissions for assignments
      const assignmentIds = assignmentsData?.map((a) => a.id) || [];
      const { data: submissionsData } = await supabase
        .from("submissions")
        .select(`
          *,
          assignments:assignment_id (
            title,
            courses:course_id (title)
          ),
          profiles:student_id (name),
          grades (score, feedback)
        `)
        .in("assignment_id", assignmentIds)
        .order("submitted_at", { ascending: false });

      setCourses(coursesData || []);
      setEnrollments(enrollmentsData || []);
      setAssignments(assignmentsData || []);
      setSubmissions(submissionsData || []);
    } catch (error: any) {
      toast.error("Error loading dashboard data");
    } finally {
      setLoading(false);
    }
  };

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
        {/* Courses */}
        <Card className="shadow-card hover:shadow-card-hover transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                COURSES
              </CardTitle>
              <CourseDialog onSuccess={fetchData} />
            </div>
            <CardDescription>Manage your courses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {courses.map((course) => (
                <div key={course.id} className="p-3 rounded-lg bg-gradient-card border">
                  <h4 className="font-semibold text-sm mb-1">{course.title}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {course.description || "No description"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Created: {new Date(course.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
              {courses.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No courses yet. Click "New" to create one.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Enrollments */}
        <Card className="shadow-card hover:shadow-card-hover transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-secondary" />
              ENROLLS
            </CardTitle>
            <CardDescription>Students in your courses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {enrollments.map((enrollment) => (
                <div key={enrollment.id} className="p-3 rounded-lg bg-gradient-card border">
                  <h4 className="font-semibold text-sm mb-1">{enrollment.profiles?.name}</h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    {enrollment.courses?.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Enrolled: {new Date(enrollment.enrolled_at).toLocaleDateString()}
                  </p>
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
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-accent" />
                ASSIGNMENTS
              </CardTitle>
              {courses.length > 0 && (
                <AssignmentDialog courses={courses} onSuccess={fetchData} />
              )}
            </div>
            <CardDescription>Course assignments</CardDescription>
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
                    <p className="text-xs text-muted-foreground">
                      Due: {new Date(assignment.due_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
              {assignments.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {courses.length === 0 
                    ? "Create a course first"
                    : "No assignments yet. Click 'New' to create one."}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Grades */}
        <Card className="shadow-card hover:shadow-card-hover transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-success" />
                GRADE
              </CardTitle>
            </div>
            <CardDescription>Grade student submissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {submissions.map((submission) => (
                <div key={submission.id} className="p-3 rounded-lg bg-gradient-card border">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm mb-1">
                        {submission.profiles?.name}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {submission.assignments?.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {submission.assignments?.courses?.title}
                      </p>
                    </div>
                    {submission.grades && submission.grades.length > 0 ? (
                      <Badge className="bg-success text-success-foreground">
                        {submission.grades[0].score}/100
                      </Badge>
                    ) : (
                      <GradeDialog submission={submission} onSuccess={fetchData} />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Submitted: {new Date(submission.submitted_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
              {submissions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No submissions yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
