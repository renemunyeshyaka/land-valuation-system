import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/theme';
import { marketplaceAPI } from '../services/api';

export default function MarketplaceScreen({ navigation }) {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => { fetchProperties(); }, []);

  const fetchProperties = async () => {
    try {
      const res = await marketplaceAPI.listForSale({ page, limit: 10 });
      const data = res.data?.data?.data || [];
      setProperties(prev => [...prev, ...data]);
      setHasMore(data.length === 10);
    } catch {} finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card}>
      <View style={styles.cardImage}>
        <Text style={styles.imagePlaceholder}>🏘️</Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardLocation}>{item.district}, {item.sector}</Text>
        <Text style={styles.cardPrice}>RWF {item.price?.toLocaleString()}</Text>
        <View style={styles.cardStats}>
          <Text style={styles.stat}>👁️ {item.views || 0}</Text>
          <Text style={styles.stat}>❤️ {item.interested || 0}</Text>
          <Text style={styles.stat}>📐 {item.land_size || item.plot_size_sqm} sqm</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={properties}
        renderItem={renderItem}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No properties found</Text>}
        onEndReached={() => { if (hasMore) { setPage(p => p + 1); fetchProperties(); } }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  card: { backgroundColor: COLORS.surface, borderRadius: SIZES.radius, marginBottom: 16, overflow: 'hidden', ...SHADOWS.card },
  cardImage: { height: 160, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },
  imagePlaceholder: { fontSize: 48 },
  cardContent: { padding: 16 },
  cardTitle: { fontSize: SIZES.md, ...FONTS.semibold, color: COLORS.text, marginBottom: 4 },
  cardLocation: { fontSize: SIZES.xs, color: COLORS.textSecondary, marginBottom: 8 },
  cardPrice: { fontSize: SIZES.lg, ...FONTS.bold, color: COLORS.primary, marginBottom: 8 },
  cardStats: { flexDirection: 'row', gap: 16 },
  stat: { fontSize: SIZES.xs, color: COLORS.textSecondary },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 60, fontSize: SIZES.md },
});
