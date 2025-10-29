'use client';

import { useState, useEffect } from 'react';

export default function EditAlbumModal({
  isOpen,
  onClose,
  album,
  onAlbumUpdated,
}) {
  const [name, setName] = useState('');
  const [infoText, setInfoText] = useState('');
  const [category, setCategory] = useState('REJSER');
  const [coverImage, setCoverImage] = useState(null);
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [locationName, setLocationName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (album) {
      setName(album.name || '');
      setInfoText(album.infoText || '');
      setCategory(album.category || 'REJSER');
      setCoverImageUrl(album.coverImage || '');
      setCoverImage(null);
      setLatitude(album.latitude?.toString() || '');
      setLongitude(album.longitude?.toString() || '');
      setLocationName(album.locationName || '');
    }
  }, [album]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('infoText', infoText);
      formData.append('category', category);

      if (coverImage) {
        formData.append('coverImage', coverImage);
      } else if (coverImageUrl) {
        formData.append('coverImageUrl', coverImageUrl);
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

      const res = await fetch(`/api/albums/${album.id}`, {
        method: 'PATCH',
        body: formData,
      });

      if (res.ok) {
        const updatedAlbum = await res.json();
        setSuccess('Album opdateret!');
        setTimeout(() => {
          onAlbumUpdated(updatedAlbum);
          onClose();
          setSuccess('');
        }, 1500);
      } else {
        const data = await res.json();
        setError(data.error || 'Der skete en fejl under opdateringen.');
      }
    } catch (error) {
      setError('En uventet fejl opstod.');
      console.error('Update error:', error);
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
          aria-label="Luk"
        >
          &times;
        </button>
        <form onSubmit={handleSubmit} className="space-y-4">
          <fieldset disabled={isLoading} className="space-y-4">
            <h2 className="text-center text-xl font-bold text-white">Rediger Album</h2>
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
                  {coverImage ? coverImage.name : (coverImageUrl ? `Nuværende coverbillede: ${coverImageUrl.split('/').pop()}` : 'Vælg et coverbillede...')}
                </label>
                <input
                  type="file"
                  id="coverImage"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      if (file.size > 5 * 1024 * 1024) {
                        setError('Coverbillede skal være mindre end 5MB');
                        e.target.value = '';
                        return;
                      }
                      if (!file.type.startsWith('image/')) {
                        setError('Kun billedfiler er tilladt');
                        e.target.value = '';
                        return;
                      }
                      setError('');
                    }
                    setCoverImage(file);
                  }}
                  accept="image/*"
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
              {isLoading ? <div className="spinner"></div> : 'Gem Ændringer'}
            </button>
          </fieldset>
        </form>
      </div>
    </div>
  );
}