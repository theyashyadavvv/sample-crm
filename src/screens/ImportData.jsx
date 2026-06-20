import React, { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, Check, AlertTriangle, Info } from 'lucide-react';
import { addGuest, addBooking, getAllGuests } from '../db';

const HEADER_MAP = {
  "name": "name", "full name": "name", "guest name": "name", "customer name": "name",
  "phone": "phone", "phone number": "phone", "mobile": "phone", "mobile number": "phone", "contact": "phone", "contact number": "phone",
  "email": "email", "email id": "email", "email address": "email",
  "city": "city", "location": "city", "address": "city",
  "check in": "checkIn", "check-in": "checkIn", "checkin": "checkIn", "check in date": "checkIn", "arrival": "checkIn", "arrival date": "checkIn",
  "check out": "checkOut", "check-out": "checkOut", "checkout": "checkOut", "check out date": "checkOut", "departure": "checkOut", "departure date": "checkOut",
  "room": "room", "room type": "room", "room no": "room", "room number": "room",
  "guests": "guests", "no of guests": "guests", "number of guests": "guests", "pax": "guests",
  "amount": "amount", "total amount": "amount", "price": "amount", "total": "amount",
  "payment status": "paymentStatus", "payment": "paymentStatus",
  "status": "status", "booking status": "status",
  "source": "source", "booking source": "source",
  "notes": "notes", "remarks": "notes", "comment": "notes",
};

function normalizeHeader(h) {
  return String(h || "").trim().toLowerCase().replace(/[\s_]+/g, " ");
}

function excelDateToString(val) {
  if (val == null || val === "") return "";
  if (typeof val === "number") {
    const d = XLSX.SSF.parse_date_code(val);
    if (d) {
      const mm = String(d.m).padStart(2, "0");
      const dd = String(d.d).padStart(2, "0");
      return `${d.y}-${mm}-${dd}`;
    }
  }
  return String(val).trim();
}

function mapStatus(raw) {
  const s = String(raw || '').toLowerCase().trim();
  if (s.includes('inquiry')) return 'Inquiry';
  if (s.includes('confirm')) return 'Confirmed';
  if (s.includes('check') && s.includes('in')) return 'Checked In';
  if (s.includes('check') && s.includes('out')) return 'Checked Out';
  if (s.includes('cancel')) return 'Cancelled';
  return 'Confirmed'; // default
}

function mapPaymentStatus(raw) {
  const s = String(raw || '').toLowerCase().trim();
  if (s.includes('advance')) return 'Advance Paid';
  if (s.includes('full') || s === 'paid') return 'Fully Paid';
  return 'Pending';
}

