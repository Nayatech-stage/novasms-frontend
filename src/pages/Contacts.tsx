import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, X, CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { contactsApi } from '@/api/contacts';
import ContactTable from '@/features/contacts/components/ContactTable';
import ImportModal from '@/features/contacts/components/ImportModal';

type ContactDraft = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  tags: string;
  birthday: string;
};

const initialContactDraft: ContactDraft = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  location: '',
  tags: '',
  birthday: '',
};

export default function ContactsPage() {
  const navigate = useNavigate();
  const [isImportOpen, setImportOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isAddOpen, setAddOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [contactDraft, setContactDraft] = useState<ContactDraft>(initialContactDraft);
  const [phoneValidation, setPhoneValidation] = useState<{
    status: 'VALID' | 'INVALID' | 'UNVERIFIED';
    message: string | null;
    formatted: string | null;
  } | null>(null);

  const handleImportClick = () => setImportOpen(true);
  const handleImportClose = () => setImportOpen(false);
  const handleAddClick = () => {
    setAddError(null);
    setAddOpen(true);
  };

  const closeAddModal = () => {
    if (isCreating) return;
    setAddOpen(false);
    setAddError(null);
    setContactDraft(initialContactDraft);
    setPhoneValidation(null);
  };

  // Validation live du téléphone (debounce 600ms)
  useEffect(() => {
    const phone = contactDraft.phone.trim();
    if (!phone) {
      setPhoneValidation(null);
      return;
    }
    const timer = setTimeout(() => {
      contactsApi
        .validatePhone(phone)
        .then((r) =>
          setPhoneValidation({ status: r.status, message: r.message, formatted: r.formatted }),
        )
        .catch(() => setPhoneValidation(null));
    }, 600);
    return () => clearTimeout(timer);
  }, [contactDraft.phone]);

  const handleImportComplete = () => {
    setRefreshKey((prev) => prev + 1);
    setImportOpen(false);
  };

  const handleCreateContact = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const firstName = contactDraft.firstName.trim();
    const lastName = contactDraft.lastName.trim();
    const email = contactDraft.email.trim();
    const phone = contactDraft.phone.trim();
    const location = contactDraft.location.trim();
    const birthday = contactDraft.birthday.trim();
    const tags = contactDraft.tags
      .split(/[,;|]/)
      .map((tag) => tag.trim())
      .filter(Boolean);

    if (!email && !phone) {
      setAddError('Renseignez au moins un email ou un téléphone.');
      return;
    }

    setIsCreating(true);
    setAddError(null);

    try {
      const created = await contactsApi.create({
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        email: email || undefined,
        phone: phone || undefined,
        location: location || undefined,
        birthday: birthday || undefined,
        tags,
      });

      if ((created as any).alreadyExists) {
        toast.success('Le contact existe déjà');
      } else {
        toast.success('Contact créé');
      }
      setRefreshKey((prev) => prev + 1);
      closeAddModal();
    } catch (error) {
      console.error(error);
      setAddError('Impossible de créer le contact. Vérifiez les champs puis réessayez.');
      toast.error('La création du contact a échoué');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-semibold">Contacts</h1>
      <ContactTable
        key={refreshKey}
        onImportClick={handleImportClick}
        onAddContactClick={handleAddClick}
        onContactClick={(contact) => navigate(`/contacts/${contact.id}`)}
      />

      <ImportModal
        isOpen={isImportOpen}
        onClose={handleImportClose}
        onImportComplete={handleImportComplete}
      />

      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-outline-variant/40 bg-white shadow-[0_28px_90px_rgba(12,84,96,0.22)]">
            <div className="flex items-start justify-between gap-4 border-b border-outline-variant/30 px-6 py-5">
              <div>
                <h2 className="text-xl font-black text-secondary">Ajouter un contact</h2>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Créez un contact manuel pour le workflow de bienvenue ou vos campagnes.
                </p>
              </div>
              <button
                type="button"
                onClick={closeAddModal}
                className="rounded-full border border-outline-variant/40 p-2 text-on-surface-variant transition hover:border-primary/40 hover:text-primary"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={(event) => void handleCreateContact(event)}
              className="space-y-5 px-6 py-6"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-semibold text-secondary">
                  Prénom
                  <input
                    className="w-full rounded-2xl border border-outline-variant/40 bg-white px-4 py-3 text-sm text-secondary outline-none transition focus:border-primary"
                    value={contactDraft.firstName}
                    onChange={(event) =>
                      setContactDraft((current) => ({ ...current, firstName: event.target.value }))
                    }
                    placeholder="Moussa"
                  />
                </label>

                <label className="space-y-2 text-sm font-semibold text-secondary">
                  Nom
                  <input
                    className="w-full rounded-2xl border border-outline-variant/40 bg-white px-4 py-3 text-sm text-secondary outline-none transition focus:border-primary"
                    value={contactDraft.lastName}
                    onChange={(event) =>
                      setContactDraft((current) => ({ ...current, lastName: event.target.value }))
                    }
                    placeholder="Koné"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-semibold text-secondary">
                  Email
                  <input
                    type="email"
                    className="w-full rounded-2xl border border-outline-variant/40 bg-white px-4 py-3 text-sm text-secondary outline-none transition focus:border-primary"
                    value={contactDraft.email}
                    onChange={(event) =>
                      setContactDraft((current) => ({ ...current, email: event.target.value }))
                    }
                    placeholder="moussa@example.com"
                  />
                </label>

                <label className="space-y-2 text-sm font-semibold text-secondary">
                  Téléphone
                  <div className="relative">
                    <input
                      className={`w-full rounded-2xl border bg-white px-4 py-3 pr-10 text-sm text-secondary outline-none transition focus:border-primary ${
                        phoneValidation?.status === 'VALID'
                          ? 'border-green-400'
                          : phoneValidation?.status === 'INVALID'
                            ? 'border-red-400'
                            : 'border-outline-variant/40'
                      }`}
                      value={contactDraft.phone}
                      onChange={(event) =>
                        setContactDraft((current) => ({ ...current, phone: event.target.value }))
                      }
                      placeholder="+225 07 00 00 00 00"
                    />
                    {phoneValidation && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2">
                        {phoneValidation.status === 'VALID' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : phoneValidation.status === 'INVALID' ? (
                          <XCircle className="h-4 w-4 text-red-600" />
                        ) : (
                          <HelpCircle className="h-4 w-4 text-on-surface-variant" />
                        )}
                      </span>
                    )}
                  </div>
                  {phoneValidation?.status === 'VALID' && phoneValidation.formatted && (
                    <p className="text-xs text-green-600 mt-1">
                      Numéro valide — {phoneValidation.formatted}
                    </p>
                  )}
                  {phoneValidation?.status === 'INVALID' && phoneValidation.message && (
                    <p className="text-xs text-red-600 mt-1">{phoneValidation.message}</p>
                  )}
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-[1.2fr_0.8fr]">
                <label className="space-y-2 text-sm font-semibold text-secondary">
                  Localisation
                  <input
                    className="w-full rounded-2xl border border-outline-variant/40 bg-white px-4 py-3 text-sm text-secondary outline-none transition focus:border-primary"
                    value={contactDraft.location}
                    onChange={(event) =>
                      setContactDraft((current) => ({ ...current, location: event.target.value }))
                    }
                    placeholder="Abidjan"
                  />
                </label>

                <label className="space-y-2 text-sm font-semibold text-secondary">
                  Tags
                  <input
                    className="w-full rounded-2xl border border-outline-variant/40 bg-white px-4 py-3 text-sm text-secondary outline-none transition focus:border-primary"
                    value={contactDraft.tags}
                    onChange={(event) =>
                      setContactDraft((current) => ({ ...current, tags: event.target.value }))
                    }
                    placeholder="VIP, newsletter"
                  />
                </label>
              </div>

              <label className="space-y-2 text-sm font-semibold text-secondary">
                Date de naissance
                <input
                  type="date"
                  className="w-full rounded-2xl border border-outline-variant/40 bg-white px-4 py-3 text-sm text-secondary outline-none transition focus:border-primary"
                  value={contactDraft.birthday}
                  onChange={(event) =>
                    setContactDraft((current) => ({ ...current, birthday: event.target.value }))
                  }
                />
                <span className="text-xs font-normal text-on-surface-variant">
                  Utilisée pour l'automatisation d'anniversaire
                </span>
              </label>

              {addError ? (
                <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {addError}
                </p>
              ) : null}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="rounded-2xl border border-outline-variant/40 px-4 py-3 text-sm font-semibold text-secondary transition hover:border-primary/40 hover:text-primary"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-secondary px-5 py-3 text-sm font-bold text-white transition hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Créer le contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
