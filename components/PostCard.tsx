import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../lib/theme';
import type { Post, Profile, Reaction } from '../lib/types';

function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.round(mins / 60)}h ago`;
}

export function PostCard({
  post,
  author,
  reactions,
  prompt,
  onPress,
  onLike,
}: {
  post: Post;
  author?: Profile;
  reactions: Reaction[];
  prompt?: string;
  onPress: () => void;
  onLike: () => void;
}) {
  const likes = reactions.filter((r) => r.kind === 'like').length;
  const emojis = reactions.filter((r) => r.kind === 'emoji').map((r) => r.value);
  const comments = reactions.filter((r) => r.kind === 'comment').length;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.avatar}>{author?.avatar ?? '🙂'}</Text>
        <Text style={styles.name}>{author?.name ?? 'Someone'}</Text>
        <Text style={styles.time}>{timeAgo(post.createdAt)}</Text>
      </View>

      {post.kind === 'photo' ? (
        <Image source={{ uri: post.content }} style={styles.photo} resizeMode="cover" />
      ) : (
        <Text style={styles.body}>{post.content}</Text>
      )}
      {prompt ? <Text style={styles.prompt}>{prompt}</Text> : null}

      <View style={styles.footer}>
        <Pressable onPress={onLike} hitSlop={8}>
          <Text style={styles.action}>❤️ {likes}</Text>
        </Pressable>
        <Text style={styles.action}>💬 {comments}</Text>
        {emojis.length > 0 && <Text style={styles.action}>{emojis.join(' ')}</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: { fontSize: 22 },
  name: { fontWeight: '700', color: colors.text, flex: 1 },
  time: { color: colors.muted, fontSize: 12 },
  body: { marginTop: spacing.sm, fontSize: 15, color: colors.text, lineHeight: 21 },
  photo: { marginTop: spacing.sm, width: '100%', height: 200, borderRadius: radius.sm },
  prompt: { marginTop: spacing.sm, fontSize: 13, color: colors.muted, lineHeight: 18 },
  footer: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  action: { color: colors.muted, fontSize: 14 },
});
