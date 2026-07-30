import React from 'react';

type Block = { id: string; type: 'text' | 'image' | 'button' | 'separator'; content?: string };

function uid() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 9);
}

export default function Editor({
  blocks,
  setBlocks,
  channelType,
}: {
  blocks: Block[];
  setBlocks: (b: Block[]) => void;
  channelType?: string;
}) {
  const addBlock = (type: Block['type']) => {
    const b: Block = {
      id: uid(),
      type,
      content:
        type === 'separator'
          ? undefined
          : type === 'text'
            ? channelType === 'sms'
              ? 'Texte SMS'
              : 'Texte paragraphe'
            : '',
    };
    setBlocks([...blocks, b]);
  };

  const onDragStart = (e: React.DragEvent, idx: number) => {
    e.dataTransfer.setData('text/plain', String(idx));
  };

  const onDrop = (e: React.DragEvent, idx: number) => {
    const from = Number(e.dataTransfer.getData('text/plain'));
    if (Number.isNaN(from)) return;
    const copy = [...blocks];
    const [item] = copy.splice(from, 1);
    copy.splice(idx, 0, item);
    setBlocks(copy);
  };

  const removeBlock = (id: string) => setBlocks(blocks.filter((b) => b.id !== id));

  const updateContent = (id: string, content: string) =>
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, content } : b)));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <aside className="col-span-1 card">
        <h3 className="font-semibold mb-2">Palette</h3>
        <div className="space-y-2">
          <button type="button" onClick={() => addBlock('text')} className="btn-outline w-full">
            Texte
          </button>
          <button type="button" onClick={() => addBlock('image')} className="btn-outline w-full">
            Image
          </button>
          <button type="button" onClick={() => addBlock('button')} className="btn-outline w-full">
            Bouton
          </button>
          <button
            type="button"
            onClick={() => addBlock('separator')}
            className="btn-outline w-full"
          >
            Séparateur
          </button>
        </div>
      </aside>

      <main className="col-span-3">
        <div className="card p-4 min-h-[300px]">
          <h3 className="font-semibold mb-4">Contenu</h3>
          {blocks.length === 0 && (
            <div className="text-muted">Aucun bloc — ajoutez-en depuis la palette.</div>
          )}

          <div className="space-y-3">
            {blocks.map((b, i) => (
              <div
                key={b.id}
                draggable
                onDragStart={(e) => onDragStart(e, i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDrop(e, i)}
                className="p-3 border rounded bg-white"
              >
                <div className="flex justify-between items-start">
                  <div className="font-medium">{b.type.toUpperCase()}</div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => removeBlock(b.id)}
                      className="text-sm text-red-600"
                    >
                      Suppr
                    </button>
                  </div>
                </div>

                {b.type === 'text' && (
                  <textarea
                    className="mt-2 textarea"
                    value={b.content}
                    onChange={(e) => updateContent(b.id, e.target.value || '')}
                  />
                )}

                {b.type === 'image' && (
                  <div className="mt-2">
                    <input
                      placeholder="URL de l'image"
                      className="input"
                      value={b.content}
                      onChange={(e) => updateContent(b.id, e.target.value)}
                    />
                  </div>
                )}

                {b.type === 'button' && (
                  <div className="mt-2">
                    <input
                      placeholder="Texte du bouton"
                      className="input"
                      value={b.content}
                      onChange={(e) => updateContent(b.id, e.target.value)}
                    />
                  </div>
                )}

                {b.type === 'separator' && <hr className="my-2" />}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
