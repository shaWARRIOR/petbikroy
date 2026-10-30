-- ============================================================================
-- PetBikroy — demo catalogue
--
-- GENERATED FILE — do not edit by hand.
-- Regenerate with:  node tools/generate-seed.mjs
--
-- Source: public/assets/js/data.js
-- ============================================================================

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------- taxonomy --

INSERT OR REPLACE INTO categories (id, name, emoji, sort_order) VALUES ('dogs', 'Dogs', '🐕', 0);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('dogs', 'Labrador', 0);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('dogs', 'German Shepherd', 1);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('dogs', 'Rottweiler', 2);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('dogs', 'Golden Retriever', 3);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('dogs', 'Poodle', 4);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('dogs', 'Siberian Husky', 5);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('dogs', 'Doberman', 6);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('dogs', 'Beagle', 7);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('dogs', 'Local / Deshi', 8);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('dogs', 'Pomeranian', 9);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('dogs', 'Shih Tzu', 10);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('dogs', 'Other Breeds', 11);
INSERT OR REPLACE INTO categories (id, name, emoji, sort_order) VALUES ('cats', 'Cats', '🐈', 1);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('cats', 'Persian', 0);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('cats', 'British Shorthair', 1);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('cats', 'Siamese', 2);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('cats', 'Bengal', 3);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('cats', 'Maine Coon', 4);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('cats', 'Ragdoll', 5);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('cats', 'Local / Deshi', 6);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('cats', 'Other Breeds', 7);
INSERT OR REPLACE INTO categories (id, name, emoji, sort_order) VALUES ('birds', 'Birds', '🦜', 2);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('birds', 'Parrot', 0);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('birds', 'Cockatiel', 1);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('birds', 'Budgerigar', 2);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('birds', 'Lovebird', 3);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('birds', 'Macaw', 4);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('birds', 'Pigeon', 5);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('birds', 'Finch', 6);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('birds', 'Other Birds', 7);
INSERT OR REPLACE INTO categories (id, name, emoji, sort_order) VALUES ('fish', 'Fish & Aquarium', '🐠', 3);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('fish', 'Goldfish', 0);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('fish', 'Betta', 1);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('fish', 'Guppy', 2);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('fish', 'Koi', 3);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('fish', 'Cichlid', 4);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('fish', 'Aquarium Setup', 5);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('fish', 'Aquarium Plants', 6);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('fish', 'Other Fish', 7);
INSERT OR REPLACE INTO categories (id, name, emoji, sort_order) VALUES ('small-pets', 'Small Pets', '🐰', 4);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('small-pets', 'Rabbit', 0);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('small-pets', 'Hamster', 1);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('small-pets', 'Guinea Pig', 2);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('small-pets', 'Turtle & Tortoise', 3);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('small-pets', 'Squirrel', 4);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('small-pets', 'Ferrets', 5);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('small-pets', 'Other Small Pets', 6);
INSERT OR REPLACE INTO categories (id, name, emoji, sort_order) VALUES ('accessories', 'Pet Accessories', '🦴', 5);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('accessories', 'Cages & Crates', 0);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('accessories', 'Collars & Leashes', 1);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('accessories', 'Toys', 2);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('accessories', 'Beds', 3);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('accessories', 'Bowls & Feeders', 4);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('accessories', 'Grooming', 5);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('accessories', 'Carriers', 6);
INSERT OR REPLACE INTO categories (id, name, emoji, sort_order) VALUES ('food', 'Pet Food', '🥣', 6);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('food', 'Dog Food', 0);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('food', 'Cat Food', 1);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('food', 'Bird Feed', 2);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('food', 'Fish Food', 3);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('food', 'Treats & Chews', 4);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('food', 'Supplements', 5);
INSERT OR REPLACE INTO categories (id, name, emoji, sort_order) VALUES ('services', 'Pet Services', '🩺', 7);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('services', 'Veterinary', 0);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('services', 'Pet Grooming', 1);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('services', 'Pet Boarding', 2);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('services', 'Dog Training', 3);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('services', 'Pet Transport', 4);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('services', 'Mating & Stud', 5);
INSERT OR REPLACE INTO categories (id, name, emoji, sort_order) VALUES ('poultry', 'Farm & Poultry', '🐓', 8);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('poultry', 'Chicken', 0);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('poultry', 'Duck', 1);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('poultry', 'Goat', 2);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('poultry', 'Cow', 3);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('poultry', 'Quail', 4);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('poultry', 'Other Livestock', 5);
INSERT OR REPLACE INTO categories (id, name, emoji, sort_order) VALUES ('other', 'Other Pets', '🐾', 9);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('other', 'Reptiles', 0);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('other', 'Exotic Pets', 1);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('other', 'Pet Adoption', 2);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('other', 'Wanted', 3);
INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES ('other', 'Other', 4);

INSERT OR REPLACE INTO locations (id, name, sort_order) VALUES ('dhaka', 'Dhaka', 0);
INSERT OR IGNORE INTO areas (location_id, name, sort_order) VALUES ('dhaka', 'Dhanmondi', 0);
INSERT OR IGNORE INTO areas (location_id, name, sort_order) VALUES ('dhaka', 'Mirpur', 1);
INSERT OR IGNORE INTO areas (location_id, name, sort_order) VALUES ('dhaka', 'Uttara', 2);
INSERT OR IGNORE INTO areas (location_id, name, sort_order) VALUES ('dhaka', 'Gulshan', 3);
INSERT OR IGNORE INTO areas (location_id, name, sort_order) VALUES ('dhaka', 'Banani', 4);
INSERT OR IGNORE INTO areas (location_id, name, sort_order) VALUES ('dhaka', 'Mohammadpur', 5);
INSERT OR IGNORE INTO areas (location_id, name, sort_order) VALUES ('dhaka', 'Bashundhara', 6);
INSERT OR IGNORE INTO areas (location_id, name, sort_order) VALUES ('dhaka', 'Badda', 7);
INSERT OR IGNORE INTO areas (location_id, name, sort_order) VALUES ('dhaka', 'Motijheel', 8);
INSERT OR IGNORE INTO areas (location_id, name, sort_order) VALUES ('dhaka', 'Old Dhaka', 9);
INSERT OR IGNORE INTO areas (location_id, name, sort_order) VALUES ('dhaka', 'Savar', 10);
INSERT OR IGNORE INTO areas (location_id, name, sort_order) VALUES ('dhaka', 'Gazipur', 11);
INSERT OR REPLACE INTO locations (id, name, sort_order) VALUES ('chattogram', 'Chattogram', 1);
INSERT OR IGNORE INTO areas (location_id, name, sort_order) VALUES ('chattogram', 'Agrabad', 0);
INSERT OR IGNORE INTO areas (location_id, name, sort_order) VALUES ('chattogram', 'Nasirabad', 1);
INSERT OR IGNORE INTO areas (location_id, name, sort_order) VALUES ('chattogram', 'Khulshi', 2);
INSERT OR IGNORE INTO areas (location_id, name, sort_order) VALUES ('chattogram', 'Pahartali', 3);
INSERT OR IGNORE INTO areas (location_id, name, sort_order) VALUES ('chattogram', 'Halishahar', 4);
INSERT OR IGNORE INTO areas (location_id, name, sort_order) VALUES ('chattogram', 'Chawkbazar', 5);
INSERT OR IGNORE INTO areas (location_id, name, sort_order) VALUES ('chattogram', 'Cox''s Bazar', 6);
INSERT OR REPLACE INTO locations (id, name, sort_order) VALUES ('sylhet', 'Sylhet', 2);
INSERT OR IGNORE INTO areas (location_id, name, sort_order) VALUES ('sylhet', 'Zindabazar', 0);
INSERT OR IGNORE INTO areas (location_id, name, sort_order) VALUES ('sylhet', 'Ambarkhana', 1);
INSERT OR IGNORE INTO areas (location_id, name, sort_order) VALUES ('sylhet', 'Subid Bazar', 2);
INSERT OR IGNORE INTO areas (location_id, name, sort_order) VALUES ('sylhet', 'Beanibazar', 3);
INSERT OR IGNORE INTO areas (location_id, name, sort_order) VALUES ('sylhet', 'Moulvibazar', 4);
INSERT OR REPLACE INTO locations (id, name, sort_order) VALUES ('khulna', 'Khulna', 3);
INSERT OR IGNORE INTO areas (location_id, name, sort_order) VALUES ('khulna', 'Sonadanga', 0);
INSERT OR IGNORE INTO areas (location_id, name, sort_order) VALUES ('khulna', 'Khalishpur', 1);
INSERT OR IGNORE INTO areas (location_id, name, sort_order) VALUES ('khulna', 'Daulatpur', 2);
INSERT OR IGNORE INTO areas (location_id, name, sort_order) VALUES ('khulna', 'Boyra', 3);
INSERT OR REPLACE INTO locations (id, name, sort_order) VALUES ('rajshahi', 'Rajshahi', 4);
INSERT OR IGNORE INTO areas (location_id, name, sort_order) VALUES ('rajshahi', 'Shaheb Bazar', 0);
INSERT OR IGNORE INTO areas (location_id, name, sort_order) VALUES ('rajshahi', 'Uposhohor', 1);
INSERT OR IGNORE INTO areas (location_id, name, sort_order) VALUES ('rajshahi', 'Boalia', 2);
INSERT OR IGNORE INTO areas (location_id, name, sort_order) VALUES ('rajshahi', 'Motihar', 3);
INSERT OR REPLACE INTO locations (id, name, sort_order) VALUES ('barishal', 'Barishal', 5);
INSERT OR IGNORE INTO areas (location_id, name, sort_order) VALUES ('barishal', 'Band Road', 0);
INSERT OR IGNORE INTO areas (location_id, name, sort_order) VALUES ('barishal', 'Nathullabad', 1);
INSERT OR IGNORE INTO areas (location_id, name, sort_order) VALUES ('barishal', 'Rupatali', 2);
INSERT OR REPLACE INTO locations (id, name, sort_order) VALUES ('rangpur', 'Rangpur', 6);
INSERT OR IGNORE INTO areas (location_id, name, sort_order) VALUES ('rangpur', 'Dhap', 0);
INSERT OR IGNORE INTO areas (location_id, name, sort_order) VALUES ('rangpur', 'Jahaj Company', 1);
INSERT OR IGNORE INTO areas (location_id, name, sort_order) VALUES ('rangpur', 'Mahiganj', 2);
INSERT OR REPLACE INTO locations (id, name, sort_order) VALUES ('mymensingh', 'Mymensingh', 7);
INSERT OR IGNORE INTO areas (location_id, name, sort_order) VALUES ('mymensingh', 'Ganginarpar', 0);
INSERT OR IGNORE INTO areas (location_id, name, sort_order) VALUES ('mymensingh', 'Charpara', 1);
INSERT OR IGNORE INTO areas (location_id, name, sort_order) VALUES ('mymensingh', 'Brahmaputra', 2);

