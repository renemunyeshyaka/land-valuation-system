import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/theme';
import { userAPI, authAPI, clearToken } from '../services/api';

export default function ProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '' });

  // Self-service account deletion (right to delete your own account at any time)
  const [showDelete, setShowDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);

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

  const handleDeleteAccount = () => {
    if (!deletePassword) {
      Alert.alert('Password required', 'Enter your current password to confirm.');
      return;
    }

    Alert.alert(
      'Delete account?',
      'This permanently deletes your account and signs you out. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: confirmDeleteAccount },
      ],
    );
  };

  const confirmDeleteAccount = async () => {
    setDeleting(true);
    try {
      await userAPI.deleteAccount(deletePassword);
      clearToken();
      setShowDelete(false);
      setDeletePassword('');
      Alert.alert('Account deleted', 'Your account has been deleted.');
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (e) {
      Alert.alert(
        'Error',
        e?.response?.data?.error?.details ||
          e?.response?.data?.error?.message ||
          'Could not delete your account. Please try again.',
      );
    } finally {
      setDeleting(false);
    }
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

      <View style={styles.dangerCard}>
        <Text style={styles.dangerTitle}>Danger Zone</Text>
        <Text style={styles.dangerText}>
          You have the right to delete your account at any time. Your profile, credentials and personal
          data are erased and anonymised, and your access to LandVal ends. This cannot be undone.
        </Text>
        <Text style={styles.dangerNote}>
          Property and payment records that we are legally required to keep are retained, but are no
          longer linked to your identity.
        </Text>

        {showDelete ? (
          <>
            <Text style={styles.label}>Confirm your password</Text>
            <TextInput
              style={styles.input}
              value={deletePassword}
              onChangeText={setDeletePassword}
              placeholder="Your current password"
              placeholderTextColor={COLORS.textSecondary}
              secureTextEntry
              editable={!deleting}
            />

            <TouchableOpacity
              style={[styles.deleteBtn, deleting && { opacity: 0.6 }]}
              onPress={handleDeleteAccount}
              disabled={deleting}
            >
              {deleting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.deleteText}>Delete My Account</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.passwordBtn}
              onPress={() => { setShowDelete(false); setDeletePassword(''); }}
              disabled={deleting}
            >
              <Text style={styles.passwordText}>Cancel</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.deleteOutlineBtn} onPress={() => setShowDelete(true)}>
            <Text style={styles.deleteOutlineText}>Delete My Account</Text>
          </TouchableOpacity>
        )}
      </View>
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
  dangerCard: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: SIZES.radiusLg, padding: 24, marginTop: 8 },
  dangerTitle: { fontSize: SIZES.lg, ...FONTS.bold, color: '#b91c1c' },
  dangerText: { fontSize: SIZES.sm, color: '#7f1d1d', marginTop: 8, lineHeight: 20 },
  dangerNote: { fontSize: SIZES.xs, color: '#991b1b', marginTop: 8, lineHeight: 16 },
  deleteBtn: { backgroundColor: '#dc2626', borderRadius: SIZES.radius, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  deleteText: { color: COLORS.white, fontSize: SIZES.md, ...FONTS.semibold },
  deleteOutlineBtn: { borderWidth: 1, borderColor: '#dc2626', borderRadius: SIZES.radius, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  deleteOutlineText: { color: '#dc2626', fontSize: SIZES.md, ...FONTS.semibold },
});
