import React, { useState, useEffect, useMemo } from 'react';
import { Plus, X, ArrowRight, Calendar as CalendarIcon } from 'lucide-react';
import { getAllBookings, getAllGuests, addBooking, updateBooking, deleteBooking } from '../db';

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [guests, setGuests] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [paymentFilter, setPaymentFilter] = useState('All');

  // Form state
  const [formData, setFormData] = useState({
    guestId: '',
    room: '',
    checkIn: '',
    checkOut: '',
    guestCount: 1,
    amount: '',
    paymentStatus: 'Pending',
    status: 'Inquiry',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [bData, gData] = await Promise.all([getAllBookings(), getAllGuests()]);
    // sort by check-in descending
    bData.sort((a, b) => new Date(b.checkIn) - new Date(a.checkIn));
    gData.sort((a, b) => a.name.localeCompare(b.name));
    setBookings(bData);
    setGuests(gData);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.guestId || !formData.checkIn || !formData.checkOut) return;
    
    await addBooking({
      ...formData,
      guestId: parseInt(formData.guestId, 10),
      guestCount: parseInt(formData.guestCount, 10) || 1,
      amount: parseFloat(formData.amount) || 0,
    });
    
    setFormData({
      guestId: '', room: '', checkIn: '', checkOut: '', guestCount: 1, 
      amount: '', paymentStatus: 'Pending', status: 'Inquiry', notes: ''
    });
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
      return true;
    });
  }, [bookings, statusFilter, paymentFilter]);

  const StatusBadge = ({ status }) => {
    const colors = {
      'Inquiry': 'bg-gray-100 text-gray-800',
      'Confirmed': 'bg-blue-100 text-blue-800',
      'Checked In': 'bg-emerald-100 text-emerald-800',
      'Checked Out': 'bg-slate-200 text-slate-800',
      'Cancelled': 'bg-red-100 text-red-800'
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

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
        <button 
          onClick={() => setShowAddForm(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center hover:bg-indigo-700 transition"
        >
          <Plus size={16} className="mr-2" /> New Booking
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Create Booking</h2>
            <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
          </div>
          <form onSubmit={handleAddSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">Select Guest * (Add guest in Guests tab first if new)</label>
              <select required value={formData.guestId} onChange={e => setFormData({...formData, guestId: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm">
                <option value="">-- Select Guest --</option>
                {guests.map(g => <option key={g.id} value={g.id}>{g.name} ({g.phone})</option>)}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Check In *</label>
              <input required type="date" value={formData.checkIn} onChange={e => setFormData({...formData, checkIn: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Check Out *</label>
              <input required type="date" value={formData.checkOut} onChange={e => setFormData({...formData, checkOut: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Room</label>
              <input type="text" value={formData.room} onChange={e => setFormData({...formData, room: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm" placeholder="e.g. Suite 1" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">No. of Guests</label>
              <input type="number" min="1" value={formData.guestCount} onChange={e => setFormData({...formData, guestCount: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Total Amount</label>
              <input type="number" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Payment Status</label>
              <select value={formData.paymentStatus} onChange={e => setFormData({...formData, paymentStatus: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm bg-white">
                <option value="Pending">Pending</option>
                <option value="Advance Paid">Advance Paid</option>
                <option value="Fully Paid">Fully Paid</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm bg-white">
                <option value="Inquiry">Inquiry</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Checked In">Checked In</option>
                <option value="Checked Out">Checked Out</option>
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
              <input type="text" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm" placeholder="Any special requests..." />
            </div>

            <div className="md:col-span-3 flex justify-end">
              <button type="submit" className="bg-slate-900 text-white px-5 py-2 rounded text-sm font-medium hover:bg-slate-800">Save Booking</button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-300 rounded-md py-1.5 pl-3 pr-8 text-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white">
          <option value="All">All Statuses</option>
          <option value="Inquiry">Inquiry</option>
          <option value="Confirmed">Confirmed</option>
          <option value="Checked In">Checked In</option>
          <option value="Checked Out">Checked Out</option>
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
      <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
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
                <tr><td colSpan="5" className="px-6 py-10 text-center text-gray-500 text-sm">No bookings found.</td></tr>
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
                        {b.status === 'Inquiry' && <button onClick={() => advanceStatus(b)} className="text-blue-600 hover:text-blue-900 bg-blue-50 px-2 py-1 rounded text-xs">Confirm</button>}
                        {b.status === 'Confirmed' && <button onClick={() => advanceStatus(b)} className="text-emerald-600 hover:text-emerald-900 bg-emerald-50 px-2 py-1 rounded text-xs">Check In</button>}
                        {b.status === 'Checked In' && <button onClick={() => advanceStatus(b)} className="text-slate-600 hover:text-slate-900 bg-slate-100 px-2 py-1 rounded text-xs">Check Out</button>}
                        
                        {(b.status === 'Inquiry' || b.status === 'Confirmed') && (
                          <button onClick={() => cancelBooking(b)} className="text-red-600 hover:text-red-900 text-xs">Cancel</button>
                        )}
                        <button onClick={() => deleteBtn(b.id)} className="text-gray-400 hover:text-red-600 text-xs">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
