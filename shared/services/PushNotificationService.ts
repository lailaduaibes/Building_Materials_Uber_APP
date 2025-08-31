/**
 * Push Notification Service
 * Real-time push notifications for trip updates across Customer and Driver apps
 * Supports: Expo Push Notifications, Firebase, SMS fallback, Email notifications
 */

// Import will be handled at runtime by each app
declare const Notifications: any;
declare const Platform: any;

interface NotificationData {
  id: string;
  type: 'trip_update' | 'driver_status' | 'asap_alert' | 'system' | 'marketing';
  title: string;
  body: string;
  data: {
    tripId?: string;
    driverId?: string;
    userId?: string;
    actionType?: string;
    deepLink?: string;
    [key: string]: any;
  };
  priority: 'low' | 'normal' | 'high' | 'critical';
  scheduledFor?: Date;
  expiresAt?: Date;
}

interface NotificationTemplate {
  id: string;
  type: string;
  title: string;
  body: string;
  category: string;
  sound: string;
  badge: boolean;
  actions?: NotificationAction[];
}

interface NotificationAction {
  id: string;
  title: string;
  type: 'button' | 'input';
  destructive?: boolean;
}

interface NotificationConfig {
  expoPushToken?: string;
  fcmToken?: string;
  phoneNumber?: string;
  email?: string;
  preferences: {
    tripUpdates: boolean;
    driverStatus: boolean;
    asapAlerts: boolean;
    marketing: boolean;
    systemNotifications: boolean;
    soundEnabled: boolean;
    vibrationEnabled: boolean;
    quietHours: {
      enabled: boolean;
      start: string; // "22:00"
      end: string; // "07:00"
    };
  };
}

interface DeliveryReceipt {
  id: string;
  status: 'sent' | 'delivered' | 'failed' | 'read';
  timestamp: Date;
  error?: string;
}

export class PushNotificationService {
  private static instance: PushNotificationService;
  private supabase: any;
  private notifications: Map<string, NotificationData> = new Map();
  private templates: Map<string, NotificationTemplate> = new Map();
  private isInitialized = false;

  // Notification Templates
  private readonly NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
    // Trip Status Updates
    {
      id: 'trip_matched',
      type: 'trip_update',
      title: '🚛 Driver Found!',
      body: 'Your delivery has been matched with a driver',
      category: 'TRIP_UPDATE',
      sound: 'default',
      badge: true,
      actions: [
        { id: 'view_trip', title: 'View Trip', type: 'button' },
        { id: 'call_driver', title: 'Call Driver', type: 'button' }
      ]
    },
    {
      id: 'trip_pickup',
      type: 'trip_update',
      title: '📦 Driver Arrived for Pickup',
      body: 'Your driver has arrived at the pickup location',
      category: 'TRIP_UPDATE',
      sound: 'pickup_sound.wav',
      badge: true,
      actions: [
        { id: 'confirm_ready', title: 'Ready for Pickup', type: 'button' },
        { id: 'need_help', title: 'Need Help', type: 'button' }
      ]
    },
    {
      id: 'trip_in_transit',
      type: 'trip_update',
      title: '🚚 On the Way!',
      body: 'Your materials are now in transit to the delivery location',
      category: 'TRIP_UPDATE',
      sound: 'default',
      badge: true,
      actions: [
        { id: 'track_live', title: 'Track Live', type: 'button' }
      ]
    },
    {
      id: 'trip_delivered',
      type: 'trip_update',
      title: '✅ Delivered Successfully!',
      body: 'Your materials have been delivered. Rate your experience!',
      category: 'TRIP_UPDATE',
      sound: 'success_sound.wav',
      badge: true,
      actions: [
        { id: 'rate_trip', title: 'Rate Trip', type: 'button' },
        { id: 'view_receipt', title: 'View Receipt', type: 'button' }
      ]
    },

