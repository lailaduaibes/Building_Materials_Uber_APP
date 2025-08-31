// ADD THESE ANALYTICS FUNCTIONS TO YOUR EXISTING admin-dashboard-proper.html
// Just copy-paste this JavaScript into your existing dashboard

// Enhanced Analytics Functions for Your Existing Dashboard
async function loadAnalyticsMetrics() {
    try {
        // Get comprehensive trip statistics
        const { data: tripStats, error: tripError } = await supabase
            .from('trip_requests')
            .select('*');

        if (tripError) throw tripError;

        // Calculate metrics from your existing data
        const completedTrips = tripStats.filter(t => t.status === 'delivered');
        const asapTrips = tripStats.filter(t => t.pickup_time_preference === 'asap');
        const todayTrips = tripStats.filter(t => 
            new Date(t.created_at).toDateString() === new Date().toDateString()
        );

        // Calculate revenue (handle null values)
        const totalRevenue = completedTrips.reduce((sum, trip) => {
            const price = parseFloat(trip.final_price) || parseFloat(trip.quoted_price) || 0;
            return sum + price;
        }, 0);

        const asapRevenue = asapTrips.reduce((sum, trip) => {
            if (trip.status === 'delivered') {
                const price = parseFloat(trip.final_price) || parseFloat(trip.quoted_price) || 0;
                return sum + price;
            }
            return sum;
        }, 0);

        // Update your existing dashboard with new metrics
        updateAnalyticsCards({
            totalTrips: tripStats.length,
            completedTrips: completedTrips.length,
            asapTrips: asapTrips.length,
            todayTrips: todayTrips.length,
            totalRevenue: totalRevenue,
            asapRevenue: asapRevenue,
            avgTripValue: completedTrips.length > 0 ? totalRevenue / completedTrips.length : 0
        });

        console.log('📊 Analytics loaded:', {
            totalTrips: tripStats.length,
            totalRevenue: totalRevenue,
            asapTrips: asapTrips.length
        });

    } catch (error) {
        console.error('❌ Error loading analytics:', error);
    }
}

function updateAnalyticsCards(metrics) {
    // Add these cards to your existing dashboard HTML (after driver stats)
    const analyticsHTML = `
        <div class="analytics-section" style="margin-top: 2rem;">
            <h3 style="color: var(--primary-blue); margin-bottom: 1rem;">📊 Business Analytics</h3>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number">₪${metrics.totalRevenue.toLocaleString()}</div>
                    <div class="stat-label">Total Revenue</div>
                    <div class="stat-change positive">+${((metrics.asapRevenue / metrics.totalRevenue) * 100).toFixed(1)}% ASAP</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-number">${metrics.totalTrips}</div>
                    <div class="stat-label">Total Trips</div>
                    <div class="stat-change">${metrics.completedTrips} completed</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-number">₪${metrics.avgTripValue.toFixed(0)}</div>
                    <div class="stat-label">Avg Trip Value</div>
                    <div class="stat-change positive">Per delivery</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-number">${metrics.asapTrips}</div>
                    <div class="stat-label">ASAP Trips</div>
                    <div class="stat-change positive">₪${metrics.asapRevenue.toLocaleString()} revenue</div>
                </div>
            </div>
        </div>
    `;
    
    // Insert after your existing stats section
    const dashboardContent = document.getElementById('dashboardContent') || document.querySelector('.dashboard-content');
    if (dashboardContent) {
        const analyticsSection = document.createElement('div');
        analyticsSection.innerHTML = analyticsHTML;
        dashboardContent.appendChild(analyticsSection);
    }
}

// Enhanced notifications for your existing system
async function sendDriverApprovalNotification(driverId, approved) {
    try {
        // Get driver info
        const { data: driver } = await supabase
            .from('driver_profiles')
            .select('user_id, first_name, last_name')
            .eq('id', driverId)
            .single();

        if (!driver) return;

        // Use your existing notifications table structure
        const notification = {
            user_id: driver.user_id,
            title: approved ? '🎉 Application Approved!' : '❌ Application Status Update',
            message: approved 
                ? `Congratulations ${driver.first_name}! Your driver application has been approved. You can now start accepting delivery requests.`
                : `Hi ${driver.first_name}, your driver application needs additional review. Please contact support for details.`,
            type: 'system',
            data: {
                driver_id: driverId,
                approval_status: approved ? 'approved' : 'rejected',
                action_type: 'driver_approval'
            }
        };

        // Insert into your existing notifications table
        const { error } = await supabase
            .from('notifications')
            .insert(notification);

        if (error) throw error;

        console.log(`✅ Approval notification sent to ${driver.first_name}`);
        
        // Show success message in dashboard
        showNotificationSuccess(`Notification sent to ${driver.first_name} ${driver.last_name}`);

    } catch (error) {
        console.error('❌ Error sending approval notification:', error);
        showNotificationError('Failed to send notification');
    }
}

// Add notification status indicators
function showNotificationSuccess(message) {
    const alert = document.createElement('div');
    alert.className = 'alert alert-success';
    alert.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 1000;
        background: #10B981; color: white; padding: 1rem 1.5rem;
        border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    alert.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    document.body.appendChild(alert);
    
    setTimeout(() => alert.remove(), 4000);
}

function showNotificationError(message) {
    const alert = document.createElement('div');
    alert.className = 'alert alert-error';
    alert.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 1000;
        background: #dc3545; color: white; padding: 1rem 1.5rem;
        border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    alert.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
    document.body.appendChild(alert);
    
    setTimeout(() => alert.remove(), 4000);
}

// Fix the driver statistics query (is_online doesn't exist)
async function loadDriverMetricsFixed() {
    try {
        // Use existing columns from your driver_profiles table
        const { data: drivers, error } = await supabase
            .from('driver_profiles')
            .select('approval_status, is_available, last_seen, user_id');

        if (error) throw error;

        const totalDrivers = drivers.length;
        const approvedDrivers = drivers.filter(d => d.approval_status === 'approved').length;
        const pendingDrivers = drivers.filter(d => d.approval_status === 'pending').length;
        
        // Consider drivers as "online" if they were seen in last hour and are available
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const onlineDrivers = drivers.filter(d => 
            d.is_available && 
            d.last_seen && 
            new Date(d.last_seen) > oneHourAgo
        ).length;

        // Update your existing dashboard
        updateDriverStats({
            total: totalDrivers,
            approved: approvedDrivers,
            pending: pendingDrivers,
            online: onlineDrivers
        });

        console.log('👥 Driver metrics loaded:', {
            total: totalDrivers,
            approved: approvedDrivers,
            online: onlineDrivers
        });

    } catch (error) {
        console.error('❌ Error loading driver metrics:', error);
    }
}

// Call these functions when your dashboard loads
document.addEventListener('DOMContentLoaded', function() {
    // Add to your existing initialization
    loadAnalyticsMetrics();
    loadDriverMetricsFixed();
    
    // Refresh every 30 seconds
    setInterval(() => {
        loadAnalyticsMetrics();
        loadDriverMetricsFixed();
    }, 30000);
});
