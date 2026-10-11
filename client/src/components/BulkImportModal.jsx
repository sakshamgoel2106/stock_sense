import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  Upload, FileSpreadsheet, ClipboardCopy, CheckCircle2, 
  AlertCircle, X, Download, RefreshCw, Layers, ArrowRight
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

const PRODUCT_SAMPLE = [
  {
    "Name": "Industrial Servo Motor 750W",
    "SKU": "ENG-SRV-750",
    "Category": "Engineering",
    "Price": 18500,
    "CostPrice": 13200,
    "LeadTimeDays": 5,
    "SafetyStockDays": 3,
    "MinOrderQuantity": 2,
    "UnitOfMeasure": "Units",
    "ReorderLevel": 10,
    "Description": "High-torque brushless motor for automation cells"
  },
  {
    "Name": "Lithium Battery Pack 48V 24Ah",
    "SKU": "ELEC-BAT-4824",
    "Category": "Electronics",
    "Price": 32000,
    "CostPrice": 24500,
    "LeadTimeDays": 6,
    "SafetyStockDays": 4,
    "MinOrderQuantity": 1,
    "UnitOfMeasure": "Units",
    "ReorderLevel": 5,
    "Description": "Heavy-duty smart BMS pack for AGVs and forklifts"
  },
  {
    "Name": "Cotton Poly Twill Fabric (100m)",
    "SKU": "TEX-TWL-100M",
    "Category": "Textiles",
    "Price": 5400,
    "CostPrice": 3800,
    "LeadTimeDays": 7,
    "SafetyStockDays": 4,
    "MinOrderQuantity": 5,
    "UnitOfMeasure": "Meters",
    "ReorderLevel": 20,
    "Description": "Heavyweight anti-static twill roll"
  }
];

const WAREHOUSE_SAMPLE = [
  {
    "Name": "Pune Chakan Logistics Park",
    "Code": "PUN-01",
    "Location": "Chakan MIDC Phase 2, Pune, Maharashtra",
    "TransitLeadTimeDays": 1,
    "TransferCostPerUnit": 2.5,
    "IsActive": true
  },
  {
    "Name": "Ahmedabad Changodar Hub",
    "Code": "AMD-01",
    "Location": "Changodar Industrial Area, Ahmedabad, Gujarat",
    "TransitLeadTimeDays": 2,
    "TransferCostPerUnit": 3.0,
    "IsActive": true
  },
  {
    "Name": "Kolkata Dankuni Central DC",
    "Code": "CCU-01",
    "Location": "Dankuni Logistics Complex, Kolkata, West Bengal",
    "TransitLeadTimeDays": 3,
    "TransferCostPerUnit": 4.5,
    "IsActive": true
  }
];

