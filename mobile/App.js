
import React from 'react';
import { SafeAreaView, Text, View, StyleSheet } from 'react-native';
import Footer from './components/Footer';

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.title}>Land Valuation Mobile</Text>
      </View>
      <Footer />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60, // Space for footer
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#064e3b',
  },
});
