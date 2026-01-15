// src/components/media/MediaUpload.jsx
'use client';

import { useState } from 'react';
import Button from '../ui/Button';

export default function MediaUpload({ albumId, onUploadComplete }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setError('');

    // Validate MIME type
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/heic",
      "image/heif",
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ];
    const allowedExtensions = [
      "jpg",
      "jpeg",
      "png",
      "gif",
      "webp",
      "heic",
      "heif",
      "mp4",
      "webm",
      "mov",
    ];
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    const isMimeAllowed = file.type && allowedMimeTypes.includes(file.type);
    const isExtensionAllowed = allowedExtensions.includes(extension);
    if (!isMimeAllowed && !isExtensionAllowed) {
      setError("Filtypen er ikke tilladt.");
      event.target.value = "";
      return;
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB in bytes
    if (file.size > maxSize) {
      setError("Filen skal være mindre end 50MB.");
      event.target.value = "";
      return;
    }

    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("albumId", albumId);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success && data.media) {
        onUploadComplete(data.media);
      } else {
        setError(`Upload fejlede: ${data.error}`);
      }
    } catch (error) {
      setError("En fejl skete under upload af fil.");
    } finally {
      setUploading(false);
      event.target.value = ""; // Reset file input
    }
  };

  return (
    <div>
      <Button
        onClick={() => document.getElementById('file-upload-input').click()}
        loading={uploading}
      >
        {uploading ? 'Uploader...' : 'Upload Media'}
      </Button>
      <input
        id="file-upload-input"
        type="file"
        onChange={handleFileChange}
        disabled={uploading}
        accept="image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif,video/mp4,video/webm,video/quicktime"
        style={{ display: 'none' }}
      />
      {error && <p className="text-danger text-sm mt-2">{error}</p>}
    </div>
  );
}
