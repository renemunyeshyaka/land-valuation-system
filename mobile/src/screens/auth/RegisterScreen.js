import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../constants/theme';
import { authAPI } from '../../services/api';
import LandValLogo from '../../components/LandValLogo';

export default function RegisterScreen({ navigation }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', userType: 'buyer' });
  const [loading, setLoading] = useState(false);

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleRegister = async () => {
    if (!form.firstName || !form.lastName || !form.email || !form.phone || !form.password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const res = await authAPI.register({
        first_name: form.firstName, last_name: form.lastName,
        email: form.email, phone: form.phone, password: form.password,
        user_type: form.userType,
      });
      if (res.data?.success) {
        Alert.alert('Success', 'Account created! Please check your email for the verification code.', [
          { text: 'OK', onPress: () => navigation.navigate('Login') },
        ]);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <LandValLogo size={64} />
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join Land Valuation System</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.row}>
            <View style={styles.half}>
              <Text style={styles.label}>First Name</Text>
              <TextInput style={styles.input} value={form.firstName} onChangeText={v => update('firstName', v)} placeholder="Jean" placeholderTextColor={COLORS.textLight} />
            </View>
            <View style={styles.half}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput style={styles.input} value={form.lastName} onChangeText={v => update('lastName', v)} placeholder="Habimana" placeholderTextColor={COLORS.textLight} />
            </View>
          </View>

          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} value={form.email} onChangeText={v => update('email', v)} placeholder="your@email.com" placeholderTextColor={COLORS.textLight} keyboardType="email-address" autoCapitalize="none" />

          <Text style={styles.label}>Phone</Text>
          <TextInput style={styles.input} value={form.phone} onChangeText={v => update('phone', v)} placeholder="+250788000000" placeholderTextColor={COLORS.textLight} keyboardType="phone-pad" />

          <Text style={styles.label}>Password</Text>
          <TextInput style={styles.input} value={form.password} onChangeText={v => update('password', v)} placeholder="Min. 8 characters" placeholderTextColor={COLORS.textLight} secureTextEntry />

          <Text style={styles.label}>Account Type</Text>
          <View style={styles.typeRow}>
            {[
              { key: 'buyer', label: 'Buyer' },
              { key: 'seller', label: 'Seller' },
              { key: 'agent', label: 'Agent' },
            ].map(t => (
              <TouchableOpacity
                key={t.key}
                style={[styles.typeBtn, form.userType === t.key && styles.typeBtnActive]}
                onPress={() => update('userType', t.key)}
              >
                <Text style={[styles.typeText, form.userType === t.key && styles.typeTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleRegister} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Account</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 24, paddingTop: 60 },
  header: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: SIZES.xxl, ...FONTS.bold, color: COLORS.text },
  subtitle: { fontSize: SIZES.sm, color: COLORS.textSecondary, marginTop: 4 },
  form: { backgroundColor: COLORS.surface, borderRadius: SIZES.radiusLg, padding: 24, ...SHADOWS.card },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  label: { fontSize: SIZES.sm, ...FONTS.medium, color: COLORS.text, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: SIZES.radius, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: SIZES.md, color: COLORS.text,
  },
  typeRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  typeBtn: { flex: 1, paddingVertical: 12, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  typeBtnActive: { borderColor: COLORS.primary, backgroundColor: '#f0fdf4' },
  typeText: { fontSize: SIZES.sm, color: COLORS.textSecondary, ...FONTS.medium },
  typeTextActive: { color: COLORS.primary },
  button: { backgroundColor: COLORS.primary, borderRadius: SIZES.radius, paddingVertical: 16, alignItems: 'center', marginTop: 24, ...SHADOWS.button },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: COLORS.white, fontSize: SIZES.md, ...FONTS.semibold },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24, marginBottom: 40 },
  footerText: { color: COLORS.textSecondary, fontSize: SIZES.sm },
  footerLink: { color: COLORS.primary, fontSize: SIZES.sm, ...FONTS.semibold },
});
