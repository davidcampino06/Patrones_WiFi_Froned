import type { Network } from '../types';

interface Props {
  networks: Network[];
  value: number | null;
  onChange: (id: number) => void;
}

export function NetworkPicker({ networks, value, onChange }: Props) {
  return (
    <label className="field field--inline">
      <span>Red</span>
      <select value={value ?? ''} onChange={(e) => onChange(Number(e.target.value))}>
        {networks.map((n) => (
          <option key={n.id} value={n.id}>{n.ssid} · {n.zoneName}</option>
        ))}
      </select>
    </label>
  );
}
