-- Verified Brisbane starter set. Every row was read from source_url on the
-- date in source_verified_at. Nothing here is generated.

-- First, seed the market and regions (location-agnostic core)
insert into markets (name, slug, timezone, currency, locale, default_lat, default_lng) values
  ('South East Queensland', 'seq', 'Australia/Brisbane', 'AUD', 'en-AU', -27.4704, 153.0235)
on conflict do nothing;

insert into regions (market_id, slug, label, lat, lng)
select m.id, 'brisbane', 'Brisbane', -27.4704, 153.0235 from markets m where m.slug = 'seq'
union all
select m.id, 'gold-coast', 'Gold Coast', -28.0045, 153.4315 from markets m where m.slug = 'seq'
union all
select m.id, 'sunshine-coast', 'Sunshine Coast', -26.7985, 153.1154 from markets m where m.slug = 'seq'
union all
select m.id, 'ipswich', 'Ipswich', -27.6261, 152.7676 from markets m where m.slug = 'seq'
union all
select m.id, 'scenic-rim', 'Scenic Rim', -27.8000, 152.8500 from markets m where m.slug = 'seq'
on conflict do nothing;

-- Sources (aggregators and verify-tier venues)
insert into sources (name, domain, kind, tier, reliability, cadence_minutes, market_id) 
select 'Brisbane Festival', 'brisbanefestival.com.au', 'website', 'aggregator', 0.95, 360, m.id from markets m where m.slug = 'seq'
union all
select 'Brisbane Powerhouse', 'brisbanepowerhouse.org', 'website', 'verify', 0.93, 0, m.id from markets m where m.slug = 'seq'
union all
select 'QAGOMA', 'qagoma.qld.gov.au', 'website', 'verify', 0.96, 0, m.id from markets m where m.slug = 'seq'
union all
select 'Jan Powers Farmers Markets', 'janpowersfarmersmarkets.com.au', 'website', 'verify', 0.90, 0, m.id from markets m where m.slug = 'seq'
union all
select 'West End Markets', 'goodwillprojects.com.au', 'website', 'verify', 0.88, 0, m.id from markets m where m.slug = 'seq'
union all
select 'Eat Street Northshore', 'eatstreetnorthshore.com.au', 'website', 'aggregator', 0.90, 1440, m.id from markets m where m.slug = 'seq'
union all
select 'Glow Worm Caves Tamborine', 'tamborineglowworms.com.au', 'website', 'verify', 0.86, 0, m.id from markets m where m.slug = 'seq'
union all
select 'Paniyiri Greek Festival', 'paniyiri.com', 'website', 'verify', 0.92, 0, m.id from markets m where m.slug = 'seq'
on conflict do nothing;

-- Sample discoveries (verified 2 Sep 2026)
insert into discoveries
  (title, description, category, kind, starts_on, ends_on, weekdays, open_time, close_time,
   venue_name, address, lat, lng, location_confirmed, price_min, price_max, booking, indoor, tags,
   source_id, source_url, source_verified_at, confidence, status, suppressed_reason, fingerprint, market_id)
select
  'Riverfire by Australian Retirement Trust',
  'Brisbane Festival opening night. Flyovers 4.45-5.30pm, fireworks from 7pm.',
  'festival', 'dated', '2026-09-05', '2026-09-05', null, '16:45', '19:30',
  'Brisbane River & surrounds', 'South Bank, Brisbane', -27.4748, 153.0176, true,
  0, 0, 'none', false, '{fireworks,free,riverside}',
  (select id from sources where name = 'Brisbane Festival' and market_id = m.id),
  'https://www.brisbanefestival.com.au/events/riverfire-2026', '2026-09-02 00:00:00+00', 0.97, 'published', null,
  'riverfire|brisbane river|2026-09-05', m.id
from markets m where m.slug = 'seq'
union all
select
  'Scorched Earth',
  'Far & Away Productions / Attic Projects. 1h20m, suitable 12+.',
  'theatre', 'dated', '2026-09-17', '2026-09-20', null, '18:30', '19:50',
  'Powerhouse Theatre', '119 Lamington St, New Farm', -27.4626, 153.0500, true,
  69.90, 89.90, 'required', true, '{dance,contemporary}',
  (select id from sources where name = 'Brisbane Powerhouse' and market_id = m.id),
  'https://brisbanepowerhouse.org/events/scorched-earth/', '2026-09-02 00:00:00+00', 0.96, 'published', null,
  'scorched earth|powerhouse theatre|2026-09-17', m.id