-- --------------------------------------------------------------- members --
--
-- Every demo member signs in with their phone number and the shared
-- password "petbikroy123". These are throwaway accounts for a
-- demo dataset — see README.md before putting this on a public site.
--
-- Rakib Hasan — 01311000000
INSERT OR REPLACE INTO users (
  id, phone, name, email, password_hash, password_salt, iterations,
  bio, location_id, area, verified, is_active, created_at, updated_at
) VALUES (
  'u-seed-rakib-hasan', '01311000000', 'Rakib Hasan', 'rakib-hasan@petbikroy.test',
  '24fc7eaf2a61f005d83c0d3d4a8811e9c7f727078d117f10c52096f69383e8b6', 'b7a1dac22c6e3db7b0d700068a33f54d', 25000,
  'Rakib Hasan — Dhanmondi based, listing on PetBikroy since 2023.', 'dhaka', 'Dhanmondi', 1, 1,
  '2023-04-11T00:00:00.000Z', '2023-04-11T00:00:00.000Z'
);

-- Nusrat Jahan — 01511000137
INSERT OR REPLACE INTO users (
  id, phone, name, email, password_hash, password_salt, iterations,
  bio, location_id, area, verified, is_active, created_at, updated_at
) VALUES (
  'u-seed-nusrat-jahan', '01511000137', 'Nusrat Jahan', 'nusrat-jahan@petbikroy.test',
  '7f6f4a6f86923de83e4db7aefb86b657338ee8886b50168354a764298a8f5e97', '3acbf947c3b14372ed95fb5def377873', 25000,
  'Nusrat Jahan — Gulshan based, listing on PetBikroy since 2022.', 'dhaka', 'Gulshan', 1, 1,
  '2022-09-02T00:00:00.000Z', '2022-09-02T00:00:00.000Z'
);

-- Imran Chowdhury — 01611000274
INSERT OR REPLACE INTO users (
  id, phone, name, email, password_hash, password_salt, iterations,
  bio, location_id, area, verified, is_active, created_at, updated_at
) VALUES (
  'u-seed-imran-chowdhury', '01611000274', 'Imran Chowdhury', 'imran-chowdhury@petbikroy.test',
  'da5c33bb5d2a34cb70d66f902b9b28f9a02746b7d59cd483b171769dcce3f4c7', 'b7162c2e7a1bbdd43341415d7a5256ef', 25000,
  'Imran Chowdhury — Agrabad based, listing on PetBikroy since 2024.', 'chattogram', 'Agrabad', 0, 1,
  '2024-01-20T00:00:00.000Z', '2024-01-20T00:00:00.000Z'
);

-- Aqua House BD — 01711000411
INSERT OR REPLACE INTO users (
  id, phone, name, email, password_hash, password_salt, iterations,
  bio, location_id, area, verified, is_active, created_at, updated_at
) VALUES (
  'u-seed-aqua-house-bd', '01711000411', 'Aqua House BD', 'aqua-house-bd@petbikroy.test',
  '8625951afc0599e1e23e6ff15a11eac459f3c9c4c4920d51bae1040f07370812', 'd1682b39a9bc45dd5b74ffe6ec68ac76', 25000,
  'Aqua House BD — Mirpur based, listing on PetBikroy since 2021.', 'dhaka', 'Mirpur', 1, 1,
  '2021-06-15T00:00:00.000Z', '2021-06-15T00:00:00.000Z'
);

-- K9 Kennel Dhaka — 01811000548
INSERT OR REPLACE INTO users (
  id, phone, name, email, password_hash, password_salt, iterations,
  bio, location_id, area, verified, is_active, created_at, updated_at
) VALUES (
  'u-seed-k9-kennel-dhaka', '01811000548', 'K9 Kennel Dhaka', 'k9-kennel-dhaka@petbikroy.test',
  '2a98a70051c2e5b77df2188ab22271fb78efe7695db882163b36d698887304f5', 'dd98f51f5e88a088d1f8dde2e3c06927', 25000,
  'K9 Kennel Dhaka — Uttara based, listing on PetBikroy since 2020.', 'dhaka', 'Uttara', 1, 1,
  '2020-03-08T00:00:00.000Z', '2020-03-08T00:00:00.000Z'
);

-- Ayesha Rahman — 01911000685
INSERT OR REPLACE INTO users (
  id, phone, name, email, password_hash, password_salt, iterations,
  bio, location_id, area, verified, is_active, created_at, updated_at
) VALUES (
  'u-seed-ayesha-rahman', '01911000685', 'Ayesha Rahman', 'ayesha-rahman@petbikroy.test',
  '2bbb18fd087a1423384a1a3e07b55b78b75a141cd4a5b87ba519e3453ad37a3f', '650ede9556616e8ea2cbecc629da2a5c', 25000,
  'Ayesha Rahman — Bashundhara based, listing on PetBikroy since 2023.', 'dhaka', 'Bashundhara', 1, 1,
  '2023-11-30T00:00:00.000Z', '2023-11-30T00:00:00.000Z'
);

