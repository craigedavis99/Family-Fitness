# Getting Started — Zero to Deployed App
### A step-by-step guide for building the Family Fitness Tracker with Cursor

Follow this top to bottom. Nothing here assumes you've used Cursor before. Budget about 45–60 minutes for setup (Steps 1–6) before you write any code.

---

## Step 1 — Create your accounts (10 min)

You need four free accounts. Use the same email for all of them to keep life simple.

1. **GitHub** — github.com (you may already have one)
2. **Supabase** — supabase.com → "Start your project" → sign in **with GitHub**
3. **Vercel** — vercel.com → sign in **with GitHub** (you've done this before)
4. **Cursor** — cursor.com → download the app + create an account. The free Hobby tier works to start; if you burn through the included requests, Pro is $20/mo.

---

## Step 2 — Install the tools on your computer (10 min)

You need three things installed:

**1. Node.js (the runtime Next.js needs)**
- Go to nodejs.org → download the **LTS** version → run the installer, accept all defaults.
- Verify: open a terminal (Windows: search "PowerShell"; Mac: Terminal app) and run:
  ```
  node --version
  npm --version
  ```
  Both should print version numbers. If not, close and reopen the terminal.

**2. Git**
- Windows: git-scm.com → download → install with all defaults.
- Mac: run `git --version` in Terminal — it will offer to install itself.
- One-time setup (use your GitHub email):
  ```
  git config --global user.name "Craig"
  git config --global user.email "you@youremail.com"
  ```

**3. Cursor**
- Install from the download in Step 1, open it, and sign in.
- When it asks about importing VS Code settings, skip it (you don't have any).

---

## Step 3 — Create ONE GitHub repository (5 min)

You only need **one repo**. You do not create folders on GitHub — Next.js will generate the entire folder structure locally, and Git pushes it up.

1. On github.com → click **+** (top right) → **New repository**
2. Name: `family-fitness-app`
3. Visibility: **Private**
4. Do **not** check "Add a README" (leave it completely empty)
5. Click **Create repository**. Leave the page open — you'll need the URL it shows, which looks like:
   `https://github.com/YOURUSERNAME/family-fitness-app.git`

---

## Step 4 — Create your local folder and the project (10 min)

**Local folder structure:** keep all your coding projects under one parent folder. Open your terminal and run:

```
# Windows (PowerShell)
mkdir C:\dev
cd C:\dev

# Mac
mkdir ~/dev
cd ~/dev
```

**Now create the Next.js project** (this generates the whole app skeleton):

```
npx create-next-app@latest family-fitness-app
```

It will ask setup questions. Answer:
- TypeScript? → **Yes**
- ESLint? → **Yes**
- Tailwind CSS? → **Yes**
- `src/` directory? → **Yes**
- App Router? → **Yes**
- Turbopack? → **Yes** (or accept default)
- Customize import alias? → **No**

When it finishes, connect it to your GitHub repo:

```
cd family-fitness-app
git remote add origin https://github.com/YOURUSERNAME/family-fitness-app.git
git branch -M main
git push -u origin main
```

(The first push may pop up a GitHub login window — approve it.)

**Finally, put the spec in the project.** Copy `family-fitness-app-spec.md` into the project folder and rename it `SPEC.md`. Your folder now looks like:

```
C:\dev\family-fitness-app\
├── SPEC.md              ← the build spec (you added this)
├── src\                 ← app code lives here (generated)
├── public\              ← images/static files (generated)
├── package.json         ← project config (generated)
└── ...other generated files — don't touch them
```

That's all the folder creation you'll ever do manually. Cursor creates everything else.

---

## Step 5 — Set up Supabase (10 min)

1. In Supabase → **New project**
   - Name: `family-fitness`
   - Database password: generate one and **save it in your password manager**
   - Region: pick the US East option
2. Wait ~2 minutes for it to provision.
3. Go to **Project Settings → API** and copy three values into a notes file for now:
   - **Project URL**
   - **anon / public key**
   - **service_role key** (⚠️ secret — never goes in client code or GitHub)
4. Go to **Authentication → Providers → Email** and turn **OFF** "Allow new users to sign up." (Admin will create accounts; nobody self-registers.)
5. Back in your project folder, create a file named `.env.local` (Cursor can do this — see Step 6) containing:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
   `.env.local` is automatically ignored by Git, so secrets never get pushed.

---

## Step 6 — Learn Cursor in 5 minutes

Open Cursor → **File → Open Folder** → select `C:\dev\family-fitness-app`.

The four things you actually need to know:

1. **The chat panel** — press **Ctrl+L** (Mac: Cmd+L) to open it. This is where you talk to the AI. It can read your whole project, write files, and run terminal commands.
2. **Agent mode** — at the bottom of the chat panel there's a mode selector. Make sure it's set to **Agent** (not "Ask"). Agent mode is what lets it create and edit files for you. This is "vibe coding."
3. **The model picker** — next to the mode selector. Set it to **Composer** (Cursor's own model — cheap and included) or **Kimi K2.7 Code** if available. Save Claude/GPT for when the cheap model gets stuck.
4. **@-mentions** — typing `@SPEC.md` in the chat attaches that file as context. You'll start **every** session with this.

When the agent proposes changes, you'll see diffs and **Accept / Reject** buttons. Early on, just skim what it did and click Accept — Git is your undo button (Step 8).

**Rules file (do this once):** create a file in the project root named `.cursorrules` with this content — the agent reads it automatically every session:

```
You are building the app defined in SPEC.md. Read it before making changes.
Follow the tech stack in SPEC.md exactly — do not substitute libraries.
Work on ONE build phase at a time; do not jump ahead.
After completing work, tell me exactly how to test it in the browser.
Never put SUPABASE_SERVICE_ROLE_KEY in client-side code.
Prefer simple, readable code over clever abstractions.
```

---

## Step 7 — Your first build session

Open the Cursor chat (Ctrl+L), Agent mode, and paste this:

> @SPEC.md
> Read the spec. We are starting **Phase 1 of the Build Order**: scaffold auth and the app shell. The Next.js project is already created and `.env.local` has the Supabase keys. Set up the Supabase client, login page, forced password-change flow, route protection, and the empty tab shell (Home | Input | My Plan | Log Workout | Admin). Install any packages you need. When done, tell me exactly how to run it and what I should see.

Let it work. It will install packages and create files — accept the changes. When it says it's done, run the app:

```
npm run dev
```

Open **http://localhost:3000** in your browser. That's your app, running locally. (Leave that terminal running; Ctrl+C stops it.)

You won't be able to log in yet — there are no users until Phase 2 creates the admin flow. The agent may offer to create a test user directly in Supabase; let it, or ask it to.

---

## Step 8 — Commit after every working phase

This is your save point / undo system. When a phase works, run in the terminal (or just tell the Cursor agent "commit and push this with a good message" — it will do it):

```
git add .
git commit -m "Phase 1: auth and app shell"
git push
```

If the agent ever wrecks something, `git checkout .` throws away all uncommitted changes and returns you to the last save point. This is why you commit **only when things work**.

---

## Step 9 — The working rhythm for Phases 2–7

For each phase in the spec's Build Order:

1. **Start a NEW chat** in Cursor (+ button in the chat panel). Long chats degrade cheap models.
2. First message: `@SPEC.md We completed Phase N. Now do Phase N+1: [paste the phase line from the spec]. Tell me how to test when done.`
3. Test it yourself in the browser at localhost:3000. Actually click around.
4. Broken? Describe what you saw vs. expected in the same chat. Paste any red error text from the browser or terminal — errors are gold to the agent.
5. Working? Commit and push (Step 8). Move to the next phase.

**When the model loops or flails** (rewrites the same file three times without fixing it): switch the model picker to Claude Sonnet for that one conversation, let it fix the problem, then switch back. That's the credit-efficient pattern.

For Phase 2 specifically (database schema): the agent will write SQL migration files. It will either run them via the Supabase CLI or tell you to paste the SQL into Supabase's **SQL Editor** (in the Supabase dashboard). Either is fine — pasting into the SQL Editor is the beginner-friendly path.

---

## Step 10 — Deploy to Vercel (10 min, do after Phase 3 or later)

You've done this part before, so briefly:

1. vercel.com → **Add New → Project** → import `family-fitness-app` from GitHub.
2. Before deploying, expand **Environment Variables** and add the same three variables from `.env.local`.
3. Deploy. You get a `something.vercel.app` URL immediately.
4. **Custom domain:** Project → Settings → Domains → add one of your repurposed domains → update the DNS records at your registrar as Vercel instructs (usually one A record or CNAME). Propagation takes minutes to a few hours.
5. From now on, **every `git push` auto-deploys**. That's the whole pipeline.

One Supabase follow-up after deploying: in Supabase → **Authentication → URL Configuration**, add your Vercel/custom domain to the Site URL and redirect URLs so login works in production, not just localhost.

---

## Quick-reference troubleshooting

| Symptom | Fix |
|---|---|
| `npm` / `node` not recognized | Reinstall Node LTS, then close and reopen the terminal |
| Agent edits files but app won't start | Paste the full terminal error into the chat |
| White screen / error in browser | Press F12 → Console tab → paste red errors into the chat |
| Login works locally but not on Vercel | Env vars missing in Vercel, or Supabase redirect URLs not set (Step 10.5) |
| Agent going in circles | New chat, switch to a stronger model, describe the problem fresh |
| Everything is broken and you're lost | `git checkout .` to return to last commit; worst case, `git log` + ask the agent to revert to a specific commit |
| Secrets accidentally in code | Stop; rotate keys in Supabase (Settings → API → regenerate); move to `.env.local` |

---

## The one-paragraph mental model

You never write code by hand. Your job is: keep `SPEC.md` accurate, feed the agent one phase at a time in fresh chats, test in the browser like a picky user, paste errors back verbatim, and commit at every working checkpoint. Cursor writes it, Git protects it, Vercel ships it, Supabase stores it.
