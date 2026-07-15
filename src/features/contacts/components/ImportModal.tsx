import { useState, useEffect, useCallback } from 'react';
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

        // 2) Envoyer les chunks séquentiellement
        for (let i = 0; i < parsedData.rows.length; i += CHUNK_SIZE) {
          const chunk = parsedData.rows.slice(i, i + CHUNK_SIZE);
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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-secondary">Importer des contacts</h3>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-surface rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-on-surface-variant" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {step === 'upload' && (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-outline-variant rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    accept=".csv,.xls,.xlsx"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-input"
                  />
                  <label htmlFor="file-input" className="cursor-pointer">
                    <Upload className="w-12 h-12 text-on-surface-variant mx-auto mb-4" />
                    <p className="font-medium text-on-surface">Glissez-déposez votre fichier</p>
                    <p className="text-sm text-on-surface-variant mt-1">
                      CSV, XLS ou XLSX • Max 50 000 lignes
                    </p>
                  </label>
                </div>
                {error && (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}
              </div>
            )}

            {step === 'mapping' && parsedData && (
              <div className="space-y-4">
                <p className="text-sm text-on-surface-variant">
                  Mappez les colonnes de votre fichier vers les champs NovaSMS
                </p>

                <div className="space-y-3">
                  {targetFields.map((field) => (
                    <div key={field.key} className="flex items-center gap-4">
                      <label className="w-32 text-sm font-medium text-on-surface">
                        {field.label} {field.required && <span className="text-red-600">*</span>}
                      </label>
                      <select
                        value={mapping[field.key] || ''}
                        onChange={(e) => handleMappingChange(field.key, e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border border-outline-variant bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="">— Ignorer cette colonne —</option>
                        {parsedData.headers.map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                {/* Prévisualisation RG-10 */}
                <div className="mt-6">
                  <p className="text-sm font-medium text-on-surface mb-2">
                    Prévisualisation (5 premières lignes)
                  </p>
                  <div className="overflow-x-auto rounded-lg border border-outline-variant">
                    <table className="w-full text-sm">
                      <thead className="bg-surface">
                        <tr>
                          {parsedData.headers.map((header) => (
                            <th
                              key={header}
                              className="px-3 py-2 text-left font-medium text-on-surface-variant"
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.preview.map((row, i) => (
                          <tr key={i} className="border-t border-outline-variant/50">
                            {parsedData.headers.map((header) => (
                              <td key={header} className="px-3 py-2 text-on-surface text-xs">
                                {String(row[header] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}
              </div>
            )}

            {step === 'progress' && (
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-on-surface">
                      {processingJob ? 'Traitement des données...' : 'Téléchargement en cours...'}
                    </p>
                    <p className="text-sm text-on-surface-variant">{uploadProgress}%</p>
                  </div>
                  <div className="w-full h-2 bg-outline-variant/30 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${processingJob ? 'bg-primary/60 animate-pulse' : 'bg-primary'}`}
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  {liveStats && liveStats.total > 0 && (
                    <p className="text-xs text-on-surface-variant mt-1 text-right">
                      {liveStats.current.toLocaleString()} / {liveStats.total.toLocaleString()}{' '}
                      contacts
                    </p>
                  )}
                </div>

                {!processingJob && totalChunks > 1 && (
                  <div className="text-sm text-on-surface-variant text-center">
                    Envoi chunk {currentChunk} / {totalChunks}
                  </div>
                )}

                {liveStats && processingJob && (
                  <div className="grid grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-surface border border-outline-variant text-center">
                      <p className="text-lg font-bold text-primary">
                        {liveStats.success.toLocaleString()}
                      </p>
                      <p className="text-xs text-on-surface-variant">Importés</p>
                    </div>
                    <div className="p-3 rounded-xl bg-surface border border-outline-variant text-center">
                      <p className="text-lg font-bold text-warning">
                        {liveStats.duplicates.toLocaleString()}
                      </p>
                      <p className="text-xs text-on-surface-variant">Doublons</p>
                    </div>
                    <div className="p-3 rounded-xl bg-surface border border-outline-variant text-center">
                      <p className="text-lg font-bold text-red-600">
                        {liveStats.errors.toLocaleString()}
                      </p>
                      <p className="text-xs text-on-surface-variant">Erreurs</p>
                    </div>
                    <div className="p-3 rounded-xl bg-surface border border-outline-variant text-center">
                      <p className="text-lg font-bold text-on-surface-variant">
                        {liveStats.invalidPhones.toLocaleString()}
                      </p>
                      <p className="text-xs text-on-surface-variant">N° invalides</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  <p className="text-sm text-on-surface-variant">
                    {processingJob
                      ? 'Import en cours en arrière-plan...'
                      : totalChunks > 1
                        ? 'Import volumineux en cours...'
                        : 'Traitement en cours...'}
                  </p>
                </div>

                {processingJob && !liveStats && (
                  <p className="text-xs text-on-surface-variant text-center">
                    Les contacts sont en cours d&apos;insertion. Les statistiques s&apos;afficheront
                    dès le premier batch traité.
                  </p>
                )}
              </div>
            )}

            {step === 'report' && report && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/10 border border-primary/20">
                  {report.status === 'processing' ? (
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  ) : (
                    <Check className="w-5 h-5 text-primary" />
                  )}
                  <div>
                    <p className="font-medium text-secondary">
                      {report.status === 'processing' ? 'Import en cours...' : '✅ Import complété'}
                    </p>
                    <p className="text-sm text-on-surface-variant">
                      {report.status === 'completed' && 'Fermeture automatique dans 3s...'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-surface border border-outline-variant">
                    <p className="text-2xl font-bold text-primary">{report.totalRecords}</p>
                    <p className="text-sm text-on-surface-variant">Total importés</p>
                  </div>
                  <div className="p-4 rounded-xl bg-surface border border-outline-variant">
                    <p className="text-2xl font-bold text-green-600">{report.successCount}</p>
                    <p className="text-sm text-on-surface-variant">Créés</p>
                  </div>
                  <div className="p-4 rounded-xl bg-surface border border-outline-variant">
                    <p className="text-2xl font-bold text-warning">{report.duplicateCount}</p>
                    <p className="text-sm text-on-surface-variant">Doublons</p>
                  </div>
                  <div className="p-4 rounded-xl bg-surface border border-outline-variant">
                    <p className="text-2xl font-bold text-red-600">{report.errorCount}</p>
                    <p className="text-sm text-on-surface-variant">Erreurs</p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-on-surface/5 text-sm text-on-surface-variant">
                  <p>
                    ✅ <strong>{report.successCount}</strong> contacts créés avec succès
                  </p>
                  {report.duplicateCount > 0 && (
                    <p>
                      ⚠️ <strong>{report.duplicateCount}</strong> doublons détectés et ignorés
                    </p>
                  )}
                  {report.errorCount > 0 && (
                    <p>
                      ❌ <strong>{report.errorCount}</strong> erreurs de format
                    </p>
                  )}
                  {report.successCount === 0 &&
                    report.duplicateCount > 0 &&
                    report.errorCount === 0 && (
                      <p>ℹ️ Tous les contacts de ce fichier existent déjà dans votre base.</p>
                    )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-outline-variant bg-surface/50">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-on-surface-variant hover:bg-surface rounded-lg transition-colors"
            >
              {step === 'report' ? 'Fermer' : 'Annuler'}
            </button>

            {step === 'upload' && (
              <label
                htmlFor="file-input"
                className="px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors cursor-pointer"
              >
                Sélectionner un fichier
              </label>
            )}

            {step === 'mapping' && (
              <button
                onClick={() => setStep('preview')}
                className="px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors"
              >
                Continuer
              </button>
            )}

            {step === 'preview' && (
              <button
                onClick={handleStartImport}
                disabled={isUploading}
                className="px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Lancer l'import
              </button>
            )}

            {step === 'report' && report?.status === 'completed' && (
              <button
                onClick={() => {
                  if (report) onImportComplete(report);
                  handleClose();
                }}
                className="px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors"
              >
                Terminer
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
