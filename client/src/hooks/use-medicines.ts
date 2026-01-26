import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertMedicine, type Medicine } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useMedicines() {
  return useQuery({
    queryKey: [api.medicines.list.path],
    queryFn: async () => {
      const res = await fetch(api.medicines.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch medicines");
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
      const res = await fetch(api.medicines.create.path, {
        method: api.medicines.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

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
      
      const res = await fetch(url, {
        method: api.medicines.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

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
      const res = await fetch(url, { method: api.medicines.delete.method, credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete medicine");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.medicines.list.path] });
      toast({ title: "Deleted", description: "Medicine removed" });
    },
  });
}
