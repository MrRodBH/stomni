import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Navigate, useNavigate } from "@tanstack/react-router";
import { ReactNode } from "react";
import { authApi, type AuthUser, type UserRole } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export const ADMIN_ROLES: UserRole[] = ["admin", "super_admin", "tenant_admin"];

export function isAdminRole(role?: string) {
  return !!role && ADMIN_ROLES.includes(role);
}

export function useAuth() {
  return useQuery<AuthUser | null>({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      try {
        return await authApi.me();
      } catch (err: any) {
        if (err?.response?.status === 401) return null;
        throw err;
      }
    },
    staleTime: 60_000,
    retry: false,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.login(email, password),
    onSuccess: (user) => {
      qc.setQueryData(["auth", "me"], user);
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      qc.setQueryData(["auth", "me"], null);
      qc.clear();
      navigate({ to: "/login" });
      toast.success("Sessão encerrada");
    },
  });
}

interface RequireAuthProps {
  children: ReactNode;
  /** if provided, only these roles are allowed; otherwise redirect to "/" */
  roles?: UserRole[];
}

export function RequireAuth({ children, roles }: RequireAuthProps) {
  const { data: user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}