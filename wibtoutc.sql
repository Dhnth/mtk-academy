-- 1. Ubah default timezone untuk tabel users
ALTER TABLE public.users 
ALTER COLUMN created_at SET DEFAULT (now() AT TIME ZONE 'UTC');

-- 2. Ubah default timezone untuk tabel classes
ALTER TABLE public.classes 
ALTER COLUMN created_at SET DEFAULT (now() AT TIME ZONE 'UTC');

-- 3. Ubah default timezone untuk tabel questions
ALTER TABLE public.questions 
ALTER COLUMN created_at SET DEFAULT (now() AT TIME ZONE 'UTC');

-- 4. Ubah default timezone untuk tabel attendances
ALTER TABLE public.attendances 
ALTER COLUMN created_at SET DEFAULT (now() AT TIME ZONE 'UTC');

-- 5. Ubah default timezone untuk tabel matches
ALTER TABLE public.matches 
ALTER COLUMN created_at SET DEFAULT (now() AT TIME ZONE 'UTC');

-- 6. Ubah default timezone untuk tabel match_questions
ALTER TABLE public.match_questions 
ALTER COLUMN created_at SET DEFAULT (now() AT TIME ZONE 'UTC');

-- 7. Ubah default timezone untuk tabel match_rewards
ALTER TABLE public.match_rewards 
ALTER COLUMN created_at SET DEFAULT (now() AT TIME ZONE 'UTC');

-- 8. Ubah default timezone untuk tabel teams
ALTER TABLE public.teams 
ALTER COLUMN created_at SET DEFAULT (now() AT TIME ZONE 'UTC');

-- 9. Ubah default timezone untuk tabel team_members
ALTER TABLE public.team_members 
ALTER COLUMN joined_at SET DEFAULT (now() AT TIME ZONE 'UTC');

-- 10. Ubah default timezone untuk tabel solo_queue
ALTER TABLE public.solo_queue 
ALTER COLUMN joined_at SET DEFAULT (now() AT TIME ZONE 'UTC');

-- 11. Ubah default timezone untuk tabel team_queue
ALTER TABLE public.team_queue 
ALTER COLUMN joined_at SET DEFAULT (now() AT TIME ZONE 'UTC');