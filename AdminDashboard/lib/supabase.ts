import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface User {
  id: string
  email: string
  role: 'admin' | 'driver' | 'customer'
  user_type: 'admin' | 'driver' | 'customer'
  first_name: string
  last_name: string
  phone_number?: string
  created_at: string
  updated_at: string
}

export interface DriverProfile {
  id: string
  user_id: string
  license_number: string
  license_expiry: string
  vehicle_type?: string
  vehicle_number?: string
  status: 'active' | 'inactive' | 'suspended'
  rating?: number
  total_trips: number
  created_at: string
  updated_at: string
}

export interface TripRequest {
  id: string
  customer_id: string
  driver_id?: string
  pickup_address: string
  delivery_address: string
  materials: any[]
  status: 'pending' | 'assigned' | 'in_transit' | 'delivered' | 'cancelled'
  total_price: number
  created_at: string
  updated_at: string
}

// Admin service functions
export class AdminService {
  static async createDriver(driverData: {
    email: string
    password: string
    firstName: string
    lastName: string
    phoneNumber: string
    licenseNumber: string
    licenseExpiry: string
    vehicleType?: string
    vehicleNumber?: string
  }) {
    try {
      // 1. Create user account in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: driverData.email,
        password: driverData.password,
        options: {
          data: {
            first_name: driverData.firstName,
            last_name: driverData.lastName,
            role: 'driver'
          }
        }
      })

      if (authError) throw authError

      // 2. Create user record in custom users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user!.id,
          email: driverData.email,
          role: 'driver',
          user_type: 'driver',
          first_name: driverData.firstName,
          last_name: driverData.lastName,
          phone_number: driverData.phoneNumber
        })
        .select()
        .single()

      if (userError) throw userError

      // 3. Create driver profile
      const { data: profileData, error: profileError } = await supabase
        .from('driver_profiles')
        .insert({
          user_id: authData.user!.id,
          license_number: driverData.licenseNumber,
          license_expiry: driverData.licenseExpiry,
          vehicle_type: driverData.vehicleType,
          vehicle_number: driverData.vehicleNumber,
          status: 'active',
          total_trips: 0
        })
        .select()
        .single()

      if (profileError) throw profileError

      return {
        success: true,
        user: userData,
        profile: profileData
      }
    } catch (error) {
      console.error('Error creating driver:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  static async getDrivers() {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        driver_profiles (*)
      `)
      .eq('role', 'driver')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  static async updateDriverStatus(userId: string, status: 'active' | 'inactive' | 'suspended') {
    const { data, error } = await supabase
      .from('driver_profiles')
      .update({ status })
      .eq('user_id', userId)
      .select()

    if (error) throw error
    return data
  }

  static async getTrips() {
    const { data, error } = await supabase
      .from('trip_requests')
      .select(`
        *,
        customer:users!trip_requests_customer_id_fkey(*),
        driver:users!trip_requests_driver_id_fkey(*)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  static async getDashboardStats() {
    try {
      // Get total drivers
      const { count: totalDrivers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'driver')

      // Get active drivers
      const { count: activeDrivers } = await supabase
        .from('driver_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')

      // Get total trips
      const { count: totalTrips } = await supabase
        .from('trip_requests')
        .select('*', { count: 'exact', head: true })

      // Get pending trips
      const { count: pendingTrips } = await supabase
        .from('trip_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      return {
        totalDrivers: totalDrivers || 0,
        activeDrivers: activeDrivers || 0,
        totalTrips: totalTrips || 0,
        pendingTrips: pendingTrips || 0
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      return {
        totalDrivers: 0,
        activeDrivers: 0,
        totalTrips: 0,
        pendingTrips: 0
      }
    }
  }
}
