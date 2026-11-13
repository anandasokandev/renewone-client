export interface InsuranceTypeItem {
  id: string;
  name: string;
  displayOrder?: number;
  isActive: boolean;
}

export interface CreateInsuranceTypeRequest {
  name: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface UpdateInsuranceTypeRequest {
  name: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface VehicleTypeItem {
  id: string;
  typeName: string;
  description?: string;
  isActive: boolean;
}

export interface CreateVehicleTypeRequest {
  typeName: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateVehicleTypeRequest {
  typeName: string;
  description?: string;
  isActive?: boolean;
}

