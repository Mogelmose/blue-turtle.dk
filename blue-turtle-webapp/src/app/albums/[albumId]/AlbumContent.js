'use client';
import { useState } from 'react';
import AppHeader from '../../components/AppHeader';
import Image from 'next/image';
import '../../css/sub-pagestyle.css';

export default function AlbumContent({ initialAlbum }) {
  const [album, setAlbum] = useState(initialAlbum);
  const [media, setMedia] = useState(initialAlbum?.media || []);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);

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
        setMedia((prevMedia) => [...prevMedia, data.media]);
      } else {
        alert(`Upload failed: ${data.error}`);
        console.error(`Upload failed: ${data.error}`);
      }
    } catch (error) {
      alert('An error occurred during upload.');
      console.error('Upload error:', error);
    }

    setUploading(false);
  };

  if (!album) {
    return <div>Album not found or failed to load.</div>;
  }

  return (
    <div className="underside-body">
      <div className="page-container">
        <AppHeader />

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
            <div className="header-controls">
              <div className="nav-upload">
                <ul>
                  <li>
                    <label htmlFor="file-upload" className={`upload-btn ${uploading ? 'disabled' : ''}`}>
                      {uploading ? <span className="loading-spinner"></span> : 'Upload'}
                    </label>
                    <input id="file-upload" type="file" onChange={handleFileChange} disabled={uploading} accept="image/jpeg,image/png,image/gif,image/webp,image/heic,video/mp4,video/webm,video/quicktime" />
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </main>

        <div className="album-container">
          <div className="photo-grid">
            {media.map((item) => (
              <div key={item.id} className="photo-grid-item">
                <Image
                  src={item.url}
                  alt={item.alt || album.name}
                  width={400}
                  height={300}
                  className="photo-grid-image"
                />
              </div>
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
