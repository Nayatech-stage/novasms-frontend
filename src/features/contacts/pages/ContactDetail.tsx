import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import useContactDetail from '../hooks/useContactDetail';
import Timeline from '../components/Timeline';
import { contactsApi } from '@/api/contacts';

function parseTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw as string[];
  if (typeof raw === 'string' && raw.startsWith('[')) {
    try {
      return JSON.parse(raw) as string[];
    } catch {
      /* ignore */
    }
  }
  return [];
}

function extractErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null) {
    const e = err as { response?: { data?: { message?: string } }; message?: string };
    const serverMsg = e.response?.data?.message;
    if (typeof serverMsg === 'string' && serverMsg.trim()) return serverMsg;
    if (typeof e.message === 'string' && !e.message.startsWith('Request failed')) return e.message;
  }
  return 'Une erreur est survenue. Veuillez reessayer.';
}

type ContactNote = { id: string; content: string; createdAt: string };

export default function ContactDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error, refresh } = useContactDetail(id);

  const [activeTab, setActiveTab] = useState<'history' | 'notes'>('history');
  const [isEditing, setIsEditing] = useState(false);
  const [formValues, setFormValues] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    tags: '',
    birthday: '',
  });
  const [noteValue, setNoteValue] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [actionLoading, setActionLoading] = useState<'optout' | 'delete' | 'export' | null>(null);

  if (loading) {
    return (
      <div
        className="content"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: 'var(--text-2)',
            fontSize: 13,
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 20, animation: 'spin 1s linear infinite' }}
          >
            progress_activity
          </span>
          {t('contactDetail.loading')}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="content" style={{ padding: 24 }}>
        <button
          onClick={() => navigate('/contacts')}
          className="btn-sm"
          style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
            arrow_back
          </span>
          {t('contactDetail.backToContacts')}
        </button>
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 48, color: 'var(--text-3)' }}
          >
            person_off
          </span>
          <p style={{ marginTop: 12, color: 'var(--text-2)', fontSize: 14 }}>
            {t('contactDetail.notFound')}
          </p>
        </div>
      </div>
    );
  }

  const contact = data;
  const notes: ContactNote[] = Array.isArray(contact.notes) ? (contact.notes as ContactNote[]) : [];
  const initials = (contact.firstName || contact.email || 'N').charAt(0).toUpperCase();

  const startEdit = () => {
    setFormValues({
      firstName: contact.firstName || '',
      lastName: contact.lastName || '',
      email: contact.email || '',
      phone: contact.phone || '',
      location: contact.location || '',
      tags: Array.isArray(contact.tags) ? (contact.tags as string[]).join(', ') : '',
      birthday: contact.birthday ? contact.birthday.slice(0, 10) : '',
    });
    setIsEditing(true);
  };

  const cancelEdit = () => setIsEditing(false);

  const handleSaveEdit = async () => {
    if (!id) return;
    setSavingEdit(true);
    try {
      const tags = formValues.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      await contactsApi.update(id, {
        firstName: formValues.firstName.trim() || undefined,
        lastName: formValues.lastName.trim() || undefined,
        email: formValues.email.trim() || undefined,
        phone: formValues.phone.trim() || undefined,
        location: formValues.location.trim() || undefined,
        birthday: formValues.birthday || null,
        tags: tags.length > 0 ? tags : undefined,
      });
      await refresh();
      setIsEditing(false);
      toast.success('Contact mis a jour');
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSaveNote = async () => {
    const note = noteValue.trim();
    if (!id || !note) return;
    setSavingNote(true);
    try {
      await contactsApi.addNote(id, note);
      setNoteValue('');
      await refresh();
      toast.success('Note enregistree');
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSavingNote(false);
    }
  };

  const handleOptOut = async () => {
    if (!id) return;
    setActionLoading('optout');
    try {
      await contactsApi.optOut(id);
      await refresh();
      toast.success('Contact desabonne');
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    const confirmed = window.confirm(t('contactDetail.deleteConfirm'));
    if (!confirmed) return;
    setActionLoading('delete');
    try {
      await contactsApi.delete(id);
      toast.success('Contact supprime');
      navigate('/contacts');
    } catch (err) {
      toast.error(extractErrorMessage(err));
      setActionLoading(null);
    }
  };

  const handleExport = async () => {
    if (!id) return;
    setActionLoading('export');
    try {
      const blob = await contactsApi.exportById(id, 'csv');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contact-${id}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Export telechargee');
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="content" style={{ padding: '20px 16px' }}>
      {/* Header nav */}
      <button
        onClick={() => navigate('/contacts')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          color: 'var(--text-2)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          marginBottom: 16,
          padding: 0,
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 17 }}>
          arrow_back
        </span>
        {t('contactDetail.backToContacts')}
      </button>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Contact header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: 'linear-gradient(135deg,#0c5460,#2ec80a)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                fontWeight: 800,
                color: 'white',
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>
                {[contact.firstName, contact.lastName].filter(Boolean).join(' ') ||
                  contact.email ||
                  'Contact'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
                {contact.email}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'right', fontSize: 12 }}>
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 600,
                  background: contact.optOut ? 'rgba(220,38,38,0.1)' : 'rgba(22,163,74,0.1)',
                  color: contact.optOut ? '#dc2626' : '#16a34a',
                }}
              >
                {contact.optOut ? t('contactDetail.inactive') : t('contactDetail.active')}
              </span>
              <div style={{ color: 'var(--text-2)', marginTop: 4 }}>
                {t('contactDetail.addedOn')}{' '}
                {new Date(contact.createdAt).toLocaleDateString('fr-FR')}
              </div>
            </div>
            {isEditing ? (
              <>
                <button
                  className="btn-sm"
                  onClick={cancelEdit}
                  disabled={savingEdit}
                  style={{ border: '1px solid var(--border)' }}
                >
                  {t('contactDetail.cancel')}
                </button>
                <button
                  className="btn-primary"
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                  style={{ fontSize: 12 }}
                >
                  {savingEdit ? t('contactDetail.saving') : t('contactDetail.save')}
                </button>
              </>
            ) : (
              <button
                className="btn-sm"
                onClick={startEdit}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  border: '1px solid var(--border)',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
                  edit
                </span>
                Modifier
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div
          style={{
            padding: 24,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 24,
          }}
        >
          {/* Infos */}
          <div>
            <div className="card-title" style={{ marginBottom: 12 }}>
              {t('contactDetail.infoTitle')}
            </div>
            {isEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { key: 'firstName', placeholder: 'Prenom' },
                  { key: 'lastName', placeholder: 'Nom' },
                  { key: 'email', placeholder: 'Email' },
                  { key: 'phone', placeholder: 'Telephone' },
                  { key: 'location', placeholder: 'Localisation' },
                ].map(({ key, placeholder }) => (
                  <input
                    key={key}
                    className="form-input"
                    placeholder={placeholder}
                    value={formValues[key as keyof typeof formValues]}
                    onChange={(e) => setFormValues((prev) => ({ ...prev, [key]: e.target.value }))}
                  />
                ))}
                <div>
                  <label
                    style={{
                      fontSize: 11,
                      color: 'var(--text-2)',
                      marginBottom: 4,
                      display: 'block',
                    }}
                  >
                    {t('contactDetail.birthdayLabel')}
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={formValues.birthday}
                    onChange={(e) =>
                      setFormValues((prev) => ({ ...prev, birthday: e.target.value }))
                    }
                  />
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'Email', value: contact.email },
                  { label: 'Telephone', value: contact.phone },
                  { label: 'Localisation', value: contact.location },
                  {
                    label: 'Anniversaire',
                    value: contact.birthday
                      ? new Date(contact.birthday).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'long',
                        })
                      : null,
                  },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', gap: 8, fontSize: 13 }}>
                    <span style={{ color: 'var(--text-2)', minWidth: 90 }}>{label}</span>
                    <span style={{ fontWeight: 500, color: 'var(--text-1)' }}>{value || '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <div className="card-title" style={{ marginBottom: 12 }}>
              {t('contactDetail.tagsTitle')}
            </div>
            {isEditing ? (
              <input
                className="form-input"
                placeholder="VIP, Clients, Abidjan"
                value={formValues.tags}
                onChange={(e) => setFormValues((prev) => ({ ...prev, tags: e.target.value }))}
              />
            ) : (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {parseTags(contact.tags).length === 0 ? (
                  <span style={{ fontSize: 13, color: 'var(--text-2)' }}>
                    {t('contactDetail.noTag')}
                  </span>
                ) : (
                  parseTags(contact.tags).map((tag) => (
                    <span
                      key={tag}
                      style={{
                        padding: '3px 10px',
                        background: 'var(--muted)',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 500,
                        color: 'var(--text-1)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {tag}
                    </span>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ borderTop: '1px solid var(--border)', padding: '0 24px' }}>
          <div style={{ display: 'flex', gap: 0 }}>
            {(['history', 'notes'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '12px 16px',
                  fontSize: 13,
                  fontWeight: activeTab === tab ? 600 : 400,
                  color: activeTab === tab ? 'var(--primary, #0c5460)' : 'var(--text-2)',
                  background: 'none',
                  border: 'none',
                  borderBottom:
                    activeTab === tab
                      ? '2px solid var(--primary, #0c5460)'
                      : '2px solid transparent',
                  cursor: 'pointer',
                  marginBottom: -1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  {tab === 'history' ? 'history' : 'note'}
                </span>
                {tab === 'history' ? t('contactDetail.historyTab') : t('contactDetail.notesTab')}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div style={{ padding: 24 }}>
          {activeTab === 'history' ? (
            <Timeline events={contact.history || []} />
          ) : (
            <div>
              <textarea
                className="form-input"
                style={{ minHeight: 100, resize: 'vertical', width: '100%' }}
                placeholder={t('contactDetail.notePlaceholder')}
                value={noteValue}
                onChange={(e) => setNoteValue(e.target.value)}
              />
              <div style={{ marginTop: 10 }}>
                <button
                  className="btn-primary"
                  style={{ fontSize: 12 }}
                  disabled={savingNote || !noteValue.trim()}
                  onClick={handleSaveNote}
                >
                  {savingNote ? t('contactDetail.noteSaving') : t('contactDetail.saveNote')}
                </button>
              </div>

              <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {notes.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '24px 0',
                      color: 'var(--text-2)',
                      fontSize: 13,
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: 32,
                        display: 'block',
                        marginBottom: 8,
                        color: 'var(--text-3)',
                      }}
                    >
                      note_stack
                    </span>
                    {t('contactDetail.noNotes')}
                  </div>
                ) : (
                  notes.map((note) => (
                    <div
                      key={note.id}
                      style={{
                        padding: '12px 14px',
                        background: 'var(--muted)',
                        borderRadius: 10,
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div style={{ fontSize: 13, color: 'var(--text-1)', lineHeight: 1.5 }}>
                        {note.content}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 6 }}>
                        {new Date(note.createdAt).toLocaleString('fr-FR')}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <button
            className="btn-sm"
            onClick={handleOptOut}
            disabled={actionLoading !== null || isEditing}
            style={{
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
              unsubscribe
            </span>
            {actionLoading === 'optout'
              ? t('contactDetail.unsubscribing')
              : t('contactDetail.unsubscribe')}
          </button>
          <button
            className="btn-sm"
            onClick={handleDelete}
            disabled={actionLoading !== null || isEditing}
            style={{
              border: '1px solid rgba(220,38,38,0.3)',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
              delete
            </span>
            {actionLoading === 'delete'
              ? t('contactDetail.deleting')
              : t('contactDetail.deleteContact')}
          </button>
          <button
            className="btn-primary"
            onClick={handleExport}
            disabled={actionLoading !== null || isEditing}
            style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
              download
            </span>
            {actionLoading === 'export'
              ? t('contactDetail.exporting')
              : t('contactDetail.exportCsv')}
          </button>
        </div>
      </div>
    </div>
  );
}
