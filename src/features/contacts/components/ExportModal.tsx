import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Loader2, FileDown, FileText, Users, MousePointerClick } from 'lucide-react';
import { contactsApi } from '@/api/contacts';
import type { Contact } from '../types/contact';

type ExportFormat = 'csv' | 'json';

type ExportField = {
  key: keyof Contact | 'tags';
  label: string;
  checked: boolean;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  totalContacts: number;
  selectedContacts?: Contact[];
};

const DEFAULT_FIELDS: ExportField[] = [
  { key: 'firstName', label: 'Prénom', checked: true },
  { key: 'lastName', label: 'Nom', checked: true },
  { key: 'email', label: 'Email', checked: true },
  { key: 'phone', label: 'Téléphone', checked: true },
  { key: 'location', label: 'Localisation', checked: true },
  { key: 'tags', label: 'Tags', checked: true },
  { key: 'optOut', label: 'Désabonné', checked: false },
  { key: 'createdAt', label: 'Date ajout', checked: false },
];

function contactsToCsv(contacts: Contact[], fields: ExportField[]): string {
  const active = fields.filter((f) => f.checked);
  const header = active.map((f) => f.label).join(',');
  const rows = contacts.map((c) =>
    active
      .map((f) => {
        const val = f.key === 'tags' ? (c.tags ?? []).join('|') : c[f.key as keyof Contact];
        const str = val === null || val === undefined ? '' : String(val);
        return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
      })
      .join(','),
  );
  return [header, ...rows].join('\n');
}

function contactsToJson(contacts: Contact[], fields: ExportField[]): string {
  const active = fields.filter((f) => f.checked).map((f) => f.key);
  const data = contacts.map((c) => {
    const obj: Record<string, unknown> = {};
    active.forEach((k) => {
      obj[k] = k === 'tags' ? (c.tags ?? []) : c[k as keyof Contact];
    });
    return obj;
  });
  return JSON.stringify(data, null, 2);
}

