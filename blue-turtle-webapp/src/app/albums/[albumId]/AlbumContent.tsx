"use client";
import { useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import EditAlbumModal from "@/components/album/EditAlbumModal";
import ReactDOM from "react-dom";
import { Album, Media } from "@prisma/client";
import { UploadCloud, Edit } from "lucide-react";

interface AlbumContentProps {
  initialAlbum: Album & { media: Media[] };
}

export default function AlbumContent({ initialAlbum }: AlbumContentProps) {
  const [album, setAlbum] = useState(initialAlbum);
  const [media, setMedia] = useState(initialAlbum?.media || []);
  const [uploading, setUploading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();

  const handleAlbumUpdated = (updatedAlbum: Album) => {
    setAlbum(updatedAlbum);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/heic", "video/mp4", "video/webm", "video/quicktime"];
    if (!allowedMimeTypes.includes(file.type)) {
      alert("Filtypen er ikke tilladt. Vælg venligst et billede eller en video i et understøttet format.");
      event.target.value = "";
      return;
    }

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      alert("Filen skal være mindre end 50MB.");
      event.target.value = "";
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
      }
    } catch (error) {
      alert("En fejl skete under upload af fil.");
    }

    setUploading(false);
  };

  if (!album) {
    return (
        <div className="bg-light-background dark:bg-dark-background min-h-screen">
            <Header />
            <main className="text-center py-20">
                <h1 className="text-2xl font-bold">Album ikke fundet</h1>
                <p className="text-light-text-muted dark:text-dark-text-muted">Det album du leder efter, findes ikke.</p>
            </main>
            <Footer />
        </div>
    )
  }

  return (
    <div className="bg-light-background dark:bg-dark-background min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow">
        <div className="bg-light-surface dark:bg-dark-surface shadow-md">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-light-text dark:text-dark-text">{album.name}</h1>
                        <p className="mt-2 text-base text-light-text-muted dark:text-dark-text-muted">{album.infoText}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {session?.user.role === "ADMIN" && (
                            <button
                                onClick={() => setIsEditModalOpen(true)}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md shadow-sm text-light-text dark:text-dark-text bg-light-surface-elevated dark:bg-dark-surface-elevated hover:bg-opacity-80 dark:hover:bg-opacity-80"
                            >
                                <Edit size={18} />
                                Rediger album
                            </button>
                        )}
                        <label htmlFor="file-upload" className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-light-primary hover:bg-light-primary-hover dark:bg-dark-primary dark:text-black dark:hover:bg-dark-primary-hover ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                            <UploadCloud size={18} />
                            {uploading ? "Uploader..." : "Upload"}
                        </label>
                        <input
                            id="file-upload"
                            type="file"
                            onChange={handleFileChange}
                            disabled={uploading}
                            accept="image/jpeg,image/png,image/gif,image/webp,image/heic,video/mp4,video/webm,video/quicktime"
                            className="hidden"
                        />
                    </div>
                </div>
            </div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {media.map((item) => {
              const isImage = item.url.match(/\.(jpeg|jpg|gif|png|webp|heic)$/i) != null;
              const isVideo = item.url.match(/\.(mp4|webm|mov)$/i) != null;

              return (
                <div key={item.id} className="group relative aspect-w-1 aspect-h-1 rounded-lg overflow-hidden">
                  {isImage ? (
                    <Image
                      src={item.url}
                      alt={album.name}
                      fill
                      className="object-cover"
                    />
                  ) : isVideo ? (
                    <video
                      src={item.url}
                      controls
                      className="w-full h-full object-cover"
                    >
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <div className="flex items-center justify-center bg-light-surface-elevated dark:bg-dark-surface-elevated">
                        <span className="text-sm text-light-text-muted dark:text-dark-text-muted">Ukendt filtype</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <Footer />
      
      {typeof window !== "undefined" && isEditModalOpen && ReactDOM.createPortal(
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