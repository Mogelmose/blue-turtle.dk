'use client';
import { useState } from 'react';
import AppHeader from '../../components/AppHeader';
import Image from 'next/image';
import '../../css/sub-pagestyle.css';

export default function AlbumContent({ initialAlbum }) {
  const [album, setAlbum] = useState(initialAlbum);
  const [media, setMedia] = useState(initialAlbum?.media || []);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    setMessage('Uploading...');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('albumId', album.id);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success && data.media) {
        setMessage('Upload successful!');
        setMedia((prevMedia) => [...prevMedia, data.media]);
        // Clear the message after a few seconds
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(`Upload failed: ${data.error}`);
      }
    } catch (error) {
      setMessage('An error occurred during upload.');
      console.error('Upload error:', error);
    }

    setUploading(false);
  };

  const bannerTitle = "Spilleaften";

  if (!album) {
    return <div>Album not found or failed to load.</div>;
  }

  return (
    <div className="underside-body">
      <div className="page-container">
        <AppHeader bannerTitle={bannerTitle} />

        <div className="banner-container">
          <Image
            src="/billeder/banner.jpg"
            alt="Banner"
            className="banner-image"
            width={1600}
            height={600}
            priority
          />
        </div>

        <main className="underside-main">
          <div className="underside-header-bar">
            <div className="title-row">
              <h1 className="underside-title">{album.name}</h1>
              <span className="info-text">{album.infoText}</span>
            </div>
            <div className="nav-upload">
              <ul>
                <li>
                  <label htmlFor="file-upload" className={`upload-btn ${uploading ? 'disabled' : ''}`}>
                    {uploading ? 'Uploading...' : 'Upload'}
                  </label>
                  <input id="file-upload" type="file" onChange={handleFileChange} disabled={uploading} accept="image/jpeg,image/png,image/gif,image/webp,image/heic,video/mp4,video/webm,video/quicktime" />
                </li>
              </ul>
            </div>
            {message && <p>{message}</p>}
          </div>
        </main>

        <div className="album-container">
          <div className="photo-grid">
            {media.map((item) => (
              <Image
                key={item.id}
                src={item.url}
                alt={item.alt || album.name}
                width={400}
                height={300}
              />
            ))}
          </div>
        </div>

        <footer>
          <p>&copy; 2025 Blue Turtle. Alle rettigheder forbeholdes.</p>
        </footer>
      </div>
    </div>
  );
}
