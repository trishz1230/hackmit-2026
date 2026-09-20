# btw

A family streak app — *between us*: everyone in the group gets the same task each cycle, a reminder
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
| `app/` | UI | Screens: `onboarding`, `index` (level feed), `hangout` (casual feed), `settings`, `levels` (level map), `capture`, `post/[id]` (reactions) |
| `components/` | UI | `NagBanner`, `PostCard`, `ProgressBar`, `PhoneFrame`, `LevelMap`, `Tabs` |
| `lib/store.tsx` | shared | App state: live (Supabase) or mock, picked automatically |
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
new prompt is generated, and the next level's task begins. The feed shows who
it's still waiting on.

Levels are strict: only posts answering the current task count, so nothing in
the Hangout tab can clear a level. The **Hangout** tab is for anything else —
same photo/text capture and reactions, zero effect on progress.

The level duration picked at onboarding (1 day / 3 days / a week) only sets how
often the reminder re-fires (`lib/nag.ts`); it never blocks posting or delays a
level. Change it, the reward, or the number of levels any time in **Family
settings** (link on the feed) — changes sync to everyone.

Without Supabase keys the app runs in **demo mode**: the relatives are scripted
and reply on a timer (`REPLY_DELAY_MS`, `familyReplies`) so one person can show
the whole loop. With keys it runs **live** — see below.

## The AI, and which model does what

Two models, two jobs (`api/_model.ts` picks per route; either covers the other
when only one key is set):

| Route | Model | Job |
| --- | --- | --- |
| `api/describe.ts` | Muse Spark vision, Muse Voice Transcribe | read the family's photos and recordings |
| `api/prompt.ts` | Muse Spark | write the next level's prompt from what they shared |
| `api/stats.ts` | OpenAI `gpt-4o-mini` | name the week's two stat cards and award each to a member |

The keys live on the server, so nobody has to configure anything locally — clone
and run. If an endpoint is unset or fails the app falls back on its own: prompts
to `taskPrompts` in `lib/mockData.ts`, stat cards to the counted pair in
`lib/week.ts`.

Deploy it once (one person, then everyone benefits):

```bash
npx vercel --prod                       # "Other" framework if it asks
npx vercel env add MODEL_API_KEY production    # Muse, from Meta's Model API
npx vercel env add OPENAI_API_KEY production
npx vercel --prod                       # redeploy so the keys are picked up
```

Then paste the resulting URL into `DEPLOYED_PROMPT_API` in `lib/prompts.ts`
(e.g. `https://btw.vercel.app/api/prompt`) and commit it — that URL is not
a secret. To point at a different endpoint on one machine only, set
`EXPO_PUBLIC_PROMPT_API` in `.env`.

## Real families (Supabase)

With Supabase configured, families are shared: one person creates a family, the
others join with the code from the feed, and every post, reaction, and level-up
shows up on everyone's screen over realtime — no refresh.

1. Create a project at [supabase.com](https://supabase.com) (free).
2. SQL Editor → paste all of `lib/schema.sql` → Run. That creates the tables,
   the public `photos` bucket, and its policies.
3. Settings → API → copy the **Project URL** and the **anon public** key into
   `PROJECT_URL` / `ANON_KEY` at the top of `lib/supabase.ts` and commit them.
   The anon key is a public client key, not a secret.

There is no login: each device generates a uuid on first run and stores it in
AsyncStorage, which is why the schema leaves row level security off. That's fine
for a demo and must not ship as-is.

Two people on two laptops = two devices, so the same browser profile can't be
two family members; use a second browser or an incognito window to test.

## One shared website

`vercel.json` builds the Expo web export and serves `api/prompt.ts` alongside it,
so `npx vercel --prod` gives you a single URL that everyone opens — that's the
demo. Pushes to `main` redeploy it automatically once the project is linked.

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
