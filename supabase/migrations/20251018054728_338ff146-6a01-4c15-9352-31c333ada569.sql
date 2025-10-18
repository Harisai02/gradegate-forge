-- Fix Critical Security Issues: Roles Architecture and Public Data Exposure

-- 1. Create user_roles table for secure role management
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 3. Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, role FROM public.profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- 4. Fix handle_new_user function to always default to student role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile without role (role will be in user_roles table)
  INSERT INTO public.profiles (id, name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', 'User')
  );
  
  -- Always assign 'student' role by default for security
  -- Teachers must be upgraded by admin later
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'student');
  
  RETURN new;
END;
$$;

-- 5. Drop old profiles RLS policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- 6. Create new secure profiles RLS policies
CREATE POLICY "Authenticated users can view profiles in shared context"
ON public.profiles FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM enrollments e1
      JOIN enrollments e2 ON e1.course_id = e2.course_id
      WHERE e1.student_id = auth.uid() AND e2.student_id = profiles.id
    ) OR
    EXISTS (
      SELECT 1 FROM courses
      WHERE teacher_id = auth.uid() OR teacher_id = profiles.id
    )
  )
);

CREATE POLICY "Users can update own profile name only"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 7. Update courses RLS policies to use has_role function
DROP POLICY IF EXISTS "Teachers can create courses" ON public.courses;
CREATE POLICY "Teachers can create courses"
ON public.courses FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'teacher'));

-- 8. Update enrollments RLS policies to use has_role function
DROP POLICY IF EXISTS "Students can enroll in courses" ON public.enrollments;
CREATE POLICY "Students can enroll in courses"
ON public.enrollments FOR INSERT
WITH CHECK (
  student_id = auth.uid() AND 
  public.has_role(auth.uid(), 'student')
);

-- 9. Update grades RLS policies to use has_role function
DROP POLICY IF EXISTS "Teachers can create grades" ON public.grades;
CREATE POLICY "Teachers can create grades"
ON public.grades FOR INSERT
WITH CHECK (
  grader_id = auth.uid() AND
  public.has_role(auth.uid(), 'teacher') AND
  EXISTS (
    SELECT 1
    FROM submissions s
    JOIN assignments a ON s.assignment_id = a.id
    JOIN courses c ON a.course_id = c.id
    WHERE s.id = grades.submission_id AND c.teacher_id = auth.uid()
  )
);

-- 10. Update submissions RLS policies to use has_role function
DROP POLICY IF EXISTS "Students can submit assignments" ON public.submissions;
CREATE POLICY "Students can submit assignments"
ON public.submissions FOR INSERT
WITH CHECK (
  student_id = auth.uid() AND
  public.has_role(auth.uid(), 'student')
);

-- 11. RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (user_id = auth.uid());

-- Only allow role viewing, not modification by regular users
-- Admins would need separate policies or direct database access to modify roles

-- 12. Remove role column from profiles (keep for now for backward compatibility, but it won't be used)
-- We'll keep the column to avoid breaking existing queries, but it won't be authoritative
-- Future migration can remove it after code is updated