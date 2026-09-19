import React from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { colors } from '../lib/theme';

/**
 * On web, renders children inside a phone-shaped frame so the app still reads
 * as a mobile app in a browser. On a real device it renders nothing extra.
 */
export function PhoneFrame({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const framed = Platform.OS === 'web' && width > 600;

  if (!framed) return <View style={styles.fill}>{children}</View>;

  return (
    <View style={styles.backdrop}>
      <View style={styles.phone}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2B2119',
  },
  phone: {
    width: 390,
    height: 780,
    maxHeight: '96%',
    borderRadius: 42,
    borderWidth: 10,
    borderColor: '#141414',
    overflow: 'hidden',
    backgroundColor: colors.bg,
    boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
  },
});