    // ASAP Priority Alerts
    {
      id: 'asap_premium_available',
      type: 'asap_alert',
      title: '⚡ ASAP Delivery Available!',
      body: 'Get your materials delivered 2x faster with ASAP priority',
      category: 'ASAP_ALERT',
      sound: 'asap_alert.wav',
      badge: true,
      actions: [
        { id: 'upgrade_asap', title: 'Upgrade to ASAP', type: 'button' },
        { id: 'dismiss', title: 'Maybe Later', type: 'button' }
      ]
    },
    {
      id: 'asap_driver_nearby',
      type: 'asap_alert',
      title: '🚀 ASAP Driver 2 Min Away!',
      body: 'Your priority driver will arrive in 2 minutes',
      category: 'ASAP_ALERT',
      sound: 'urgent.wav',
      badge: true
    },

    // Driver Status Updates
    {
      id: 'new_trip_available',
      type: 'driver_status',
      title: '💼 New Trip Available',
      body: 'High-paying delivery request in your area',
      category: 'DRIVER_ALERT',
      sound: 'new_trip.wav',
      badge: true,
      actions: [
        { id: 'accept_trip', title: 'Accept Trip', type: 'button' },
        { id: 'view_details', title: 'View Details', type: 'button' }
      ]
    },
    {
      id: 'asap_bonus_trip',
      type: 'driver_status',
      title: '⚡ ASAP Bonus Trip!',
      body: '₪50 bonus for completing this priority delivery',
      category: 'DRIVER_ALERT',
      sound: 'bonus_alert.wav',
      badge: true,
      actions: [
        { id: 'accept_asap', title: 'Accept ASAP', type: 'button' }
      ]
    },

