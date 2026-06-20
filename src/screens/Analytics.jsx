import React, { useState, useEffect, useMemo } from 'react';
import { BarChart3, TrendingUp, Users, Target } from 'lucide-react';
import { getAllBookings, getAllGuests } from '../db';

export default function Analytics() {
  const [bookings, setBookings] = useState([]);
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [bData, gData] = await Promise.all([getAllBookings(), getAllGuests()]);
    setBookings(bData);
    setGuests(gData);
    setLoading(false);
  };

  const metrics = useMemo(() => {
    let totalRevenue = 0;
    let completedStays = 0;
    let cancelled = 0;
    let noShows = 0;

    const sourceCount = {};
    const sourceRevenue = {};

    const guestMap = new Map(guests.map(g => [g.id, g]));

    bookings.forEach(b => {
      // Exclude Cancelled and No-Show from actual revenue, although some might have advance paid.
      // We will count it if amount > 0 and status is not Cancelled.
      const isLost = b.status === 'Cancelled' || b.status === 'No-Show';
      
      if (b.status === 'Cancelled') cancelled++;
      if (b.status === 'No-Show') noShows++;
      if (b.status === 'Checked Out') completedStays++;

      const amt = parseFloat(b.amount) || 0;
      if (!isLost) {
        totalRevenue += amt;
      }

      const guest = guestMap.get(b.guestId);
      const source = guest?.source || 'Unknown/Other';

      if (!sourceCount[source]) {
        sourceCount[source] = 0;
        sourceRevenue[source] = 0;
      }
      
      sourceCount[source] += 1;
      if (!isLost) {
        sourceRevenue[source] += amt;
      }
    });

    // Convert to sorted arrays
    const sourceData = Object.keys(sourceCount).map(src => ({
      name: src,
      bookings: sourceCount[src],
      revenue: sourceRevenue[src]
    })).sort((a, b) => b.revenue - a.revenue); // sort by revenue descending

    return { totalRevenue, completedStays, cancelled, noShows, sourceData };
  }, [bookings, guests]);

  if (loading) {
    return <div className="animate-pulse flex space-x-4"><div className="flex-1 space-y-4 py-1"><div className="h-4 bg-gray-200 rounded w-3/4"></div></div></div>;
  }

  const maxRevenue = Math.max(...metrics.sourceData.map(d => d.revenue), 1);
  const maxBookings = Math.max(...metrics.sourceData.map(d => d.bookings), 1);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
        <p className="text-gray-500 mt-1">Track your resort's performance and marketing ROI.</p>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100 p-5">
          <div className="flex items-center">
            <div className="p-3 rounded-md bg-indigo-500 text-white"><TrendingUp size={20} /></div>
            <div className="ml-4"><p className="text-sm font-medium text-gray-500">Total Revenue</p><p className="text-2xl font-bold text-gray-900">₹{metrics.totalRevenue.toLocaleString()}</p></div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100 p-5">
          <div className="flex items-center">
            <div className="p-3 rounded-md bg-emerald-500 text-white"><Users size={20} /></div>
            <div className="ml-4"><p className="text-sm font-medium text-gray-500">Completed Stays</p><p className="text-2xl font-bold text-gray-900">{metrics.completedStays}</p></div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100 p-5">
          <div className="flex items-center">
            <div className="p-3 rounded-md bg-red-500 text-white"><BarChart3 size={20} /></div>
            <div className="ml-4"><p className="text-sm font-medium text-gray-500">Cancellations</p><p className="text-2xl font-bold text-gray-900">{metrics.cancelled}</p></div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100 p-5">
          <div className="flex items-center">
            <div className="p-3 rounded-md bg-stone-700 text-white"><Target size={20} /></div>
            <div className="ml-4"><p className="text-sm font-medium text-gray-500">No-Shows</p><p className="text-2xl font-bold text-gray-900">{metrics.noShows}</p></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Source */}
        <div className="bg-white shadow rounded-lg border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Revenue by Lead Source</h2>
          {metrics.sourceData.length === 0 ? (
            <p className="text-sm text-gray-500">No data available.</p>
          ) : (
            <div className="space-y-4">
              {metrics.sourceData.map((data, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{data.name}</span>
                    <span className="text-gray-900 font-bold">₹{data.revenue.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${(data.revenue / maxRevenue) * 100}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bookings by Source */}
        <div className="bg-white shadow rounded-lg border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Total Bookings by Source</h2>
          {metrics.sourceData.length === 0 ? (
            <p className="text-sm text-gray-500">No data available.</p>
          ) : (
            <div className="space-y-4">
              {metrics.sourceData.sort((a,b) => b.bookings - a.bookings).map((data, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{data.name}</span>
                    <span className="text-gray-900 font-bold">{data.bookings} {data.bookings === 1 ? 'Booking' : 'Bookings'}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: `${(data.bookings / maxBookings) * 100}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
