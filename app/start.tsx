import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '../components/Handwriting';
import { FaceLayers } from '../components/AvatarFace';
import { paper, radius, spacing } from '../lib/theme';

/** The welcome animation lands here: pick a family to join or start one. */

const FACE = 120;

/** Three of the drawn faces, waving from the page the family starts on. */
const GREETERS = [
  { eyes: 0, mouth: 2, hair: 0 },
  { eyes: 0, mouth: 1, hair: 1 },
  { eyes: 0, mouth: 0, hair: 2 },
];

export default function Start() {
  const router = useRouter();

  return (
    <View style={styles.page}>
      <View style={styles.faces}>
        {GREETERS.map((face, i) => (
          <FaceLayers key={i} face={face} size={FACE} />
        ))}
      </View>

      <View style={styles.buttons}>
        <Pressable style={styles.button} onPress={() => router.push('/avatar?mode=join')}>
          <Text style={styles.label}>join a fam.</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={() => router.push('/avatar?mode=create')}>
          <Text style={styles.label}>create a fam.</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: paper.page, justifyContent: 'center' },
  faces: { flexDirection: 'row', justifyContent: 'center', paddingHorizontal: spacing.md },
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
