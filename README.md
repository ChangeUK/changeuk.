# Change UK V4 — Supabase Backend

This version brings back a real backend and adds full policy management.

## Control Room
Open:
`control-room.html`

Extra access gate:
`CHANGEUK-V4-7319`

After that, you must also sign in with an authorised Supabase admin account.

## Setup
1. Create a Supabase project.
2. Run `setup.sql` in Supabase SQL Editor.
3. In Supabase, create your first user under Authentication > Users.
4. Copy that user's UUID.
5. Run:

   `insert into public.admin_profiles (user_id, display_name) values ('YOUR-USER-UUID','Site Admin');`

6. Open `config.js`.
7. Paste your Supabase Project URL and anon/publishable key.
8. Upload every file in this ZIP together.

## Control Room features
- Add/edit/delete MPs
- Add/edit/delete councillors
- Add/edit/delete helpers
- Upload person images
- Add/edit/delete policies
- Policy categories
- Policy icons
- Policy summaries
- Bullet points
- Full policy detail
- Draft/published toggle
- Policy display order
- Add/edit/delete news
- Upload news images
- Draft/published news
- Edit homepage statistics

## Security
The access code is an extra gate only.
Supabase Authentication + Row Level Security is the real protection.
Never place a Supabase `service_role` key in this website.

## Flat ZIP
There are no folders. Keep all files in the same directory.
