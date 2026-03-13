-- WikiRace Database Schema
-- Run this in the Supabase SQL Editor

-- ============================================================
-- TABLES
-- ============================================================

create table if not exists daily_puzzles (
  id serial primary key,
  date date unique not null,
  start_article text not null,
  end_article text not null
);

create table if not exists results (
  id uuid primary key default gen_random_uuid(),
  puzzle_date date not null,
  clicks integer not null,
  time_seconds numeric(10, 2) not null,
  path text[] not null,
  submitted_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table daily_puzzles enable row level security;
alter table results enable row level security;

-- daily_puzzles: public read only
create policy "public read puzzles"
  on daily_puzzles for select
  using (true);

-- results: public insert and read, no update or delete
create policy "public insert results"
  on results for insert
  with check (true);

create policy "public read results"
  on results for select
  using (true);

-- ============================================================
-- SEED DATA — 60 daily puzzles starting 2026-03-13
-- ============================================================

insert into daily_puzzles (date, start_article, end_article) values
  ('2026-03-13', 'Pizza', 'Ancient Egypt'),
  ('2026-03-14', 'Michael Jackson', 'Mount Everest'),
  ('2026-03-15', 'Chess', 'Amazon River'),
  ('2026-03-16', 'Titanic (film)', 'Black hole'),
  ('2026-03-17', 'Association football', 'William Shakespeare'),
  ('2026-03-18', 'Harry Potter', 'Great Wall of China'),
  ('2026-03-19', 'Albert Einstein', 'Jazz'),
  ('2026-03-20', 'Eiffel Tower', 'Genetics'),
  ('2026-03-21', 'Leonardo da Vinci', 'Volcanic eruption'),
  ('2026-03-22', 'The Beatles', 'Buddhism'),
  ('2026-03-23', 'Dinosaur', 'Internet'),
  ('2026-03-24', 'Napoleon', 'Jazz music'),
  ('2026-03-25', 'Cleopatra', 'Space exploration'),
  ('2026-03-26', 'William Shakespeare', 'Samurai'),
  ('2026-03-27', 'Wolfgang Amadeus Mozart', 'Rainforest'),
  ('2026-03-28', 'Isaac Newton', 'Martial arts'),
  ('2026-03-29', 'Charles Darwin', 'Olympic Games'),
  ('2026-03-30', 'Marie Curie', 'Hip hop music'),
  ('2026-03-31', 'Abraham Lincoln', 'Coral reef'),
  ('2026-04-01', 'Ludwig van Beethoven', 'Photography'),
  ('2026-04-02', 'Vincent van Gogh', 'Plate tectonics'),
  ('2026-04-03', 'Galileo Galilei', 'Folklore'),
  ('2026-04-04', 'Nikola Tesla', 'Yoga'),
  ('2026-04-05', 'Aristotle', 'Television'),
  ('2026-04-06', 'Plato', 'Cinema'),
  ('2026-04-07', 'Karl Marx', 'Surfing'),
  ('2026-04-08', 'Sigmund Freud', 'Architecture'),
  ('2026-04-09', 'Mahatma Gandhi', 'Antarctica'),
  ('2026-04-10', 'Nelson Mandela', 'Jazz'),
  ('2026-04-11', 'Che Guevara', 'Sushi'),
  ('2026-04-12', 'Fidel Castro', 'Mount Rushmore'),
  ('2026-04-13', 'Barack Obama', 'Classical music'),
  ('2026-04-14', 'Steve Jobs', 'Amazon rainforest'),
  ('2026-04-15', 'Bill Gates', 'Pyramids of Giza'),
  ('2026-04-16', 'Elon Musk', 'Dinosaur'),
  ('2026-04-17', 'Warren Buffett', 'Volcano'),
  ('2026-04-18', 'Beyoncé', 'Roman Empire'),
  ('2026-04-19', 'Taylor Swift', 'Vikings'),
  ('2026-04-20', 'Eminem', 'Silk Road'),
  ('2026-04-21', 'Madonna (entertainer)', 'Solar System'),
  ('2026-04-22', 'Bob Dylan', 'Samurai'),
  ('2026-04-23', 'Freddie Mercury', 'Amazon River'),
  ('2026-04-24', 'David Bowie', 'Buddhism'),
  ('2026-04-25', 'Elvis Presley', 'Mount Fuji'),
  ('2026-04-26', 'John Lennon', 'Black hole'),
  ('2026-04-27', 'Rolling Stones', 'Machu Picchu'),
  ('2026-04-28', 'Led Zeppelin', 'Ocean'),
  ('2026-04-29', 'Pink Floyd', 'Democracy'),
  ('2026-04-30', 'Queen (band)', 'Inca Empire'),
  ('2026-05-01', 'Nirvana (band)', 'Aztecs'),
  ('2026-05-02', 'Michelangelo', 'Coral reef'),
  ('2026-05-03', 'Raphael', 'Ancient Rome'),
  ('2026-05-04', 'Pablo Picasso', 'Norse mythology'),
  ('2026-05-05', 'Frida Kahlo', 'Viking Age'),
  ('2026-05-06', 'Salvador Dalí', 'Quantum mechanics'),
  ('2026-05-07', 'Andy Warhol', 'Great Barrier Reef'),
  ('2026-05-08', 'Bruce Lee', 'Greek mythology'),
  ('2026-05-09', 'Muhammad Ali', 'Silk Road'),
  ('2026-05-10', 'Usain Bolt', 'French Revolution'),
  ('2026-05-11', 'Serena Williams', 'Ancient China')
on conflict (date) do nothing;
