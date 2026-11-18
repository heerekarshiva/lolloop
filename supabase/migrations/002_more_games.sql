insert into public.games (slug, name, category, description) values
 ('reaction-test','Lightning Reflex','quick','Wait for green, then hit it.'),
 ('memory-match','Memory Match','puzzle','Find all 8 pairs.') on conflict (slug) do nothing;
