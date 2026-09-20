import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '../components/Handwriting';
import { paper, radius, spacing } from '../lib/theme';

/** The welcome animation lands here: pick a family to join or start one. */

const FACE = 104;

const GREETERS = [
  require('../assets/start/face-1.png'),
  require('../assets/start/face-2.png'),
  require('../assets/start/face-3.png'),
];

export default function Start() {
  const router = useRouter();

  return (
    <View style={styles.page}>
      <View style={styles.faces}>
        {GREETERS.map((face, i) => (
          <Image key={i} source={face} resizeMode="contain" style={styles.face} />
        ))}
      </View>

      <View style={styles.buttons}>
        <Pressable style={styles.button} onPress={() => router.push('/onboarding?mode=join')}>
          <Text style={styles.label}>join a fam.</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={() => router.push('/onboarding?mode=create')}>
          <Text style={styles.label}>create a fam.</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: paper.page, justifyContent: 'center' },
  faces: { flexDirection: 'row', justifyContent: 'center', paddingHorizontal: spacing.md },
  face: { width: FACE, height: FACE * 1.1, marginHorizontal: -2 },
  buttons: {
    marginTop: spacing.lg,
    paddingRight: spacing.lg,
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  button: {
    backgroundColor: paper.button,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  label: { fontSize: 20, color: paper.ink },
});
