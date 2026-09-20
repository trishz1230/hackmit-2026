# btw

A family app — *between us*: everyone in the family gets the same prompt each
level, answers it with a photo, a voice note or a few words, and the answers land
in a shared feed. A level only clears once every member has answered, so the
family climbs the path together and unlocks the reward it picked. Miss a period
and the level starts over.

Built with Expo, so the same code runs as an iOS/Android app **and** as a website
(react-native-web). On desktop web the UI is rendered inside a phone frame.

## Run it

```bash
npm install
npm run web      # browser
npm start        # then scan the QR code with Expo Go on a phone
```

It runs with demo data out of the box — no accounts or keys needed.

## Layout

| Path | What's in it |
| --- | --- |
| `app/welcome.tsx`, `app/start.tsx` | Hold-to-start smiley, then create or join a family |
| `app/avatar.tsx`, `app/family.tsx` | Draw your face, then meet everyone already in the family |
| `app/(tabs)/index.tsx` | Home: this week's stat cards |
| `app/(tabs)/path.tsx` | The level path, the progress bar and the reward |
| `app/(tabs)/feed.tsx`, `app/(tabs)/hangout.tsx`, `app/(tabs)/plus.tsx` | Family task feed, hangout feed, and the ＋ share |
| `app/(tabs)/level/[n].tsx` | One level: its prompt, its answers, and how to answer it |
| `app/capture.tsx`, `app/post/[id].tsx` | Write / photograph / record an answer; a post with its reactions |
| `app/history/` | Every day the family posted |
| `components/` | `LevelMap`, `AvatarFace`, `PostCard`, `PostStack`, `VoiceNote`, `NavBar`, `PhoneFrame`, `Confetti`, … |
| `lib/store.tsx` | App state: live (Supabase) or demo, picked automatically |
| `lib/api.ts` | Every Supabase read/write |
| `lib/schema.sql` | Database tables to run in the Supabase SQL editor |
| `lib/levels.ts` | When a level opens, when it clears, which posts count |
| `lib/posts.ts` | Task answer vs hangout share, and the ＋ lock |
| `lib/prompts.ts`, `lib/describe.ts`, `lib/weekCards.ts` | Calls to the AI routes, with local fallbacks |
| `lib/nag.ts` | The repeating reminder notification |
| `lib/mockData.ts` | Seed family, fallback prompts, scripted replies |

## The game loop

The family starts at level 1 with an empty feed. Everyone answers the current
prompt; when the last member answers, the level and the streak both go up and the
next level's prompt is written from what the family just shared. The feed shows
who it's still waiting on, with their drawn faces.

**Your first answer to a level is the task answer. Anything you post after that,
while the level is still current, is a hangout share** (`isExtraPost` in
`lib/posts.ts`) and counts toward nothing. That's also why the ＋ is locked until
you've answered a task you can actually answer (`hangoutLocked`).

Levels are also timed (`lib/levels.ts`). The cadence picked at onboarding —
1 day / 3 days / 1 week — decides both when the next level opens (local midnight
after the period) and how long the family has to finish it. Finish early and the
map says "everyone posted, level N opens soon"; miss the window and the level's
task is re-issued, so the previous run's answers stop counting and the streak
resets.

Without Supabase keys the app runs in **demo mode**: the relatives are scripted
and reply on a timer (`REPLY_DELAY_MS`, `familyReplies`) so one person can show
the whole loop, and Settings has switches for "end this period now" and "someone
missed a day". With keys it runs **live** — see below.

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
   the public `photos` bucket (photos *and* voice notes), and its policies. It is
   re-runnable, so run it again after pulling a schema change.
3. Settings → API → copy the **Project URL** and the **anon public** key into
   `PROJECT_URL` / `ANON_KEY` at the top of `lib/supabase.ts` and commit them.
   The anon key is a public client key, not a secret.

There is no login: each device generates a uuid on first run and stores it in
AsyncStorage (`btw.userId`), which is why the schema leaves row level security
off. That's fine for a demo and must not ship as-is.

Two people on two laptops = two devices, so the same browser profile can't be
two family members; use a second browser or an incognito window to test.

## One shared website

`vercel.json` builds the Expo web export and serves the `api/` routes alongside
it, so `npx vercel --prod` gives you a single URL that everyone opens — that's the
demo. Pushes to `main` redeploy it automatically once the project is linked.

## Posts

A post is a photo, a voice note or text (`posts.kind`). Photos and recordings go
to the Supabase `photos` bucket; recordings are converted to WAV first
(`lib/wav.ts`) and read off disk rather than fetched, because React Native can't
turn a `file://` URI into an uploadable blob. Reactions are a like, an emoji or a
comment, all in the `reactions` table.

## Level map art

`components/LevelMap.tsx` draws the path with the painted markers in `assets/levels`
(`ART`, repeating once the path outgrows them) and the envelope for the reward.
Path geometry lives in `position()` — `STEP` is vertical spacing, `AMPLITUDE` is
how far the path swings sideways, and `REWARD_GAP` is the climb from the last
level up to the reward.

Avatars are drawn the same way: `components/AvatarFace.tsx` layers hair, eyes and
a mouth from `assets/avatar` over a head, and stores the choice as
`face:eyes,mouth,hair` in the profile's `avatar` column.

## The reminder

`lib/nag.ts` schedules a repeating local notification with Android's `sticky` flag,
so it can't be swiped away and re-fires until the task is done. No native foreground
service and no Firebase Cloud Messaging setup required. Local notifications work in
Expo Go; on web they're a no-op.
