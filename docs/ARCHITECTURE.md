# Charity Net — Architecture

## High-level flow

```
Person uploads photos → Storage
Person posts item     → POST /api/items (server)
                       → server creates Firestore item doc (aiStatus=pending)
                       → server fires OpenAI Vision scan
                          → result stored on item doc (aiTags, aiCategory, aiSafety)
                          → wishlist matcher → in-app notifications to matched charities
Charity expresses interest within 24h → POST /api/items/:id/interests
Person picks a charity after window  → POST /api/items/:id/finalize-recipient
Either side starts chat              → /api/-less; direct Firestore writes gated by rules
Cron job expires unselected items    → POST /api/jobs/expire-interest-windows
```

## Firestore collections

| Path | Purpose |
|---|---|
| `users/{uid}` | Profile, role pointer, `defaultLocation`, `searchRadiusKm`. |
| `charities/{id}` | Charity record. `status: pending|approved|rejected|suspended`. |
| `charities/{id}/wishlist/{wid}` | Tags / categories / notes the charity is hunting for. |
| `items/{itemId}` | Donated item. AI tags + safety flags written by server only. |
| `items/{itemId}/interests/{charityId}` | One doc per interested charity (dedupe by id). |
| `threads/{itemId_charityId}` | Per-item, per-charity chat thread. |
| `threads/{tid}/messages/{mid}` | Chat messages. |
| `notifications/{uid}/items/{nid}` | In-app notification feed (one per user). |
| `adminAudit/{eventId}` | Audit log for admin actions. |
| `aiUsage/{YYYY-MM-DD}` | Daily AI usage tally for cost control. |
| `reports/{reportId}` | Minimal abuse reports surfaced to admin. |

## Geohash

`geofire-common` style. Every item and charity carries `location.geohash`. Nearby queries:

```ts
const bounds = geohashQueryBoundsForRadius(center, radiusKm);
for (const [start, end] of bounds) {
  await query(where('status','==','active')
              .where('location.geohash','>=',start)
              .where('location.geohash','<=',end))
}
// Filter false positives in memory by real distance.
```

## Auth & roles

- Firebase Auth issues ID tokens; server verifies them with `firebase-admin`.
- Custom claims: `{ role: 'person' | 'charity' | 'admin', approved: boolean, charityId?: string }`.
- Person signups auto-approve.
- Charity signups create a `charities` doc in `status='pending'` and a custom claim with `approved=false`.
- Admin approval (`POST /admin/charities/:id/approve`) flips the doc + claim and notifies (in-app).
- Admin role is provisioned only via `scripts/setAdmin.ts`. No public route.

## Server boundaries

| Action | Who writes |
|---|---|
| Create user / charity doc, set claims | Server only |
| Create / update item core fields | Server (with rate limit) |
| AI scan + safety + wishlist match | Server only |
| Express / withdraw interest | Server only (validates deadline, role, dedupe) |
| Finalize recipient | Server only (Firestore transaction) |
| Charity approval / rejection | Server only |
| Chat messages | Direct from client, gated by rules |
| Thread `lastMessage`/`unread` | Cloud Function on message create |
| Mark notification read | Direct from client (only `read` field is mutable) |

## AI scan + cache

- One OpenAI Vision call per item, all images sent together (`image_url` parts).
- Structured JSON response, validated by zod.
- `aiTags` constrained to a controlled vocabulary (`shared/src/constants/tagVocabulary.ts`).
- `aiKeywords` is free-form for future search.
- Safety flags (`nsfw`, `weapon`, `hazardous`, `pii`) — if set, item is `status='removed'`.
- Result is the "cache": stored on the item document forever; reads cost nothing.

## Chat

- Per-item / per-charity threads with deterministic id `${itemId}_${charityId}`.
- Clients write messages directly; rules verify participation + non-empty text.
- A single `onDocumentCreated('threads/{threadId}/messages/{messageId}')` function updates the
  parent thread's `lastMessage` and increments the other participant's `unread` counter.

## Verification (manual end-to-end)

Run inside the emulator first.

1. Sign up as Person A → confirm `users/{uid}` doc + claim `role=person, approved=true`.
2. Sign up as Charity X → confirm `charities/{id}` doc in `pending`; UI shows pending screen.
3. `pnpm --filter @charity-net/scripts set-admin admin@example.com` → log in, see `/admin/approvals`.
4. Approve Charity X → status flips, claim updates, in-app notification appears, audit row written.
5. Charity X sets a wishlist row with tag `sofa`.
6. Person A posts a couch photo → confirm: compression in devtools, Storage upload, item doc `aiStatus=pending → done`, `aiTags` includes `sofa`. Charity X gets a wishlist-match notification.
7. Charity X opens map → couch pin within radius → expresses interest. Verify rules block other charity ids.
8. Open chat from the item → real-time message round-trip; `lastMessage` denormalised by the Function; unread counter increments.
9. Sign up + approve Charity Y → both interested. Person A's UI lists both. Selecting Y flips item to `given`, Charity Y notified `selected_as_recipient`, Charity X notified `not_selected`.
10. Cron simulate: `POST /api/jobs/expire-interest-windows` with `x-job-secret` → unselected past-deadline items become `expired`.
11. Upload an obviously flagged photo → item auto-`removed`, owner notified.
12. Rules fuzz: try writing `selectedCharityId` from a client, try messaging in a thread you're not in → both must fail.
