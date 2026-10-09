import { useState } from 'react';
import { api } from '../services/api';
import { useApi } from './useApi';

/** Network list plus the selected network, defaulting to the first one. */
export function useNetworkSelection() {
  const networks = useApi(api.networks);
  const [chosen, setChosen] = useState<number | null>(null);
  const networkId = chosen ?? networks.data?.[0]?.id ?? null;
  return { networks, networkId, setNetworkId: setChosen };
}
