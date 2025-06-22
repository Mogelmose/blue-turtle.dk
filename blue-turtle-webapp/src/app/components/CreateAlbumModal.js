'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import '../css/modal.css';

export default function CreateAlbumModal({ isOpen, onClose }) {
  const [name, setName] = useState('');
  const [infoText, setInfoText] = useState('');
  const [category, setCategory] = useState('REJSER');
  const [coverImage, setCoverImage] = useState(null);
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

    if ((category === 'SPILLEAFTEN' || category === 'JULEFROKOST') && !coverImage) {
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
    <div className="modal-backdrop">
      <div className="modal-content">
        <button onClick={onClose} className="modal-close-btn">&times;</button>
        <form onSubmit={handleSubmit} className="album-form">
          <h2>Opret et nyt album</h2>
          {error && <p className="error-message">{error}</p>}
          {success && <p className="success-message">{success}</p>}
          <div className="form-group">
            <label htmlFor="name">Album Navn</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="infoText">Beskrivelse</label>
            <textarea
              id="infoText"
              value={infoText}
              onChange={(e) => setInfoText(e.target.value)}
              required
            ></textarea>
          </div>
          <div className="form-group">
            <label htmlFor="category">Kategori</label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              <option value="REJSER">Rejser</option>
              <option value="SPILLEAFTEN">Spilleaften</option>
              <option value="JULEFROKOST">Julefrokost</option>
            </select>
          </div>
          {(category === 'SPILLEAFTEN' || category === 'JULEFROKOST') && (
            <div className="form-group">
              <label htmlFor="coverImage" className="file-upload-label">
                {coverImage ? coverImage.name : 'Vælg et coverbillede...'}
              </label>
              <input
                type="file"
                id="coverImage"
                onChange={(e) => setCoverImage(e.target.files[0])}
                accept="image/*"
                required
                style={{ display: 'none' }}
              />
            </div>
          )}
          <button type="submit" disabled={isLoading}>
            {isLoading ? <div className="spinner"></div> : 'Opret Album'}
          </button>
        </form>
      </div>
    </div>
  );
}
