import React, { useState, useRef, useMemo, useCallback } from "react";
import * as XLSX from "xlsx";
import { Upload, Search, Users, Trash2, Download, X, ChevronUp, ChevronDown, FileSpreadsheet } from "lucide-react";

function normalizeHeader(h) {
  return String(h || "").trim().toLowerCase().replace(/[\s_]+/g, " ");
}

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

function parseSheetToRecords(workbook) {
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  if (!rows.length) return [];
  const sampleKeys = Object.keys(rows[0]);
  const keyToField = {};
  sampleKeys.forEach((k) => {
    const norm = normalizeHeader(k);
    keyToField[k] = HEADER_MAP[norm] || null;
  });
  return rows.map((row, idx) => {
    const record = {
      id: `row-${idx}-${Date.now()}`,
      name: "", phone: "", email: "", city: "", checkIn: "", checkOut: "",
      room: "", guests: "", amount: "", paymentStatus: "", status: "", source: "", notes: "", _raw: {},
    };
    Object.entries(row).forEach(([key, value]) => {
      const field = keyToField[key];
      record._raw[key] = value;
      if (!field) return;
      if (field === "checkIn" || field === "checkOut") {
        record[field] = excelDateToString(value);
      } else {
        record[field] = value == null ? "" : String(value).trim();
      }
    });
    return record;
  }).filter((r) => r.name || r.phone || r.email);
}

const STATUS_COLORS = {
  inquiry: { bg: "#F1EFE8", text: "#444441" },
  confirmed: { bg: "#E6F1FB", text: "#0C447C" },
  "checked_in": { bg: "#EAF3DE", text: "#27500A" },
  "checked in": { bg: "#EAF3DE", text: "#27500A" },
  "checked_out": { bg: "#F1EFE8", text: "#444441" },
  "checked out": { bg: "#F1EFE8", text: "#444441" },
  cancelled: { bg: "#FCEBEB", text: "#791F1F" },
};

const PAYMENT_COLORS = {
  paid: { bg: "#EAF3DE", text: "#27500A" },
  "fully paid": { bg: "#EAF3DE", text: "#27500A" },
  "fully_paid": { bg: "#EAF3DE", text: "#27500A" },
  pending: { bg: "#FCEBEB", text: "#791F1F" },
  advance: { bg: "#FAEEDA", text: "#633806" },
  "advance paid": { bg: "#FAEEDA", text: "#633806" },
  "advance_paid": { bg: "#FAEEDA", text: "#633806" },
};

