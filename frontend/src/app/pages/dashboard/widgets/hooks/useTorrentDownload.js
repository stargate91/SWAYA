import { useState } from 'react';
import { useSettingsQuery, useActiveTorrentsQuery } from '@/queries';

export default function useTorrentDownload() {
  const { data: settings = {} } = useSettingsQuery();
  const torrentEnabled = Boolean(settings?.torrent_enabled);

  const { data: torrentData } = useActiveTorrentsQuery(torrentEnabled);
  const activeDownloads = torrentData?.downloads || [];

  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const openSearch = (query) => {
    setSearchQuery(query);
    setSearchModalOpen(true);
  };

  const totalProgress = activeDownloads.length > 0
    ? activeDownloads.reduce((sum, d) => sum + d.progress, 0) / activeDownloads.length
    : 0;

  const overallSpeed = activeDownloads.reduce((sum, d) => sum + d.speed, 0);

  return {
    torrentEnabled,
    activeDownloads,
    totalProgress: round(totalProgress, 1),
    overallSpeed,
    searchModalOpen,
    searchQuery,
    setSearchModalOpen,
    openSearch,
  };
}

function round(value, precision) {
  const multiplier = Math.pow(10, precision || 0);
  return Math.round(value * multiplier) / multiplier;
}
