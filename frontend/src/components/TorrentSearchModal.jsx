import { useState, useEffect, useCallback } from 'react';
import Modal from '@/ui/Modal';
import Input from '@/ui/Input';
import Button from '@/ui/Button';
import Spinner from '@/ui/Spinner';
import Stack from '@/ui/Stack';
import Inline from '@/ui/Inline';
import { Search, Download } from '@/ui/icons';
import { useUi } from '@/providers/UiProvider';
import { useTranslation } from '@/providers/LanguageContext';
import { fetchJson } from '@/lib/http';
import styles from './TorrentSearchModal.module.css';

export default function TorrentSearchModal({ open, onClose, defaultQuery }) {
  const { t } = useTranslation();
  const { toast } = useUi();
  const [query, setQuery] = useState(defaultQuery || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloadingHash, setDownloadingHash] = useState(null);

  const [prevDefaultQuery, setPrevDefaultQuery] = useState(null);
  const [prevOpen, setPrevOpen] = useState(false);

  if (open !== prevOpen || defaultQuery !== prevDefaultQuery) {
    setPrevOpen(open);
    setPrevDefaultQuery(defaultQuery);
    if (open && defaultQuery) {
      setQuery(defaultQuery);
    }
  }

  const performSearch = useCallback(async (searchQuery = query) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const data = await fetchJson(`/api/torrent/search?query=${encodeURIComponent(searchQuery)}`);
      setResults(data.results || []);
    } catch {
      toast(t('dashboard.torrent_modal.net_error') || 'Network error performing search.', 'danger');
    } finally {
      setLoading(false);
    }
  }, [query, toast, t]);

  useEffect(() => {
    if (open && defaultQuery) {
      Promise.resolve().then(() => {
        performSearch(defaultQuery);
      });
    }
  }, [open, defaultQuery, performSearch]);

  const handleDownload = async (item) => {
    const identifier = item.magnetUri || item.downloadUrl;
    if (!identifier) {
      toast(t('dashboard.torrent_modal.no_link') || 'No valid magnet link or torrent file found.', 'danger');
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
      title={t('dashboard.torrent_modal.title') || 'Search and Download Torrents'}
      width="xl"
      height="lg"
    >
      <Stack gap="lg" className={styles['stack-container']}>
        <Inline gap="md">
          <div className={styles['input-wrapper']}>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('dashboard.torrent_modal.search_placeholder') || 'Search term...'}
              onKeyDown={(e) => e.key === 'Enter' && performSearch()}
            />
          </div>
          <Button onClick={() => performSearch()} disabled={loading} className={styles['search-button']}>
            <Search size={16} />
            {t('dashboard.torrent_modal.search') || 'Search'}
          </Button>
        </Inline>

        <div className={styles['table-container']}>
          {loading ? (
            <div className={styles['spinner-container']}>
              <Spinner size="lg" />
            </div>
          ) : results.length === 0 ? (
            <div className={styles['empty-container']}>
              {t('dashboard.torrent_modal.no_torrents') || 'No torrents found. Try searching.'}
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr className={styles['table-header-row']}>
                  <th>{t('dashboard.torrent_modal.col_title') || 'Title'}</th>
                  <th className={styles['th-size']}>{t('dashboard.torrent_modal.col_size') || 'Size'}</th>
                  <th className={styles['th-seeders']}>{t('dashboard.torrent_modal.col_seeders') || 'Seeders'}</th>
                  <th className={styles['th-peers']}>{t('dashboard.torrent_modal.col_peers') || 'Peers'}</th>
                  <th className={styles['th-source']}>{t('dashboard.torrent_modal.col_source') || 'Source'}</th>
                  <th className={styles['th-action']}>{t('dashboard.torrent_modal.col_action') || 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {results.map((item, index) => {
                  const identifier = item.magnetUri || item.downloadUrl;
                  return (
                    <tr key={index} className={styles['table-row']}>
                      <td className={styles['td-title']}>{item.title}</td>
                      <td className={styles['td-size']}>{formatBytes(item.size)}</td>
                      <td className={styles['td-seeders']}>{item.seeders}</td>
                      <td className={styles['td-peers']}>{item.leechers}</td>
                      <td className={styles['td-source']}>{item.indexer}</td>
                      <td>
                        <Button
                          variant={downloadingHash === identifier ? 'secondary' : 'primary'}
                          size="sm"
                          disabled={downloadingHash !== null}
                          onClick={() => handleDownload(item)}
                          className={styles['download-button']}
                        >
                          {downloadingHash === identifier ? (
                            <Spinner size="xs" />
                          ) : (
                            <Download size={14} />
                          )}
                          {t('dashboard.torrent_modal.btn_get') || 'Get'}
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
