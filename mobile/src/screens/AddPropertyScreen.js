import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/theme';

// Rwanda administrative hierarchy
const RWANDA_DATA = {
  Kigali: {
    Gasabo: { Kacyiru: ['Biryogo', 'Agakomeye', 'Gacuriro'], Kimironko: ['Bibare', 'Rugando', 'Kamashashi'] },
    Nyarugenge: { Amahoro: ['Kiyovu', 'Nyamirambo', 'Rwezamenyo'], Gitega: ['Akabahizi', 'Akabuga', 'Munanira'] },
    Kicukiro: { Kicukiro: ['Kagina', 'Gahanga', 'Bweramana'], Kanombe: ['Shyorongi', 'Busanza', 'Niboye'] },
  },
  'Eastern Province': {
    Bugesera: { Mayange: ['Mbyo', 'Rutare', 'Busoro'], Nyamata: ['Kanzenze', 'Mpende', 'Rilima'] },
    Rwamagana: { Kigabiro: ['Kaziranvura', 'Mvuzo', 'Rwamagana'], Munyiginya: ['Bicaca', 'Gihinga', 'Mukarange'] },
  },
  'Western Province': {
    Rubavu: { Rubavu: ['Gisenyi', 'Bugoyi', 'Nyakiriba'], Cyanzarwe: ['Bweza', 'Mubuga', 'Muringa'] },
    Rusizi: { Kamembe: ['Gashonga', 'Mibilizi', 'Rusizi'], Nkungu: ['Bugarama', 'Kigoga', 'Shangasha'] },
  },
  'Northern Province': {
    Musanze: { Musanze: ['Cyuve', 'Muhoza', 'Muhanga'], Kimonyi: ['Gaseke', 'Gisesero', 'Mubago'] },
    Gakenke: { Gakenke: ['Busengo', 'Coko', 'Kivuruga'], Muyongwe: ['Gikoto', 'Kamubuga', 'Ruganda'] },
  },
  Southern: {
    Huye: { Huye: ['Ngoma', 'Ruhashya', 'Rusatira'], Tumba: ['Gitinda', 'Mukura', 'Rango'] },
    Muhanga: { Muhanga: ['Cyeza', 'Kabacuzi', 'Rongi'], Nyamabuye: ['Gatare', 'Kanyinya', 'Shori'] },
  },
};

