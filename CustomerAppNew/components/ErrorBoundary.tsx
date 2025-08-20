import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // In production, you would send this to a crash reporting service
    // Example: Crashlytics.recordError(error);
  }

  handleRestart = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReportError = () => {
    const errorMessage = this.state.error?.message || 'Unknown error';
    const errorStack = this.state.error?.stack || 'No stack trace';
    
    Alert.alert(
      'Report Error',
      'Would you like to report this error to help us improve the app?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          onPress: () => {
            // In production, send error to your error reporting service
            console.log('Error reported:', { errorMessage, errorStack });
            Alert.alert('Thank You', 'Error report sent successfully!');
          },
        },
      ]
    );
  };

  render() {
    if (this.state.hasError) {
      return (
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.container}
        >
          <View style={styles.content}>
            <Text style={styles.title}>Oops! Something went wrong</Text>
            <Text style={styles.subtitle}>
              We're sorry for the inconvenience. The app encountered an unexpected error.
            </Text>
            
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={this.handleRestart}
            >
              <Text style={styles.primaryButtonText}>Restart App</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={this.handleReportError}
            >
              <Text style={styles.secondaryButtonText}>Report Error</Text>
            </TouchableOpacity>
            
            {__DEV__ && (
              <View style={styles.debugContainer}>
                <Text style={styles.debugTitle}>Debug Info:</Text>
                <Text style={styles.debugText}>
                  {this.state.error?.message}
                </Text>
              </View>
            )}
          </View>
        </LinearGradient>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    maxWidth: 300,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#f0f0f0',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  primaryButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 16,
    width: '100%',
  },
  primaryButtonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#ffffff',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
    width: '100%',
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  debugContainer: {
    marginTop: 32,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    width: '100%',
  },
  debugTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  debugText: {
    color: '#f0f0f0',
    fontSize: 12,
    fontFamily: 'monospace',
  },
});
