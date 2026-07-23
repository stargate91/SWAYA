import React from 'react';
import Stack from '@/ui/Stack';
import Card from '@/ui/Card';
import Button from '@/ui/Button';
import { useSettingsField, useSettingsViewContext } from '../SettingsFormContext.jsx';
import SettingsSwitchField from './fields/SettingsSwitchField.jsx';
import SettingsPathField from './fields/SettingsPathField.jsx';
import SettingsTextField from './fields/SettingsTextField.jsx';
import { Info, ExternalLink } from '@/ui/icons';

export default function TorrentSettingsTab() {
  const { t } = useSettingsViewContext();
  const torrentEnabledField = useSettingsField('torrent_enabled');

  return (
    <Stack gap="xl">
      <Card title={t?.('settingsPage.sections.torrent.title') || 'Torrent Integration'}>
        <Stack gap="md">
          <SettingsSwitchField field="torrent_enabled" id="torrent_enabled">
            {t?.('settingsPage.sections.torrent.enable') || 'Enable Download Automation'}
          </SettingsSwitchField>
          <span className="settings-field-hint">
            {t?.('settingsPage.sections.torrent.hint') || 
             'Automatically downloads, runs, and integrates Jackett and qBittorrent-nox in the background to search and download movies.'}
          </span>
        </Stack>
      </Card>

      {torrentEnabledField.checked && (
        <>
          <Card title={t?.('settingsPage.sections.torrent.qbittorrent') || 'Storage Settings'}>
            <Stack gap="md">
              <SettingsPathField
                field="torrent_download_dir"
                label={t?.('settingsPage.sections.torrent.qbUrl') || 'Download Directory'}
                placeholder={t?.('settingsPage.sections.torrent.qbUrlPlaceholder') || 'Choose folder where completed torrent downloads will save...'}
                picker="folder"
                buttonLabel={t?.('common.browse') || 'Browse'}
                t={t}
              />
            </Stack>
          </Card>

          <Card title={t?.('settingsPage.sections.torrent.qbSettings') || 'qBittorrent WebUI Connection'}>
            <Stack gap="md">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <SettingsTextField
                  field="torrent_qbittorrent_port"
                  label={t?.('settingsPage.sections.torrent.qbPort') || 'WebUI Port'}
                  placeholder={t?.('settingsPage.sections.torrent.qbPortPlaceholder') || 'Default: 8080'}
                />
                <SettingsTextField
                  field="torrent_qbittorrent_user"
                  label={t?.('settingsPage.sections.torrent.qbUser') || 'WebUI Username'}
                  placeholder={t?.('settingsPage.sections.torrent.qbUserPlaceholder') || 'Default: admin'}
                />
                <SettingsTextField
                  field="torrent_qbittorrent_pass"
                  label={t?.('settingsPage.sections.torrent.qbPass') || 'WebUI Password'}
                  placeholder={t?.('settingsPage.sections.torrent.qbPassPlaceholder') || 'WebUI password...'}
                  type="password"
                />
              </div>
              <div style={{ 
                marginTop: '8px',
                padding: '12px',
                borderRadius: '6px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'var(--text-secondary)',
                fontSize: '0.9em',
                lineHeight: '1.4',
                whiteSpace: 'pre-line'
              }}>
                {t?.('settingsPage.sections.torrent.qbHelpText') || 
                 'To integrate qBittorrent with SWAYA:\n1. Open your qBittorrent client.\n2. Go to Tools -> Options -> Web UI.\n3. Enable the Web User Interface (Remote control).\n4. Set a port (default: 8080), username, and password.\n5. Paste the port, username, and password in the fields above.'}
              </div>
            </Stack>
          </Card>

          <Card title={t?.('settingsPage.sections.torrent.jackett') || 'Jackett Trackers Configuration'}>
            <Stack gap="md">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                <Info size={18} />
                <span>
                  {t?.('settingsPage.sections.torrent.jackettInfo') || 
                   'Jackett runs automatically in the background. Use the dashboard link below to add indexers (e.g. nCore, 1337x) with your credentials.'}
                </span>
              </div>
              <div>
                <Button 
                  onClick={() => window.open('http://127.0.0.1:9117', '_blank')}
                  variant="primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <ExternalLink size={16} />
                  {t?.('settingsPage.sections.torrent.openJackett') || 'Open Jackett Dashboard'}
                </Button>
              </div>
            </Stack>
          </Card>
        </>
      )}
    </Stack>
  );
}
