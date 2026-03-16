import { useEffect, useState } from 'react';
import { getUsers } from '../services/userService';

export function useUsers({ cityId, clusterId, enabled = true, fallbackAll = true }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setUsers([]);
      setLoading(false);
      return undefined;
    }
    const load = async () => {
      setLoading(true);
      const list = await getUsers({ cityId, clusterId, fallbackAll });
      setUsers(list);
      setLoading(false);
    };
    load();
  }, [cityId, clusterId, enabled, fallbackAll]);

  return { users, loading };
}
