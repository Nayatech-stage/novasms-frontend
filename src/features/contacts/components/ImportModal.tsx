import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Check, AlertCircle, Loader2, FileSpreadsheet } from 'lucide-react';
import { useCsvParser } from '../hooks/useCsvParser';
import { useAuthStore } from '@/stores/authStore';
import api from '@/api/axios';
import type { ImportMapping, ImportReport } from '../types/contact';

type ImportModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (report: ImportReport) => void;
};

type ParsedImportData = {
  headers: string[];
  rows: Record<string, unknown>[];
  preview: Record<string, unknown>[];
};

const EXCEL_EXTENSIONS = ['xls', 'xlsx'];

export default function ImportModal({ isOpen, onClose, onImportComplete }: ImportModalProps) {
  const { t } = useTranslation();
  const { accessToken } = useAuthStore();
  const { parseFile } = useCsvParser();

  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedImportData | null>(null);
  const [mapping, setMapping] = useState<ImportMapping>({});
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'progress' | 'report'>(
    'upload',
  );
  const [report, setReport] = useState<ImportReport | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [processingJob, setProcessingJob] = useState(false);
  const [liveStats, setLiveStats] = useState<{
    current: number;
    total: number;
    percentage: number;
    success: number;
    duplicates: number;
    errors: number;
    invalidPhones: number;
  } | null>(null);

  // Champs NovaSMS attendus
  const targetFields = [
    { key: 'email', label: 'Email', required: false },
    { key: 'phone', label: 'Téléphone', required: false },
    { key: 'firstName', label: 'Prénom', required: false },
    { key: 'lastName', label: 'Nom', required: false },
    { key: 'location', label: 'Localisation', required: false },
    { key: 'tags', label: 'Tags', required: false },
  ];

  const handleClose = useCallback(() => {
    setFile(null);
    setParsedData(null);
    setMapping({});
    setError(null);
    setStep('upload');
    setReport(null);
    setUploadProgress(0);
    setCurrentChunk(0);
    setTotalChunks(0);
    setProcessingJob(false);
    setLiveStats(null);
    onClose();
  }, [onClose]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const ext = selectedFile.name.split('.').pop()?.toLowerCase() ?? '';
    const isExcel = EXCEL_EXTENSIONS.includes(ext);
    const isCsv = ext === 'csv' || selectedFile.type === 'text/csv';

    if (!isExcel && !isCsv) {
      setError('Format non supporté. Utilisez CSV, XLS ou XLSX.');
      return;
    }

    if (selectedFile.size > 50 * 1024 * 1024) {
      setError('Fichier trop volumineux. Maximum 50 Mo.');
      return;
    }

    setFile(selectedFile);
    setError(null);

    if (isExcel) {
      // Envoyer le fichier au backend pour parsing Excel
      try {
        const formData = new FormData();
        formData.append('file', selectedFile);
        const res = await api.post<{
          headers: string[];
          rows: Record<string, unknown>[];
          preview: Record<string, unknown>[];
          totalRows: number;
        }>('/contacts/import/parse-excel', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (res.data.totalRows === 0) {
          setError('Le fichier est vide ou ne contient pas de données.');
          return;
        }
        setParsedData({
          headers: res.data.headers,
          rows: res.data.rows,
          preview: res.data.preview,
        });
        setStep('mapping');
      } catch (err: unknown) {
        const e = err as { response?: { data?: { message?: string } } };
        setError(e.response?.data?.message ?? 'Impossible de lire le fichier Excel.');
      }
      return;
    }

    // CSV → papaparse
    const result = await parseFile(selectedFile);
    if (result.error) {
      setError(result.error);
      return;
    }
    setParsedData({ headers: result.headers, rows: result.rows, preview: result.preview });
    setStep('mapping');
  };

  const handleMappingChange = (targetField: string, sourceColumn: string) => {
    setMapping((prev) => ({ ...prev, [targetField]: sourceColumn }));
  };

  /** Applique le mapping CSV→champs NovaSMS sur une ligne brute */
  const applyMapping = (row: Record<string, unknown>): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    for (const [targetField, sourceCol] of Object.entries(mapping)) {
      if (!sourceCol) continue;
      const value = row[sourceCol];
      if (value === undefined || value === null || value === '') continue;
      if (targetField === 'tags') {
        result.tags = String(value)
          .split(/[,;|]/)
          .map((x) => x.trim())
          .filter(Boolean);
      } else {
        result[targetField] = typeof value === 'string' ? value.trim() : String(value).trim();
      }
    }
    return result;
  };

  const handleStartImport = async () => {
    if (!file || !parsedData || !accessToken) return;

    const hasIdentityMapping = Boolean(mapping.email || mapping.phone);
    if (!hasIdentityMapping) {
      setError("Mappez au moins Email ou Téléphone avant de lancer l'import.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Si gros fichier, utiliser upload par chunks (évite OOM / large payloads)
      const CHUNK_THRESHOLD = 5000; // lignes au-dessus desquelles on chunk
      const CHUNK_SIZE = 500; // 500 lignes × ~300 octets ≈ 150 Ko < limite 10 Mo

      if (parsedData.rows.length > CHUNK_THRESHOLD) {
        // Calculer le nombre de chunks
        const numChunks = Math.ceil(parsedData.rows.length / CHUNK_SIZE);
        setTotalChunks(numChunks);
        setStep('progress');

        // 1) Demander un fileId
        const startRes = await api.post(
          '/contacts/import/start',
          { fileName: file.name },
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        const fileId = startRes.data.fileId;

        // 2) Envoyer les chunks séquentiellement avec mapping appliqué
        for (let i = 0; i < parsedData.rows.length; i += CHUNK_SIZE) {
          const chunk = parsedData.rows
            .slice(i, i + CHUNK_SIZE)
            .map(applyMapping)
            .filter((r) => r.email || r.phone);
          await api.post(
            '/contacts/import/chunk',
            { fileId, rows: chunk },
            { headers: { Authorization: `Bearer ${accessToken}` } },
          );

          // Mettre à jour la progression
          const chunkNum = Math.floor(i / CHUNK_SIZE) + 1;
          setCurrentChunk(chunkNum);
          setUploadProgress(Math.round((chunkNum / numChunks) * 100));
        }

        // 3) Déclencher le job BullMQ (retour immédiat avec jobId)
        setUploadProgress(95);
        const completeRes = await api.post(
          '/contacts/import/complete',
          { fileId, fileName: file.name },
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        const jobId: string = completeRes.data.jobId;

        // 4) Polling du statut jusqu'à completion (toutes les 2s, timeout 5min)
        setProcessingJob(true);
        await new Promise<void>((resolve, reject) => {
          const POLL_INTERVAL = 2000;
          const TIMEOUT_MS = 5 * 60 * 1000;
          let elapsed = 0;

          const interval = setInterval(() => {
            elapsed += POLL_INTERVAL;
            void (async () => {
              try {
                const statusRes = await api.get<{
                  success: boolean;
                  status: string;
                  progress?: {
                    current: number;
                    total: number;
                    percentage: number;
                    success: number;
                    duplicates: number;
                    errors: number;
                    invalidPhones: number;
                  };
                  report?: {
                    totalRecords: number;
                    successCount: number;
                    duplicateCount: number;
                    errorCount: number;
                  };
                }>(`/contacts/import/${jobId}`, {
                  headers: { Authorization: `Bearer ${accessToken}` },
                });

                // Mettre à jour les stats temps réel si disponibles
                if (statusRes.data.progress) {
                  setLiveStats(statusRes.data.progress);
                  const pct = statusRes.data.progress.percentage;
                  if (pct > 0) setUploadProgress(Math.min(pct, 99));
                }

                if (statusRes.data.status === 'completed') {
                  clearInterval(interval);
                  setUploadProgress(100);
                  setProcessingJob(false);
                  const r = statusRes.data.report;
                  const importedReport: ImportReport = {
                    jobId,
                    fileName: file.name,
                    totalRecords: r?.totalRecords ?? parsedData.rows.length,
                    successCount: r?.successCount ?? 0,
                    duplicateCount: r?.duplicateCount ?? 0,
                    errorCount: r?.errorCount ?? 0,
                    status: 'completed',
                  };
                  setReport(importedReport);
                  onImportComplete(importedReport);
                  setStep('report');
                  resolve();
                } else if (statusRes.data.status === 'failed') {
                  clearInterval(interval);
                  setProcessingJob(false);
                  reject(new Error("L'import a échoué côté serveur. Veuillez réessayer."));
                } else if (elapsed >= TIMEOUT_MS) {
                  clearInterval(interval);
                  setProcessingJob(false);
                  reject(new Error('Délai de traitement dépassé (5 min). Vérifiez les imports.'));
                }
              } catch {
                // erreur réseau passagère — on continue de poller
              }
            })();
          }, POLL_INTERVAL);
        });
      } else {
        // Petit fichier: comportement existant (POST unique)
        setStep('progress');
        setTotalChunks(1);
        setCurrentChunk(0);
        setUploadProgress(50);

        const response = await api.post(
          '/contacts/import',
          {
            fileName: file.name,
            mapping,
            rows: parsedData.rows,
          },
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        );

        setUploadProgress(100);

        if (response.data.success) {
          setStep('report');
          // Utiliser les stats du rapport retourné par le backend
          const importedReport: ImportReport = {
            jobId: response.data.jobId,
            fileName: file.name,
            totalRecords: response.data.report?.totalRecords || parsedData.rows.length,
            successCount: response.data.report?.successCount || 0,
            duplicateCount: response.data.report?.duplicateCount || 0,
            errorCount: response.data.report?.errorCount || 0,
            status: 'completed',
          };

          setReport(importedReport);
          onImportComplete(importedReport);
        }
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || "Erreur lors de l'import");
    } finally {
      setIsUploading(false);
    }
  };

  // Auto-close le modal après 3 secondes quand l'import est complété
  useEffect(() => {
    if (report?.status === 'completed') {
      const timer = setTimeout(() => {
        handleClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [report?.status, handleClose]);

  if (!isOpen) return null;

  const STEPS = [
    { id: 'upload', label: t('importModal.stepFile'), num: 1 },
    { id: 'mapping', label: t('importModal.stepMapping'), num: 2 },
    { id: 'progress', label: t('importModal.stepImport'), num: 3 },
    { id: 'report', label: t('importModal.stepResult'), num: 4 },
  ] as const;

  const stepIndex = ['upload', 'mapping', 'preview', 'progress', 'report'].indexOf(step);
  const displayIndex = stepIndex > 2 ? stepIndex - 1 : stepIndex; // collapse preview into mapping

  const ext = file?.name.split('.').pop()?.toLowerCase() ?? '';
  const isExcel = ['xls', 'xlsx'].includes(ext);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(10,20,30,0.6)', backdropFilter: 'blur(6px)' }}
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.93, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.93, opacity: 0, y: 16 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Bande de couleur top ── */}
          <div
            style={{ height: 4, background: 'linear-gradient(90deg,#2ec80a,#0a8c6e,#0c5460)' }}
          />

          {/* ── Header ── */}
          <div className="flex items-center justify-between px-4 sm:px-7 pt-4 sm:pt-5 pb-3 sm:pb-4">
            <div className="flex items-center gap-3">
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg,#edfce8,#d1fae5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileSpreadsheet className="w-5 h-5" style={{ color: '#0c5460' }} />
              </div>
              <div>
                <h3 className="font-bold text-on-surface" style={{ fontSize: 15 }}>
                  {t('importModal.title')}
                </h3>
                <p className="text-xs text-on-surface-variant">{t('importModal.subtitle')}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-xl hover:bg-surface-container transition-colors"
            >
              <X className="w-4 h-4 text-on-surface-variant" />
            </button>
          </div>

          {/* ── Step indicator ── */}
          {step !== 'progress' && step !== 'report' && (
            <div className="px-4 sm:px-7 pb-3 sm:pb-4">
              <div className="flex items-center gap-0">
                {STEPS.slice(0, 3).map((s, i) => {
                  const done = displayIndex > i;
                  const active = displayIndex === i;
                  return (
                    <div key={s.id} className="flex items-center flex-1 last:flex-none">
                      <div className="flex flex-col items-center gap-1">
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            background: done
                              ? '#2ec80a'
                              : active
                                ? '#0c5460'
                                : 'var(--surface-container)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                            border: active
                              ? '2px solid #0c5460'
                              : done
                                ? '2px solid #2ec80a'
                                : '2px solid var(--outline-variant)',
                          }}
                        >
                          {done ? (
                            <Check className="w-3.5 h-3.5 text-white" />
                          ) : (
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: active ? 'white' : 'var(--on-surface-variant)',
                              }}
                            >
                              {s.num}
                            </span>
                          )}
                        </div>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: active
                              ? '#0c5460'
                              : done
                                ? '#2ec80a'
                                : 'var(--on-surface-variant)',
                          }}
                        >
                          {s.label}
                        </span>
                      </div>
                      {i < 2 && (
                        <div
                          style={{
                            flex: 1,
                            height: 2,
                            margin: '0 6px',
                            marginBottom: 16,
                            background: done ? '#2ec80a' : 'var(--outline-variant)',
                            borderRadius: 2,
                            transition: 'background 0.3s',
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Content ── */}
          <div
            className="import-modal-content-px px-4 sm:px-7 pb-2"
            style={{ maxHeight: '60vh', overflowY: 'auto' }}
          >
            {/* STEP 1 — Upload */}
            {step === 'upload' && (
              <div className="space-y-4 pb-2">
                <input
                  type="file"
                  accept=".csv,.xls,.xlsx"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-input"
                />
                <label htmlFor="file-input" className="block cursor-pointer">
                  <div
                    style={{
                      border: '2.5px dashed',
                      borderColor: file ? '#2ec80a' : '#cbd5e1',
                      borderRadius: 20,
                      padding: '36px 24px',
                      textAlign: 'center',
                      background: file ? '#f0fdf4' : '#f8fafc',
                      transition: 'all 0.2s',
                    }}
                  >
                    {file ? (
                      <div className="space-y-3">
                        <div
                          style={{
                            width: 52,
                            height: 52,
                            borderRadius: 14,
                            background: 'linear-gradient(135deg,#2ec80a20,#2ec80a40)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto',
                          }}
                        >
                          <FileSpreadsheet className="w-7 h-7" style={{ color: '#0c5460' }} />
                        </div>
                        <div>
                          <p className="font-bold text-on-surface" style={{ fontSize: 14 }}>
                            {file.name}
                          </p>
                          <p className="text-xs text-on-surface-variant mt-1">
                            {(file.size / 1024).toFixed(0)} Ko · {t('importModal.readingFile')}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div
                          style={{
                            width: 56,
                            height: 56,
                            borderRadius: 16,
                            background: '#f1f5f9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto',
                          }}
                        >
                          <Upload className="w-7 h-7 text-on-surface-variant" />
                        </div>
                        <div>
                          <p className="font-bold text-on-surface" style={{ fontSize: 14 }}>
                            {t('importModal.dragDrop')}
                          </p>
                          <p className="text-sm text-on-surface-variant mt-1">
                            {t('importModal.browse')}
                          </p>
                        </div>
                        <div className="flex justify-center gap-2 pt-1">
                          {['CSV', 'XLS', 'XLSX'].map((fmt) => (
                            <span
                              key={fmt}
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: '3px 10px',
                                borderRadius: 20,
                                background: '#e2e8f0',
                                color: '#475569',
                                letterSpacing: '0.05em',
                              }}
                            >
                              {fmt}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </label>

                {/* Infos limites */}
                <div
                  style={{
                    display: 'flex',
                    gap: 12,
                    padding: '12px 16px',
                    borderRadius: 12,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  {[
                    { icon: '📋', label: t('importModal.formats'), value: 'CSV, XLS, XLSX' },
                    { icon: '📊', label: t('importModal.maxRows'), value: '50 000' },
                    { icon: '💾', label: t('importModal.maxSize'), value: '50 Mo' },
                  ].map((info) => (
                    <div key={info.label} className="flex-1 text-center">
                      <div style={{ fontSize: 16 }}>{info.icon}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>
                        {info.label}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                        {info.value}
                      </div>
                    </div>
                  ))}
                </div>

                {error && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 14px',
                      borderRadius: 12,
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                    }}
                  >
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span style={{ fontSize: 13, color: '#dc2626' }}>{error}</span>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2 — Mapping */}
            {(step === 'mapping' || step === 'preview') && parsedData && (
              <div className="space-y-5 pb-2">
                {/* Info fichier */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 16px',
                    borderRadius: 12,
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                  }}
                >
                  <FileSpreadsheet className="w-5 h-5" style={{ color: '#16a34a' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: '#166534',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {file?.name}
                    </p>
                    <p style={{ fontSize: 11, color: '#4ade80' }}>
                      {parsedData.rows.length.toLocaleString()} lignes détectées ·{' '}
                      {parsedData.headers.length} colonnes · {isExcel ? 'Excel' : 'CSV'}
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: 20,
                      background: '#dcfce7',
                      color: '#166534',
                    }}
                  >
                    {isExcel ? (ext === 'xlsx' ? 'XLSX' : 'XLS') : 'CSV'}
                  </span>
                </div>

                {/* Mapping fields */}
                <div>
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#64748b',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      marginBottom: 12,
                    }}
                  >
                    {t('importModal.mappingTitle')}
                  </p>
                  <div className="space-y-2">
                    {targetFields.map((field) => {
                      const isMapped = Boolean(mapping[field.key]);
                      return (
                        <div
                          key={field.key}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '10px 14px',
                            borderRadius: 12,
                            background: isMapped ? '#f0fdf4' : '#f8fafc',
                            border: `1.5px solid ${isMapped ? '#bbf7d0' : '#e2e8f0'}`,
                            transition: 'all 0.15s',
                          }}
                        >
                          <div
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: isMapped ? '#22c55e' : '#cbd5e1',
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              width: 100,
                              fontSize: 12,
                              fontWeight: 600,
                              color: isMapped ? '#166534' : '#475569',
                              flexShrink: 0,
                            }}
                          >
                            {field.label}
                          </span>
                          <select
                            value={mapping[field.key] || ''}
                            onChange={(e) => handleMappingChange(field.key, e.target.value)}
                            style={{
                              flex: 1,
                              fontSize: 12,
                              padding: '6px 10px',
                              borderRadius: 8,
                              border: '1px solid #e2e8f0',
                              background: 'white',
                              color: '#334155',
                              outline: 'none',
                            }}
                          >
                            <option value="">{t('importModal.ignore')}</option>
                            {parsedData.headers.map((header) => (
                              <option key={header} value={header}>
                                {header}
                              </option>
                            ))}
                          </select>
                          {isMapped && (
                            <Check className="w-4 h-4 flex-shrink-0" style={{ color: '#22c55e' }} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Preview table */}
                <div>
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#64748b',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      marginBottom: 10,
                    }}
                  >
                    {t('importModal.previewTitle')}
                  </p>
                  <div
                    style={{
                      borderRadius: 12,
                      border: '1px solid #e2e8f0',
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc' }}>
                            {parsedData.headers.map((header) => (
                              <th
                                key={header}
                                style={{
                                  padding: '8px 12px',
                                  textAlign: 'left',
                                  fontWeight: 700,
                                  color: '#475569',
                                  borderBottom: '1px solid #e2e8f0',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {parsedData.preview.map((row, i) => (
                            <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                              {parsedData.headers.map((header) => (
                                <td
                                  key={header}
                                  style={{
                                    padding: '7px 12px',
                                    color: '#334155',
                                    borderBottom: '1px solid #f1f5f9',
                                    maxWidth: 160,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {String(row[header] ?? '')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {error && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 14px',
                      borderRadius: 12,
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                    }}
                  >
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span style={{ fontSize: 13, color: '#dc2626' }}>{error}</span>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3 — Progress */}
            {step === 'progress' && (
              <div className="space-y-6 py-4">
                {/* Big animated icon */}
                <div className="text-center">
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg,#edfce8,#d1fae5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px',
                    }}
                  >
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#0c5460' }} />
                  </div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>
                    {processingJob
                      ? t('importModal.processingBackground')
                      : t('importModal.sending')}
                  </p>
                  <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                    {processingJob
                      ? t('importModal.insertingContacts')
                      : totalChunks > 1
                        ? t('importModal.chunkProgress', {
                            current: currentChunk,
                            total: totalChunks,
                          })
                        : t('importModal.sendingFile')}
                  </p>
                </div>

                {/* Progress bar */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 8,
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>
                      {t('importModal.progress')}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#0c5460' }}>
                      {uploadProgress}%
                    </span>
                  </div>
                  <div
                    style={{
                      height: 10,
                      background: '#e2e8f0',
                      borderRadius: 99,
                      overflow: 'hidden',
                    }}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                      style={{
                        height: '100%',
                        borderRadius: 99,
                        background: processingJob
                          ? 'linear-gradient(90deg,#2ec80a,#0a8c6e)'
                          : 'linear-gradient(90deg,#0c5460,#2ec80a)',
                      }}
                    />
                  </div>
                  {liveStats && liveStats.total > 0 && (
                    <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 6, textAlign: 'right' }}>
                      {liveStats.current.toLocaleString()} / {liveStats.total.toLocaleString()}{' '}
                      contacts
                    </p>
                  )}
                </div>

                {/* Live stats */}
                {liveStats && processingJob && (
                  <div
                    className="import-live-stats-grid"
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}
                  >
                    {[
                      {
                        label: t('importModal.importedStat'),
                        value: liveStats.success,
                        color: '#22c55e',
                        bg: '#f0fdf4',
                        border: '#bbf7d0',
                      },
                      {
                        label: t('importModal.duplicatesStat'),
                        value: liveStats.duplicates,
                        color: '#f59e0b',
                        bg: '#fffbeb',
                        border: '#fde68a',
                      },
                      {
                        label: t('importModal.errorsStat'),
                        value: liveStats.errors,
                        color: '#ef4444',
                        bg: '#fef2f2',
                        border: '#fecaca',
                      },
                      {
                        label: t('importModal.invalidPhonesStat'),
                        value: liveStats.invalidPhones,
                        color: '#94a3b8',
                        bg: '#f8fafc',
                        border: '#e2e8f0',
                      },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        style={{
                          padding: '12px 8px',
                          borderRadius: 14,
                          background: stat.bg,
                          border: `1.5px solid ${stat.border}`,
                          textAlign: 'center',
                        }}
                      >
                        <p
                          style={{
                            fontSize: 20,
                            fontWeight: 800,
                            color: stat.color,
                            lineHeight: 1.1,
                          }}
                        >
                          {stat.value.toLocaleString()}
                        </p>
                        <p
                          style={{ fontSize: 10, color: '#64748b', marginTop: 3, fontWeight: 600 }}
                        >
                          {stat.label}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {processingJob && !liveStats && (
                  <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
                    {t('importModal.statsWillAppear')}
                  </p>
                )}
              </div>
            )}

            {/* STEP 4 — Report */}
            {step === 'report' && report && (
              <div className="space-y-5 py-2">
                {/* Success banner */}
                <div
                  style={{
                    padding: '20px 24px',
                    borderRadius: 18,
                    background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)',
                    border: '1.5px solid #bbf7d0',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg,#2ec80a,#16a34a)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 12px',
                    }}
                  >
                    <Check className="w-7 h-7 text-white" />
                  </div>
                  <p style={{ fontSize: 16, fontWeight: 800, color: '#166534' }}>
                    {t('importModal.importDone')}
                  </p>
                  <p style={{ fontSize: 12, color: '#4ade80', marginTop: 4 }}>
                    {t('importModal.autoClose')}
                  </p>
                </div>

                {/* Stats grid */}
                <div
                  className="import-report-stats-grid"
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}
                >
                  {[
                    {
                      label: t('importModal.totalProcessed'),
                      value: report.totalRecords,
                      color: '#0c5460',
                      bg: '#f0fdff',
                      border: '#bae6fd',
                    },
                    {
                      label: t('importModal.created'),
                      value: report.successCount,
                      color: '#16a34a',
                      bg: '#f0fdf4',
                      border: '#bbf7d0',
                    },
                    {
                      label: t('importModal.duplicatesStat'),
                      value: report.duplicateCount,
                      color: '#d97706',
                      bg: '#fffbeb',
                      border: '#fde68a',
                    },
                    {
                      label: t('importModal.errorsStat'),
                      value: report.errorCount,
                      color: '#dc2626',
                      bg: '#fef2f2',
                      border: '#fecaca',
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      style={{
                        padding: '16px 8px',
                        borderRadius: 16,
                        background: stat.bg,
                        border: `1.5px solid ${stat.border}`,
                        textAlign: 'center',
                      }}
                    >
                      <p
                        style={{ fontSize: 26, fontWeight: 800, color: stat.color, lineHeight: 1 }}
                      >
                        {stat.value.toLocaleString()}
                      </p>
                      <p style={{ fontSize: 10, color: '#64748b', marginTop: 4, fontWeight: 600 }}>
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Summary lines */}
                <div
                  style={{
                    padding: '14px 18px',
                    borderRadius: 14,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <p style={{ fontSize: 12, color: '#334155' }}>
                    <span style={{ color: '#22c55e', fontWeight: 700 }}>
                      ✓ {report.successCount}
                    </span>{' '}
                    contact{report.successCount > 1 ? 's' : ''} ajouté
                    {report.successCount > 1 ? 's' : ''} dans votre base
                  </p>
                  {report.duplicateCount > 0 && (
                    <p style={{ fontSize: 12, color: '#334155' }}>
                      <span style={{ color: '#f59e0b', fontWeight: 700 }}>
                        ⚠ {report.duplicateCount}
                      </span>{' '}
                      doublon{report.duplicateCount > 1 ? 's' : ''} ignoré
                      {report.duplicateCount > 1 ? 's' : ''}
                    </p>
                  )}
                  {report.errorCount > 0 && (
                    <p style={{ fontSize: 12, color: '#334155' }}>
                      <span style={{ color: '#ef4444', fontWeight: 700 }}>
                        ✕ {report.errorCount}
                      </span>{' '}
                      erreur{report.errorCount > 1 ? 's' : ''} de format
                    </p>
                  )}
                  {report.successCount === 0 &&
                    report.duplicateCount > 0 &&
                    report.errorCount === 0 && (
                      <p style={{ fontSize: 12, color: '#64748b' }}>
                        {t('importModal.allDuplicates')}
                      </p>
                    )}
                </div>
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
              padding: '12px 16px 16px',
              borderTop: '1px solid #f1f5f9',
              background: '#fafafa',
            }}
          >
            <button
              onClick={handleClose}
              style={{
                padding: '8px 18px',
                borderRadius: 10,
                border: '1.5px solid #e2e8f0',
                background: 'white',
                fontSize: 13,
                fontWeight: 600,
                color: '#64748b',
                cursor: 'pointer',
              }}
            >
              {step === 'report' ? t('importModal.close') : t('importModal.cancel')}
            </button>

            <div style={{ display: 'flex', gap: 10 }}>
              {step === 'upload' && (
                <label
                  htmlFor="file-input"
                  style={{
                    padding: '9px 22px',
                    borderRadius: 10,
                    background: 'linear-gradient(135deg,#0c5460,#0a8c6e)',
                    color: 'white',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Upload className="w-4 h-4" />
                  {t('importModal.selectFile')}
                </label>
              )}

              {(step === 'mapping' || step === 'preview') && (
                <button
                  onClick={handleStartImport}
                  disabled={isUploading}
                  style={{
                    padding: '9px 22px',
                    borderRadius: 10,
                    background: isUploading ? '#94a3b8' : 'linear-gradient(135deg,#0c5460,#2ec80a)',
                    color: 'white',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: isUploading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    border: 'none',
                  }}
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {t('importModal.launchImport')}
                </button>
              )}

              {step === 'report' && report?.status === 'completed' && (
                <button
                  onClick={() => {
                    if (report) onImportComplete(report);
                    handleClose();
                  }}
                  style={{
                    padding: '9px 22px',
                    borderRadius: 10,
                    background: 'linear-gradient(135deg,#16a34a,#2ec80a)',
                    color: 'white',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    border: 'none',
                  }}
                >
                  <Check className="w-4 h-4" />
                  {t('importModal.finish')}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
