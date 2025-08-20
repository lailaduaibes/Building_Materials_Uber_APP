/**
 * Simple CustomerApp for debugging
 */

import React from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  Text,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';

const SimpleCustomerApp: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2c3e50" />
      <ExpoStatusBar style="light" />
      <View style={styles.content}>
        <Text style={styles.title}>BuildMate Customer</Text>
        <Text style={styles.subtitle}>Testing Connection...</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2c3e50',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ecf0f1',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#bdc3c7',
    textAlign: 'center',
  },
});

export default SimpleCustomerApp;
