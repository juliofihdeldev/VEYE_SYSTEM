# Optional: Firestore → Postgres import (Phase A1)

Not automated in-repo yet. When you need historical rows in Supabase:

1. Export from Firebase (e.g. [Firestore export to GCS](https://firebase.google.com/docs/firestore/manage-data/export-import) or a small Node script using `firebase-admin` to stream collections).
2. Map **collection names** and **field names** using [DATABASE.md](./DATABASE.md) (camelCase → snake_case; `VeyeComments.text` → `veye_comments.body`).
3. Preserve **document IDs** as `id` text columns where possible (`INSERT ... ON CONFLICT (id) DO UPDATE`).
4. Convert **Firestore Timestamps** to ISO strings for `timestamptz` columns.

Run imports against **staging** first, then verify counts and a few sample rows in Supabase Studio.
