import { useState } from 'react';
import api from '@/api/axios';

type Rule = { field: string; op: string; value: string };

interface SegmentBuilderProps {
  onCreated?: (segment: { id: string; name?: string }) => void;
}

export default function SegmentBuilder({ onCreated }: SegmentBuilderProps) {
  const [name, setName] = useState('Nouveau segment');
  const [rules, setRules] = useState<Rule[]>([{ field: 'email', op: 'contains', value: '' }]);
  const [logic, setLogic] = useState<'AND' | 'OR'>('AND');
  const [busy, setBusy] = useState(false);
  const addRule = () => setRules((r) => [...r, { field: 'email', op: 'contains', value: '' }]);
  const updateRule = (i: number, p: Partial<Rule>) =>
    setRules((r) => r.map((row, idx) => (idx === i ? { ...row, ...p } : row)));

  async function save() {
    setBusy(true);
    try {
      const res = await api.post('/segments', { name, logic, criteria: rules });
      const json = res.data as {
        id?: string;
        segment?: { id?: string; name?: string };
        message?: string;
      };
      const segment = json.segment ?? { id: json.id || '', name };
      if (!segment.id) throw new Error(json?.message || 'Erreur');
      onCreated?.({ id: segment.id, name: segment.name || name });
      alert(`Segment créé: ${segment.id}`);
    } catch (e) {
      alert('Erreur: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: 16, maxWidth: 820 }}>
      <h3>Constructeur de segments</h3>
      <div style={{ marginBottom: 8 }}>
        <label style={{ display: 'block', marginBottom: 6 }}>Nom</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ width: '100%', padding: 8 }}
        />
      </div>
      <div style={{ marginBottom: 8 }}>
        <label style={{ display: 'block', marginBottom: 6 }}>Logique</label>
        <select value={logic} onChange={(e) => setLogic(e.target.value as any)}>
          <option value="AND">ET (AND)</option>
          <option value="OR">OU (OR)</option>
        </select>
      </div>

      {rules.map((r, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <select value={r.field} onChange={(e) => updateRule(i, { field: e.target.value })}>
            <option value="email">Email</option>
            <option value="phone">Phone</option>
            <option value="firstName">Prénom</option>
            <option value="lastName">Nom</option>
          </select>
          <select value={r.op} onChange={(e) => updateRule(i, { op: e.target.value })}>
            <option value="equals">est égal à</option>
            <option value="contains">contient</option>
            <option value="startsWith">commence par</option>
            <option value="endsWith">finit par</option>
          </select>
          <input
            value={r.value}
            onChange={(e) => updateRule(i, { value: e.target.value })}
            style={{ flex: 1 }}
          />
        </div>
      ))}

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={addRule}>Ajouter une règle</button>
        <button onClick={save} disabled={busy} style={{ marginLeft: 'auto' }}>
          {busy ? 'Enregistrement...' : 'Enregistrer le segment'}
        </button>
      </div>
    </div>
  );
}
