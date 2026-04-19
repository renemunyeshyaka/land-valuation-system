import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const Footer = () => (
  <View style={styles.footer}>
    <Text style={styles.text}>
      Certified by National Cybersecurity Authority (NCSA) Data Protection & Privacy Office (DPO)
    </Text>
  </View>
);

const styles = StyleSheet.create({
  footer: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 8,
    backgroundColor: '#064e3b', // Emerald-900
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 0,
    left: 0,
  },
  text: {
    color: '#fff',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 0.1,
  },
});

export default Footer;
