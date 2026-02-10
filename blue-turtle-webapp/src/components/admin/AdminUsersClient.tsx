'use client';

import { useEffect, useState } from 'react';

type UserRow = {
  id: string;
  username: string;
  role: 'ADMIN' | 'REGULAR';
  isOnline: boolean;
  lastSeenAt: string | null;
};

type Props = {
  initialUsers: UserRow[];
};

const REFRESH_INTERVAL_MS = 30_000;
const ONLINE_WINDOW_MS = 2 * 60 * 1000;

function sortUsers(users: UserRow[]): UserRow[] {
  return [...users].sort((a, b) => {
    if (a.isOnline === b.isOnline) {
      return a.username.localeCompare(b.username);
    }
    return a.isOnline ? -1 : 1;
  });
}

export default function AdminUsersClient({ initialUsers }: Props) {
  const [users, setUsers] = useState<UserRow[]>(() => sortUsers(initialUsers));
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let isActive = true;

    const fetchUsers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/users');
        if (!response.ok) {
          throw new Error('Kunne ikke hente brugere.');
        }
        const data = await response.json();
        if (!isActive) {
          return;
        }
        if (Array.isArray(data)) {
          setUsers(sortUsers(data));
        }
        setLastCheckedAt(Date.now());
      } catch (fetchError) {
        if (!isActive) {
          return;
        }
        console.error('Error fetching users:', fetchError);
        setError('Kunne ikke hente brugere.');
        setLastCheckedAt(Date.now());
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void fetchUsers();
    const intervalId = window.setInterval(fetchUsers, REFRESH_INTERVAL_MS);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const checkedAgoSeconds =
    lastCheckedAt === null ? null : Math.max(0, Math.floor((now - lastCheckedAt) / 1000));

  return (
    <section className="card space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-main">Brugere</h2>
        {isLoading ? (
          <span className="text-xs text-muted">Opdaterer...</span>
        ) : null}
      </div>
      <p className="text-xs text-muted">
        Online hvis set inden for {Math.floor(ONLINE_WINDOW_MS / 60000)} min. Opdateres hver{' '}
        {Math.floor(REFRESH_INTERVAL_MS / 1000)}s
        {checkedAgoSeconds !== null ? ` · sidst tjekket ${checkedAgoSeconds}s siden` : ''}.
      </p>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="space-y-2">
        {users.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between rounded-lg border border-default bg-surface px-3 py-2"
          >
            <div>
              <p className="font-semibold text-main">{user.username}</p>
              <p className="text-xs text-muted">{user.role}</p>
            </div>
            <span
              className={`text-xs font-semibold ${
                user.isOnline ? 'text-success' : 'text-muted'
              }`}
            >
              {user.isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        ))}

        {users.length === 0 && !isLoading ? (
          <p className="text-sm text-muted">Ingen brugere fundet.</p>
        ) : null}
      </div>
    </section>
  );
}
