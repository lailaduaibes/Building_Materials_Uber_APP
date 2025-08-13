export enum OrderType {
  INTERNAL = 'internal_delivery',
  EXTERNAL = 'external_delivery'
}

export enum OrderStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  FAILED = 'failed'
}

export enum MaterialType {
  CEMENT = 'cement',
  STEEL = 'steel',
  BRICKS = 'bricks',
  SAND = 'sand',
  GRAVEL = 'gravel',
  CONCRETE_BLOCKS = 'concrete_blocks',
  LUMBER = 'lumber',
  PIPES = 'pipes',
  TILES = 'tiles',
  OTHER = 'other'
}

export interface DeliveryAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
  specialInstructions?: string;
}

export interface OrderItem {
  id: string;
  materialType: MaterialType;
  description: string;
  quantity: number;
  unit: string; // kg, tons, pieces, m³, etc.
  weight: number; // in kg
  volume?: number; // in m³
  specialHandling?: string;
}

export interface Order {
  id: string;
  orderType: OrderType;
  customerId: string;
  status: OrderStatus;
  items: OrderItem[];
  totalWeight: number;
  totalVolume: number;
  pickupAddress: DeliveryAddress;
  deliveryAddress: DeliveryAddress;
  scheduledPickupTime?: Date;
  scheduledDeliveryTime?: Date;
  actualPickupTime?: Date;
  actualDeliveryTime?: Date;
  driverId?: string;
  vehicleId?: string;
  specialRequirements?: string[];
  estimatedDistance?: number;
  estimatedDuration?: number; // in minutes
  deliveryFee?: number;
  notes?: string;
  salesOrderId?: string; // For internal orders from sales app
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrderRequest {
  orderType?: OrderType;
  items: Omit<OrderItem, 'id'>[];
  pickupAddress: DeliveryAddress;
  deliveryAddress: DeliveryAddress;
  scheduledPickupTime?: Date;
  scheduledDeliveryTime?: Date;
  specialRequirements?: string[];
  notes?: string;
  salesOrderId?: string;
}

export interface UpdateOrderRequest {
  status?: OrderStatus;
  scheduledPickupTime?: Date;
  scheduledDeliveryTime?: Date;
  driverId?: string;
  vehicleId?: string;
  notes?: string;
}
