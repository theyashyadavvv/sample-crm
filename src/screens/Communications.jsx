import React, { useState, useEffect, useMemo } from 'react';
import { MessageSquare, Send, Copy, Search, CheckCircle2 } from 'lucide-react';
import { getAllGuests, getAllBookings } from '../db';

export default function Communications() {
  const [activeTab, setActiveTab] = useState('reminders'); // 'reminders' | 'bulk'
  const [guests, setGuests] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [selectedGuests, setSelectedGuests] = useState(new Set());
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [gData, bData] = await Promise.all([getAllGuests(), getAllBookings()]);
    setGuests(gData);
    setBookings(bData);
  };

  // Pre-arrival Reminders (next 3 days)
  const upcomingReminders = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const inThreeDays = new Date(today);
    inThreeDays.setDate(today.getDate() + 3);

    const guestMap = new Map(guests.map(g => [g.id, g]));

    return bookings.filter(b => {
      const checkInDate = new Date(b.checkIn);
      return checkInDate >= today && checkInDate <= inThreeDays && b.status !== 'Cancelled';
    }).map(b => {
      const g = guestMap.get(b.guestId);
      return { ...b, guest: g };
    }).sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn));
  }, [guests, bookings]);

  // Bulk Filtered Guests
  const filteredGuests = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return guests;
    return guests.filter(g => 
      [g.name, g.phone, g.email, g.city, g.source].some(v => String(v || '').toLowerCase().includes(q))
    );
  }, [guests, search]);

  const toggleGuestSelection = (id) => {
    const newSet = new Set(selectedGuests);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedGuests(newSet);
  };

  const selectAll = () => {
    if (selectedGuests.size === filteredGuests.length) {
      setSelectedGuests(newSet());
    } else {
      setSelectedGuests(new Set(filteredGuests.map(g => g.id)));
    }
  };

  const copyToClipboard = (type) => {
    const selected = filteredGuests.filter(g => selectedGuests.has(g.id));
    let textToCopy = '';
    
    if (type === 'phone') {
      textToCopy = selected.map(g => g.phone).filter(Boolean).join(', ');
    } else if (type === 'email') {
      textToCopy = selected.map(g => g.email).filter(Boolean).join(', ');
    }

    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(type);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const sendWhatsAppReminder = (booking) => {
    if (!booking.guest?.phone) {
      alert("No phone number recorded for this guest.");
      return;
    }
    const rawPhone = booking.guest.phone.replace(/\D/g, '');
    const phone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone; // Assume Indian numbers if 10 digits
    const message = `Hello ${booking.guest.name},\n\nWe are excited to welcome you to Lakeside Farm & Resort on ${booking.checkIn}. \n\nCheck-in time is 12:00 PM. Please let us know what time you expect to arrive. Safe travels!\n\nRegards,\nLakeside Team`;
    
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Communications</h1>
        <p className="text-gray-500 mt-1">Send reminders and contact guests. (Note: Opens your local WhatsApp Web or email client)</p>
      </div>

      <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('reminders')}
              className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm ${activeTab === 'reminders' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Upcoming Check-in Reminders
            </button>
            <button
              onClick={() => setActiveTab('bulk')}
              className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm ${activeTab === 'bulk' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Bulk Messaging & Contacts
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'reminders' && (
            <div>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Pre-Arrival Reminders</h2>
                <p className="text-sm text-gray-500">Guests arriving in the next 3 days. Send 1-click WhatsApp reminders.</p>
              </div>

              {upcomingReminders.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded p-6 text-center text-gray-500 text-sm">
                  No upcoming check-ins in the next 3 days.
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingReminders.map(b => (
                    <div key={b.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="mb-3 sm:mb-0">
                        <div className="font-semibold text-gray-900">{b.guest?.name || 'Unknown'} <span className="text-sm font-normal text-gray-500">({b.guest?.phone || 'No phone'})</span></div>
                        <div className="text-sm text-gray-600 mt-1">
                          Arriving: <span className="font-medium text-indigo-600">{b.checkIn}</span> | Room: {b.room || 'TBD'}
                        </div>
                      </div>
                      <button 
                        onClick={() => sendWhatsAppReminder(b)}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm font-medium flex items-center transition"
                      >
                        <MessageSquare size={16} className="mr-2" /> Send WhatsApp
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'bulk' && (
            <div>
              <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Bulk Contacts</h2>
                  <p className="text-sm text-gray-500">Select past or present guests to copy their contacts for bulk SMS or emails.</p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => copyToClipboard('phone')}
                    disabled={selectedGuests.size === 0}
                    className="bg-slate-900 text-white px-3 py-2 rounded text-sm font-medium flex items-center hover:bg-slate-800 disabled:opacity-50 transition"
                  >
                    {copied === 'phone' ? <CheckCircle2 size={16} className="mr-2 text-emerald-400"/> : <Copy size={16} className="mr-2" />} 
                    Copy {selectedGuests.size} Phones
                  </button>
                  <button 
                    onClick={() => copyToClipboard('email')}
                    disabled={selectedGuests.size === 0}
                    className="bg-slate-100 text-slate-800 border border-slate-200 px-3 py-2 rounded text-sm font-medium flex items-center hover:bg-slate-200 disabled:opacity-50 transition"
                  >
                    {copied === 'email' ? <CheckCircle2 size={16} className="mr-2 text-emerald-600"/> : <Copy size={16} className="mr-2" />} 
                    Copy {selectedGuests.size} Emails
                  </button>
                  <button 
                    onClick={() => {
                      const emails = filteredGuests.filter(g => selectedGuests.has(g.id) && g.email).map(g => g.email).join(',');
                      if (emails) window.open(`mailto:?bcc=${emails}`, '_blank');
                      else alert("No valid emails selected.");
                    }}
                    disabled={selectedGuests.size === 0}
                    className="bg-indigo-600 text-white px-3 py-2 rounded text-sm font-medium flex items-center hover:bg-indigo-700 disabled:opacity-50 transition"
                  >
                    <Send size={16} className="mr-2" /> 
                    Email All (BCC)
                  </button>
                </div>
              </div>

              <div className="mb-4 bg-blue-50 text-blue-800 text-xs p-3 rounded flex flex-col gap-1">
                <strong>💡 How to send bulk messages:</strong>
                <span>• <strong>WhatsApp/SMS:</strong> Click "Copy Phones", then paste the comma-separated numbers into your bulk SMS portal (like Fast2SMS) or a WhatsApp Bulk Sender Chrome extension.</span>
                <span>• <strong>Email:</strong> Click "Email All (BCC)" to automatically open your email app with all selected emails hidden in the BCC field, or use "Copy Emails" to paste them manually.</span>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Filter guests by name, city, source..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input 
                          type="checkbox" 
                          checked={filteredGuests.length > 0 && selectedGuests.size === filteredGuests.length}
                          onChange={selectAll}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Guest</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredGuests.length === 0 ? (
                      <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-500 text-sm">No guests found.</td></tr>
                    ) : (
                      filteredGuests.map(g => (
                        <tr key={g.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleGuestSelection(g.id)}>
                          <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                            <input 
                              type="checkbox" 
                              checked={selectedGuests.has(g.id)}
                              onChange={() => toggleGuestSelection(g.id)}
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{g.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{g.phone || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{g.email || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{g.source || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
