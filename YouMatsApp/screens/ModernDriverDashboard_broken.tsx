// BROKEN FILE - MOVED TO BACKUP
// This file had corruption issues and has been backed up
// The app now uses ProfessionalDriverDashboard exclusively

import React from 'react';
import { View, Text } from 'react-native';

interface ModernDriverDashboardProps {
  onNavigateToProfile: () => void;
  onNavigateToOrder: (order: any) => void;
  onNavigateToEarnings: () => void;
  onNavigateToTripHistory: () => void;
}

const ModernDriverDashboard: React.FC<ModernDriverDashboardProps> = () => {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>ModernDriverDashboard is temporarily disabled due to corruption.</Text>
      <Text>Please use the Professional Dashboard.</Text>
    </View>
  );
};

export default ModernDriverDashboard;
