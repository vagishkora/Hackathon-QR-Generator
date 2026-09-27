import React, { useState } from 'react';
import { parseParticipantCSV } from '../../utils/csvParser';
import { adminImportParticipants } from '../../supabase/queries';
import { 
  FileSpreadsheet, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  FileText, 
  Download, 
  Loader2, 
  ArrowRight,
  Sparkles
} from 'lucide-react';

const SAMPLE_CSV_CONTENT = `team,member 1 name,member 1 email,member 1 usn,member 2 name,member 2 email,member 2 usn,college
Byte Busters,Rahul Sharma,rahul.sharma@nmamit.in,4NM23CS101,Ananya Rao,ananya.rao@nmamit.in,4NM23CS102,NMAMIT
Binary Hawks,Aditya Prabhu,aditya.p@nmamit.in,4NM23EC041,Sneha Hegde,sneha.h@nmamit.in,4NM23EC042,NMAMIT
Algo Knights,Kiran Kumar,kiran.k@nmamit.in,4NM23IS015,Rohan Nayak,rohan.n@nmamit.in,4NM23IS016,NMAMIT
Code Wizards,Arjun Pai,arjun.pai@nmamit.in,4NM23AI008,Divya Shetty,divya.s@nmamit.in,4NM23AI009,NMAMIT`;

export function CsvImport() {
  const [csvRawText, setCsvRawText] = useState('');
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [parseSummary, setParseSummary] = useState(null);

  // Handle file drop/upload
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setCsvRawText(content);
        previewCsv(content);
      }
    };
    reader.readAsText(file);
  };

  const previewCsv = (text) => {
    const parsed = parseParticipantCSV(text);
    setParseSummary(parsed);
  };

  const handlePasteChange = (e) => {
    const val = e.target.value;
    setCsvRawText(val);
    setFileName('');
    previewCsv(val);
  };

  const loadSampleCSV = () => {
    setCsvRawText(SAMPLE_CSV_CONTENT);
    setFileName('sample_hackdays_teams_of_2.csv');
    previewCsv(SAMPLE_CSV_CONTENT);
  };

  const handleExecuteImport = async () => {
    if (!parseSummary || parseSummary.validRows.length === 0) {
      alert('No valid rows found in CSV to import.');
      return;
    }

    setIsProcessing(true);
    setImportResult(null);

    try {
      const res = await adminImportParticipants(parseSummary.validRows);
      setImportResult({
        ...res,
        invalidRows: parseSummary.invalidRows,
      });
    } catch (err) {
      alert('Import failed: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <FileSpreadsheet className="w-7 h-7 text-sky-400" />
            Participant & Team CSV Import
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Batch provision approved participants into <code className="text-sky-300 font-mono">HACKDAYS</code>. Supports Teams of 2 or individual rows with USN. Accounts & single-use lunch passes are auto-generated with their <span className="text-amber-300 font-mono">College USN</span> as the password.
          </p>
        </div>

        {/* Upload & Paste Zone */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-300">
              CSV Source File (Supports Team of 2 or Single: team, member 1 name, member 1 email, member 2 name, member 2 email...)
            </span>
            <button
              onClick={loadSampleCSV}
              type="button"
              className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 font-mono font-semibold cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Load Sample Teams of 2 CSV
            </button>
          </div>

          {/* Drag & Drop Area */}
          <label className="border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition bg-slate-900/40">
            <Upload className="w-8 h-8 text-slate-400 mb-2" />
            <span className="text-sm font-semibold text-white">
              {fileName ? fileName : 'Click to select CSV file from your computer'}
            </span>
            <span className="text-xs text-slate-500 font-mono mt-1">
              Supports .csv files with standard comma delimiters
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {/* Paste CSV Directly */}
          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
              Or Paste CSV Raw Text Below:
            </label>
            <textarea
              rows={4}
              value={csvRawText}
              onChange={handlePasteChange}
              placeholder="name,email,team,college&#10;Alex Chen,alex@mit.edu,Quantum,MIT"
              className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Action Trigger */}
          {parseSummary && parseSummary.validRows.length > 0 && (
            <div className="pt-2 flex items-center justify-between">
              <span className="text-xs font-mono text-slate-300">
                Found <strong>{parseSummary.validRows.length}</strong> valid rows ready for verification
              </span>
              <button
                onClick={handleExecuteImport}
                disabled={isProcessing}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs tracking-wide shadow-lg shadow-emerald-500/20 transition flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Committing to Database...
                  </>
                ) : (
                  <>
                    Import into Approved Roster
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* IMPORT RESULTS AUDIT CARDS (Requirement #15: added, existing, invalid)   */}
        {/* ========================================================================= */}
        {importResult && (
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-6 animate-in fade-in">
            <h3 className="text-sm font-mono uppercase tracking-wider text-white border-b border-slate-800 pb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Batch Import Audit Summary
            </h3>

            {/* 3 Metric Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase">Successfully Added</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-2xl font-black text-white mt-1">
                  {importResult.addedCount}
                </p>
                <p className="text-[11px] font-mono opacity-80">New participants pre-approved</p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase">Duplicates Rejected</span>
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                </div>
                <p className="text-2xl font-black text-white mt-1">
                  {importResult.existingCount}
                </p>
                <p className="text-[11px] font-mono opacity-80">Existing emails kept untouched</p>
              </div>

              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase">Invalid / Malformed</span>
                  <XCircle className="w-4 h-4 text-red-400" />
                </div>
                <p className="text-2xl font-black text-white mt-1">
                  {importResult.invalidRows?.length || 0}
                </p>
                <p className="text-[11px] font-mono opacity-80">Failed syntax or missing field</p>
              </div>
            </div>

            {/* Detailed list of duplicates rejected if any */}
            {importResult.alreadyExisting.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-mono text-amber-400 uppercase font-semibold">
                  Duplicate Rows Skipped ({importResult.alreadyExisting.length})
                </h4>
                <div className="max-h-36 overflow-y-auto space-y-1 font-mono text-xs p-2 rounded-xl bg-slate-900 border border-slate-800">
                  {importResult.alreadyExisting.map((dup, idx) => (
                    <div key={idx} className="flex justify-between text-slate-300 text-[11px]">
                      <span>{dup.name} ({dup.email})</span>
                      <span className="text-amber-400">{dup.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detailed list of invalid rows if any */}
            {importResult.invalidRows?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-mono text-red-400 uppercase font-semibold">
                  Invalid Rows Discarded ({importResult.invalidRows.length})
                </h4>
                <div className="max-h-36 overflow-y-auto space-y-1 font-mono text-xs p-2 rounded-xl bg-slate-900 border border-slate-800">
                  {importResult.invalidRows.map((inv, idx) => (
                    <div key={idx} className="flex justify-between text-slate-300 text-[11px]">
                      <span>Row {inv.row}: {inv.raw.slice(0, 30)}...</span>
                      <span className="text-red-400">{inv.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
