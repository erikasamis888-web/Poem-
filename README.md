# Community Poems

Create "poem threads", each with its own QR code. People scan the code, add one
word at a time, and Claude turns the words into a poem, adding only small
connecting words (a, the, of, and…). Each thread keeps two cached versions:
**In order** (words in the order they arrived) and **Rearranged**.

## Pages

| Address | Who | What |
|---|---|---|
| `/p/<code>` | Public (via QR) | Add a word, then see the poem |
| `/admin` | You (password) | All threads, live word counts, create new |
| `/admin/<id>` | You (password) | QR code, both poems, words, open/close |

## Settings (environment variables)

| Name | What it is |
|---|---|
| `DATABASE_URL` | Postgres database address. Vercel's Neon integration fills this in. |
| `ANTHROPIC_API_KEY` | Your Claude API key. Without it, poems are just the words in lines. |
| `ADMIN_PASSWORD` | Password for the `/admin` pages. |

The database tables are created automatically the first time the app runs.

## Running on your computer

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # open http://localhost:3000
```
