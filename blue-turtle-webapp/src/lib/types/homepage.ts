export type AlbumSummary = {
  id: string;
  name: string;
  coverImage: string | null;
  coverUrl?: string | null;
  createdAt: Date;
  mediaCount: number;
};

export type MediaSummary = {
  id: string;
  url: string;
  mimeType: string | null;
  createdAt: Date;
  albumId: string;
  albumName: string;
};

export type MapAlbumSummary = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  locationName: string | null;
};

export type ActivityItem = {
  id: string;
  type: 'album' | 'media';
  label: string;
  createdAt: Date;
  href: string;
};

export type HomepageStats = {
  albumCount: number;
  mediaCount: number;
  imageCount: number;
  videoCount: number;
  categoryCount: number;
  oldestUploadAt: Date | null;
  lastUploadAt: Date | null;
  onlineNowCount: number;
};

export type HomepageData = {
  recentAlbums: AlbumSummary[];
  recentMedia: MediaSummary[];
  mapAlbums: MapAlbumSummary[];
  activity: ActivityItem[];
  stats: HomepageStats;
};
