import type { LocationSource } from '@prisma/client';

export type GeomapAlbum = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  locationName: string | null;
  mediaCount: number;
  mediaWithLocationCount: number;
};

export type GeomapMedia = {
  id: string;
  albumId: string;
  albumName: string;
  url: string;
  mimeType: string | null;
  locationAutoLat: number;
  locationAutoLng: number;
  locationSource: LocationSource | null;
};

export type GeomapData = {
  albums: GeomapAlbum[];
  media: GeomapMedia[];
  totalMediaCount: number;
};
