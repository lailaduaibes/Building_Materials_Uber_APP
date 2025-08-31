// ENHANCE YOUR EXISTING NOTIFICATION SYSTEM
// Use your existing 'notifications' table structure

class ExistingNotificationEnhancer {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
    }

    // Send ASAP trip alert using your existing notifications table
    async sendASAPTripAlert(customerId, tripDetails) {
        try {
            const notification = {
                user_id: customerId,
                trip_id: tripDetails.id,
                title: '⚡ ASAP Driver Found!',
                message: `Your priority delivery driver will arrive in ${tripDetails.estimatedArrival} minutes. Premium service active!`,
                type: 'trip_update',
                data: {
                    trip_id: tripDetails.id,
                    priority: 'asap',
                    estimated_arrival: tripDetails.estimatedArrival,
                    driver_name: tripDetails.driverName,
                    driver_phone: tripDetails.driverPhone,
                    action_type: 'asap_matched'
                }
            };

            const { error } = await this.supabase
                .from('notifications')
                .insert(notification);

            if (error) throw error;

            console.log('⚡ ASAP alert sent to customer:', customerId);
            return true;

        } catch (error) {
            console.error('❌ Error sending ASAP alert:', error);
            return false;
        }
    }

    // Send driver status notifications
    async sendDriverStatusNotification(driverId, status, details = {}) {
        try {
            // Get driver info
            const { data: driver } = await this.supabase
                .from('driver_profiles')
                .select('user_id, first_name')
                .eq('id', driverId)
                .single();

            if (!driver) return false;

            let title, message;

            switch (status) {
                case 'trip_available':
                    title = '💼 New Trip Available';
                    message = `High-paying delivery request in your area. Estimated earnings: ₪${details.estimatedEarnings}`;
                    break;
                
                case 'asap_bonus':
                    title = '⚡ ASAP Bonus Trip!';
                    message = `₪${details.bonus} bonus for completing this priority delivery within ${details.timeLimit} minutes!`;
                    break;
                
                case 'route_optimized':
                    title = '🤖 Route Optimized';
                    message = `AI has optimized your delivery route. ${details.fuelSavings}% fuel savings expected!`;
                    break;
                
                case 'daily_summary':
                    title = '📊 Daily Summary';
                    message = `Great work today! ${details.tripsCompleted} trips, ₪${details.earnings} earned, ${details.rating}★ rating`;
                    break;
                
                default:
                    title = '📱 Driver Update';
                    message = details.message || 'You have a new update';
            }

            const notification = {
                user_id: driver.user_id,
                trip_id: details.tripId || null,
                title: title,
                message: message,
                type: 'system',
                data: {
                    driver_id: driverId,
                    status_type: status,
                    ...details
                }
            };

            const { error } = await this.supabase
                .from('notifications')
                .insert(notification);

            if (error) throw error;

            console.log(`✅ Driver notification sent: ${status}`, driverId);
            return true;

        } catch (error) {
            console.error('❌ Error sending driver notification:', error);
            return false;
        }
    }

    // Send trip status updates using your existing structure  
    async sendTripStatusUpdate(tripId, newStatus, customData = {}) {
        try {
            // Get trip and customer info
            const { data: trip } = await this.supabase
                .from('trip_requests')
                .select(`
                    *,
                    driver_profiles!assigned_driver_id(first_name, phone)
                `)
                .eq('id', tripId)
                .single();

            if (!trip) return false;

            let title, message, notificationType = 'trip_update';

            switch (newStatus) {
                case 'matched':
                    title = '🚛 Driver Assigned!';
                    message = `${trip.driver_profiles?.first_name || 'Your driver'} has been assigned to your delivery`;
                    break;
                
                case 'pickup_started':
                    title = '📦 Driver En Route to Pickup';
                    message = 'Your driver is heading to the pickup location';
                    break;
                
                case 'pickup_completed':
                    title = '✅ Pickup Complete';
                    message = 'Materials picked up successfully. Now heading to delivery location';
                    break;
                
                case 'delivery_started':
                    title = '🚚 Out for Delivery';
                    message = 'Your materials are on the way to the delivery location';
                    break;
                
                case 'delivered':
                    title = '🎉 Delivery Complete!';
                    message = 'Your materials have been delivered successfully. Please rate your experience';
                    break;
                
                default:
                    title = '📱 Trip Update';
                    message = `Your trip status has been updated to: ${newStatus}`;
            }

            // Add ASAP indicators
            if (trip.pickup_time_preference === 'asap') {
                title = '⚡ ' + title;
                notificationType = 'asap_update';
            }

            const notification = {
                user_id: trip.customer_id,
                trip_id: tripId,
                title: title,
                message: message,
                type: notificationType,
                data: {
                    trip_id: tripId,
                    status: newStatus,
                    driver_name: trip.driver_profiles?.first_name,
                    driver_phone: trip.driver_profiles?.phone,
                    is_asap: trip.pickup_time_preference === 'asap',
                    ...customData
                }
            };

            const { error } = await this.supabase
                .from('notifications')
                .insert(notification);

            if (error) throw error;

            console.log(`✅ Trip status notification sent: ${newStatus}`, tripId);
            return true;

        } catch (error) {
            console.error('❌ Error sending trip status notification:', error);
            return false;
        }
    }

    // Get notification history from your existing table
    async getNotificationHistory(userId, limit = 20) {
        try {
            const { data, error } = await this.supabase
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            return data || [];

        } catch (error) {
            console.error('❌ Error fetching notification history:', error);
            return [];
        }
    }

    // Mark notification as read in your existing table
    async markAsRead(notificationId) {
        try {
            const { error } = await this.supabase
                .from('notifications')
                .update({ 
                    read_at: new Date().toISOString() 
                })
                .eq('id', notificationId);

            if (error) throw error;
            return true;

        } catch (error) {
            console.error('❌ Error marking notification as read:', error);
            return false;
        }
    }

    // Send bulk notifications to multiple users
    async sendBulkNotification(userIds, notification) {
        try {
            const notifications = userIds.map(userId => ({
                ...notification,
                user_id: userId
            }));

            const { error } = await this.supabase
                .from('notifications')
                .insert(notifications);

            if (error) throw error;

            console.log(`✅ Bulk notification sent to ${userIds.length} users`);
            return true;

        } catch (error) {
            console.error('❌ Error sending bulk notification:', error);
            return false;
        }
    }

    // Real-time notification listener using your existing table
    setupRealtimeNotifications(userId, onNotificationReceived) {
        try {
            const subscription = this.supabase
                .channel(`notifications:user_id=eq.${userId}`)
                .on('postgres_changes', 
                    { 
                        event: 'INSERT', 
                        schema: 'public', 
                        table: 'notifications',
                        filter: `user_id=eq.${userId}`
                    },
                    (payload) => {
                        console.log('📱 New notification received:', payload.new);
                        if (onNotificationReceived) {
                            onNotificationReceived(payload.new);
                        }
                    }
                )
                .subscribe();

            console.log('📡 Real-time notifications enabled for user:', userId);
            return subscription;

        } catch (error) {
            console.error('❌ Error setting up real-time notifications:', error);
            return null;
        }
    }
}

