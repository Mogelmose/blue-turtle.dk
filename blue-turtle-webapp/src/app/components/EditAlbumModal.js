"use client";

import { useState, useEffect } from "react";
import "../css/modal.css";

export default function EditAlbumModal({
  isOpen,
  onClose,
  album,
  onAlbumUpdated,
}) {
  const [name, setName] = useState("");
  const [infoText, setInfoText] = useState("");
  const [category, setCategory] = useState("REJSER");
  const [coverImage, setCoverImage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (album) {
      setName(album.name || "");
      setInfoText(album.infoText || "");
      setCategory(album.category || "REJSER");
      setCoverImage(album.coverImage || "");
    }
  }, [album]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const res = await fetch(`/api/albums/${album.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, infoText, category, coverImage }),
      });

      if (res.ok) {
        const updatedAlbum = await res.json();
        setSuccess("Album opdateret!");
        setTimeout(() => {
          onAlbumUpdated(updatedAlbum);
          onClose();
          setSuccess("");
        }, 1500);
      } else {
        const data = await res.json();
        setError(data.error || "Der skete en fejl under opdateringen.");
      }
    } catch (error) {
      setError("En uventet fejl opstod.");
      console.error("Update error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <button onClick={onClose} className="modal-close-btn">
          &times;
        </button>
        <form onSubmit={handleSubmit} className="album-form">
          <h2>Rediger Album</h2>
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

          <div className="form-group">
            <label htmlFor="coverImage">Cover Billede URL</label>
            <input
              type="text"
              id="coverImage"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="/uploads/covers/example.jpg"
            />
          </div>

          <button
            type="submit"
            className="btn btn-secondary btn-block"
            style={{ marginTop: "10px" }}
            disabled={isLoading}
          >
            {isLoading ? <div className="spinner"></div> : "Gem Ændringer"}
          </button>
        </form>
      </div>
    </div>
  );
}
