import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/models/auth";
import { getApiUrl } from "@/lib/config";
import { getToken, removeToken } from "@/lib/tokenStorage";

async function fetchUser(): Promise<User | null> {
  // Get token from localStorage
  const token = getToken();

  // Prepare headers
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(getApiUrl("/api/auth/user"), {
    headers,
    credentials: "include", // Keep for session fallback
  });

  if (response.status === 401) {
    // Token invalid or expired - clear it
    if (token) {
      removeToken();
      console.log('[Auth] Token invalid, cleared from storage');
    }
    return null;
  }

  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  return response.json();
}

async function logout(): Promise<void> {
  // Clear token from localStorage
  removeToken();
  console.log('[Auth] Logged out, token cleared');

  // Redirect to login (or reload page)
  window.location.href = "/";
}

export function useAuth() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
