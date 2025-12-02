"use client";
import { useState } from "react";
import Header from "../../components/layout/Header";
import Image from "next/image";
import "../../css/sub-pagestyle.css";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import EditAlbumModal from "../../components/EditAlbumModal";
import Footer from "../../components/layout/Footer";
import ReactDOM from "react-dom";

export default function AlbumContent({ initialAlbum }) {
  const [album, setAlbum] = useState(initialAlbum);
  const [media, setMedia] = useState(initialAlbum?.media || []);
  const [uploading, setUploading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();

  const handleAlbumUpdated = (updatedAlbum) => {
    setAlbum(updatedAlbum);
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate MIME type
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/heic",
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ];
    if (!allowedMimeTypes.includes(file.type)) {
      alert(
        "Filtypen er ikke tilladt. Vælg venligst et billede eller en video i et understøttet format."
      );
      event.target.value = ""; // Clear the input
      return;
    }

    // Validate file size (e.g., 20MB limit)
    const maxSize = 20 * 1024 * 1024; // 20MB in bytes
    if (file.size > maxSize) {
      alert("Filen skal være mindre end 20MB.");
      event.target.value = ""; // Clear the input
      return;
    }

    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("albumId", album.id);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success && data.media) {
        setMedia((prevMedia) => [...prevMedia, data.media]);
      } else {
        alert(`Upload fejlede: ${data.error}`);
        console.error(`Upload fejlede: ${data.error}`);
      }
    } catch (error) {
      alert("En fejl skete under upload af fil.");
      console.error("Upload error:", error);
    }

    setUploading(false);
  };

  if (!album) {
    return <div>Album not found or failed to load.</div>;
  }

  return (
    <div className="underside-body">
      <div className="page-container">
        <Header />

        <div className="banner-container">
          <Image
            src="/static/banner.jpg"
            alt="Banner"
            className="banner-image"
            width={1920}
            height={1080}
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
                  {session?.user.role === "ADMIN" && (
                    <li>
                      <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="btn btn-primary"
                      >
                        Rediger album
                      </button>
                    </li>
                  )}
                  <li>
                    <button
                      type="button"
                      onClick={() => document.getElementById("file-upload").click()}
                      className="btn btn-primary"
                      disabled={uploading}
                      style={
                        uploading ? { pointerEvents: "none", opacity: 0.6 } : {}
                      }
                    >
                      {uploading ? (
                        <span className="loading-spinner"></span>
                      ) : (
                        "Upload"
                      )}
                    </button>
                    <input
                      id="file-upload"
                      type="file"
                      onChange={handleFileChange}
                      disabled={uploading}
                      accept="image/jpeg,image/png,image/gif,image/webp,image/heic,video/mp4,video/webm,video/quicktime"
                      style={{ display: "none" }}
                    />
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </main>

        <div className="album-container">
          <div className="photo-grid">
            {media.map((item) => {
              // Determine file type by extension
              const imageExtensions = [
                ".jpg",
                ".jpeg",
                ".png",
                ".gif",
                ".webp",
                ".heic",
                ".heif",
              ];
              const videoExtensions = [".mp4", ".webm", ".mov"];
              const url = item.url.toLowerCase();
              const isImage = imageExtensions.some((ext) => url.endsWith(ext));
              const isVideo = videoExtensions.some((ext) => url.endsWith(ext));
              return (
                <div key={item.id} className="photo-grid-item">
                  {isImage ? (
                    <Image
                      src={item.url}
                      alt={item.alt || album.name}
                      width={400}
                      height={400}
                      unoptimized
                      className="photo-grid-image"
                    />
                  ) : isVideo ? (
                    <video
                      src={item.url}
                      controls
                      width={400}
                      height={400}
                      className="photo-grid-image"
                    >
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <span>Ukendt filtype</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <Footer />
      </div>
      {/* Render EditAlbumModal in a portal to keep it above all content */}
      {typeof window !== "undefined" &&
        isEditModalOpen &&
        ReactDOM.createPortal(
          <EditAlbumModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            album={album}
            onAlbumUpdated={handleAlbumUpdated}
          />,
          document.body
        )}
    </div>
  );
}
