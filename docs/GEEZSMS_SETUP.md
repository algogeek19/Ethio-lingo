# GeezSMS Setup Guide (Ethio-Lingo Announcements)

Announcements are no longer shown inside the app. Admins broadcast them by SMS through
[GeezSMS](https://geezsms.com), and every delivery attempt is logged for auditing.

---

## 1. How it works

```
Admin → SMS Broadcast form (Admin → Community Moderation → SMS Broadcast)
     → POST /api/v1/announcements (admin-only)
     → server: persists the announcement as an audit record
     → server: resolves recipients (audience level + phone on file)
     → GeezSMS POST /api/v1/sms/send  (one request per recipient, concurrency 8)
     → server: writes one `sms_log` row per recipient (SENT / FAILED + error)
     → UI: live recipient count + delivery history
```

- **Endpoint (verified live):** `POST https://api.geezsms.com/api/v1/sms/send`
- **Auth header:** `Authorization: Bearer <GEEZSMS_TOKEN>`
- **Body:** `{ "phone": "2519XXXXXXXXX", "msg": "…", "sender_id": "…" }`
- **Balance check:** `GET https://api.geezsms.com/api/v1/balance`
- There is **no bulk endpoint** — the server sends per-recipient with a bounded pool, so a
  failure for one number never blocks the rest of the broadcast.
- Message budget: **330 characters** (GeezSMS allows ~335; the budget leaves room for the
  auto-generated `Broadcast · <date>` prefix). Longer messages must be split manually.

---

## 2. Getting your API token

1. Sign in at [geezsms.com](https://geezsms.com) with the account you already have.
2. Open the **API / Developer** section of the dashboard.
3. Copy (or generate) the API token for your account.
4. Optionally register an alphanumeric **Sender ID** (e.g. `EthioLingo`) or use the
   service's default shortcode. If you skip this, leave `GEEZSMS_SENDER_ID` empty.
5. Make sure the account has balance (SMS are pay-as-you-go, ~0.65 ETB each at time of writing).

> Security: the token is a live secret. Keep it only in environment variables. If you ever
> paste it into a chat, issue, or commit, rotate it from the dashboard immediately.

---

## 3. Configuring the backend

**Local development** — add to `server/.env` (git-ignored):

```env
GEEZSMS_BASE_URL=https://api.geezsms.com/api/v1
GEEZSMS_TOKEN=your-geezsms-api-token
GEEZSMS_SENDER_ID=EthioLingo          # optional
```

**Production (Render)** — Dashboard → your backend service → **Environment**:

| Key | Value |
| --- | --- |
| `GEEZSMS_BASE_URL` | `https://api.geezsms.com/api/v1` |
| `GEEZSMS_TOKEN` | *(your token — never commit it)* |
| `GEEZSMS_SENDER_ID` | *(optional registered sender ID)* |

If the token is missing, the app still records the announcement and reports
`"GeezSMS token not configured — announcement recorded, no SMS sent."` so local/dev work is
never blocked.

---

## 4. Database

The `sms_log` table backs the delivery history. It is defined in `server/prisma/schema.prisma`.

Apply it to the target database (Supabase Postgres works — use the pooled/direct connection
string as `DATABASE_URL`):

```bash
cd server
npx prisma generate
npx prisma db push      # creates/updates the sms_log table
```

`prisma db push` is safe for additive model changes, but on a live production database take a
Supabase backup first.

---

## 5. Testing the token

Check balance without sending anything:

```bash
curl -s -H "Authorization: Bearer $GEEZSMS_TOKEN" \
  -H "Accept: application/json" \
  https://api.geezsms.com/api/v1/balance
```

Expected:

```json
{"error":false,"msg":"Sufficient balance","data":{"billing_id":2766,"total_sms":2080,"total_amount":"1554.8000 ETB"}}
```

Send a single test message to **your own** number (use E.164, `251…`):

```bash
curl -s -X POST https://api.geezsms.com/api/v1/sms/send \
  -H "Authorization: Bearer $GEEZSMS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"phone":"2519XXXXXXXXX","msg":"Ethio-Lingo test message","sender_id":"EthioLingo"}'
```

Then verify end-to-end in the app: **Admin → Community Moderation → SMS Broadcast**, pick an
audience, send, and watch the Delivery History rows appear.

---

## 6. Troubleshooting

| Symptom | Cause / Fix |
| --- | --- |
| `GeezSMS is not configured (missing GEEZSMS_TOKEN)` | Env var missing on the running server (restart Render after saving). |
| 302 redirect instead of a JSON error | Add `Accept: application/json` (the service requires it). |
| `The phone field is required` | Body must use `phone`, not `to`/`recipient`. |
| `Message cannot be empty` | Body must use `msg`, not `message`/`text`. |
| No recipients in the preview | Learners at that level have no phone on file, or the account is inactive. |
| `FAILED` rows in delivery history | Invalid number, unverified sender ID, or insufficient balance. |
| Delays in delivery | Normal for Ethiopian networks; GeezSMS queues and delivers asynchronously. |

---

## 7. Operational notes

- **Phone numbers** are normalized to `251XXXXXXXXX`; local formats (`09…`, `+251…`,
  `251…`) are all accepted. Numbers that can't be normalized are logged as failures.
- **Free Trial** audience targets learners whose wallet is flagged as a free trial; every
  other level matches `User.level` exactly.
- **Audit trail:** the `announcement` row is the record of what was said; `sms_log` rows are
  the per-recipient delivery receipts. Deleting an announcement deletes its logs.
- **Cost control:** a broadcast is real money (≈0.65 ETB per recipient). Always check the
  recipient count preview before sending.