-- Sylhet Pet Corner — 01311000822
INSERT OR REPLACE INTO users (
  id, phone, name, email, password_hash, password_salt, iterations,
  bio, location_id, area, verified, is_active, created_at, updated_at
) VALUES (
  'u-seed-sylhet-pet-corner', '01311000822', 'Sylhet Pet Corner', 'sylhet-pet-corner@petbikroy.test',
  '07e268aa729ae25970a1f543b8c9465dd8139ea83018c51fd26534c14bc276bd', '527687a27ebf954114193b1999de2af2', 25000,
  'Sylhet Pet Corner — Zindabazar based, listing on PetBikroy since 2022.', 'sylhet', 'Zindabazar', 0, 1,
  '2022-02-18T00:00:00.000Z', '2022-02-18T00:00:00.000Z'
);

-- Pet Bazar BD — 01511000959
INSERT OR REPLACE INTO users (
  id, phone, name, email, password_hash, password_salt, iterations,
  bio, location_id, area, verified, is_active, created_at, updated_at
) VALUES (
  'u-seed-pet-bazar-bd', '01511000959', 'Pet Bazar BD', 'pet-bazar-bd@petbikroy.test',
  'c13e0ee525651ab99c9da8484c62d76f6d7918e560044bf8eb85a377deb982f1', 'e42a075f4f2cf8d779df21d4f5f0e156', 25000,
  'Pet Bazar BD — Mohammadpur based, listing on PetBikroy since 2023.', 'dhaka', 'Mohammadpur', 1, 1,
  '2023-07-07T00:00:00.000Z', '2023-07-07T00:00:00.000Z'
);

-- Dr. Farhana Vet Care — 01611001096
INSERT OR REPLACE INTO users (
  id, phone, name, email, password_hash, password_salt, iterations,
  bio, location_id, area, verified, is_active, created_at, updated_at
) VALUES (
  'u-seed-dr-farhana-vet-care', '01611001096', 'Dr. Farhana Vet Care', 'dr-farhana-vet-care@petbikroy.test',
  '181694a4a926f6615c21eee8afd8c5bfaecc73e45da5167dba655c31439280b7', '0a9c02bb5f450a58e473b819fcbbab6a', 25000,
  'Dr. Farhana Vet Care — Banani based, listing on PetBikroy since 2021.', 'dhaka', 'Banani', 1, 1,
  '2021-01-12T00:00:00.000Z', '2021-01-12T00:00:00.000Z'
);

-- Happy Tails Supplies — 01711001233
INSERT OR REPLACE INTO users (
  id, phone, name, email, password_hash, password_salt, iterations,
  bio, location_id, area, verified, is_active, created_at, updated_at
) VALUES (
  'u-seed-happy-tails-supplies', '01711001233', 'Happy Tails Supplies', 'happy-tails-supplies@petbikroy.test',
  '87dd2ac2f9dae3a46bccd3e216b98fd948975aa3dcb4f81139fffd12839c78c0', '8211f65a23361b9079171e3222453926', 25000,
  'Happy Tails Supplies — Badda based, listing on PetBikroy since 2024.', 'dhaka', 'Badda', 1, 1,
  '2024-05-03T00:00:00.000Z', '2024-05-03T00:00:00.000Z'
);

-- Chattogram Canine — 01811001370
INSERT OR REPLACE INTO users (
  id, phone, name, email, password_hash, password_salt, iterations,
  bio, location_id, area, verified, is_active, created_at, updated_at
) VALUES (
  'u-seed-chattogram-canine', '01811001370', 'Chattogram Canine', 'chattogram-canine@petbikroy.test',
  '8fa42c9ea48df4cc5f12c59166b855cde48725b4c13667b1ce5428c5268f7571', 'f1a0e96fc531c10cc75f95145147ac3d', 25000,
  'Chattogram Canine — Khulshi based, listing on PetBikroy since 2020.', 'chattogram', 'Khulshi', 1, 1,
  '2020-08-19T00:00:00.000Z', '2020-08-19T00:00:00.000Z'
);

-- Dhaka Stray Rescue — 01911001507
INSERT OR REPLACE INTO users (
  id, phone, name, email, password_hash, password_salt, iterations,
  bio, location_id, area, verified, is_active, created_at, updated_at
) VALUES (
  'u-seed-dhaka-stray-rescue', '01911001507', 'Dhaka Stray Rescue', 'dhaka-stray-rescue@petbikroy.test',
  '913ebfff410a68b39bfed1bbbd64d149f69adba4b824e50b8b4bd2e91c6ef809', '34132f24864d06e0cd044b8874aaa9fb', 25000,
  'Dhaka Stray Rescue — Old Dhaka based, listing on PetBikroy since 2022.', 'dhaka', 'Old Dhaka', 1, 1,
  '2022-12-01T00:00:00.000Z', '2022-12-01T00:00:00.000Z'
);

-- Nadeem Aviary — 01311001644
INSERT OR REPLACE INTO users (
  id, phone, name, email, password_hash, password_salt, iterations,
  bio, location_id, area, verified, is_active, created_at, updated_at
) VALUES (
  'u-seed-nadeem-aviary', '01311001644', 'Nadeem Aviary', 'nadeem-aviary@petbikroy.test',
  'f45e4244b35957966d2ac195ccfd6caabb0951ad1e9750ebea3167a39e447649', '97000222012e275aa98925362ce8a438', 25000,
  'Nadeem Aviary — Shaheb Bazar based, listing on PetBikroy since 2023.', 'rajshahi', 'Shaheb Bazar', 0, 1,
  '2023-03-14T00:00:00.000Z', '2023-03-14T00:00:00.000Z'
);

-- Khulna Pet Store — 01511001781
INSERT OR REPLACE INTO users (
  id, phone, name, email, password_hash, password_salt, iterations,
  bio, location_id, area, verified, is_active, created_at, updated_at
) VALUES (
  'u-seed-khulna-pet-store', '01511001781', 'Khulna Pet Store', 'khulna-pet-store@petbikroy.test',
  '4782d134fdc6eaa2b7fe5080608f54fc1a43839f8009269489747a3e3d76896b', '1d366972b043aa899514788655823342', 25000,
  'Khulna Pet Store — Sonadanga based, listing on PetBikroy since 2023.', 'khulna', 'Sonadanga', 0, 1,
  '2023-10-05T00:00:00.000Z', '2023-10-05T00:00:00.000Z'
);

-- Pawfect Grooming — 01611001918
INSERT OR REPLACE INTO users (
  id, phone, name, email, password_hash, password_salt, iterations,
  bio, location_id, area, verified, is_active, created_at, updated_at
) VALUES (
  'u-seed-pawfect-grooming', '01611001918', 'Pawfect Grooming', 'pawfect-grooming@petbikroy.test',
  'b3d9538502e9b60c93cf6e62c6a380c4f78e55dc7f2d7673f2965eab28d98c51', 'de5e761198a75283370ee27ba9d628c7', 25000,
  'Pawfect Grooming — Gulshan based, listing on PetBikroy since 2024.', 'dhaka', 'Gulshan', 1, 1,
  '2024-02-11T00:00:00.000Z', '2024-02-11T00:00:00.000Z'
);

-- Frozen Paws Husky — 01711002055
INSERT OR REPLACE INTO users (
  id, phone, name, email, password_hash, password_salt, iterations,
  bio, location_id, area, verified, is_active, created_at, updated_at
) VALUES (
  'u-seed-frozen-paws-husky', '01711002055', 'Frozen Paws Husky', 'frozen-paws-husky@petbikroy.test',
  '5aac5175b09908f2f2b0f438048de058cf1d11b09682038352a14514c811c465', '0a8ac1ace3b673bee8edb679d88a7e0b', 25000,
  'Frozen Paws Husky — Gazipur based, listing on PetBikroy since 2021.', 'dhaka', 'Gazipur', 1, 1,
  '2021-09-27T00:00:00.000Z', '2021-09-27T00:00:00.000Z'
);

