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
  const [coverImage, setCoverImage] = useState(null);
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [locationName, setLocationName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (album) {
      setName(album.name || "");
      setInfoText(album.infoText || "");
      setCategory(album.category || "REJSER");
      setCoverImageUrl(album.coverImage || "");
      setCoverImage(null); // Reset file input when switching albums
      setLatitude(album.latitude?.toString() || "");
      setLongitude(album.longitude?.toString() || "");
      setLocationName(album.locationName || "");
    }
  }, [album]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("infoText", infoText);
      formData.append("category", category);
      
      // If a new cover image is selected, use it; otherwise keep the existing URL
      if (coverImage) {
        formData.append("coverImage", coverImage);
      } else if (coverImageUrl) {
        formData.append("coverImageUrl", coverImageUrl);
      }
      
      if (latitude) {
        formData.append("latitude", latitude);
      }
      if (longitude) {
        formData.append("longitude", longitude);
      }
      if (locationName) {
        formData.append("locationName", locationName);
      }

      const res = await fetch(`/api/albums/${album.id}`, {
        method: "PATCH",
        body: formData,
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
        <button 
          onClick={onClose} 
          className="modal-close-btn"
          aria-label="Luk"
        >
          &times;
        </button>
        <form onSubmit={handleSubmit} className="album-form">
          <fieldset disabled={isLoading} style={{ border: 0, padding: 0, margin: 0 }}>
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

            {(category === "SPILLEAFTEN" || category === "JULEFROKOST") && (
              <div className="form-group">
                <label htmlFor="coverImage" className="file-upload-label">
                  {coverImage ? coverImage.name : (coverImageUrl ? `Nuværende coverbillede: ${coverImageUrl.split('/').pop()}` : "Vælg et coverbillede...")}
                </label>
                <input
                  type="file"
                  id="coverImage"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      // Validate file size (5MB limit)
                      if (file.size > 5 * 1024 * 1024) {
                        setError("Coverbillede skal være mindre end 5MB");
                        e.target.value = "";
                        return;
                      }
                      // Validate file type
                      if (!file.type.startsWith("image/")) {
                        setError("Kun billedfiler er tilladt");
                        e.target.value = "";
                        return;
                      }
                      setError(""); // Clear any previous errors
                    }
                    setCoverImage(file);
                  }}
                  accept="image/*"
                  style={{ display: "none" }}
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="locationName">Lokation Navn</label>
              <input
                type="text"
                id="locationName"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="latitude">Breddegrad</label>
                <input
                  type="text"
                  id="latitude"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="f.eks. 55.6761"
                />
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="longitude">Længdegrad</label>
                <input
                  type="text"
                  id="longitude"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="f.eks. 12.5683"
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-secondary btn-block"
              style={{ marginTop: "10px" }}
              disabled={isLoading}
            >
              {isLoading ? <div className="spinner"></div> : "Gem Ændringer"}
            </button>
          </fieldset>
        </form>
      </div>
    </div>
  );
}
