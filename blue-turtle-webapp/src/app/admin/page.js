// src/app/admin/page.js
'use client';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const [users, setUsers] = useState([]);
  const router = useRouter();

  useEffect(() => {
    // Wait for session to be determined
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      router.replace('/login');
      return;
    }

    if (status === 'authenticated') {
      if (session.user.role !== 'ADMIN') {
        router.replace('/homepage');
      } else {
        // If admin, fetch users
        async function fetchUsers() {
          try {
            const res = await fetch('/api/users');
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data)) {
                setUsers(data);
              } else {
                console.error('User data is not an array:', data);
                setUsers([]);
              }
            } else {
              console.error('Failed to fetch users:', res.statusText);
              setUsers([]);
            }
          } catch (error) {
            console.error('Error fetching users:', error);
            setUsers([]);
          }
        }
        fetchUsers();
      }
    }
  }, [session, status, router]);

  // Render content based on authentication status and role
  if (status === 'authenticated' && session?.user?.role === 'ADMIN') {
    return (
      <div>
        <h1>Admin Dashboard</h1>
        <p>Welcome, {session.user.name || 'Guest'}!</p>
        <p>Your role: {session.user.role}</p>
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

  // For loading, unauthenticated, or non-admin users, render nothing.
  // This ensures a silent experience before redirect.
  return null;
}