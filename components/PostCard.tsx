import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Handwriting';
import { AvatarFace } from './AvatarFace';
import { VoiceNote } from './VoiceNote';
import { tallyEmoji } from '../lib/reactions';
import { useApp } from '../lib/store';
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
  liked,
}: {
  post: Post;
  author?: Profile;
  reactions: Reaction[];
  prompt?: string;
  onPress: () => void;
  onLike: () => void;
  liked: boolean;
}) {
  const { me } = useApp();
  const mine = post.userId === me.id;
  const likes = reactions.filter((r) => r.kind === 'like').length;
  const emojis = tallyEmoji(reactions, '');
  const comments = reactions.filter((r) => r.kind === 'comment').length;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <AvatarFace value={author?.avatar} size={28} />
        <Text style={styles.name}>{author?.name ?? 'Someone'}</Text>
        <Text style={styles.time}>{timeAgo(post.createdAt)}</Text>
      </View>

      {post.kind === 'photo' ? (
        <>
          <Image source={{ uri: post.content }} style={styles.photo} resizeMode="cover" />
          {post.caption ? <Text style={styles.body}>{post.caption}</Text> : null}
        </>
      ) : post.kind === 'voice' ? (
        <>
          <VoiceNote uri={post.content} />
          {post.caption ? <Text style={styles.body}>{post.caption}</Text> : null}
        </>
      ) : (
        <Text style={styles.body}>{post.content}</Text>
      )}
      {prompt ? <Text style={styles.prompt}>{prompt}</Text> : null}

      <View style={styles.footer}>
        {mine ? (
          <Text style={styles.action}>❤️ {likes}</Text>
        ) : (
          <Pressable onPress={onLike} hitSlop={8}>
            <Text style={[styles.action, liked && styles.liked]}>
              {liked ? '❤️' : '🤍'} {likes}
            </Text>
          </Pressable>
        )}
        <Text style={styles.action}>💬 {comments}</Text>
        {emojis.map((t) => (
          <Text key={t.value} style={styles.action}>
            {t.value} {t.count}
          </Text>
        ))}
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
  name: { fontWeight: '700', color: colors.text, flex: 1 },
  time: { color: colors.muted, fontSize: 12 },
  body: { marginTop: spacing.sm, fontSize: 15, color: colors.text, lineHeight: 21 },
  photo: { marginTop: spacing.sm, width: '100%', height: 200, borderRadius: radius.sm },
  prompt: { marginTop: spacing.sm, fontSize: 13, color: colors.muted, lineHeight: 18 },
  footer: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  action: { color: colors.muted, fontSize: 14 },
  liked: { color: colors.accent, fontWeight: '700' },
});