export default function AddPropertyScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState([]);
  const [form, setForm] = useState({
    title: '', description: '', propertyType: 'residential', price: '',
    landSize: '', province: '', district: '', sector: '', cell: '', village: '',
  });
  const [step, setStep] = useState(1); // 1=details, 2=location

  const provinces = Object.keys(RWANDA_DATA);
  const districts = form.province ? Object.keys(RWANDA_DATA[form.province] || {}) : [];
  const sectors = form.district ? Object.keys(RWANDA_DATA[form.province]?.[form.district] || {}) : [];
  const cells = form.sector ? Object.keys(RWANDA_DATA[form.province]?.[form.district]?.[form.sector] || {}) : [];
  const villages = form.cell ? RWANDA_DATA[form.province]?.[form.district]?.[form.sector]?.[form.cell] || [] : [];

  const update = (field, value) => {
    // Reset cascading fields when parent changes
    const resets = {
      province: ['district', 'sector', 'cell', 'village'],
      district: ['sector', 'cell', 'village'],
      sector: ['cell', 'village'],
      cell: ['village'],
    };
    const toReset = resets[field] || [];
    const updates = { [field]: value };
    toReset.forEach(f => { updates[f] = ''; });
    setForm(f => ({ ...f, ...updates }));
  };

  const pickImage = () => {
    Alert.alert('Upload Image', 'Choose an option', [
      { text: 'Take Photo', onPress: () => Alert.alert('Info', 'Camera not available on emulator') },
      { text: 'Choose from Gallery', onPress: () => {
        if (images.length >= 5) { Alert.alert('Limit', 'Maximum 5 images'); return; }
        setImages(i => [...i, `image-${i.length + 1}`]);
      }},
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSubmit = async () => {
    if (!form.title || !form.price || !form.landSize || !form.village) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    setLoading(true);
    // TODO: implement API call to create property
    setTimeout(() => {
      setLoading(false);
      Alert.alert('Success', 'Property listed successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }, 1500);
  };

  const Selector = ({ label, value, options, onSelect }) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.optionsRow}>
        {options.map(opt => (
          <TouchableOpacity
            key={opt}
            style={[styles.optionChip, value === opt && styles.optionChipActive]}
            onPress={() => onSelect(opt)}
          >
            <Text style={[styles.optionText, value === opt && styles.optionTextActive]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Add Property</Text>

      {/* Step indicator */}
      <View style={styles.steps}>
        {[1, 2].map(s => (
          <View key={s} style={[styles.stepDot, step >= s && styles.stepDotActive]}>
            <Text style={[styles.stepNum, step >= s && styles.stepNumActive]}>{s}</Text>
          </View>
        ))}
      </View>

      {step === 1 ? (
        <>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Property Details</Text>

            <Text style={styles.label}>Title *</Text>
            <TextInput style={styles.input} value={form.title} onChangeText={v => update('title', v)} placeholder="e.g. Prime Plot in Kacyiru" />

            <Text style={styles.label}>Type</Text>
            <View style={styles.typeRow}>
              {['residential', 'commercial', 'apartment', 'house', 'agricultural'].map(t => (
                <TouchableOpacity key={t} style={[styles.typeChip, form.propertyType === t && styles.typeChipActive]}
                  onPress={() => update('propertyType', t)}>
                  <Text style={[styles.typeText, form.propertyType === t && styles.typeTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Price (RWF) *</Text>
            <TextInput style={styles.input} value={form.price} onChangeText={v => update('price', v)} keyboardType="numeric" placeholder="e.g. 65000000" />

            <Text style={styles.label}>Land Size (sqm) *</Text>
            <TextInput style={styles.input} value={form.landSize} onChangeText={v => update('landSize', v)} keyboardType="numeric" placeholder="e.g. 500" />

            <Text style={styles.label}>Description</Text>
            <TextInput style={[styles.input, styles.textArea]} value={form.description} onChangeText={v => update('description', v)} multiline numberOfLines={4} placeholder="Describe your property..." />

            {/* Image upload */}
            <Text style={styles.label}>Images ({images.length}/5)</Text>
            <View style={styles.imageRow}>
              {images.map((img, i) => (
                <View key={i} style={styles.imageThumb}>
                  <Text style={styles.imageIcon}>🖼️</Text>
                </View>
              ))}
              {images.length < 5 && (
                <TouchableOpacity style={styles.addImageBtn} onPress={pickImage}>
                  <Text style={styles.addImageText}>+</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(2)}>
            <Text style={styles.nextText}>Next: Location →</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Location</Text>

            <Selector label="Province *" value={form.province} options={provinces} onSelect={v => update('province', v)} />
            {form.province && <Selector label="District *" value={form.district} options={districts} onSelect={v => update('district', v)} />}
            {form.district && <Selector label="Sector *" value={form.sector} options={sectors} onSelect={v => update('sector', v)} />}
            {form.sector && <Selector label="Cell *" value={form.cell} options={cells} onSelect={v => update('cell', v)} />}
            {form.cell && <Selector label="Village *" value={form.village} options={villages} onSelect={v => update('village', v)} />}
          </View>

          <View style={styles.navRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.submitBtn, loading && { opacity: 0.6 }]} onPress={handleSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>List Property</Text>}
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  title: { fontSize: SIZES.xxl, ...FONTS.bold, color: COLORS.text, marginBottom: 16 },
  steps: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  stepDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { backgroundColor: COLORS.primary },
  stepNum: { color: COLORS.textLight, ...FONTS.bold },
  stepNumActive: { color: COLORS.white },
  card: { backgroundColor: COLORS.surface, borderRadius: SIZES.radiusLg, padding: 24, ...SHADOWS.card, marginBottom: 20 },
  sectionTitle: { fontSize: SIZES.lg, ...FONTS.bold, color: COLORS.text, marginBottom: 20 },
  label: { fontSize: SIZES.sm, ...FONTS.medium, color: COLORS.text, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: SIZES.radius, paddingHorizontal: 16, paddingVertical: 14, fontSize: SIZES.md, color: COLORS.text },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background },
  typeChipActive: { borderColor: COLORS.primary, backgroundColor: '#f0fdf4' },
  typeText: { fontSize: SIZES.xs, color: COLORS.textSecondary },
  typeTextActive: { color: COLORS.primary, ...FONTS.semibold },
  imageRow: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  imageThumb: { width: 64, height: 64, borderRadius: SIZES.radius, backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  imageIcon: { fontSize: 24 },
  addImageBtn: { width: 64, height: 64, borderRadius: SIZES.radius, borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  addImageText: { fontSize: 28, color: COLORS.textLight },
  nextBtn: { backgroundColor: COLORS.primary, borderRadius: SIZES.radius, paddingVertical: 16, alignItems: 'center', ...SHADOWS.button },
  nextText: { color: COLORS.white, fontSize: SIZES.md, ...FONTS.semibold },
  navRow: { flexDirection: 'row', gap: 12 },
  backBtn: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: SIZES.radius, paddingVertical: 16, alignItems: 'center' },
  backText: { color: COLORS.text, fontSize: SIZES.md, ...FONTS.medium },
  submitBtn: { flex: 2, backgroundColor: COLORS.primary, borderRadius: SIZES.radius, paddingVertical: 16, alignItems: 'center', ...SHADOWS.button },
  submitText: { color: COLORS.white, fontSize: SIZES.md, ...FONTS.semibold },
  // Selector dynamic styles
  field: { marginBottom: 16 },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background },
  optionChipActive: { borderColor: COLORS.primary, backgroundColor: '#f0fdf4' },
  optionText: { fontSize: SIZES.xs, color: COLORS.textSecondary },
  optionTextActive: { color: COLORS.primary, ...FONTS.semibold },
});
