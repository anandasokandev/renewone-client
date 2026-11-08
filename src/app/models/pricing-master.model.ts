export interface PricingMasterItem {
  id: string;
  insuranceCompanyId: string;
  agentClassId: string;
  vehicleTypeId: string;
  insuranceCompanyName: string;
  agentClassName: string;
  vehicleTypeName: string;
  fuelType: string | null;
  minCC: number | null;
  maxCC: number | null;
  totalPremium: number;
  companyPayable: number;
  agentPoints: number;
  adminProfit: number;
  isActive: boolean;
}

export interface PricingMasterRequest {
  insuranceCompanyId: string;
  agentClassId: string;
  vehicleTypeId: string;
  fuelType: string | null;
  minCC: number;
  maxCC: number;
  totalPremium: number;
  companyPayable: number;
  adminProfit: number;
  agentPoints: number;
}

export interface PricingMasterFilters {
  pageNumber: number;
  pageSize: number;
  search?: string;
  insuranceCompanyId?: string;
  agentClassId?: string;
  vehicleTypeId?: string;
  fuelType?: string;
  isActive?: boolean;
}

export interface PricingMasterPage {
  items: PricingMasterItem[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface PricingCompanyOption { id: string; companyName: string; }
export interface PricingAgentClassOption { id: string; className: string; commSharePercentage: number; isActive: boolean; }
export interface PricingVehicleTypeOption { id: string; typeName: string; isActive: boolean; }