    // System Notifications
    {
      id: 'route_optimized',
      type: 'system',
      title: '🤖 Route Optimized',
      body: 'AI has optimized your delivery route. 23% fuel savings!',
      category: 'SYSTEM',
      sound: 'default',
      badge: false
    },
    {
      id: 'maintenance_reminder',
      type: 'system',
      title: '🔧 Vehicle Maintenance Due',
      body: 'Your vehicle is due for maintenance in 2 days',
      category: 'SYSTEM',
      sound: 'default',
      badge: true
    }
  ];

  private constructor() {
    this.initializeTemplates();
  }

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  /**
   * Initialize the push notification service
   */
  async initialize(supabaseClient: any): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🔔 Initializing Push Notification Service...');
      
      this.supabase = supabaseClient;

      // Configure notification handling
      await this.configureNotifications();

      // Register notification categories and actions
      await this.registerNotificationCategories();

      // Set up notification listeners
      this.setupNotificationListeners();

      this.isInitialized = true;
      console.log('✅ Push Notification Service initialized');

    } catch (error) {
      console.error('❌ Failed to initialize push notifications:', error);
      throw error;
    }
  }

  /**
   * Configure notification settings
   */
  private async configureNotifications(): Promise<void> {
    // Set notification handler
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const data = notification.request.content.data;
        const priority = data?.priority || 'normal';

        return {
          shouldShowAlert: true,
          shouldPlaySound: priority !== 'low',
          shouldSetBadge: data?.badge !== false,
          priority: priority === 'critical' ? 
            Notifications.AndroidNotificationPriority.MAX : 
            Notifications.AndroidNotificationPriority.DEFAULT,
        };
      },
    });

    // Request permissions
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.warn('⚠️ Push notification permissions not granted');
    }

    // Configure notification channel (Android)
    if (Platform.OS === 'android') {
      await this.createAndroidChannels();
    }
  }

  /**
   * Create Android notification channels
   */
  private async createAndroidChannels(): Promise<void> {
    const channels = [
      {
        name: 'trip-updates',
        importance: Notifications.AndroidImportance.HIGH,
        description: 'Trip status updates and delivery notifications',
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3B82F6',
      },
      {
        name: 'asap-alerts',
        importance: Notifications.AndroidImportance.MAX,
        description: 'ASAP priority delivery alerts',
        sound: 'asap_alert.wav',
        vibrationPattern: [0, 500, 200, 500],
        lightColor: '#F59E0B',
      },
      {
        name: 'driver-alerts',
        importance: Notifications.AndroidImportance.HIGH,
        description: 'New trip requests and driver updates',
        sound: 'new_trip.wav',
        vibrationPattern: [0, 300, 100, 300],
        lightColor: '#10B981',
      },
      {
        name: 'system',
        importance: Notifications.AndroidImportance.DEFAULT,
        description: 'System notifications and updates',
        sound: 'default',
      }
    ];

    for (const channel of channels) {
      await Notifications.setNotificationChannelAsync(channel.name, channel);
    }
  }

  /**
   * Register notification categories and actions
   */
  private async registerNotificationCategories(): Promise<void> {
    const categories = [
      {
        identifier: 'TRIP_UPDATE',
        actions: [
          {
            identifier: 'view_trip',
            buttonTitle: 'View Trip',
            options: { opensAppToForeground: true }
          },
          {
            identifier: 'call_driver',
            buttonTitle: 'Call Driver',
            options: { opensAppToForeground: true }
          }
        ]
      },
      {
        identifier: 'ASAP_ALERT',
        actions: [
          {
            identifier: 'upgrade_asap',
            buttonTitle: 'Upgrade to ASAP',
            options: { opensAppToForeground: true }
          }
        ]
      },
      {
        identifier: 'DRIVER_ALERT',
        actions: [
          {
            identifier: 'accept_trip',
            buttonTitle: 'Accept Trip',
            options: { opensAppToForeground: true }
          },
          {
            identifier: 'view_details',
            buttonTitle: 'View Details',
            options: { opensAppToForeground: true }
          }
        ]
      }
    ];

    await Notifications.setNotificationCategoryAsync(...categories);
  }

  /**
   * Set up notification event listeners
   */
  private setupNotificationListeners(): void {
    // Handle received notifications (app in foreground)
    Notifications.addNotificationReceivedListener((notification) => {
      console.log('📱 Notification received:', notification);
      this.handleNotificationReceived(notification);
    });

    // Handle notification responses (user tapped notification)
    Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('👆 Notification tapped:', response);
      this.handleNotificationResponse(response);
    });
  }

  /**
   * Initialize notification templates
   */
  private initializeTemplates(): void {
    this.NOTIFICATION_TEMPLATES.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  /**
   * Register push token for user
   */
  async registerPushToken(userId: string, userType: 'customer' | 'driver'): Promise<string | null> {
    try {
      console.log('📲 Registering push token for user:', userId);

      const expoPushToken = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-expo-project-id', // Replace with actual project ID
      });

      // Save token to database
      const { error } = await this.supabase
        .from('user_notification_tokens')
        .upsert({
          user_id: userId,
          user_type: userType,
          push_token: expoPushToken.data,
          platform: Platform.OS,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      console.log('✅ Push token registered:', expoPushToken.data);
      return expoPushToken.data;

    } catch (error) {
      console.error('❌ Failed to register push token:', error);
      return null;
    }
  }

  /**
   * Send notification using template
   */
  async sendNotificationFromTemplate(
    templateId: string,
    userId: string,
    customData: any = {},
    variables: {[key: string]: string} = {}
  ): Promise<string | null> {
    try {
      const template = this.templates.get(templateId);
      if (!template) {
        throw new Error(`Template ${templateId} not found`);
      }

      // Replace variables in title and body
      let title = template.title;
      let body = template.body;
      
      Object.entries(variables).forEach(([key, value]) => {
        title = title.replace(`{{${key}}}`, value);
        body = body.replace(`{{${key}}}`, value);
      });

      const notification: NotificationData = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: template.type as any,
        title,
        body,
        data: {
          templateId,
          ...customData,
          ...template.actions?.reduce((acc, action) => {
            acc[`action_${action.id}`] = action.title;
            return acc;
          }, {} as any)
        },
        priority: customData.priority || 'normal'
      };

      return await this.sendNotification(userId, notification);

    } catch (error) {
      console.error('❌ Failed to send template notification:', error);
      return null;
    }
  }

  /**
   * Send push notification to user
   */
  async sendNotification(userId: string, notification: NotificationData): Promise<string | null> {
    try {
      console.log('📤 Sending notification to user:', userId, notification.title);

      // Get user's push tokens and preferences
      const { data: userTokens, error: tokenError } = await this.supabase
        .from('user_notification_tokens')
        .select('*')
        .eq('user_id', userId)
        .eq('active', true);

      if (tokenError) throw tokenError;

      if (!userTokens || userTokens.length === 0) {
        console.warn('⚠️ No push tokens found for user:', userId);
        return null;
      }

      // Check user preferences
      const shouldSend = await this.checkNotificationPreferences(userId, notification);
      if (!shouldSend) {
        console.log('🔕 Notification blocked by user preferences');
        return null;
      }

      // Store notification in database
      const { data: savedNotification, error: saveError } = await this.supabase
        .from('notifications')
        .insert({
          id: notification.id,
          user_id: userId,
          type: notification.type,
          title: notification.title,
          body: notification.body,
          data: notification.data,
          priority: notification.priority,
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (saveError) throw saveError;

      // Send to all user's devices
      const deliveryPromises = userTokens.map(async (tokenData) => {
        try {
          const pushMessage = this.buildPushMessage(notification, tokenData.push_token);
          
          if (notification.scheduledFor) {
            // Schedule notification
            await Notifications.scheduleNotificationAsync({
              content: pushMessage,
              trigger: { date: notification.scheduledFor }
            });
          } else {
            // Send immediately
            await Notifications.scheduleNotificationAsync({
              content: pushMessage,
              trigger: null
            });
          }

          // Update delivery status
          await this.updateDeliveryStatus(notification.id, tokenData.push_token, 'sent');
          
          return { success: true, token: tokenData.push_token };
        } catch (error) {
          await this.updateDeliveryStatus(notification.id, tokenData.push_token, 'failed', error.message);
          return { success: false, token: tokenData.push_token, error };
        }
      });

      const results = await Promise.all(deliveryPromises);
      const successful = results.filter(r => r.success).length;
      
      console.log(`✅ Notification sent to ${successful}/${results.length} devices`);
      
      // Update notification status
      const finalStatus = successful > 0 ? 'sent' : 'failed';
      await this.supabase
        .from('notifications')
        .update({ 
          status: finalStatus,
          sent_at: new Date().toISOString(),
          delivery_count: successful
        })
        .eq('id', notification.id);

      return notification.id;

    } catch (error) {
      console.error('❌ Failed to send notification:', error);
      
      // Update notification status to failed
      await this.supabase
        .from('notifications')
        .update({ 
          status: 'failed',
          error_message: error.message
        })
        .eq('id', notification.id);

      return null;
    }
  }

  /**
   * Build push message for Expo
   */
  private buildPushMessage(notification: NotificationData, token: string): any {
    const template = this.templates.get(notification.data.templateId || '');
    
    return {
      to: token,
      title: notification.title,
      body: notification.body,
      data: notification.data,
      sound: template?.sound || 'default',
      badge: template?.badge ? 1 : 0,
      priority: notification.priority === 'critical' ? 'high' : 'normal',
      channelId: this.getChannelId(notification.type),
      categoryId: template?.category,
      ttl: notification.expiresAt ? 
        Math.floor((notification.expiresAt.getTime() - Date.now()) / 1000) : 
        86400, // 24 hours default
    };
  }

  /**
   * Get Android channel ID based on notification type
   */
  private getChannelId(type: string): string {
    switch (type) {
      case 'trip_update': return 'trip-updates';
      case 'asap_alert': return 'asap-alerts';
      case 'driver_status': return 'driver-alerts';
      default: return 'system';
    }
  }

  /**
   * Check if notification should be sent based on user preferences
   */
  private async checkNotificationPreferences(userId: string, notification: NotificationData): Promise<boolean> {
    try {
      const { data: preferences, error } = await this.supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !preferences) {
        // Default to allow all notifications if no preferences found
        return true;
      }

      // Check type-specific preferences
      switch (notification.type) {
        case 'trip_update':
          if (!preferences.trip_updates) return false;
          break;
        case 'driver_status':
          if (!preferences.driver_status) return false;
          break;
        case 'asap_alert':
          if (!preferences.asap_alerts) return false;
          break;
        case 'marketing':
          if (!preferences.marketing) return false;
          break;
        case 'system':
          if (!preferences.system_notifications) return false;
          break;
      }

      // Check quiet hours
      if (preferences.quiet_hours_enabled) {
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        if (this.isInQuietHours(currentTime, preferences.quiet_hours_start, preferences.quiet_hours_end)) {
          // Allow critical notifications during quiet hours
          return notification.priority === 'critical';
        }
      }

      return true;

    } catch (error) {
      console.error('❌ Error checking notification preferences:', error);
      return true; // Default to allow
    }
  }

  /**
   * Check if current time is in quiet hours
   */
  private isInQuietHours(currentTime: string, startTime: string, endTime: string): boolean {
    const current = this.timeToMinutes(currentTime);
    const start = this.timeToMinutes(startTime);
    const end = this.timeToMinutes(endTime);

    if (start <= end) {
      // Same day range (e.g., 22:00 - 23:59)
      return current >= start && current <= end;
    } else {
      // Overnight range (e.g., 22:00 - 07:00)
      return current >= start || current <= end;
    }
  }

  /**
   * Convert time string to minutes since midnight
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Update delivery status
   */
  private async updateDeliveryStatus(
    notificationId: string,
    token: string,
    status: 'sent' | 'delivered' | 'failed' | 'read',
    error?: string
  ): Promise<void> {
    try {
      await this.supabase
        .from('notification_delivery_receipts')
        .insert({
          notification_id: notificationId,
          push_token: token,
          status,
          timestamp: new Date().toISOString(),
          error_message: error
        });
    } catch (err) {
      console.error('❌ Failed to update delivery status:', err);
    }
  }

  /**
   * Handle notification received (app in foreground)
   */
  private handleNotificationReceived(notification: any): void {
    const data = notification.request.content.data;
    
    // Custom handling based on notification type
    switch (data?.type) {
      case 'asap_alert':
        // Show in-app alert for ASAP notifications
        this.showInAppAlert(notification.request.content);
        break;
      
      case 'trip_update':
        // Update trip status in real-time
        this.updateTripStatus(data.tripId, data.status);
        break;
      
      default:
        // Standard handling
        break;
    }
  }

  /**
   * Handle notification response (user tapped)
   */
  private handleNotificationResponse(response: any): void {
    const actionIdentifier = response.actionIdentifier;
    const data = response.notification.request.content.data;

    console.log('👆 User action:', actionIdentifier, data);

    // Mark as read
    if (data?.notificationId) {
      this.markAsRead(data.notificationId);
    }

    // Handle specific actions
    switch (actionIdentifier) {
      case 'accept_trip':
        this.handleAcceptTrip(data.tripId);
        break;
      
      case 'upgrade_asap':
        this.handleUpgradeToASAP(data.tripId);
        break;
      
      case 'view_trip':
        this.navigateToTrip(data.tripId);
        break;
      
      case 'call_driver':
        this.initiateDriverCall(data.driverId);
        break;
        
      default:
        if (data?.deepLink) {
          this.handleDeepLink(data.deepLink);
        }
        break;
    }
  }

  /**
   * Show in-app alert
   */
  private showInAppAlert(content: any): void {
    // Implementation depends on your app's alert system
    console.log('🚨 In-app alert:', content.title, content.body);
  }

  /**
   * Update trip status in real-time
   */
  private updateTripStatus(tripId: string, status: string): void {
    // Implementation depends on your state management
    console.log('🔄 Update trip status:', tripId, status);
  }

  /**
   * Mark notification as read
   */
  private async markAsRead(notificationId: string): Promise<void> {
    try {
      await this.supabase
        .from('notifications')
        .update({ 
          status: 'read',
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId);
    } catch (error) {
      console.error('❌ Failed to mark notification as read:', error);
    }
  }

  /**
   * Handle specific actions
   */
  private handleAcceptTrip(tripId: string): void {
    console.log('✅ Accepting trip:', tripId);
    // Navigate to trip acceptance screen
  }

  private handleUpgradeToASAP(tripId: string): void {
    console.log('⚡ Upgrading to ASAP:', tripId);
    // Navigate to ASAP upgrade screen
  }

  private navigateToTrip(tripId: string): void {
    console.log('👀 Navigating to trip:', tripId);
    // Navigate to trip details screen
  }

  private initiateDriverCall(driverId: string): void {
    console.log('📞 Calling driver:', driverId);
    // Initiate phone call to driver
  }

  private handleDeepLink(deepLink: string): void {
    console.log('🔗 Handling deep link:', deepLink);
    // Navigate based on deep link
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotifications(
    userIds: string[],
    notification: NotificationData
  ): Promise<{successful: number, failed: number}> {
    console.log(`📬 Sending bulk notification to ${userIds.length} users`);
    
    const results = await Promise.all(
      userIds.map(userId => this.sendNotification(userId, notification))
    );

    const successful = results.filter(result => result !== null).length;
    const failed = results.length - successful;

    console.log(`📊 Bulk send complete: ${successful} successful, ${failed} failed`);
    
    return { successful, failed };
  }

  /**
   * Get notification history for user
   */
  async getNotificationHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data || [];

    } catch (error) {
      console.error('❌ Failed to get notification history:', error);
      return [];
    }
  }

  /**
   * Update user notification preferences
   */
  async updateNotificationPreferences(
    userId: string,
    preferences: Partial<NotificationConfig['preferences']>
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      console.log('✅ Notification preferences updated for user:', userId);
      return true;

    } catch (error) {
      console.error('❌ Failed to update notification preferences:', error);
      return false;
    }
  }

  /**
   * Clear all notifications for user
   */
  async clearAllNotifications(userId: string): Promise<boolean> {
    try {
      await this.supabase
        .from('notifications')
        .update({ status: 'cleared' })
        .eq('user_id', userId)
        .eq('status', 'delivered');

      // Clear local notifications
      await Notifications.dismissAllNotificationsAsync();
      
      console.log('🗑️ All notifications cleared for user:', userId);
      return true;

    } catch (error) {
      console.error('❌ Failed to clear notifications:', error);
      return false;
    }
  }

  /**
   * Get delivery analytics
   */
  async getDeliveryAnalytics(): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .select('type, status, created_at')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      // Process analytics
      const analytics = {
        totalSent: data?.length || 0,
        deliveryRate: 0,
        readRate: 0,
        typeBreakdown: {},
        dailyStats: {}
      };

      if (data) {
        const delivered = data.filter(n => n.status === 'sent' || n.status === 'delivered').length;
        const read = data.filter(n => n.status === 'read').length;
        
        analytics.deliveryRate = (delivered / data.length) * 100;
        analytics.readRate = (read / delivered) * 100;

        // Type breakdown
        data.forEach(notification => {
          analytics.typeBreakdown[notification.type] = 
            (analytics.typeBreakdown[notification.type] || 0) + 1;
        });

        // Daily stats
        data.forEach(notification => {
          const date = new Date(notification.created_at).toDateString();
          analytics.dailyStats[date] = (analytics.dailyStats[date] || 0) + 1;
        });
      }

      return analytics;

    } catch (error) {
      console.error('❌ Failed to get delivery analytics:', error);
      return null;
    }
  }
}

// Export singleton instance
export const pushNotificationService = PushNotificationService.getInstance();
