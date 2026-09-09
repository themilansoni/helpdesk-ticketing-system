import { useQuery } from "@tanstack/react-query";
import { referenceDb, assetsDb, consumablesDb, accessoriesDb, licensesDb } from "@/lib/db";

export function useDepartments() {
  return useQuery({ queryKey: ["departments"], queryFn: () => referenceDb.listDepartments() });
}

export function useLocations() {
  return useQuery({ queryKey: ["locations"], queryFn: () => referenceDb.listLocations() });
}

export function useCategories() {
  return useQuery({ queryKey: ["categories"], queryFn: () => referenceDb.listCategories() });
}

export function usePriorities() {
  return useQuery({ queryKey: ["priorities"], queryFn: () => referenceDb.listPriorities() });
}

export function useAssetTypes() {
  return useQuery({ queryKey: ["asset-types"], queryFn: () => referenceDb.listAssetTypes() });
}

export function useManufacturers() {
  return useQuery({ queryKey: ["manufacturers"], queryFn: () => referenceDb.listManufacturers() });
}

export function useAssetModels() {
  return useQuery({ queryKey: ["asset-models"], queryFn: () => referenceDb.listAssetModels() });
}

export function useConsumables() {
  return useQuery({ queryKey: ["consumables"], queryFn: () => consumablesDb.listConsumables() });
}

export function useAccessories() {
  return useQuery({ queryKey: ["accessories"], queryFn: () => accessoriesDb.listAccessories() });
}

export function useLicenses() {
  return useQuery({ queryKey: ["licenses"], queryFn: () => licensesDb.listLicenses() });
}

export function useTechnicians() {
  return useQuery({ queryKey: ["technicians"], queryFn: () => referenceDb.listTechnicians() });
}

export function useMyAssets(userId?: string) {
  return useQuery({
    queryKey: ["assets", "mine", userId],
    queryFn: () => assetsDb.listAssets({ assignedUserId: userId, page: 1, pageSize: 50 }),
    enabled: !!userId,
  });
}

const DEFAULT_COMPANY_NAME = "HelpDesk Pro";

export function useCompanyBranding() {
  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: () => referenceDb.getSystemSettings(),
    staleTime: 5 * 60 * 1000,
  });
  const find = (key: string) => data?.find((s) => s.key === key)?.value || "";
  return {
    companyName: find("company_name") || DEFAULT_COMPANY_NAME,
    companyLogo: find("company_logo"),
    isLoading,
  };
}
