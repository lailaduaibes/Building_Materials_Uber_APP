import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null;
}

interface ValidatedInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  rules?: ValidationRule;
  style?: any;
  multiline?: boolean;
  numberOfLines?: number;
}

export const ValidatedInput: React.FC<ValidatedInputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  rules,
  style,
  multiline = false,
  numberOfLines = 1,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const validateInput = (text: string): string | null => {
    if (!rules) return null;

    if (rules.required && !text.trim()) {
      return `${label} is required`;
    }

    if (rules.minLength && text.length < rules.minLength) {
      return `${label} must be at least ${rules.minLength} characters`;
    }

    if (rules.maxLength && text.length > rules.maxLength) {
      return `${label} must be no more than ${rules.maxLength} characters`;
    }

    if (rules.pattern && !rules.pattern.test(text)) {
      return `${label} format is invalid`;
    }

    if (rules.custom) {
      return rules.custom(text);
    }

    return null;
  };

  const handleChangeText = (text: string) => {
    onChangeText(text);
    if (touched) {
      const validationError = validateInput(text);
      setError(validationError);
    }
  };

  const handleBlur = () => {
    setTouched(true);
    const validationError = validateInput(value);
    setError(validationError);
  };

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          error && touched && styles.inputError,
          multiline && styles.multilineInput,
        ]}
        value={value}
        onChangeText={handleChangeText}
        onBlur={handleBlur}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={numberOfLines}
        placeholderTextColor="#999"
      />
      {error && touched && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
};

// Common validation rules
export const ValidationRules = {
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  password: {
    required: true,
    minLength: 8,
    custom: (value: string) => {
      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
        return 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
      }
      return null;
    },
  },
  phone: {
    required: true,
    pattern: /^\+?[\d\s\-\(\)]+$/,
    minLength: 10,
  },
  name: {
    required: true,
    minLength: 2,
    maxLength: 50,
    pattern: /^[a-zA-Z\s]+$/,
  },
  address: {
    required: true,
    minLength: 10,
    maxLength: 200,
  },
};

// Form validation hook
export const useFormValidation = (initialValues: { [key: string]: string }) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<{ [key: string]: string | null }>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

  const setValue = (field: string, value: string) => {
    setValues(prev => ({ ...prev, [field]: value }));
  };

  const setFieldTouched = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const validateField = (field: string, rules: ValidationRule): string | null => {
    const value = values[field] || '';

    if (rules.required && !value.trim()) {
      return `${field} is required`;
    }

    if (rules.minLength && value.length < rules.minLength) {
      return `${field} must be at least ${rules.minLength} characters`;
    }

    if (rules.maxLength && value.length > rules.maxLength) {
      return `${field} must be no more than ${rules.maxLength} characters`;
    }

    if (rules.pattern && !rules.pattern.test(value)) {
      return `${field} format is invalid`;
    }

    if (rules.custom) {
      return rules.custom(value);
    }

    return null;
  };

  const validateForm = (validationSchema: { [key: string]: ValidationRule }): boolean => {
    const newErrors: { [key: string]: string | null } = {};
    let isValid = true;

    Object.keys(validationSchema).forEach(field => {
      const error = validateField(field, validationSchema[field]);
      newErrors[field] = error;
      if (error) {
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const hasErrors = Object.values(errors).some(error => error !== null);

  return {
    values,
    errors,
    touched,
    setValue,
    setFieldTouched,
    validateForm,
    hasErrors,
  };
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#ff6b6b',
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    marginTop: 4,
    marginLeft: 4,
  },
});
