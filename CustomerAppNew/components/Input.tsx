/**
 * YouMats Input Component
 * Professional input field with validation and accessibility
 */

import React, { useState, forwardRef } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
} from 'react-native';
import { Theme } from '../theme';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  required?: boolean;
  disabled?: boolean;
}

const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      onRightIconPress,
      containerStyle,
      inputStyle,
      required = false,
      disabled = false,
      ...textInputProps
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);

    const getContainerStyle = (): ViewStyle => {
      let borderColor: string = Theme.colors.border.medium;
      
      if (error) {
        borderColor = Theme.colors.border.error;
      } else if (isFocused) {
        borderColor = Theme.colors.border.focus;
      }

      return {
        ...Theme.components.input.default,
        borderColor,
        borderWidth: isFocused && !error ? 2 : 1,
        opacity: disabled ? 0.6 : 1,
      };
    };

    const getInputStyle = (): TextStyle => {
      return {
        ...Theme.typography.input,
        color: disabled ? Theme.colors.text.light : Theme.colors.text.primary,
        flex: 1,
        minHeight: Theme.layout.input.height - (Theme.spacing.input.paddingVertical * 2),
      };
    };

    const handleFocus = (e: any) => {
      setIsFocused(true);
      textInputProps.onFocus?.(e);
    };

    const handleBlur = (e: any) => {
      setIsFocused(false);
      textInputProps.onBlur?.(e);
    };

    return (
      <View style={[styles.wrapper, containerStyle]}>
        {label && (
          <Text style={styles.label}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
        )}
        
        <View style={[styles.container, getContainerStyle()]}>
          {leftIcon && (
            <View style={styles.leftIcon}>
              {leftIcon}
            </View>
          )}
          
          <TextInput
            ref={ref}
            style={[getInputStyle(), inputStyle]}
            onFocus={handleFocus}
            onBlur={handleBlur}
            editable={!disabled}
            placeholderTextColor={Theme.colors.text.light}
            {...textInputProps}
          />
          
          {rightIcon && (
            <TouchableOpacity
              style={styles.rightIcon}
              onPress={onRightIconPress}
              disabled={!onRightIconPress}
            >
              {rightIcon}
            </TouchableOpacity>
          )}
        </View>
        
        {error && (
          <Text style={styles.error}>{error}</Text>
        )}
        
        {hint && !error && (
          <Text style={styles.hint}>{hint}</Text>
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: Theme.spacing.input.marginVertical,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    ...Theme.typography.label,
    color: Theme.colors.text.primary,
    marginBottom: Theme.spacing.xs,
  },
  required: {
    color: Theme.colors.error,
  },
  leftIcon: {
    marginRight: Theme.spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightIcon: {
    marginLeft: Theme.spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: Theme.spacing.touchTarget.minimum,
    minHeight: Theme.spacing.touchTarget.minimum,
  },
  error: {
    ...Theme.typography.caption,
    color: Theme.colors.error,
    marginTop: Theme.spacing.xs,
  },
  hint: {
    ...Theme.typography.caption,
    color: Theme.colors.text.secondary,
    marginTop: Theme.spacing.xs,
  },
});

Input.displayName = 'Input';

export default Input;
