/**
 * YouMats Screen Container Component
 * Standard screen layout with consistent padding and background
 */

import React from 'react';
import {
  View,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  ViewStyle,
  StatusBar,
  Platform,
} from 'react-native';
import { Theme } from '../theme';

export interface ScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
  scrollable?: boolean;
  safeArea?: boolean;
  backgroundColor?: 'primary' | 'secondary';
  statusBarStyle?: 'light-content' | 'dark-content';
  padding?: boolean;
}

const Screen: React.FC<ScreenProps> = ({
  children,
  style,
  scrollable = false,
  safeArea = true,
  backgroundColor = 'primary',
  statusBarStyle = 'dark-content',
  padding = true,
}) => {
  const screenStyle = backgroundColor === 'secondary'
    ? Theme.components.screen.secondary
    : Theme.components.screen.default;

  const contentStyle = {
    ...screenStyle,
    paddingHorizontal: padding ? screenStyle.paddingHorizontal : 0,
    paddingVertical: padding ? screenStyle.paddingVertical : 0,
  };

  const Container = safeArea ? SafeAreaView : View;
  const Content = scrollable ? ScrollView : View;

  return (
    <Container style={styles.container}>
      <StatusBar
        barStyle={statusBarStyle}
        backgroundColor={
          Platform.OS === 'android'
            ? backgroundColor === 'secondary'
              ? Theme.colors.background.secondary
              : Theme.colors.background.primary
            : undefined
        }
      />
      <Content
        style={[contentStyle, style]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {children}
      </Content>
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default Screen;
