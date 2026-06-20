import React, { useState, useEffect } from 'react';
import { Users, CalendarDays, CreditCard, BedDouble, AlertCircle } from 'lucide-react';
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

      // Join guest info
      const guestMap = new Map(guests.map(g => [g.id, g]));

      bookings.forEach(b => {
        const guestName = guestMap.get(b.guestId)?.name || 'Unknown Guest';
        b.guestName = guestName;

        if (b.paymentStatus === 'Pending') pendingPayments++;
        if (b.status === 'Checked In') occupiedRooms++;

        if (b.checkIn === today) {
          todayList.push({ ...b, type: 'Check-in' });
        }
        if (b.checkOut === today) {
          todayList.push({ ...b, type: 'Check-out' });
        }

        if (b.checkIn > today && b.checkIn <= nextWeekStr) {
          upcomingList.push(b);
        }
      });

      // Sort lists
      todayList.sort((a, b) => a.checkIn.localeCompare(b.checkIn));
      upcomingList.sort((a, b) => a.checkIn.localeCompare(b.checkIn));

      setStats({
        totalGuests: guests.length,
        totalBookings: bookings.length,
        pendingPayments,
        occupiedRooms,
      });
      setTodayActivity(todayList);
      setUpcomingBookings(upcomingList);
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
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        {stats.totalGuests === 0 && (
          <button onClick={() => navigate('import')} className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition">
            Import Excel Data
          </button>
        )}
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
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }) {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100 flex items-center p-5">
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
