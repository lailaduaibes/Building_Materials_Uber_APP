export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  role: 'CUSTOMER' | 'DRIVER' | 'DISPATCHER' | 'ADMIN';
  avatar?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered';
  customerName: string;
  items: OrderItem[];
  pickupAddress: Address;
  deliveryAddress: Address;
  specialRequirements?: string;
  totalWeight: number;
  estimatedDeliveryTime?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  materialType: string;
  description: string;
  quantity: number;
  unit: string;
  weight: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface Vehicle {
  id: string;
  licensePlate: string;
  type: string;
  maxWeight: number;
  maxVolume: number;
  equipment: string[];
  status: 'available' | 'in_use' | 'maintenance';
}

export interface Driver {
  id: string;
  user: User;
  licenseNumber: string;
  licenseExpiry: string;
  specialSkills: string[];
  currentVehicle?: string;
  status: 'available' | 'busy' | 'offline';
  rating: number;
}
