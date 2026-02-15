import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertAlarm, type Alarm } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/lib/config";

export function useAlarms() {
  return useQuery({
    queryKey: [api.alarms.list.path],
    queryFn: async () => {
      const res = await fetch(getApiUrl(api.alarms.list.path), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch alarms");
      return api.alarms.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateAlarm() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertAlarm) => {
      const validated = api.alarms.create.input.parse(data);
      const res = await fetch(getApiUrl(api.alarms.create.path), {
        method: api.alarms.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = api.alarms.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to create alarm");
      }
      return api.alarms.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.alarms.list.path] });
      toast({ title: "Success", description: "Alarm created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateAlarm() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<InsertAlarm>) => {
      const validated = api.alarms.update.input.parse(updates);
      const url = getApiUrl(buildUrl(api.alarms.update.path, { id }));

      const res = await fetch(url, {
        method: api.alarms.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to update alarm");
      return api.alarms.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.alarms.list.path] });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteAlarm() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = getApiUrl(buildUrl(api.alarms.delete.path, { id }));
      const res = await fetch(url, { method: api.alarms.delete.method, credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete alarm");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.alarms.list.path] });
      toast({ title: "Deleted", description: "Alarm removed" });
    },
  });
}
