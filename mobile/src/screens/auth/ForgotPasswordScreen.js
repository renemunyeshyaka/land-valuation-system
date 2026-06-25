import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../constants/theme';
import { authAPI } from '../../services/api';
import LandValLogo from '../../components/LandValLogo';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState(1); // 1=email, 2=code, 3=new password
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetCode, setResetCode] = useState('');

  const handleRequestReset = async () => {
    if (!email.trim()) { Alert.alert('Error', 'Enter your email'); return; }
    setLoading(true);
    try {
      await authAPI.forgotPassword(email.trim());
      Alert.alert('Sent', 'Check your email for the reset code');
      setStep(2);
    } catch {
      Alert.alert('Error', 'Failed to send reset code');
    } finally { setLoading(false); }
  };

  const handleResetPassword = async () => {
    if (!resetCode || resetCode.length < 4) { Alert.alert('Error', 'Enter the reset code from your email'); return; }
    if (!password || password.length < 8) { Alert.alert('Error', 'Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      await authAPI.resetPassword(email.trim(), resetCode, password);
      Alert.alert('Success', 'Password reset successfully', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    } catch {
      Alert.alert('Error', 'Reset failed. Check your code and try again.');
    } finally { setLoading(false); }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          <LandValLogo size={64} />
        </View>
        <Text style={styles.title}>
          {step === 1 ? 'Forgot Password' : step === 2 ? 'Reset Code' : 'New Password'}
        </Text>

        {step === 1 && (
          <>
            <Text style={styles.subtitle}>Enter your email and we'll send you a reset code.</Text>
            <Text style={styles.label}>Email</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="your@email.com" keyboardType="email-address" autoCapitalize="none" />
            <TouchableOpacity style={[styles.button, loading && { opacity: 0.6 }]} onPress={handleRequestReset} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send Reset Code</Text>}
            </TouchableOpacity>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.subtitle}>Enter the code from your email, then set a new password.</Text>
            <Text style={styles.label}>Reset Code</Text>
            <TextInput style={styles.input} value={resetCode} onChangeText={setResetCode} placeholder="6-digit code" keyboardType="number-pad" />
            <Text style={styles.label}>New Password</Text>
            <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Min. 8 characters" secureTextEntry />
            <TouchableOpacity style={[styles.button, loading && { opacity: 0.6 }]} onPress={handleResetPassword} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Reset Password</Text>}
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>← Back to login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', padding: 24 },
  card: { backgroundColor: COLORS.surface, borderRadius: SIZES.radiusLg, padding: 24, ...SHADOWS.card },
  title: { fontSize: SIZES.xxl, ...FONTS.bold, color: COLORS.text, marginBottom: 8 },
  subtitle: { fontSize: SIZES.sm, color: COLORS.textSecondary, marginBottom: 24, lineHeight: 22 },
  label: { fontSize: SIZES.sm, ...FONTS.medium, color: COLORS.text, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: SIZES.radius, paddingHorizontal: 16, paddingVertical: 14, fontSize: SIZES.md, color: COLORS.text, marginBottom: 8 },
  button: { backgroundColor: COLORS.primary, borderRadius: SIZES.radius, paddingVertical: 16, alignItems: 'center', marginTop: 16, ...SHADOWS.button },
  buttonText: { color: COLORS.white, fontSize: SIZES.md, ...FONTS.semibold },
  backLink: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 20, fontSize: SIZES.sm },
});