export default function ImportData() {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const [previewData, setPreviewData] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = useCallback((file) => {
    if (!file) return;
    setError("");
    setImportSuccess(false);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array", cellDates: false });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        
        if (!rows.length) {
          setError("No usable rows found. Make sure the sheet has a Name or Phone column with data.");
          return;
        }

        const sampleKeys = Object.keys(rows[0]);
        const keyToField = {};
        sampleKeys.forEach((k) => {
          const norm = normalizeHeader(k);
          keyToField[k] = HEADER_MAP[norm] || null;
        });

        const parsed = rows.map((row) => {
          const record = {
            name: "", phone: "", email: "", city: "", source: "", notes: "", // Guest info
            checkIn: "", checkOut: "", room: "", guests: 1, amount: 0, paymentStatus: "Pending", status: "Confirmed", bookingNotes: "" // Booking info
          };
          
          Object.entries(row).forEach(([key, value]) => {
            const field = keyToField[key];
            if (!field) return;
            
            if (field === "checkIn" || field === "checkOut") {
              record[field] = excelDateToString(value);
            } else if (field === "status") {
              record[field] = mapStatus(value);
            } else if (field === "paymentStatus") {
              record.paymentStatus = mapPaymentStatus(value);
            } else if (field === "amount") {
              record.amount = parseFloat(value) || 0;
            } else if (field === "guests") {
              record.guests = parseInt(value, 10) || 1;
            } else {
              if (field === "notes") record.bookingNotes = value == null ? "" : String(value).trim();
              else record[field] = value == null ? "" : String(value).trim();
            }
          });
          return record;
        }).filter((r) => r.name || r.phone || r.email);

        if (!parsed.length) {
           setError("No matching columns found. Ensure headers like Name, Phone, Check-in, etc. exist.");
        } else {
           setPreviewData(parsed);
        }
      } catch (err) {
        setError("Could not read this file. Please upload a valid .xlsx or .xls file.");
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const onFileInputChange = (e) => {
    handleFile(e.target.files?.[0]);
  };

  const commitImport = async () => {
    setIsImporting(true);
    try {
      const existingGuests = await getAllGuests();
      const phoneMap = new Map(existingGuests.filter(g => g.phone).map(g => [g.phone, g.id]));

      for (const row of previewData) {
        let guestId = null;
        // Simple deduplication by phone
        if (row.phone && phoneMap.has(row.phone)) {
          guestId = phoneMap.get(row.phone);
        } else {
          // Create new guest
          const newGuest = await addGuest({
            name: row.name || 'Unknown',
            phone: row.phone || '',
            email: row.email || '',
            city: row.city || '',
            source: row.source || '',
            notes: row.notes || ''
          });
          guestId = newGuest.id;
          if (row.phone) phoneMap.set(row.phone, guestId);
        }

        // Create booking if dates exist
        if (row.checkIn || row.checkOut || row.room) {
          await addBooking({
            guestId,
            room: row.room,
            checkIn: row.checkIn || new Date().toISOString().split('T')[0],
            checkOut: row.checkOut || new Date().toISOString().split('T')[0],
            guestCount: row.guests,
            amount: row.amount,
            paymentStatus: row.paymentStatus,
            status: row.status,
            notes: row.bookingNotes
          });
        }
      }
      setImportSuccess(true);
      setPreviewData([]);
    } catch (err) {
      setError("Import failed. Check console for details.");
      console.error(err);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import from Excel</h1>
        <p className="text-gray-500 mt-1">Upload your existing guest or booking list to populate the CRM.</p>
      </div>

      {importSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-4 flex items-start">
          <Check className="mt-0.5 mr-3 flex-shrink-0 text-emerald-600" />
          <div>
            <h3 className="font-semibold">Import Successful!</h3>
            <p className="text-sm mt-1">Your data has been saved to the local database.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 flex items-start">
          <AlertTriangle className="mt-0.5 mr-3 flex-shrink-0 text-red-600" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {!previewData.length && !importSuccess && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]); }}
          className={`border-2 border-dashed rounded-xl p-10 text-center transition ${dragOver ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 bg-white'}`}
        >
          <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
            <FileSpreadsheet className="text-indigo-600" size={32} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Drop your Excel file here</h3>
          <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
            Works with .xlsx and .xls. We'll automatically match column headers like Name, Phone, Check-in, Room, etc.
          </p>
          <button 
            onClick={() => fileInputRef.current?.click()} 
            className="bg-slate-900 text-white px-5 py-2.5 rounded-md font-medium inline-flex items-center hover:bg-slate-800 transition"
          >
            <Upload size={18} className="mr-2" /> Select File
          </button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={onFileInputChange} className="hidden" />
          
          <div className="mt-8 bg-blue-50 text-blue-800 text-xs p-3 rounded text-left max-w-xl mx-auto flex gap-3 items-start">
            <Info size={16} className="mt-0.5 flex-shrink-0" />
            <p><strong>Tip:</strong> If a row has no check-in/out dates, it will just be added as a guest. If dates are present, a booking will be created automatically.</p>
          </div>
        </div>
      )}

      {previewData.length > 0 && (
        <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Preview Data</h2>
              <p className="text-sm text-gray-500">Found {previewData.length} valid rows to import.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setPreviewData([])} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
              <button 
                onClick={commitImport} 
                disabled={isImporting}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50 flex items-center"
              >
                {isImporting ? 'Importing...' : 'Commit Import'}
              </button>
            </div>
          </div>
          <div className="overflow-x-auto max-h-[500px]">
            <table className="min-w-full divide-y divide-gray-200 relative">
              <thead className="bg-slate-100 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Guest Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Dates</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Room</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {previewData.slice(0, 100).map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">{row.name || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{row.phone || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {row.checkIn ? `${row.checkIn} → ${row.checkOut}` : 'No dates'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{row.room || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">{row.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {previewData.length > 100 && (
              <div className="p-3 text-center text-sm text-gray-500 border-t border-gray-200 bg-gray-50">
                Showing first 100 rows. {previewData.length - 100} more will be imported.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
