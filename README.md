# FamStreak

A family streak app: everyone in the group gets the same task each cycle, a reminder
nags you until you do it, and posts land in a shared feed. If one person misses, the
whole group's streak resets. Hit the level goal and the family unlocks its reward.

Built with Expo, so the same code runs as an Android/iOS app **and** as a website
(react-native-web). On desktop web the UI is rendered inside a phone frame.

## Run it

```bash
npm install
npm run web      # browser
npm start        # then scan the QR code with Expo Go on a phone
```

It runs with mock data out of the box — no accounts or keys needed.

## Layout

| Path | Owner | What's in it |
| --- | --- | --- |
| `app/` | UI | Screens: `onboarding`, `index` (feed), `capture`, `post/[id]` (reactions) |
| `components/` | UI | `NagBanner`, `PostCard`, `ProgressBar`, `PhoneFrame` |
| `lib/store.tsx` | shared | App state, currently backed by mock data |
| `lib/api.ts` | backend | Every Supabase read/write |
| `lib/schema.sql` | backend | Database tables to run in the Supabase SQL editor |
| `lib/nag.ts` | shared | Repeating, non-dismissable Android reminder |
| `lib/mockData.ts` | shared | Seed data for the demo feed |

The split is by layer, not by screen: one person works in `lib/`, the other in
`app/` + `components/`, so you rarely touch the same file.

## Connecting the real backend

1. Create a project at [supabase.com](https://supabase.com).
2. Run `lib/schema.sql` in the SQL editor.
3. Storage → new public bucket named `photos`. Authentication → enable anonymous sign-ins.
4. Put your project URL and anon key in the `extra` block of `app.json`.
5. Replace the bodies in `lib/store.tsx` with the matching calls from `lib/api.ts`,
   one screen at a time — the feed first.

## The reminder

`lib/nag.ts` schedules a repeating local notification with Android's `sticky` flag,
so it can't be swiped away and re-fires until the task is done. No native foreground
service and no Firebase Cloud Messaging setup required. Local notifications work in
Expo Go; on web they're a no-op and the in-app `NagBanner` covers it.