// Usage examples:

// Initialize with your existing Supabase client
const notificationEnhancer = new ExistingNotificationEnhancer(supabase);

// Example: Send ASAP alert
async function sendASAPAlert(customerId, tripId) {
    await notificationEnhancer.sendASAPTripAlert(customerId, {
        id: tripId,
        estimatedArrival: 15,
        driverName: 'Ahmed',
        driverPhone: '+972-50-123-4567'
    });
}

// Example: Send driver bonus notification
async function sendDriverBonus(driverId) {
    await notificationEnhancer.sendDriverStatusNotification(driverId, 'asap_bonus', {
        bonus: 50,
        timeLimit: 30
    });
}

// Example: Update trip status with notification
async function updateTripWithNotification(tripId, status) {
    // Update trip in database
    await supabase
        .from('trip_requests')
        .update({ status: status })
        .eq('id', tripId);
    
    // Send notification
    await notificationEnhancer.sendTripStatusUpdate(tripId, status);
}

// Example: Set up real-time notifications in your apps
function enableRealTimeNotifications(userId) {
    notificationEnhancer.setupRealtimeNotifications(userId, (notification) => {
        // Show notification in your app UI
        showInAppNotification(notification);
        
        // Play sound for important notifications
        if (notification.type === 'asap_update') {
            playNotificationSound();
        }
    });
}

// Example: Get notification history for user profile
async function loadNotificationHistory(userId) {
    const notifications = await notificationEnhancer.getNotificationHistory(userId);
    displayNotificationsInUI(notifications);
}

// Export for use in your apps
if (typeof module !== 'undefined') {
    module.exports = ExistingNotificationEnhancer;
}
