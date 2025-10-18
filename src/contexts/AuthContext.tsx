import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Profile {
  id: string;
  name: string;
  created_at: string;
}

interface UserRole {
  role: "student" | "teacher";
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: (Profile & { role: "student" | "teacher" }) | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, role: "student" | "teacher") => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<(Profile & { role: "student" | "teacher" }) | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer profile fetch to avoid auth state listener deadlock
          setTimeout(async () => {
            const { data: profileData } = await supabase
              .from("profiles")
              .select("id, name, created_at")
              .eq("id", session.user.id)
              .single();
            
            const { data: roleData } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", session.user.id)
              .single();
            
            if (profileData && roleData) {
              setProfile({ ...profileData, role: roleData.role as "student" | "teacher" });
            }
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        Promise.all([
          supabase
            .from("profiles")
            .select("id, name, created_at")
            .eq("id", session.user.id)
            .single(),
          supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", session.user.id)
            .single()
        ]).then(([{ data: profileData }, { data: roleData }]) => {
          if (profileData && roleData) {
            setProfile({ ...profileData, role: roleData.role as "student" | "teacher" });
          }
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name: string, role: "student" | "teacher") => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Account created successfully! All new users start as students.");
      }

      return { error };
    } catch (error: any) {
      toast.error(error.message);
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Logged Successfully.");
      }

      return { error };
    } catch (error: any) {
      toast.error(error.message);
      return { error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    navigate("/login");
    toast.success("Logged out successfully");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