-- Rangpur Agro Farm — 01811002192
INSERT OR REPLACE INTO users (
  id, phone, name, email, password_hash, password_salt, iterations,
  bio, location_id, area, verified, is_active, created_at, updated_at
) VALUES (
  'u-seed-rangpur-agro-farm', '01811002192', 'Rangpur Agro Farm', 'rangpur-agro-farm@petbikroy.test',
  '3d4292c9f3c8d23d23238aac6d4ed3973f27def2d7d32e5eacf14c91003d6458', '2d4ccdb67ab9b9a5d6435c3c0a5baf04', 25000,
  'Rangpur Agro Farm — Dhap based, listing on PetBikroy since 2022.', 'rangpur', 'Dhap', 1, 1,
  '2022-05-22T00:00:00.000Z', '2022-05-22T00:00:00.000Z'
);

-- Royal Feline BD — 01911002329
INSERT OR REPLACE INTO users (
  id, phone, name, email, password_hash, password_salt, iterations,
  bio, location_id, area, verified, is_active, created_at, updated_at
) VALUES (
  'u-seed-royal-feline-bd', '01911002329', 'Royal Feline BD', 'royal-feline-bd@petbikroy.test',
  '4c3a75370d38c1d2922e9e74ce65268b7cfc81c156f99baed23390808558aab4', 'd115f9404ab2ad99824d770b1b1f25f9', 25000,
  'Royal Feline BD — Gulshan based, listing on PetBikroy since 2019.', 'dhaka', 'Gulshan', 1, 1,
  '2019-11-16T00:00:00.000Z', '2019-11-16T00:00:00.000Z'
);

-- Exotic Pets Dhaka — 01311002466
INSERT OR REPLACE INTO users (
  id, phone, name, email, password_hash, password_salt, iterations,
  bio, location_id, area, verified, is_active, created_at, updated_at
) VALUES (
  'u-seed-exotic-pets-dhaka', '01311002466', 'Exotic Pets Dhaka', 'exotic-pets-dhaka@petbikroy.test',
  'a584f090bea8e9374e6716860369f13e83e5497314ee7819ee4589bc7f10a292', '5d20a45e6224f570c1d5966063d62bb4', 25000,
  'Exotic Pets Dhaka — Motijheel based, listing on PetBikroy since 2023.', 'dhaka', 'Motijheel', 1, 1,
  '2023-01-09T00:00:00.000Z', '2023-01-09T00:00:00.000Z'
);

-- Little Paws BD — 01511002603
INSERT OR REPLACE INTO users (
  id, phone, name, email, password_hash, password_salt, iterations,
  bio, location_id, area, verified, is_active, created_at, updated_at
) VALUES (
  'u-seed-little-paws-bd', '01511002603', 'Little Paws BD', 'little-paws-bd@petbikroy.test',
  '02019d51a57b4873418d1547b024fb649cfd601d2186d4db8e45a7d01e96c537', 'ce19d4a5b750400f809fccb03aa8702c', 25000,
  'Little Paws BD — Bashundhara based, listing on PetBikroy since 2024.', 'dhaka', 'Bashundhara', 0, 1,
  '2024-08-19T00:00:00.000Z', '2024-08-19T00:00:00.000Z'
);

-- Barishal Pet House — 01611002740
INSERT OR REPLACE INTO users (
  id, phone, name, email, password_hash, password_salt, iterations,
  bio, location_id, area, verified, is_active, created_at, updated_at
) VALUES (
  'u-seed-barishal-pet-house', '01611002740', 'Barishal Pet House', 'barishal-pet-house@petbikroy.test',
  '79d630cabfeb26eaff02a1529268fe77088eda5a1192e5dc313d85e5368ac6a5', '7b8e5b778a66572a93bdc57528ed5c33', 25000,
  'Barishal Pet House — Band Road based, listing on PetBikroy since 2023.', 'barishal', 'Band Road', 1, 1,
  '2023-06-02T00:00:00.000Z', '2023-06-02T00:00:00.000Z'
);

-- Mymensingh Aviary — 01711002877
INSERT OR REPLACE INTO users (
  id, phone, name, email, password_hash, password_salt, iterations,
  bio, location_id, area, verified, is_active, created_at, updated_at
) VALUES (
  'u-seed-mymensingh-aviary', '01711002877', 'Mymensingh Aviary', 'mymensingh-aviary@petbikroy.test',
  'f35401930575b846b3d82f5e70ab63019730b6e1a9295671a0aec7e285ffc1a4', 'd2a65b7f25f7a8a4883c13b319d1ae52', 25000,
  'Mymensingh Aviary — Ganginarpar based, listing on PetBikroy since 2024.', 'mymensingh', 'Ganginarpar', 0, 1,
  '2024-03-27T00:00:00.000Z', '2024-03-27T00:00:00.000Z'
);

-- Rangpur K9 School — 01811003014
INSERT OR REPLACE INTO users (
  id, phone, name, email, password_hash, password_salt, iterations,
  bio, location_id, area, verified, is_active, created_at, updated_at
) VALUES (
  'u-seed-rangpur-k9-school', '01811003014', 'Rangpur K9 School', 'rangpur-k9-school@petbikroy.test',
  'f4c38d0aa11ff70efcd65f0415e37cce1068a4dd13ac27a2107b1d4887e4784c', '4649b93a4178cf6de687e805f3c2bc7f', 25000,
  'Rangpur K9 School — Jahaj Company based, listing on PetBikroy since 2023.', 'rangpur', 'Jahaj Company', 1, 1,
  '2023-12-14T00:00:00.000Z', '2023-12-14T00:00:00.000Z'
);

-- Barishal Agro Hatchery — 01911003151
INSERT OR REPLACE INTO users (
  id, phone, name, email, password_hash, password_salt, iterations,
  bio, location_id, area, verified, is_active, created_at, updated_at
) VALUES (
  'u-seed-barishal-agro-hatchery', '01911003151', 'Barishal Agro Hatchery', 'barishal-agro-hatchery@petbikroy.test',
  '6290a6e153f8ed0a31e4ca1cb7d74406aabbb49af8f5b6c6ff4278ed18040569', '0c288b91f43bdc7e582a236da24746b9', 25000,
  'Barishal Agro Hatchery — Rupatali based, listing on PetBikroy since 2022.', 'barishal', 'Rupatali', 1, 1,
  '2022-11-11T00:00:00.000Z', '2022-11-11T00:00:00.000Z'
);

-- ------------------------------------------------------------------ demo ads --

