import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../constants/theme';
import { authAPI, setToken } from '../../services/api';

export default function VerifyOTPScreen({ route, navigation }) {
  const { email } = route.params || {};
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (inputRefs.current[0]) inputRefs.current[0].focus();
  }, []);

  const handleChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, key) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otp = code.join('');
    if (otp.length !== 6) {
      Alert.alert('Error', 'Please enter the complete 6-digit code');
      return;
    }
    setLoading(true);
    try {
      const res = await authAPI.verifyOTP(email, otp);
      if (res.data?.success) {
        const { access_token, user } = res.data.data;
        setToken(access_token);
        // Navigate to main app
        navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Verification failed';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await authAPI.login(email, '');
      Alert.alert('Sent', 'A new code has been sent to your email');
    } catch {
      Alert.alert('Error', 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Verify Code</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code sent to{'\n'}{email}
        </Text>

        <View style={styles.codeRow}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => { inputRefs.current[index] = ref; }}
              style={[styles.codeInput, digit ? styles.codeInputFilled : null]}
              value={digit}
              onChangeText={(val) => handleChange(index, val)}
              onKeyPress={({ nativeEvent }) => handleKeyDown(index, nativeEvent.key)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleVerify}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Verify & Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleResend} disabled={resending} style={styles.resendBtn}>
          <Text style={styles.resendText}>
            {resending ? 'Sending...' : 'Resend code'}
          </Text>
        </TouchableOpacity>

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
  title: { fontSize: SIZES.xxl, ...FONTS.bold, color: COLORS.text, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: SIZES.sm, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  codeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  codeInput: {
    width: 48, height: 56, borderWidth: 2, borderColor: COLORS.border,
    borderRadius: SIZES.radius, textAlign: 'center', fontSize: SIZES.xxl,
    ...FONTS.bold, color: COLORS.text,
  },
  codeInputFilled: { borderColor: COLORS.primary, backgroundColor: '#f0fdf4' },
  button: {
    backgroundColor: COLORS.primary, borderRadius: SIZES.radius, paddingVertical: 16,
    alignItems: 'center', ...SHADOWS.button,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: COLORS.white, fontSize: SIZES.md, ...FONTS.semibold },
  resendBtn: { alignItems: 'center', marginTop: 20 },
  resendText: { color: COLORS.primary, fontSize: SIZES.sm, ...FONTS.medium },
  backLink: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 16, fontSize: SIZES.sm },
});
