-- Verified Brisbane starter set. Every row was read from source_url on the
-- date in source_verified_at. Nothing here is generated.
insert into sources (id, name, domain, kind, reliability, cadence_minutes) values
  ('00000000-0000-0000-0000-000000000001','Brisbane Festival','brisbanefestival.com.au','website',0.95,360),
  ('00000000-0000-0000-0000-000000000002','Brisbane Powerhouse','brisbanepowerhouse.org','website',0.93,720),
  ('00000000-0000-0000-0000-000000000003','QAGOMA','qagoma.qld.gov.au','website',0.96,720),
  ('00000000-0000-0000-0000-000000000004','Jan Powers Farmers Markets','janpowersfarmersmarkets.com.au','website',0.90,1440),
  ('00000000-0000-0000-0000-000000000005','West End Markets','goodwillprojects.com.au','website',0.88,1440),
  ('00000000-0000-0000-0000-000000000006','Eat Street Northshore','eatstreetnorthshore.com.au','website',0.90,1440),
  ('00000000-0000-0000-0000-000000000007','Glow Worm Caves Tamborine','tamborineglowworms.com.au','website',0.86,2880),
  ('00000000-0000-0000-0000-000000000008','Paniyiri Greek Festival','paniyiri.com','website',0.92,10080)
on conflict do nothing;

insert into discoveries
  (title, description, category, kind, starts_on, ends_on, weekdays, open_time, close_time,
   venue_name, address, lat, lng, price_min, price_max, booking, indoor, tags,
   source_id, source_url, source_verified_at, confidence, status, suppressed_reason, fingerprint)
values
  ('Riverfire by Australian Retirement Trust',
   'Brisbane Festival opening night. Flyovers 4.45-5.30pm, fireworks from 7pm.',
   'festival','dated','2026-09-05','2026-09-05',null,'16:45','19:30',
   'Brisbane River & surrounds','South Bank, Brisbane',-27.4748,153.0176,0,0,'none',false,
   '{fireworks,free,riverside}','00000000-0000-0000-0000-000000000001',
   'https://www.brisbanefestival.com.au/events/riverfire-2026','2026-09-02',0.97,'published',null,
   'riverfire|brisbane river|2026-09-05'),

  ('Scorched Earth',
   'Far & Away Productions / Attic Projects. 1h20m, suitable 12+.',
   'theatre','dated','2026-09-17','2026-09-20',null,'18:30','19:50',
   'Powerhouse Theatre','119 Lamington St, New Farm',-27.4626,153.0500,69.90,89.90,'required',true,
   '{dance,contemporary}','00000000-0000-0000-0000-000000000002',
   'https://brisbanepowerhouse.org/events/scorched-earth/','2026-09-02',0.96,'published',null,
   'scorched earth|powerhouse theatre|2026-09-17'),

  ('Jan Powers Farmers Markets - Powerhouse',
   'Every Saturday 6am-12pm at the Powerhouse. Free entry.',
   'market','weekly',null,null,'{6}','06:00','12:00',
   'Brisbane Powerhouse','Lamington St, New Farm',-27.4626,153.0500,0,0,'none',false,
   '{produce,free,breakfast}','00000000-0000-0000-0000-000000000004',
   'https://www.janpowersfarmersmarkets.com.au/powerhouse-farmers-markets','2026-09-02',0.96,'published',null,
   'jan powers powerhouse|new farm|weekly-6'),

  ('West End Markets (Davies Park)',
   'Formerly Davies Park Market. Saturdays 6am-2pm (Mar-Nov) under the figs.',
   'market','weekly',null,null,'{6}','06:00','14:00',
   'Davies Park','277 Montague Rd, West End',-27.4792,153.0055,0,0,'none',false,
   '{produce,free,live music}','00000000-0000-0000-0000-000000000005',
   'https://goodwillprojects.com.au/markets/west-end/','2026-09-02',0.94,'published',null,
   'west end markets|davies park|weekly-6'),

  ('Eat Street Northshore',
   'Street food in 180 shipping containers. Fri & Sat 4-10pm, Sun 4-9pm. $6 entry, under 13 free.',
   'food','weekly',null,null,'{5,6,0}','16:00','22:00',
   'Eat Street Northshore','221D Macarthur Ave, Hamilton',-27.4318,153.0742,6,6,'none',false,
   '{street food,family,riverside}','00000000-0000-0000-0000-000000000006',
   'https://eatstreetnorthshore.com.au/visit','2026-09-02',0.95,'published',null,
   'eat street northshore|hamilton|weekly-5'),

  ('Glow Worm Caves, Tamborine Mountain',
   '30-minute guided tours, 10am-4pm seven days. $32.19 online. Three steps into the cave.',
   'daytrip','weekly',null,null,'{0,1,2,3,4,5,6}','10:00','16:00',
   'Cedar Creek Estate Vineyard & Winery','104-144 Hartley Rd, North Tamborine',-27.9021,153.1836,32.19,32.19,'recommended',true,
   '{unusual,guided tour,day trip}','00000000-0000-0000-0000-000000000007',
   'https://www.tamborineglowworms.com.au/prices-and-times.html','2026-09-02',0.90,'published',null,
   'glow worm caves|cedar creek estate|daily'),

  -- kept, but suppressed with a reason the user can inspect
  ('Paniyiri Greek Festival',
   'The 50th Paniyiri ran Sat 23 and Sun 24 May 2026 at Musgrave Park. Next edition expected May 2027.',
   'festival','dated','2026-05-23','2026-05-24',null,'10:00','22:00',
   'Musgrave Park & The Greek Club','Edmondstone St, South Brisbane',-27.4816,153.0132,0,20,'none',false,
   '{greek,food,annual}','00000000-0000-0000-0000-000000000008',
   'https://www.paniyiri.com/faq','2026-09-02',0.98,'suppressed',
   'Finished - ran 23-24 May 2026, next edition not published',
   'paniyiri|musgrave park|2026-05-23')
on conflict do nothing;
