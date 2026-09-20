import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from './Handwriting';
import { colors, radius, spacing } from '../lib/theme';

/**
 * The emoji keyboard for reactions. A picked grid rather than a text field, so
 * every reaction is an emoji on every platform (a phone keyboard can be swapped
 * to letters, and a desktop browser has no emoji key at all).
 */
const GROUPS: { name: string; emoji: string[] }[] = [
  {
    name: 'smileys',
    emoji: [
      '😀', '😂', '🥹', '🥰', '😍', '😘', '😎', '🤩', '🥳', '🤗',
      '🤔', '😴', '😭', '😱', '🙃', '😅', '😇', '🤪', '😤', '🥺',
    ],
  },
  {
    name: 'hearts',
    emoji: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🤍', '💖', '💞', '💘'],
  },
  {
    name: 'hands',
    emoji: ['👏', '🙌', '👍', '👎', '🤝', '🙏', '💪', '✌️', '🤙', '👋'],
  },
  {
    name: 'life',
    emoji: [
      '🔥', '✨', '🎉', '🎂', '🌸', '🌞', '🌈', '⭐️', '🍜', '🍕',
      '☕️', '🍰', '🐶', '🐱', '⚽️', '🎶', '📸', '🏡', '🚗', '✈️',
    ],
  },
];

export function EmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.body} nestedScrollEnabled>
      {GROUPS.map((group) => (
        <View key={group.name}>
          <Text style={styles.title}>{group.name}</Text>
          <View style={styles.grid}>
            {group.emoji.map((e) => (
              <Pressable key={e} style={styles.key} onPress={() => onPick(e)} hitSlop={2}>
                <Text style={styles.keyText}>{e}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    maxHeight: 220,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  body: { padding: spacing.sm, gap: spacing.sm },
  title: { fontSize: 13, color: colors.muted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: 2 },
  key: { paddingHorizontal: 6, paddingVertical: 4 },
  keyText: { fontSize: 24 },
});
