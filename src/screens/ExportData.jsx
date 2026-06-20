import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, Database, AlertCircle } from 'lucide-react';
import { getAllGuests, getAllBookings, clearAllData } from '../db';

export default function ExportData() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  
  const handleExport = async () => {
    setIsExporting(true);
    setExportComplete(false);
    
    try {
      const [guests, bookings] = await Promise.all([getAllGuests(), getAllBookings()]);
      
      const guestMap = new Map(guests.map(g => [g.id, g]));
      const exportRows = [];

      // Join bookings with guests
      if (bookings.length > 0) {
        for (const b of bookings) {
          const g = guestMap.get(b.guestId) || {};
          exportRows.push({
            'Guest Name': g.name || 'Unknown',
            'Phone': g.phone || '',
            'Email': g.email || '',
            'City': g.city || '',
            'Guest Source': g.source || '',
            'Check-in': b.checkIn || '',
            'Check-out': b.checkOut || '',
            'Room': b.room || '',
            'No. of Guests': b.guestCount || 1,
            'Total Amount': b.amount || 0,
            'Payment Status': b.paymentStatus || '',
            'Booking Status': b.status || '',
            'Booking Notes': b.notes || '',
            'Guest Notes': g.notes || '',
            'Booking Created': b.createdAt ? new Date(b.createdAt).toLocaleDateString() : ''
          });
        }
      }

      // Add guests who have no bookings
      const bookedGuestIds = new Set(bookings.map(b => b.guestId));
      for (const g of guests) {
        if (!bookedGuestIds.has(g.id)) {
          exportRows.push({
            'Guest Name': g.name || 'Unknown',
            'Phone': g.phone || '',
            'Email': g.email || '',
            'City': g.city || '',
            'Guest Source': g.source || '',
            'Check-in': '',
            'Check-out': '',
            'Room': '',
            'No. of Guests': '',
            'Total Amount': '',
            'Payment Status': '',
            'Booking Status': 'No Bookings',
            'Booking Notes': '',
            'Guest Notes': g.notes || '',
            'Booking Created': ''
          });
        }
      }

      if (exportRows.length === 0) {
        alert("No data available to export.");
        setIsExporting(false);
        return;
      }

      const ws = XLSX.utils.json_to_sheet(exportRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Lakeside CRM Backup");
      
      const dateStr = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `lakeside-crm-backup-${dateStr}.xlsx`);
      
      setExportComplete(true);
    } catch (error) {
      console.error("Export failed:", error);
      alert("An error occurred during export.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearData = async () => {
    const confirm1 = window.confirm("WARNING: This will permanently delete all guests and bookings from this browser. Have you exported a backup first?");
    if (confirm1) {
      const confirm2 = window.prompt('Type "DELETE" to confirm clearing all data:');
      if (confirm2 === "DELETE") {
        await clearAllData();
        alert("All data has been cleared.");
        window.location.reload();
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Export & Backup</h1>
        <p className="text-gray-500 mt-1">Export your data to Excel for safekeeping or reporting.</p>
      </div>

      <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-6">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
            <Download className="text-emerald-600" size={24} />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Download Full Backup</h2>
          <p className="text-sm text-gray-500 mb-6 max-w-xl">
            This will generate an Excel (.xlsx) file containing all your guests and their bookings. 
            Because this app stores data locally in your browser, it is highly recommended to 
            download a backup regularly (e.g. at the end of every week).
          </p>
          
          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="bg-emerald-600 text-white px-5 py-2.5 rounded-md font-medium inline-flex items-center hover:bg-emerald-700 transition disabled:opacity-50"
          >
            {isExporting ? 'Generating...' : (
              <>
                <Database size={18} className="mr-2" /> 
                Export to Excel
              </>
            )}
          </button>
          
          {exportComplete && (
            <p className="mt-3 text-sm font-medium text-emerald-600">Export completed successfully!</p>
          )}
        </div>
        
        <div className="bg-slate-50 border-t border-gray-200 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-red-500 mt-0.5 flex-shrink-0" size={20} />
            <div>
              <h3 className="text-sm font-bold text-gray-900">Danger Zone: Clear Local Data</h3>
              <p className="text-xs text-gray-500 mt-1 mb-3">
                Need to start fresh or wipe this device? This action is irreversible. Make sure you have downloaded a backup first.
              </p>
              <button 
                onClick={handleClearData}
                className="text-xs font-semibold text-red-600 border border-red-200 bg-white hover:bg-red-50 px-3 py-1.5 rounded"
              >
                Clear All Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
