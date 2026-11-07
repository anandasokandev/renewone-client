export interface Vendor {
  id: string;
  name: string;
  code: string;
  phone: string;
  email: string;
  isActive: boolean;
}

export interface CreateVendorRequest {
  name: string;
  phone: string;
  email: string;
}

export interface UpdateVendorRequest {
  name: string;
  code: string;
  phone: string;
  email: string;
  isActive: boolean;
}