function Badge({ label, colorMap }) {
  if (!label) return <span style={{ color: "#888780", fontSize: 13 }}>—</span>;
  const key = label.toLowerCase().trim();
  const c = colorMap[key] || { bg: "#F1EFE8", text: "#444441" };
  return (
    <span style={{ background: c.bg, color: c.text, fontSize: 12, fontWeight: 500, padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap", display: "inline-block" }}>
      {label}
    </span>
  );
}

const tdStyle = { padding: "10px 14px", color: "#2B2B2B", whiteSpace: "nowrap" };

const COLUMNS = [
  { key: "name", label: "Name", minWidth: 160 },
  { key: "phone", label: "Phone", minWidth: 130 },
  { key: "email", label: "Email", minWidth: 180 },
  { key: "room", label: "Room", minWidth: 100 },
  { key: "checkIn", label: "Check-in", minWidth: 110 },
  { key: "checkOut", label: "Check-out", minWidth: 110 },
  { key: "guests", label: "Guests", minWidth: 80 },
  { key: "amount", label: "Amount", minWidth: 100 },
  { key: "paymentStatus", label: "Payment", minWidth: 110 },
  { key: "status", label: "Status", minWidth: 110 },
  { key: "source", label: "Source", minWidth: 110 },
];

export default function CustomerCRM() {
  const [records, setRecords] = useState([]);
  const [fileName, setFileName] = useState("");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const fileInputRef = useRef(null);

  const handleFile = useCallback((file) => {
    if (!file) return;
    setError("");
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array", cellDates: false });
        const parsed = parseSheetToRecords(workbook);
        if (!parsed.length) {
          setError("No usable rows found. Make sure the sheet has a Name, Phone, or Email column with data.");
          return;
        }
        setRecords(parsed);
        setFileName(file.name);
      } catch (err) {
        setError("Could not read this file. Please upload a valid .xlsx or .xls file.");
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const onFileInputChange = (e) => {
    const file = e.target.files?.[0];
    handleFile(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  };

  const filtered = useMemo(() => {
    let result = records;
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((r) =>
        [r.name, r.phone, r.email, r.city, r.room, r.source, r.status, r.notes]
          .some((v) => String(v || "").toLowerCase().includes(q))
      );
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const av = String(a[sortKey] || "").toLowerCase();
        const bv = String(b[sortKey] || "").toLowerCase();
        if (av < bv) return sortDir === "asc" ? -1 : 1;
        if (av > bv) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [records, search, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const clearAll = () => {
    setRecords([]);
    setFileName("");
    setSearch("");
    setSelected(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const exportFiltered = () => {
    const exportRows = filtered.map((r) => ({
      Name: r.name, Phone: r.phone, Email: r.email, City: r.city, Room: r.room,
      "Check-in": r.checkIn, "Check-out": r.checkOut, Guests: r.guests, Amount: r.amount,
      "Payment Status": r.paymentStatus, Status: r.status, Source: r.source, Notes: r.notes,
    }));
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customers");
    XLSX.writeFile(wb, "lakeside-customers-export.xlsx");
  };

  return (
    <div style={{ fontFamily: "Arial, Helvetica, sans-serif", background: "#FAFAF8", minHeight: "100vh", padding: "24px 20px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "#0F6E56", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Users size={20} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "#1F3A5F" }}>Lakeside Farm &amp; Resort</h1>
              <p style={{ fontSize: 13, color: "#5B6770", margin: 0 }}>Customer records</p>
            </div>
          </div>
          {records.length > 0 && (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={exportFiltered} style={btnStyle("#fff", "#1F3A5F", "1px solid #D8DEE2")}>
                <Download size={15} style={{ marginRight: 6, verticalAlign: -3 }} />
                Export
              </button>
              <button onClick={clearAll} style={btnStyle("#fff", "#B0413E", "1px solid #F0C4C4")}>
                <Trash2 size={15} style={{ marginRight: 6, verticalAlign: -3 }} />
                Clear data
              </button>
            </div>
          )}
        </div>

        {records.length === 0 && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            style={{ border: `2px dashed ${dragOver ? "#0F6E56" : "#D8DEE2"}`, borderRadius: 14, background: dragOver ? "#EFF7F4" : "#fff", padding: "56px 24px", textAlign: "center", transition: "all 0.15s ease" }}
          >
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#EFF4F3", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <FileSpreadsheet size={26} color="#2E7D7B" />
            </div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "#1F3A5F", margin: "0 0 6px" }}>Upload your guest list</h2>
            <p style={{ fontSize: 14, color: "#5B6770", margin: "0 0 20px", maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>
              Drop your Excel file here, or click below to choose a file. Works with .xlsx and .xls — column names like Name, Phone, Check-in, Room etc. are matched automatically.
            </p>
            <button onClick={() => fileInputRef.current?.click()} style={{ background: "#0F6E56", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Upload size={16} />
              Choose Excel file
            </button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={onFileInputChange} style={{ display: "none" }} />
            {error && <p style={{ color: "#B0413E", fontSize: 13, marginTop: 16 }}>{error}</p>}
          </div>
        )}

        {records.length > 0 && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
              <StatCard label="Total customers" value={records.length} />
              <StatCard label="Showing" value={filtered.length} />
              <StatCard label="File" value={fileName} small />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ position: "relative", flex: 1 }}>
                <Search size={16} color="#888780" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, phone, email, room, source..."
                  style={{ width: "100%", padding: "10px 12px 10px 36px", borderRadius: 8, border: "1px solid #D8DEE2", fontSize: 14, boxSizing: "border-box", outline: "none", background: "#fff" }}
                />
                {search && (
                  <button onClick={() => setSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
                    <X size={14} color="#888780" />
                  </button>
                )}
              </div>
              <button onClick={() => fileInputRef.current?.click()} style={btnStyle("#fff", "#1F3A5F", "1px solid #D8DEE2")}>
                <Upload size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
                Replace file
              </button>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={onFileInputChange} style={{ display: "none" }} />
            </div>

            {error && <p style={{ color: "#B0413E", fontSize: 13, marginBottom: 10 }}>{error}</p>}

            <div style={{ background: "#fff", border: "1px solid #E5E5E0", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#1F3A5F" }}>
                      {COLUMNS.map((col) => (
                        <th key={col.key} onClick={() => toggleSort(col.key)} style={{ textAlign: "left", padding: "10px 14px", color: "#fff", fontWeight: 600, fontSize: 12.5, cursor: "pointer", userSelect: "none", minWidth: col.minWidth, whiteSpace: "nowrap" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                            {col.label}
                            {sortKey === col.key && (sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={COLUMNS.length} style={{ padding: "32px 14px", textAlign: "center", color: "#888780" }}>
                          No customers match your search.
                        </td>
                      </tr>
                    )}
                    {filtered.map((r, i) => (
                      <tr
                        key={r.id}
                        onClick={() => setSelected(r)}
                        style={{ background: i % 2 === 0 ? "#fff" : "#F9F9F7", cursor: "pointer", borderTop: "1px solid #EFEFEA" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#F0F6F4")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#F9F9F7")}
                      >
                        <td style={tdStyle}><strong>{r.name || "—"}</strong></td>
                        <td style={tdStyle}>{r.phone || "—"}</td>
                        <td style={tdStyle}>{r.email || "—"}</td>
                        <td style={tdStyle}>{r.room || "—"}</td>
                        <td style={tdStyle}>{r.checkIn || "—"}</td>
                        <td style={tdStyle}>{r.checkOut || "—"}</td>
                        <td style={tdStyle}>{r.guests || "—"}</td>
                        <td style={tdStyle}>{r.amount ? `₹${r.amount}` : "—"}</td>
                        <td style={tdStyle}><Badge label={r.paymentStatus} colorMap={PAYMENT_COLORS} /></td>
                        <td style={tdStyle}><Badge label={r.status} colorMap={STATUS_COLORS} /></td>
                        <td style={tdStyle}>{r.source || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <p style={{ fontSize: 12, color: "#888780", marginTop: 12, textAlign: "center" }}>
              Data is stored only in this browser tab for now. Refreshing the page will clear it — export to Excel to save your work.
            </p>
          </>
        )}
      </div>

      {selected && (
        <div onClick={() => setSelected(null)} style={{ position: "fixed", inset: 0, background: "rgba(31,58,95,0.35)", display: "flex", justifyContent: "flex-end", zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 360, maxWidth: "90vw", background: "#fff", height: "100%", padding: 24, overflowY: "auto", boxShadow: "-4px 0 16px rgba(0,0,0,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1F3A5F", margin: 0 }}>{selected.name || "Unnamed guest"}</h2>
                <p style={{ fontSize: 13, color: "#5B6770", margin: "4px 0 0" }}>{selected.phone}</p>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <X size={18} color="#5B6770" />
              </button>
            </div>
            <DetailRow label="Email" value={selected.email} />
            <DetailRow label="City" value={selected.city} />
            <DetailRow label="Room" value={selected.room} />
            <DetailRow label="Check-in" value={selected.checkIn} />
            <DetailRow label="Check-out" value={selected.checkOut} />
            <DetailRow label="Guests" value={selected.guests} />
            <DetailRow label="Amount" value={selected.amount ? `₹${selected.amount}` : ""} />
            <DetailRow label="Payment status" value={selected.paymentStatus} />
            <DetailRow label="Booking status" value={selected.status} />
            <DetailRow label="Source" value={selected.source} />
            {selected.notes && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #EFEFEA" }}>
                <p style={{ fontSize: 12, color: "#888780", margin: "0 0 4px", fontWeight: 600 }}>NOTES</p>
                <p style={{ fontSize: 14, color: "#2B2B2B", margin: 0, lineHeight: 1.5 }}>{selected.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, small }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #E5E5E0", borderRadius: 10, padding: "12px 16px" }}>
      <p style={{ fontSize: 12, color: "#888780", margin: "0 0 4px", fontWeight: 600 }}>{label.toUpperCase()}</p>
      <p style={{ fontSize: small ? 13 : 20, fontWeight: 700, color: "#1F3A5F", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</p>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F4F4F1", fontSize: 13.5 }}>
      <span style={{ color: "#888780" }}>{label}</span>
      <span style={{ color: "#2B2B2B", fontWeight: 500, textAlign: "right" }}>{value || "—"}</span>
    </div>
  );
}

function btnStyle(bg, color, border) {
  return { background: bg, color, border, borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center" };
}
