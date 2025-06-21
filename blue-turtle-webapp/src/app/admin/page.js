// src/app/admin/page.js
'use client';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function AdminDashboard() {
  const { data: session } = useSession();
  const [users, setUsers] = useState([]);

  useEffect(() => {
    async function fetchUsers() {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(data);
    }
    fetchUsers();
  }, []);

  return (
    <div>
      <h1>Admin Dashboard</h1>
      <p>Welcome, {session?.user?.name || 'Guest'}!</p>
      <p>Your role: {session?.user?.role || 'Unknown'}</p>
      <h2>User List</h2>
      <ul>
        {users.map((user) => (
          <li key={user.id}>
            {user.username} ({user.role})
          </li>
        ))}
      </ul>
      <Link href="/homepage">Back to Homepage</Link>
    </div>
  );
}