from markets m where m.slug = 'seq'
union all
select
  'Jan Powers Farmers Markets - Powerhouse',
  'Every Saturday 6am-12pm at the Powerhouse. Free entry.',
  'market', 'weekly', null, null, '{6}', '06:00', '12:00',
  'Brisbane Powerhouse', 'Lamington St, New Farm', -27.4626, 153.0500, true,
  0, 0, 'none', false, '{produce,free,breakfast}',
  (select id from sources where name = 'Jan Powers Farmers Markets' and market_id = m.id),
  'https://www.janpowersfarmersmarkets.com.au/powerhouse-farmers-markets', '2026-09-02 00:00:00+00', 0.96, 'published', null,
  'jan powers powerhouse|new farm|weekly-6', m.id
from markets m where m.slug = 'seq'
union all
select
  'West End Markets (Davies Park)',
  'Formerly Davies Park Market. Saturdays 6am-2pm (Mar-Nov) under the figs.',
  'market', 'weekly', null, null, '{6}', '06:00', '14:00',
  'Davies Park', '277 Montague Rd, West End', -27.4792, 153.0055, true,
  0, 0, 'none', false, '{produce,free,live music}',
  (select id from sources where name = 'West End Markets' and market_id = m.id),
  'https://goodwillprojects.com.au/markets/west-end/', '2026-09-02 00:00:00+00', 0.94, 'published', null,
  'west end markets|davies park|weekly-6', m.id
from markets m where m.slug = 'seq'
union all
select
  'Eat Street Northshore',
  'Street food in 180 shipping containers. Fri & Sat 4-10pm, Sun 4-9pm. $6 entry, under 13 free.',
  'food', 'weekly', null, null, '{5,6,0}', '16:00', '22:00',
  'Eat Street Northshore', '221D Macarthur Ave, Hamilton', -27.4318, 153.0742, true,
  6, 6, 'none', false, '{street food,family,riverside}',
  (select id from sources where name = 'Eat Street Northshore' and market_id = m.id),
  'https://eatstreetnorthshore.com.au/visit', '2026-09-02 00:00:00+00', 0.95, 'published', null,
  'eat street northshore|hamilton|weekly-5', m.id
from markets m where m.slug = 'seq'
union all
select
  'Glow Worm Caves, Tamborine Mountain',
  '30-minute guided tours, 10am-4pm seven days. $32.19 online. Three steps into the cave.',
  'daytrip', 'weekly', null, null, '{0,1,2,3,4,5,6}', '10:00', '16:00',
  'Cedar Creek Estate Vineyard & Winery', '104-144 Hartley Rd, North Tamborine', -27.9021, 153.1836, true,
  32.19, 32.19, 'recommended', true, '{unusual,guided tour,day trip}',
  (select id from sources where name = 'Glow Worm Caves Tamborine' and market_id = m.id),
  'https://www.tamborineglowworms.com.au/prices-and-times.html', '2026-09-02 00:00:00+00', 0.90, 'published', null,
  'glow worm caves|cedar creek estate|daily', m.id
from markets m where m.slug = 'seq'
union all
select
  'Paniyiri Greek Festival',
  'The 50th Paniyiri ran Sat 23 and Sun 24 May 2026 at Musgrave Park. Next edition expected May 2027.',
  'festival', 'dated', '2026-05-23', '2026-05-24', null, '10:00', '22:00',
  'Musgrave Park & The Greek Club', 'Edmondstone St, South Brisbane', -27.4816, 153.0132, true,
  0, 20, 'none', false, '{greek,food,annual}',
  (select id from sources where name = 'Paniyiri Greek Festival' and market_id = m.id),
  'https://www.paniyiri.com/faq', '2026-09-02 00:00:00+00', 0.98, 'suppressed',
  'Finished - ran 23-24 May 2026, next edition not published',
  'paniyiri|musgrave park|2026-05-23', m.id
from markets m where m.slug = 'seq'
on conflict do nothing;
