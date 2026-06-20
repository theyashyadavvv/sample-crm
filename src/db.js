import { openDB } from 'idb';

const DB_NAME = 'lakeside-crm-db';
const DB_VERSION = 1;

let dbPromise = null;

export const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('guests')) {
          const guestsStore = db.createObjectStore('guests', { keyPath: 'id', autoIncrement: true });
          guestsStore.createIndex('name', 'name');
          guestsStore.createIndex('phone', 'phone');
        }
        if (!db.objectStoreNames.contains('bookings')) {
          const bookingsStore = db.createObjectStore('bookings', { keyPath: 'id', autoIncrement: true });
          bookingsStore.createIndex('guestId', 'guestId');
          bookingsStore.createIndex('status', 'status');
          bookingsStore.createIndex('checkIn', 'checkIn');
          bookingsStore.createIndex('checkOut', 'checkOut');
        }
      },
    });
  }
  return dbPromise;
};

// --- GUESTS ---

export const getAllGuests = async () => {
  const db = await initDB();
  return db.getAll('guests');
};

export const getGuest = async (id) => {
  const db = await initDB();
  return db.get('guests', id);
};

export const addGuest = async (guest) => {
  const db = await initDB();
  const newGuest = { ...guest, createdAt: Date.now() };
  const id = await db.add('guests', newGuest);
  return { ...newGuest, id };
};

export const updateGuest = async (guest) => {
  const db = await initDB();
  await db.put('guests', guest);
  return guest;
};

export const deleteGuest = async (id) => {
  const db = await initDB();
  const bookings = await getBookingsByGuest(id);
  const tx = db.transaction(['guests', 'bookings'], 'readwrite');
  await tx.objectStore('guests').delete(id);
  const bookingsStore = tx.objectStore('bookings');
  for (const b of bookings) {
    await bookingsStore.delete(b.id);
  }
  await tx.done;
};

// --- BOOKINGS ---

export const getAllBookings = async () => {
  const db = await initDB();
  return db.getAll('bookings');
};

export const getBookingsByGuest = async (guestId) => {
  const db = await initDB();
  return db.getAllFromIndex('bookings', 'guestId', guestId);
};

export const getBooking = async (id) => {
  const db = await initDB();
  return db.get('bookings', id);
};

export const addBooking = async (booking) => {
  const db = await initDB();
  const newBooking = { ...booking, createdAt: Date.now(), updatedAt: Date.now() };
  const id = await db.add('bookings', newBooking);
  return { ...newBooking, id };
};

export const updateBooking = async (booking) => {
  const db = await initDB();
  const updatedBooking = { ...booking, updatedAt: Date.now() };
  await db.put('bookings', updatedBooking);
  return updatedBooking;
};

export const deleteBooking = async (id) => {
  const db = await initDB();
  await db.delete('bookings', id);
};

// --- IMPORT / EXPORT ---

export const clearAllData = async () => {
  const db = await initDB();
  const tx = db.transaction(['guests', 'bookings'], 'readwrite');
  await tx.objectStore('guests').clear();
  await tx.objectStore('bookings').clear();
  await tx.done;
};

// --- SEED DUMMY DATA ---
export const seedDummyData = async () => {
  const db = await initDB();
  const guests = await db.getAll('guests');
  if (guests.length > 0) return; // Already seeded or has data

  const dummyGuests = [
    { name: 'Rahul Sharma', phone: '+91 9876543210', email: 'rahul.s@example.com', city: 'Mumbai', source: 'WhatsApp', notes: 'VIP Guest, prefers Suite 1' },
    { name: 'Priya Patel', phone: '+91 8765432109', email: 'priya.p@example.com', city: 'Pune', source: 'Website', notes: 'Allergic to peanuts' },
    { name: 'Amit Kumar', phone: '+91 7654321098', email: 'amit.k@example.com', city: 'Delhi', source: 'Justdial', notes: '' },
    { name: 'Sneha Gupta', phone: '+91 6543210987', email: 'sneha.g@example.com', city: 'Bangalore', source: 'TripAdvisor', notes: 'Anniversary trip' },
    { name: 'Vikram Singh', phone: '+91 5432109876', email: 'vikram.s@example.com', city: 'Jaipur', source: 'Referral', notes: '' },
  ];

  const addedGuests = [];
  for (const g of dummyGuests) {
    const added = await addGuest(g);
    addedGuests.push(added);
  }

  // Calculate some dates relative to today
  const today = new Date();
  const format = (d) => d.toISOString().split('T')[0];
  
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 5);
  const lastWeek = new Date(today); lastWeek.setDate(today.getDate() - 7);
  const lastWeekEnd = new Date(today); lastWeekEnd.setDate(today.getDate() - 5);

  const dummyBookings = [
    // Today's Check-in
    { guestId: addedGuests[0].id, room: 'Suite 1', checkIn: format(today), checkOut: format(tomorrow), guestCount: 2, amount: 5000, paymentStatus: 'Advance Paid', status: 'Confirmed', notes: 'Early check-in requested' },
    // Today's Check-out
    { guestId: addedGuests[1].id, room: 'Suite 2', checkIn: format(yesterday), checkOut: format(today), guestCount: 3, amount: 7500, paymentStatus: 'Fully Paid', status: 'Checked In', notes: '' },
    // Currently Occupied (Checked In)
    { guestId: addedGuests[2].id, room: 'Dormitory', checkIn: format(yesterday), checkOut: format(tomorrow), guestCount: 4, amount: 4000, paymentStatus: 'Pending', status: 'Checked In', notes: 'Group of friends' },
    // Upcoming
    { guestId: addedGuests[3].id, room: 'Suite 3', checkIn: format(nextWeek), checkOut: format(new Date(nextWeek.getTime() + 2*86400000)), guestCount: 2, amount: 6000, paymentStatus: 'Advance Paid', status: 'Confirmed', notes: 'Anniversary cake needed' },
    // Past
    { guestId: addedGuests[4].id, room: 'Suite 1', checkIn: format(lastWeek), checkOut: format(lastWeekEnd), guestCount: 2, amount: 5500, paymentStatus: 'Fully Paid', status: 'Checked Out', notes: 'Left a charger in room' },
    // Inquiry
    { guestId: addedGuests[0].id, room: '', checkIn: format(nextWeek), checkOut: format(new Date(nextWeek.getTime() + 86400000)), guestCount: 1, amount: 0, paymentStatus: 'Pending', status: 'Inquiry', notes: 'Checking for next trip' }
  ];

  for (const b of dummyBookings) {
    await addBooking(b);
  }
};
