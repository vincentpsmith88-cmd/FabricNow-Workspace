import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

const FALLBACK = ['dress', 'shirt', 'jacket', 'trousers', 'skirt', 'kaftan'].map((id) => ({
  id, label: id[0].toUpperCase() + id.slice(1), group: 'Everyday',
}));
let cached = null;

/** Garment types come from the worker so the list stays in one place; falls back offline. */
export function useCatalog() {
  const [list, setList] = useState(cached || FALLBACK);
  useEffect(() => {
    if (cached) return;
    api('/api/workspace/catalog').then((d) => { if (d.garments?.length) { cached = d.garments; setList(cached); } }).catch(() => {});
  }, []);
  return list;
}

export function garmentLabel(list, id) {
  return list.find((g) => g.id === id)?.label || (id && id !== 'Auto-detect' ? id : 'Auto-detect');
}

export default function GarmentSelect({ value, onChange, id = 'garment', auto = true }) {
  const list = useCatalog();
  const groups = [...new Set(list.map((g) => g.group))];
  return (
    <select id={id} className="select" value={value} onChange={(e) => onChange(e.target.value)} aria-label="Garment type">
      {auto && <option value="Auto-detect">Auto-detect from the photo</option>}
      {groups.map((grp) => (
        <optgroup key={grp} label={grp === 'African' ? 'African & African-inspired' : grp}>
          {list.filter((g) => g.group === grp).map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
        </optgroup>
      ))}
    </select>
  );
}
