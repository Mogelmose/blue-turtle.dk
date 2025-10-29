'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateAlbumModal({ isOpen, onClose }) {
  const [name, setName] = useState('');
  const [infoText, setInfoText] = useState('');
  const [category, setCategory] = useState('REJSER');
  const [coverImage, setCoverImage] = useState(null);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [locationName, setLocationName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name || !infoText) {
      setError('Udfyld alle felter.');
      return;
    }

    if (
      (category === 'SPILLEAFTEN' || category === 'JULEFROKOST') &&
      !coverImage
    ) {
      setError('Vælg et billede til denne kategori');
      return;
    }

    setIsLoading(true);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('infoText', infoText);
    formData.append('category', category);
    if (coverImage) {
      formData.append('coverImage', coverImage);
    }
    if (latitude) {
      formData.append('latitude', latitude);
    }
    if (longitude) {
      formData.append('longitude', longitude);
    }
    if (locationName) {
      formData.append('locationName', locationName);
    }

    try {
      const res = await fetch('/api/albums', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setSuccess('Album oprettet!');
        setTimeout(() => {
          setName('');
          setInfoText('');
          setCategory('REJSER');
          setCoverImage(null);
          setLatitude('');
          setLongitude('');
          setLocationName('');
          setSuccess('');
          onClose();
          router.refresh();
        }, 1500);
      } else {
        const data = await res.json();
        setError(data.message || 'Der skete en fejl');
      }
    } catch (error) {
      setError('En uventet fejl opstod.');
      console.error('Der skete en fejl:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-modal-backdrop flex items-center justify-center bg-black/60">
      <div className="relative w-full max-w-md rounded-lg border border-dark-border bg-dark-elevated p-6 shadow-lg">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-white"
        >
          &times;
        </button>
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-center text-xl font-bold text-white">Opret et nyt album</h2>
          {error && <p className="text-center text-error">{error}</p>}
          {success && <p className="text-center text-success">{success}</p>}
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-400">Album Navn</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-md border border-dark-border bg-dark-input px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label htmlFor="infoText" className="mb-1 block text-sm font-medium text-gray-400">Beskrivelse</label>
            <textarea
              id="infoText"
              value={infoText}
              onChange={(e) => setInfoText(e.target.value)}
              required
              className="w-full rounded-md border border-dark-border bg-dark-input px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            ></textarea>
          </div>
          <div>
            <label htmlFor="category" className="mb-1 block text-sm font-medium text-gray-400">Kategori</label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              className="w-full rounded-md border border-dark-border bg-dark-input px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="REJSER">Rejser</option>
              <option value="SPILLEAFTEN">Spilleaften</option>
              <option value="JULEFROKOST">Julefrokost</option>
            </select>
          </div>
          {(category === 'SPILLEAFTEN' || category === 'JULEFROKOST') && (
            <div>
              <label htmlFor="coverImage" className="mb-1 block w-full cursor-pointer rounded-md border border-dark-border bg-dark-input px-3 py-2 text-center text-white hover:bg-dark-hover">
                {coverImage ? coverImage.name : 'Vælg et coverbillede...'}
              </label>
              <input
                type="file"
                id="coverImage"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    // Validate file size (5MB limit)
                    if (file.size > 5 * 1024 * 1024) {
                      setError('Coverbillede skal være mindre end 5MB');
                      e.target.value = '';
                      return;
                    }
                    // Validate file type
                    if (!file.type.startsWith('image/')) {
                      setError('Kun billedfiler er tilladt');
                      e.target.value = '';
                      return;
                    }
                  }
                  setCoverImage(file);
                }}
                accept="image/*"
                required
                className="hidden"
              />
            </div>
          )}
          
          <div>
            <label htmlFor="locationName" className="mb-1 block text-sm font-medium text-gray-400">Lokation Navn</label>
            <input
              type="text"
              id="locationName"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="f.eks. Paris, Frankrig"
              className="w-full rounded-md border border-dark-border bg-dark-input px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label htmlFor="latitude" className="mb-1 block text-sm font-medium text-gray-400">Breddegrad</label>
              <input
                type="text"
                id="latitude"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="f.eks. 55.6761"
                className="w-full rounded-md border border-dark-border bg-dark-input px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="flex-1">
              <label htmlFor="longitude" className="mb-1 block text-sm font-medium text-gray-400">Længdegrad</label>
              <input
                type="text"
                id="longitude"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="f.eks. 12.5683"
                className="w-full rounded-md border border-dark-border bg-dark-input px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-secondary btn-block mt-2 w-full"
            disabled={isLoading}
          >
            {isLoading ? <div className="spinner"></div> : 'Opret Album'}
          </button>
        </form>
      </div>
    </div>
  );
}