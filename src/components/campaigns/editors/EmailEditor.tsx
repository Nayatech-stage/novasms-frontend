import type { CSSProperties, FC } from 'react';
import { useState, useRef, useEffect } from 'react';
import { campaignApi } from '@/api/campaignApi';
import { useCampaignStore } from '@/store/campaign.store';
import { CONTACT_VARIABLES } from '@/types/campaign.types';
import type { CampaignBlock } from '@/store/campaign.store';
import MobilePreview from '@/components/campaigns/previews/MobilePreview';
import { imageUploadService, type UploadedImage } from '@/services/imageUpload';
import api from '@/api/axios';

/**
 * Email Editor Component
 * Features:
 * - Drag-and-drop blocks (Text, Image, Button, Divider, Social)
 * - Rich content editing
 * - Subject line + preheader
 * - Variable insertion
 * - Live preview
 */

export const EmailEditor: FC = () => {
  const { draft, setDraftEmailContent, setDraftABTest, selectedCampaignId } = useCampaignStore();
  const abTest = draft.abTest;
  const abEnabled = Boolean(abTest?.enabled);

  // Quel onglet est actif : 'main' | 'A' | 'B'
  const [activeVariant, setActiveVariant] = useState<'main' | 'A' | 'B'>('main');

  // ── Contenu principal ──────────────────────────────────────────────────────
  const [subject, setSubject] = useState(draft.emailContent?.subject || '');
  const [preheader, setPreheader] = useState(draft.emailContent?.preheader || '');
  const [blocks, setBlocks] = useState<CampaignBlock[]>(draft.emailContent?.blocks || []);

  // ── Variante A ─────────────────────────────────────────────────────────────
  const [subjectA, setSubjectA] = useState(
    abTest?.variantA?.emailSubject || draft.emailContent?.subject || '',
  );
  const [preheaderA, setPreheaderA] = useState(
    ((abTest?.variantA as Record<string, unknown>)?.emailPreheader as string) ||
      draft.emailContent?.preheader ||
      '',
  );
  const [blocksA, setBlocksA] = useState<CampaignBlock[]>(
    ((abTest?.variantA as Record<string, unknown>)?.emailBlocks as CampaignBlock[]) ||
      draft.emailContent?.blocks ||
      [],
  );

  // ── Variante B ─────────────────────────────────────────────────────────────
  const [subjectB, setSubjectB] = useState(
    abTest?.variantB?.emailSubject || `${draft.emailContent?.subject || 'Email'} - Variante B`,
  );
  const [preheaderB, setPreheaderB] = useState(
    ((abTest?.variantB as Record<string, unknown>)?.emailPreheader as string) ||
      draft.emailContent?.preheader ||
      '',
  );
  const [blocksB, setBlocksB] = useState<CampaignBlock[]>(
    ((abTest?.variantB as Record<string, unknown>)?.emailBlocks as CampaignBlock[]) || [],
  );

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<'subject' | 'preheader' | 'block' | null>(null);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [collapsedBlocks, setCollapsedBlocks] = useState<Set<string>>(new Set());
  const [paletteBlockId, setPaletteBlockId] = useState<string | null>(null);

  const toggleCollapse = (blockId: string) => {
    setCollapsedBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(blockId)) next.delete(blockId);
      else next.add(blockId);
      return next;
    });
  };

  // Galerie d'images de la campagne
  interface CampaignImageRecord {
    id: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    storageUrl: string;
    uploadedAt: Date;
  }
  const [campaignImages, setCampaignImages] = useState<CampaignImageRecord[]>([]);
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  const [isDeletingImages, setIsDeletingImages] = useState(false);
  const [showHtmlImport, setShowHtmlImport] = useState(false);
  const [htmlImportValue, setHtmlImportValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const subjectInputRef = useRef<HTMLInputElement>(null);
  const preheaderInputRef = useRef<HTMLInputElement>(null);
  const pendingImageUploadRef = useRef<((uploadedImage: UploadedImage) => void) | null>(null);
  const lastHydratedContentRef = useRef<string>('');

  // ── Accesseurs dynamiques selon l'onglet actif ─────────────────────────────
  const currentBlocks = activeVariant === 'A' ? blocksA : activeVariant === 'B' ? blocksB : blocks;
  const setCurrentBlocks =
    activeVariant === 'A' ? setBlocksA : activeVariant === 'B' ? setBlocksB : setBlocks;
  const currentSubject =
    activeVariant === 'A' ? subjectA : activeVariant === 'B' ? subjectB : subject;
  const setCurrentSubject =
    activeVariant === 'A' ? setSubjectA : activeVariant === 'B' ? setSubjectB : setSubject;
  const currentPreheader =
    activeVariant === 'A' ? preheaderA : activeVariant === 'B' ? preheaderB : preheader;
  const setCurrentPreheader =
    activeVariant === 'A' ? setPreheaderA : activeVariant === 'B' ? setPreheaderB : setPreheader;

  // Get campaign ID from store (used for image uploads)
  const campaignId = selectedCampaignId;

  // Hydrate principal depuis le store
  useEffect(() => {
    const nextContent = JSON.stringify(draft.emailContent ?? null);
    if (nextContent === lastHydratedContentRef.current) return;

    lastHydratedContentRef.current = nextContent;
    setSubject(draft.emailContent?.subject || '');
    setPreheader(draft.emailContent?.preheader || '');
    setBlocks(draft.emailContent?.blocks || []);
    setSelectedBlockId(null);
  }, [
    draft.emailContent,
    draft.emailContent?.subject,
    draft.emailContent?.preheader,
    draft.emailContent?.blocks,
  ]);

  // Persistance contenu principal
  useEffect(() => {
    if (activeVariant !== 'main') return;
    const content = { subject, preheader, blocks };
    try {
      lastHydratedContentRef.current = JSON.stringify(content);
      setDraftEmailContent(content);
    } catch {
      // swallow
    }
  }, [subject, preheader, blocks, setDraftEmailContent, activeVariant]);

  // Persistance variante A
  useEffect(() => {
    if (!abEnabled) return;
    setDraftABTest({
      ...(abTest as NonNullable<typeof abTest>),
      variantA: {
        ...(abTest?.variantA ?? {}),
        emailSubject: subjectA,
        emailPreheader: preheaderA,
        emailBlocks: blocksA,
      } as NonNullable<typeof abTest>['variantA'],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectA, preheaderA, blocksA]);

  // Persistance variante B
  useEffect(() => {
    if (!abEnabled) return;
    setDraftABTest({
      ...(abTest as NonNullable<typeof abTest>),
      variantB: {
        ...(abTest?.variantB ?? {}),
        emailSubject: subjectB,
        emailPreheader: preheaderB,
        emailBlocks: blocksB,
      } as NonNullable<typeof abTest>['variantB'],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectB, preheaderB, blocksB]);

  // Charge les images depuis le serveur quand la campagne est connue
  const loadCampaignImages = async () => {
    if (!campaignId) return;
    try {
      const response = await api.get<CampaignImageRecord[]>(`/campaigns/${campaignId}/images`);
      setCampaignImages(response.data);
    } catch {
      // non-bloquant
    }
  };

  useEffect(() => {
    void loadCampaignImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  const toggleImageSelection = (id: string) => {
    setSelectedImageIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const deleteSelectedImages = async () => {
    if (selectedImageIds.size === 0 || !campaignId) return;
    setIsDeletingImages(true);
    try {
      await Promise.all(
        Array.from(selectedImageIds).map((id) =>
          api.delete(`/campaigns/${campaignId}/images/${id}`),
        ),
      );
      setCampaignImages((prev) => prev.filter((img) => !selectedImageIds.has(img.id)));
      setUploadedImages((prev) => prev.filter((img) => !selectedImageIds.has(img.id)));
      setSelectedImageIds(new Set());
    } catch {
      alert('Erreur lors de la suppression des images');
    } finally {
      setIsDeletingImages(false);
    }
  };

  const handleSave = async () => {
    const content = {
      subject,
      preheader,
      blocks,
    };

    setDraftEmailContent(content);

    // If editing an already-persisted campaign, persist changes to backend
    if (selectedCampaignId) {
      try {
        await campaignApi.update(selectedCampaignId, { emailContent: content });
      } catch (err) {
        alert(
          'Erreur lors de la sauvegarde distante: ' +
            (err instanceof Error ? err.message : String(err)),
        );
      }
    }
  };

  const createBlockByType = (type: CampaignBlock['type']): CampaignBlock => {
    const block: CampaignBlock = {
      id: `block-${crypto.randomUUID()}`,
      type,
      content: {},
    };

    if (type === 'text') {
      block.content = {
        text: 'Nouveau paragraphe',
        fontSize: 14,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontWeight: 400,
        textAlign: 'left',
        color: '#111827',
      };
    } else if (type === 'image') {
      block.content = { src: '', alt: '' };
    } else if (type === 'button') {
      block.content = { text: 'Cliquez ici', url: '' };
    } else if (type === 'divider') {
      block.content = {
        thickness: 2,
        color: '#d1d5db',
        width: '100%',
      };
    } else if (type === 'product') {
      block.content = {
        title: 'Produit vedette',
        description: 'Décrivez votre offre en une phrase claire.',
        price: '25 000 FCFA',
        image: '',
        url: '',
      };
    } else if (type === 'social') {
      block.content = {
        facebook: '',
        instagram: '',
        tiktok: '',
        linkedin: '',
      };
    } else if (type === 'columns') {
      block.content = {
        layout: '2',
        columns: [{ blocks: [] }, { blocks: [] }],
      };
    } else if (type === 'spacing') {
      block.content = { size: 'medium' };
    } else if (type === 'html') {
      block.content = { html: '' };
    }

    return block;
  };

  const handleAddBlock = (type: CampaignBlock['type']) => {
    const newBlock = createBlockByType(type);
    setCurrentBlocks([...currentBlocks, newBlock]);
    setSelectedBlockId(newBlock.id);
  };

  const handleRemoveBlock = (id: string) => {
    setCurrentBlocks(currentBlocks.filter((b) => b.id !== id));
    setSelectedBlockId(null);
  };

  const handleDragStart = (e: React.DragEvent, blockId: string) => {
    setDraggedBlockId(blockId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, blockId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (blockId !== draggedBlockId) setDragOverBlockId(blockId);
  };

  const handleDrop = (e: React.DragEvent, targetBlockId: string) => {
    e.preventDefault();
    if (!draggedBlockId || draggedBlockId === targetBlockId) return;
    const from = currentBlocks.findIndex((b) => b.id === draggedBlockId);
    const to = currentBlocks.findIndex((b) => b.id === targetBlockId);
    if (from === -1 || to === -1) return;
    const reordered = [...currentBlocks];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    setCurrentBlocks(reordered);
    setDraggedBlockId(null);
    setDragOverBlockId(null);
  };

  const handleDragEnd = () => {
    setDraggedBlockId(null);
    setDragOverBlockId(null);
  };

  const handleUpdateBlock = (id: string, content: Record<string, unknown>) => {
    setCurrentBlocks(currentBlocks.map((b) => (b.id === id ? { ...b, content } : b)));
  };

  const getContentText = (content: Record<string, unknown>): string => {
    const value = content.text;
    return typeof value === 'string' ? value : '';
  };

  const insertAtCursor = (
    ref: React.RefObject<HTMLInputElement | HTMLTextAreaElement>,
    current: string,
    setter: (v: string) => void,
    variable: string,
  ) => {
    const el = ref.current;
    if (el) {
      const start = el.selectionStart ?? current.length;
      const end = el.selectionEnd ?? current.length;
      const next = current.slice(0, start) + variable + current.slice(end);
      setter(next);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start + variable.length, start + variable.length);
      });
    } else {
      setter(current + variable);
    }
  };

  const handleInsertVariable = (variable: string) => {
    if (focusedField === 'subject') {
      insertAtCursor(
        subjectInputRef as React.RefObject<HTMLInputElement>,
        currentSubject,
        setCurrentSubject,
        variable,
      );
      return;
    }
    if (focusedField === 'preheader') {
      insertAtCursor(
        preheaderInputRef as React.RefObject<HTMLInputElement>,
        currentPreheader,
        setCurrentPreheader,
        variable,
      );
      return;
    }
    const block = currentBlocks.find((b) => b.id === selectedBlockId);
    if (block && block.type === 'text') {
      handleUpdateBlock(block.id, {
        ...block.content,
        text: `${getContentText(block.content)}${variable}`,
      });
    }
  };

  const ensureCampaignIdForUpload = async (): Promise<string> => {
    if (campaignId) return campaignId;

    const response = await api.post<{ id: string }>('/campaigns', {
      channelType: 'EMAIL',
      name: draft.name || `Campagne email ${new Date().toLocaleDateString('fr-FR')}`,
      status: 'DRAFT',
    });
    useCampaignStore.setState({ selectedCampaignId: response.data.id });
    return response.data.id;
  };

  const triggerImageUpload = (onUploaded: (uploadedImage: UploadedImage) => void) => {
    pendingImageUploadRef.current = onUploaded;
    fileInputRef.current?.click();
  };

  const uploadImageFile = async (
    file: File | null,
    onUploaded?: (uploadedImage: UploadedImage) => void,
  ) => {
    if (!file) return;

    const validation = imageUploadService.validateImage(file);
    if (!validation.valid) {
      alert(validation.error);
      pendingImageUploadRef.current = null;
      return;
    }

    try {
      setIsUploadingImage(true);

      const realCampaignId = await ensureCampaignIdForUpload();
      const uploadedImage = await imageUploadService.uploadImage(file, realCampaignId);
      setUploadedImages([...uploadedImages, uploadedImage]);
      onUploaded?.(uploadedImage);
      void loadCampaignImages();
    } catch (error) {
      alert(
        "Erreur lors de l'upload: " + (error instanceof Error ? error.message : 'Erreur inconnue'),
      );
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    const pendingUpload = pendingImageUploadRef.current;

    await uploadImageFile(file, (uploadedImage) => {
      if (pendingUpload) {
        pendingUpload(uploadedImage);
        return;
      }

      const selectedBlock = blocks.find((b) => b.id === selectedBlockId);
      if (selectedBlock && selectedBlock.type === 'image') {
        handleUpdateBlock(selectedBlock.id, {
          src: uploadedImage.url,
          alt: uploadedImage.name,
        });
      }
    });

    pendingImageUploadRef.current = null;

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const updateNestedColumnBlock = (
    blockId: string,
    columnIndex: number,
    nestedIndex: number,
    nextContent: Record<string, unknown>,
  ) => {
    updateColumnsContent(blockId, (state) => {
      const nextColumns = [...state.columns];
      const target = nextColumns[columnIndex] || { blocks: [] };
      const nextBlocks = [...target.blocks];
      const nestedBlock = nextBlocks[nestedIndex];

      if (!nestedBlock) return state;

      nextBlocks[nestedIndex] = {
        ...nestedBlock,
        content: nextContent,
      };
      target.blocks = nextBlocks;
      nextColumns[columnIndex] = target;
      return { layout: state.layout, columns: nextColumns };
    });
  };

  const getImageSrc = (content: Record<string, unknown>): string => {
    const value = content.src;
    return typeof value === 'string' ? imageUploadService.getThumbnail(value) : '';
  };
  const getTextStyle = (content: Record<string, unknown>): CSSProperties => {
    const fontSizeRaw = content.fontSize;
    const fontWeightRaw = content.fontWeight;
    const textAlignRaw = content.textAlign;
    const textAlign: CSSProperties['textAlign'] =
      textAlignRaw === 'center' || textAlignRaw === 'right' || textAlignRaw === 'justify'
        ? textAlignRaw
        : 'left';

    return {
      fontSize: typeof fontSizeRaw === 'number' ? `${fontSizeRaw}px` : '14px',
      fontFamily:
        typeof content.fontFamily === 'string'
          ? content.fontFamily
          : 'Inter, system-ui, sans-serif',
      fontWeight: typeof fontWeightRaw === 'number' ? fontWeightRaw : 400,
      textAlign,
      color: typeof content.color === 'string' ? content.color : '#111827',
    };
  };

  const getImageAlt = (content: Record<string, unknown>): string => {
    const value = content.alt;
    return typeof value === 'string' ? value : '';
  };

  const getButtonText = (content: Record<string, unknown>): string => {
    const value = content.text;
    return typeof value === 'string' && value.trim().length > 0 ? value : 'Bouton';
  };

  const getButtonUrl = (content: Record<string, unknown>): string => {
    const value = content.url;
    return typeof value === 'string' ? value : '';
  };

  const getSpacingHeight = (size: string | undefined): string => {
    if (size === 'small') return '8px';
    if (size === 'large') return '24px';
    if (size === 'extra-large') return '32px';
    return '16px';
  };

  const getDividerStyle = (content: Record<string, unknown>): CSSProperties => {
    const thickness = Number(content.thickness || 2);
    const width = typeof content.width === 'string' && content.width ? content.width : '100%';
    const color = typeof content.color === 'string' && content.color ? content.color : '#d1d5db';

    return {
      width,
      borderTopWidth: `${thickness}px`,
      borderTopStyle: 'solid',
      borderTopColor: color,
      margin: '12px auto',
    };
  };

  const getColumnsState = (content: Record<string, unknown>) => {
    const layout = Number(content.layout || 2);
    const safeLayout = [1, 2, 3].includes(layout) ? layout : 2;
    const rawColumns = Array.isArray(content.columns) ? content.columns : [];
    const columns = Array.from({ length: safeLayout }).map((_, index) => {
      const col = rawColumns[index] as Record<string, unknown> | undefined;
      const blocksInColumn = Array.isArray(col?.blocks) ? (col?.blocks as CampaignBlock[]) : [];
      return { blocks: blocksInColumn };
    });
    return { layout: safeLayout, columns };
  };

  const updateColumnsContent = (
    blockId: string,
    updater: (state: { layout: number; columns: { blocks: CampaignBlock[] }[] }) => {
      layout: number;
      columns: { blocks: CampaignBlock[] }[];
    },
  ) => {
    const current = currentBlocks.find((b) => b.id === blockId);
    if (!current) return;
    const state = getColumnsState(current.content);
    const next = updater(state);
    handleUpdateBlock(blockId, {
      layout: String(next.layout),
      columns: next.columns,
    });
  };

  const blockTypes: CampaignBlock['type'][] = [
    'text',
    'image',
    'button',
    'product',
    'divider',
    'social',
    'columns',
    'spacing',
    'html',
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12 grid grid-cols-1 lg:grid-cols-12 gap-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        disabled={isUploadingImage}
        className="hidden"
      />

      {/* ── Onglets A/B Test (si actif) ─────────────────────────────────────── */}
      {abEnabled && (
        <div className="lg:col-span-12">
          <div className="flex items-center gap-1 bg-surface-container-low rounded-xl p-1 border border-outline-variant w-fit">
            {(['main', 'A', 'B'] as const).map((v) => {
              const label =
                v === 'main' ? '📧 Email principal' : v === 'A' ? '🅰 Version A' : '🅱 Version B';
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    setActiveVariant(v);
                    setSelectedBlockId(null);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    activeVariant === v
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-secondary hover:bg-surface-container'
                  }`}
                >
                  {label}
                </button>
              );
            })}
            <span className="ml-2 text-xs font-semibold text-secondary border-l border-outline-variant/30 pl-2">
              Test A/B activé — éditez chaque variante séparément
            </span>
          </div>
        </div>
      )}

      {/* Left: Content Blocks Panel */}
      <aside className="lg:col-span-3 flex flex-col bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden self-start">
        {/* Block Types */}
        <section className="p-6">
          <h3 className="font-label-caps text-label-caps text-secondary mb-4 tracking-widest">
            BLOCS DE CONTENU
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {blockTypes.map((type) => (
              <button
                key={type}
                onClick={() => handleAddBlock(type)}
                className="flex flex-col items-center justify-center gap-2 p-3 border border-outline-variant rounded-lg bg-surface hover:bg-primary-container/10 hover:border-primary-container hover:shadow-[0_4px_12px_rgba(74,222,128,0.1)] transition-all"
              >
                <span className="material-symbols-outlined text-primary">
                  {type === 'text'
                    ? 'notes'
                    : type === 'image'
                      ? 'image'
                      : type === 'button'
                        ? 'smart_button'
                        : type === 'product'
                          ? 'shopping_bag'
                          : type === 'divider'
                            ? 'horizontal_rule'
                            : type === 'social'
                              ? 'share'
                              : type === 'columns'
                                ? 'view_column'
                                : type === 'spacing'
                                  ? 'space_bar'
                                  : 'code'}
                </span>
                <span className="font-label-caps text-label-caps">
                  {type === 'text'
                    ? 'TEXTE'
                    : type === 'image'
                      ? 'IMAGE'
                      : type === 'button'
                        ? 'BOUTON'
                        : type === 'product'
                          ? 'PRODUIT'
                          : type === 'divider'
                            ? 'SÉPARATEUR'
                            : type === 'social'
                              ? 'SOCIAL'
                              : type === 'columns'
                                ? 'COLONNES'
                                : type === 'spacing'
                                  ? 'ESPACEMENT'
                                  : 'HTML'}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Variables */}
        <section className="border-t border-outline-variant p-6">
          <h3 className="font-label-caps text-label-caps text-secondary mb-4 tracking-widest">
            VARIABLES DYNAMIQUES
          </h3>
          <div className="flex flex-col gap-3">
            {Object.entries(CONTACT_VARIABLES.email)
              .slice(0, 3)
              .map(([key, variable]) => (
                <div key={key} className="flex justify-between items-center">
                  <span className="font-body-md text-body-md text-secondary">{key}</span>
                  <button
                    onClick={() => handleInsertVariable(variable)}
                    className="bg-primary-container/20 text-primary px-2 py-1 rounded font-mono text-[12px] hover:bg-primary-container/40 transition-colors"
                  >
                    {variable}
                  </button>
                </div>
              ))}
          </div>
        </section>

        {/* HTML Import */}
        <section className="mt-auto border-t border-outline-variant p-4">
          <button
            type="button"
            onClick={() => setShowHtmlImport((v) => !v)}
            className="flex justify-between items-center w-full font-label-caps text-label-caps text-secondary hover:text-on-surface"
          >
            IMPORTER HTML
            <span className="material-symbols-outlined">
              {showHtmlImport ? 'expand_less' : 'expand_more'}
            </span>
          </button>
          {showHtmlImport && (
            <div className="mt-4 space-y-3">
              <textarea
                rows={6}
                placeholder="Collez votre HTML email ici..."
                value={htmlImportValue}
                onChange={(e) => setHtmlImportValue(e.target.value)}
                className="w-full bg-surface border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none rounded-lg px-3 py-2 font-mono text-xs text-on-surface resize-none transition-colors"
              />
              <button
                type="button"
                disabled={!htmlImportValue.trim()}
                onClick={() => {
                  const newBlock: CampaignBlock = {
                    id: `html-import-${Date.now()}`,
                    type: 'html',
                    content: { html: htmlImportValue.trim() },
                  };
                  setCurrentBlocks((prev) => [...prev, newBlock]);
                  setSelectedBlockId(newBlock.id);
                  setHtmlImportValue('');
                  setShowHtmlImport(false);
                }}
                className="w-full py-2.5 bg-primary/10 text-primary font-bold rounded-lg text-sm hover:bg-primary hover:text-on-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Insérer comme bloc HTML
              </button>
            </div>
          )}
        </section>
      </aside>

      {/* Center: Editor Canvas */}
      <div className="lg:col-span-6 flex flex-col gap-4 pb-8">
        {/* Subject Block Card */}
        <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant overflow-hidden group">
          <div className="flex items-center justify-between px-4 py-3 bg-surface-container-low border-b border-outline-variant">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[20px] text-secondary opacity-40">
                drag_indicator
              </span>
              <span className="font-label-caps text-label-caps text-primary">
                LIGNE D&apos;OBJET
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button className="text-secondary hover:text-primary transition-colors" type="button">
                <span className="material-symbols-outlined text-[18px]">expand_less</span>
              </button>
              <button className="text-secondary hover:text-primary transition-colors" type="button">
                <span className="material-symbols-outlined text-[18px]">palette</span>
              </button>
            </div>
          </div>
          <div className="p-4 bg-surface-container-lowest">
            <div className="flex items-center gap-4 mb-3 pb-3 border-b border-outline-variant/30 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-1">
                <button type="button" className="p-1 hover:bg-surface-container-high rounded">
                  <span className="material-symbols-outlined text-[18px]">format_bold</span>
                </button>
              </div>
              <div className="w-px h-4 bg-outline-variant" />
              <div className="flex items-center gap-1">
                <button type="button" className="p-1 hover:bg-surface-container-high rounded">
                  <span className="material-symbols-outlined text-[18px]">format_align_left</span>
                </button>
                <button type="button" className="p-1 hover:bg-surface-container-high rounded">
                  <span className="material-symbols-outlined text-[18px]">format_align_center</span>
                </button>
                <button type="button" className="p-1 hover:bg-surface-container-high rounded">
                  <span className="material-symbols-outlined text-[18px]">format_align_right</span>
                </button>
              </div>
            </div>
            <input
              ref={subjectInputRef}
              type="text"
              value={currentSubject}
              onChange={(e) => setCurrentSubject(e.target.value)}
              onFocus={() => setFocusedField('subject')}
              onBlur={() => setFocusedField(null)}
              placeholder="Sujet accrocheur..."
              maxLength={120}
              className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2 font-body-md text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
            />
          </div>
        </div>

        {/* Preheader Block Card */}
        <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant overflow-hidden group">
          <div className="flex items-center justify-between px-4 py-3 bg-surface-container-low border-b border-outline-variant">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[20px] text-secondary opacity-40">
                drag_indicator
              </span>
              <span className="font-label-caps text-label-caps text-primary">
                PRÉVISUALISATION (OPTIONNEL)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button className="text-secondary hover:text-primary transition-colors" type="button">
                <span className="material-symbols-outlined text-[18px]">expand_less</span>
              </button>
              <button className="text-secondary hover:text-primary transition-colors" type="button">
                <span className="material-symbols-outlined text-[18px]">palette</span>
              </button>
            </div>
          </div>
          <div className="p-4 bg-surface-container-lowest">
            <div className="flex items-center gap-4 mb-3 pb-3 border-b border-outline-variant/30 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-1">
                <button type="button" className="p-1 hover:bg-surface-container-high rounded">
                  <span className="material-symbols-outlined text-[18px]">format_bold</span>
                </button>
              </div>
              <div className="w-px h-4 bg-outline-variant" />
              <div className="flex items-center gap-1">
                <button type="button" className="p-1 hover:bg-surface-container-high rounded">
                  <span className="material-symbols-outlined text-[18px]">format_align_left</span>
                </button>
                <button type="button" className="p-1 hover:bg-surface-container-high rounded">
                  <span className="material-symbols-outlined text-[18px]">format_align_center</span>
                </button>
                <button type="button" className="p-1 hover:bg-surface-container-high rounded">
                  <span className="material-symbols-outlined text-[18px]">format_align_right</span>
                </button>
              </div>
            </div>
            <input
              ref={preheaderInputRef}
              type="text"
              value={currentPreheader}
              onChange={(e) => setCurrentPreheader(e.target.value)}
              onFocus={() => setFocusedField('preheader')}
              onBlur={() => setFocusedField(null)}
              placeholder="Texte visible avant d'ouvrir..."
              maxLength={100}
              className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2 font-body-md text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
            />
          </div>
        </div>

        {/* Canvas Blocks */}
        {currentBlocks.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant flex flex-col items-center justify-center py-16 text-center">
            <span className="material-symbols-outlined text-4xl text-secondary mb-3">add_box</span>
            <p className="font-body-md text-body-md text-secondary">
              Cliquez sur un bloc à gauche pour commencer
            </p>
          </div>
        ) : (
          currentBlocks.map((block) => (
            <div
              key={block.id}
              draggable
              onDragStart={(e) => handleDragStart(e, block.id)}
              onDragOver={(e) => handleDragOver(e, block.id)}
              onDrop={(e) => handleDrop(e, block.id)}
              onDragEnd={handleDragEnd}
              onClick={() => {
                setSelectedBlockId(block.id);
                setFocusedField('block');
              }}
              className={`bg-surface-container-lowest rounded-xl shadow-sm border overflow-hidden group transition-all cursor-pointer ${
                dragOverBlockId === block.id && draggedBlockId !== block.id
                  ? 'border-primary border-dashed bg-primary/5'
                  : draggedBlockId === block.id
                    ? 'opacity-40 border-outline-variant'
                    : selectedBlockId === block.id
                      ? 'border-primary ring-1 ring-primary/20'
                      : 'border-outline-variant hover:border-primary/50'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-surface-container-low border-b border-outline-variant">
                <div className="flex items-center gap-3">
                  <span
                    className="material-symbols-outlined text-[20px] text-secondary opacity-40 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity select-none"
                    title="Glisser pour réordonner"
                  >
                    drag_indicator
                  </span>
                  <span className="font-label-caps text-label-caps text-primary">
                    {block.type === 'text'
                      ? 'TEXTE'
                      : block.type === 'image'
                        ? 'IMAGE'
                        : block.type === 'button'
                          ? 'BOUTON'
                          : block.type === 'product'
                            ? 'PRODUIT'
                            : block.type === 'divider'
                              ? 'SÉPARATEUR'
                              : block.type === 'social'
                                ? 'SOCIAL'
                                : block.type === 'columns'
                                  ? 'COLONNES'
                                  : block.type === 'spacing'
                                    ? 'ESPACEMENT'
                                    : 'HTML'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCollapse(block.id);
                    }}
                    className="text-secondary hover:text-primary transition-colors"
                    title={collapsedBlocks.has(block.id) ? 'Développer' : 'Réduire'}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {collapsedBlocks.has(block.id) ? 'expand_more' : 'expand_less'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPaletteBlockId(paletteBlockId === block.id ? null : block.id);
                    }}
                    className={`transition-colors ${paletteBlockId === block.id ? 'text-primary' : 'text-secondary hover:text-primary'}`}
                    title="Couleur d'arrière-plan"
                  >
                    <span className="material-symbols-outlined text-[18px]">palette</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveBlock(block.id);
                    }}
                    className="text-secondary hover:text-error transition-colors"
                    title="Supprimer"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>

              {/* Palette Panel */}
              {paletteBlockId === block.id && (
                <div
                  className="px-4 py-3 bg-surface-container border-b border-outline-variant flex items-center gap-4 flex-wrap"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider">
                      Fond
                    </span>
                    <input
                      type="color"
                      value={
                        typeof block.content.backgroundColor === 'string'
                          ? block.content.backgroundColor
                          : '#ffffff'
                      }
                      onChange={(e) =>
                        handleUpdateBlock(block.id, {
                          ...block.content,
                          backgroundColor: e.target.value,
                        })
                      }
                      className="w-7 h-7 rounded-full border border-outline-variant cursor-pointer p-0"
                      title="Couleur de fond"
                    />
                    {typeof block.content.backgroundColor === 'string' && (
                      <button
                        type="button"
                        onClick={() => {
                          const { backgroundColor: _bg, ...rest } = block.content as Record<
                            string,
                            unknown
                          >;
                          handleUpdateBlock(block.id, rest);
                        }}
                        className="text-[11px] text-secondary hover:text-error ml-1"
                      >
                        Réinitialiser
                      </button>
                    )}
                  </div>
                  <div className="w-px h-4 bg-outline-variant" />
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider">
                      Texte
                    </span>
                    <input
                      type="color"
                      value={
                        typeof block.content.color === 'string' ? block.content.color : '#111827'
                      }
                      onChange={(e) =>
                        handleUpdateBlock(block.id, { ...block.content, color: e.target.value })
                      }
                      className="w-7 h-7 rounded-full border border-outline-variant cursor-pointer p-0"
                      title="Couleur du texte"
                    />
                  </div>
                  <div className="w-px h-4 bg-outline-variant" />
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-secondary">Padding</span>
                    <select
                      value={String(block.content.padding || 'normal')}
                      onChange={(e) =>
                        handleUpdateBlock(block.id, { ...block.content, padding: e.target.value })
                      }
                      className="bg-surface border border-outline-variant rounded px-2 py-1 text-xs outline-none"
                    >
                      <option value="none">Aucun</option>
                      <option value="small">Petit</option>
                      <option value="normal">Normal</option>
                      <option value="large">Grand</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Card Content */}
              {!collapsedBlocks.has(block.id) && (
                <div
                  className="p-4 bg-surface-container-lowest"
                  style={{
                    backgroundColor:
                      typeof block.content.backgroundColor === 'string'
                        ? block.content.backgroundColor
                        : undefined,
                    padding:
                      block.content.padding === 'none'
                        ? '8px 16px'
                        : block.content.padding === 'small'
                          ? '8px'
                          : block.content.padding === 'large'
                            ? '24px'
                            : undefined,
                  }}
                >
                  {/* Hover formatting toolbar */}
                  <div className="flex items-center gap-4 mb-3 pb-3 border-b border-outline-variant/30 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="p-1 hover:bg-surface-container-high rounded"
                        title="Gras"
                      >
                        <span className="material-symbols-outlined text-[18px]">format_bold</span>
                      </button>
                      <button
                        type="button"
                        className="p-1 hover:bg-surface-container-high rounded"
                        title="Italique"
                      >
                        <span className="material-symbols-outlined text-[18px]">format_italic</span>
                      </button>
                    </div>
                    <div className="w-px h-4 bg-outline-variant" />
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateBlock(block.id, { ...block.content, textAlign: 'left' });
                        }}
                        className="p-1 hover:bg-surface-container-high rounded"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          format_align_left
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateBlock(block.id, { ...block.content, textAlign: 'center' });
                        }}
                        className="p-1 hover:bg-surface-container-high rounded"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          format_align_center
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateBlock(block.id, { ...block.content, textAlign: 'right' });
                        }}
                        className="p-1 hover:bg-surface-container-high rounded"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          format_align_right
                        </span>
                      </button>
                    </div>
                    <div className="w-px h-4 bg-outline-variant" />
                    <input
                      type="color"
                      value={
                        typeof block.content.color === 'string' ? block.content.color : '#111827'
                      }
                      onChange={(e) => {
                        e.stopPropagation();
                        handleUpdateBlock(block.id, { ...block.content, color: e.target.value });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-5 h-5 rounded-full border border-outline-variant cursor-pointer p-0 bg-transparent"
                      title="Couleur du texte"
                    />
                  </div>

                  {/* Block-specific content */}
                  {block.type === 'text' && (
                    <textarea
                      value={getContentText(block.content)}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleUpdateBlock(block.id, { ...block.content, text: e.target.value });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onFocus={() => {
                        setSelectedBlockId(block.id);
                        setFocusedField('block');
                      }}
                      rows={3}
                      className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2 font-body-md text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors resize-y min-h-[80px]"
                      style={getTextStyle(block.content)}
                    />
                  )}
                  {block.type === 'button' && (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={getButtonText(block.content)}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleUpdateBlock(block.id, {
                            text: e.target.value,
                            url: getButtonUrl(block.content),
                          });
                        }}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Texte du bouton"
                        className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2 font-body-md text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                      />
                      <input
                        type="url"
                        value={getButtonUrl(block.content)}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleUpdateBlock(block.id, {
                            text: getButtonText(block.content),
                            url: e.target.value,
                          });
                        }}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="URL du lien"
                        className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2 font-body-md text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                      />
                    </div>
                  )}
                  {block.type === 'image' && (
                    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                      <div className="w-full bg-surface-container rounded-lg flex items-center justify-center overflow-hidden min-h-[96px]">
                        {getImageSrc(block.content) ? (
                          <img
                            src={getImageSrc(block.content)}
                            alt={getImageAlt(block.content) || 'Email image'}
                            className="w-full h-32 object-contain"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-2 py-8 text-secondary">
                            <span className="material-symbols-outlined text-3xl">image</span>
                            <span className="text-xs">Aucune image sélectionnée</span>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          triggerImageUpload((img) => {
                            handleUpdateBlock(block.id, { src: img.url, alt: img.name });
                          })
                        }
                        disabled={isUploadingImage}
                        className="w-full py-2.5 bg-primary/10 text-primary font-bold rounded-lg text-sm hover:bg-primary/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {isUploadingImage ? 'hourglass_empty' : 'upload'}
                        </span>
                        {isUploadingImage ? 'Envoi en cours...' : 'Insérer une image'}
                      </button>
                      <input
                        type="text"
                        value={getImageAlt(block.content)}
                        onChange={(e) =>
                          handleUpdateBlock(block.id, {
                            src: getImageSrc(block.content),
                            alt: e.target.value,
                          })
                        }
                        placeholder="Texte alternatif (alt)..."
                        className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                      />
                    </div>
                  )}
                  {block.type === 'product' &&
                    (() => {
                      const product = block.content as Record<string, unknown>;
                      return (
                        <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                          <div
                            className="w-full bg-surface-container rounded-lg flex items-center justify-center overflow-hidden"
                            style={{ minHeight: 80 }}
                          >
                            {typeof product.image === 'string' && product.image ? (
                              <img
                                src={imageUploadService.getThumbnail(product.image)}
                                alt={String(product.title || '')}
                                className="w-full h-28 object-contain"
                              />
                            ) : (
                              <span className="material-symbols-outlined text-4xl text-secondary py-4">
                                shopping_bag
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={String(product.title || '')}
                              onChange={(e) =>
                                handleUpdateBlock(block.id, { ...product, title: e.target.value })
                              }
                              placeholder="Titre du produit"
                              className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                            />
                            <input
                              type="text"
                              value={String(product.price || '')}
                              onChange={(e) =>
                                handleUpdateBlock(block.id, { ...product, price: e.target.value })
                              }
                              placeholder="Prix"
                              className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                            />
                          </div>
                          <textarea
                            value={String(product.description || '')}
                            onChange={(e) =>
                              handleUpdateBlock(block.id, {
                                ...product,
                                description: e.target.value,
                              })
                            }
                            rows={2}
                            placeholder="Description..."
                            className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors resize-none"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                triggerImageUpload((img) => {
                                  handleUpdateBlock(block.id, { ...product, image: img.url });
                                })
                              }
                              disabled={isUploadingImage}
                              className="py-2 px-3 bg-primary/10 text-primary font-bold rounded-lg text-xs hover:bg-primary/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[16px]">upload</span>{' '}
                              Image
                            </button>
                            <input
                              type="url"
                              value={String(product.url || '')}
                              onChange={(e) =>
                                handleUpdateBlock(block.id, { ...product, url: e.target.value })
                              }
                              placeholder="URL lien..."
                              className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                            />
                          </div>
                        </div>
                      );
                    })()}
                  {block.type === 'divider' && (
                    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                      <div className="py-2">
                        <div className="mx-auto" style={getDividerStyle(block.content)} />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[11px] text-secondary font-semibold">
                            Épaisseur
                          </label>
                          <input
                            type="range"
                            min={1}
                            max={8}
                            value={Number(block.content.thickness || 2)}
                            onChange={(e) =>
                              handleUpdateBlock(block.id, {
                                ...block.content,
                                thickness: Number(e.target.value),
                              })
                            }
                            className="w-full mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-secondary font-semibold">
                            Couleur
                          </label>
                          <input
                            type="color"
                            value={String(block.content.color || '#d1d5db')}
                            onChange={(e) =>
                              handleUpdateBlock(block.id, {
                                ...block.content,
                                color: e.target.value,
                              })
                            }
                            className="w-full mt-1 h-9 rounded border border-outline-variant"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-secondary font-semibold">
                            Largeur
                          </label>
                          <select
                            value={String(block.content.width || '100%')}
                            onChange={(e) =>
                              handleUpdateBlock(block.id, {
                                ...block.content,
                                width: e.target.value,
                              })
                            }
                            className="w-full mt-1 bg-surface border border-outline-variant rounded px-2 py-1.5 text-xs outline-none"
                          >
                            <option value="100%">100%</option>
                            <option value="75%">75%</option>
                            <option value="50%">50%</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                  {block.type === 'social' && (
                    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                      {[
                        { id: 'facebook', name: 'Facebook', color: '#1877F2', icon: 'f' },
                        { id: 'instagram', name: 'Instagram', color: '#E4405F', icon: '📷' },
                        { id: 'tiktok', name: 'TikTok', color: '#000', icon: '♪' },
                        { id: 'linkedin', name: 'LinkedIn', color: '#0A66C2', icon: 'in' },
                      ].map((network) => {
                        const isEnabled = Boolean(
                          (block.content as Record<string, unknown>)?.[network.id],
                        );
                        const url =
                          ((block.content as Record<string, unknown>)?.[network.id] as string) ||
                          '';
                        return (
                          <div key={network.id} className="space-y-2">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isEnabled}
                                onChange={(e) =>
                                  handleUpdateBlock(block.id, {
                                    ...block.content,
                                    [network.id]: e.target.checked
                                      ? `https://${network.id}.com/votre-profil`
                                      : '',
                                  })
                                }
                                className="w-4 h-4 rounded cursor-pointer"
                              />
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                style={{ backgroundColor: network.color }}
                              >
                                {network.icon}
                              </div>
                              <label className="text-sm font-semibold text-on-surface">
                                {network.name}
                              </label>
                            </div>
                            {isEnabled && (
                              <input
                                type="url"
                                value={url}
                                onChange={(e) =>
                                  handleUpdateBlock(block.id, {
                                    ...block.content,
                                    [network.id]: e.target.value,
                                  })
                                }
                                placeholder={`https://${network.id}.com/...`}
                                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {block.type === 'columns' && (
                    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        {['1', '2', '3'].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => {
                              const colCount = parseInt(num);
                              updateColumnsContent(block.id, (state) => ({
                                layout: colCount,
                                columns: Array.from({ length: colCount }).map(
                                  (_, i) => state.columns[i] || { blocks: [] },
                                ),
                              }));
                            }}
                            className={`flex-1 py-1.5 rounded-lg font-bold text-sm transition-all ${String(getColumnsState(block.content).layout) === num ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface hover:bg-surface-container-high'}`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                      <div
                        className="grid gap-2"
                        style={{
                          gridTemplateColumns: `repeat(${getColumnsState(block.content).layout}, minmax(0, 1fr))`,
                        }}
                      >
                        {getColumnsState(block.content).columns.map((column, columnIndex) => (
                          <div
                            key={columnIndex}
                            className="min-h-14 bg-surface-container rounded-lg border border-outline-variant/30 p-2 space-y-1"
                          >
                            <div className="text-[10px] text-secondary font-bold uppercase tracking-wider mb-1">
                              Col. {columnIndex + 1}
                            </div>
                            {column.blocks.map((nested) => (
                              <div
                                key={nested.id}
                                className="rounded bg-primary/5 px-2 py-1 text-[10px] text-on-surface flex justify-between items-center"
                              >
                                <span>
                                  {nested.type === 'text'
                                    ? (nested.content.text as string) || 'Texte'
                                    : nested.type === 'button'
                                      ? (nested.content.text as string) || 'Bouton'
                                      : nested.type}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateColumnsContent(block.id, (state) => {
                                      const cols = [...state.columns];
                                      const col = cols[columnIndex] || { blocks: [] };
                                      col.blocks = col.blocks.filter((b) => b.id !== nested.id);
                                      cols[columnIndex] = col;
                                      return { layout: state.layout, columns: cols };
                                    })
                                  }
                                  className="text-error ml-1 hover:opacity-70"
                                >
                                  <span className="material-symbols-outlined text-[12px]">
                                    close
                                  </span>
                                </button>
                              </div>
                            ))}
                            <div className="flex gap-1 flex-wrap mt-1">
                              {(['text', 'button', 'image'] as CampaignBlock['type'][]).map((t) => (
                                <button
                                  key={t}
                                  type="button"
                                  onClick={() =>
                                    updateColumnsContent(block.id, (state) => {
                                      const cols = [...state.columns];
                                      const col = cols[columnIndex] || { blocks: [] };
                                      col.blocks = [...col.blocks, createBlockByType(t)];
                                      cols[columnIndex] = col;
                                      return { layout: state.layout, columns: cols };
                                    })
                                  }
                                  className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded hover:bg-primary/20"
                                >
                                  +{t}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {block.type === 'spacing' && (
                    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        {(['small', 'medium', 'large', 'extra-large'] as const).map((size) => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => handleUpdateBlock(block.id, { size })}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${((block.content as Record<string, unknown>)?.size as string) === size ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface hover:bg-surface-container-high'}`}
                          >
                            {size === 'small'
                              ? 'S'
                              : size === 'medium'
                                ? 'M'
                                : size === 'large'
                                  ? 'L'
                                  : 'XL'}
                          </button>
                        ))}
                      </div>
                      <div
                        className="w-full rounded-lg bg-primary/10 flex items-center justify-center"
                        style={{
                          height: getSpacingHeight(
                            (block.content as Record<string, unknown>)?.size as string | undefined,
                          ),
                        }}
                      >
                        <span className="text-[10px] text-secondary">
                          {String((block.content as Record<string, unknown>)?.size || 'medium')}
                        </span>
                      </div>
                    </div>
                  )}
                  {block.type === 'html' && (
                    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                      <textarea
                        value={((block.content as Record<string, unknown>)?.html as string) || ''}
                        onChange={(e) => handleUpdateBlock(block.id, { html: e.target.value })}
                        rows={4}
                        placeholder="<div><p>Mon contenu HTML</p></div>"
                        className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 font-mono text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors resize-y"
                        onClick={(e) => e.stopPropagation()}
                      />
                      {((block.content as Record<string, unknown>)?.html as string) && (
                        <div className="rounded-lg border border-outline-variant bg-white p-3 text-xs overflow-auto max-h-24">
                          <div
                            dangerouslySetInnerHTML={{
                              __html: (block.content as Record<string, unknown>)?.html as string,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="w-full bg-primary-container text-on-primary-fixed-variant font-headline-md text-headline-md py-4 rounded-xl shadow-lg hover:bg-primary-fixed transition-colors mt-2"
        >
          Enregistrer le contenu
        </button>
      </div>

      {/* Right: Mobile Preview + Images */}
      <div className="lg:col-span-3 space-y-6">
        {/* ÉDITER BLOC panel removed — editing is now inline in each block card */}
        {selectedBlockId && false && (
          <div className="hidden">
            <div>
              {(() => {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const block = currentBlocks.find((b) => b.id === selectedBlockId)!;
                if (!block) return null;

                if (block.type === 'text') {
                  const currentStyle = getTextStyle(block.content);
                  return (
                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-on-surface">Texte</label>
                      <textarea
                        value={getContentText(block.content)}
                        onChange={(e) =>
                          handleUpdateBlock(block.id, {
                            ...block.content,
                            text: e.target.value,
                          })
                        }
                        rows={4}
                        className="w-full bg-surface border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none rounded-lg px-3 py-2 font-body-md text-body-md transition-colors"
                      />

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-secondary">Taille</label>
                          <input
                            type="number"
                            min={10}
                            max={42}
                            value={parseInt(String(currentStyle.fontSize).replace('px', ''), 10)}
                            onChange={(e) =>
                              handleUpdateBlock(block.id, {
                                ...block.content,
                                fontSize: Number(e.target.value),
                              })
                            }
                            className="w-full mt-1 bg-surface border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none rounded-lg px-3 py-2 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-secondary">Graisse</label>
                          <select
                            value={Number(currentStyle.fontWeight)}
                            onChange={(e) =>
                              handleUpdateBlock(block.id, {
                                ...block.content,
                                fontWeight: Number(e.target.value),
                              })
                            }
                            className="w-full mt-1 bg-surface border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none rounded-lg px-3 py-2 transition-colors"
                          >
                            <option value={400}>Normal</option>
                            <option value={500}>Medium</option>
                            <option value={600}>Semi-bold</option>
                            <option value={700}>Bold</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-secondary">Police</label>
                          <select
                            value={String(currentStyle.fontFamily)}
                            onChange={(e) =>
                              handleUpdateBlock(block.id, {
                                ...block.content,
                                fontFamily: e.target.value,
                              })
                            }
                            className="w-full mt-1 bg-surface border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none rounded-lg px-3 py-2 transition-colors"
                          >
                            <option value="Inter, system-ui, sans-serif">Inter</option>
                            <option value="Manrope, system-ui, sans-serif">Manrope</option>
                            <option value="Georgia, serif">Georgia</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-secondary">Alignement</label>
                          <select
                            value={String(currentStyle.textAlign)}
                            onChange={(e) =>
                              handleUpdateBlock(block.id, {
                                ...block.content,
                                textAlign: e.target.value,
                              })
                            }
                            className="w-full mt-1 bg-surface border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none rounded-lg px-3 py-2 transition-colors"
                          >
                            <option value="left">Gauche</option>
                            <option value="center">Centre</option>
                            <option value="right">Droite</option>
                            <option value="justify">Justifié</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-secondary">
                          Couleur du texte
                        </label>
                        <input
                          type="color"
                          value={String(currentStyle.color)}
                          onChange={(e) =>
                            handleUpdateBlock(block.id, {
                              ...block.content,
                              color: e.target.value,
                            })
                          }
                          className="w-full mt-1 h-10 bg-surface-container-lowest border-none ring-1 ring-outline-variant rounded-lg"
                        />
                      </div>
                    </div>
                  );
                } else if (block.type === 'image') {
                  return (
                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-on-surface">Image</label>
                      <div className="space-y-2">
                        <button
                          onClick={() =>
                            triggerImageUpload((uploadedImage) => {
                              handleUpdateBlock(block.id, {
                                src: uploadedImage.url,
                                alt: uploadedImage.name,
                              });
                            })
                          }
                          disabled={isUploadingImage}
                          className="w-full py-3 px-4 bg-primary/10 text-primary font-bold rounded-lg hover:bg-primary/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="material-symbols-outlined">
                            {isUploadingImage ? 'hourglass_empty' : 'upload'}
                          </span>
                          {isUploadingImage ? 'Envoi en cours...' : 'Insérer une image'}
                        </button>
                        {getImageSrc(block.content) && (
                          <div className="p-2 bg-surface-container rounded">
                            <img
                              src={getImageSrc(block.content)}
                              alt="preview"
                              className="w-full h-24 object-contain rounded"
                            />
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-secondary">Alt Text</label>
                        <input
                          type="text"
                          value={getImageAlt(block.content)}
                          onChange={(e) =>
                            handleUpdateBlock(block.id, {
                              src: getImageSrc(block.content),
                              alt: e.target.value,
                            })
                          }
                          placeholder="Description de l'image..."
                          className="w-full bg-surface border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none rounded-lg px-3 py-2 text-sm transition-colors"
                        />
                      </div>
                    </div>
                  );
                } else if (block.type === 'button') {
                  return (
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-semibold text-on-surface">
                          Texte du bouton
                        </label>
                        <input
                          type="text"
                          value={getContentText(block.content)}
                          onChange={(e) =>
                            handleUpdateBlock(block.id, {
                              text: e.target.value,
                              url: (block.content.url as string) || '',
                            })
                          }
                          className="w-full mt-1 bg-surface border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none rounded-lg px-3 py-2 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-on-surface">URL</label>
                        <input
                          type="url"
                          value={(block.content.url as string) || ''}
                          onChange={(e) =>
                            handleUpdateBlock(block.id, {
                              text: getContentText(block.content),
                              url: e.target.value,
                            })
                          }
                          placeholder="https://..."
                          className="w-full mt-1 bg-surface border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none rounded-lg px-3 py-2 transition-colors"
                        />
                      </div>
                    </div>
                  );
                } else if (block.type === 'social') {
                  const socialNetworks = [
                    {
                      id: 'facebook',
                      name: 'Facebook',
                      url: 'https://facebook.com',
                      icon: '🔵 f',
                      color: '#1877F2',
                    },
                    {
                      id: 'instagram',
                      name: 'Instagram',
                      url: 'https://instagram.com',
                      icon: '🎨 📷',
                      color: '#E4405F',
                    },
                    {
                      id: 'tiktok',
                      name: 'TikTok',
                      url: 'https://tiktok.com',
                      icon: '🎵 ♪',
                      color: '#000000',
                    },
                    {
                      id: 'linkedin',
                      name: 'LinkedIn',
                      url: 'https://linkedin.com',
                      icon: '🔗 in',
                      color: '#0A66C2',
                    },
                  ];

                  return (
                    <div className="space-y-4">
                      <p className="text-xs text-on-surface-variant font-semibold uppercase tracking-widest">
                        Réseaux sociaux
                      </p>
                      <p className="text-xs text-on-surface-variant">
                        Activez les réseaux à afficher et entrez vos URLs
                      </p>
                      {socialNetworks.map((network) => {
                        const isEnabled = Boolean(
                          (block.content as Record<string, unknown>)?.[network.id] as string,
                        );
                        const url =
                          ((block.content as Record<string, unknown>)?.[network.id] as string) ||
                          '';

                        return (
                          <div
                            key={network.id}
                            className="border border-outline-variant/30 rounded-lg p-3"
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <input
                                type="checkbox"
                                checked={isEnabled}
                                onChange={(e) => {
                                  handleUpdateBlock(block.id, {
                                    ...block.content,
                                    [network.id]: e.target.checked
                                      ? `https://${network.id}.com/votre-profil`
                                      : '',
                                  });
                                }}
                                className="w-5 h-5 rounded border-outline-variant cursor-pointer"
                              />
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                                style={{ backgroundColor: network.color }}
                                title={network.name}
                              >
                                {network.icon.split(' ')[1]}
                              </div>
                              <label className="text-sm font-semibold text-on-surface flex-1 cursor-pointer">
                                {network.name}
                              </label>
                            </div>
                            {isEnabled && (
                              <input
                                type="url"
                                value={url}
                                onChange={(e) =>
                                  handleUpdateBlock(block.id, {
                                    ...block.content,
                                    [network.id]: e.target.value,
                                  })
                                }
                                placeholder={`https://${network.id}.com/votre-profil`}
                                className="w-full bg-surface border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none rounded-lg px-3 py-2 text-sm transition-colors"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                } else if (block.type === 'columns') {
                  const currentColumnsState = getColumnsState(block.content);
                  const nestedTypes: CampaignBlock['type'][] = [
                    'text',
                    'image',
                    'button',
                    'divider',
                    'spacing',
                    'html',
                  ];
                  return (
                    <div className="space-y-4">
                      <label className="text-sm font-semibold text-on-surface">
                        Nombre de colonnes
                      </label>
                      <div className="flex gap-2">
                        {['1', '2', '3'].map((num) => (
                          <button
                            key={num}
                            onClick={() => {
                              const colCount = parseInt(num);
                              updateColumnsContent(block.id, (state) => {
                                const nextColumns = Array.from({ length: colCount }).map(
                                  (_, index) => state.columns[index] || { blocks: [] },
                                );
                                return { layout: colCount, columns: nextColumns };
                              });
                            }}
                            className={`flex-1 py-2 px-3 rounded-lg font-bold transition-all ${
                              String(currentColumnsState.layout) === num
                                ? 'bg-primary text-on-primary'
                                : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-on-surface-variant">
                        Chaque colonne accepte les blocs imbriqués (texte, images, etc.)
                      </p>

                      <div className="space-y-3">
                        {currentColumnsState.columns.map((column, columnIndex) => (
                          <div
                            key={columnIndex}
                            className="rounded-lg border border-outline-variant/30 p-3 space-y-3"
                          >
                            <div className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                              Colonne {columnIndex + 1}
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                              {nestedTypes.map((nestedType) => (
                                <button
                                  key={nestedType}
                                  onClick={() => {
                                    updateColumnsContent(block.id, (state) => {
                                      const nextColumns = [...state.columns];
                                      const target = nextColumns[columnIndex] || { blocks: [] };
                                      const nested = createBlockByType(nestedType);
                                      target.blocks = [...target.blocks, nested];
                                      nextColumns[columnIndex] = target;
                                      return { layout: state.layout, columns: nextColumns };
                                    });
                                  }}
                                  className="rounded-md bg-surface-container-low px-2 py-1 text-[11px] font-semibold hover:bg-surface-container"
                                >
                                  + {nestedType}
                                </button>
                              ))}
                            </div>

                            {column.blocks.length === 0 ? (
                              <p className="text-xs text-on-surface-variant">Aucun élément.</p>
                            ) : (
                              <div className="space-y-2">
                                {column.blocks.map((nestedBlock, nestedIndex) => (
                                  <div
                                    key={nestedBlock.id}
                                    className="rounded-md border border-outline-variant/20 p-2 space-y-2"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-semibold uppercase text-primary">
                                        {nestedBlock.type}
                                      </span>
                                      <button
                                        onClick={() => {
                                          updateColumnsContent(block.id, (state) => {
                                            const nextColumns = [...state.columns];
                                            const target = nextColumns[columnIndex] || {
                                              blocks: [],
                                            };
                                            target.blocks = target.blocks.filter(
                                              (b) => b.id !== nestedBlock.id,
                                            );
                                            nextColumns[columnIndex] = target;
                                            return { layout: state.layout, columns: nextColumns };
                                          });
                                        }}
                                        className="text-xs text-error"
                                      >
                                        Supprimer
                                      </button>
                                    </div>

                                    {nestedBlock.type === 'text' && (
                                      <textarea
                                        value={(nestedBlock.content.text as string) || ''}
                                        onChange={(e) => {
                                          updateColumnsContent(block.id, (state) => {
                                            const nextColumns = [...state.columns];
                                            const target = nextColumns[columnIndex] || {
                                              blocks: [],
                                            };
                                            const nextBlocks = [...target.blocks];
                                            nextBlocks[nestedIndex] = {
                                              ...nestedBlock,
                                              content: {
                                                ...nestedBlock.content,
                                                text: e.target.value,
                                              },
                                            };
                                            target.blocks = nextBlocks;
                                            nextColumns[columnIndex] = target;
                                            return { layout: state.layout, columns: nextColumns };
                                          });
                                        }}
                                        rows={2}
                                        className="w-full bg-surface-container-lowest ring-1 ring-outline-variant rounded px-2 py-1 text-xs"
                                      />
                                    )}

                                    {nestedBlock.type === 'button' && (
                                      <div className="space-y-2">
                                        <input
                                          type="text"
                                          value={(nestedBlock.content.text as string) || ''}
                                          onChange={(e) => {
                                            updateColumnsContent(block.id, (state) => {
                                              const nextColumns = [...state.columns];
                                              const target = nextColumns[columnIndex] || {
                                                blocks: [],
                                              };
                                              const nextBlocks = [...target.blocks];
                                              nextBlocks[nestedIndex] = {
                                                ...nestedBlock,
                                                content: {
                                                  ...nestedBlock.content,
                                                  text: e.target.value,
                                                },
                                              };
                                              target.blocks = nextBlocks;
                                              nextColumns[columnIndex] = target;
                                              return { layout: state.layout, columns: nextColumns };
                                            });
                                          }}
                                          className="w-full bg-surface-container-lowest ring-1 ring-outline-variant rounded px-2 py-1 text-xs"
                                          placeholder="Texte du bouton"
                                        />

                                        <input
                                          type="url"
                                          value={(nestedBlock.content.url as string) || ''}
                                          onChange={(e) => {
                                            updateColumnsContent(block.id, (state) => {
                                              const nextColumns = [...state.columns];
                                              const target = nextColumns[columnIndex] || {
                                                blocks: [],
                                              };
                                              const nextBlocks = [...target.blocks];
                                              nextBlocks[nestedIndex] = {
                                                ...nestedBlock,
                                                content: {
                                                  ...nestedBlock.content,
                                                  url: e.target.value,
                                                },
                                              };
                                              target.blocks = nextBlocks;
                                              nextColumns[columnIndex] = target;
                                              return { layout: state.layout, columns: nextColumns };
                                            });
                                          }}
                                          className="w-full bg-surface-container-lowest ring-1 ring-outline-variant rounded px-2 py-1 text-xs"
                                          placeholder="https://..."
                                        />
                                      </div>
                                    )}

                                    {nestedBlock.type === 'image' && (
                                      <div className="space-y-2">
                                        <button
                                          onClick={() =>
                                            triggerImageUpload((uploadedImage) => {
                                              updateNestedColumnBlock(
                                                block.id,
                                                columnIndex,
                                                nestedIndex,
                                                {
                                                  ...nestedBlock.content,
                                                  src: uploadedImage.url,
                                                  alt: uploadedImage.name,
                                                },
                                              );
                                            })
                                          }
                                          disabled={isUploadingImage}
                                          className="w-full rounded-md bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20 disabled:opacity-50"
                                        >
                                          {isUploadingImage ? 'Envoi...' : 'Insérer une image'}
                                        </button>
                                        <input
                                          type="url"
                                          value={(nestedBlock.content.src as string) || ''}
                                          onChange={(e) => {
                                            updateNestedColumnBlock(
                                              block.id,
                                              columnIndex,
                                              nestedIndex,
                                              {
                                                ...nestedBlock.content,
                                                src: e.target.value,
                                              },
                                            );
                                          }}
                                          className="w-full bg-surface-container-lowest ring-1 ring-outline-variant rounded px-2 py-1 text-xs"
                                          placeholder="URL d'image (https://...)"
                                        />
                                      </div>
                                    )}

                                    {nestedBlock.type === 'divider' && (
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                          <label className="text-[11px] font-semibold text-on-surface-variant">
                                            Épaisseur
                                          </label>
                                          <input
                                            type="range"
                                            min={1}
                                            max={8}
                                            value={Number(
                                              (nestedBlock.content as Record<string, unknown>)
                                                .thickness || 2,
                                            )}
                                            onChange={(e) => {
                                              updateNestedColumnBlock(
                                                block.id,
                                                columnIndex,
                                                nestedIndex,
                                                {
                                                  ...nestedBlock.content,
                                                  thickness: Number(e.target.value),
                                                },
                                              );
                                            }}
                                            className="flex-1"
                                          />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                          <div>
                                            <label className="text-[11px] font-semibold text-on-surface-variant">
                                              Couleur
                                            </label>
                                            <input
                                              type="color"
                                              value={
                                                ((nestedBlock.content as Record<string, unknown>)
                                                  .color as string) || '#d1d5db'
                                              }
                                              onChange={(e) => {
                                                updateNestedColumnBlock(
                                                  block.id,
                                                  columnIndex,
                                                  nestedIndex,
                                                  {
                                                    ...nestedBlock.content,
                                                    color: e.target.value,
                                                  },
                                                );
                                              }}
                                              className="mt-1 h-9 w-full rounded border border-outline-variant bg-transparent"
                                            />
                                          </div>
                                          <div>
                                            <label className="text-[11px] font-semibold text-on-surface-variant">
                                              Largeur
                                            </label>
                                            <select
                                              value={
                                                ((nestedBlock.content as Record<string, unknown>)
                                                  .width as string) || '100%'
                                              }
                                              onChange={(e) => {
                                                updateNestedColumnBlock(
                                                  block.id,
                                                  columnIndex,
                                                  nestedIndex,
                                                  {
                                                    ...nestedBlock.content,
                                                    width: e.target.value,
                                                  },
                                                );
                                              }}
                                              className="mt-1 w-full bg-surface-container-lowest ring-1 ring-outline-variant rounded px-2 py-1 text-xs"
                                            >
                                              <option value="100%">Pleine largeur</option>
                                              <option value="75%">75%</option>
                                              <option value="50%">50%</option>
                                              <option value="25%">25%</option>
                                            </select>
                                          </div>
                                        </div>
                                        <div className="pt-1">
                                          <div
                                            className="mx-auto"
                                            style={getDividerStyle(
                                              nestedBlock.content as Record<string, unknown>,
                                            )}
                                          />
                                        </div>
                                      </div>
                                    )}

                                    {nestedBlock.type === 'html' && (
                                      <div className="space-y-2">
                                        <label className="text-[11px] font-semibold text-on-surface-variant">
                                          Code HTML
                                        </label>
                                        <textarea
                                          value={
                                            ((nestedBlock.content as Record<string, unknown>)
                                              ?.html as string) || ''
                                          }
                                          onChange={(e) => {
                                            updateNestedColumnBlock(
                                              block.id,
                                              columnIndex,
                                              nestedIndex,
                                              {
                                                ...nestedBlock.content,
                                                html: e.target.value,
                                              },
                                            );
                                          }}
                                          rows={4}
                                          placeholder="<div><strong>Bonjour</strong></div>"
                                          className="w-full bg-surface-container-lowest ring-1 ring-outline-variant rounded px-2 py-1 text-xs font-mono"
                                        />
                                        <div className="rounded border border-outline-variant/20 bg-white p-2 text-[11px] overflow-auto max-h-28">
                                          <div
                                            dangerouslySetInnerHTML={{
                                              __html:
                                                ((nestedBlock.content as Record<string, unknown>)
                                                  ?.html as string) ||
                                                '<p style="color:#9ca3af">HTML vide</p>',
                                            }}
                                          />
                                        </div>
                                      </div>
                                    )}

                                    {nestedBlock.type === 'product' && (
                                      <div className="space-y-2">
                                        <input
                                          type="text"
                                          value={(nestedBlock.content.title as string) || ''}
                                          onChange={(e) => {
                                            updateColumnsContent(block.id, (state) => {
                                              const nextColumns = [...state.columns];
                                              const target = nextColumns[columnIndex] || {
                                                blocks: [],
                                              };
                                              const nextBlocks = [...target.blocks];
                                              nextBlocks[nestedIndex] = {
                                                ...nestedBlock,
                                                content: {
                                                  ...nestedBlock.content,
                                                  title: e.target.value,
                                                },
                                              };
                                              target.blocks = nextBlocks;
                                              nextColumns[columnIndex] = target;
                                              return { layout: state.layout, columns: nextColumns };
                                            });
                                          }}
                                          className="w-full bg-surface-container-lowest ring-1 ring-outline-variant rounded px-2 py-1 text-xs"
                                          placeholder="Titre du produit"
                                        />

                                        <input
                                          type="text"
                                          value={(nestedBlock.content.price as string) || ''}
                                          onChange={(e) => {
                                            updateColumnsContent(block.id, (state) => {
                                              const nextColumns = [...state.columns];
                                              const target = nextColumns[columnIndex] || {
                                                blocks: [],
                                              };
                                              const nextBlocks = [...target.blocks];
                                              nextBlocks[nestedIndex] = {
                                                ...nestedBlock,
                                                content: {
                                                  ...nestedBlock.content,
                                                  price: e.target.value,
                                                },
                                              };
                                              target.blocks = nextBlocks;
                                              nextColumns[columnIndex] = target;
                                              return { layout: state.layout, columns: nextColumns };
                                            });
                                          }}
                                          className="w-full bg-surface-container-lowest ring-1 ring-outline-variant rounded px-2 py-1 text-xs"
                                          placeholder="Prix"
                                        />

                                        <input
                                          type="text"
                                          value={(nestedBlock.content.description as string) || ''}
                                          onChange={(e) => {
                                            updateColumnsContent(block.id, (state) => {
                                              const nextColumns = [...state.columns];
                                              const target = nextColumns[columnIndex] || {
                                                blocks: [],
                                              };
                                              const nextBlocks = [...target.blocks];
                                              nextBlocks[nestedIndex] = {
                                                ...nestedBlock,
                                                content: {
                                                  ...nestedBlock.content,
                                                  description: e.target.value,
                                                },
                                              };
                                              target.blocks = nextBlocks;
                                              nextColumns[columnIndex] = target;
                                              return { layout: state.layout, columns: nextColumns };
                                            });
                                          }}
                                          className="w-full bg-surface-container-lowest ring-1 ring-outline-variant rounded px-2 py-1 text-xs"
                                          placeholder="Description"
                                        />

                                        <div className="space-y-1">
                                          <button
                                            onClick={() =>
                                              triggerImageUpload((uploadedImage) => {
                                                updateNestedColumnBlock(
                                                  block.id,
                                                  columnIndex,
                                                  nestedIndex,
                                                  {
                                                    ...nestedBlock.content,
                                                    image: uploadedImage.url,
                                                  },
                                                );
                                              })
                                            }
                                            disabled={isUploadingImage}
                                            className="w-full rounded-md bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20 disabled:opacity-50"
                                          >
                                            {isUploadingImage ? 'Envoi...' : 'Image produit'}
                                          </button>
                                          {(nestedBlock.content.image as string) && (
                                            <img
                                              src={imageUploadService.getThumbnail(
                                                nestedBlock.content.image as string,
                                              )}
                                              alt="product preview"
                                              className="w-full h-16 object-contain rounded border border-outline-variant/20"
                                            />
                                          )}
                                        </div>

                                        <input
                                          type="url"
                                          value={(nestedBlock.content.url as string) || ''}
                                          onChange={(e) => {
                                            updateColumnsContent(block.id, (state) => {
                                              const nextColumns = [...state.columns];
                                              const target = nextColumns[columnIndex] || {
                                                blocks: [],
                                              };
                                              const nextBlocks = [...target.blocks];
                                              nextBlocks[nestedIndex] = {
                                                ...nestedBlock,
                                                content: {
                                                  ...nestedBlock.content,
                                                  url: e.target.value,
                                                },
                                              };
                                              target.blocks = nextBlocks;
                                              nextColumns[columnIndex] = target;
                                              return { layout: state.layout, columns: nextColumns };
                                            });
                                          }}
                                          className="w-full bg-surface-container-lowest ring-1 ring-outline-variant rounded px-2 py-1 text-xs"
                                          placeholder="Lien du produit (https://...)"
                                        />
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                } else if (block.type === 'spacing') {
                  return (
                    <div className="space-y-4">
                      <label className="text-sm font-semibold text-on-surface">
                        Taille de l'espacement
                      </label>
                      <div className="space-y-2">
                        {['small', 'medium', 'large', 'extra-large'].map((size) => (
                          <button
                            key={size}
                            onClick={() => {
                              handleUpdateBlock(block.id, { size });
                            }}
                            className={`w-full py-2 px-3 rounded-lg font-semibold transition-all text-sm ${
                              ((block.content as Record<string, unknown>)?.size as string) === size
                                ? 'bg-primary text-on-primary'
                                : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                            }`}
                          >
                            {size === 'small' && '↕ Petit (8px)'}
                            {size === 'medium' && '↕ Moyen (16px)'}
                            {size === 'large' && '↕ Grand (24px)'}
                            {size === 'extra-large' && '↕ Très grand (32px)'}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                } else if (block.type === 'html') {
                  return (
                    <div className="space-y-4">
                      <label className="text-sm font-semibold text-on-surface">
                        Code HTML personnalisé
                      </label>
                      <textarea
                        value={((block.content as Record<string, unknown>)?.html as string) || ''}
                        onChange={(e) => {
                          handleUpdateBlock(block.id, { html: e.target.value });
                        }}
                        rows={6}
                        placeholder="<div><p>Mon contenu HTML personnalisé</p></div>"
                        className="w-full bg-surface border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none rounded-lg px-3 py-2 transition-colors font-mono text-xs text-on-surface"
                      />
                      <div className="p-3 bg-surface-container-low rounded-lg">
                        <p className="text-xs text-on-surface-variant font-semibold mb-2">
                          Aperçu HTML:
                        </p>
                        <div
                          className="bg-white rounded text-xs text-on-surface max-h-32 overflow-auto"
                          dangerouslySetInnerHTML={{
                            __html:
                              ((block.content as Record<string, unknown>)?.html as string) ||
                              '<p style="color: #999;">Pas de contenu</p>',
                          }}
                        />
                      </div>
                    </div>
                  );
                }

                // Product block editor (top-level product block)
                if (block.type === 'product') {
                  const product = block.content as Record<string, unknown>;
                  const currentTitle = (product.title as string) || '';
                  const currentDescription = (product.description as string) || '';
                  const currentPrice = (product.price as string) || '';
                  const currentUrl = (product.url as string) || '';
                  const currentImage = (product.image as string) || '';

                  return (
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-on-surface">Produit</label>
                      <input
                        type="text"
                        value={currentTitle}
                        onChange={(e) =>
                          handleUpdateBlock(block.id, { ...product, title: e.target.value })
                        }
                        placeholder="Titre du produit"
                        className="w-full bg-surface-container-lowest ring-1 ring-outline-variant rounded px-3 py-2"
                      />

                      <input
                        type="text"
                        value={currentPrice}
                        onChange={(e) =>
                          handleUpdateBlock(block.id, { ...product, price: e.target.value })
                        }
                        placeholder="Prix"
                        className="w-full bg-surface-container-lowest ring-1 ring-outline-variant rounded px-3 py-2"
                      />

                      <textarea
                        value={currentDescription}
                        onChange={(e) =>
                          handleUpdateBlock(block.id, { ...product, description: e.target.value })
                        }
                        rows={3}
                        placeholder="Description"
                        className="w-full bg-surface-container-lowest ring-1 ring-outline-variant rounded px-3 py-2"
                      />

                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-secondary">
                          Image du produit
                        </label>
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              triggerImageUpload((uploadedImage) => {
                                handleUpdateBlock(block.id, {
                                  ...product,
                                  image: uploadedImage.url,
                                });
                              })
                            }
                            disabled={isUploadingImage}
                            className="py-2 px-3 bg-primary/10 text-primary rounded"
                          >
                            {isUploadingImage ? 'Envoi...' : 'Insérer une image'}
                          </button>
                        </div>

                        {currentImage && (
                          <div className="p-2 bg-surface-container rounded">
                            <img
                              src={imageUploadService.getThumbnail(currentImage)}
                              alt={currentTitle || 'product'}
                              className="w-full object-contain rounded"
                              style={{ maxHeight: 200 }}
                            />
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-secondary">
                          Lien du produit
                        </label>
                        <input
                          type="url"
                          value={currentUrl}
                          onChange={(e) =>
                            handleUpdateBlock(block.id, { ...product, url: e.target.value })
                          }
                          placeholder="https://..."
                          className="w-full bg-surface-container-lowest ring-1 ring-outline-variant rounded px-3 py-2"
                        />
                      </div>
                    </div>
                  );
                }

                return null;
              })()}
            </div>
          </div>
        )}

        {/* Mobile Preview */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-surface-container-low border-b border-outline-variant">
            <span className="material-symbols-outlined text-[18px] text-primary">smartphone</span>
            <h3 className="font-label-caps text-label-caps text-secondary tracking-widest">
              APERÇU MOBILE
            </h3>
          </div>
          <div className="p-4 flex justify-center">
            <div className="w-full max-w-[340px]">
              <MobilePreview
                type="email"
                emailContent={{
                  subject: currentSubject,
                  preheader: currentPreheader,
                  blocks: currentBlocks,
                }}
              />
            </div>
          </div>
        </div>

        {/* Images Gallery */}
        {campaignId && (
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-surface-container-low border-b border-outline-variant">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">
                  photo_library
                </span>
                <h3 className="font-label-caps text-label-caps text-secondary tracking-widest">
                  IMAGES ({campaignImages.length})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {selectedImageIds.size > 0 && (
                  <button
                    onClick={() => void deleteSelectedImages()}
                    disabled={isDeletingImages}
                    className="flex items-center gap-1 px-2 py-1 bg-error text-white text-xs font-bold rounded-lg hover:bg-error/90 transition-colors disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                    {isDeletingImages ? '...' : selectedImageIds.size}
                  </button>
                )}
                <button
                  onClick={() => void loadCampaignImages()}
                  className="p-1 text-secondary hover:text-on-surface transition-colors"
                  title="Actualiser"
                >
                  <span className="material-symbols-outlined text-[18px]">refresh</span>
                </button>
              </div>
            </div>
            <div className="p-4">
              {(() => {
                const activeBlock = selectedBlockId
                  ? currentBlocks.find((b) => b.id === selectedBlockId)
                  : null;
                const insertMode = activeBlock?.type === 'image' || activeBlock?.type === 'product';
                return (
                  <>
                    {insertMode && (
                      <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/30 rounded-lg">
                        <span className="material-symbols-outlined text-primary text-[16px]">
                          touch_app
                        </span>
                        <span className="text-xs text-primary font-semibold">
                          Cliquez une image pour l&apos;insérer dans le bloc
                        </span>
                      </div>
                    )}
                    {campaignImages.length === 0 ? (
                      <div className="border border-dashed border-outline-variant rounded-xl p-8 flex flex-col items-center justify-center text-center bg-surface-container-low/50">
                        <p className="font-body-md text-body-md text-secondary">
                          Aucune image uploadée pour cette campagne
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {campaignImages.map((img) => {
                          const isSelected = selectedImageIds.has(img.id);
                          const fullUrl = imageUploadService.resolveImageUrl(img.storageUrl);
                          return (
                            <div
                              key={img.id}
                              className={`relative rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                                insertMode
                                  ? 'border-transparent hover:border-primary hover:shadow-md hover:scale-[1.02]'
                                  : isSelected
                                    ? 'border-primary shadow-md'
                                    : 'border-transparent hover:border-outline-variant'
                              }`}
                              onClick={() => {
                                if (insertMode && activeBlock) {
                                  if (activeBlock.type === 'image') {
                                    handleUpdateBlock(activeBlock.id, {
                                      src: fullUrl,
                                      alt: img.fileName,
                                    });
                                  } else {
                                    handleUpdateBlock(activeBlock.id, {
                                      ...activeBlock.content,
                                      image: fullUrl,
                                    });
                                  }
                                } else {
                                  toggleImageSelection(img.id);
                                }
                              }}
                            >
                              <img
                                src={fullUrl}
                                alt={img.fileName}
                                className="w-full h-16 object-cover"
                              />
                              {!insertMode && isSelected && (
                                <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                  <span className="material-symbols-outlined text-white text-xs">
                                    check
                                  </span>
                                </div>
                              )}
                              {insertMode && (
                                <div className="absolute inset-0 bg-primary/0 hover:bg-primary/10 transition-colors flex items-center justify-center">
                                  <span className="material-symbols-outlined text-white text-lg opacity-0 hover:opacity-100 drop-shadow-md">
                                    add_photo_alternate
                                  </span>
                                </div>
                              )}
                              {!insertMode && (
                                <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {!insertMode && selectedImageIds.size > 0 && (
                      <button
                        onClick={() => setSelectedImageIds(new Set())}
                        className="w-full text-xs text-secondary hover:text-on-surface text-center py-2 mt-2"
                      >
                        Tout désélectionner
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
