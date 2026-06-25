import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/theme';
import { userAPI, authAPI } from '../services/api';

export default function ProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '' });

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const res = await userAPI.getProfile();
      if (res.data?.success) {
        const u = res.data.data;
        setProfile(u);
        setForm({ firstName: u.first_name || '', lastName: u.last_name || '', email: u.email || '', phone: u.phone || '' });
      }
    } catch {} finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await userAPI.updateProfile({ first_name: form.firstName, last_name: form.lastName, phone: form.phone });
      Alert.alert('Saved', 'Profile updated successfully');
      setEditing(false);
      loadProfile();
    } catch {
      Alert.alert('Error', 'Failed to update profile');
    } finally { setSaving(false); }
  };

  const handleChangePassword = () => {
    navigation.navigate('ForgotPassword');
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{profile?.first_name?.charAt(0)}{profile?.last_name?.charAt(0)}</Text>
        </View>
        <Text style={styles.name}>{profile?.first_name} {profile?.last_name}</Text>
        <Text style={styles.email}>{profile?.email}</Text>
        <View style={styles.tierBadge}>
          <Text style={styles.tierText}>{profile?.subscription_tier || 'free'}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.sectionTitle}>{editing ? 'Edit Profile' : 'Profile Details'}</Text>
          {!editing && (
            <TouchableOpacity onPress={() => setEditing(true)}>
              <Text style={styles.editLink}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {editing ? (
          <>
            <Text style={styles.label}>First Name</Text>
            <TextInput style={styles.input} value={form.firstName} onChangeText={v => setForm(f => ({ ...f, firstName: v }))} />

            <Text style={styles.label}>Last Name</Text>
            <TextInput style={styles.input} value={form.lastName} onChangeText={v => setForm(f => ({ ...f, lastName: v }))} />

            <Text style={styles.label}>Phone</Text>
            <TextInput style={styles.input} value={form.phone} onChangeText={v => setForm(f => ({ ...f, phone: v }))} keyboardType="phone-pad" />

            <View style={styles.editActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <ProfileRow label="Phone" value={profile?.phone} />
            <ProfileRow label="User Type" value={profile?.user_type} />
            <ProfileRow label="Member Since" value={profile?.created_at?.split('T')[0]} />
            <ProfileRow label="Language" value={profile?.preferred_language || 'en'} />
          </>
        )}
      </View>

      <TouchableOpacity style={styles.passwordBtn} onPress={handleChangePassword}>
        <Text style={styles.passwordText}>Change Password</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const ProfileRow = ({ label, value }) => (
  <View style={styles.profileRow}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value || '—'}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { color: COLORS.white, fontSize: 28, ...FONTS.bold },
  name: { fontSize: SIZES.xl, ...FONTS.bold, color: COLORS.text },
  email: { fontSize: SIZES.sm, color: COLORS.textSecondary, marginTop: 4 },
  tierBadge: { marginTop: 8, backgroundColor: '#f0fdf4', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: '#bbf7d0' },
  tierText: { color: COLORS.primary, fontSize: SIZES.xs, ...FONTS.semibold, textTransform: 'capitalize' },
  card: { backgroundColor: COLORS.surface, borderRadius: SIZES.radiusLg, padding: 24, ...SHADOWS.card, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sectionTitle: { fontSize: SIZES.lg, ...FONTS.bold, color: COLORS.text },
  editLink: { color: COLORS.primary, fontSize: SIZES.sm, ...FONTS.semibold },
  label: { fontSize: SIZES.sm, ...FONTS.medium, color: COLORS.text, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: SIZES.radius, paddingHorizontal: 16, paddingVertical: 14, fontSize: SIZES.md, color: COLORS.text },
  editActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: SIZES.radius, paddingVertical: 14, alignItems: 'center' },
  cancelText: { color: COLORS.text, fontSize: SIZES.md, ...FONTS.medium },
  saveBtn: { flex: 1, backgroundColor: COLORS.primary, borderRadius: SIZES.radius, paddingVertical: 14, alignItems: 'center', ...SHADOWS.button },
  saveText: { color: COLORS.white, fontSize: SIZES.md, ...FONTS.semibold },
  profileRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowLabel: { fontSize: SIZES.sm, color: COLORS.textSecondary },
  rowValue: { fontSize: SIZES.sm, color: COLORS.text, ...FONTS.medium },
  passwordBtn: { alignItems: 'center', paddingVertical: 16 },
  passwordText: { color: COLORS.primary, fontSize: SIZES.md, ...FONTS.medium },
});
