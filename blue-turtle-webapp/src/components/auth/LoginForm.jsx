// src/components/auth/LoginForm.jsx
'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Button from '../ui/Button';
import Input from '../ui/Input';

export default function LoginForm({ profiles }) {
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleProfileClick = (name) => {
    setSelectedProfile(name);
    setError('');
    setPassword('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await signIn('credentials', {
      redirect: false,
      username: selectedProfile,
      password: password,
    });

    setLoading(false);

    if (result?.ok) {
      router.push('/homepage');
    } else {
      setError('Forkert adgangskode');
      setPassword('');
    }
  };

  if (!selectedProfile) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {profiles.map((profile) => (
          <div
            key={profile.name}
            onClick={() => handleProfileClick(profile.name)}
            className="cursor-pointer text-center"
          >
            <img
              src={profile.img}
              alt={profile.name}
              className="w-32 h-32 rounded-full mx-auto shadow-md hover:shadow-lg transition-shadow"
            />
            <p className="mt-2 font-medium text-gray-800">{profile.name}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto">
      <h2 className="text-2xl font-bold text-center">Log ind som {selectedProfile}</h2>
      <Input
        type="password"
        placeholder="Adgangskode"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={loading}
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <Button type="submit" loading={loading} className="w-full">
        Log Ind
      </Button>
      <Button variant="secondary" onClick={() => setSelectedProfile(null)} className="w-full">
        Vælg en anden profil
      </Button>
    </form>
  );
}