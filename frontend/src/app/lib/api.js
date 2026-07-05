import { settings } from './api/settings';
import { library } from './api/library';
import { media } from './api/media';
import { metadata } from './api/metadata';
import { people } from './api/people';
import { lists } from './api/lists';
import {
  scan,
  image,
  hydrate,
  organizer,
  task,
  history,
  tv,
  tags,
  rename,
  recommendations,
} from './api/misc';

export const api = {
  settings,
  library,
  scan,
  image,
  hydrate,
  organizer,
  media,
  task,
  history,
  metadata,
  tv,
  people,
  tags,
  rename,
  recommendations,
  lists,
};

export default api;
