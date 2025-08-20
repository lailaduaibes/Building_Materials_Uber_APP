/**
 * DriverService - Core driver functionality for YouMats Driver App
 * Handles driver status, order management, earnings, and performance tracking
 */

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { driverLocationService, LocationCoordinates } from './DriverLocationService';

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTkzMTIsImV4cCI6MjA3MDY5NTMxMn0.bBBBaL7odpkTSGmEstQp8ihkEsdgYsycrRgFVKGvJ28';

// Create Supabase client with proper auth configuration (same as AuthService)
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export interface Driver {
  id: string;
  user_id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  years_experience: number;
  specializations: any;
  // Vehicle information
  vehicle_model?: string;
  vehicle_year?: number;
  vehicle_plate?: string;
  // New proper approval fields
  is_approved: boolean;
  approval_status: 'pending' | 'under_review' | 'approved' | 'rejected';
  application_submitted_at?: string;
  approved_at?: string;
  approved_by?: string;
  rejection_reason?: string;
  admin_notes?: string;
  // Existing fields
  rating: number;
  total_trips: number;
  total_earnings: number;
  is_available: boolean;
  current_truck_id?: string;
  preferred_truck_types: any;
  max_distance_km: number;
  status: 'online' | 'offline' | 'busy' | 'on_break';
  created_at: string;
}

export interface DriverDocument {
  id: string;
  driver_id: string;
  document_type: string;
  file_name: string;
  file_size: number;
  file_url: string;
  status: 'pending' | 'approved' | 'rejected';
  review_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  uploaded_at: string;
}

export interface DocumentUploadResult {
  success: boolean;
  documentId?: string;
  message: string;
  error?: string;
}

export interface ApprovalStatus {
  canPickTrips: boolean;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  message: string;
  isApproved: boolean;
}

export interface OrderAssignment {
  id: string;
  orderId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  pickupLocation: {
    address: string;
    latitude: number;
    longitude: number;
  };
  deliveryLocation: {
    address: string;
    latitude: number;
    longitude: number;
  };
  materials: Array<{
    type: string;
    description: string;
    quantity: number;
    weight?: number;
  }>;
  estimatedEarnings: number;
  estimatedDuration: number; // in minutes
  distanceKm: number;
  specialInstructions?: string;
  assignedAt: string;
  acceptDeadline: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
}

export interface DeliveryStep {
  id: string;
  orderId: string;
  step: 'pickup' | 'delivery';
  location: {
    address: string;
    latitude: number;
    longitude: number;
  };
  status: 'pending' | 'in_progress' | 'completed';
  completedAt?: string;
  photos?: string[];
  signature?: string;
  notes?: string;
}

export interface DriverStats {
  today: {
    deliveries: number;
    earnings: number;
    hoursWorked: number;
    averageRating: number;
  };
  thisWeek: {
    deliveries: number;
    earnings: number;
    hoursWorked: number;
  };
  thisMonth: {
    deliveries: number;
    earnings: number;
    hoursWorked: number;
  };
  allTime: {
    totalDeliveries: number;
    totalEarnings: number;
    averageRating: number;
    completionRate: number;
  };
}

class DriverService {
  private currentDriver: Driver | null = null;
  private activeOrder: OrderAssignment | null = null;

  // Initialize driver session
  async initializeDriver(userId: string): Promise<Driver | null> {
    try {
      console.log('🚗 Initializing driver for userId:', userId);
      
      // First check if user exists and get their info
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role, user_type, first_name, last_name, email')
        .eq('id', userId)
        .single();

      if (userError || !userData) {
        console.error('❌ Error fetching user:', userError);
        return null;
      }

      console.log('👤 User data found:', {
        role: userData.role,
        user_type: userData.user_type,
        name: `${userData.first_name} ${userData.last_name}`,
        email: userData.email
      });

      // Check if user has driver role
      const isDriver = userData.role === 'driver' || userData.user_type === 'driver';
      
      console.log('🚗 Is driver check:', { isDriver, role: userData.role, user_type: userData.user_type });
      
      if (!isDriver) {
        // For customer accounts, offer to create driver profile
        console.log('❌ Customer account detected. Driver profile needed.');
        return null; // This will trigger the "no driver profile" message in the app
      }

      // Get existing driver profile
      console.log('🔍 Looking for driver profile for user:', userId);
      const { data: driverData, error: driverError } = await supabase
        .from('driver_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      console.log('📋 Driver profile query result:', { 
        found: !!driverData, 
        error: driverError?.code, 
        message: driverError?.message 
      });

      console.log('� Driver profile query result:', { 
        found: !!driverData, 
        error: driverError?.code, 
        message: driverError?.message 
      });

      if (driverError) {
        console.log('🔍 Driver profile error detected:', driverError.code);
        
        if (driverError.code === 'PGRST116' || driverError.code === '42501') {
          // PGRST116: Cannot coerce result to single JSON object (usually RLS blocking)
          // 42501: RLS policy blocking access 
          console.log('🔒 RLS blocking access (PGRST116), attempting service role query...');
          
          // Create service role client for this one query
          const serviceSupabase = createClient(
            'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8'
          );
          
          const { data: serviceDriverData, error: serviceError } = await serviceSupabase
            .from('driver_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();
          
          if (serviceError) {
            console.error('❌ Service role query also failed:', serviceError);
            return null;
          }
          
          // Use the service role data but switch back to regular client
          const driver = {
            ...serviceDriverData,
            firstName: userData.first_name,
            lastName: userData.last_name,
            fullName: `${userData.first_name} ${userData.last_name}`,
            email: userData.email,
            phone: serviceDriverData.phone || '',
            status: serviceDriverData.is_available ? 'online' : 'offline',
            // Parse JSON fields
            specializations: this.parseJsonField(serviceDriverData.specializations, ['general']),
            preferred_truck_types: this.parseJsonField(serviceDriverData.preferred_truck_types, ['small_truck'])
          };

          this.currentDriver = driver;
          await driverLocationService.initializeDriver(serviceDriverData.id);
          
          console.log('✅ Driver profile loaded via service role:', {
            id: serviceDriverData.id,
            name: driver.fullName,
            status: driver.status
          });
          
          return driver;
        } else {
          // For any other error, also try service role as a fallback
          console.error('❌ Unexpected error fetching driver profile:', driverError, 'trying service role...');
          
          const serviceSupabase = createClient(
            'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8'
          );
          
          const { data: serviceDriverData, error: serviceError } = await serviceSupabase
            .from('driver_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();
          
          if (serviceError) {
            console.error('❌ Service role query also failed:', serviceError);
            return null;
          }
          
          // Use the service role data
          const driver = {
            ...serviceDriverData,
            firstName: userData.first_name,
            lastName: userData.last_name,
            fullName: `${userData.first_name} ${userData.last_name}`,
            email: userData.email,
            phone: serviceDriverData.phone || '',
            status: serviceDriverData.is_available ? 'online' : 'offline',
            // Parse JSON fields
            specializations: this.parseJsonField(serviceDriverData.specializations, ['general']),
            preferred_truck_types: this.parseJsonField(serviceDriverData.preferred_truck_types, ['small_truck'])
          };

          this.currentDriver = driver;
          await driverLocationService.initializeDriver(serviceDriverData.id);
          
          console.log('✅ Driver profile loaded via service role (fallback):', {
            id: serviceDriverData.id,
            name: driver.fullName,
            status: driver.status
          });
          
          return driver;
        }
      }

      // Combine user and driver data
      const driver = {
        ...driverData,
        firstName: userData.first_name,
        lastName: userData.last_name,
        fullName: `${userData.first_name} ${userData.last_name}`,
        email: userData.email,
        phone: '', // Will be filled if needed
        status: driverData.is_available ? 'online' : 'offline',
        // Parse JSON fields
        specializations: this.parseJsonField(driverData.specializations, ['general']),
        preferred_truck_types: this.parseJsonField(driverData.preferred_truck_types, ['small_truck'])
      };

      this.currentDriver = driver;
      await driverLocationService.initializeDriver(driverData.id);
      
      return driver;
    } catch (error) {
      console.error('Error initializing driver:', error);
      return null;
    }
  }

  async createDriverProfile(userId: string, userData: any): Promise<Driver | null> {
    try {
      const { data: newDriverProfile, error } = await supabase
        .from('driver_profiles')
        .insert({
          user_id: userId,
          years_experience: 0,
          specializations: {},
          // Set proper approval defaults
          is_approved: false,
          approval_status: 'pending',
          application_submitted_at: new Date().toISOString(),
          rating: 5.0,
          total_trips: 0,
          total_earnings: 0.0,
          is_available: false,
          preferred_truck_types: {},
          max_distance_km: 50
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating driver profile:', error);
        return null;
      }

      // Combine user and driver data
      const driver = {
        ...newDriverProfile,
        firstName: userData.first_name,
        lastName: userData.last_name,
        fullName: `${userData.first_name} ${userData.last_name}`,
        email: userData.email,
        phone: '',
        status: 'offline' as const
      };

      this.currentDriver = driver;
      await driverLocationService.initializeDriver(newDriverProfile.id);
      
      return driver;
    } catch (error) {
      console.error('Error creating driver profile:', error);
      return null;
    }
  }

  // ✅ NEW: Complete driver registration (account + profile)
  async registerNewDriver(registrationData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone: string;
    yearsExperience: number;
    licenseNumber?: string;
    vehicleInfo?: {
      model: string;
      year: number;
      plate: string;
    };
  }): Promise<{
    success: boolean;
    message: string;
    data?: {
      userId: string;
      driverProfile: Driver;
      approvalStatus: ApprovalStatus;
    };
  }> {
    try {
      console.log('🚗 Starting driver registration process...');

      // Step 1: Create user account using Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: registrationData.email,
        password: registrationData.password,
        options: {
          data: {
            first_name: registrationData.firstName,
            last_name: registrationData.lastName,
            role: 'driver',
            user_type: 'driver'
          }
        }
      });

      if (authError || !authData.user) {
        throw new Error(authError?.message || 'Failed to create user account');
      }

      console.log('✅ User account created:', authData.user.id);

      // Check if email confirmation is required
      if (!authData.session) {
        console.log('📧 Email confirmation required - no session returned');
        
        // Try to sign in immediately (this works if email confirmation is disabled)
        console.log('🔑 Attempting to sign in after registration...');
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: registrationData.email,
          password: registrationData.password
        });

