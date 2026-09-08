import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Department, Location, Priority, TicketCategory, TicketStatus, AssetType, Asset, PaginatedResult } from "@/types";

export function useDepartments() {
  return useQuery({ queryKey: ["departments"], queryFn: () => api.get<Department[]>("/departments") });
}

export function useLocations() {
  return useQuery({ queryKey: ["locations"], queryFn: () => api.get<Location[]>("/locations") });
}

export function useCategories() {
  return useQuery({ queryKey: ["categories"], queryFn: () => api.get<TicketCategory[]>("/categories") });
}

export function usePriorities() {
  return useQuery({ queryKey: ["priorities"], queryFn: () => api.get<Priority[]>("/priorities") });
}

export function useStatuses() {
  return useQuery({ queryKey: ["statuses"], queryFn: () => api.get<TicketStatus[]>("/statuses") });
}

export function useAssetTypes() {
  return useQuery({ queryKey: ["asset-types"], queryFn: () => api.get<AssetType[]>("/assets/types") });
}

export function useTechnicians() {
  return useQuery({
    queryKey: ["technicians"],
    queryFn: () => api.get<Array<{ id: string; firstName: string; lastName: string; email: string; role: { name: string } }>>("/users/technicians"),
  });
}

export function useMyAssets(userId?: string) {
  return useQuery({
    queryKey: ["assets", "mine", userId],
    queryFn: () => api.get<PaginatedResult<Asset>>("/assets", { assignedUserId: userId, pageSize: 50 }),
    enabled: !!userId,
  });
}
