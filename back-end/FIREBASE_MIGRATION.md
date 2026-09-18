# Firebase-only data layer

The application now uses Firebase Authentication and Cloud Firestore. Express remains as the trusted API layer, but runtime code does not connect to MySQL.

## Firestore collections

- `users`
- `slots`
- `orders`
- `reviews`
- `reports`
- `_meta/counters` for human-readable numeric IDs

## One-time migration

The migration is idempotent and keeps the same IDs, timestamps and relationships. It reads MySQL without deleting or changing it.

```bash
npm run migrate:mysql-to-firestore
```

After checking the Firestore counts and application flows, install production dependencies with `npm install --omit=dev`. The MySQL driver is a development-only dependency used exclusively by the migration script.

## Required environment values

```env
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Enable **Cloud Firestore** in the same Firebase project used by Authentication. The server SDK has privileged access; clients continue using the existing authenticated API.
