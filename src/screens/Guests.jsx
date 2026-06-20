import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, X, Phone, Mail, MapPin } from 'lucide-react';
import { getAllGuests, addGuest, getBookingsByGuest } from '../db';

export default function Guests() {
  const [guests, setGuests] = useState([]);
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [guestBookings, setGuestBookings] = useState([]);

  // Form state
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', city: '', source: '', notes: '' });

  useEffect(() => {
    loadGuests();
  }, []);

  const loadGuests = async () => {
    const data = await getAllGuests();
    // sort by newest first
    data.sort((a, b) => b.createdAt - a.createdAt);
    setGuests(data);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) return;
    await addGuest(formData);
    setFormData({ name: '', phone: '', email: '', city: '', source: '', notes: '' });
    setShowAddForm(false);
    loadGuests();
  };

  const viewGuest = async (guest) => {
    setSelectedGuest(guest);
    const bookings = await getBookingsByGuest(guest.id);
    bookings.sort((a, b) => new Date(b.checkIn) - new Date(a.checkIn));
    setGuestBookings(bookings);
  };

  const filteredGuests = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return guests;
    return guests.filter(g => 
      [g.name, g.phone, g.email, g.city, g.source].some(v => String(v || '').toLowerCase().includes(q))
    );
  }, [guests, search]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Guests</h1>
        <button 
          onClick={() => setShowAddForm(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center hover:bg-indigo-700 transition"
        >
          <Plus size={16} className="mr-2" /> Add Guest
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Quick Add Guest</h2>
            <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
          </div>
          <form onSubmit={handleAddSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
              <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm" placeholder="John Doe" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Phone *</label>
              <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm" placeholder="+91 9876543210" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm" placeholder="john@example.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">City</label>
              <input type="text" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm" placeholder="Mumbai" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Source</label>
              <select value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm bg-white">
                <option value="">Select source...</option>
                <option value="Walk-in">Walk-in</option>
                <option value="Phone">Phone</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Website">Website</option>
                <option value="Justdial">Justdial</option>
                <option value="TripAdvisor">TripAdvisor</option>
                <option value="Goibibo">Goibibo</option>
                <option value="Wanderlog">Wanderlog</option>
                <option value="Referral">Referral</option>
                <option value="Instagram">Instagram</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
              <input type="text" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm" placeholder="Any special requirements..." />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button type="submit" className="bg-slate-900 text-white px-5 py-2 rounded text-sm font-medium hover:bg-slate-800">Save Guest</button>
            </div>
          </form>
        </div>
      )}

      {/* Main Layout: List + Details Side-by-Side on large screens */}
      <div className={`grid grid-cols-1 ${selectedGuest ? 'lg:grid-cols-3' : ''} gap-6`}>
        
        {/* Guest List */}
        <div className={`bg-white shadow rounded-lg border border-gray-200 overflow-hidden ${selectedGuest ? 'lg:col-span-2' : ''}`}>
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Search by name, phone, email, city..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredGuests.length === 0 ? (
                  <tr><td colSpan="4" className="px-6 py-10 text-center text-gray-500 text-sm">No guests found.</td></tr>
                ) : (
                  filteredGuests.map(guest => (
                    <tr 
                      key={guest.id} 
                      onClick={() => viewGuest(guest)}
                      className={`cursor-pointer hover:bg-slate-50 transition ${selectedGuest?.id === guest.id ? 'bg-indigo-50' : ''}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{guest.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center"><Phone size={12} className="mr-1 text-gray-400"/> {guest.phone}</div>
                        {guest.email && <div className="text-xs text-gray-500 mt-1 flex items-center"><Mail size={12} className="mr-1"/> {guest.email}</div>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {guest.city ? <span className="flex items-center"><MapPin size={12} className="mr-1"/> {guest.city}</span> : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {guest.source || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Guest Details Panel */}
        {selectedGuest && (
          <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden flex flex-col h-fit sticky top-4">
            <div className="p-4 border-b border-gray-200 flex justify-between items-start bg-slate-50">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{selectedGuest.name}</h2>
                <p className="text-sm text-gray-500 mt-1">Customer ID: {selectedGuest.id}</p>
              </div>
              <button onClick={() => setSelectedGuest(null)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            
            <div className="p-5 flex-1 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Contact Info</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Phone</p>
                      <p className="font-medium">{selectedGuest.phone}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Email</p>
                      <p className="font-medium break-all">{selectedGuest.email || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">City</p>
                      <p className="font-medium">{selectedGuest.city || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Source</p>
                      <p className="font-medium">{selectedGuest.source || '-'}</p>
                    </div>
                  </div>
                </div>

                {selectedGuest.notes && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Notes</h3>
                    <p className="text-sm bg-yellow-50 text-yellow-800 p-3 rounded">{selectedGuest.notes}</p>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-100">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Booking History ({guestBookings.length})</h3>
                  {guestBookings.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No bookings found for this guest.</p>
                  ) : (
                    <ul className="space-y-3">
                      {guestBookings.map(b => (
                        <li key={b.id} className="bg-gray-50 p-3 rounded border border-gray-100">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-sm font-medium text-gray-900">{b.checkIn} to {b.checkOut}</span>
                            <span className="text-xs font-semibold bg-gray-200 text-gray-700 px-2 py-0.5 rounded">{b.status}</span>
                          </div>
                          <div className="text-xs text-gray-500 flex justify-between">
                            <span>Room: {b.room || 'Any'} | Pax: {b.guestCount}</span>
                            <span>{b.paymentStatus}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
