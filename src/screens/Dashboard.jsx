import React, { useState, useEffect } from 'react';
import { Users, CalendarDays, CreditCard, BedDouble, AlertCircle, Printer } from 'lucide-react';
import { getAllGuests, getAllBookings } from '../db';

export default function Dashboard({ navigate }) {
  const [stats, setStats] = useState({
    totalGuests: 0,
    totalBookings: 0,
    pendingPayments: 0,
    occupiedRooms: 0,
  });
  const [todayActivity, setTodayActivity] = useState([]);
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [stayOvers, setStayOvers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [guests, bookings] = await Promise.all([getAllGuests(), getAllBookings()]);
      
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextWeekStr = nextWeek.toISOString().split('T')[0];

      let pendingPayments = 0;
      let occupiedRooms = 0;
      const todayList = [];
      const upcomingList = [];
      const stayOverList = [];

      // Join guest info
      const guestMap = new Map(guests.map(g => [g.id, g]));

      bookings.forEach(b => {
        const guestName = guestMap.get(b.guestId)?.name || 'Unknown Guest';
        b.guestName = guestName;

        if (b.paymentStatus === 'Pending' && b.status !== 'Cancelled' && b.status !== 'No-Show') pendingPayments++;
        if (b.status === 'Checked In') occupiedRooms++;

        if (b.checkIn === today && b.status !== 'Cancelled' && b.status !== 'No-Show') {
          todayList.push({ ...b, type: 'Check-in' });
        }
        if (b.checkOut === today && (b.status === 'Checked In' || b.status === 'Confirmed')) {
          todayList.push({ ...b, type: 'Check-out' });
        }
        
        if (b.checkIn < today && b.checkOut > today && b.status === 'Checked In') {
          stayOverList.push(b);
        }

        if (b.checkIn > today && b.checkIn <= nextWeekStr && b.status !== 'Cancelled' && b.status !== 'No-Show') {
          upcomingList.push(b);
        }
      });

      // Sort lists
      todayList.sort((a, b) => a.checkIn.localeCompare(b.checkIn));
      upcomingList.sort((a, b) => a.checkIn.localeCompare(b.checkIn));
      stayOverList.sort((a, b) => (a.room || '').localeCompare(b.room || ''));

      setStats({
        totalGuests: guests.length,
        totalBookings: bookings.length,
        pendingPayments,
        occupiedRooms,
      });
      setTodayActivity(todayList);
      setUpcomingBookings(upcomingList);
      setStayOvers(stayOverList);
    } catch (error) {
      console.error("Failed to load dashboard data", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse flex space-x-4"><div className="flex-1 space-y-4 py-1"><div className="h-4 bg-gray-200 rounded w-3/4"></div></div></div>;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto print:m-0 print:p-0 print:w-full print:max-w-none">
      <div className="flex justify-between items-center print:hidden">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50 transition flex items-center shadow-sm">
            <Printer size={16} className="mr-2" /> Print Manifest
          </button>
          {stats.totalGuests === 0 && (
            <button onClick={() => navigate('import')} className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition">
              Import Excel Data
            </button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Guests" value={stats.totalGuests} icon={Users} color="bg-blue-500" />
        <StatCard title="Total Bookings" value={stats.totalBookings} icon={CalendarDays} color="bg-indigo-500" />
        <StatCard title="Occupied Rooms" value={stats.occupiedRooms} icon={BedDouble} color="bg-emerald-500" />
        <StatCard title="Pending Payments" value={stats.pendingPayments} icon={CreditCard} color="bg-rose-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Activity */}
        <div className="bg-white shadow rounded-lg border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">Today's Activity</h2>
            <span className="bg-indigo-100 text-indigo-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">{todayActivity.length}</span>
          </div>
          <div className="p-0">
            {todayActivity.length === 0 ? (
              <EmptyState message="No check-ins or check-outs today." />
            ) : (
              <ul className="divide-y divide-gray-100">
                {todayActivity.map((activity, i) => (
                  <li key={i} className="px-5 py-4 hover:bg-gray-50 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{activity.guestName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Room: {activity.room || 'Unassigned'} • Guests: {activity.guestCount}</p>
                    </div>
                    <div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        activity.type === 'Check-in' ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-100 text-orange-800'
                      }`}>
                        {activity.type}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Upcoming Bookings */}
        <div className="bg-white shadow rounded-lg border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">Upcoming (Next 7 Days)</h2>
            <span className="bg-slate-100 text-slate-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">{upcomingBookings.length}</span>
          </div>
          <div className="p-0">
            {upcomingBookings.length === 0 ? (
              <EmptyState message="No upcoming bookings." />
            ) : (
              <ul className="divide-y divide-gray-100">
                {upcomingBookings.map((booking, i) => (
                  <li key={i} className="px-5 py-4 hover:bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{booking.guestName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Arriving: {booking.checkIn}</p>
                    </div>
                    <div className="flex flex-col sm:items-end">
                       <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 mb-1`}>
                        {booking.status}
                      </span>
                      {booking.paymentStatus === 'Pending' && (
                        <span className="inline-flex items-center text-xs font-medium text-rose-600">
                          <AlertCircle size={12} className="mr-1" /> Payment Pending
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Print Only: Housekeeping Manifest */}
      <div className="hidden print:block print:w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Lakeside Resort - Daily Housekeeping Manifest</h1>
          <p className="text-lg text-gray-600 mt-2">Date: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="mb-8 border-2 border-gray-900 rounded-lg p-6 break-inside-avoid">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-300">Check-Outs (Deep Cleaning Required)</h2>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="py-2">Room</th>
                <th className="py-2">Guest</th>
                <th className="py-2">Status</th>
                <th className="py-2">Done</th>
              </tr>
            </thead>
            <tbody>
              {todayActivity.filter(a => a.type === 'Check-out').length === 0 ? (
                <tr><td colSpan="4" className="py-4 text-gray-500 italic">No check-outs today.</td></tr>
              ) : (
                todayActivity.filter(a => a.type === 'Check-out').map((a, i) => (
                  <tr key={i} className="border-b border-gray-200">
                    <td className="py-3 font-bold text-lg">{a.room || 'Unassigned'}</td>
                    <td className="py-3">{a.guestName}</td>
                    <td className="py-3">{a.status}</td>
                    <td className="py-3"><div className="w-6 h-6 border-2 border-gray-400 rounded"></div></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mb-8 border-2 border-gray-900 rounded-lg p-6 break-inside-avoid">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-300">Stay-Overs (Light Cleaning)</h2>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="py-2">Room</th>
                <th className="py-2">Guest</th>
                <th className="py-2">Notes</th>
                <th className="py-2">Done</th>
              </tr>
            </thead>
            <tbody>
              {stayOvers.length === 0 ? (
                <tr><td colSpan="4" className="py-4 text-gray-500 italic">No stay-overs today.</td></tr>
              ) : (
                stayOvers.map((s, i) => (
                  <tr key={i} className="border-b border-gray-200">
                    <td className="py-3 font-bold text-lg">{s.room || 'Unassigned'}</td>
                    <td className="py-3">{s.guestName}</td>
                    <td className="py-3 text-sm text-gray-600">{s.notes}</td>
                    <td className="py-3"><div className="w-6 h-6 border-2 border-gray-400 rounded"></div></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-2 border-gray-900 rounded-lg p-6 break-inside-avoid">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-300">Check-Ins (Prepare by 12 PM)</h2>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="py-2">Room</th>
                <th className="py-2">Guest</th>
                <th className="py-2">Pax</th>
                <th className="py-2">Notes</th>
                <th className="py-2">Ready</th>
              </tr>
            </thead>
            <tbody>
              {todayActivity.filter(a => a.type === 'Check-in').length === 0 ? (
                <tr><td colSpan="5" className="py-4 text-gray-500 italic">No check-ins today.</td></tr>
              ) : (
                todayActivity.filter(a => a.type === 'Check-in').map((a, i) => (
                  <tr key={i} className="border-b border-gray-200">
                    <td className="py-3 font-bold text-lg">{a.room || 'Unassigned'}</td>
                    <td className="py-3">{a.guestName}</td>
                    <td className="py-3">{a.guestCount}</td>
                    <td className="py-3 text-sm text-gray-600">{a.notes}</td>
                    <td className="py-3"><div className="w-6 h-6 border-2 border-gray-400 rounded"></div></td>
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

function StatCard({ title, value, icon: Icon, color }) {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100 flex items-center p-5 print:hidden">
      <div className={`p-3 rounded-md ${color} text-white flex-shrink-0`}>
        <Icon size={24} />
      </div>
      <div className="ml-5 w-0 flex-1">
        <dl>
          <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
          <dd className="flex items-baseline">
            <div className="text-2xl font-bold text-gray-900">{value}</div>
          </dd>
        </dl>
      </div>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="px-5 py-10 text-center text-gray-500">
      <p className="text-sm">{message}</p>
    </div>
  );
}
