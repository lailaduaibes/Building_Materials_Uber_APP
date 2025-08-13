import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { Colors, Spacing, BorderRadius, FontSizes } from "../constants/theme";
import { authAPI } from "../services/api";

interface LoginScreenProps {
  navigation: any;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.login(email.trim(), password);
      
      if (response.success) {
        // Store auth token (in real app, use AsyncStorage)
        console.log("Login successful:", response.data);
        
        // Navigate based on user role
        switch (response.data.user.role) {
          case "CUSTOMER":
            navigation.replace("CustomerTabs");
            break;
          case "DRIVER":
            navigation.replace("DriverTabs");
            break;
          case "DISPATCHER":
            navigation.replace("DispatcherTabs");
            break;
          case "ADMIN":
            navigation.replace("AdminTabs");
            break;
          default:
            navigation.replace("CustomerTabs");
        }
      }
    } catch (error: any) {
      Alert.alert(
        "Login Failed", 
        error.response?.data?.message || "Unable to login. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <Text style={styles.appTitle}>BuildMate</Text>
            <Text style={styles.subtitle}>Building Materials Delivery</Text>
          </View>

          {/* Login Form */}
          <View style={styles.formContainer}>
            <Text style={styles.welcomeText}>Welcome Back</Text>
            <Text style={styles.descriptionText}>
              Sign in to continue managing your deliveries
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor={Colors.gray500}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={Colors.gray500}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity 
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.loginButtonText}>
                {loading ? "Signing In..." : "Sign In"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.forgotPasswordButton}
              onPress={() => Alert.alert("Info", "Password reset feature coming soon!")}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          {/* Register Link */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Register")}>
              <Text style={styles.registerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: Spacing.lg,
  },
  logoSection: {
    alignItems: "center",
    marginBottom: Spacing.xxl,
  },
  appTitle: {
    fontSize: FontSizes.xxxl,
    fontWeight: "bold",
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  formContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    elevation: 2,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  welcomeText: {
    fontSize: FontSizes.xxl,
    fontWeight: "600",
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  descriptionText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  inputContainer: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: "500",
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    backgroundColor: Colors.white,
  },
  loginButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: "center",
    marginTop: Spacing.md,
  },
  loginButtonDisabled: {
    backgroundColor: Colors.gray400,
  },
  loginButtonText: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: "600",
  },
  forgotPasswordButton: {
    alignItems: "center",
    marginTop: Spacing.md,
  },
  forgotPasswordText: {
    color: Colors.primary,
    fontSize: FontSizes.sm,
  },
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  registerText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  registerLink: {
    color: Colors.primary,
    fontSize: FontSizes.sm,
    fontWeight: "600",
  },
});

export default LoginScreen;
