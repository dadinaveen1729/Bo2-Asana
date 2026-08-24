alter table profiles
  add column if not exists department text,
  add column if not exists about_me text,
  add column if not exists out_of_office_until date;
