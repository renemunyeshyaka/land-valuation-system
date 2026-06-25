import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../constants/theme';
import { authAPI, setToken } from '../../services/api';
import LandValLogo from '../../components/LandValLogo';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      const res = await authAPI.login(email.trim(), password);
      if (res.data?.success) {
        // Navigate to OTP verification
        navigation.navigate('VerifyOTP', { email: email.trim() });
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Check your credentials.';
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.inner}>
        {/* Logo & Title */}
        <View style={styles.header}>
          <LandValLogo size={64} />
          <Text style={styles.title}>LandVal</Text>
          <Text style={styles.subtitle}>Land Valuation System · Rwanda</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.formTitle}>Welcome Back</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            placeholderTextColor={COLORS.textLight}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            placeholderTextColor={COLORS.textLight}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={styles.link}>Forgot password?</Text>
          </TouchableOpacity>
        </View>

        {/* Register link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.footerLink}>Create one</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  header: { alignItems: 'center', marginBottom: 40 },
  title: { fontSize: SIZES.xxxl, ...FONTS.bold, color: COLORS.primary },
  subtitle: { fontSize: SIZES.sm, color: COLORS.textSecondary, marginTop: 4 },
  form: { backgroundColor: COLORS.surface, borderRadius: SIZES.radiusLg, padding: 24, ...SHADOWS.card },
  formTitle: { fontSize: SIZES.xl, ...FONTS.semibold, color: COLORS.text, marginBottom: 20 },
  label: { fontSize: SIZES.sm, ...FONTS.medium, color: COLORS.text, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: SIZES.radius, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: SIZES.md, color: COLORS.text, marginBottom: 16,
  },
  button: {
    backgroundColor: COLORS.primary, borderRadius: SIZES.radius, paddingVertical: 16,
    alignItems: 'center', marginTop: 8, ...SHADOWS.button,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: COLORS.white, fontSize: SIZES.md, ...FONTS.semibold },
  link: { color: COLORS.primary, textAlign: 'center', marginTop: 16, fontSize: SIZES.sm, ...FONTS.medium },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
  footerText: { color: COLORS.textSecondary, fontSize: SIZES.sm },
  footerLink: { color: COLORS.primary, fontSize: SIZES.sm, ...FONTS.semibold },
});
