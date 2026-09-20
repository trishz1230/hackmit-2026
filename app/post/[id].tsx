import React, { useEffect, useState } from 'react';
import { Image, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../../components/Handwriting';
import { useLocalSearchParams } from 'expo-router';
import { AvatarFace } from '../../components/AvatarFace';
import { AvatarButton } from '../../components/AvatarButton';
import { KeyboardScreen } from '../../components/KeyboardScreen';
import { VoiceNote } from '../../components/VoiceNote';
import { firstEmoji, tallyEmoji } from '../../lib/reactions';
import { useApp } from '../../lib/store';
import { colors, radius, spacing } from '../../lib/theme';

const EMOJIS = ['❤️', '😂', '🔥', '🥹', '👏', '🍜'];

function e164(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return `+${digits}`;
}

export default function PostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { posts, hangoutPosts, me, memberById, reactionsFor, addReaction, toggleEmoji, toggleLike, likedByMe, markPostSeen, promptFor } = useApp();
  const [comment, setComment] = useState('');
  const [ownEmoji, setOwnEmoji] = useState('');
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    if (id) markPostSeen(id);
  }, [id]);

  const post = [...posts, ...hangoutPosts].find((p) => p.id === id);
  if (!post) return <Text style={styles.missing}>Post not found</Text>;

  const author = memberById(post.userId);
  const prompt = promptFor(post.taskId);
  const reactions = reactionsFor(post.id);
  const comments = reactions.filter((r) => r.kind === 'comment');
  const likes = reactions.filter((r) => r.kind === 'like').length;
  const liked = likedByMe(post.id);
  const emojis = tallyEmoji(reactions, me.id);

  const call = () => {
    if (author?.phone) void Linking.openURL(`tel:${e164(author.phone)}`);
  };

  const facetime = () => {
    if (!author?.phone) return;
    void Linking.openURL(`facetime://${e164(author.phone)}`);
  };

  const sendOwnEmoji = () => {
    const emoji = firstEmoji(ownEmoji);
    setOwnEmoji('');
    setPicking(false);
    if (emoji) toggleEmoji(post.id, emoji);
  };

  const sendComment = () => {
    if (!comment.trim()) return;
    addReaction(post.id, 'comment', comment.trim());
    setComment('');
  };

  return (
    <KeyboardScreen contentContainerStyle={styles.wrap}>
      <View style={styles.authorRow}>
        <AvatarFace value={author?.avatar} size={30} />
        <Text style={styles.author}>{author?.name}</Text>
        <View style={styles.spacer} />
        <AvatarButton />
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

      <View style={styles.actions}>
        <Pressable
          style={[styles.action, liked && styles.actionOn]}
          onPress={() => toggleLike(post.id)}
        >
          <Text style={[styles.actionText, liked && styles.actionTextOn]}>
            {liked ? '❤️' : '🤍'} {liked ? 'Liked' : 'Like'} ({likes})
          </Text>
        </Pressable>
        <Pressable style={styles.action} onPress={call} disabled={!author?.phone}>
          <Text style={styles.actionText}>📞 Call</Text>
        </Pressable>
        {Platform.OS === 'ios' ? (
          <Pressable style={styles.action} onPress={facetime} disabled={!author?.phone}>
            <Text style={styles.actionText}>📹 FaceTime</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.emojiRow}>
        {EMOJIS.map((e) => (
          <Pressable key={e} style={styles.emoji} onPress={() => toggleEmoji(post.id, e)}>
            <Text style={styles.emojiText}>{e}</Text>
          </Pressable>
        ))}
        <Pressable style={styles.emoji} onPress={() => setPicking((on) => !on)}>
          <Text style={styles.emojiText}>➕</Text>
        </Pressable>
      </View>

      {picking ? (
        <View style={styles.commentRow}>
          <TextInput
            style={styles.input}
            value={ownEmoji}
            onChangeText={setOwnEmoji}
            autoFocus
            placeholder="Any emoji from your keyboard…"
            placeholderTextColor={colors.muted}
            onSubmitEditing={sendOwnEmoji}
          />
          <Pressable style={styles.send} onPress={sendOwnEmoji}>
            <Text style={styles.sendText}>Add</Text>
          </Pressable>
        </View>
      ) : null}

      {emojis.length > 0 && (
        <View style={styles.tallyRow}>
          {emojis.map((t) => (
            <Pressable
              key={t.value}
              style={[styles.tally, t.mine && styles.tallyMine]}
              onPress={() => toggleEmoji(post.id, t.value)}
            >
              <Text style={styles.tallyEmoji}>{t.value}</Text>
              <Text style={[styles.tallyCount, t.mine && styles.tallyCountMine]}>{t.count}</Text>
            </Pressable>
          ))}
        </View>
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
    </KeyboardScreen>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.md, gap: spacing.sm },
  missing: { padding: spacing.lg, color: colors.muted },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  spacer: { flex: 1 },
  author: { fontSize: 18, fontWeight: '700', color: colors.text },
  photo: { width: '100%', height: 260, borderRadius: radius.md },
  prompt: { fontSize: 14, color: colors.muted, lineHeight: 20 },
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
  actionOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  actionText: { color: colors.text, fontWeight: '600', fontSize: 13, textAlign: 'center' },
  actionTextOn: { color: colors.accent, fontWeight: '700' },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  emoji: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  emojiText: { fontSize: 20 },
  tallyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tally: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  tallyMine: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  tallyEmoji: { fontSize: 16 },
  tallyCount: { fontSize: 13, fontWeight: '700', color: colors.muted },
  tallyCountMine: { color: colors.accent },
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