INSERT OR REPLACE INTO ads (
  id, user_id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, rejection_reason,
  auto_decision, auto_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-1', 'u-seed-rakib-hasan', 'dogs', 'Labrador', '2 months old Labrador puppy, vaccinated, home trained', 'Pure Labrador puppy, 2 months old, very active and playful.

• First vaccination and deworming done
• Litter trained
• Both parents are pedigree Labradors (photos available on request)
• Raised with children, so very friendly

Reason for selling: relocating abroad. Serious buyers only. Price slightly negotiable for a good home.',
  25000, 1, 'sale',
  'dhaka', 'Dhanmondi', '2 months', 'Male',
  1, 'New', 'active', 1, 1284,
  'Rakib Hasan', '01311000000', 'rakib-hasan@petbikroy.test', '',
  'approved', '',
  '2026-10-15T03:20:00.000Z', '2026-10-15T03:20:00.000Z', '2026-10-15T03:20:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, user_id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, rejection_reason,
  auto_decision, auto_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-2', 'u-seed-nusrat-jahan', 'cats', 'Persian', 'Persian cat, 1 year old, very chubby and calm', 'Chinchilla-faced white Persian, extremely calm and litter trained.

She is fully vaccinated, dewormed, and has a clean bill of health from a vet. Eats both dry and wet premium cat food.

Comes with her litter box, food bowls and a bag of Royal Canin. Only giving away because my apartment building does not allow pets.',
  18000, 0, 'sale',
  'dhaka', 'Gulshan', '1 year', 'Female',
  1, 'Used', 'active', 1, 972,
  'Nusrat Jahan', '01511000137', 'nusrat-jahan@petbikroy.test', '',
  'approved', '',
  '2026-10-14T12:05:00.000Z', '2026-10-14T12:05:00.000Z', '2026-10-14T12:05:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, user_id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, rejection_reason,
  auto_decision, auto_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-3', 'u-seed-imran-chowdhury', 'birds', 'Cockatiel', 'Pair of hand-tamed Cockatiels with cage', 'A friendly pair of cockatiels — one grey, one lutino. Both are hand-tamed and step up onto your finger.

Included: a large powder-coated cage, two feeders, a water bottle and an almost full pack of bird seed.

They whistle tunes and are very social. Selling because I am moving to a shared apartment.',
  9500, 1, 'sale',
  'chattogram', 'Agrabad', '8 months', 'Pair',
  0, 'Used', 'active', 0, 431,
  'Imran Chowdhury', '01611000274', 'imran-chowdhury@petbikroy.test', '',
  'approved', '',
  '2026-10-13T05:40:00.000Z', '2026-10-13T05:40:00.000Z', '2026-10-13T05:40:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, user_id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, rejection_reason,
  auto_decision, auto_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-4', 'u-seed-aqua-house-bd', 'fish', 'Betta', 'Premium halfmoon Betta fish — assorted colours', 'Imported halfmoon Bettas, multiple colours available — blue, red, koi and butterfly.

• Kept in individual conditioned tanks
• Fed on live and frozen food
• Healthy fins, no fin rot

Price is per fish. Tank and accessories sold separately. Delivery available inside Dhaka for ৳150.',
  850, 0, 'sale',
  'dhaka', 'Mirpur', '4 months', 'Male',
  0, 'New', 'active', 0, 356,
  'Aqua House BD', '01711000411', 'aqua-house-bd@petbikroy.test', '',
  'approved', '',
  '2026-10-16T02:15:00.000Z', '2026-10-16T02:15:00.000Z', '2026-10-16T02:15:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, user_id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, rejection_reason,
  auto_decision, auto_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-5', 'u-seed-k9-kennel-dhaka', 'dogs', 'Rottweiler', 'Rottweiler male, 4 months, heavy bone structure', 'German bloodline Rottweiler male puppy from imported parents.

• Vaccination card and deworming record provided
• Heavy bone, broad head, excellent temperament
• Started on obedience basics

Both sire and dam can be seen at our kennel in Uttara. We offer a 7-day health guarantee and free delivery inside Dhaka city.',
  45000, 1, 'sale',
  'dhaka', 'Uttara', '4 months', 'Male',
  1, 'New', 'active', 1, 2140,
  'K9 Kennel Dhaka', '01811000548', 'k9-kennel-dhaka@petbikroy.test', '',
  'approved', '',
  '2026-10-16T08:55:00.000Z', '2026-10-16T08:55:00.000Z', '2026-10-16T08:55:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, user_id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, rejection_reason,
  auto_decision, auto_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-6', 'u-seed-ayesha-rahman', 'cats', 'British Shorthair', 'British Shorthair blue kitten, litter trained', 'Pedigree blue British Shorthair with plush coat, round face and orange eyes.

She is 3 months old, fully vaccinated, dewormed and uses the litter box without fail. Very affectionate but not clingy — typical BSH temperament.

Will come with her vaccination card, favourite toy and current food. Delivery inside Dhaka can be arranged.',
  32000, 0, 'sale',
  'dhaka', 'Bashundhara', '3 months', 'Female',
  1, 'New', 'active', 0, 1503,
  'Ayesha Rahman', '01911000685', 'ayesha-rahman@petbikroy.test', '',
  'approved', '',
  '2026-10-11T10:30:00.000Z', '2026-10-11T10:30:00.000Z', '2026-10-11T10:30:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, user_id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, rejection_reason,
  auto_decision, auto_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-7', 'u-seed-sylhet-pet-corner', 'small-pets', 'Rabbit', 'White Angora rabbits — baby pair available', 'Healthy Angora baby rabbits, extremely soft wool and very calm nature.

Fed on grass, pellets and fresh greens. Perfect for children as a first pet.

Price is per pair. Handover in Sylhet city; I can also send them to Dhaka by bus with a carrier box at buyer''s cost.',
  3200, 1, 'sale',
  'sylhet', 'Zindabazar', '2 months', 'Pair',
  0, 'New', 'active', 0, 288,
  'Sylhet Pet Corner', '01311000822', 'sylhet-pet-corner@petbikroy.test', '',
  'approved', '',
  '2026-10-12T04:10:00.000Z', '2026-10-12T04:10:00.000Z', '2026-10-12T04:10:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, user_id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, rejection_reason,
  auto_decision, auto_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-8', 'u-seed-pet-bazar-bd', 'accessories', 'Cages & Crates', 'Imported large dog crate with wheels and tray', 'Heavy-duty imported crate, suitable for a Labrador or German Shepherd.

• Size: 42 inch (L) x 28 inch (W) x 30 inch (H)
• Removable metal tray, wipe-clean
• Two locking doors, foldable for travel
• Wheels with brakes

Used for six months, no rust or dents. Selling because my dog outgrew it. Buyer picks up from Mohammadpur.',
  12500, 1, 'sale',
  'dhaka', 'Mohammadpur', '', '',
  0, 'Used', 'active', 0, 214,
  'Pet Bazar BD', '01511000959', 'pet-bazar-bd@petbikroy.test', '',
  'approved', '',
  '2026-10-10T14:45:00.000Z', '2026-10-10T14:45:00.000Z', '2026-10-10T14:45:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, user_id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, rejection_reason,
  auto_decision, auto_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-9', 'u-seed-dr-farhana-vet-care', 'services', 'Veterinary', 'Mobile vet service at home — vaccination, checkup', 'Registered veterinary surgeon with 9 years of experience, offering at-home visits across Dhaka.

Services:
• Vaccination (rabies, DHPPi, feline tri-cat)
• General health checkup and deworming
• Wound dressing and post-surgical care
• Nutrition and behaviour consultation

Starting fee ৳1200 including travel within Banani, Gulshan and Baridhara. Medicine charged separately at cost price.',
  1200, 0, 'sale',
  'dhaka', 'Banani', '', '',
  0, 'New', 'active', 0, 640,
  'Dr. Farhana Vet Care', '01611001096', 'dr-farhana-vet-care@petbikroy.test', '',
  'approved', '',
  '2026-10-09T03:00:00.000Z', '2026-10-09T03:00:00.000Z', '2026-10-09T03:00:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, user_id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, rejection_reason,
  auto_decision, auto_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-10', 'u-seed-happy-tails-supplies', 'food', 'Dog Food', 'Royal Canin Maxi Adult 15kg — sealed, imported', 'Sealed 15kg bag of Royal Canin Maxi Adult, imported from Malaysia.

Manufacturing date 08/2026, expiry 08/2027. Stored in a dry warehouse away from sunlight.

Bulk buyers welcome — we have 20+ bags in stock and deliver free inside Dhaka for orders over ৳10,000.',
  11500, 1, 'sale',
  'dhaka', 'Badda', '', '',
  0, 'New', 'pending', 0, 178,
  'Happy Tails Supplies', '01711001233', 'happy-tails-supplies@petbikroy.test', '',
  'rejected', 'This kind of listing is not allowed here (Adult).',
  '2026-10-08T07:25:00.000Z', '2026-10-08T07:25:00.000Z', '2026-10-08T07:25:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, user_id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, rejection_reason,
  auto_decision, auto_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-11', 'u-seed-chattogram-canine', 'dogs', 'German Shepherd', 'German Shepherd long-coat female, excellent bloodline', 'Show-quality long-coat German Shepherd female, 5 months old.

• Imported sire from Germany (VA rating available)
• Hip and elbow screened parents
• Vaccinated, dewormed, microchipped

She is confident, alert and already responds to sit, down and recall. Handover only after meeting the puppy in person. Export pedigree documents available.',
  55000, 1, 'sale',
  'chattogram', 'Khulshi', '5 months', 'Female',
  1, 'New', 'active', 1, 1876,
  'Chattogram Canine', '01811001370', 'chattogram-canine@petbikroy.test', '',
  'approved', '',
  '2026-10-17T01:35:00.000Z', '2026-10-17T01:35:00.000Z', '2026-10-17T01:35:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, user_id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, rejection_reason,
  auto_decision, auto_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-12', 'u-seed-dhaka-stray-rescue', 'cats', 'Local / Deshi', 'Rescued deshi kittens looking for a loving home', 'Two deshi kittens (sisters) rescued from the street at 3 weeks old. Now 2 months, healthy, playful and fully litter trained.

They are dewormed and will be vaccinated before handover.

ADOPTION IS FREE but we will visit your home first — we only want responsible adopters who can commit for the cat''s lifetime. Both sisters should ideally be adopted together.',
  0, 0, 'adoption',
  'dhaka', 'Old Dhaka', '2 months', 'Female',
  0, 'Used', 'active', 0, 812,
  'Dhaka Stray Rescue', '01911001507', 'dhaka-stray-rescue@petbikroy.test', '',
  'approved', '',
  '2026-10-15T13:50:00.000Z', '2026-10-15T13:50:00.000Z', '2026-10-15T13:50:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, user_id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, rejection_reason,
  auto_decision, auto_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-13', 'u-seed-nadeem-aviary', 'birds', 'Lovebird', 'Fischer Lovebird pair, breeding-ready, 1 year', 'Healthy Fischer''s lovebird pair, bright lutino and green colouring.

They have already produced chicks twice this year. Fed on a mix of seeds, millet and sprouts.

Selling because I am reducing my flock. Comes with a small transport box.',
  4500, 1, 'sale',
  'rajshahi', 'Shaheb Bazar', '1 year', 'Pair',
  0, 'Used', 'active', 0, 199,
  'Nadeem Aviary', '01311001644', 'nadeem-aviary@petbikroy.test', '',
  'approved', '',
  '2026-10-07T09:15:00.000Z', '2026-10-07T09:15:00.000Z', '2026-10-07T09:15:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, user_id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, rejection_reason,
  auto_decision, auto_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-14', 'u-seed-nusrat-jahan', 'dogs', 'Poodle', 'Toy Poodle male, white, championship lines', 'Pure white toy Poodle male, 3 months old.

He does not shed much — ideal for families with allergy concerns. Loves cuddles, walks, and playing fetch.

Vaccination and deworming up to date. Handover with his healthcare card and a starter bag of food.',
  28000, 1, 'sale',
  'dhaka', 'Mohammadpur', '3 months', 'Male',
  1, 'New', 'active', 0, 1102,
  'Nusrat Jahan', '01511000137', 'nusrat-jahan@petbikroy.test', '',
  'approved', '',
  '2026-10-06T06:00:00.000Z', '2026-10-06T06:00:00.000Z', '2026-10-06T06:00:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, user_id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, rejection_reason,
  auto_decision, auto_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-15', 'u-seed-aqua-house-bd', 'fish', 'Koi', 'Japanese Koi carp 8-10 inch, pond quality', 'Imported Japanese Koi, 8–10 inches, assorted patterns — Kohaku, Sanke and Showa.

Fish are kept in a 3000 litre outdoor pond with weekly water changes. Healthy and actively feeding on pellets.

Price per fish. Buy 5 or more and get 10% off. We can also advise on pond setup.',
  3500, 1, 'sale',
  'dhaka', 'Savar', '10 months', '',
  0, 'New', 'active', 0, 267,
  'Aqua House BD', '01711000411', 'aqua-house-bd@petbikroy.test', '',
  'approved', '',
  '2026-10-05T02:40:00.000Z', '2026-10-05T02:40:00.000Z', '2026-10-05T02:40:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, user_id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, rejection_reason,
  auto_decision, auto_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-16', 'u-seed-khulna-pet-store', 'small-pets', 'Guinea Pig', 'Two guinea pigs with cage and hay bundle', 'Two cute guinea pigs (one orange, one tri-colour), both females, 6 months old.

They come with a 2x3 ft cage, hay rack, water bottle and half a bale of timothy hay.

Very tame, they squeak happily when they see food. Selling with everything as a complete package.',
  5500, 1, 'sale',
  'khulna', 'Sonadanga', '6 months', 'Pair',
  0, 'Used', 'sold', 0, 143,
  'Khulna Pet Store', '01511001781', 'khulna-pet-store@petbikroy.test', '',
  'approved', '',
  '2026-09-28T11:20:00.000Z', '2026-09-28T11:20:00.000Z', '2026-09-28T11:20:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, user_id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, rejection_reason,
  auto_decision, auto_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-17', 'u-seed-pawfect-grooming', 'services', 'Pet Grooming', 'Doorstep pet grooming — bath, trim, nail and ear care', 'Professional grooming at your doorstep — no stressful trips to a salon.

Package includes:
• Warm bath with medicated or gentle shampoo
• Full body trim and blow dry
• Nail clipping and filing
• Ear cleaning and de-shedding

Start price ৳1500 for small breeds; ৳2500 for large breeds. Book at least a day in advance.',
  1500, 0, 'sale',
  'dhaka', 'Gulshan', '', '',
  0, 'New', 'active', 0, 388,
  'Pawfect Grooming', '01611001918', 'pawfect-grooming@petbikroy.test', '',
  'approved', '',
  '2026-10-03T05:05:00.000Z', '2026-10-03T05:05:00.000Z', '2026-10-03T05:05:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, user_id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, rejection_reason,
  auto_decision, auto_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-18', 'u-seed-frozen-paws-husky', 'dogs', 'Siberian Husky', 'Siberian Husky female, blue eyes, thick coat', 'Siberian Husky female with striking ice-blue eyes, 6 months old.

• Double coat is thick and dense, excellent for our winter
• Fully vaccinated and vet checked
• Known bloodline — parents imported from Russia

Important: huskies need cool environments, daily exercise and strong fencing. Please only enquire if you can provide that. Comes with a 10-day health guarantee.',
  60000, 1, 'sale',
  'dhaka', 'Gazipur', '6 months', 'Female',
  1, 'New', 'active', 0, 1655,
  'Frozen Paws Husky', '01711002055', 'frozen-paws-husky@petbikroy.test', '',
  'approved', '',
  '2026-10-17T03:10:00.000Z', '2026-10-17T03:10:00.000Z', '2026-10-17T03:10:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, user_id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, rejection_reason,
  auto_decision, auto_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-19', 'u-seed-pet-bazar-bd', 'accessories', 'Collars & Leashes', 'Padded leather leash + harness set, medium size', 'Hand-stitched padded leather set in dark tan.

• Adjustable chest harness, fits 20–32 inch girth
• Matching 5 ft leash with brass fittings
• Soft padded lining so it will not chafe

Unused — bought as a gift and the size did not fit. Original packaging available.',
  1900, 1, 'sale',
  'dhaka', 'Dhanmondi', '', '',
  0, 'New', 'active', 0, 96,
  'Pet Bazar BD', '01511000959', 'pet-bazar-bd@petbikroy.test', '',
  'approved', '',
  '2026-10-02T08:30:00.000Z', '2026-10-02T08:30:00.000Z', '2026-10-02T08:30:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, user_id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, rejection_reason,
  auto_decision, auto_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-20', 'u-seed-rangpur-agro-farm', 'poultry', 'Chicken', 'Sonali chicks and grower hens, farm direct', 'Sonali breed chicks and grower hens straight from our farm.

• Vaccinated as per poultry schedule
• Grown on our own feed, no growth hormones
• Mortality replacement guarantee within 3 days

Price is per bird: chicks ৳180, growers ৳340, laying hens ৳520. Minimum order 20 birds. Delivery across Rangpur division.',
  180, 1, 'sale',
  'rangpur', 'Dhap', '1 month', '',
  1, 'New', 'active', 0, 502,
  'Rangpur Agro Farm', '01811002192', 'rangpur-agro-farm@petbikroy.test', '',
  'approved', '',
  '2026-10-01T01:00:00.000Z', '2026-10-01T01:00:00.000Z', '2026-10-01T01:00:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, user_id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, rejection_reason,
  auto_decision, auto_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-21', 'u-seed-royal-feline-bd', 'cats', 'Bengal', 'Bengal kitten, rosetted coat, TICA lineage', 'Bengal kitten with a bold rosetted coat and glittered pelt, from TICA registered lines.

• 3 months old, vaccinated twice and dewormed
• Litter trained, eats raw and premium wet food
• Very confident, loves climbing and water play

Includes vaccination book, pedigree paperwork and a starter kit. Video calls welcome before purchase.',
  48000, 1, 'sale',
  'dhaka', 'Gulshan', '3 months', 'Male',
  1, 'New', 'active', 1, 1340,
  'Royal Feline BD', '01911002329', 'royal-feline-bd@petbikroy.test', '',
  'approved', '',
  '2026-10-16T11:40:00.000Z', '2026-10-16T11:40:00.000Z', '2026-10-16T11:40:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, user_id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, rejection_reason,
  auto_decision, auto_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-22', 'u-seed-exotic-pets-dhaka', 'other', 'Reptiles', 'Red-eared slider turtles with tank setup', 'Two healthy red-eared sliders plus their full setup.

Included: 24 inch glass tank, basking dock, UVB lamp, canister filter and a bottle of turtle food.

They are about 4 inches across the shell and very active. Shells are clean with no softness or fungus. Ideal starter reptile pair.',
  4200, 1, 'sale',
  'dhaka', 'Motijheel', '1 year', '',
  0, 'Used', 'active', 0, 231,
  'Exotic Pets Dhaka', '01311002466', 'exotic-pets-dhaka@petbikroy.test', '',
  'approved', '',
  '2026-09-30T12:25:00.000Z', '2026-09-30T12:25:00.000Z', '2026-09-30T12:25:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, user_id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, rejection_reason,
  auto_decision, auto_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-23', 'u-seed-happy-tails-supplies', 'food', 'Cat Food', 'Whiskas dry cat food 7kg, sealed and fresh stock', 'Whiskas Adult dry food, 7kg value pack, factory sealed.

Best before 07/2027. Fresh stock, stored away from heat and moisture.

We also stock Sheba, Me-O and Royal Canin. Free delivery inside Dhaka for orders over ৳5000. Wholesale rates for shops available.',
  4900, 0, 'sale',
  'dhaka', 'Mirpur', '', '',
  0, 'New', 'pending', 0, 155,
  'Happy Tails Supplies', '01711001233', 'happy-tails-supplies@petbikroy.test', '',
  'rejected', 'This kind of listing is not allowed here (Adult).',
  '2026-10-14T04:50:00.000Z', '2026-10-14T04:50:00.000Z', '2026-10-14T04:50:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, user_id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, rejection_reason,
  auto_decision, auto_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-24', 'u-seed-rakib-hasan', 'dogs', 'Beagle', 'Beagle puppies (tricolour), 2 males available', 'Two tricolour Beagle males from our family pair, born 12 August.

• Very social, raised inside the house with kids
• First vaccination and deworming complete
• Nose-driven and food motivated — easy to train

Price is per puppy. Buying both? We will do a discount and include their travel crate.',
  22000, 1, 'sale',
  'dhaka', 'Dhanmondi', '2 months', 'Male',
  1, 'New', 'active', 0, 987,
  'Rakib Hasan', '01311000000', 'rakib-hasan@petbikroy.test', '',
  'approved', '',
  '2026-10-13T10:10:00.000Z', '2026-10-13T10:10:00.000Z', '2026-10-13T10:10:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, user_id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, rejection_reason,
  auto_decision, auto_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-25', 'u-seed-khulna-pet-store', 'dogs', 'Golden Retriever', 'Golden Retriever female, 3 months, family raised', 'Golden Retriever female puppy, 3 months old, raised inside our home with two children.

• Vaccinated and dewormed, card provided
• Both parents are healthy family pets you can meet
• Very soft mouth, already learning to fetch

Selling to a screened home only. Handover in Khulna city, or I can arrange transport to Dhaka at buyer''s cost.',
  38000, 1, 'sale',
  'khulna', 'Sonadanga', '3 months', 'Female',
  1, 'New', 'active', 0, 764,
  'Khulna Pet Store', '01511001781', 'khulna-pet-store@petbikroy.test', '',
  'approved', '',
  '2026-10-16T05:25:00.000Z', '2026-10-16T05:25:00.000Z', '2026-10-16T05:25:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, user_id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, rejection_reason,
  auto_decision, auto_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-26', 'u-seed-little-paws-bd', 'small-pets', 'Hamster', 'Syrian hamsters with cage, wheel and bedding', 'Two female Syrian hamsters — one golden, one cream banded.

Included: a wired cage with a solid base, an 8-inch silent wheel, a water bottle, a hideout and a bag of bedding.

They are tame enough to be handled and are kept separately as Syrians must live alone. Perfect low-maintenance first pet for a child.',
  2500, 1, 'sale',
  'dhaka', 'Bashundhara', '3 months', 'Female',
  0, 'Used', 'active', 0, 187,
  'Little Paws BD', '01511002603', 'little-paws-bd@petbikroy.test', '',
  'approved', '',
  '2026-10-15T07:15:00.000Z', '2026-10-15T07:15:00.000Z', '2026-10-15T07:15:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, user_id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, rejection_reason,
  auto_decision, auto_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-27', 'u-seed-barishal-pet-house', 'cats', 'Siamese', 'Siamese kitten, blue eyes, very vocal and affectionate', 'Classic seal-point Siamese male, 4 months old, with deep blue eyes.

He is extremely people-oriented — he will follow you around the house and "talk" to you all day. Litter trained, vaccinated and dewormed.

Eats both dry and wet food. Comes with his vaccination card and a starter bag of food.',
  20000, 1, 'sale',
  'barishal', 'Band Road', '4 months', 'Male',
  1, 'New', 'active', 0, 421,
  'Barishal Pet House', '01611002740', 'barishal-pet-house@petbikroy.test', '',
  'approved', '',
  '2026-10-14T03:35:00.000Z', '2026-10-14T03:35:00.000Z', '2026-10-14T03:35:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, user_id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, rejection_reason,
  auto_decision, auto_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-28', 'u-seed-mymensingh-aviary', 'birds', 'Budgerigar', 'Tame budgerigar pair with cage, hand-fed', 'Hand-fed budgerigar pair — a blue cock and a green hen, both very tame.

They are not hand-shy at all and will sit on your finger. Already used to a cage with a nest box.

Included: the cage, two feeders and a water bottle. Price is fixed for the complete setup.',
  1200, 0, 'sale',
  'mymensingh', 'Ganginarpar', '6 months', 'Pair',
  0, 'New', 'active', 0, 268,
  'Mymensingh Aviary', '01711002877', 'mymensingh-aviary@petbikroy.test', '',
  'approved', '',
  '2026-10-12T10:45:00.000Z', '2026-10-12T10:45:00.000Z', '2026-10-12T10:45:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, user_id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, rejection_reason,
  auto_decision, auto_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-29', 'u-seed-sylhet-pet-corner', 'small-pets', 'Turtle & Tortoise', 'Indian star tortoise, captive bred, healthy shell', 'Captive-bred Indian star tortoise, about 1 year old with a clean and fully grown shell.

Fed on a mix of leafy greens, hibiscus flowers and a calcium supplement. Active and curious.

Important: star tortoises are a protected species in Bangladesh — this tortoise was captive bred and comes with a certificate from the breeder. It is not wild caught.',
  3000, 1, 'sale',
  'sylhet', 'Ambarkhana', '1 year', '',
  0, 'New', 'active', 0, 341,
  'Sylhet Pet Corner', '01311000822', 'sylhet-pet-corner@petbikroy.test', '',
  'approved', '',
  '2026-10-11T06:20:00.000Z', '2026-10-11T06:20:00.000Z', '2026-10-11T06:20:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, user_id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, rejection_reason,
  auto_decision, auto_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-30', 'u-seed-chattogram-canine', 'accessories', 'Beds', 'Elevated pet bed, washable, size medium', 'Elevated mesh bed that lifts your pet off the floor — great for hot weather and for older dogs with joint pain.

• Frame is powder-coated steel, supports up to 40 kg
• Mesh cover unzips and is machine washable
• Assembled in seconds, no tools needed

Brand new, unused. Two available. Cover: 90 x 60 cm.',
  2200, 1, 'sale',
  'chattogram', 'Nasirabad', '', '',
  0, 'New', 'active', 0, 88,
  'Chattogram Canine', '01811001370', 'chattogram-canine@petbikroy.test', '',
  'approved', '',
  '2026-10-10T09:55:00.000Z', '2026-10-10T09:55:00.000Z', '2026-10-10T09:55:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, user_id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, rejection_reason,
  auto_decision, auto_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-31', 'u-seed-rangpur-k9-school', 'services', 'Dog Training', 'Obedience training at home — 8 session package', 'Eight private training sessions at your home, roughly one hour each.

What we cover:
• Sit, down, stay, come and loose-leash walking
• Crate training and house training
• Stopping jumping, barking and pulling

Suitable for puppies from 4 months and for adult dogs with habits to fix. Includes a training leash and treat pouch.',
  6000, 1, 'sale',
  'rangpur', 'Jahaj Company', '', '',
  0, 'New', 'pending', 0, 176,
  'Rangpur K9 School', '01811003014', 'rangpur-k9-school@petbikroy.test', '',
  'rejected', 'This kind of listing is not allowed here (adult).',
  '2026-10-09T08:05:00.000Z', '2026-10-09T08:05:00.000Z', '2026-10-09T08:05:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, user_id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, rejection_reason,
  auto_decision, auto_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-32', 'u-seed-nadeem-aviary', 'fish', 'Guppy', 'Show-quality guppy trios, assorted strains', 'Show-quality guppies sold as trios — one male and two females.

Strains available: red mosaic, blue grass, yellow leopard and full red.

Fish are bred in our own tanks and are free of disease. Price is per trio. Buy three trios and get a fourth one free. I can advise on tank setup for beginners.',
  400, 0, 'sale',
  'rajshahi', 'Uposhohor', '3 months', 'Pair',
  0, 'New', 'active', 0, 212,
  'Nadeem Aviary', '01311001644', 'nadeem-aviary@petbikroy.test', '',
  'approved', '',
  '2026-10-08T04:30:00.000Z', '2026-10-08T04:30:00.000Z', '2026-10-08T04:30:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, user_id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, rejection_reason,
  auto_decision, auto_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-33', 'u-seed-mymensingh-aviary', 'dogs', 'Local / Deshi', 'Deshi mixed-breed puppies, very loyal and healthy', 'Two healthy deshi puppies from our neighbourhood dog, born 25 August.

• First vaccination and deworming done
• Used to rice, chicken and commercial puppy food
• Alert, sociable and already sleeping through the night

Deshi dogs are the hardiest and most adaptable pets you can keep in Bangladesh — great with children and excellent watchdogs. Price is per puppy.',
  5000, 1, 'sale',
  'mymensingh', 'Charpara', '2 months', 'Male',
  1, 'New', 'active', 0, 396,
  'Mymensingh Aviary', '01711002877', 'mymensingh-aviary@petbikroy.test', '',
  'approved', '',
  '2026-10-13T02:50:00.000Z', '2026-10-13T02:50:00.000Z', '2026-10-13T02:50:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, user_id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, rejection_reason,
  auto_decision, auto_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-34', 'u-seed-barishal-agro-hatchery', 'poultry', 'Duck', 'Muscovy ducklings, 3 weeks old, fast growing', 'Muscovy ducklings, three weeks old and strong on their feet.

Muscovy is the best duck breed for home rearing — they grow fast, eat less than chickens and are resistant to most local diseases.

Price is per duckling, minimum order 10. FCR and feeding guidance provided with every order. Delivery across Barishal division.',
  350, 1, 'sale',
  'barishal', 'Rupatali', '3 weeks', '',
  1, 'New', 'active', 0, 305,
  'Barishal Agro Hatchery', '01911003151', 'barishal-agro-hatchery@petbikroy.test', '',
  'approved', '',
  '2026-10-07T00:40:00.000Z', '2026-10-07T00:40:00.000Z', '2026-10-07T00:40:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, user_id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, rejection_reason,
  auto_decision, auto_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-35', 'u-seed-k9-kennel-dhaka', 'dogs', 'Local / Deshi', 'AMAZING PUPPY BUY NOW CHEAP!!! best deal ever', 'AMAZING PUPPY!!! BUY NOW!!! Best deal ever!!! Visit www.free-puppy-bd.com/order for
      photos and pricing. We have unlimited puppies, click the link and order today.',
  500, 0, 'sale',
  'dhaka', 'Uttara', '2 months', 'Male',
  0, 'New', 'pending', 0, 42,
  'K9 Kennel Dhaka', '01811000548', 'k9-kennel-dhaka@petbikroy.test', '',
  'held', 'A web link appears in the listing. Too many exclamation marks.',
  '2026-10-18T00:10:00.000Z', '2026-10-18T00:10:00.000Z', '2026-10-18T00:10:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, user_id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, rejection_reason,
  auto_decision, auto_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-36', 'u-seed-aqua-house-bd', 'cats', 'Local / Deshi', 'Free kitten — message us to claim yours today', 'These kittens are free — just pay for collection.

Do not chat on this site. Message our driver on WhatsApp at 01711000000 right now to
      arrange pickup. Limited stock, first caller wins. Payment by bKash only.',
  0, 0, 'adoption',
  'dhaka', 'Mirpur', '2 months', 'Female',
  0, 'Used', 'pending', 0, 88,
  'Aqua House BD', '01711000411', 'aqua-house-bd@petbikroy.test', '',
  'rejected', 'Looks like an attempt to move off the site: off-site messaging app, a phone number, a payment link',
  '2026-10-18T01:25:00.000Z', '2026-10-18T01:25:00.000Z', '2026-10-18T01:25:00.000Z'
);

-- ---------------------------------------------------------------- settings --

INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('site_name', 'PetBikroy', '2026-10-30T17:54:45.812Z');
INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('auto_approve', '1', '2026-10-30T17:54:45.812Z');
INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('auto_moderation', '1', '2026-10-30T17:54:45.812Z');
INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('auto_reject', '0', '2026-10-30T17:54:45.812Z');
INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('listings_per_page', '12', '2026-10-30T17:54:45.812Z');
INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('posting_enabled', '1', '2026-10-30T17:54:45.812Z');
INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('post_limit', '10', '2026-10-30T17:54:45.812Z');
INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('signup_limit', '10', '2026-10-30T17:54:45.812Z');
INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('contact_email', 'hello@petbikroy.test', '2026-10-30T17:54:45.812Z');

-- Done.
