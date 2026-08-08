-- Seed the initial treatment price list for a given user.
-- Run manually after creating the app user: replace the email address
-- below with the real login email, then run this whole file in the
-- Supabase SQL editor — see README.md for instructions.

do $$
declare
  target_user uuid;
  user_email text := 'REPLACE_WITH_LOGIN_EMAIL';
begin
  select id into target_user from auth.users where email = user_email;

  if target_user is null then
    raise exception 'No auth.users row found for email %; create the user first (see README).', user_email;
  end if;

  if exists (select 1 from public.treatments where user_id = target_user) then
    raise notice 'User % already has treatments — skipping seed to avoid duplicates.', user_email;
    return;
  end if;

  insert into public.treatments (user_id, category, name, description, price, price_note, duration_minutes, is_series, series_size, series_price, sort_order)
  values
    (target_user, 'ציפורניים', 'מריחת לק', null, 150, null, 45, false, null, null, 1),
    (target_user, 'ציפורניים', 'בניית ציפורניים באקריל + לק', null, 300, null, 60, false, null, null, 2),

    (target_user, 'טיפולי פנים', 'ניקוי עמוק', 'אבחון עור, פילינג, ניקוז, לחויות במכשור מתקדם, מסכות, פוטותרפיה', 400, null, 60, false, null, null, 10),
    (target_user, 'טיפולי פנים', 'פוטותרפיה', 'חיטוי, טיהור, אנטי-אייג''ינג, קולגן ואלסטין, הבהרה', 150, null, 20, false, null, null, 11),
    (target_user, 'טיפולי פנים', 'טיפול הבהרה', 'פילינג + מכשור מתקדם', 400, null, 60, true, 4, 1400, 12),
    (target_user, 'טיפולי פנים', 'מזותרפיה', 'פציעה מבוקרת, מעודד התחדשות עור - בסדרה בלבד', 500, null, 50, true, 5, 2000, 13),
    (target_user, 'טיפולי פנים', 'אלקטרופורציה', 'החדרת חומרים פעילים, השלמה לזוהר', null, '400-600 ₪', 60, false, null, null, 14),
    (target_user, 'טיפולי פנים', 'RF חיצוני', 'קולגן, אלסטין, מיצוק', 600, null, 60, false, null, null, 15),
    (target_user, 'טיפולי פנים', 'RF פנים', null, null, '700-900 ₪', 60, false, null, null, 16),
    (target_user, 'טיפולי פנים', 'RF גוף', null, null, '800-1500 ₪', 75, false, null, null, 17),
    (target_user, 'טיפולי פנים', 'RF צוואר', null, 800, null, 50, false, null, null, 18),
    (target_user, 'טיפולי פנים', 'RF צוואר ופנים', null, 1000, null, 75, false, null, null, 19),
    (target_user, 'טיפולי פנים', 'הסרת סרחי עור', null, null, 'לפי הערכה בייעוץ', 60, false, null, null, 20);

  insert into public.expense_categories (user_id, name, default_amount, sort_order)
  values
    (target_user, 'חומרי גלם', null, 1),
    (target_user, 'ציוד', null, 2),
    (target_user, 'שכירות', null, 3),
    (target_user, 'שיווק', null, 4),
    (target_user, 'אחר', null, 5);
end $$;
