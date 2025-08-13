export enum DriverStatus {
  AVAILABLE = 'available',
  ON_DUTY = 'on_duty',
  OFF_DUTY = 'off_duty',
  ON_BREAK = 'on_break',
  INACTIVE = 'inactive'
}

export interface DriverLicense {
  number: string;
  type: string; // CDL, Regular, etc.
  expiryDate: Date;
  state: string;
}

export interface Driver {
  id: string;
  userId: string; // Reference to users table
  driverLicense: DriverLicense;
  status: DriverStatus;
  currentVehicleId?: string;
  currentOrderId?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
    lastUpdated: Date;
  };
  workingHoursStart?: string; // Format: "08:00"
  workingHoursEnd?: string; // Format: "18:00"
  rating: number; // Average rating from 1-5
  totalDeliveries: number;
  isAvailableForAssignment: boolean;
  specialSkills?: string[]; // crane_operation, hazmat, etc.
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  hireDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDriverRequest {
  userId: string;
  driverLicense: DriverLicense;
  workingHoursStart?: string;
  workingHoursEnd?: string;
  specialSkills?: string[];
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  hireDate: Date;
}

export interface UpdateDriverRequest {
  status?: DriverStatus;
  currentVehicleId?: string;
  currentOrderId?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  workingHoursStart?: string;
  workingHoursEnd?: string;
  isAvailableForAssignment?: boolean;
  specialSkills?: string[];
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
}
