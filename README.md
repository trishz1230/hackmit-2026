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
| `app/` | UI | Screens: `onboarding`, `index` (feed), `levels` (level map), `capture`, `post/[id]` (reactions) |
| `components/` | UI | `NagBanner`, `PostCard`, `ProgressBar`, `PhoneFrame`, `LevelMap` |
| `lib/store.tsx` | shared | App state, currently backed by mock data |
| `lib/api.ts` | backend | Every Supabase read/write |
| `lib/schema.sql` | backend | Database tables to run in the Supabase SQL editor |
| `lib/nag.ts` | shared | Repeating, non-dismissable Android reminder |
| `lib/mockData.ts` | shared | Seed data, fallback prompts, scripted family replies |
| `lib/prompts.ts` | shared | Next task prompt, from OpenAI or the fallback list |

The split is by layer, not by screen: one person works in `lib/`, the other in
`app/` + `components/`, so you rarely touch the same file.

## The game loop

The family starts at level 1 with an empty feed. Everyone has to post for the
current task; when the last member posts, the level and the streak both go up, a
new prompt is drawn, and the feed clears. The feed shows who it's still waiting
on, and "Restart game" wipes everything back to onboarding.

For the demo, the other family members are scripted: after you post, they reply
one by one on a timer (`REPLY_DELAY_MS` and `familyReplies`). Delete that block
in `lib/store.tsx` once real members are posting through Supabase.

## Generated prompts

New prompts come from `api/prompt.ts`, a serverless function that calls OpenAI.
The key lives on the server, so nobody has to configure anything locally — clone
and run. If the endpoint is unset or fails, the app falls back to `taskPrompts`
in `lib/mockData.ts`, so it never breaks.

Deploy it once (one person, then everyone benefits):

```bash
npx vercel --prod                       # "Other" framework if it asks
npx vercel env add OPENAI_API_KEY production
npx vercel --prod                       # redeploy so the key is picked up
```

Then paste the resulting URL into `DEPLOYED_PROMPT_API` in `lib/prompts.ts`
(e.g. `https://famstreak.vercel.app/api/prompt`) and commit it — that URL is not
a secret. To point at a different endpoint on one machine only, set
`EXPO_PUBLIC_PROMPT_API` in `.env`.

## Connecting the real backend

1. Create a project at [supabase.com](https://supabase.com).
2. Run `lib/schema.sql` in the SQL editor.
3. Storage → new public bucket named `photos`. Authentication → enable anonymous sign-ins.
4. Put your project URL and anon key in the `extra` block of `app.json`.
5. Replace the bodies in `lib/store.tsx` with the matching calls from `lib/api.ts`,
   one screen at a time — the feed first.

## Level map art

`components/LevelMap.tsx` draws the Wonderland level path with placeholder art:
milestone nodes use the emoji in `MILESTONE_ICONS`, and every node is a styled
circle. To drop in real graphics, replace those emoji with `<Image>` and restyle
`styles.node` / `styles.nodeDone` / `styles.nodeCurrent` / `styles.nodeLocked`.
Path geometry lives in `position()` — `STEP` is vertical spacing, `AMPLITUDE` is
how far the path swings sideways.

## The reminder

`lib/nag.ts` schedules a repeating local notification with Android's `sticky` flag,
so it can't be swiped away and re-fires until the task is done. No native foreground
service and no Firebase Cloud Messaging setup required. Local notifications work in
Expo Go; on web they're a no-op and the in-app `NagBanner` covers it.