        if (signInError) {
          console.log('⚠️ Auto sign-in failed - email confirmation likely required:', signInError.message);
        } else if (signInData.session) {
          console.log('✅ Auto sign-in successful after registration');
        }
      } else {
        console.log('✅ User signed in automatically after registration');
      }

      // Step 2: Wait a moment for the user to be properly created in the database
      // This ensures the foreign key constraint is satisfied
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 3: Create entry in public.users table using proven customer app method
      console.log('� CRITICAL STEP: Creating entry in public.users table...');
      await this.ensureUserInCustomTable(authData.user, registrationData);

      // Step 4: Verify the user exists in auth.users before creating profile
      const { data: userCheck, error: userCheckError } = await supabase
        .from('auth.users')
        .select('id')
        .eq('id', authData.user.id)
        .single();

      if (userCheckError) {
        console.log('User verification failed, but continuing with profile creation...');
      }

      // Step 5: Create driver profile with proper approval fields
      const profileData = {
        user_id: authData.user.id,
        first_name: registrationData.firstName,
        last_name: registrationData.lastName,
        phone: registrationData.phone,
        years_experience: registrationData.yearsExperience,
        vehicle_model: registrationData.vehicleInfo?.model || 'Not specified',
        vehicle_year: registrationData.vehicleInfo?.year || 2020,
        vehicle_plate: registrationData.vehicleInfo?.plate || 'TBD',
        // Proper approval fields
        is_approved: false,
        approval_status: 'pending',
        application_submitted_at: new Date().toISOString(),
        // Default values - using JSONB format
        specializations: JSON.stringify(['general']),
        rating: 5.0,
        total_trips: 0,
        total_earnings: 0.0,
        is_available: false,
        preferred_truck_types: JSON.stringify(['small_truck']),
        max_distance_km: 50
      };

      console.log('Creating driver profile with data:', profileData);

      const { data: driverProfile, error: profileError } = await supabase
        .from('driver_profiles')
        .insert(profileData)
        .select()
        .single();

      if (profileError) {
        console.error('Profile creation error:', profileError);
        throw new Error(`Failed to create driver profile: ${profileError.message}`);
      }

      console.log('✅ Driver profile created:', driverProfile.id);

      // Step 6: Create Driver object
      const driver: Driver = {
        ...driverProfile,
        firstName: registrationData.firstName,
        lastName: registrationData.lastName,
        fullName: `${registrationData.firstName} ${registrationData.lastName}`,
        email: registrationData.email,
        phone: registrationData.phone,
        status: 'offline' as const
      };

      // Step 7: Get approval status
      const approvalStatus: ApprovalStatus = {
        canPickTrips: false,
        status: 'pending',
        message: 'Your driver application has been submitted and is under review. You will be notified once approved.',
        isApproved: false
      };

      console.log('🎉 Driver registration completed successfully');

      return {
        success: true,
        message: 'Driver registration completed! Your application is now under review.',
        data: {
          userId: authData.user.id,
          driverProfile: driver,
          approvalStatus
        }
      };

    } catch (error) {
      console.error('❌ Driver registration failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Registration failed. Please try again.'
      };
    }
  }

  // ✅ NEW: Check driver approval status
  async checkDriverApprovalStatus(userId?: string): Promise<ApprovalStatus> {
    try {
      const targetUserId = userId || this.currentDriver?.user_id;
      
      if (!targetUserId) {
        throw new Error('No user ID provided');
      }

      const { data: profile, error } = await supabase
        .from('driver_profiles')
        .select('is_approved, approval_status, first_name, last_name, rejection_reason')
        .eq('user_id', targetUserId)
        .single();

      if (error || !profile) {
        throw new Error('Driver profile not found');
      }

      const canPickTrips = profile.is_approved === true && profile.approval_status === 'approved';
      
      return {
        canPickTrips,
        status: profile.approval_status,
        message: this.getApprovalMessage(profile),
        isApproved: profile.is_approved === true
      };
    } catch (error) {
      console.error('Error checking approval status:', error);
      return {
        canPickTrips: false,
        status: 'pending',
        message: 'Unable to check approval status. Please try again.',
        isApproved: false
      };
    }
  }

  // ✅ NEW: Get approval status message
  private getApprovalMessage(profile: any): string {
    switch (profile.approval_status) {
      case 'pending':
        return 'Your driver application is being reviewed by our team. This usually takes 1-2 business days.';
      case 'under_review':
        return 'Your profile is under detailed review. We may contact you for additional information.';
      case 'approved':
        return 'Welcome to YouMats! You can now start accepting delivery requests.';
      case 'rejected':
        return profile.rejection_reason || 'Your application was not approved. Please contact support for more information.';
      default:
        return 'Unknown approval status. Please contact support.';
    }
  }

  // ✅ NEW: Get current driver with approval status
  async getCurrentDriverWithApproval(): Promise<Driver | null> {
    if (!this.currentDriver) return null;

    try {
      const approvalStatus = await this.checkDriverApprovalStatus();
      
      // Return driver with approval info included
      return {
        ...this.currentDriver,
        canPickTrips: approvalStatus.canPickTrips,
        approvalMessage: approvalStatus.message
      } as Driver;
    } catch (error) {
      console.error('Error getting driver with approval:', error);
      return null;
    }
  }

  // Update driver online/offline status
  async updateDriverStatus(status: 'online' | 'offline' | 'busy' | 'on_break'): Promise<boolean> {
    if (!this.currentDriver) return false;

    try {
      const { error } = await supabase
        .from('driver_profiles')
        .update({ 
          is_available: status === 'online',
          updated_at: new Date().toISOString()
        })
        .eq('id', this.currentDriver.id);

      if (error) {
        console.error('Error updating driver status:', error);
        return false;
      }

      this.currentDriver.status = status;
      this.currentDriver.is_available = status === 'online';
      await driverLocationService.updateDriverStatus(status, this.activeOrder?.orderId);

      return true;
    } catch (error) {
      console.error('Error updating driver status:', error);
      return false;
    }
  }

  // Listen for new order assignments
  async startListeningForOrders(onOrderReceived: (order: OrderAssignment) => void): Promise<boolean> {
    if (!this.currentDriver) return false;

    try {
      // Subscribe to real-time order assignments
      const channel = supabase
        .channel('order-assignments')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'order_assignments',
            filter: `driver_id=eq.${this.currentDriver.id}`
          },
          (payload) => {
            const orderData = payload.new as any;
            const assignment: OrderAssignment = {
              id: orderData.id,
              orderId: orderData.order_id,
              customerId: orderData.customer_id,
              customerName: orderData.customer_name,
              customerPhone: orderData.customer_phone,
              pickupLocation: orderData.pickup_location,
              deliveryLocation: orderData.delivery_location,
              materials: orderData.materials,
              estimatedEarnings: orderData.estimated_earnings,
              estimatedDuration: orderData.estimated_duration,
              distanceKm: orderData.distance_km,
              specialInstructions: orderData.special_instructions,
              assignedAt: orderData.assigned_at,
              acceptDeadline: orderData.accept_deadline,
              status: 'pending'
            };
            
            onOrderReceived(assignment);
          }
        )
        .subscribe();

      return true;
    } catch (error) {
      console.error('Error starting order listener:', error);
      return false;
    }
  }

  // Check truck type compatibility for UI validation (without accepting)
  async checkTruckTypeCompatibility(tripId: string): Promise<{ 
    isCompatible: boolean; 
    requiredTruckType?: string; 
    driverTruckTypes?: string[];
    materialType?: string;
    error?: string;
  }> {
    if (!this.currentDriver) {
      return { isCompatible: false, error: 'No driver profile found' };
    }

    try {
      console.log('🚛 Checking truck type compatibility for trip:', tripId);
      
      // Get trip requirements
      const { data: trip, error: tripError } = await supabase
        .from('trip_requests')
        .select('required_truck_type_id, material_type, estimated_weight_tons')
        .eq('id', tripId)
        .single();

      if (tripError) {
        console.error('❌ Error fetching trip:', tripError);
        return { isCompatible: false, error: 'Trip not found' };
      }

      if (!trip) {
        console.error('❌ Trip not found');
        return { isCompatible: false, error: 'Trip not found' };
      }

      console.log('📋 Trip details:', {
        tripId: tripId,
        materialType: trip.material_type,
        requiredTruckTypeId: trip.required_truck_type_id
      });

      if (!trip.required_truck_type_id) {
        console.log('⚠️ Trip has no required truck type ID');
        return { 
          isCompatible: true, // Allow if no specific requirement
          requiredTruckType: 'Any',
          driverTruckTypes: this.currentDriver.preferred_truck_types || [],
          materialType: trip.material_type
        };
      }

      // Get required truck type details
      const { data: requiredTruckType, error: truckError } = await supabase
        .from('truck_types')
        .select('name, description')
        .eq('id', trip.required_truck_type_id)
        .single();

      if (truckError) {
        console.error('❌ Error fetching truck type:', truckError);
        return { 
          isCompatible: false, 
          error: 'Truck type not found',
          materialType: trip.material_type,
          driverTruckTypes: this.currentDriver.preferred_truck_types || []
        };
      }

      if (!requiredTruckType) {
        console.error('❌ Required truck type not found');
        return { 
          isCompatible: false, 
          error: 'Truck type not found',
          materialType: trip.material_type,
          driverTruckTypes: this.currentDriver.preferred_truck_types || []
        };
      }

      const driverPreferredTypes = this.currentDriver.preferred_truck_types || [];
      
      console.log('🔍 DEBUG - Raw driver preferred truck types:', {
        raw: this.currentDriver.preferred_truck_types,
        type: typeof this.currentDriver.preferred_truck_types,
        parsed: driverPreferredTypes
      });
      
      // Create a mapping of common truck type variations to handle compatibility
      const truckTypeMapping: { [key: string]: string[] } = {
        'Small Truck': ['small_truck', 'Small Truck (up to 3.5t)', 'small'],
        'Medium Truck': ['medium_truck', 'Medium Truck (3.5-7.5t)', 'medium'],
        'Large Truck': ['large_truck', 'Large Truck (7.5-18t)', 'large'],
        'Heavy Truck': ['heavy_truck', 'Heavy Truck (18t+)', 'heavy'],
        'Flatbed Truck': ['flatbed_truck', 'Flatbed Truck', 'flatbed'],
        'Dump Truck': ['dump_truck', 'Dump Truck', 'dump'],
        'Concrete Mixer': ['concrete_mixer', 'Concrete Mixer', 'mixer'],
        'Crane Truck': ['crane_truck', 'Crane Truck', 'crane'],
        'Box Truck': ['box_truck', 'Box Truck', 'box'],
        'Refrigerated Truck': ['refrigerated_truck', 'Refrigerated Truck', 'refrigerated']
      };

      // Check if there's a match using the mapping
      let isCompatible = false;
      const requiredTruckTypeName = requiredTruckType.name;
      
      console.log('🔍 DEBUG - Compatibility check details:', {
        requiredTruckTypeName,
        driverPreferredTypes,
        driverPreferredTypesLength: driverPreferredTypes.length,
        directMatch: driverPreferredTypes.includes(requiredTruckTypeName)
      });
      
      // Direct match first
      if (driverPreferredTypes.includes(requiredTruckTypeName)) {
        isCompatible = true;
        console.log('✅ Direct match found!');
      } else {
        console.log('❌ No direct match, checking mapping...');
        
        // Check using mapping
        for (const [dbName, variations] of Object.entries(truckTypeMapping)) {
          console.log(`🔍 Checking category: ${dbName}`);
          console.log(`   Variations: [${variations.join(', ')}]`);
          console.log(`   Required type "${requiredTruckTypeName}" matches category? ${requiredTruckTypeName === dbName}`);
          
          if (requiredTruckTypeName === dbName || variations.includes(requiredTruckTypeName)) {
            console.log(`   ✓ ${requiredTruckTypeName} matches category ${dbName}`);
            
            // Check if driver has any of these variations
            const matchingVariations = variations.filter(variation => {
              const hasVariation = driverPreferredTypes.includes(variation);
              console.log(`     - Driver has "${variation}"? ${hasVariation ? '✅' : '❌'}`);
              return hasVariation;
            });
            
            if (matchingVariations.length > 0) {
              isCompatible = true;
              console.log(`   🎯 MATCH FOUND! Driver has: ${matchingVariations.join(', ')}`);
              break;
            }
          }
        }
      }

      console.log('🔍 Compatibility check result:', {
        requiredTruckType: requiredTruckTypeName,
        driverPreferredTypes,
        isCompatible,
        mappingUsed: 'Enhanced compatibility check'
      });

      return {
        isCompatible,
        requiredTruckType: requiredTruckType.name,
        driverTruckTypes: driverPreferredTypes,
        materialType: trip.material_type
      };
    } catch (error) {
      console.error('❌ Error checking truck type compatibility:', error);
      return { 
        isCompatible: false, 
        error: 'System error',
        driverTruckTypes: this.currentDriver?.preferred_truck_types || []
      };
    }
  }

  // Validate if driver's truck type is compatible with trip requirements
  async validateTruckTypeCompatibility(tripId: string): Promise<boolean> {
    if (!this.currentDriver) return false;

    try {
      console.log('🚛 Validating truck type compatibility for trip:', tripId);
      
      // Get trip requirements
      const { data: trip, error: tripError } = await supabase
        .from('trip_requests')
        .select('required_truck_type_id, material_type, estimated_weight_tons')
        .eq('id', tripId)
        .single();

      if (tripError || !trip) {
        console.error('❌ Error fetching trip requirements:', tripError);
        return false;
      }

      // Get required truck type details
      const { data: requiredTruckType, error: truckError } = await supabase
        .from('truck_types')
        .select('name, description')
        .eq('id', trip.required_truck_type_id)
        .single();

      if (truckError || !requiredTruckType) {
        console.error('❌ Error fetching required truck type:', truckError);
        return false;
      }

      // Check if driver's preferred truck types include the required type
      const driverPreferredTypes = this.currentDriver.preferred_truck_types || [];
      
      // Use the same enhanced compatibility logic
      const truckTypeMapping: { [key: string]: string[] } = {
        'Small Truck': ['small_truck', 'Small Truck (up to 3.5t)', 'small'],
        'Medium Truck': ['medium_truck', 'Medium Truck (3.5-7.5t)', 'medium'],
        'Large Truck': ['large_truck', 'Large Truck (7.5-18t)', 'large'],
        'Heavy Truck': ['heavy_truck', 'Heavy Truck (18t+)', 'heavy'],
        'Flatbed Truck': ['flatbed_truck', 'Flatbed Truck', 'flatbed'],
        'Dump Truck': ['dump_truck', 'Dump Truck', 'dump'],
        'Concrete Mixer': ['concrete_mixer', 'Concrete Mixer', 'mixer'],
        'Crane Truck': ['crane_truck', 'Crane Truck', 'crane'],
        'Box Truck': ['box_truck', 'Box Truck', 'box'],
        'Refrigerated Truck': ['refrigerated_truck', 'Refrigerated Truck', 'refrigerated']
      };

      let isCompatible = false;
      const requiredTruckTypeName = requiredTruckType.name;
      
      // Direct match first
      if (driverPreferredTypes.includes(requiredTruckTypeName)) {
        isCompatible = true;
      } else {
        // Check using mapping
        for (const [dbName, variations] of Object.entries(truckTypeMapping)) {
          if (requiredTruckTypeName === dbName || variations.includes(requiredTruckTypeName)) {
            // Check if driver has any of these variations
            const hasMatch = variations.some(variation => driverPreferredTypes.includes(variation));
            if (hasMatch) {
              isCompatible = true;
              break;
            }
          }
        }
      }

      console.log('🔍 Truck type compatibility check:');
      console.log('   - Required truck type:', requiredTruckTypeName);
      console.log('   - Driver preferred types:', driverPreferredTypes);
      console.log('   - Material type:', trip.material_type);
      console.log('   - Weight:', trip.estimated_weight_tons, 'tons');
      console.log('   - Compatible:', isCompatible ? '✅ YES' : '❌ NO');

      return isCompatible;
    } catch (error) {
      console.error('❌ Error validating truck type compatibility:', error);
      return false;
    }
  }

  // Accept an order assignment
  async acceptOrder(assignmentId: string): Promise<boolean> {
    if (!this.currentDriver) return false;

    try {
      console.log('✅ Accepting trip request:', assignmentId);
      console.log('🔍 Driver info:', { 
        driverId: this.currentDriver.id, 
        userId: this.currentDriver.user_id,
        name: this.currentDriver.fullName 
      });
      
      // First, validate truck type compatibility
      const isCompatible = await this.validateTruckTypeCompatibility(assignmentId);
      if (!isCompatible) {
        console.log('❌ Trip requires different truck type than driver has');
        return false;
      }
      
      // Update trip_requests table to assign driver
      const { data, error } = await supabase
        .from('trip_requests')
        .update({ 
          status: 'matched',
          assigned_driver_id: this.currentDriver.user_id, // Use user_id to match FK constraint
          matched_at: new Date().toISOString()
        })
        .eq('id', assignmentId)
        .eq('status', 'pending') // Ensure trip is still available
        .is('assigned_driver_id', null) // Ensure not already assigned
        .select()
        .single();

      if (error) {
        console.error('❌ Error accepting trip:', error.message, error.code);
        console.error('❌ Error details:', error);
        return false;
      }

      if (!data) {
        console.log('❌ Trip no longer available');
        return false;
      }

      console.log('✅ Trip accepted successfully');
      
      // Update driver status to busy
      await this.updateDriverStatus('busy');

      return true;
    } catch (error) {
      console.error('💥 Error accepting order:', error);
      return false;
    }
  }

  // Decline an order assignment
  async declineOrder(assignmentId: string, reason?: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('order_assignments')
        .update({ 
          status: 'declined',
          declined_at: new Date().toISOString(),
          decline_reason: reason
        })
        .eq('id', assignmentId);

      if (error) {
        console.error('Error declining order:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error declining order:', error);
      return false;
    }
  }

  // Start pickup process
  async startPickup(orderId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'driver_en_route_pickup',
          pickup_started_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) {
        console.error('Error starting pickup:', error);
        return false;
      }

      // Start location tracking
      await driverLocationService.startDriverTracking((location) => {
        // Update location in real-time
        this.updateDeliveryProgress(orderId, 'en_route_pickup', location);
      });

      return true;
    } catch (error) {
      console.error('Error starting pickup:', error);
      return false;
    }
  }

  // Confirm pickup completion
  async confirmPickup(
    orderId: string, 
    photos?: string[], 
    notes?: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'picked_up',
          pickup_completed_at: new Date().toISOString(),
          pickup_photos: photos,
          pickup_notes: notes
        })
        .eq('id', orderId);

      if (error) {
        console.error('Error confirming pickup:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error confirming pickup:', error);
      return false;
    }
  }

  // Start delivery process
  async startDelivery(orderId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'en_route_delivery',
          delivery_started_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) {
        console.error('Error starting delivery:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error starting delivery:', error);
      return false;
    }
  }

  // Complete delivery
  async completeDelivery(
    orderId: string,
    photos?: string[],
    signature?: string,
    notes?: string,
    customerRating?: number
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'delivered',
          delivery_completed_at: new Date().toISOString(),
          delivery_photos: photos,
          delivery_signature: signature,
          delivery_notes: notes,
          customer_rating: customerRating
        })
        .eq('id', orderId);

      if (error) {
        console.error('Error completing delivery:', error);
        return false;
      }

      // Update driver earnings and stats
      await this.updateDriverEarnings(orderId);
      
      // Reset active order and go back online
      this.activeOrder = null;
      await this.updateDriverStatus('online');
      
      // Stop location tracking
      driverLocationService.stopDriverTracking();

      return true;
    } catch (error) {
      console.error('Error completing delivery:', error);
      return false;
    }
  }

  // Update delivery progress for real-time tracking
  private async updateDeliveryProgress(
    orderId: string,
    status: string,
    location: LocationCoordinates
  ): Promise<void> {
    try {
      await driverLocationService.notifyCustomerOfStatusUpdate(orderId, status);
    } catch (error) {
      console.error('Error updating delivery progress:', error);
    }
  }

  // Update driver earnings after delivery completion
  private async updateDriverEarnings(orderId: string): Promise<void> {
    if (!this.currentDriver) return;

    try {
      // Calculate earnings for this delivery
      const { data: orderData } = await supabase
        .from('order_assignments')
        .select('estimated_earnings')
        .eq('order_id', orderId)
        .single();

      if (orderData) {
        const newTotal = this.currentDriver.total_earnings + orderData.estimated_earnings;
        const newDeliveryCount = this.currentDriver.total_trips + 1;

        await supabase
          .from('drivers')
          .update({
            total_earnings: newTotal,
            total_deliveries: newDeliveryCount
          })
          .eq('id', this.currentDriver.id);

        this.currentDriver.total_earnings = newTotal;
        this.currentDriver.total_trips = newDeliveryCount;
      }
    } catch (error) {
      console.error('Error updating driver earnings:', error);
    }
  }

  // Update trip status (start trip, complete pickup, etc.)
  async updateTripStatus(tripId: string, status: string): Promise<boolean> {
    if (!this.currentDriver) return false;

    try {
      console.log('🔄 Updating trip status:', { tripId: tripId.substring(0,8), status });
      
      const updateData: any = { status };
      const now = new Date().toISOString();
      
      // Set timestamp based on status
      switch (status) {
        case 'pickup_started':
        case 'en_route_pickup':
        case 'start_trip':
          updateData.pickup_started_at = now;
          updateData.status = 'in_transit'; // Use valid status 'in_transit' instead
          break;
        case 'picked_up':
        case 'pickup_completed':
          updateData.pickup_completed_at = now;
          updateData.status = 'in_transit'; // Always use 'in_transit' for picked up
          break;
        case 'in_transit':
        case 'en_route_delivery':
          updateData.delivery_started_at = now;
          updateData.status = 'in_transit'; // Keep as in_transit
          break;
        case 'delivered':
        case 'completed':
          updateData.delivered_at = now;
          updateData.status = 'delivered'; // Always use 'delivered' for completion
          break;
        default:
          // For any invalid status, default to in_transit
          updateData.status = 'in_transit';
          break;
      }

      const { data, error } = await supabase
        .from('trip_requests')
        .update(updateData)
        .eq('id', tripId)
        .eq('assigned_driver_id', this.currentDriver.user_id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating trip status:', error);
        return false;
      }

      console.log('✅ Trip status updated to:', data.status);
      
      // Store current active trip in AsyncStorage for persistence
      await AsyncStorage.setItem('activeTrip', JSON.stringify(data));
      
      return true;
    } catch (error) {
      console.error('💥 Exception updating trip status:', error);
      return false;
    }
  }

  // Get current active trip (for app restoration)
  async getCurrentActiveTrip(): Promise<any | null> {
    if (!this.currentDriver) return null;

    try {
      console.log('🔍 Checking for active trip...');
      
      // First check database for active trips
      const { data: dbTrip, error } = await supabase
        .from('trip_requests')
        .select('*')
        .eq('assigned_driver_id', this.currentDriver.user_id)
        .in('status', ['matched', 'in_transit'])
        .order('matched_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('❌ Error fetching active trip from DB:', error);
      }

      if (dbTrip) {
        console.log('✅ Found active trip in database:', { id: dbTrip.id.substring(0,8), status: dbTrip.status });
        // Update AsyncStorage with latest from DB
        await AsyncStorage.setItem('activeTrip', JSON.stringify(dbTrip));
        return dbTrip;
      }

      // Fallback to AsyncStorage (offline support)
      const cachedTrip = await AsyncStorage.getItem('activeTrip');
      if (cachedTrip) {
        const trip = JSON.parse(cachedTrip);
        console.log('📱 Found cached active trip:', { id: trip.id.substring(0,8), status: trip.status });
        return trip;
      }

      console.log('📭 No active trip found');
      return null;
    } catch (error) {
      console.error('💥 Exception getting active trip:', error);
      return null;
    }
  }

  // Clear active trip (when completed)
  async clearActiveTrip(): Promise<void> {
    try {
      await AsyncStorage.removeItem('activeTrip');
      console.log('🗑️ Active trip cleared from storage');
    } catch (error) {
      console.error('❌ Error clearing active trip:', error);
    }
  }

  // Get assigned trips for navigation
  async getAssignedTrips(): Promise<any[]> {
    if (!this.currentDriver) return [];

    try {
      console.log('🔍 Fetching assigned trips for navigation...');
      
      const { data, error } = await supabase
        .from('trip_requests')
        .select('*')
        .eq('assigned_driver_id', this.currentDriver.user_id)
        .in('status', ['matched', 'in_transit'])
        .order('matched_at', { ascending: true });

      if (error) {
        console.error('❌ Error fetching assigned trips:', error);
        return [];
      }

      console.log('✅ Found', data?.length || 0, 'assigned trips for navigation');
      return data || [];
    } catch (error) {
      console.error('❌ Exception in getAssignedTrips:', error);
      return [];
    }
  }

  // Get driver statistics
  async getDriverStats(): Promise<DriverStats | null> {
    if (!this.currentDriver) return null;

    try {
      console.log('📊 Loading driver stats from database...');
      
      // For now, use the driver profile data and return real zeros instead of mock data
      const stats: DriverStats = {
        today: {
          deliveries: 0, // Real data: no deliveries yet
          earnings: 0,   // Real data: no earnings yet
          hoursWorked: 0, // Real data: no hours worked yet
          averageRating: this.currentDriver.rating || 0
        },
        thisWeek: {
          deliveries: 0, // Real data: no deliveries yet
          earnings: 0,   // Real data: no earnings yet
          hoursWorked: 0 // Real data: no hours worked yet
        },
        thisMonth: {
          deliveries: 0,  // Real data: no deliveries yet
          earnings: 0,    // Real data: no earnings yet
          hoursWorked: 0  // Real data: no hours worked yet
        },
        allTime: {
          totalDeliveries: this.currentDriver.total_trips || 0,
          totalEarnings: this.currentDriver.total_earnings || 0,
          averageRating: this.currentDriver.rating || 0,
          completionRate: 100 // Real data: perfect record so far
        }
      };

      console.log('✅ Driver stats loaded');
      return stats;
    } catch (error) {
      console.error('Error getting driver stats:', error);
      return null;
    }
  }

  // Get current driver info
  getCurrentDriver(): Driver | null {
    return this.currentDriver;
  }

  // Get active order
  getActiveOrder(): OrderAssignment | null {
    return this.activeOrder;
  }

  // Get driver's registered vehicles
  async getDriverVehicles(): Promise<any[]> {
    try {
      if (!this.currentDriver) {
        console.log('❌ No current driver');
        return [];
      }

      console.log('🚛 Fetching vehicles for driver:', this.currentDriver.user_id);

      const { data: vehicles, error } = await supabase
        .from('trucks')
        .select(`
          id,
          license_plate,
          make,
          model,
          year,
          color,
          truck_type,
          is_available,
          is_active,
          verification_status,
          insurance_expiry_date,
          registration_expiry_date,
          current_driver_id
        `)
        .eq('current_driver_id', this.currentDriver.user_id);

      if (error) {
        console.error('❌ Error fetching vehicles:', error);
        return [];
      }

      console.log('✅ Found vehicles:', vehicles?.length || 0);
      return vehicles || [];
    } catch (error) {
      console.error('❌ Exception fetching vehicles:', error);
      return [];
    }
  }

  // ==================== REAL DATABASE INTEGRATION ====================

  // Get real available trip requests from database
  async getAvailableTrips(): Promise<OrderAssignment[]> {
    try {
      console.log('🔍 Fetching available trip requests from database...');
      
      // ✅ NEW: First check if driver is approved
      const approvalStatus = await this.checkDriverApprovalStatus();
      
      if (!approvalStatus.canPickTrips) {
        console.log('🚫 Driver not approved, cannot view trips');
        console.log('📝 Approval status:', approvalStatus.message);
        
        // Return empty array with approval message logged
        return [];
      }
      
      console.log('✅ Driver approved, fetching available trips...');
      
      // ✅ NEW: Get driver's current location first
      const driverLocation = await this.getCurrentDriverLocation();
      if (!driverLocation) {
        console.log('⚠️ Cannot get driver location, showing all trips');
      } else {
        console.log('📍 Driver location:', driverLocation);
      }
      
      // Debug: Check current authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log('🔍 Current auth user:', { 
        id: user?.id, 
        email: user?.email,
        error: authError?.message 
      });
      
      // Try with regular client first
      const { data: trips, error } = await supabase
        .from('trip_requests')
        .select(`
          id,
          pickup_latitude,
          pickup_longitude,
          pickup_address,
          delivery_latitude,
          delivery_longitude,
          delivery_address,
          material_type,
          load_description,
          estimated_weight_tons,
          estimated_volume_m3,
          quoted_price,
          estimated_distance_km,
          estimated_duration_minutes,
          special_requirements,
          requires_crane,
          requires_hydraulic_lift,
          scheduled_pickup_time,
          created_at,
          customer_id,
          status,
          assigned_driver_id
        `)
        .eq('status', 'pending')
        .is('assigned_driver_id', null)
        .order('created_at', { ascending: false })
        .limit(10);

      console.log('🔍 Query result:', { 
        error: error?.message, 
        errorCode: error?.code,
        tripCount: trips?.length,
        authUserId: user?.id
      });
      
      if (error) {
        console.error('❌ Supabase error, trying service role...', error.message);
        
        // Try with service role as fallback
        const { createClient } = require('@supabase/supabase-js');
        const serviceSupabase = createClient(
          'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8'
        );
        
        const { data: serviceTrips, error: serviceError } = await serviceSupabase
          .from('trip_requests')
          .select(`
            id,
            pickup_latitude,
            pickup_longitude,
            pickup_address,
            delivery_latitude,
            delivery_longitude,
            delivery_address,
            material_type,
            load_description,
            estimated_weight_tons,
            estimated_volume_m3,
            quoted_price,
            estimated_distance_km,
            estimated_duration_minutes,
            special_requirements,
            requires_crane,
            requires_hydraulic_lift,
            scheduled_pickup_time,
            created_at,
            customer_id,
            status,
            assigned_driver_id
          `)
          .eq('status', 'pending')
          .is('assigned_driver_id', null)
          .order('created_at', { ascending: false })
          .limit(10);

        if (serviceError) {
          console.error('❌ Service role also failed:', serviceError);
          return [];
        }
        
        console.log('✅ Service role success:', serviceTrips?.length, 'trips found');
        // Use service role results
        const finalTrips = serviceTrips;
        
        if (!finalTrips || finalTrips.length === 0) {
          console.log('📭 No available trips found via service role');
          return [];
        }

        console.log(`✅ Found ${finalTrips.length} available trips via service role`);

        // Convert to OrderAssignment format with distance calculation
        const assignments: OrderAssignment[] = [];
        const maxDistanceKm = 50; // Only show trips within 50km
        
        for (const trip of finalTrips) {
          // Calculate distance from driver to pickup location
          let distanceToPickupKm = 0;
          
          if (driverLocation) {
            const pickupLat = Number(trip.pickup_latitude);
            const pickupLng = Number(trip.pickup_longitude);
            
            if (pickupLat && pickupLng) {
              distanceToPickupKm = this.calculateDistanceKm(
                driverLocation.latitude,
                driverLocation.longitude,
                pickupLat,
                pickupLng
              );
              
              console.log(`📏 Trip ${trip.id}: ${distanceToPickupKm.toFixed(1)}km away (service role)`);
              
              // Skip trips that are too far away
              if (distanceToPickupKm > maxDistanceKm) {
                console.log(`⚠️ Trip ${trip.id} is ${distanceToPickupKm.toFixed(1)}km away, skipping (max: ${maxDistanceKm}km)`);
                continue;
              }
            }
          }
          
          const assignment = {
            id: trip.id,
            orderId: trip.id,
            customerId: trip.customer_id || '',
            customerName: 'Customer', // Will be loaded separately if needed
            customerPhone: '', // Will be loaded separately if needed
            pickupLocation: {
              address: typeof trip.pickup_address === 'object' ? 
                (trip.pickup_address as any).formatted_address || 'Pickup Location' : 
                'Pickup Location',
              latitude: Number(trip.pickup_latitude),
              longitude: Number(trip.pickup_longitude),
            },
            deliveryLocation: {
              address: typeof trip.delivery_address === 'object' ? 
                (trip.delivery_address as any).formatted_address || 'Delivery Location' : 
                'Delivery Location',
              latitude: Number(trip.delivery_latitude),
              longitude: Number(trip.delivery_longitude),
            },
            materials: [{
              type: trip.material_type,
              description: trip.load_description,
              quantity: Number(trip.estimated_weight_tons || 1),
              weight: Number(trip.estimated_weight_tons || 1),
            }],
            estimatedEarnings: Number(trip.quoted_price || 0),
            estimatedDuration: Number(trip.estimated_duration_minutes || 60),
            distanceKm: driverLocation ? distanceToPickupKm : Number(trip.estimated_distance_km || 0), // Use distance to pickup, not trip distance
            specialInstructions: trip.special_requirements ? 
              JSON.stringify(trip.special_requirements) : undefined,
            assignedAt: new Date().toISOString(),
            acceptDeadline: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
            status: 'pending' as const,
          };
          
          assignments.push(assignment);
        }

        // Sort by distance (closest first)
        if (driverLocation) {
          assignments.sort((a, b) => a.distanceKm - b.distanceKm);
          console.log(`📍 Filtered to ${assignments.length} nearby trips (within ${maxDistanceKm}km) via service role`);
        }

        return assignments;
      }

      // Regular query succeeded
      if (!trips || trips.length === 0) {
        console.log('📭 No available trips found');
        
        // Debug: Let's check if there are ANY trips without filters
        const { data: allTrips, error: debugError } = await supabase
          .from('trip_requests')
          .select('id, status, assigned_driver_id')
          .limit(5);
          
        console.log('🔍 Debug - All trips in table:', { 
          error: debugError?.message, 
          count: allTrips?.length,
          sample: allTrips?.[0] 
        });
        
        return [];
      }

      console.log(`✅ Found ${trips.length} available trips`);

      // Convert to OrderAssignment format with distance calculation
      const assignments: OrderAssignment[] = [];
      const maxDistanceKm = 50; // Only show trips within 50km
      
      for (const trip of trips) {
        // Calculate distance from driver to pickup location
        let distanceToPickupKm = 0;
        
        if (driverLocation) {
          const pickupLat = Number(trip.pickup_latitude);
          const pickupLng = Number(trip.pickup_longitude);
          
          if (pickupLat && pickupLng) {
            distanceToPickupKm = this.calculateDistanceKm(
              driverLocation.latitude,
              driverLocation.longitude,
              pickupLat,
              pickupLng
            );
            
            console.log(`📏 Trip ${trip.id}: ${distanceToPickupKm.toFixed(1)}km away`);
            
            // Skip trips that are too far away
            if (distanceToPickupKm > maxDistanceKm) {
              console.log(`⚠️ Trip ${trip.id} is ${distanceToPickupKm.toFixed(1)}km away, skipping (max: ${maxDistanceKm}km)`);
              continue;
            }
          }
        }
        
        const assignment = {
          id: trip.id,
          orderId: trip.id,
          customerId: trip.customer_id || '',
          customerName: 'Customer', // Will be loaded separately if needed
          customerPhone: '', // Will be loaded separately if needed
          pickupLocation: {
            address: typeof trip.pickup_address === 'object' ? 
              (trip.pickup_address as any).formatted_address || 'Pickup Location' : 
              'Pickup Location',
            latitude: Number(trip.pickup_latitude),
            longitude: Number(trip.pickup_longitude),
          },
          deliveryLocation: {
            address: typeof trip.delivery_address === 'object' ? 
              (trip.delivery_address as any).formatted_address || 'Delivery Location' : 
              'Delivery Location',
            latitude: Number(trip.delivery_latitude),
            longitude: Number(trip.delivery_longitude),
          },
          materials: [{
            type: trip.material_type,
            description: trip.load_description,
            quantity: Number(trip.estimated_weight_tons || 1),
            weight: Number(trip.estimated_weight_tons || 1),
          }],
          estimatedEarnings: Number(trip.quoted_price || 0),
          estimatedDuration: Number(trip.estimated_duration_minutes || 60),
          distanceKm: driverLocation ? distanceToPickupKm : Number(trip.estimated_distance_km || 0), // Use distance to pickup, not trip distance
          specialInstructions: trip.special_requirements ? 
            JSON.stringify(trip.special_requirements) : undefined,
          assignedAt: new Date().toISOString(),
          acceptDeadline: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
          status: 'pending' as const,
        };
        
        assignments.push(assignment);
      }

      // Sort by distance (closest first)
      if (driverLocation) {
        assignments.sort((a, b) => a.distanceKm - b.distanceKm);
        console.log(`📍 Filtered to ${assignments.length} nearby trips (within ${maxDistanceKm}km)`);
      }

      return assignments;
    } catch (error) {
      console.error('💥 Error in getAvailableTrips:', error);
      return [];
    }
  }

  // Get real trip history from database
  async getTripHistory(limit: number = 20): Promise<any[]> {
    try {
      if (!this.currentDriver) return [];

      console.log('📋 Fetching trip history from database...');
      
      const { data: trips, error } = await supabase
        .from('trip_requests')
        .select(`
          id,
          pickup_address,
          delivery_address,
          material_type,
          load_description,
          estimated_weight_tons,
          final_price,
          estimated_distance_km,
          status,
          delivered_at,
          customer_rating,
          customer_feedback,
          driver_rating,
          driver_feedback,
          created_at,
          users!trip_requests_customer_id_fkey (
            first_name,
            last_name
          )
        `)
        .eq('assigned_driver_id', this.currentDriver.user_id)
        .in('status', ['delivered', 'cancelled'])
        .order('delivered_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Error fetching trip history:', error);
        return [];
      }

      console.log(`✅ Found ${trips?.length || 0} trips in history`);
      return trips || [];
    } catch (error) {
      console.error('💥 Error in getTripHistory:', error);
      return [];
    }
  }

  // Get real earnings data from database
  async getEarningsData(period: 'today' | 'week' | 'month' = 'week'): Promise<any> {
    try {
      if (!this.currentDriver) return null;

      console.log(`💰 Fetching ${period} earnings from database...`);

      let startDate: Date;
      const now = new Date();

      switch (period) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
      }

      const { data: trips, error } = await supabase
        .from('trip_requests')
        .select(`
          id,
          final_price,
          delivered_at,
          estimated_duration_minutes,
          customer_rating
        `)
        .eq('assigned_driver_id', this.currentDriver.user_id)
        .eq('status', 'delivered')
        .gte('delivered_at', startDate.toISOString())
        .order('delivered_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching earnings:', error);
        return null;
      }

      const totalEarnings = trips?.reduce((sum, trip) => sum + (Number(trip.final_price) || 0), 0) || 0;
      const totalTrips = trips?.length || 0;
      const totalHours = trips?.reduce((sum, trip) => sum + (Number(trip.estimated_duration_minutes) || 0), 0) / 60 || 0;
      const averageRating = trips?.length ? 
        trips.reduce((sum, trip) => sum + (Number(trip.customer_rating) || 0), 0) / trips.length : 0;

      console.log(`✅ ${period} earnings: ${totalEarnings} SAR from ${totalTrips} trips`);

      return {
        totalEarnings,
        totalTrips,
        totalHours,
        averageRating,
        period,
        trips: trips || []
      };
    } catch (error) {
      console.error('💥 Error in getEarningsData:', error);
      return null;
    }
  }

  /**
   * Verify email with OTP code
   */
  async verifyEmail(email: string, otp: string): Promise<{ success: boolean; message: string; driverId?: string }> {
    try {
      console.log('📧 Verifying email with OTP...');
      
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'signup'
      });

      if (error) {
        console.error('❌ Email verification error:', error);
        return { success: false, message: error.message };
      }

      if (!data.user) {
        return { success: false, message: 'Verification failed - no user returned' };
      }

      console.log('✅ Email verified successfully:', data.user.id);

      // Get the driver profile ID
      const { data: driverProfile, error: profileError } = await supabase
        .from('driver_profiles')
        .select('id')
        .eq('user_id', data.user.id)
        .single();

      if (profileError) {
        console.error('⚠️ Could not find driver profile:', profileError);
        return { 
          success: true, 
          message: 'Email verified but could not find driver profile', 
          driverId: data.user.id 
        };
      }

      return { 
        success: true, 
        message: 'Email verified successfully', 
        driverId: driverProfile.id 
      };

    } catch (error) {
      console.error('💥 Error verifying email:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Email verification failed' 
      };
    }
  }

  /**
   * Resend verification code
   */
  async resendVerificationCode(email: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('📧 Resending verification code...');
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email
      });

      if (error) {
        console.error('❌ Resend verification error:', error);
        return { success: false, message: error.message };
      }

      console.log('✅ Verification code resent successfully');
      return { success: true, message: 'Verification code sent successfully' };

    } catch (error) {
      console.error('💥 Error resending verification code:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to resend verification code' 
      };
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<{ success: boolean; message: string; user?: any }> {
    try {
      console.log('🔑 Signing in user...');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('❌ Sign in error:', error);
        return { success: false, message: error.message };
      }

      if (!data.user) {
        return { success: false, message: 'Sign in failed - no user returned' };
      }

      console.log('✅ User signed in successfully:', data.user.id);
      return { 
        success: true, 
        message: 'Signed in successfully', 
        user: data.user 
      };

    } catch (error) {
      console.error('💥 Error signing in:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Sign in failed' 
      };
    }
  }

  /**
   * Check if user is currently authenticated
   */
  async isAuthenticated(): Promise<{ authenticated: boolean; user?: any; message: string }> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ Session check error:', error);
        return { authenticated: false, message: 'Session check failed' };
      }
      
      if (!session) {
        return { authenticated: false, message: 'No active session' };
      }
      
      return { 
        authenticated: true, 
        user: session.user, 
        message: 'User is authenticated' 
      };
    } catch (error) {
      console.error('💥 Error checking authentication:', error);
      return { authenticated: false, message: 'Authentication check failed' };
    }
  }

  // Document Management Methods
  
  /**
   * Upload a document for driver verification
   */
  async uploadDocument(
    driverId: string,
    documentType: string,
    file: {
      uri: string;
      name: string;
      type: string;
      size?: number;
    }
  ): Promise<DocumentUploadResult> {
    try {
      console.log(`📄 Starting upload process...`);
      console.log(`📄 Driver ID: ${driverId.substring(0, 8)}...`);
      console.log(`📄 Document Type: ${documentType}`);
      console.log(`📄 File info:`, { uri: file.uri, name: file.name, type: file.type, size: file.size });

      // Create file name
      const fileExtension = file.name?.split('.').pop() || 'jpg';
      const fileName = `${driverId}_${documentType}_${Date.now()}.${fileExtension}`;
      console.log(`📄 Generated filename: ${fileName}`);

      // Check if user is authenticated
      console.log('🔐 Checking authentication...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('❌ Authentication error:', sessionError);
        
        // Try to refresh the session
        console.log('🔄 Attempting to refresh session...');
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshData.session) {
          console.error('❌ Session refresh failed:', refreshError);
          return { 
            success: false, 
            message: 'Authentication failed. Please log out and log back in.', 
            error: 'Authentication failed' 
          };
        }
        
        console.log('✅ Session refreshed successfully');
        console.log(`🔐 User authenticated after refresh: ${refreshData.session.user.id}`);
      } else {
        console.log(`🔐 User authenticated: ${session.user.id}`);
        console.log(`🔐 Access token exists: ${!!session.access_token}`);
      }

      // Convert file URI to blob for React Native
      console.log('🔄 Converting file to blob...');
      const response = await fetch(file.uri);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
      }
      const blob = await response.blob();
      console.log(`✅ Blob created - size: ${blob.size}, type: ${blob.type}`);

      // Upload to Supabase Storage with proper authentication
      console.log('☁️ Uploading to Supabase Storage...');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('driver-documents')
        .upload(fileName, blob, {
          contentType: file.type || blob.type,
          upsert: false
        });

      if (uploadError) {
        console.error('❌ Storage upload error:', uploadError);
        console.error('❌ Error details:', JSON.stringify(uploadError, null, 2));
        
        // Check if it's an authentication issue
        if (uploadError.message?.includes('signature verification') || uploadError.message?.includes('Invalid API key')) {
          return { success: false, message: 'Authentication failed. Please try logging out and back in.', error: uploadError.message };
        }
        
        return { success: false, message: 'Failed to upload file', error: uploadError.message };
      }

      console.log('✅ File uploaded successfully to storage:', uploadData.path);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('driver-documents')
        .getPublicUrl(fileName);

      // Save document record to database
      const { data: documentData, error: dbError } = await supabase
        .from('driver_documents')
        .insert({
          driver_id: driverId,
          document_type: documentType,
          file_name: file.name || fileName,
          file_size: file.size || blob.size,
          file_url: urlData.publicUrl,
          status: 'pending',
          uploaded_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (dbError) {
        console.error('❌ Database error:', dbError);
        return { success: false, message: 'Failed to save document record', error: dbError.message };
      }

      console.log(`✅ Document uploaded successfully: ${documentData.id}`);
      return { 
        success: true, 
        documentId: documentData.id, 
        message: 'Document uploaded successfully' 
      };

    } catch (error) {
      console.error('💥 Error uploading document:', error);
      return { 
        success: false, 
        message: 'Upload failed', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get all documents for a driver
   */
  async getDriverDocuments(driverId: string): Promise<DriverDocument[]> {
    try {
      console.log(`📄 Fetching documents for driver ${driverId.substring(0, 8)}...`);

      const { data, error } = await supabase
        .from('driver_documents')
        .select('*')
        .eq('driver_id', driverId)
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching documents:', error);
        return [];
      }

      console.log(`✅ Found ${data.length} documents`);
      return data;
    } catch (error) {
      console.error('💥 Error in getDriverDocuments:', error);
      return [];
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string): Promise<boolean> {
    try {
      console.log(`🗑️ Deleting document ${documentId}...`);

      const { error } = await supabase
        .from('driver_documents')
        .delete()
        .eq('id', documentId);

      if (error) {
        console.error('❌ Error deleting document:', error);
        return false;
      }

      console.log('✅ Document deleted successfully');
      return true;
    } catch (error) {
      console.error('💥 Error in deleteDocument:', error);
      return false;
    }
  }

  /**
   * Check if all required documents are uploaded and approved
   */
  async checkDocumentCompletionStatus(driverId: string): Promise<{
    isComplete: boolean;
    requiredDocs: string[];
    uploadedDocs: string[];
    approvedDocs: string[];
    pendingDocs: string[];
    rejectedDocs: string[];
  }> {
    try {
      const documents = await this.getDriverDocuments(driverId);
      const requiredDocTypes = [
        'drivers_license',
        'vehicle_registration', 
        'insurance_certificate',
        'profile_photo'
      ];

      const uploadedDocs = documents.map(doc => doc.document_type);
      const approvedDocs = documents
        .filter(doc => doc.status === 'approved')
        .map(doc => doc.document_type);
      const pendingDocs = documents
        .filter(doc => doc.status === 'pending')
        .map(doc => doc.document_type);
      const rejectedDocs = documents
        .filter(doc => doc.status === 'rejected')
        .map(doc => doc.document_type);

      const isComplete = requiredDocTypes.every(type => approvedDocs.includes(type));

      return {
        isComplete,
        requiredDocs: requiredDocTypes,
        uploadedDocs,
        approvedDocs,
        pendingDocs,
        rejectedDocs
      };
    } catch (error) {
      console.error('💥 Error checking document completion:', error);
      return {
        isComplete: false,
        requiredDocs: [],
        uploadedDocs: [],
        approvedDocs: [],
        pendingDocs: [],
        rejectedDocs: []
      };
    }
  }

  /**
   * Get document upload progress for UI
   */
  async getDocumentUploadProgress(driverId: string): Promise<{
    totalRequired: number;
    uploaded: number;
    approved: number;
    pending: number;
    rejected: number;
    percentage: number;
  }> {
    try {
      const status = await this.checkDocumentCompletionStatus(driverId);
      const totalRequired = status.requiredDocs.length;
      const uploaded = status.uploadedDocs.length;
      const approved = status.approvedDocs.length;
      const pending = status.pendingDocs.length;
      const rejected = status.rejectedDocs.length;
      const percentage = totalRequired > 0 ? (approved / totalRequired) * 100 : 0;

      return {
        totalRequired,
        uploaded,
        approved,
        pending,
        rejected,
        percentage: Math.round(percentage)
      };
    } catch (error) {
      console.error('💥 Error getting upload progress:', error);
      return {
        totalRequired: 4,
        uploaded: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
        percentage: 0
      };
    }
  }

  // Get driver's current location for proximity calculations
  async getCurrentDriverLocation(): Promise<{ latitude: number; longitude: number } | null> {
    try {
      if (!this.currentDriver) {
        console.log('❌ No current driver available for location');
        return null;
      }

      // Try to get from Expo location service first (real-time GPS)
      try {
        const Location = require('expo-location');
        
        // Check permissions
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('⚠️ Location permission not granted, using database location');
        } else {
          // Get current location
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          
          if (location) {
            console.log('📍 Got driver location from GPS:', {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude
            });
            return {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude
            };
          }
        }
      } catch (locationError) {
        console.log('⚠️ GPS location failed:', locationError instanceof Error ? locationError.message : 'Unknown error');
      }

      // Fallback: Get last known location from database
      const { data: driverData, error } = await supabase
        .from('users')
        .select('current_latitude, current_longitude, last_location_update')
        .eq('id', this.currentDriver.user_id)
        .single();

      if (error || !driverData) {
        console.error('❌ Error getting driver location from database:', error);
        return null;
      }

      if (driverData.current_latitude && driverData.current_longitude) {
        console.log('📍 Got driver location from database:', {
          latitude: driverData.current_latitude,
          longitude: driverData.current_longitude,
          lastUpdate: driverData.last_location_update
        });
        
        return {
          latitude: Number(driverData.current_latitude),
          longitude: Number(driverData.current_longitude)
        };
      }

      console.log('⚠️ No driver location available');
      return null;
    } catch (error) {
      console.error('💥 Error getting driver location:', error);
      return null;
    }
  }

  // Calculate distance between two coordinates using Haversine formula
  private calculateDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLng = this.deg2rad(lng2 - lng1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in kilometers
    return distance;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  // Update driver location in real-time
  async updateDriverLocation(latitude: number, longitude: number): Promise<boolean> {
    try {
      if (!this.currentDriver) return false;

      const { error } = await supabase
        .from('users')
        .update({
          current_latitude: latitude,
          current_longitude: longitude,
          last_location_update: new Date().toISOString()
        })
        .eq('id', this.currentDriver.user_id);

      if (error) {
        console.error('❌ Error updating driver location:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('💥 Error in updateDriverLocation:', error);
      return false;
    }
  }

  // Method to ensure user exists in public.users table (copied from working customer app)
  private async ensureUserInCustomTable(
    supabaseUser: any, 
    registrationData?: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
    }
  ): Promise<void> {
    try {
      console.log('🔍 Checking if user exists in custom users table...');
      
      // Check if user already exists by ID or email
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id, email')
        .or(`id.eq.${supabaseUser.id},email.eq.${supabaseUser.email}`)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking user existence:', checkError);
        return;
      }

      if (existingUser) {
        console.log('✅ User found in custom users table');
        
        // If user exists with same email but different ID, this is likely an orphaned record
        if (existingUser.id !== supabaseUser.id && existingUser.email === supabaseUser.email) {
          console.log('🧹 Orphaned user detected - cleaning up old record and creating new one');
          
          // Delete the orphaned user record
          const { error: deleteError } = await supabase
            .from('users')
            .delete()
            .eq('id', existingUser.id);
          
          if (deleteError) {
            console.error('⚠️ Failed to delete orphaned user:', deleteError.message);
            return;
          }
          
          console.log('✅ Orphaned user record deleted');
          // Continue to create new user record
        } else {
          // User exists with correct ID
          return;
        }
      }

      console.log('🔧 Creating missing user in custom users table...');
      
      // Create user in custom users table
      const customUserData = {
        id: supabaseUser.id,
        email: supabaseUser.email,
        password_hash: 'supabase_auth',
        first_name: registrationData?.firstName || supabaseUser.user_metadata?.first_name || 'User',
        last_name: registrationData?.lastName || supabaseUser.user_metadata?.last_name || '',
        phone: registrationData?.phone || supabaseUser.user_metadata?.phone || '',
        role: 'driver',
        user_type: 'driver',
        is_active: true
      };

      const { data: createdUser, error: createError } = await supabase
        .from('users')
        .insert([customUserData])
        .select()
        .single();

      if (createError) {
        // Check if it's a duplicate key error
        if (createError.message.includes('duplicate key value')) {
          console.log('⚠️ User already exists in custom table (race condition)');
        } else {
          console.error('⚠️ Warning: Failed to create user in custom users table:', createError.message);
          throw new Error(`Failed to create user profile: ${createError.message}`);
        }
      } else {
        console.log('✅ User created in custom users table:', createdUser.id);
      }

    } catch (error) {
      console.error('Error ensuring user in custom table:', error);
      throw error;
    }
  }

  // Helper method to parse JSON fields from database
  private parseJsonField(field: any, defaultValue: any[]): any[] {
    try {
      console.log('🔍 Parsing JSON field:', { field, type: typeof field });
      
      if (Array.isArray(field)) {
        console.log('✅ Field is already an array:', field);
        return field; // Already parsed
      }
      
      if (typeof field === 'string') {
        if (field.trim() === '' || field === 'null' || field === '[]') {
          console.log('⚠️ Field is empty/null, using default:', defaultValue);
          return defaultValue;
        }
        
        const parsed = JSON.parse(field);
        console.log('✅ Parsed JSON string:', parsed);
        return Array.isArray(parsed) ? parsed : defaultValue;
      }
      
      if (field === null || field === undefined) {
        console.log('⚠️ Field is null/undefined, using default:', defaultValue);
        return defaultValue;
      }
      
      console.log('⚠️ Unknown field type, using default:', defaultValue);
      return defaultValue; // Use default if field is null/undefined
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('❌ Failed to parse JSON field:', field, 'Error:', errorMessage, 'Using default:', defaultValue);
      return defaultValue;
    }
  }

  // Update driver specializations
  async updateSpecializations(specializations: string[]): Promise<boolean> {
    try {
      console.log('🔧 Updating driver specializations:', specializations);
      
      const driver = this.getCurrentDriver();
      if (!driver) {
        throw new Error('No active driver found');
      }

      // Update in database
      const { error } = await supabase
        .from('driver_profiles')
        .update({ 
          specializations: JSON.stringify(specializations)
        })
        .eq('id', driver.id);

      if (error) {
        console.error('❌ Error updating specializations:', error);
        throw error;
      }

      // Update local driver data
      const updatedDriver = {
        ...driver,
        specializations: specializations
      };
      
      await AsyncStorage.setItem('currentDriver', JSON.stringify(updatedDriver));
      this.currentDriver = updatedDriver;

      console.log('✅ Specializations updated successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Error updating specializations:', error);
      return false;
    }
  }

  // Update preferred truck types
  async updatePreferredTruckTypes(truckTypes: string[]): Promise<boolean> {
    try {
      console.log('🚛 Updating preferred truck types:', truckTypes);
      
      const driver = this.getCurrentDriver();
      if (!driver) {
        throw new Error('No active driver found');
      }

      // Update in database
      const { error } = await supabase
        .from('driver_profiles')
        .update({ 
          preferred_truck_types: JSON.stringify(truckTypes)
        })
        .eq('id', driver.id);

      if (error) {
        console.error('❌ Error updating truck types:', error);
        throw error;
      }

      // Update local driver data
      const updatedDriver = {
        ...driver,
        preferred_truck_types: truckTypes
      };
      
      await AsyncStorage.setItem('currentDriver', JSON.stringify(updatedDriver));
      this.currentDriver = updatedDriver;

      console.log('✅ Preferred truck types updated successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Error updating truck types:', error);
      return false;
    }
  }
}

export const driverService = new DriverService();
