export interface DashboardProduct {
  id: string;
  insuranceTypeId: string;
  insuranceTypeName?: string;
  vehicleTypeId?: string;
  name: string;
  subtitle?: string;
  code: string;
  routePath: string;
  badgeText?: string;
  badgeColor?: string;
  iconKey?: string;
  displayOrder: number;
}
