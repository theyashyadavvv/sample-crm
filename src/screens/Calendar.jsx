import React, { useState, useEffect, useMemo } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { getAllBookings, getAllGuests } from '../db';

export default function CalendarView() {
  const [bookings, setBookings] = useState([]);
  const [guests, setGuests] = useState([]);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setHours(0,0,0,0);
    return d;
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [bData, gData] = await Promise.all([getAllBookings(), getAllGuests()]);
    setBookings(bData.filter(b => b.status !== 'Cancelled' && b.status !== 'No-Show' && b.room));
    setGuests(gData);
  };

  const shiftDate = (days) => {
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() + days);
    setStartDate(newDate);
  };

  const dates = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [startDate]);

  const rooms = useMemo(() => {
    const roomSet = new Set();
    bookings.forEach(b => { if (b.room) roomSet.add(b.room) });
    return Array.from(roomSet).sort();
  }, [bookings]);

  const guestMap = useMemo(() => new Map(guests.map(g => [g.id, g.name])), [guests]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Room Calendar</h1>
          <p className="text-gray-500 mt-1">Visual tape chart of your room availability.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => shiftDate(-7)} className="p-2 border border-gray-300 rounded hover:bg-gray-50"><ChevronLeft size={20}/></button>
          <button onClick={() => setStartDate(new Date(new Date().setHours(0,0,0,0)))} className="px-4 py-2 text-sm font-medium border border-gray-300 rounded hover:bg-gray-50">Today</button>
          <button onClick={() => shiftDate(7)} className="p-2 border border-gray-300 rounded hover:bg-gray-50"><ChevronRight size={20}/></button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg border border-gray-200 overflow-x-auto relative">
        {rooms.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            <CalendarDays size={48} className="mx-auto text-gray-300 mb-3" />
            <p>No rooms with active bookings found.</p>
            <p className="text-sm mt-1">Assign a room to a booking to see it on the calendar.</p>
          </div>
        ) : (
          <table className="w-full border-collapse min-w-[800px]">
            <thead>
              <tr>
                <th className="sticky left-0 bg-slate-50 border-b border-r border-gray-200 p-3 text-left w-32 z-10 font-bold text-gray-700">Room</th>
                {dates.map((d, i) => {
                  const isToday = d.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
                  return (
                    <th key={i} className={`border-b border-gray-200 p-2 min-w-[100px] text-center ${isToday ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50'}`}>
                      <div className={`text-xs font-semibold ${isToday ? 'text-indigo-600' : 'text-gray-500 uppercase'}`}>{d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                      <div className={`text-lg font-bold ${isToday ? 'text-indigo-700' : 'text-gray-800'}`}>{d.getDate()}</div>
                      <div className={`text-xs ${isToday ? 'text-indigo-500' : 'text-gray-400'}`}>{d.toLocaleDateString('en-US', { month: 'short' })}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rooms.map(room => (
                <tr key={room}>
                  <td className="sticky left-0 bg-white border-b border-r border-gray-200 p-3 font-semibold text-gray-800 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    {room}
                  </td>
                  {dates.map((date, i) => {
                    const dateStr = date.toISOString().split('T')[0];
                    // Find if any booking occupies this room on this date
                    const booking = bookings.find(b => {
                      return b.room === room && b.checkIn <= dateStr && b.checkOut > dateStr;
                    });
                    
                    const isStart = booking && booking.checkIn === dateStr;
                    const isEnd = booking && booking.checkOut === dateStr; // Usually check-out day is empty for next check-in

                    if (booking) {
                      const guestName = guestMap.get(booking.guestId) || 'Unknown';
                      return (
                        <td key={i} className={`border-b border-gray-200 p-1 relative`}>
                          <div 
                            className={`h-12 flex items-center px-2 text-xs font-semibold text-white truncate shadow-sm ${booking.status === 'Checked In' ? 'bg-emerald-500' : 'bg-indigo-500'} ${isStart ? 'rounded-l-md ml-1' : ''} ${isEnd ? 'rounded-r-md mr-1' : ''}`}
                            title={`${guestName} (${booking.status})`}
                          >
                            {isStart ? guestName : ''}
                          </div>
                        </td>
                      );
                    }
                    return <td key={i} className="border-b border-r border-gray-100 p-1 bg-white"></td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
