import React, { useState, useEffect } from 'react';
import Modal from '@/ui/Modal';
import Input from '@/ui/Input';
import Button from '@/ui/Button';
import Spinner from '@/ui/Spinner';
import Stack from '@/ui/Stack';
import Inline from '@/ui/Inline';
import { Search, Download, CheckCircle } from '@/ui/icons';
import { useUi } from '@/providers/UiProvider';

import { fetchJson } from '@/lib/http';

export default function TorrentSearchModal({ open, onClose, defaultQuery }) {
  const { toast } = useUi();
  const [query, setQuery] = useState(defaultQuery || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloadingHash, setDownloadingHash] = useState(null);

  const performSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await fetchJson(`/api/torrent/search?query=${encodeURIComponent(query)}`);
      setResults(data.results || []);
    } catch (err) {
      toast('Network error performing search.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && defaultQuery) {
      setQuery(defaultQuery);
      performSearch();
    }
  }, [open, defaultQuery]);

  const handleDownload = async (item) => {
    const identifier = item.magnetUri || item.downloadUrl;
    if (!identifier) {
      toast('No valid magnet link or torrent file found.', 'danger');
      return;
    }
    setDownloadingHash(identifier);
    try {
      await fetchJson('/api/torrent/download', {
        method: 'POST',
        body: JSON.stringify({ torrent_url: identifier })
      });
      toast(`Download started: ${item.title}`, 'success');
    } catch (err) {
      toast(err.message || 'Failed to start download.', 'danger');
    } finally {
      setDownloadingHash(null);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Search and Download Torrents"
      width="xl"
      height="lg"
    >
      <Stack gap="lg" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Inline gap="md">
          <div style={{ flex: 1 }}>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search term..."
              onKeyDown={(e) => e.key === 'Enter' && performSearch()}
            />
          </div>
          <Button onClick={performSearch} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Search size={16} />
            Search
          </Button>
        </Inline>

        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: '300px', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', backgroundColor: 'var(--bg-card)' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '300px' }}>
              <Spinner size="lg" />
            </div>
          ) : results.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '300px', color: 'var(--text-secondary)' }}>
              No torrents found. Try searching.
            </div>
          ) : (
            <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '12px' }}>Title</th>
                  <th style={{ padding: '12px', width: '90px' }}>Size</th>
                  <th style={{ padding: '12px', width: '80px', color: '#10b981' }}>Seeders</th>
                  <th style={{ padding: '12px', width: '80px', color: '#ef4444' }}>Peers</th>
                  <th style={{ padding: '12px', width: '100px' }}>Source</th>
                  <th style={{ padding: '12px', width: '90px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {results.map((item, index) => {
                  const identifier = item.magnetUri || item.downloadUrl;
                  return (
                    <tr key={index} style={{ borderBottom: '1px solid var(--border-color)', hover: { backgroundColor: 'var(--bg-hover)' } }}>
                      <td style={{ padding: '12px', fontWeight: '500', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</td>
                      <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>{formatBytes(item.size)}</td>
                      <td style={{ padding: '12px', color: '#10b981', fontWeight: 'bold' }}>{item.seeders}</td>
                      <td style={{ padding: '12px', color: '#ef4444' }}>{item.leechers}</td>
                      <td style={{ padding: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.indexer}</td>
                      <td style={{ padding: '12px' }}>
                        <Button
                          variant={downloadingHash === identifier ? 'secondary' : 'primary'}
                          size="sm"
                          disabled={downloadingHash !== null}
                          onClick={() => handleDownload(item)}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          {downloadingHash === identifier ? (
                            <Spinner size="xs" />
                          ) : (
                            <Download size={14} />
                          )}
                          Get
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Stack>
    </Modal>
  );
}
