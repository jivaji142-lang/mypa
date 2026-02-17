import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertMedicine, type Medicine } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export function useMedicines() {
  return useQuery({
    queryKey: [api.medicines.list.path],
    queryFn: async () => {
      const res = await apiRequest("GET", api.medicines.list.path);
      return api.medicines.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateMedicine() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertMedicine) => {
      const validated = api.medicines.create.input.parse(data);
      const res = await apiRequest(api.medicines.create.method, api.medicines.create.path, validated);

      if (!res.ok) {
        if (res.status === 400) {
          const error = api.medicines.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to add medicine");
      }
      return api.medicines.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.medicines.list.path] });
      toast({ title: "Success", description: "Medicine added successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateMedicine() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<InsertMedicine>) => {
      const validated = api.medicines.update.input.parse(updates);
      const url = buildUrl(api.medicines.update.path, { id });

      const res = await apiRequest(api.medicines.update.method, url, validated);

      if (!res.ok) throw new Error("Failed to update medicine");
      return api.medicines.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.medicines.list.path] });
      toast({ title: "Success", description: "Medicine updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteMedicine() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.medicines.delete.path, { id });
      const res = await apiRequest(api.medicines.delete.method, url);
      if (!res.ok) throw new Error("Failed to delete medicine");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.medicines.list.path] });
      toast({ title: "Deleted", description: "Medicine removed" });
    },
  });
}
