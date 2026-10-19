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

-- ------------------------------------------------------------------ demo ads --

INSERT OR REPLACE INTO ads (
  id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, owner_token_hash, rejection_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-1', 'dogs', 'Labrador', '2 months old Labrador puppy, vaccinated, home trained', 'Pure Labrador puppy, 2 months old, very active and playful.

• First vaccination and deworming done
• Litter trained
• Both parents are pedigree Labradors (photos available on request)
• Raised with children, so very friendly

Reason for selling: relocating abroad. Serious buyers only. Price slightly negotiable for a good home.',
  25000, 1, 'sale',
  'dhaka', 'Dhanmondi', '2 months', 'Male',
  1, 'New', 'active', 1, 1284,
  'Rakib Hasan', '01716896622', '',
  '97ba64852428666bb8a1e93f8d2fa1becefcbbc38724e30aa45aad6576c4f080', '',
  '2026-10-15T03:20:00.000Z', '2026-10-15T03:20:00.000Z', '2026-10-15T03:20:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, owner_token_hash, rejection_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-2', 'cats', 'Persian', 'Persian cat, 1 year old, very chubby and calm', 'Chinchilla-faced white Persian, extremely calm and litter trained.

She is fully vaccinated, dewormed, and has a clean bill of health from a vet. Eats both dry and wet premium cat food.

Comes with her litter box, food bowls and a bag of Royal Canin. Only giving away because my apartment building does not allow pets.',
  18000, 0, 'sale',
  'dhaka', 'Gulshan', '1 year', 'Female',
  1, 'Used', 'active', 1, 972,
  'Nusrat Jahan', '01717236277', '',
  '6072da182d4686ec69e8ebba414a328a6bedba4b745391e0c52a7576e138dcc0', '',
  '2026-10-14T12:05:00.000Z', '2026-10-14T12:05:00.000Z', '2026-10-14T12:05:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, owner_token_hash, rejection_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-3', 'birds', 'Cockatiel', 'Pair of hand-tamed Cockatiels with cage', 'A friendly pair of cockatiels — one grey, one lutino. Both are hand-tamed and step up onto your finger.

Included: a large powder-coated cage, two feeders, a water bottle and an almost full pack of bird seed.

They whistle tunes and are very social. Selling because I am moving to a shared apartment.',
  9500, 1, 'sale',
  'chattogram', 'Agrabad', '8 months', 'Pair',
  0, 'Used', 'active', 0, 431,
  'Imran Chowdhury', '01717812382', '',
  '4cf2d81049c2adbaf7b26193f395b8d1c80435f2eecedc807361e1b243f6aec3', '',
  '2026-10-13T05:40:00.000Z', '2026-10-13T05:40:00.000Z', '2026-10-13T05:40:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, owner_token_hash, rejection_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-4', 'fish', 'Betta', 'Premium halfmoon Betta fish — assorted colours', 'Imported halfmoon Bettas, multiple colours available — blue, red, koi and butterfly.

• Kept in individual conditioned tanks
• Fed on live and frozen food
• Healthy fins, no fin rot

Price is per fish. Tank and accessories sold separately. Delivery available inside Dhaka for ৳150.',
  850, 0, 'sale',
  'dhaka', 'Mirpur', '4 months', 'Male',
  0, 'New', 'active', 0, 356,
  'Aqua House BD', '01714357819', '',
  '87d31fe66e604a6ddd4946a43415c131b7d4e45bc69d86d172b1498838f4c3df', '',
  '2026-10-16T02:15:00.000Z', '2026-10-16T02:15:00.000Z', '2026-10-16T02:15:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, owner_token_hash, rejection_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-5', 'dogs', 'Rottweiler', 'Rottweiler male, 4 months, heavy bone structure', 'German bloodline Rottweiler male puppy from imported parents.

• Vaccination card and deworming record provided
• Heavy bone, broad head, excellent temperament
• Started on obedience basics

Both sire and dam can be seen at our kennel in Uttara. We offer a 7-day health guarantee and free delivery inside Dhaka city.',
  45000, 1, 'sale',
  'dhaka', 'Uttara', '4 months', 'Male',
  1, 'New', 'active', 1, 2140,
  'K9 Kennel Dhaka', '01713849926', '',
  '5e8ac318c5f2abc8504758e93b39f0c816d0e0243173fb0dfd59bd94bb45018f', '',
  '2026-10-16T08:55:00.000Z', '2026-10-16T08:55:00.000Z', '2026-10-16T08:55:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, owner_token_hash, rejection_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-6', 'cats', 'British Shorthair', 'British Shorthair blue kitten, litter trained', 'Pedigree blue British Shorthair with plush coat, round face and orange eyes.

She is 3 months old, fully vaccinated, dewormed and uses the litter box without fail. Very affectionate but not clingy — typical BSH temperament.

Will come with her vaccination card, favourite toy and current food. Delivery inside Dhaka can be arranged.',
  32000, 0, 'sale',
  'dhaka', 'Bashundhara', '3 months', 'Female',
  1, 'New', 'active', 0, 1503,
  'Ayesha Rahman', '01714747752', '',
  '488f95759714aba296c21281d453cffc6464d008e94c7a6536eb98cfe7a60c7c', '',
  '2026-10-11T10:30:00.000Z', '2026-10-11T10:30:00.000Z', '2026-10-11T10:30:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, owner_token_hash, rejection_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-7', 'small-pets', 'Rabbit', 'White Angora rabbits — baby pair available', 'Healthy Angora baby rabbits, extremely soft wool and very calm nature.

Fed on grass, pellets and fresh greens. Perfect for children as a first pet.

Price is per pair. Handover in Sylhet city; I can also send them to Dhaka by bus with a carrier box at buyer''s cost.',
  3200, 1, 'sale',
  'sylhet', 'Zindabazar', '2 months', 'Pair',
  0, 'New', 'active', 0, 288,
  'Sylhet Pet Corner', '01713920932', '',
  '474208e2aadb2c82a59996f835960286a45ed77e21f69fdcc092d2f9dcba0793', '',
  '2026-10-12T04:10:00.000Z', '2026-10-12T04:10:00.000Z', '2026-10-12T04:10:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, owner_token_hash, rejection_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-8', 'accessories', 'Cages & Crates', 'Imported large dog crate with wheels and tray', 'Heavy-duty imported crate, suitable for a Labrador or German Shepherd.

• Size: 42 inch (L) x 28 inch (W) x 30 inch (H)
• Removable metal tray, wipe-clean
• Two locking doors, foldable for travel
• Wheels with brakes

Used for six months, no rust or dents. Selling because my dog outgrew it. Buyer picks up from Mohammadpur.',
  12500, 1, 'sale',
  'dhaka', 'Mohammadpur', '', '',
  0, 'Used', 'active', 0, 214,
  'Pet Bazar BD', '01711055926', '',
  '28015519b51dddc68e86bc60877abc3a4ac82e245b90684b0d35ab2c76322c2b', '',
  '2026-10-10T14:45:00.000Z', '2026-10-10T14:45:00.000Z', '2026-10-10T14:45:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, owner_token_hash, rejection_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-9', 'services', 'Veterinary', 'Mobile vet service at home — vaccination, checkup', 'Registered veterinary surgeon with 9 years of experience, offering at-home visits across Dhaka.

Services:
• Vaccination (rabies, DHPPi, feline tri-cat)
• General health checkup and deworming
• Wound dressing and post-surgical care
• Nutrition and behaviour consultation

Starting fee ৳1200 including travel within Banani, Gulshan and Baridhara. Medicine charged separately at cost price.',
  1200, 0, 'sale',
  'dhaka', 'Banani', '', '',
  0, 'New', 'active', 0, 640,
  'Dr. Farhana Vet Care', '01713746029', '',
  '977a5f35acae1ba1cca3b64f8aa8c3978e1972689be0bbb6dcb7471e8e439a6c', '',
  '2026-10-09T03:00:00.000Z', '2026-10-09T03:00:00.000Z', '2026-10-09T03:00:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, owner_token_hash, rejection_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-10', 'food', 'Dog Food', 'Royal Canin Maxi Adult 15kg — sealed, imported', 'Sealed 15kg bag of Royal Canin Maxi Adult, imported from Malaysia.

Manufacturing date 08/2026, expiry 08/2027. Stored in a dry warehouse away from sunlight.

Bulk buyers welcome — we have 20+ bags in stock and deliver free inside Dhaka for orders over ৳10,000.',
  11500, 1, 'sale',
  'dhaka', 'Badda', '', '',
  0, 'New', 'active', 0, 178,
  'Happy Tails Supplies', '01711433268', '',
  'ede3b2aa2d7490d413708283dbc11caee347e437eb9adc006719099bb63f8fc2', '',
  '2026-10-08T07:25:00.000Z', '2026-10-08T07:25:00.000Z', '2026-10-08T07:25:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, owner_token_hash, rejection_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-11', 'dogs', 'German Shepherd', 'German Shepherd long-coat female, excellent bloodline', 'Show-quality long-coat German Shepherd female, 5 months old.

• Imported sire from Germany (VA rating available)
• Hip and elbow screened parents
• Vaccinated, dewormed, microchipped

She is confident, alert and already responds to sit, down and recall. Handover only after meeting the puppy in person. Export pedigree documents available.',
  55000, 1, 'sale',
  'chattogram', 'Khulshi', '5 months', 'Female',
  1, 'New', 'active', 1, 1876,
  'Chattogram Canine', '01718427063', '',
  'a1d86ec1935a817bf0d4bede768be97bb73e67d5f35380b5c97787880d870f07', '',
  '2026-10-17T01:35:00.000Z', '2026-10-17T01:35:00.000Z', '2026-10-17T01:35:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, owner_token_hash, rejection_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-12', 'cats', 'Local / Deshi', 'Rescued deshi kittens looking for a loving home', 'Two deshi kittens (sisters) rescued from the street at 3 weeks old. Now 2 months, healthy, playful and fully litter trained.

They are dewormed and will be vaccinated before handover.

ADOPTION IS FREE but we will visit your home first — we only want responsible adopters who can commit for the cat''s lifetime. Both sisters should ideally be adopted together.',
  0, 0, 'adoption',
  'dhaka', 'Old Dhaka', '2 months', 'Female',
  0, 'Used', 'active', 0, 812,
  'Dhaka Stray Rescue', '01712176990', '',
  'ba76c6cedfff84e3638bfa98a4db3f268dd264d3be77f0fecb2b4b03e94779b8', '',
  '2026-10-15T13:50:00.000Z', '2026-10-15T13:50:00.000Z', '2026-10-15T13:50:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, owner_token_hash, rejection_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-13', 'birds', 'Lovebird', 'Fischer Lovebird pair, breeding-ready, 1 year', 'Healthy Fischer''s lovebird pair, bright lutino and green colouring.

They have already produced chicks twice this year. Fed on a mix of seeds, millet and sprouts.

Selling because I am reducing my flock. Comes with a small transport box.',
  4500, 1, 'sale',
  'rajshahi', 'Shaheb Bazar', '1 year', 'Pair',
  0, 'Used', 'active', 0, 199,
  'Nadeem Aviary', '01715933510', '',
  '10e63cafacb74e6bbfeaefa0f8e9ce277950b953d1fd0295d7ab22cb7bdd2ce9', '',
  '2026-10-07T09:15:00.000Z', '2026-10-07T09:15:00.000Z', '2026-10-07T09:15:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, owner_token_hash, rejection_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-14', 'dogs', 'Poodle', 'Toy Poodle male, white, championship lines', 'Pure white toy Poodle male, 3 months old.

He does not shed much — ideal for families with allergy concerns. Loves cuddles, walks, and playing fetch.

Vaccination and deworming up to date. Handover with his healthcare card and a starter bag of food.',
  28000, 1, 'sale',
  'dhaka', 'Mohammadpur', '3 months', 'Male',
  1, 'New', 'active', 0, 1102,
  'Nusrat Jahan', '01718891660', '',
  'b4018defaac77019f6e3ab11c1f08938e848e77cc1e19f965babd68ac857a9d1', '',
  '2026-10-06T06:00:00.000Z', '2026-10-06T06:00:00.000Z', '2026-10-06T06:00:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, owner_token_hash, rejection_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-15', 'fish', 'Koi', 'Japanese Koi carp 8-10 inch, pond quality', 'Imported Japanese Koi, 8–10 inches, assorted patterns — Kohaku, Sanke and Showa.

Fish are kept in a 3000 litre outdoor pond with weekly water changes. Healthy and actively feeding on pellets.

Price per fish. Buy 5 or more and get 10% off. We can also advise on pond setup.',
  3500, 1, 'sale',
  'dhaka', 'Savar', '10 months', '',
  0, 'New', 'active', 0, 267,
  'Aqua House BD', '01711098208', '',
  '73c6abb8d713abb8859375f1645f605c3e64f02e79979bf1371986d4a476104f', '',
  '2026-10-05T02:40:00.000Z', '2026-10-05T02:40:00.000Z', '2026-10-05T02:40:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, owner_token_hash, rejection_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-16', 'small-pets', 'Guinea Pig', 'Two guinea pigs with cage and hay bundle', 'Two cute guinea pigs (one orange, one tri-colour), both females, 6 months old.

They come with a 2x3 ft cage, hay rack, water bottle and half a bale of timothy hay.

Very tame, they squeak happily when they see food. Selling with everything as a complete package.',
  5500, 1, 'sale',
  'khulna', 'Sonadanga', '6 months', 'Pair',
  0, 'Used', 'sold', 0, 143,
  'Khulna Pet Store', '01713982976', '',
  'a33d2f0e076ed18f15f57091658d8a71bae57c6f770ec48b8c23d846989be02e', '',
  '2026-09-28T11:20:00.000Z', '2026-09-28T11:20:00.000Z', '2026-09-28T11:20:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, owner_token_hash, rejection_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-17', 'services', 'Pet Grooming', 'Doorstep pet grooming — bath, trim, nail and ear care', 'Professional grooming at your doorstep — no stressful trips to a salon.

Package includes:
• Warm bath with medicated or gentle shampoo
• Full body trim and blow dry
• Nail clipping and filing
• Ear cleaning and de-shedding

Start price ৳1500 for small breeds; ৳2500 for large breeds. Book at least a day in advance.',
  1500, 0, 'sale',
  'dhaka', 'Gulshan', '', '',
  0, 'New', 'active', 0, 388,
  'Pawfect Grooming', '01717106715', '',
  'a03eee42d6681b1ac2a4d7a69d29bb3e4c3feba4d38df54d9381ad3add592929', '',
  '2026-10-03T05:05:00.000Z', '2026-10-03T05:05:00.000Z', '2026-10-03T05:05:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, owner_token_hash, rejection_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-18', 'dogs', 'Siberian Husky', 'Siberian Husky female, blue eyes, thick coat', 'Siberian Husky female with striking ice-blue eyes, 6 months old.

• Double coat is thick and dense, excellent for our winter
• Fully vaccinated and vet checked
• Known bloodline — parents imported from Russia

Important: huskies need cool environments, daily exercise and strong fencing. Please only enquire if you can provide that. Comes with a 10-day health guarantee.',
  60000, 1, 'sale',
  'dhaka', 'Gazipur', '6 months', 'Female',
  1, 'New', 'active', 0, 1655,
  'Frozen Paws Husky', '01715584099', '',
  'a80b182d16f3e2a1dcb1e35a985bc3abd5b7730e8408e30a158adacf243578f8', '',
  '2026-10-17T03:10:00.000Z', '2026-10-17T03:10:00.000Z', '2026-10-17T03:10:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, owner_token_hash, rejection_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-19', 'accessories', 'Collars & Leashes', 'Padded leather leash + harness set, medium size', 'Hand-stitched padded leather set in dark tan.

• Adjustable chest harness, fits 20–32 inch girth
• Matching 5 ft leash with brass fittings
• Soft padded lining so it will not chafe

Unused — bought as a gift and the size did not fit. Original packaging available.',
  1900, 1, 'sale',
  'dhaka', 'Dhanmondi', '', '',
  0, 'New', 'active', 0, 96,
  'Pet Bazar BD', '01716367502', '',
  'babae2fd63143cc8a1cc8fc4146f0255536bbcf94315d147b9769ca60e677388', '',
  '2026-10-02T08:30:00.000Z', '2026-10-02T08:30:00.000Z', '2026-10-02T08:30:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, owner_token_hash, rejection_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-20', 'poultry', 'Chicken', 'Sonali chicks and grower hens, farm direct', 'Sonali breed chicks and grower hens straight from our farm.

• Vaccinated as per poultry schedule
• Grown on our own feed, no growth hormones
• Mortality replacement guarantee within 3 days

Price is per bird: chicks ৳180, growers ৳340, laying hens ৳520. Minimum order 20 birds. Delivery across Rangpur division.',
  180, 1, 'sale',
  'rangpur', 'Dhap', '1 month', '',
  1, 'New', 'active', 0, 502,
  'Rangpur Agro Farm', '01714371518', '',
  '3db81df3973b4ee5dee41800465e66d7de48cbee95e661493c776acee4c8ad65', '',
  '2026-10-01T01:00:00.000Z', '2026-10-01T01:00:00.000Z', '2026-10-01T01:00:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, owner_token_hash, rejection_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-21', 'cats', 'Bengal', 'Bengal kitten, rosetted coat, TICA lineage', 'Bengal kitten with a bold rosetted coat and glittered pelt, from TICA registered lines.

• 3 months old, vaccinated twice and dewormed
• Litter trained, eats raw and premium wet food
• Very confident, loves climbing and water play

Includes vaccination book, pedigree paperwork and a starter kit. Video calls welcome before purchase.',
  48000, 1, 'sale',
  'dhaka', 'Gulshan', '3 months', 'Male',
  1, 'New', 'active', 1, 1340,
  'Royal Feline BD', '01718063771', '',
  '6002501d148a9f86caff4454902cdb023bdf8212e9440837421d21a8210f8bc9', '',
  '2026-10-16T11:40:00.000Z', '2026-10-16T11:40:00.000Z', '2026-10-16T11:40:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, owner_token_hash, rejection_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-22', 'other', 'Reptiles', 'Red-eared slider turtles with tank setup', 'Two healthy red-eared sliders plus their full setup.

Included: 24 inch glass tank, basking dock, UVB lamp, canister filter and a bottle of turtle food.

They are about 4 inches across the shell and very active. Shells are clean with no softness or fungus. Ideal starter reptile pair.',
  4200, 1, 'sale',
  'dhaka', 'Motijheel', '1 year', '',
  0, 'Used', 'active', 0, 231,
  'Exotic Pets Dhaka', '01711491633', '',
  '6917f3dd86ddfa03a7a7e46931084bfd867d2d021028006417bc598b8249e9bb', '',
  '2026-09-30T12:25:00.000Z', '2026-09-30T12:25:00.000Z', '2026-09-30T12:25:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, owner_token_hash, rejection_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-23', 'food', 'Cat Food', 'Whiskas dry cat food 7kg, sealed and fresh stock', 'Whiskas Adult dry food, 7kg value pack, factory sealed.

Best before 07/2027. Fresh stock, stored away from heat and moisture.

We also stock Sheba, Me-O and Royal Canin. Free delivery inside Dhaka for orders over ৳5000. Wholesale rates for shops available.',
  4900, 0, 'sale',
  'dhaka', 'Mirpur', '', '',
  0, 'New', 'active', 0, 155,
  'Happy Tails Supplies', '01714701147', '',
  'a6c38237cfb57b42e808f08d09363c5bb72e3e6854510a5120a9abce436866d7', '',
  '2026-10-14T04:50:00.000Z', '2026-10-14T04:50:00.000Z', '2026-10-14T04:50:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, owner_token_hash, rejection_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-24', 'dogs', 'Beagle', 'Beagle puppies (tricolour), 2 males available', 'Two tricolour Beagle males from our family pair, born 12 August.

• Very social, raised inside the house with kids
• First vaccination and deworming complete
• Nose-driven and food motivated — easy to train

Price is per puppy. Buying both? We will do a discount and include their travel crate.',
  22000, 1, 'sale',
  'dhaka', 'Dhanmondi', '2 months', 'Male',
  1, 'New', 'active', 0, 987,
  'Rakib Hasan', '01712922014', '',
  '1e36854693275d43f94e22dc8e48cd497ea362b7f18dceed94221ced91fcfce6', '',
  '2026-10-13T10:10:00.000Z', '2026-10-13T10:10:00.000Z', '2026-10-13T10:10:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, owner_token_hash, rejection_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-25', 'dogs', 'Golden Retriever', 'Golden Retriever female, 3 months, family raised', 'Golden Retriever female puppy, 3 months old, raised inside our home with two children.

• Vaccinated and dewormed, card provided
• Both parents are healthy family pets you can meet
• Very soft mouth, already learning to fetch

Selling to a screened home only. Handover in Khulna city, or I can arrange transport to Dhaka at buyer''s cost.',
  38000, 1, 'sale',
  'khulna', 'Sonadanga', '3 months', 'Female',
  1, 'New', 'active', 0, 764,
  'Khulna Pet Store', '01711767366', '',
  'd9dcc3f2901ee3610bbd102250523a8a1bfc0ecc17ba36b9628325c23e50439a', '',
  '2026-10-16T05:25:00.000Z', '2026-10-16T05:25:00.000Z', '2026-10-16T05:25:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, owner_token_hash, rejection_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-26', 'small-pets', 'Hamster', 'Syrian hamsters with cage, wheel and bedding', 'Two female Syrian hamsters — one golden, one cream banded.

Included: a wired cage with a solid base, an 8-inch silent wheel, a water bottle, a hideout and a bag of bedding.

They are tame enough to be handled and are kept separately as Syrians must live alone. Perfect low-maintenance first pet for a child.',
  2500, 1, 'sale',
  'dhaka', 'Bashundhara', '3 months', 'Female',
  0, 'Used', 'active', 0, 187,
  'Little Paws BD', '01711742749', '',
  '90197510c74c0caab5983fbe9bf057b5b2e34e1aeabbffb8d4ed3b75375acad5', '',
  '2026-10-15T07:15:00.000Z', '2026-10-15T07:15:00.000Z', '2026-10-15T07:15:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, owner_token_hash, rejection_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-27', 'cats', 'Siamese', 'Siamese kitten, blue eyes, very vocal and affectionate', 'Classic seal-point Siamese male, 4 months old, with deep blue eyes.

He is extremely people-oriented — he will follow you around the house and "talk" to you all day. Litter trained, vaccinated and dewormed.

Eats both dry and wet food. Comes with his vaccination card and a starter bag of food.',
  20000, 1, 'sale',
  'barishal', 'Band Road', '4 months', 'Male',
  1, 'New', 'active', 0, 421,
  'Barishal Pet House', '01713274760', '',
  '2c2686ca5f7fa23a5ff035728f4aa1a5202c8958734871c6c1fddf399a30cc7a', '',
  '2026-10-14T03:35:00.000Z', '2026-10-14T03:35:00.000Z', '2026-10-14T03:35:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, owner_token_hash, rejection_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-28', 'birds', 'Budgerigar', 'Tame budgerigar pair with cage, hand-fed', 'Hand-fed budgerigar pair — a blue cock and a green hen, both very tame.

They are not hand-shy at all and will sit on your finger. Already used to a cage with a nest box.

Included: the cage, two feeders and a water bottle. Price is fixed for the complete setup.',
  1200, 0, 'sale',
  'mymensingh', 'Ganginarpar', '6 months', 'Pair',
  0, 'New', 'active', 0, 268,
  'Mymensingh Aviary', '01711641213', '',
  'cae4d5fd48bb40e7ab1039999eaa83206f4820d3c3904c6c438aeaf557a9212a', '',
  '2026-10-12T10:45:00.000Z', '2026-10-12T10:45:00.000Z', '2026-10-12T10:45:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, owner_token_hash, rejection_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-29', 'small-pets', 'Turtle & Tortoise', 'Indian star tortoise, captive bred, healthy shell', 'Captive-bred Indian star tortoise, about 1 year old with a clean and fully grown shell.

Fed on a mix of leafy greens, hibiscus flowers and a calcium supplement. Active and curious.

Important: star tortoises are a protected species in Bangladesh — this tortoise was captive bred and comes with a certificate from the breeder. It is not wild caught.',
  3000, 1, 'sale',
  'sylhet', 'Ambarkhana', '1 year', '',
  0, 'New', 'active', 0, 341,
  'Sylhet Pet Corner', '01713990186', '',
  '20f2bb5c2362eddc6d72b59b9f8ab66575a8fea9d29e195f9084ee189aae3de3', '',
  '2026-10-11T06:20:00.000Z', '2026-10-11T06:20:00.000Z', '2026-10-11T06:20:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, owner_token_hash, rejection_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-30', 'accessories', 'Beds', 'Elevated pet bed, washable, size medium', 'Elevated mesh bed that lifts your pet off the floor — great for hot weather and for older dogs with joint pain.

• Frame is powder-coated steel, supports up to 40 kg
• Mesh cover unzips and is machine washable
• Assembled in seconds, no tools needed

Brand new, unused. Two available. Cover: 90 x 60 cm.',
  2200, 1, 'sale',
  'chattogram', 'Nasirabad', '', '',
  0, 'New', 'active', 0, 88,
  'Chattogram Canine', '01712874115', '',
  'aa52fa84f2c08f2394fc3cb5dacd2900d2bc00f380275130322cde00f89c83df', '',
  '2026-10-10T09:55:00.000Z', '2026-10-10T09:55:00.000Z', '2026-10-10T09:55:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, owner_token_hash, rejection_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-31', 'services', 'Dog Training', 'Obedience training at home — 8 session package', 'Eight private training sessions at your home, roughly one hour each.

What we cover:
• Sit, down, stay, come and loose-leash walking
• Crate training and house training
• Stopping jumping, barking and pulling

Suitable for puppies from 4 months and for adult dogs with habits to fix. Includes a training leash and treat pouch.',
  6000, 1, 'sale',
  'rangpur', 'Jahaj Company', '', '',
  0, 'New', 'active', 0, 176,
  'Rangpur K9 School', '01716890347', '',
  'd32a867c39e8bbce58feaa891a2a7f2a7150749df16792a5904e331f130fea4e', '',
  '2026-10-09T08:05:00.000Z', '2026-10-09T08:05:00.000Z', '2026-10-09T08:05:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, owner_token_hash, rejection_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-32', 'fish', 'Guppy', 'Show-quality guppy trios, assorted strains', 'Show-quality guppies sold as trios — one male and two females.

Strains available: red mosaic, blue grass, yellow leopard and full red.

Fish are bred in our own tanks and are free of disease. Price is per trio. Buy three trios and get a fourth one free. I can advise on tank setup for beginners.',
  400, 0, 'sale',
  'rajshahi', 'Uposhohor', '3 months', 'Pair',
  0, 'New', 'active', 0, 212,
  'Nadeem Aviary', '01716192535', '',
  '9f6ff39f8ad78952e87358d0d669c19a94cf2dfb25fbd61e1bd921371d4b993a', '',
  '2026-10-08T04:30:00.000Z', '2026-10-08T04:30:00.000Z', '2026-10-08T04:30:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, owner_token_hash, rejection_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-33', 'dogs', 'Local / Deshi', 'Deshi mixed-breed puppies, very loyal and healthy', 'Two healthy deshi puppies from our neighbourhood dog, born 25 August.

• First vaccination and deworming done
• Used to rice, chicken and commercial puppy food
• Alert, sociable and already sleeping through the night

Deshi dogs are the hardiest and most adaptable pets you can keep in Bangladesh — great with children and excellent watchdogs. Price is per puppy.',
  5000, 1, 'sale',
  'mymensingh', 'Charpara', '2 months', 'Male',
  1, 'New', 'active', 0, 396,
  'Mymensingh Aviary', '01712448297', '',
  '0e601780202b2c1c31c0fb76f0964250c0ec6b5cd1ce288981436fba3a680100', '',
  '2026-10-13T02:50:00.000Z', '2026-10-13T02:50:00.000Z', '2026-10-13T02:50:00.000Z'
);

