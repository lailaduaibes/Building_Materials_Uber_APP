export enum VehicleType {
  SMALL_TRUCK = 'small_truck',
  MEDIUM_TRUCK = 'medium_truck',
  LARGE_TRUCK = 'large_truck',
  FLATBED = 'flatbed',
  CRANE_TRUCK = 'crane_truck',
  MIXER_TRUCK = 'mixer_truck',
  VAN = 'van'
}

export enum VehicleStatus {
  AVAILABLE = 'available',
  IN_USE = 'in_use',
  MAINTENANCE = 'maintenance',
  INACTIVE = 'inactive'
}

export interface VehicleEquipment {
  hasCrane: boolean;
  hasForklift: boolean;
  hasTailgate: boolean;
  hasGPS: boolean;
  otherEquipment?: string[];
}

export interface Vehicle {
  id: string;
  licensePlate: string;
  type: VehicleType;
  brand: string;
  model: string;
  year: number;
  maxWeight: number; // in kg
  maxVolume: number; // in m³
  status: VehicleStatus;
  equipment: VehicleEquipment;
  currentDriverId?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
    lastUpdated: Date;
  };
  fuelType: string;
  insuranceExpiry: Date;
  registrationExpiry: Date;
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateVehicleRequest {
  licensePlate: string;
  type: VehicleType;
  brand: string;
  model: string;
  year: number;
  maxWeight: number;
  maxVolume: number;
  equipment: VehicleEquipment;
  fuelType: string;
  insuranceExpiry: Date;
  registrationExpiry: Date;
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
}

export interface UpdateVehicleRequest {
  status?: VehicleStatus;
  currentDriverId?: string;
  equipment?: Partial<VehicleEquipment>;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
}
