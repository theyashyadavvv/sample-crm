import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, X, ArrowRight, Calendar as CalendarIcon, Search, UserCheck, Receipt } from 'lucide-react';
import { getAllBookings, getAllGuests, addBooking, updateBooking, deleteBooking, addGuest } from '../db';

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [guests, setGuests] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [targetDate, setTargetDate] = useState('');

  // Form state
  const [searchPhone, setSearchPhone] = useState('');
  const [matchedGuest, setMatchedGuest] = useState(null);
  const [guestFormData, setGuestFormData] = useState({ name: '', email: '', city: '', source: '' });
  
  const [bookingData, setBookingData] = useState({
    room: '', checkIn: '', checkOut: '', guestCount: 1, amount: '', paymentStatus: 'Pending', status: 'Inquiry', notes: ''
  });

  const [printBooking, setPrintBooking] = useState(null);

  const searchRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [bData, gData] = await Promise.all([getAllBookings(), getAllGuests()]);
    bData.sort((a, b) => new Date(b.checkIn) - new Date(a.checkIn));
    gData.sort((a, b) => a.name.localeCompare(b.name));
    setBookings(bData);
    setGuests(gData);
  };

  // Smart Search logic
  useEffect(() => {
    if (searchPhone.length >= 3) {
      const match = guests.find(g => (g.phone && g.phone.includes(searchPhone)));
      if (match) {
        setMatchedGuest(match);
        setGuestFormData({ name: match.name, email: match.email || '', city: match.city || '', source: match.source || '' });
      } else {
        if (matchedGuest) {
          setMatchedGuest(null);
          setGuestFormData({ name: '', email: '', city: '', source: '' });
        }
      }
    } else {
      setMatchedGuest(null);
    }
  }, [searchPhone, guests]);

  const clearGuestSelection = () => {
    setSearchPhone('');
    setMatchedGuest(null);
    setGuestFormData({ name: '', email: '', city: '', source: '' });
    if (searchRef.current) searchRef.current.focus();
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!searchPhone || !bookingData.checkIn || !bookingData.checkOut) return;
    
    let finalGuestId = matchedGuest?.id;
    
    // Create new guest if no match
    if (!matchedGuest) {
      if (!guestFormData.name) {
        alert("Please enter a name for the new guest.");
        return;
      }
      const newG = await addGuest({ ...guestFormData, phone: searchPhone });
      finalGuestId = newG.id;
    }

    await addBooking({
      ...bookingData,
      guestId: finalGuestId,
      guestCount: parseInt(bookingData.guestCount, 10) || 1,
      amount: parseFloat(bookingData.amount) || 0,
    });
    
    // Reset
    setSearchPhone('');
    setMatchedGuest(null);
    setGuestFormData({ name: '', email: '', city: '', source: '' });
    setBookingData({ room: '', checkIn: '', checkOut: '', guestCount: 1, amount: '', paymentStatus: 'Pending', status: 'Inquiry', notes: '' });
    setShowAddForm(false);
    loadData();
  };

  const advanceStatus = async (booking) => {
    const transitions = {
      'Inquiry': 'Confirmed',
      'Confirmed': 'Checked In',
      'Checked In': 'Checked Out'
    };
    const nextStatus = transitions[booking.status];
    if (nextStatus) {
      await updateBooking({ ...booking, status: nextStatus });
      loadData();
    }
  };

  const markNoShow = async (booking) => {
    if (window.confirm('Mark this booking as No-Show?')) {
      await updateBooking({ ...booking, status: 'No-Show' });
      loadData();
    }
  };

  const cancelBooking = async (booking) => {
    if (window.confirm('Cancel this booking?')) {
      await updateBooking({ ...booking, status: 'Cancelled' });
      loadData();
    }
  };

  const deleteBtn = async (id) => {
    if (window.confirm('Permanently delete this booking?')) {
      await deleteBooking(id);
      loadData();
    }
  };

  const guestMap = useMemo(() => new Map(guests.map(g => [g.id, g.name])), [guests]);

  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      if (statusFilter !== 'All' && b.status !== statusFilter) return false;
      if (paymentFilter !== 'All' && b.paymentStatus !== paymentFilter) return false;
      
      // Date Filter: checking if targetDate falls between checkIn and checkOut (inclusive)
      if (targetDate) {
        if (b.checkIn > targetDate || b.checkOut < targetDate) {
          return false;
        }
      }
      return true;
    });
  }, [bookings, statusFilter, paymentFilter, targetDate]);

  const StatusBadge = ({ status }) => {
    const colors = {
      'Inquiry': 'bg-gray-100 text-gray-800',
      'Confirmed': 'bg-blue-100 text-blue-800',
      'Checked In': 'bg-emerald-100 text-emerald-800',
      'Checked Out': 'bg-slate-200 text-slate-800',
      'Cancelled': 'bg-red-100 text-red-800',
      'No-Show': 'bg-stone-800 text-white'
    };
    return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] || colors['Inquiry']}`}>{status}</span>;
  };

  const PaymentBadge = ({ status }) => {
    const colors = {
      'Pending': 'bg-rose-100 text-rose-800',
      'Advance Paid': 'bg-amber-100 text-amber-800',
      'Fully Paid': 'bg-emerald-100 text-emerald-800'
    };
    return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] || colors['Pending']}`}>{status}</span>;
  };

  useEffect(() => {
    if (printBooking) {
      setTimeout(() => {
        window.print();
        setPrintBooking(null);
      }, 300);
    }
  }, [printBooking]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 print:m-0 print:p-0 print:w-full print:max-w-none">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
        <button 
          onClick={() => setShowAddForm(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center hover:bg-indigo-700 transition"
        >
          <Plus size={16} className="mr-2" /> New Booking
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white p-5 rounded-lg shadow-lg border border-indigo-100 print:hidden">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Create New Booking</h2>
            <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
          </div>
          
          <form onSubmit={handleAddSubmit} className="space-y-6">
            
            {/* Guest Auto-Fill Section */}
            <div className="bg-slate-50 p-4 rounded-md border border-slate-200 relative">
              <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center">
                <UserCheck size={16} className="mr-2 text-indigo-500"/> Guest Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-3 relative">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number * (Type to search returning guests)</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input 
                      ref={searchRef}
                      required 
                      type="text" 
                      value={searchPhone} 
                      onChange={e => setSearchPhone(e.target.value)} 
                      disabled={matchedGuest !== null}
                      className="w-full pl-9 pr-8 border border-indigo-300 rounded p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-indigo-50 disabled:font-semibold disabled:text-indigo-900" 
                      placeholder="Enter phone..." 
                    />
                    {matchedGuest && (
                      <button type="button" onClick={clearGuestSelection} className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-500 hover:text-indigo-700 bg-indigo-100 rounded-full p-1">
                        <X size={12}/>
                      </button>
                    )}
                  </div>
                  {matchedGuest && <p className="text-xs text-emerald-600 mt-1 font-medium">✓ Returning guest found! Details auto-filled.</p>}
                  {!matchedGuest && searchPhone.length >= 3 && <p className="text-xs text-amber-600 mt-1 font-medium">New guest. Please fill details below.</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Full Name {matchedGuest ? '' : '*'}</label>
                  <input required={!matchedGuest} type="text" value={guestFormData.name} onChange={e => setGuestFormData({...guestFormData, name: e.target.value})} disabled={matchedGuest !== null} className="w-full border border-gray-300 rounded p-2 text-sm disabled:bg-gray-100" placeholder="John Doe" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={guestFormData.email} onChange={e => setGuestFormData({...guestFormData, email: e.target.value})} disabled={matchedGuest !== null} className="w-full border border-gray-300 rounded p-2 text-sm disabled:bg-gray-100" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">City</label>
                  <input type="text" value={guestFormData.city} onChange={e => setGuestFormData({...guestFormData, city: e.target.value})} disabled={matchedGuest !== null} className="w-full border border-gray-300 rounded p-2 text-sm disabled:bg-gray-100" />
                </div>
              </div>
            </div>

            {/* Booking Details Section */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-4">
                 <h3 className="text-sm font-semibold text-slate-800 mb-1 flex items-center border-b border-gray-100 pb-2">
                  <CalendarIcon size={16} className="mr-2 text-indigo-500"/> Booking Details
                </h3>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Check In *</label>
                <input required type="date" value={bookingData.checkIn} onChange={e => setBookingData({...bookingData, checkIn: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Check Out *</label>
                <input required type="date" value={bookingData.checkOut} onChange={e => setBookingData({...bookingData, checkOut: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Room</label>
                <input type="text" value={bookingData.room} onChange={e => setBookingData({...bookingData, room: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm" placeholder="e.g. Suite 1" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">No. of Guests</label>
                <input type="number" min="1" value={bookingData.guestCount} onChange={e => setBookingData({...bookingData, guestCount: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm" />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Total Amount</label>
                <input type="number" step="0.01" value={bookingData.amount} onChange={e => setBookingData({...bookingData, amount: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Payment Status</label>
                <select value={bookingData.paymentStatus} onChange={e => setBookingData({...bookingData, paymentStatus: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm bg-white">
                  <option value="Pending">Pending</option>
                  <option value="Advance Paid">Advance Paid</option>
                  <option value="Fully Paid">Fully Paid</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select value={bookingData.status} onChange={e => setBookingData({...bookingData, status: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm bg-white">
                  <option value="Inquiry">Inquiry</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Checked In">Checked In</option>
                  <option value="Checked Out">Checked Out</option>
                  <option value="No-Show">No-Show</option>
                </select>
              </div>
              
              <div className="md:col-span-4">
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <input type="text" value={bookingData.notes} onChange={e => setBookingData({...bookingData, notes: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm" placeholder="Any special requests..." />
              </div>

              <div className="md:col-span-4 flex justify-end mt-2 border-t border-gray-100 pt-4">
                <button type="submit" className="bg-slate-900 text-white px-6 py-2.5 rounded-md text-sm font-bold hover:bg-slate-800 shadow">Complete Booking</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Advanced Filters */}
      <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex flex-wrap gap-4 items-center print:hidden">
        <div className="flex items-center gap-2">
          <CalendarIcon size={16} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filter Date:</span>
          <input 
            type="date" 
            value={targetDate} 
            onChange={e => setTargetDate(e.target.value)} 
            className="border border-gray-300 rounded-md py-1.5 px-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white"
          />
          {targetDate && <button onClick={() => setTargetDate('')} className="text-xs text-red-500 hover:text-red-700 ml-1">Clear Date</button>}
        </div>
        
        <div className="h-6 w-px bg-gray-300 hidden sm:block"></div>

        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-300 rounded-md py-1.5 pl-3 pr-8 text-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white">
          <option value="All">All Statuses</option>
          <option value="Inquiry">Inquiry</option>
          <option value="Confirmed">Confirmed</option>
          <option value="Checked In">Checked In</option>
          <option value="Checked Out">Checked Out</option>
          <option value="No-Show">No-Show</option>
          <option value="Cancelled">Cancelled</option>
        </select>

        <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)} className="border border-gray-300 rounded-md py-1.5 pl-3 pr-8 text-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white">
          <option value="All">All Payments</option>
          <option value="Pending">Pending</option>
          <option value="Advance Paid">Advance Paid</option>
          <option value="Fully Paid">Fully Paid</option>
        </select>
      </div>

      {/* Bookings List */}
      <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden print:hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest & Dates</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room & Pax</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBookings.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-10 text-center text-gray-500 text-sm">No bookings found for these filters.</td></tr>
              ) : (
                filteredBookings.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{guestMap.get(b.guestId) || 'Unknown'}</div>
                      <div className="text-xs text-gray-500 flex items-center mt-1">
                        <CalendarIcon size={12} className="mr-1" />
                        {b.checkIn} <ArrowRight size={10} className="mx-1" /> {b.checkOut}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{b.room || 'Unassigned'}</div>
                      <div className="text-xs text-gray-500 mt-1">{b.guestCount} Pax</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{b.amount ? `₹${b.amount}` : '-'}</div>
                      <div className="mt-1"><PaymentBadge status={b.paymentStatus} /></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex flex-col items-end gap-2">
                        {b.status === 'Inquiry' && <button onClick={() => advanceStatus(b)} className="text-blue-600 hover:text-blue-900 bg-blue-50 px-2 py-1 rounded text-xs border border-blue-200">Confirm</button>}
                        {b.status === 'Confirmed' && <button onClick={() => advanceStatus(b)} className="text-emerald-600 hover:text-emerald-900 bg-emerald-50 px-2 py-1 rounded text-xs border border-emerald-200">Check In</button>}
                        {b.status === 'Checked In' && <button onClick={() => advanceStatus(b)} className="text-slate-600 hover:text-slate-900 bg-slate-100 px-2 py-1 rounded text-xs border border-slate-300">Check Out</button>}
                        
                        {(b.status !== 'Inquiry' && b.status !== 'Cancelled') && (
                          <button onClick={() => setPrintBooking(b)} className="text-gray-600 hover:text-gray-900 bg-gray-100 px-2 py-1 rounded text-xs border border-gray-300 flex items-center justify-center w-full mt-1">
                            <Receipt size={12} className="mr-1"/> Receipt
                          </button>
                        )}
                        
                        {(b.status === 'Confirmed') && (
                          <button onClick={() => markNoShow(b)} className="text-stone-600 hover:text-stone-900 text-xs mt-1">Mark No-Show</button>
                        )}
                        
                        {(b.status === 'Inquiry' || b.status === 'Confirmed') && (
                          <button onClick={() => cancelBooking(b)} className="text-red-600 hover:text-red-900 text-xs mt-1">Cancel</button>
                        )}
                        <button onClick={() => deleteBtn(b.id)} className="text-gray-400 hover:text-red-600 text-xs mt-1">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print Only: Invoice/Receipt Layout */}
      {printBooking && (
        <div className="hidden print:block absolute top-0 left-0 w-full bg-white z-50 p-8">
          <div className="text-center mb-8 border-b-2 border-gray-900 pb-4">
            <h1 className="text-4xl font-black text-gray-900 uppercase tracking-widest">Lakeside Resort</h1>
            <p className="text-lg text-gray-600 mt-1">Guest Invoice & Receipt</p>
          </div>
          
          <div className="flex justify-between mb-12">
            <div>
              <h3 className="text-sm font-bold text-gray-500 uppercase">Billed To</h3>
              <p className="text-xl font-bold text-gray-900 mt-1">{guestMap.get(printBooking.guestId) || 'Guest'}</p>
            </div>
            <div className="text-right">
              <h3 className="text-sm font-bold text-gray-500 uppercase">Receipt Details</h3>
              <p className="text-gray-900 mt-1"><span className="font-semibold">Date:</span> {new Date().toLocaleDateString()}</p>
              <p className="text-gray-900"><span className="font-semibold">Booking ID:</span> #LK-{printBooking.id.toString().padStart(4, '0')}</p>
            </div>
          </div>

          <table className="w-full text-left mb-12 border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-900">
                <th className="py-3 font-bold uppercase text-gray-700">Description</th>
                <th className="py-3 font-bold uppercase text-gray-700">Room</th>
                <th className="py-3 font-bold uppercase text-gray-700 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200">
                <td className="py-4">
                  <p className="font-semibold text-lg">Resort Stay ({printBooking.guestCount} Pax)</p>
                  <p className="text-gray-600">Check-In: {printBooking.checkIn}</p>
                  <p className="text-gray-600">Check-Out: {printBooking.checkOut}</p>
                </td>
                <td className="py-4 font-semibold">{printBooking.room || 'Standard'}</td>
                <td className="py-4 text-right font-bold text-xl">₹{parseFloat(printBooking.amount).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-1/2">
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="font-semibold text-gray-600">Payment Status:</span>
                <span className="font-bold">{printBooking.paymentStatus}</span>
              </div>
              <div className="flex justify-between py-3">
                <span className="font-bold text-xl text-gray-900">Total Due:</span>
                <span className="font-black text-2xl text-gray-900">
                  {printBooking.paymentStatus === 'Fully Paid' ? '₹0' : `₹${parseFloat(printBooking.amount).toLocaleString()}`}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-20 pt-8 border-t border-gray-200 text-center text-gray-500 text-sm">
            <p>Thank you for choosing Lakeside Resort! We hope to see you again.</p>
            <p>For inquiries, please contact lakeside-support@example.com</p>
          </div>
        </div>
      )}

    </div>
  );
}
