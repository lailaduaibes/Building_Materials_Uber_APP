import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { driverService, ApprovalStatus } from '../services/DriverService';

interface DriverApprovalBannerProps {
  onApprovalStatusChange?: (status: ApprovalStatus) => void;
}

export const DriverApprovalBanner: React.FC<DriverApprovalBannerProps> = ({
  onApprovalStatusChange,
}) => {
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApprovalStatus();
  }, []);

  const loadApprovalStatus = async () => {
    try {
      setLoading(true);
      const status = await driverService.checkDriverApprovalStatus();
      setApprovalStatus(status);
      onApprovalStatusChange?.(status);
    } catch (error) {
      console.error('Error loading approval status:', error);
      setApprovalStatus({
        canPickTrips: false,
        status: 'pending',
        message: 'Unable to check approval status',
        isApproved: false
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = () => {
    switch (approvalStatus?.status) {
      case 'approved':
        return '#34C759';
      case 'rejected':
        return '#FF3B30';
      case 'under_review':
        return '#FF9500';
      default:
        return '#007AFF';
    }
  };

  const getStatusIcon = () => {
    switch (approvalStatus?.status) {
      case 'approved':
        return 'checkmark-circle';
      case 'rejected':
        return 'close-circle';
      case 'under_review':
        return 'time';
      default:
        return 'hourglass';
    }
  };

  const handleContactSupport = () => {
    Alert.alert(
      'Contact Support',
      'Need help with your driver application?',
      [
        { text: 'Call Support', onPress: () => console.log('Call support') },
        { text: 'Email Support', onPress: () => console.log('Email support') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingBanner}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.loadingText}>Checking approval status...</Text>
      </View>
    );
  }

  if (!approvalStatus) {
    return null;
  }

  // Don't show banner if approved (they can see regular dashboard)
  if (approvalStatus.canPickTrips) {
    return null;
  }

  return (
    <View style={[styles.banner, { backgroundColor: getStatusColor() + '15' }]}>
      <View style={styles.statusHeader}>
        <Ionicons 
          name={getStatusIcon()} 
          size={24} 
          color={getStatusColor()} 
          style={styles.statusIcon}
        />
        <Text style={[styles.statusTitle, { color: getStatusColor() }]}>
          {approvalStatus.status.toUpperCase()}
        </Text>
      </View>
      
      <Text style={styles.statusMessage}>
        {approvalStatus.message}
      </Text>

      {approvalStatus.status === 'pending' && (
        <View style={styles.pendingInfo}>
          <Text style={styles.pendingText}>
            We're reviewing your application. You'll be notified once approved.
          </Text>
        </View>
      )}

      {approvalStatus.status === 'rejected' && (
        <TouchableOpacity 
          style={styles.supportButton} 
          onPress={handleContactSupport}
        >
          <Text style={styles.supportButtonText}>Contact Support</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity 
        style={styles.refreshButton} 
        onPress={loadApprovalStatus}
      >
        <Ionicons name="refresh" size={16} color="#007AFF" />
        <Text style={styles.refreshText}>Refresh Status</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusIcon: {
    marginRight: 8,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusMessage: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
    marginBottom: 16,
  },
  pendingInfo: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  pendingText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  supportButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
  },
  supportButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  refreshText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#007AFF',
  },
  loadingBanner: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    alignItems: 'center',
    flexDirection: 'row',
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
});