export default function BulkImportModal({ isOpen, onClose, entityType = 'products', onSuccess }) {
  if (!isOpen) return null;

  const isProduct = entityType === 'products';
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('excel'); // 'excel' | 'paste'
  const [pasteText, setPasteText] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [importSummary, setImportSummary] = useState(null);

  // Normalize column names regardless of case/format
  const normalizeKeys = (row) => {
    const clean = {};
    for (const key of Object.keys(row)) {
      const normalizedKey = key.trim().toLowerCase().replace(/[\s_-]+/g, '');
      clean[normalizedKey] = row[key];
    }
    return clean;
  };

  const mapToEntity = (raw) => {
    const n = normalizeKeys(raw);

    if (isProduct) {
      const name = n.name || n.productname || n.itemname || n.title || '';
      const sku = (n.sku || n.productcode || n.itemcode || n.code || '').toString().trim().toUpperCase();
      const price = Number(n.price || n.sellingprice || n.amount || n.unitprice || 0);
      const costPrice = Number(n.costprice || n.cost || n.buyprice || price * 0.7);
      const leadTimeDays = Number(n.leadtimedays || n.leadtime || 4);
      const safetyStockDays = Number(n.safetystockdays || n.safetystock || 3);
      const minOrderQuantity = Number(n.minorderquantity || n.moq || n.minorderqty || 1);
      const reorderLevel = Number(n.reorderlevel || n.reorderpoint || 0);
      const category = n.category || 'General';
      const unitOfMeasure = n.unitofmeasure || n.uom || n.unit || 'Units';
      const description = n.description || n.desc || '';

      const errors = [];
      if (!name) errors.push('Name is required');
      if (!sku) errors.push('SKU is required');

      return {
        name,
        sku,
        category,
        price,
        costPrice,
        leadTimeDays,
        safetyStockDays,
        minOrderQuantity,
        unitOfMeasure,
        reorderLevel,
        description,
        isValid: errors.length === 0,
        errors
      };
    } else {
      const name = n.name || n.warehousename || n.facilityname || '';
      const code = (n.code || n.warehousecode || n.hubcode || '').toString().trim().toUpperCase();
      const location = n.location || n.city || n.address || '';
      const transitLeadTimeDays = Number(n.transitleadtimedays || n.transitleadtime || n.leadtime || 1);
      const transferCostPerUnit = Number(n.transfercostperunit || n.transfercost || n.costperunit || 2);
      const isActive = n.isactive !== undefined ? String(n.isactive).toLowerCase() !== 'false' : true;

      const errors = [];
      if (!name) errors.push('Warehouse name is required');
      if (!code) errors.push('Facility code is required');

      return {
        name,
        code,
        location,
        transitLeadTimeDays,
        transferCostPerUnit,
        isActive,
        isValid: errors.length === 0,
        errors
      };
    }
  };

  // 1. Handle File Upload (Excel or CSV)
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawJson = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (rawJson.length === 0) {
          toast.error('The selected file contains no readable data rows');
          return;
        }

        const mapped = rawJson.map(mapToEntity);
        setParsedRows(mapped);
        toast.success(`Parsed ${mapped.length} row(s) from ${file.name}`);
      } catch (err) {
        console.error('File parsing error:', err);
        toast.error('Failed to parse file. Please verify it is a valid Excel or CSV file.');
      }
    };

    reader.readAsBinaryString(file);
  };

  // 2. Handle Paste from Excel / Google Sheets
  const handleParsePaste = () => {
    if (!pasteText.trim()) {
      toast.error('Please paste data into the box first');
      return;
    }

    try {
      let rawJson = [];
      const trimmed = pasteText.trim();

      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        // Parse JSON
        const parsed = JSON.parse(trimmed);
        rawJson = Array.isArray(parsed) ? parsed : [parsed];
      } else {
        // Parse TSV (Excel copy-paste) or CSV
        const lines = trimmed.split(/\r?\n/).filter(line => line.trim().length > 0);
        if (lines.length < 2) {
          toast.error('Please provide at least a header row and 1 data row');
          return;
        }

        const delimiter = lines[0].includes('\t') ? '\t' : ',';
        const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''));

        for (let i = 1; i < lines.length; i++) {
          const cells = lines[i].split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
          const rowObj = {};
          headers.forEach((h, idx) => {
            rowObj[h] = cells[idx] ?? '';
          });
          rawJson.push(rowObj);
        }
      }

      const mapped = rawJson.map(mapToEntity);
      setParsedRows(mapped);
      setFileName('Pasted Data');
      toast.success(`Successfully parsed ${mapped.length} item(s)!`);
    } catch (err) {
      console.error('Paste parse error:', err);
      toast.error('Could not parse text. Ensure headers match the columns or paste valid JSON.');
    }
  };

  // Download Sample Excel Template
  const handleDownloadTemplate = () => {
    const data = isProduct ? PRODUCT_SAMPLE : WAREHOUSE_SAMPLE;
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, isProduct ? "Products" : "Warehouses");

    const templateName = isProduct ? "StockSense_Products_Template.xlsx" : "StockSense_Warehouses_Template.xlsx";
    XLSX.writeFile(wb, templateName);
    toast.success(`Downloaded template: ${templateName}`);
  };

  // Execute Bulk Import API
  const handleImportSubmit = async () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      toast.error('No valid rows available to import. Please check errors.');
      return;
    }

    try {
      setSubmitting(true);
      const endpoint = isProduct ? '/products/bulk' : '/warehouses/bulk';
      const payload = isProduct ? { products: validRows } : { warehouses: validRows };

      const res = await api.post(endpoint, payload);
      setImportSummary(res.data);
      toast.success(res.data.message || 'Bulk import completed!');
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Bulk import failed');
    } finally {
      setSubmitting(false);
    }
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const invalidCount = parsedRows.length - validCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur border border-white/20">
              <Layers size={22} className="text-indigo-200" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold tracking-tight">
                Bulk Import {isProduct ? 'Products (Catalog)' : 'Warehouses (Facilities)'}
              </h3>
              <p className="text-xs text-indigo-200 mt-0.5">
                Upload Excel spreadsheet (.xlsx), CSV, or paste directly from Google Sheets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Success Report Screen (if finished) */}
        {importSummary ? (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-4 my-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
              <CheckCircle2 size={36} />
            </div>
            <h4 className="text-2xl font-black text-gray-900">Bulk Import Complete!</h4>
            <p className="text-sm text-gray-600 max-w-md">
              {importSummary.message}
            </p>
            <div className="grid grid-cols-2 gap-4 w-full max-w-xs pt-2">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-center">
                <span className="text-2xl font-black text-emerald-700">{importSummary.successCount}</span>
                <p className="text-xs font-bold text-emerald-600 uppercase mt-0.5">Successfully Added</p>
              </div>
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 text-center">
                <span className="text-2xl font-black text-amber-700">{importSummary.failedCount}</span>
                <p className="text-xs font-bold text-amber-600 uppercase mt-0.5">Skipped / Failed</p>
              </div>
            </div>

            {importSummary.errors?.length > 0 && (
              <div className="w-full max-w-lg mt-4 text-left bg-gray-50 p-4 rounded-xl border border-gray-200 max-h-36 overflow-y-auto text-xs text-gray-600">
                <p className="font-bold text-gray-900 mb-1">Items Skipped or Errors:</p>
                <ul className="list-disc pl-4 space-y-1">
                  {importSummary.errors.map((e, idx) => (
                    <li key={idx}>Row {e.row}: {e.sku || e.code ? `[${e.sku || e.code}] ` : ''}{e.error}</li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={onClose}
              className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-8 rounded-xl text-sm shadow-md transition-all"
            >
              Done & View Catalog
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* Top Toolbar: Tabs & Download Template */}
            <div className="px-6 py-3 border-b border-gray-200 bg-gray-50/70 flex flex-wrap items-center justify-between gap-3">
              <div className="flex bg-gray-200/80 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setActiveTab('excel')}
                  className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                    activeTab === 'excel'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <FileSpreadsheet size={15} /> Upload Excel / CSV
                </button>
                <button
                  onClick={() => setActiveTab('paste')}
                  className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                    activeTab === 'paste'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <ClipboardCopy size={15} /> Copy-Paste from Sheets
                </button>
              </div>

              <button
                onClick={handleDownloadTemplate}
                className="bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Download size={14} className="text-indigo-600" />
                Download Sample Template (.xlsx)
              </button>
            </div>

            {/* Input Section (when no parsed rows or wanting to switch) */}
            {parsedRows.length === 0 ? (
              <div className="p-6 flex-1 overflow-y-auto">
                {activeTab === 'excel' ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-indigo-200 hover:border-indigo-500 rounded-3xl p-10 flex flex-col items-center justify-center cursor-pointer bg-indigo-50/30 hover:bg-indigo-50/60 transition-all text-center group"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Upload size={32} />
                    </div>
                    <h4 className="text-base font-bold text-gray-900 mb-1">
                      Choose an Excel (.xlsx / .xls) or CSV file
                    </h4>
                    <p className="text-xs text-gray-500 max-w-sm mb-4">
                      Drag and drop your spreadsheet here or click to browse files from your computer.
                    </p>
                    <span className="bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md group-hover:bg-indigo-700 transition-colors">
                      Browse File
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span className="font-bold">Paste Tab-Separated Data or JSON:</span>
                      <span className="text-[11px] text-gray-400">Copy cells in Excel/Google Sheets and Ctrl+V below</span>
                    </div>
                    <textarea
                      rows={8}
                      value={pasteText}
                      onChange={(e) => setPasteText(e.target.value)}
                      placeholder={isProduct 
                        ? "Name\tSKU\tCategory\tPrice\tCostPrice\tLeadTimeDays\nServo Motor\tENG-SRV-10\tEngineering\t18500\t12000\t5"
                        : "Name\tCode\tLocation\tTransitLeadTimeDays\tTransferCostPerUnit\nPune Hub\tPUN-01\tChakan MIDC\t1\t2.5"
                      }
                      className="w-full font-mono text-xs p-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={handleParsePaste}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-5 rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5"
                      >
                        Parse Pasted Rows <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Data Validation & Preview Table */
              <div className="flex-1 flex flex-col overflow-hidden p-6 space-y-4">
                
                {/* Summary Header */}
                <div className="flex items-center justify-between bg-gray-50 p-3.5 rounded-2xl border border-gray-200">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-800">
                      File / Source: <b className="text-indigo-600">{fileName}</b>
                    </span>
                    <span className="text-xs bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full font-bold">
                      {parsedRows.length} Total
                    </span>
                    <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <CheckCircle2 size={13} /> {validCount} Ready
                    </span>
                    {invalidCount > 0 && (
                      <span className="text-xs bg-red-100 text-red-800 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <AlertCircle size={13} /> {invalidCount} Invalid
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setParsedRows([]);
                      setPasteText('');
                      setFileName('');
                    }}
                    className="text-xs text-gray-500 hover:text-indigo-600 flex items-center gap-1 font-semibold"
                  >
                    <RefreshCw size={13} /> Upload Different File
                  </button>
                </div>

                {/* Table View */}
                <div className="flex-1 overflow-auto border border-gray-200 rounded-2xl">
                  <table className="w-full text-left text-xs text-gray-700 divide-y divide-gray-200">
                    <thead className="bg-gray-100/80 sticky top-0 font-bold uppercase text-[10px] text-gray-500 tracking-wider">
                      <tr>
                        <th className="px-4 py-2.5">Status</th>
                        <th className="px-4 py-2.5">{isProduct ? 'SKU' : 'Code'}</th>
                        <th className="px-4 py-2.5">Name</th>
                        {isProduct ? (
                          <>
                            <th className="px-4 py-2.5">Category</th>
                            <th className="px-4 py-2.5 text-right">Price (₹)</th>
                            <th className="px-4 py-2.5 text-right">Cost (₹)</th>
                            <th className="px-4 py-2.5 text-center">Lead Time</th>
                            <th className="px-4 py-2.5 text-center">UOM</th>
                          </>
                        ) : (
                          <>
                            <th className="px-4 py-2.5">Location</th>
                            <th className="px-4 py-2.5 text-center">Transit (Days)</th>
                            <th className="px-4 py-2.5 text-right">Freight (₹/Unit)</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {parsedRows.map((row, idx) => (
                        <tr key={idx} className={row.isValid ? 'hover:bg-gray-50' : 'bg-red-50/40 hover:bg-red-50/70'}>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            {row.isValid ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <CheckCircle2 size={11} /> Valid
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200" title={row.errors.join(', ')}>
                                <AlertCircle size={11} /> {row.errors[0]}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 font-mono font-bold text-gray-900">
                            {isProduct ? row.sku : row.code}
                          </td>
                          <td className="px-4 py-2.5 font-medium text-gray-900">
                            {row.name}
                          </td>
                          {isProduct ? (
                            <>
                              <td className="px-4 py-2.5 text-gray-500">{row.category}</td>
                              <td className="px-4 py-2.5 text-right font-semibold text-gray-900">₹{row.price?.toLocaleString()}</td>
                              <td className="px-4 py-2.5 text-right text-gray-500">₹{row.costPrice?.toLocaleString()}</td>
                              <td className="px-4 py-2.5 text-center text-gray-600">{row.leadTimeDays}d</td>
                              <td className="px-4 py-2.5 text-center text-gray-500">{row.unitOfMeasure}</td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-2.5 text-gray-500">{row.location || '-'}</td>
                              <td className="px-4 py-2.5 text-center text-gray-600">{row.transitLeadTimeDays}d</td>
                              <td className="px-4 py-2.5 text-right font-semibold text-gray-900">₹{row.transferCostPerUnit}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <span className="text-xs text-gray-500">
                    {validCount} ready for database commit.
                  </span>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={validCount === 0 || submitting}
                      onClick={handleImportSubmit}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {submitting ? 'Importing...' : `Import ${validCount} ${isProduct ? 'Products' : 'Warehouses'}`}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
