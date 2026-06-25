import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Linking,
} from 'react-native';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/theme';
import { authAPI } from '../services/api';

const API_BASE = 'http://10.0.2.2:5001/api/v1';

export default function ContactScreen() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.message) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        Alert.alert('Sent', 'Thank you! We will respond shortly.');
        setForm({ name: '', email: '', message: '' });
      } else {
        throw new Error('Failed to send');
      }
    } catch {
      Alert.alert('Error', 'Failed to send message. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Contact Us</Text>
      <Text style={styles.subtitle}>
        For inquiries, suggestions, or support, please fill out the form below.
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input} value={form.name}
          onChangeText={v => setForm(f => ({ ...f, name: v }))}
          placeholder="Your name" placeholderTextColor={COLORS.textLight}
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input} value={form.email}
          onChangeText={v => setForm(f => ({ ...f, email: v }))}
          placeholder="your@email.com" placeholderTextColor={COLORS.textLight}
          keyboardType="email-address" autoCapitalize="none"
        />

        <Text style={styles.label}>Message</Text>
        <TextInput
          style={[styles.input, styles.textArea]} value={form.message}
          onChangeText={v => setForm(f => ({ ...f, message: v }))}
          placeholder="How can we help?" placeholderTextColor={COLORS.textLight}
          multiline numberOfLines={5}
        />

        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send Message</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.linksCard}>
        <Text style={styles.linksTitle}>Quick Links</Text>
        <TouchableOpacity style={styles.linkItem} onPress={() => Linking.openURL('https://landval.kcoders.org/terms')}>
          <Text style={styles.linkText}>📄 Terms of Service</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkItem} onPress={() => Linking.openURL('https://landval.kcoders.org/privacy')}>
          <Text style={styles.linkText}>🔒 Privacy Policy</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkItem} onPress={() => Linking.openURL('mailto:support@landval.kcoders.org')}>
          <Text style={styles.linkText}>📧 support@landval.kcoders.org</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.certBadge}>
        <Text style={styles.certText}>
          Certified by National Cybersecurity Authority (NCSA) Data Protection & Privacy Office (DPO)
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 24, paddingTop: 60 },
  title: { fontSize: SIZES.xxl, ...FONTS.bold, color: COLORS.text, marginBottom: 8 },
  subtitle: { fontSize: SIZES.sm, color: COLORS.textSecondary, lineHeight: 22, marginBottom: 24 },
  card: { backgroundColor: COLORS.surface, borderRadius: SIZES.radiusLg, padding: 24, ...SHADOWS.card, marginBottom: 20 },
  label: { fontSize: SIZES.sm, ...FONTS.medium, color: COLORS.text, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: SIZES.radius, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: SIZES.md, color: COLORS.text,
  },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  button: { backgroundColor: COLORS.primary, borderRadius: SIZES.radius, paddingVertical: 16, alignItems: 'center', marginTop: 24, ...SHADOWS.button },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: COLORS.white, fontSize: SIZES.md, ...FONTS.semibold },
  linksCard: { backgroundColor: COLORS.surface, borderRadius: SIZES.radiusLg, padding: 24, ...SHADOWS.card, marginBottom: 20 },
  linksTitle: { fontSize: SIZES.lg, ...FONTS.semibold, color: COLORS.text, marginBottom: 16 },
  linkItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  linkText: { fontSize: SIZES.md, color: COLORS.text },
  certBadge: { backgroundColor: COLORS.primaryDark, borderRadius: SIZES.radius, padding: 16, alignItems: 'center' },
  certText: { color: COLORS.white, fontSize: SIZES.xs, textAlign: 'center', lineHeight: 18 },
});
