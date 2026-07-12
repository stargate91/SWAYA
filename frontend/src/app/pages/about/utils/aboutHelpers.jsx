/* eslint-disable react-refresh/only-export-components */
import { shell } from '../../../lib/electron';

export const LOGO_LETTER = 'S';
export const APP_TITLE_TEXT = 'SWAYA';
export const VERSION_CHAR = 'v';
export const DEV_AVATAR_LETTER = 'L';
export const GITHUB_LABEL = 'GitHub';
export const NSFW_TEXT = 'NSFW';

export const SILUR_NAME = 'Silur';
export const KERRIGAN_NAME = 'Kerrigan';
export const GITHUB_1_LABEL = 'GitHub 1';
export const GITHUB_2_LABEL = 'GitHub 2';
export const BULLET_SEP = '•';
export const YASHOCK_NAME = 'YaShock';
export const DATA_NAME = 'Data';

export const CAMERA_EMOJI = '📷 ';
export const COLON_SEPARATOR = ': ';
export const CHECKMARK_EMOJI = '✓ ';
export const CROSS_EMOJI = '✗ ';

export const tmdbAttributionLogoSrc = 'https://www.themoviedb.org/assets/2/v4/logos/v2/blue_square_2-d537fb228cf3ded904ef09b136fe3fec72548ebc1fea3fbbd1ad9e36364db38b.svg';

export const GitHubIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="about-social-icon">
    <path d="M12 .5C5.649.5.5 5.649.5 12A11.5 11.5 0 0 0 8.36 22.08c.575.106.785-.25.785-.556 0-.274-.01-1-.016-1.963-3.184.692-3.855-1.534-3.855-1.534-.52-1.323-1.27-1.675-1.27-1.675-1.038-.71.078-.696.078-.696 1.148.08 1.752 1.178 1.752 1.178 1.02 1.75 2.675 1.245 3.327.952.104-.739.399-1.245.726-1.531-2.542-.289-5.215-1.271-5.215-5.657 0-1.249.446-2.271 1.176-3.071-.118-.289-.51-1.452.111-3.026 0 0 .96-.307 3.146 1.173A10.94 10.94 0 0 1 12 6.03c.977.004 1.962.132 2.882.389 2.184-1.48 3.143-1.173 3.143-1.173.623 1.574.231 2.737.113 3.026.732.8 1.175 1.822 1.175 3.07 0 4.397-2.678 5.365-5.228 5.649.41.353.775 1.05.775 2.117 0 1.529-.014 2.762-.014 3.138 0 .31.207.668.79.555A11.503 11.503 0 0 0 23.5 12C23.5 5.649 18.351.5 12 .5Z" />
  </svg>
);

export const DiscordIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="about-social-icon">
    <path
      d="M20.317 4.37A19.791 19.791 0 0 0 15.429 3a13.915 13.915 0 0 0-.625 1.29 18.27 18.27 0 0 0-5.608 0A13.935 13.935 0 0 0 8.57 3a19.736 19.736 0 0 0-4.89 1.372C.587 9.04-.252 13.59.167 18.075a19.9 19.9 0 0 0 5.993 2.925 14.312 14.312 0 0 0 1.282-2.11 12.944 12.944 0 0 1-2.014-.98c.17-.124.337-.254.498-.388 3.885 1.824 8.101 1.824 11.94 0 .163.134.33.264.5.388a12.88 12.88 0 0 1-2.016.982A14.218 14.218 0 0 0 17.632 21a19.857 19.857 0 0 0 5.995-2.925c.492-5.195-.84-9.705-3.31-13.705ZM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.21 0 2.176 1.095 2.156 2.418 0 1.334-.955 2.419-2.156 2.419Zm7.96 0c-1.182 0-2.156-1.085-2.156-2.419 0-1.333.955-2.418 2.156-2.418 1.21 0 2.177 1.095 2.157 2.418 0 1.334-.947 2.419-2.157 2.419Z"
      fill="currentColor"
    />
  </svg>
);

export function openExternalLink(url) {
  if (shell) {
    shell.openExternal(url);
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
