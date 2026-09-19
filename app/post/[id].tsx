import React, { useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useApp } from '../../lib/store';
import { colors, radius, spacing } from '../../lib/theme';

const EMOJIS = ['❤️', '😂', '🔥', '🥹', '👏', '🍜'];

export default function PostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { posts, memberById, reactionsFor, addReaction } = useApp();
  const [comment, setComment] = useState('');

  const post = posts.find((p) => p.id === id);
  if (!post) return <Text style={styles.missing}>Post not found</Text>;

  const author = memberById(post.userId);
  const reactions = reactionsFor(post.id);
  const comments = reactions.filter((r) => r.kind === 'comment');
  const likes = reactions.filter((r) => r.kind === 'like').length;
  const emojis = reactions.filter((r) => r.kind === 'emoji');

  const call = () => {
    if (author?.phone) void Linking.openURL(`tel:${author.phone}`);
  };

  const sendComment = () => {
    if (!comment.trim()) return;
    addReaction(post.id, 'comment', comment.trim());
    setComment('');
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.author}>
        {author?.avatar} {author?.name}
      </Text>

      {post.kind === 'photo' ? (
        <Image source={{ uri: post.content }} style={styles.photo} resizeMode="cover" />
      ) : (
        <Text style={styles.body}>{post.content}</Text>
      )}

      <View style={styles.actions}>
        <Pressable style={styles.action} onPress={() => addReaction(post.id, 'like', '1')}>
          <Text style={styles.actionText}>❤️ Like ({likes})</Text>
        </Pressable>
        <Pressable style={styles.action} onPress={call} disabled={!author?.phone}>
          <Text style={styles.actionText}>📞 Call {author?.name}</Text>
        </Pressable>
      </View>

      <View style={styles.emojiRow}>
        {EMOJIS.map((e) => (
          <Pressable key={e} style={styles.emoji} onPress={() => addReaction(post.id, 'emoji', e)}>
            <Text style={styles.emojiText}>{e}</Text>
          </Pressable>
        ))}
      </View>

      {emojis.length > 0 && (
        <Text style={styles.emojiSummary}>{emojis.map((r) => r.value).join(' ')}</Text>
      )}

      <Text style={styles.sectionTitle}>Comments</Text>
      {comments.length === 0 && <Text style={styles.empty}>No comments yet.</Text>}
      {comments.map((c) => (
        <Text key={c.id} style={styles.comment}>
          <Text style={styles.commentAuthor}>{memberById(c.userId)?.name ?? 'Someone'}: </Text>
          {c.value}
        </Text>
      ))}

      <View style={styles.commentRow}>
        <TextInput
          style={styles.input}
          value={comment}
          onChangeText={setComment}
          placeholder="Say something nice…"
          placeholderTextColor={colors.muted}
          onSubmitEditing={sendComment}
        />
        <Pressable style={styles.send} onPress={sendComment}>
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.md, gap: spacing.sm },
  missing: { padding: spacing.lg, color: colors.muted },
  author: { fontSize: 18, fontWeight: '700', color: colors.text },
  photo: { width: '100%', height: 260, borderRadius: radius.md },
  body: { fontSize: 17, color: colors.text, lineHeight: 24 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  action: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.sm,
    alignItems: 'center',
  },
  actionText: { color: colors.text, fontWeight: '600' },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  emoji: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  emojiText: { fontSize: 20 },
  emojiSummary: { fontSize: 18 },
  sectionTitle: { marginTop: spacing.md, fontWeight: '700', color: colors.text },
  empty: { color: colors.muted, fontSize: 14 },
  comment: { color: colors.text, fontSize: 15 },
  commentAuthor: { fontWeight: '700' },
  commentRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.sm,
    color: colors.text,
  },
  send: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  sendText: { color: '#fff', fontWeight: '700' },
});