INSERT OR REPLACE INTO ads (
  id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, owner_token_hash, rejection_reason,
  created_at, updated_at, published_at
) VALUES (
  'seed-34', 'poultry', 'Duck', 'Muscovy ducklings, 3 weeks old, fast growing', 'Muscovy ducklings, three weeks old and strong on their feet.

Muscovy is the best duck breed for home rearing — they grow fast, eat less than chickens and are resistant to most local diseases.

Price is per duckling, minimum order 10. FCR and feeding guidance provided with every order. Delivery across Barishal division.',
  350, 1, 'sale',
  'barishal', 'Rupatali', '3 weeks', '',
  1, 'New', 'active', 0, 305,
  'Barishal Agro Hatchery', '01718103760', '',
  'd1a5304d2f17c563a4cf393bf3c5fbfb7e8245673b1262360e82e664dc27c45d', '',
  '2026-10-07T00:40:00.000Z', '2026-10-07T00:40:00.000Z', '2026-10-07T00:40:00.000Z'
);

-- ---------------------------------------------------------------- settings --

INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('site_name', 'PetBikroy', '2026-10-18T06:33:13.255Z');
INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('auto_approve', '1', '2026-10-18T06:33:13.255Z');
INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('listings_per_page', '12', '2026-10-18T06:33:13.255Z');
INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('posting_enabled', '1', '2026-10-18T06:33:13.255Z');
INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('post_limit', '10', '2026-10-18T06:33:13.255Z');
INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('contact_email', 'hello@petbikroy.test', '2026-10-18T06:33:13.255Z');

-- Done.
