/* ==========================================================================
   PetBikroy — data layer
   Categories, locations, seed listings and localStorage persistence.
   ========================================================================== */

const PB = (() => {
  'use strict';

  const VERSION = 'v1';
  const K = {
    ads:       `pb.${VERSION}.ads`,
    favorites: `pb.${VERSION}.favorites`,
    location:  `pb.${VERSION}.location`,
    viewed:    `pb.${VERSION}.viewed`,
  };

  /* ---------------------------------------------------------------- config */

  const SITE = {
    name: 'PetBikroy',
    tagline: 'Buy & sell pets in Bangladesh',
    currency: '৳',
    email: 'hello@petbikroy.test',
    phone: '+880 1700 000000',
  };

  /* ------------------------------------------------------------ categories */

  const CATEGORIES = [
    {
      id: 'dogs', name: 'Dogs', emoji: '🐕',
      subs: ['Labrador', 'German Shepherd', 'Rottweiler', 'Golden Retriever',
             'Poodle', 'Siberian Husky', 'Doberman', 'Beagle', 'Local / Deshi',
             'Pomeranian', 'Shih Tzu', 'Other Breeds'],
    },
    {
      id: 'cats', name: 'Cats', emoji: '🐈',
      subs: ['Persian', 'British Shorthair', 'Siamese', 'Bengal',
             'Maine Coon', 'Ragdoll', 'Local / Deshi', 'Other Breeds'],
    },
    {
      id: 'birds', name: 'Birds', emoji: '🦜',
      subs: ['Parrot', 'Cockatiel', 'Budgerigar', 'Lovebird', 'Macaw',
             'Pigeon', 'Finch', 'Other Birds'],
    },
    {
      id: 'fish', name: 'Fish & Aquarium', emoji: '🐠',
      subs: ['Goldfish', 'Betta', 'Guppy', 'Koi', 'Cichlid',
             'Aquarium Setup', 'Aquarium Plants', 'Other Fish'],
    },
    {
      id: 'small-pets', name: 'Small Pets', emoji: '🐰',
      subs: ['Rabbit', 'Hamster', 'Guinea Pig', 'Turtle & Tortoise',
             'Squirrel', 'Ferrets', 'Other Small Pets'],
    },
    {
      id: 'accessories', name: 'Pet Accessories', emoji: '🦴',
      subs: ['Cages & Crates', 'Collars & Leashes', 'Toys', 'Beds',
             'Bowls & Feeders', 'Grooming', 'Carriers'],
    },
    {
      id: 'food', name: 'Pet Food', emoji: '🥣',
      subs: ['Dog Food', 'Cat Food', 'Bird Feed', 'Fish Food',
             'Treats & Chews', 'Supplements'],
    },
    {
      id: 'services', name: 'Pet Services', emoji: '🩺',
      subs: ['Veterinary', 'Pet Grooming', 'Pet Boarding', 'Dog Training',
             'Pet Transport', 'Mating & Stud'],
    },
    {
      id: 'poultry', name: 'Farm & Poultry', emoji: '🐓',
      subs: ['Chicken', 'Duck', 'Goat', 'Cow', 'Quail', 'Other Livestock'],
    },
    {
      id: 'other', name: 'Other Pets', emoji: '🐾',
      subs: ['Reptiles', 'Exotic Pets', 'Pet Adoption', 'Wanted', 'Other'],
    },
  ];

  /* ------------------------------------------------------------- locations */

  const LOCATIONS = [
    { id: 'dhaka',      name: 'Dhaka',      areas: ['Dhanmondi', 'Mirpur', 'Uttara', 'Gulshan', 'Banani', 'Mohammadpur', 'Bashundhara', 'Badda', 'Motijheel', 'Old Dhaka', 'Savar', 'Gazipur'] },
    { id: 'chattogram', name: 'Chattogram', areas: ['Agrabad', 'Nasirabad', 'Khulshi', 'Pahartali', 'Halishahar', 'Chawkbazar', 'Cox\'s Bazar'] },
    { id: 'sylhet',     name: 'Sylhet',     areas: ['Zindabazar', 'Ambarkhana', 'Subid Bazar', 'Beanibazar', 'Moulvibazar'] },
    { id: 'khulna',     name: 'Khulna',     areas: ['Sonadanga', 'Khalishpur', 'Daulatpur', 'Boyra'] },
    { id: 'rajshahi',   name: 'Rajshahi',   areas: ['Shaheb Bazar', 'Uposhohor', 'Boalia', 'Motihar'] },
    { id: 'barishal',   name: 'Barishal',   areas: ['Band Road', 'Nathullabad', 'Rupatali'] },
    { id: 'rangpur',    name: 'Rangpur',    areas: ['Dhap', 'Jahaj Company', 'Mahiganj'] },
    { id: 'mymensingh', name: 'Mymensingh', areas: ['Ganginarpar', 'Charpara', 'Brahmaputra'] },
  ];

  const SORTS = [
    { id: 'recent',    name: 'Newest first' },
    { id: 'price-asc', name: 'Price: low to high' },
    { id: 'price-desc',name: 'Price: high to low' },
    { id: 'popular',   name: 'Most viewed' },
  ];

  const GENDERS = ['Male', 'Female', 'Pair'];

  /* ------------------------------------------------------------ seed data */

  // Deterministic photo seeds -> generated placeholder artwork.
  const art = (n, s) => ({ n, s });

  const SEED_ADS = [
    {
      id: 'seed-1', cat: 'dogs', sub: 'Labrador',
      title: '2 months old Labrador puppy, vaccinated, home trained',
      price: 25000, negotiable: true, loc: 'dhaka', area: 'Dhanmondi',
      age: '2 months', gender: 'Male', vaccinated: true, condition: 'New',
      views: 1284, featured: true, status: 'active',
      created: '2026-10-15T09:20:00+06:00',
      seller: { name: 'Rakib Hasan', joined: '2023-04-11', verified: true, ads: 7 },
      art: [art(11,'#d9a55a'), art(12,'#c98f47'), art(13,'#e0b877')],
      desc: `Pure Labrador puppy, 2 months old, very active and playful.\n\n• First vaccination and deworming done\n• Litter trained\n• Both parents are pedigree Labradors (photos available on request)\n• Raised with children, so very friendly\n\nReason for selling: relocating abroad. Serious buyers only. Price slightly negotiable for a good home.`,
    },
    {
      id: 'seed-2', cat: 'cats', sub: 'Persian',
      title: 'Persian cat, 1 year old, very chubby and calm',
      price: 18000, negotiable: false, loc: 'dhaka', area: 'Gulshan',
      age: '1 year', gender: 'Female', vaccinated: true, condition: 'Used',
      views: 972, featured: true, status: 'active',
      created: '2026-10-14T18:05:00+06:00',
      seller: { name: 'Nusrat Jahan', joined: '2022-09-02', verified: true, ads: 12 },
      art: [art(21,'#c9c3d4'), art(22,'#b8b0c6'), art(23,'#d8d3e2')],
      desc: `Chinchilla-faced white Persian, extremely calm and litter trained.\n\nShe is fully vaccinated, dewormed, and has a clean bill of health from a vet. Eats both dry and wet premium cat food.\n\nComes with her litter box, food bowls and a bag of Royal Canin. Only giving away because my apartment building does not allow pets.`,
    },
    {
      id: 'seed-3', cat: 'birds', sub: 'Cockatiel',
      title: 'Pair of hand-tamed Cockatiels with cage',
      price: 9500, negotiable: true, loc: 'chattogram', area: 'Agrabad',
      age: '8 months', gender: 'Pair', vaccinated: false, condition: 'Used',
      views: 431, featured: false, status: 'active',
      created: '2026-10-13T11:40:00+06:00',
      seller: { name: 'Imran Chowdhury', joined: '2024-01-20', verified: false, ads: 3 },
      art: [art(31,'#f0d98a'), art(32,'#e6c761'), art(33,'#f7e7b0')],
      desc: `A friendly pair of cockatiels — one grey, one lutino. Both are hand-tamed and step up onto your finger.\n\nIncluded: a large powder-coated cage, two feeders, a water bottle and an almost full pack of bird seed.\n\nThey whistle tunes and are very social. Selling because I am moving to a shared apartment.`,
    },
    {
      id: 'seed-4', cat: 'fish', sub: 'Betta',
      title: 'Premium halfmoon Betta fish — assorted colours',
      price: 850, negotiable: false, loc: 'dhaka', area: 'Mirpur',
      age: '4 months', gender: 'Male', vaccinated: false, condition: 'New',
      views: 356, featured: false, status: 'active',
      created: '2026-10-16T08:15:00+06:00',
      seller: { name: 'Aqua House BD', joined: '2021-06-15', verified: true, ads: 48 },
      art: [art(41,'#6db9e8'), art(42,'#4aa3d8'), art(43,'#a9d8f2')],
      desc: `Imported halfmoon Bettas, multiple colours available — blue, red, koi and butterfly.\n\n• Kept in individual conditioned tanks\n• Fed on live and frozen food\n• Healthy fins, no fin rot\n\nPrice is per fish. Tank and accessories sold separately. Delivery available inside Dhaka for ৳150.`,
    },
    {
      id: 'seed-5', cat: 'dogs', sub: 'Rottweiler',
      title: 'Rottweiler male, 4 months, heavy bone structure',
      price: 45000, negotiable: true, loc: 'dhaka', area: 'Uttara',
      age: '4 months', gender: 'Male', vaccinated: true, condition: 'New',
      views: 2140, featured: true, status: 'active',
      created: '2026-10-16T14:55:00+06:00',
      seller: { name: 'K9 Kennel Dhaka', joined: '2020-03-08', verified: true, ads: 26 },
      art: [art(51,'#8d7b6b'), art(52,'#7a6959'), art(53,'#a08e7d')],
      desc: `German bloodline Rottweiler male puppy from imported parents.\n\n• Vaccination card and deworming record provided\n• Heavy bone, broad head, excellent temperament\n• Started on obedience basics\n\nBoth sire and dam can be seen at our kennel in Uttara. We offer a 7-day health guarantee and free delivery inside Dhaka city.`,
    },
    {
      id: 'seed-6', cat: 'cats', sub: 'British Shorthair',
      title: 'British Shorthair blue kitten, litter trained',
      price: 32000, negotiable: false, loc: 'dhaka', area: 'Bashundhara',
      age: '3 months', gender: 'Female', vaccinated: true, condition: 'New',
      views: 1503, featured: false, status: 'active',
      created: '2026-10-11T16:30:00+06:00',
      seller: { name: 'Ayesha Rahman', joined: '2023-11-30', verified: true, ads: 5 },
      art: [art(61,'#a9b3bd'), art(62,'#97a2ad'), art(63,'#bcc5cd')],
      desc: `Pedigree blue British Shorthair with plush coat, round face and orange eyes.\n\nShe is 3 months old, fully vaccinated, dewormed and uses the litter box without fail. Very affectionate but not clingy — typical BSH temperament.\n\nWill come with her vaccination card, favourite toy and current food. Delivery inside Dhaka can be arranged.`,
    },
    {
      id: 'seed-7', cat: 'small-pets', sub: 'Rabbit',
      title: 'White Angora rabbits — baby pair available',
      price: 3200, negotiable: true, loc: 'sylhet', area: 'Zindabazar',
      age: '2 months', gender: 'Pair', vaccinated: false, condition: 'New',
      views: 288, featured: false, status: 'active',
      created: '2026-10-12T10:10:00+06:00',
      seller: { name: 'Sylhet Pet Corner', joined: '2022-02-18', verified: false, ads: 9 },
      art: [art(71,'#eae4dc'), art(72,'#dcd4ca'), art(73,'#f4efe9')],
      desc: `Healthy Angora baby rabbits, extremely soft wool and very calm nature.\n\nFed on grass, pellets and fresh greens. Perfect for children as a first pet.\n\nPrice is per pair. Handover in Sylhet city; I can also send them to Dhaka by bus with a carrier box at buyer's cost.`,
    },
    {
      id: 'seed-8', cat: 'accessories', sub: 'Cages & Crates',
      title: 'Imported large dog crate with wheels and tray',
      price: 12500, negotiable: true, loc: 'dhaka', area: 'Mohammadpur',
      age: '', gender: '', vaccinated: false, condition: 'Used',
      views: 214, featured: false, status: 'active',
      created: '2026-10-10T20:45:00+06:00',
      seller: { name: 'Pet Bazar BD', joined: '2023-07-07', verified: true, ads: 34 },
      art: [art(81,'#9aa4ac'), art(82,'#889299')],
      desc: `Heavy-duty imported crate, suitable for a Labrador or German Shepherd.\n\n• Size: 42 inch (L) x 28 inch (W) x 30 inch (H)\n• Removable metal tray, wipe-clean\n• Two locking doors, foldable for travel\n• Wheels with brakes\n\nUsed for six months, no rust or dents. Selling because my dog outgrew it. Buyer picks up from Mohammadpur.`,
    },
    {
      id: 'seed-9', cat: 'services', sub: 'Veterinary',
      title: 'Mobile vet service at home — vaccination, checkup',
      price: 1200, negotiable: false, loc: 'dhaka', area: 'Banani',
      age: '', gender: '', vaccinated: false, condition: 'New',
      views: 640, featured: false, status: 'active',
      created: '2026-10-09T09:00:00+06:00',
      seller: { name: 'Dr. Farhana Vet Care', joined: '2021-01-12', verified: true, ads: 4 },
      art: [art(91,'#9ad7b8'), art(92,'#7fc9a5')],
      desc: `Registered veterinary surgeon with 9 years of experience, offering at-home visits across Dhaka.\n\nServices:\n• Vaccination (rabies, DHPPi, feline tri-cat)\n• General health checkup and deworming\n• Wound dressing and post-surgical care\n• Nutrition and behaviour consultation\n\nStarting fee ৳1200 including travel within Banani, Gulshan and Baridhara. Medicine charged separately at cost price.`,
    },
    {
      id: 'seed-10', cat: 'food', sub: 'Dog Food',
      title: 'Royal Canin Maxi Adult 15kg — sealed, imported',
      price: 11500, negotiable: true, loc: 'dhaka', area: 'Badda',
      age: '', gender: '', vaccinated: false, condition: 'New',
      views: 178, featured: false, status: 'active',
      created: '2026-10-08T13:25:00+06:00',
      seller: { name: 'Happy Tails Supplies', joined: '2024-05-03', verified: true, ads: 19 },
      art: [art(101,'#c7a86a'), art(102,'#b39354')],
      desc: `Sealed 15kg bag of Royal Canin Maxi Adult, imported from Malaysia.\n\nManufacturing date 08/2026, expiry 08/2027. Stored in a dry warehouse away from sunlight.\n\nBulk buyers welcome — we have 20+ bags in stock and deliver free inside Dhaka for orders over ৳10,000.`,
    },
    {
      id: 'seed-11', cat: 'dogs', sub: 'German Shepherd',
      title: 'German Shepherd long-coat female, excellent bloodline',
      price: 55000, negotiable: true, loc: 'chattogram', area: 'Khulshi',
      age: '5 months', gender: 'Female', vaccinated: true, condition: 'New',
      views: 1876, featured: true, status: 'active',
      created: '2026-10-17T07:35:00+06:00',
      seller: { name: 'Chattogram Canine', joined: '2020-08-19', verified: true, ads: 15 },
      art: [art(111,'#6f6259'), art(112,'#5d5148'), art(113,'#847768')],
      desc: `Show-quality long-coat German Shepherd female, 5 months old.\n\n• Imported sire from Germany (VA rating available)\n• Hip and elbow screened parents\n• Vaccinated, dewormed, microchipped\n\nShe is confident, alert and already responds to sit, down and recall. Handover only after meeting the puppy in person. Export pedigree documents available.`,
    },
    {
      id: 'seed-12', cat: 'cats', sub: 'Local / Deshi',
      title: 'Rescued deshi kittens looking for a loving home',
      price: 0, negotiable: false, loc: 'dhaka', area: 'Old Dhaka',
      age: '2 months', gender: 'Female', vaccinated: false, condition: 'Used',
      views: 812, featured: false, status: 'active',
      created: '2026-10-15T19:50:00+06:00',
      seller: { name: 'Dhaka Stray Rescue', joined: '2022-12-01', verified: true, ads: 2 },
      art: [art(121,'#d6b98c'), art(122,'#c4a678'), art(123,'#e3cba4')],
      desc: `Two deshi kittens (sisters) rescued from the street at 3 weeks old. Now 2 months, healthy, playful and fully litter trained.\n\nThey are dewormed and will be vaccinated before handover.\n\nADOPTION IS FREE but we will visit your home first — we only want responsible adopters who can commit for the cat's lifetime. Both sisters should ideally be adopted together.`,
    },
    {
      id: 'seed-13', cat: 'birds', sub: 'Lovebird',
      title: 'Fischer Lovebird pair, breeding-ready, 1 year',
      price: 4500, negotiable: true, loc: 'rajshahi', area: 'Shaheb Bazar',
      age: '1 year', gender: 'Pair', vaccinated: false, condition: 'Used',
      views: 199, featured: false, status: 'active',
      created: '2026-10-07T15:15:00+06:00',
      seller: { name: 'Nadeem Aviary', joined: '2023-03-14', verified: false, ads: 11 },
      art: [art(131,'#a8dd7d'), art(132,'#93cd66')],
      desc: `Healthy Fischer's lovebird pair, bright lutino and green colouring.\n\nThey have already produced chicks twice this year. Fed on a mix of seeds, millet and sprouts.\n\nSelling because I am reducing my flock. Comes with a small transport box.`,
    },
    {
      id: 'seed-14', cat: 'dogs', sub: 'Poodle',
      title: 'Toy Poodle male, white, championship lines',
      price: 28000, negotiable: true, loc: 'dhaka', area: 'Mohammadpur',
      age: '3 months', gender: 'Male', vaccinated: true, condition: 'New',
      views: 1102, featured: false, status: 'active',
      created: '2026-10-06T12:00:00+06:00',
      seller: { name: 'Nusrat Jahan', joined: '2022-09-02', verified: true, ads: 12 },
      art: [art(141,'#ded3c4'), art(142,'#cec2b1')],
      desc: `Pure white toy Poodle male, 3 months old.\n\nHe does not shed much — ideal for families with allergy concerns. Loves cuddles, walks, and playing fetch.\n\nVaccination and deworming up to date. Handover with his healthcare card and a starter bag of food.`,
    },
    {
      id: 'seed-15', cat: 'fish', sub: 'Koi',
      title: 'Japanese Koi carp 8-10 inch, pond quality',
      price: 3500, negotiable: true, loc: 'dhaka', area: 'Savar',
      age: '10 months', gender: '', vaccinated: false, condition: 'New',
      views: 267, featured: false, status: 'active',
      created: '2026-10-05T08:40:00+06:00',
      seller: { name: 'Aqua House BD', joined: '2021-06-15', verified: true, ads: 48 },
      art: [art(151,'#f09a5e'), art(152,'#e08343'), art(153,'#f7b183')],
      desc: `Imported Japanese Koi, 8–10 inches, assorted patterns — Kohaku, Sanke and Showa.\n\nFish are kept in a 3000 litre outdoor pond with weekly water changes. Healthy and actively feeding on pellets.\n\nPrice per fish. Buy 5 or more and get 10% off. We can also advise on pond setup.`,
    },
    {
      id: 'seed-16', cat: 'small-pets', sub: 'Guinea Pig',
      title: 'Two guinea pigs with cage and hay bundle',
      price: 5500, negotiable: true, loc: 'khulna', area: 'Sonadanga',
      age: '6 months', gender: 'Pair', vaccinated: false, condition: 'Used',
      views: 143, featured: false, status: 'sold',
      created: '2026-09-28T17:20:00+06:00',
      seller: { name: 'Khulna Pet Store', joined: '2023-10-05', verified: false, ads: 6 },
      art: [art(161,'#e2d5b6'), art(162,'#d0c19f')],
      desc: `Two cute guinea pigs (one orange, one tri-colour), both females, 6 months old.\n\nThey come with a 2x3 ft cage, hay rack, water bottle and half a bale of timothy hay.\n\nVery tame, they squeak happily when they see food. Selling with everything as a complete package.`,
    },
    {
      id: 'seed-17', cat: 'services', sub: 'Pet Grooming',
      title: 'Doorstep pet grooming — bath, trim, nail and ear care',
      price: 1500, negotiable: false, loc: 'dhaka', area: 'Gulshan',
      age: '', gender: '', vaccinated: false, condition: 'New',
      views: 388, featured: false, status: 'active',
      created: '2026-10-03T11:05:00+06:00',
      seller: { name: 'Pawfect Grooming', joined: '2024-02-11', verified: true, ads: 3 },
      art: [art(171,'#b9d3f0'), art(172,'#a5c4e6')],
      desc: `Professional grooming at your doorstep — no stressful trips to a salon.\n\nPackage includes:\n• Warm bath with medicated or gentle shampoo\n• Full body trim and blow dry\n• Nail clipping and filing\n• Ear cleaning and de-shedding\n\nStart price ৳1500 for small breeds; ৳2500 for large breeds. Book at least a day in advance.`,
    },
    {
      id: 'seed-18', cat: 'dogs', sub: 'Siberian Husky',
      title: 'Siberian Husky female, blue eyes, thick coat',
      price: 60000, negotiable: true, loc: 'dhaka', area: 'Gazipur',
      age: '6 months', gender: 'Female', vaccinated: true, condition: 'New',
      views: 1655, featured: false, status: 'active',
      created: '2026-10-17T09:10:00+06:00',
      seller: { name: 'Frozen Paws Husky', joined: '2021-09-27', verified: true, ads: 8 },
      art: [art(181,'#c4ccd4'), art(182,'#b2bcc6'), art(183,'#d6dde3')],
      desc: `Siberian Husky female with striking ice-blue eyes, 6 months old.\n\n• Double coat is thick and dense, excellent for our winter\n• Fully vaccinated and vet checked\n• Known bloodline — parents imported from Russia\n\nImportant: huskies need cool environments, daily exercise and strong fencing. Please only enquire if you can provide that. Comes with a 10-day health guarantee.`,
    },
    {
      id: 'seed-19', cat: 'accessories', sub: 'Collars & Leashes',
      title: 'Padded leather leash + harness set, medium size',
      price: 1900, negotiable: true, loc: 'dhaka', area: 'Dhanmondi',
      age: '', gender: '', vaccinated: false, condition: 'New',
      views: 96, featured: false, status: 'active',
      created: '2026-10-02T14:30:00+06:00',
      seller: { name: 'Pet Bazar BD', joined: '2023-07-07', verified: true, ads: 34 },
      art: [art(191,'#a8834f'), art(192,'#957343')],
      desc: `Hand-stitched padded leather set in dark tan.\n\n• Adjustable chest harness, fits 20–32 inch girth\n• Matching 5 ft leash with brass fittings\n• Soft padded lining so it will not chafe\n\nUnused — bought as a gift and the size did not fit. Original packaging available.`,
    },
    {
      id: 'seed-20', cat: 'poultry', sub: 'Chicken',
      title: 'Sonali chicks and grower hens, farm direct',
      price: 180, negotiable: true, loc: 'rangpur', area: 'Dhap',
      age: '1 month', gender: '', vaccinated: true, condition: 'New',
      views: 502, featured: false, status: 'active',
      created: '2026-10-01T07:00:00+06:00',
      seller: { name: 'Rangpur Agro Farm', joined: '2022-05-22', verified: true, ads: 21 },
      art: [art(201,'#e8b45c'), art(202,'#d9a342')],
      desc: `Sonali breed chicks and grower hens straight from our farm.\n\n• Vaccinated as per poultry schedule\n• Grown on our own feed, no growth hormones\n• Mortality replacement guarantee within 3 days\n\nPrice is per bird: chicks ৳180, growers ৳340, laying hens ৳520. Minimum order 20 birds. Delivery across Rangpur division.`,
    },
    {
      id: 'seed-21', cat: 'cats', sub: 'Bengal',
      title: 'Bengal kitten, rosetted coat, TICA lineage',
      price: 48000, negotiable: true, loc: 'dhaka', area: 'Gulshan',
      age: '3 months', gender: 'Male', vaccinated: true, condition: 'New',
      views: 1340, featured: true, status: 'active',
      created: '2026-10-16T17:40:00+06:00',
      seller: { name: 'Royal Feline BD', joined: '2019-11-16', verified: true, ads: 31 },
      art: [art(211,'#d0a05e'), art(212,'#bd8c4a'), art(213,'#e0b478')],
      desc: `Bengal kitten with a bold rosetted coat and glittered pelt, from TICA registered lines.\n\n• 3 months old, vaccinated twice and dewormed\n• Litter trained, eats raw and premium wet food\n• Very confident, loves climbing and water play\n\nIncludes vaccination book, pedigree paperwork and a starter kit. Video calls welcome before purchase.`,
    },
    {
      id: 'seed-22', cat: 'other', sub: 'Reptiles',
      title: 'Red-eared slider turtles with tank setup',
      price: 4200, negotiable: true, loc: 'dhaka', area: 'Motijheel',
      age: '1 year', gender: '', vaccinated: false, condition: 'Used',
      views: 231, featured: false, status: 'active',
      created: '2026-09-30T18:25:00+06:00',
      seller: { name: 'Exotic Pets Dhaka', joined: '2023-01-09', verified: true, ads: 13 },
      art: [art(221,'#8fc48a'), art(222,'#7bb376')],
      desc: `Two healthy red-eared sliders plus their full setup.\n\nIncluded: 24 inch glass tank, basking dock, UVB lamp, canister filter and a bottle of turtle food.\n\nThey are about 4 inches across the shell and very active. Shells are clean with no softness or fungus. Ideal starter reptile pair.`,
    },
    {
      id: 'seed-23', cat: 'food', sub: 'Cat Food',
      title: 'Whiskas dry cat food 7kg, sealed and fresh stock',
      price: 4900, negotiable: false, loc: 'dhaka', area: 'Mirpur',
      age: '', gender: '', vaccinated: false, condition: 'New',
      views: 155, featured: false, status: 'active',
      created: '2026-10-14T10:50:00+06:00',
      seller: { name: 'Happy Tails Supplies', joined: '2024-05-03', verified: true, ads: 19 },
      art: [art(231,'#b48ad0'), art(232,'#a276bd')],
      desc: `Whiskas Adult dry food, 7kg value pack, factory sealed.\n\nBest before 07/2027. Fresh stock, stored away from heat and moisture.\n\nWe also stock Sheba, Me-O and Royal Canin. Free delivery inside Dhaka for orders over ৳5000. Wholesale rates for shops available.`,
    },
    {
      id: 'seed-24', cat: 'dogs', sub: 'Beagle',
      title: 'Beagle puppies (tricolour), 2 males available',
      price: 22000, negotiable: true, loc: 'dhaka', area: 'Dhanmondi',
      age: '2 months', gender: 'Male', vaccinated: true, condition: 'New',
      views: 987, featured: false, status: 'active',
      created: '2026-10-13T16:10:00+06:00',
      seller: { name: 'Rakib Hasan', joined: '2023-04-11', verified: true, ads: 7 },
      art: [art(241,'#e0d3c0'), art(242,'#cdbea8'), art(243,'#efe6d8')],
      desc: `Two tricolour Beagle males from our family pair, born 12 August.\n\n• Very social, raised inside the house with kids\n• First vaccination and deworming complete\n• Nose-driven and food motivated — easy to train\n\nPrice is per puppy. Buying both? We will do a discount and include their travel crate.`,
    },
    {
      id: 'seed-25', cat: 'dogs', sub: 'Golden Retriever',
      title: 'Golden Retriever female, 3 months, family raised',
      price: 38000, negotiable: true, loc: 'khulna', area: 'Sonadanga',
      age: '3 months', gender: 'Female', vaccinated: true, condition: 'New',
      views: 764, featured: false, status: 'active',
      created: '2026-10-16T11:25:00+06:00',
      seller: { name: 'Khulna Pet Store', joined: '2023-10-05', verified: false, ads: 6 },
      art: [art(251,'#e8c273'), art(252,'#d6ae5a'), art(253,'#f2d79a')],
      desc: `Golden Retriever female puppy, 3 months old, raised inside our home with two children.\n\n• Vaccinated and dewormed, card provided\n• Both parents are healthy family pets you can meet\n• Very soft mouth, already learning to fetch\n\nSelling to a screened home only. Handover in Khulna city, or I can arrange transport to Dhaka at buyer's cost.`,
    },
    {
      id: 'seed-26', cat: 'small-pets', sub: 'Hamster',
      title: 'Syrian hamsters with cage, wheel and bedding',
      price: 2500, negotiable: true, loc: 'dhaka', area: 'Bashundhara',
      age: '3 months', gender: 'Female', vaccinated: false, condition: 'Used',
      views: 187, featured: false, status: 'active',
      created: '2026-10-15T13:15:00+06:00',
      seller: { name: 'Little Paws BD', joined: '2024-08-19', verified: false, ads: 7 },
      art: [art(261,'#dfc9a5'), art(262,'#cdb48d')],
      desc: `Two female Syrian hamsters — one golden, one cream banded.\n\nIncluded: a wired cage with a solid base, an 8-inch silent wheel, a water bottle, a hideout and a bag of bedding.\n\nThey are tame enough to be handled and are kept separately as Syrians must live alone. Perfect low-maintenance first pet for a child.`,
    },
    {
      id: 'seed-27', cat: 'cats', sub: 'Siamese',
      title: 'Siamese kitten, blue eyes, very vocal and affectionate',
      price: 20000, negotiable: true, loc: 'barishal', area: 'Band Road',
      age: '4 months', gender: 'Male', vaccinated: true, condition: 'New',
      views: 421, featured: false, status: 'active',
      created: '2026-10-14T09:35:00+06:00',
      seller: { name: 'Barishal Pet House', joined: '2023-06-02', verified: true, ads: 8 },
      art: [art(271,'#d8c8b4'), art(272,'#c6b39c'), art(273,'#e6d9c8')],
      desc: `Classic seal-point Siamese male, 4 months old, with deep blue eyes.\n\nHe is extremely people-oriented — he will follow you around the house and "talk" to you all day. Litter trained, vaccinated and dewormed.\n\nEats both dry and wet food. Comes with his vaccination card and a starter bag of food.`,
    },
    {
      id: 'seed-28', cat: 'birds', sub: 'Budgerigar',
      title: 'Tame budgerigar pair with cage, hand-fed',
      price: 1200, negotiable: false, loc: 'mymensingh', area: 'Ganginarpar',
      age: '6 months', gender: 'Pair', vaccinated: false, condition: 'New',
      views: 268, featured: false, status: 'active',
      created: '2026-10-12T16:45:00+06:00',
      seller: { name: 'Mymensingh Aviary', joined: '2024-03-27', verified: false, ads: 5 },
      art: [art(281,'#a9d98c'), art(282,'#93cd72'), art(283,'#c0e6a8')],
      desc: `Hand-fed budgerigar pair — a blue cock and a green hen, both very tame.\n\nThey are not hand-shy at all and will sit on your finger. Already used to a cage with a nest box.\n\nIncluded: the cage, two feeders and a water bottle. Price is fixed for the complete setup.`,
    },
    {
      id: 'seed-29', cat: 'small-pets', sub: 'Turtle & Tortoise',
      title: 'Indian star tortoise, captive bred, healthy shell',
      price: 3000, negotiable: true, loc: 'sylhet', area: 'Ambarkhana',
      age: '1 year', gender: '', vaccinated: false, condition: 'New',
      views: 341, featured: false, status: 'active',
      created: '2026-10-11T12:20:00+06:00',
      seller: { name: 'Sylhet Pet Corner', joined: '2022-02-18', verified: false, ads: 9 },
      art: [art(291,'#c9b174'), art(292,'#b79f61')],
      desc: `Captive-bred Indian star tortoise, about 1 year old with a clean and fully grown shell.\n\nFed on a mix of leafy greens, hibiscus flowers and a calcium supplement. Active and curious.\n\nImportant: star tortoises are a protected species in Bangladesh — this tortoise was captive bred and comes with a certificate from the breeder. It is not wild caught.`,
    },
    {
      id: 'seed-30', cat: 'accessories', sub: 'Beds',
      title: 'Elevated pet bed, washable, size medium',
      price: 2200, negotiable: true, loc: 'chattogram', area: 'Nasirabad',
      age: '', gender: '', vaccinated: false, condition: 'New',
      views: 88, featured: false, status: 'active',
      created: '2026-10-10T15:55:00+06:00',
      seller: { name: 'Chattogram Canine', joined: '2020-08-19', verified: true, ads: 15 },
      art: [art(301,'#a8b8c4'), art(302,'#96a8b6')],
      desc: `Elevated mesh bed that lifts your pet off the floor — great for hot weather and for older dogs with joint pain.\n\n• Frame is powder-coated steel, supports up to 40 kg\n• Mesh cover unzips and is machine washable\n• Assembled in seconds, no tools needed\n\nBrand new, unused. Two available. Cover: 90 x 60 cm.`,
    },
    {
      id: 'seed-31', cat: 'services', sub: 'Dog Training',
      title: 'Obedience training at home — 8 session package',
      price: 6000, negotiable: true, loc: 'rangpur', area: 'Jahaj Company',
      age: '', gender: '', vaccinated: false, condition: 'New',
      views: 176, featured: false, status: 'active',
      created: '2026-10-09T14:05:00+06:00',
      seller: { name: 'Rangpur K9 School', joined: '2023-12-14', verified: true, ads: 4 },
      art: [art(311,'#8fc9c4'), art(312,'#7bb8b3')],
      desc: `Eight private training sessions at your home, roughly one hour each.\n\nWhat we cover:\n• Sit, down, stay, come and loose-leash walking\n• Crate training and house training\n• Stopping jumping, barking and pulling\n\nSuitable for puppies from 4 months and for adult dogs with habits to fix. Includes a training leash and treat pouch.`,
    },
    {
      id: 'seed-32', cat: 'fish', sub: 'Guppy',
      title: 'Show-quality guppy trios, assorted strains',
      price: 400, negotiable: false, loc: 'rajshahi', area: 'Uposhohor',
      age: '3 months', gender: 'Pair', vaccinated: false, condition: 'New',
      views: 212, featured: false, status: 'active',
      created: '2026-10-08T10:30:00+06:00',
      seller: { name: 'Nadeem Aviary', joined: '2023-03-14', verified: false, ads: 11 },
      art: [art(321,'#7fd4c4'), art(322,'#6cc4b4'), art(323,'#a0e2d6')],
      desc: `Show-quality guppies sold as trios — one male and two females.\n\nStrains available: red mosaic, blue grass, yellow leopard and full red.\n\nFish are bred in our own tanks and are free of disease. Price is per trio. Buy three trios and get a fourth one free. I can advise on tank setup for beginners.`,
    },
    {
      id: 'seed-33', cat: 'dogs', sub: 'Local / Deshi',
      title: 'Deshi mixed-breed puppies, very loyal and healthy',
      price: 5000, negotiable: true, loc: 'mymensingh', area: 'Charpara',
      age: '2 months', gender: 'Male', vaccinated: true, condition: 'New',
      views: 396, featured: false, status: 'active',
      created: '2026-10-13T08:50:00+06:00',
      seller: { name: 'Mymensingh Aviary', joined: '2024-03-27', verified: false, ads: 5 },
      art: [art(331,'#c9a87e'), art(332,'#b89668'), art(333,'#dcc098')],
      desc: `Two healthy deshi puppies from our neighbourhood dog, born 25 August.\n\n• First vaccination and deworming done\n• Used to rice, chicken and commercial puppy food\n• Alert, sociable and already sleeping through the night\n\nDeshi dogs are the hardiest and most adaptable pets you can keep in Bangladesh — great with children and excellent watchdogs. Price is per puppy.`,
    },
    {
      id: 'seed-34', cat: 'poultry', sub: 'Duck',
      title: 'Muscovy ducklings, 3 weeks old, fast growing',
      price: 350, negotiable: true, loc: 'barishal', area: 'Rupatali',
      age: '3 weeks', gender: '', vaccinated: true, condition: 'New',
      views: 305, featured: false, status: 'active',
      created: '2026-10-07T06:40:00+06:00',
      seller: { name: 'Barishal Agro Hatchery', joined: '2022-11-11', verified: true, ads: 14 },
      art: [art(341,'#e6d98c'), art(342,'#d4c572')],
      desc: `Muscovy ducklings, three weeks old and strong on their feet.\n\nMuscovy is the best duck breed for home rearing — they grow fast, eat less than chickens and are resistant to most local diseases.\n\nPrice is per duckling, minimum order 10. FCR and feeding guidance provided with every order. Delivery across Barishal division.`,
    },

    // ---- moderation demo ads: flagged by the automated reviewer ----
    {
      id: 'seed-35', cat: 'dogs', sub: 'Local / Deshi',
      title: 'AMAZING PUPPY BUY NOW CHEAP!!! best deal ever',
      price: 500, negotiable: false, loc: 'dhaka', area: 'Uttara',
      age: '2 months', gender: 'Male', vaccinated: false, condition: 'New',
      views: 42, featured: false, status: 'active',
      created: '2026-10-18T06:10:00+06:00',
      seller: { name: 'K9 Kennel Dhaka', joined: '2020-03-08', verified: true, ads: 6 },
      art: [art(351,'#d9a55a'), art(352,'#c98f47')],
      desc: `AMAZING PUPPY!!! BUY NOW!!! Best deal ever!!! Visit www.free-puppy-bd.com/order for
      photos and pricing. We have unlimited puppies, click the link and order today.`,
    },

    {
      id: 'seed-36', cat: 'cats', sub: 'Local / Deshi',
      title: 'Free kitten — message us to claim yours today',
      price: 0, negotiable: false, loc: 'dhaka', area: 'Mirpur',
      age: '2 months', gender: 'Female', vaccinated: false, condition: 'Used',
      views: 88, featured: false, status: 'active',
      created: '2026-10-18T07:25:00+06:00',
      seller: { name: 'Aqua House BD', joined: '2021-06-15', verified: true, ads: 9 },
      art: [art(361,'#c9c3d4'), art(362,'#b8b0c6')],
      desc: `These kittens are free — just pay for collection.

Do not chat on this site. Message our driver on WhatsApp at 01711000000 right now to
      arrange pickup. Limited stock, first caller wins. Payment by bKash only.`,
    },

    // ---- user-posted ad lives here too (id starts with 'u-') ----
  ];

  /* --------------------------------------------------------- storage util */

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn('PetBikroy: could not persist to localStorage', e);
      return false;
    }
  }

  /* --------------------------------------------------------------- ads API */

  function getUserAds() {
    const list = read(K.ads, []);
    return Array.isArray(list) ? list : [];
  }

  function getAllAds() {
    // Deleted seed ads are remembered so they never come back.
    const hidden = read(`${K.ads}.deleted`, []);
    return [...getUserAds(), ...SEED_ADS.filter(a => !hidden.includes(a.id))];
  }

  function getAd(id) {
    return getAllAds().find(a => a.id === id) || null;
  }

  function saveAd(ad) {
    const list = getUserAds();
    const i = list.findIndex(a => a.id === ad.id);
    if (i >= 0) list[i] = ad; else list.unshift(ad);
    return write(K.ads, list);
  }

  function deleteAd(id) {
    const list = getUserAds();
    const next = list.filter(a => a.id !== id);
    if (next.length !== list.length) return write(K.ads, next);
    // Seed ad: hide it permanently instead.
    const hidden = read(`${K.ads}.deleted`, []);
    if (!hidden.includes(id)) hidden.push(id);
    return write(`${K.ads}.deleted`, hidden);
  }

  function isUserAd(id) {
    return getUserAds().some(a => a.id === id);
  }

  function newId() {
    return 'u-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function bumpViews(id) {
    const seen = read(K.viewed, []);
    if (seen.includes(id)) return;
    seen.push(id);
    write(K.viewed, seen);
    if (isUserAd(id)) {
      const list = getUserAds();
      const ad = list.find(a => a.id === id);
      if (ad) { ad.views = (ad.views || 0) + 1; write(K.ads, list); }
    }
  }

  /* --------------------------------------------------------- favorites API */

  function getFavorites() {
    const list = read(K.favorites, []);
    return Array.isArray(list) ? list : [];
  }

  function isFavorite(id) {
    return getFavorites().includes(id);
  }

  function toggleFavorite(id) {
    const list = getFavorites();
    const i = list.indexOf(id);
    if (i >= 0) list.splice(i, 1); else list.unshift(id);
    write(K.favorites, list);
    return i < 0; // true when it was just added
  }

  function clearFavorites() {
    return write(K.favorites, []);
  }

  /* ---------------------------------------------------------- location API */

  function getPrefLocation() { return read(K.location, ''); }
  function setPrefLocation(id) { write(K.location, id || ''); }

  /* ------------------------------------------------------------- helpers */

  const catById = id => CATEGORIES.find(c => c.id === id) || null;
  const catName = id => (catById(id) || {}).name || 'Other';
  const catEmoji = id => (catById(id) || {}).emoji || '🐾';
  const locById = id => LOCATIONS.find(l => l.id === id) || null;
  const locName = id => (locById(id) || {}).name || '';

  function formatPrice(price, negotiable) {
    if (!price || price <= 0) return { text: 'Free', free: true };
    const n = group(price);
    return { text: `${SITE.currency}${n}`, free: false, negotiable: !!negotiable };
  }

  /**
   * Thousands grouping done by hand.
   * `Number#toLocaleString` silently drops separators in engines without ICU
   * data, which would render ৳25000 instead of ৳25,000.
   */
  function group(value) {
    const n = Math.round(Number(value) || 0);
    const neg = n < 0;
    const s = String(Math.abs(n));
    let out = '';
    for (let i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 === 0) out += ',';
      out += s[i];
    }
    return (neg ? '-' : '') + out;
  }

  function timeAgo(iso) {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return '';
    const s = Math.max(1, Math.floor((Date.now() - then) / 1000));
    const steps = [
      [60, 'second', 1], [60, 'minute', 60], [24, 'hour', 3600],
      [7, 'day', 86400], [4.35, 'week', 604800], [12, 'month', 2629800],
    ];
    for (const [limit, unit, div] of steps) {
      const v = s / div;
      if (v < limit) {
        const r = Math.max(1, Math.floor(v));
        return `${r} ${unit}${r > 1 ? 's' : ''} ago`;
      }
    }
    const years = Math.floor(s / 31557600);
    return `${years} year${years > 1 ? 's' : ''} ago`;
  }

  function formatDate(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  /* ------------------------------------------------- placeholder artwork */

  // Builds an SVG "photo" so the site looks complete with zero network assets.
  function placeholder(petEmoji, seed) {
    const n = (seed && seed.n) || 1;
    const base = (seed && seed.s) || '#23a455';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
<defs>
  <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${base}"/>
    <stop offset="1" stop-color="${shade(base, -26)}"/>
  </linearGradient>
  <radialGradient id="v" cx="50%" cy="42%" r="68%">
    <stop offset="0" stop-color="#ffffff" stop-opacity=".22"/>
    <stop offset="1" stop-color="#000000" stop-opacity=".16"/>
  </radialGradient>
</defs>
<rect width="800" height="600" fill="url(#g)"/>
<g fill="#ffffff" opacity=".10">
  <circle cx="${90 + (n * 37) % 120}" cy="${110 + (n * 53) % 90}" r="46"/>
  <circle cx="${640 - (n * 29) % 130}" cy="${150 + (n * 41) % 80}" r="66"/>
  <circle cx="${150 + (n * 61) % 90}" cy="${470 - (n * 23) % 70}" r="38"/>
  <circle cx="${600 + (n * 17) % 80}" cy="${450 - (n * 31) % 60}" r="52"/>
</g>
<rect width="800" height="600" fill="url(#v)"/>
<text x="400" y="352" font-size="230" text-anchor="middle" dominant-baseline="middle">${petEmoji}</text>
</svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function shade(hex, pct) {
    const h = hex.replace('#', '');
    const num = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    const clamp = v => Math.max(0, Math.min(255, v));
    const f = pct / 100;
    const r = clamp(Math.round(((num >> 16) & 255) * (1 + f)));
    const g = clamp(Math.round(((num >> 8) & 255) * (1 + f)));
    const b = clamp(Math.round((num & 255) * (1 + f)));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }

  /* ----------------------------------------------------- synthetic artwork */

  /** Deterministic 32-bit hash (FNV-1a) of a string. */
  function hash(str) {
    let h = 2166136261;
    const s = String(str);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  // Colours for generated artwork: chosen to sit beside the site's greens and
  // oranges without clashing.
  const ART_COLORS = [
    '#23a455', '#2f7fd0', '#d98b2b', '#c2557a', '#6b5bd2',
    '#0f9b8e', '#b5651d', '#5a8f29', '#a35fb0', '#d4623a',
  ];

  /** Derives art seeds from an ad's own identity. */
  function syntheticArt(ad) {
    const h = hash(`${ad.cat || ''}/${ad.id || ad.title || ''}`);
    return [{ n: (h % 97) + 1, s: ART_COLORS[h % ART_COLORS.length] }];
  }

  // Photos for any ad — real uploads win, otherwise generated artwork.
  //
  // Photo-less ads derive their artwork from their own id, so a grid of them
  // reads as a grid of listings rather than the same tile repeated. Without
  // this, every ad posted through the API (which has no `art` seeds) would
  // render an identical green rectangle.
  function adImages(ad) {
    if (ad.photos && ad.photos.length) return ad.photos;
    const emoji = catEmoji(ad.cat);
    const seeds = (ad.art && ad.art.length) ? ad.art : syntheticArt(ad);
    return seeds.map(s => placeholder(emoji, s));
  }

  function adCover(ad) { return adImages(ad)[0]; }

  /* ------------------------------------------------------------- queries */

  function matchesQuery(ad, q) {
    if (!q) return true;
    const needle = q.toLowerCase();
    const hay = [
      ad.title, ad.desc, ad.sub, catName(ad.cat),
      locName(ad.loc), ad.area || '', ad.breed || '',
    ].join(' ').toLowerCase();
    return needle.split(/\s+/).filter(Boolean).every(t => hay.includes(t));
  }

  /**
   * Filter + sort + paginate listings.
   * @param {object} f  filters: q, cat, subs[], loc, areas[], min, max, sort, includeSold
   */
  function search(f = {}) {
    let out = getAllAds();

    if (!f.includeSold) out = out.filter(a => a.status !== 'sold');
    if (f.cat) out = out.filter(a => a.cat === f.cat);
    if (f.subs && f.subs.length) out = out.filter(a => f.subs.includes(a.sub));
    if (f.loc) out = out.filter(a => a.loc === f.loc);
    if (f.areas && f.areas.length) out = out.filter(a => f.areas.includes(a.area));
    if (f.q) out = out.filter(a => matchesQuery(a, f.q));
    if (typeof f.min === 'number' && !Number.isNaN(f.min)) out = out.filter(a => (a.price || 0) >= f.min);
    if (typeof f.max === 'number' && !Number.isNaN(f.max)) out = out.filter(a => (a.price || 0) <= f.max);

    const sorters = {
      recent:     (a, b) => new Date(b.created) - new Date(a.created),
      'price-asc':(a, b) => (a.price || 0) - (b.price || 0),
      'price-desc':(a, b) => (b.price || 0) - (a.price || 0),
      popular:    (a, b) => (b.views || 0) - (a.views || 0),
    };
    const cmp = sorters[f.sort] || sorters.recent;
    out.sort((a, b) => {
      // Featured ("promoted") ads float to the top on default sort only.
      if ((f.sort || 'recent') === 'recent') {
        const fd = (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
        if (fd) return fd;
      }
      return cmp(a, b);
    });

    return out;
  }

  function byCategory(catId, limit) {
    const list = search({ cat: catId, sort: 'recent' });
    return limit ? list.slice(0, limit) : list;
  }

  function countByCategory() {
    const all = getAllAds().filter(a => a.status !== 'sold');
    const map = {};
    for (const a of all) map[a.cat] = (map[a.cat] || 0) + 1;
    return map;
  }

  function countBySub(catId) {
    const map = {};
    for (const a of getAllAds()) {
      if (a.status === 'sold') continue;
      if (catId && a.cat !== catId) continue;
      map[a.sub] = (map[a.sub] || 0) + 1;
    }
    return map;
  }

  function countByLocation() {
    const map = {};
    for (const a of getAllAds()) {
      if (a.status === 'sold') continue;
      map[a.loc] = (map[a.loc] || 0) + 1;
    }
    return map;
  }

  function similar(ad, limit = 4) {
    return search({ cat: ad.cat, sort: 'recent' })
      .filter(a => a.id !== ad.id)
      .slice(0, limit);
  }

  function popularSearches() {
    return [
      'Labrador puppy', 'Persian cat', 'German Shepherd', 'Cockatiel',
      'Betta fish', 'Rabbit', 'Husky', 'Bengal kitten',
    ];
  }

  function newest(n = 8) { return search({ sort: 'recent' }).slice(0, n); }
  function featured(n = 4) { return search({ sort: 'recent' }).filter(a => a.featured).slice(0, n); }

  function stats() {
    const all = getAllAds().filter(a => a.status !== 'sold');
    const locs = new Set(all.map(a => a.loc));
    return {
      ads: all.length,
      categories: CATEGORIES.length,
      locations: locs.size || LOCATIONS.length,
    };
  }

  /* --------------------------------------------------------- seed top-up */

  // Guarantee a demo-friendly dataset: if the visitor has posted nothing,
  // the seed listings above still ship with guaranteed artwork.
  function init() {
    for (const ad of SEED_ADS) {
      if (!ad.art || !ad.art.length) ad.art = [{ n: 1, s: '#23a455' }];
    }
    return true;
  }

  /* ------------------------------------------------------------- exports */

  return {
    SITE, CATEGORIES, LOCATIONS, SORTS, GENDERS, SEED_ADS,
    init, read, write,
    getUserAds, getAllAds, getAd, saveAd, deleteAd, isUserAd, newId, bumpViews,
    getFavorites, isFavorite, toggleFavorite, clearFavorites,
    getPrefLocation, setPrefLocation,
    catById, catName, catEmoji, locById, locName,
    formatPrice, group, timeAgo, formatDate, placeholder, adImages, adCover,
    matchesQuery, search, byCategory, countByCategory, countBySub,
    countByLocation, similar, popularSearches, newest, featured, stats,
  };
})();

PB.init();