export default function ExportModal({ isOpen, onClose, totalContacts, selectedContacts }: Props) {
  const { t } = useTranslation();
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [fields, setFields] = useState<ExportField[]>(DEFAULT_FIELDS);
  const [scope, setScope] = useState<'all' | 'selected'>(
    selectedContacts && selectedContacts.length > 0 ? 'selected' : 'all',
  );
  const [step, setStep] = useState<'config' | 'generating' | 'done'>('config');
  const [progress, setProgress] = useState(0);
  const [exportedCount, setExportedCount] = useState(0);

  const hasSelected = selectedContacts && selectedContacts.length > 0;
  const scopeCount = scope === 'selected' && hasSelected ? selectedContacts!.length : totalContacts;

  const toggleField = (key: string) => {
    setFields((prev) => prev.map((f) => (f.key === key ? { ...f, checked: !f.checked } : f)));
  };

  const toggleAllFields = () => {
    const allChecked = fields.every((f) => f.checked);
    setFields((prev) => prev.map((f) => ({ ...f, checked: !allChecked })));
  };

  const handleExport = async () => {
    setStep('generating');
    setProgress(10);

    try {
      let contacts: Contact[];

      if (scope === 'selected' && hasSelected) {
        contacts = selectedContacts!;
        setProgress(60);
      } else {
        const allContacts: Contact[] = [];
        let cursor: string | undefined;
        const limit = 500;

        do {
          const res = await contactsApi.list({ cursor, limit });
          allContacts.push(...res.data);
          cursor = res.nextCursor ?? undefined;
          const pct = Math.min(10 + Math.round((allContacts.length / totalContacts) * 50), 60);
          setProgress(pct);
        } while (cursor);

        contacts = allContacts;
      }

      setProgress(75);
      setExportedCount(contacts.length);

      const content =
        format === 'csv' ? contactsToCsv(contacts, fields) : contactsToJson(contacts, fields);
      const mimeType =
        format === 'csv' ? 'text/csv;charset=utf-8;' : 'application/json;charset=utf-8;';
      const ext = format === 'csv' ? 'csv' : 'json';
      const fileName = `contacts-novasms-${new Date().toISOString().slice(0, 10)}.${ext}`;

      setProgress(90);

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);

      setProgress(100);
      setStep('done');
    } catch {
      setStep('config');
      setProgress(0);
    }
  };

  const handleClose = () => {
    setStep('config');
    setProgress(0);
    setExportedCount(0);
    setFields(DEFAULT_FIELDS);
    setFormat('csv');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(10,20,30,0.55)', backdropFilter: 'blur(6px)' }}
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 18 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 18 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="export-modal-box w-full max-w-lg overflow-y-auto"
          style={{
            background: 'var(--surface, #ffffff)',
            borderRadius: 24,
            boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
            border: '1px solid var(--border, #e5e7eb)',
            maxHeight: 'calc(100vh - 32px)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Bande top */}
          <div
            style={{ height: 4, background: 'linear-gradient(90deg,#0c5460,#0a8c6e,#2ec80a)' }}
          />

          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 24px 16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg,#edfce8,#d1fae5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <FileDown style={{ width: 18, height: 18, color: '#0c5460' }} />
              </div>
              <div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: 'var(--text-1, #0f172a)',
                    lineHeight: 1.3,
                  }}
                >
                  {t('exportModal.title')}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-2, #64748b)', marginTop: 2 }}>
                  {scopeCount.toLocaleString()} contact{scopeCount > 1 ? 's' : ''} à exporter
                </div>
              </div>
            </div>
            <button
              onClick={handleClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: '1px solid var(--border, #e5e7eb)',
                background: 'var(--surface, #fff)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-2, #64748b)',
              }}
            >
              <X style={{ width: 15, height: 15 }} />
            </button>
          </div>

          {/* Content */}
          <div style={{ padding: '0 16px 8px', maxHeight: '62vh', overflowY: 'auto' }}>
            {/* ── Config ── */}
            {step === 'config' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 8 }}>
                {/* {t('exportModal.scopeLabel')} */}
                {hasSelected && (
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'var(--text-3, #94a3b8)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.07em',
                        marginBottom: 10,
                      }}
                    >
                      {t('exportModal.scopeLabel')}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {[
                        {
                          id: 'all' as const,
                          label: t('exportModal.allContacts'),
                          count: totalContacts,
                          Icon: Users,
                        },
                        {
                          id: 'selected' as const,
                          label: t('exportModal.selectedOnly'),
                          count: selectedContacts!.length,
                          Icon: MousePointerClick,
                        },
                      ].map((opt) => {
                        const active = scope === opt.id;
                        return (
                          <button
                            key={opt.id}
                            onClick={() => setScope(opt.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              padding: '12px 14px',
                              borderRadius: 12,
                              border: `2px solid ${active ? '#0c5460' : 'var(--border, #e5e7eb)'}`,
                              background: active ? '#f0fdff' : 'var(--surface, #fff)',
                              cursor: 'pointer',
                              textAlign: 'left',
                              transition: 'all 0.15s',
                            }}
                          >
                            <opt.Icon
                              style={{
                                width: 16,
                                height: 16,
                                color: active ? '#0c5460' : 'var(--text-3, #94a3b8)',
                                flexShrink: 0,
                              }}
                            />
                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: active ? '#0c5460' : 'var(--text-1, #0f172a)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {opt.label}
                              </div>
                              <div
                                style={{
                                  fontSize: 11,
                                  color: 'var(--text-3, #94a3b8)',
                                  marginTop: 1,
                                }}
                              >
                                {opt.count.toLocaleString()} contact{opt.count > 1 ? 's' : ''}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Format */}
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--text-3, #94a3b8)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                      marginBottom: 10,
                    }}
                  >
                    {t('exportModal.formatLabel')}
                  </div>
                  <div
                    className="export-format-grid"
                    style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}
                  >
                    {[
                      {
                        id: 'csv' as const,
                        label: 'CSV',
                        desc: t('exportModal.csvDesc'),
                        Icon: FileDown,
                        activeColor: '#16a34a',
                        activeBg: '#f0fdf4',
                        activeBorder: '#16a34a',
                      },
                      {
                        id: 'json' as const,
                        label: 'JSON',
                        desc: t('exportModal.jsonDesc'),
                        Icon: FileText,
                        activeColor: '#0c5460',
                        activeBg: '#f0fdff',
                        activeBorder: '#0c5460',
                      },
                    ].map((opt) => {
                      const active = format === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => setFormat(opt.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '13px 14px',
                            borderRadius: 12,
                            border: `2px solid ${active ? opt.activeBorder : 'var(--border, #e5e7eb)'}`,
                            background: active ? opt.activeBg : 'var(--surface, #fff)',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                        >
                          <opt.Icon
                            style={{
                              width: 18,
                              height: 18,
                              color: active ? opt.activeColor : 'var(--text-3, #94a3b8)',
                              flexShrink: 0,
                            }}
                          />
                          <div style={{ flex: 1, textAlign: 'left' }}>
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 700,
                                color: active ? opt.activeColor : 'var(--text-1, #0f172a)',
                              }}
                            >
                              {opt.label}
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: 'var(--text-3, #94a3b8)',
                                marginTop: 1,
                              }}
                            >
                              {opt.desc}
                            </div>
                          </div>
                          {active && (
                            <Check
                              style={{
                                width: 15,
                                height: 15,
                                color: opt.activeColor,
                                flexShrink: 0,
                              }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Champs */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'var(--text-3, #94a3b8)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.07em',
                      }}
                    >
                      {t('exportModal.fieldsLabel')}
                    </div>
                    <button
                      onClick={toggleAllFields}
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#0c5460',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      {fields.every((f) => f.checked)
                        ? t('exportModal.deselectAll')
                        : t('exportModal.selectAll')}
                    </button>
                  </div>
                  <div
                    className="export-fields-grid"
                    style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}
                  >
                    {fields.map((field) => (
                      <button
                        key={field.key}
                        onClick={() => toggleField(field.key)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '9px 12px',
                          borderRadius: 10,
                          border: `1.5px solid ${field.checked ? '#bbf7d0' : 'var(--border, #e5e7eb)'}`,
                          background: field.checked ? '#f0fdf4' : 'var(--muted, #f8fafc)',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div
                          style={{
                            width: 17,
                            height: 17,
                            borderRadius: 5,
                            border: `2px solid ${field.checked ? '#22c55e' : 'var(--border, #cbd5e1)'}`,
                            background: field.checked ? '#22c55e' : 'var(--surface, white)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            transition: 'all 0.15s',
                          }}
                        >
                          {field.checked && (
                            <Check style={{ width: 10, height: 10, color: 'white' }} />
                          )}
                        </div>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: field.checked ? '#166534' : 'var(--text-1, #334155)',
                          }}
                        >
                          {field.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Generating ── */}
            {step === 'generating' && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 20,
                  padding: '32px 0',
                }}
              >
                <div
                  style={{
                    width: 68,
                    height: 68,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg,#edfce8,#d1fae5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Loader2
                    style={{ width: 30, height: 30, color: '#0c5460' }}
                    className="animate-spin"
                  />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1, #0f172a)' }}>
                    {t('exportModal.generating')}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-2, #64748b)', marginTop: 4 }}>
                    {t('exportModal.fetchingData')}
                  </div>
                </div>
                <div style={{ width: '100%' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 8,
                    }}
                  >
                    <span style={{ fontSize: 12, color: 'var(--text-2, #64748b)' }}>
                      {t('exportModal.progress')}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#0c5460' }}>
                      {progress}%
                    </span>
                  </div>
                  <div
                    style={{
                      height: 8,
                      background: 'var(--border, #e2e8f0)',
                      borderRadius: 99,
                      overflow: 'hidden',
                    }}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.4 }}
                      style={{
                        height: '100%',
                        background: 'linear-gradient(90deg,#0c5460,#2ec80a)',
                        borderRadius: 99,
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── Done ── */}
            {step === 'done' && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 16,
                  padding: '28px 0',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: 68,
                    height: 68,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg,#2ec80a,#16a34a)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Check style={{ width: 30, height: 30, color: 'white' }} />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#166534' }}>
                    {t('exportModal.successTitle')}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-2, #64748b)', marginTop: 6 }}>
                    <strong style={{ color: '#0c5460' }}>{exportedCount.toLocaleString()}</strong>{' '}
                    contact{exportedCount > 1 ? 's' : ''} exporté{exportedCount > 1 ? 's' : ''} en{' '}
                    <strong style={{ color: '#0c5460' }}>{format.toUpperCase()}</strong>
                  </div>
                </div>
                <div
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 12,
                    background: '#f0fdf4',
                    border: '1.5px solid #bbf7d0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <FileDown style={{ width: 16, height: 16, color: '#16a34a', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: '#166534' }}>
                    {t('exportModal.downloaded')}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 24px 20px',
              borderTop: '1px solid var(--border, #f1f5f9)',
              background: 'var(--muted, #fafafa)',
            }}
          >
            <button className="btn-outline" onClick={handleClose} style={{ fontSize: 13 }}>
              {step === 'done' ? t('exportModal.close') : t('exportModal.cancel')}
            </button>

            {step === 'config' && (
              <button
                className="btn-primary"
                onClick={() => void handleExport()}
                disabled={fields.every((f) => !f.checked)}
                style={{
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  opacity: fields.every((f) => !f.checked) ? 0.5 : 1,
                  cursor: fields.every((f) => !f.checked) ? 'not-allowed' : 'pointer',
                }}
              >
                <FileDown style={{ width: 15, height: 15 }} />
                {t('exportModal.generate')}
              </button>
            )}

            {step === 'done' && (
              <button
                className="btn-primary"
                onClick={() => {
                  setStep('config');
                  setProgress(0);
                }}
                style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <FileDown style={{ width: 15, height: 15 }} />
                {t('exportModal.newExport')}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
