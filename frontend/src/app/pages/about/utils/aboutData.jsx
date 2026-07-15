import {
  BookOpen,
  Home,
  FolderSync,
  Library,
  Bookmark,
  Star,
  BarChart2,
  History,
  Settings
} from 'lucide-react';
import Button from '@/ui/Button';

export const getTmdbWizardSteps = (t, getWizardInputValue, handleInputChange, handleSaveSetting) => [
  {
    title: t('about.docs_wizard.tmdb.title') || 'TMDb API Integration',
    description: t('about.docs_wizard.tmdb.desc') || 'TMDb is a free movie and TV show database...'
  },
  {
    title: t('about.docs_wizard.tmdb.step_signup') || 'Create an Account',
    description: t('about.docs_wizard.tmdb.step_signup_desc') || 'First, create a free account...',
    links: [{ label: t('about.docs_wizard.tmdb.step_signup_btn') || 'Open TMDb Registration', url: 'https://www.themoviedb.org/signup' }],
    image: '/documentations/apis/tmdb1.PNG'
  },
  {
    title: t('about.docs_wizard.tmdb.step_email') || 'Receive Activation Email',
    description: t('about.docs_wizard.tmdb.step_email_desc') || 'Check your inbox...',
    image: '/documentations/apis/tmdb2.PNG'
  },
  {
    title: t('about.docs_wizard.tmdb.step_activate') || 'Activate Your Account',
    description: t('about.docs_wizard.tmdb.step_activate_desc') || 'Click on the activation button...',
    image: '/documentations/apis/tmdb3.PNG'
  },
  {
    title: t('about.docs_wizard.tmdb.step_login') || 'Log In to TMDb',
    description: t('about.docs_wizard.tmdb.step_login_desc') || 'Log in using your account details...',
    links: [{ label: t('about.docs_wizard.tmdb.step_login_btn') || 'Open TMDb Login', url: 'https://www.themoviedb.org/login' }],
    image: '/documentations/apis/tmdb4.PNG'
  },
  {
    title: t('about.docs_wizard.tmdb.step_api') || 'Request an API Key',
    description: t('about.docs_wizard.tmdb.step_api_desc') || 'After logging in, go to the API request page...',
    links: [{ label: t('about.docs_wizard.tmdb.step_api_btn') || 'Open API Request Page', url: 'https://www.themoviedb.org/settings/api/request' }],
    image: '/documentations/apis/tmdb5.png'
  },
  {
    title: t('about.docs_wizard.tmdb.step_terms') || 'Accept Terms of Service',
    description: t('about.docs_wizard.tmdb.step_terms_desc') || 'Check the box and click the blue button...',
    image: '/documentations/apis/tmdb6.PNG'
  },
  {
    title: t('about.docs_wizard.tmdb.step_details') || 'Fill in Application Details',
    description: t('about.docs_wizard.tmdb.step_details_desc') || 'Fill out this form to request your API key...',
    image: '/documentations/apis/tmdb7.PNG',
    renderInputs: () => {
      const dummyData = [
        { label: 'Application Name', value: 'my movie app' },
        { label: 'Application URL', value: 'https://www.mymovieapp.com' },
        { label: 'Application Summary', value: 'My application will show the beautiful posters and backdrops for me!' },
        { label: 'First Name', value: 'Movie' },
        { label: 'Last Name', value: 'Maniac' },
        { label: 'Email', value: 'moviemaniac77@gmail.com', noCopy: true },
        { label: 'Phone', value: '+36 70 666 7777' },
        { label: 'Address 1', value: 'Movie Street 77' },
        { label: 'City', value: 'Movie City' },
        { label: 'State', value: 'Movie State' },
        { label: 'Zip Code', value: '7777' }
      ];

      return (
        <div className="about-wizard-dummy-grid">
          {dummyData.map((d, idx) => (
            <div key={idx} className="about-wizard-dummy-item">
              <div className="about-wizard-dummy-text">
                <strong className="about-wizard-dummy-label">{d.label}</strong>
                <span className="about-wizard-dummy-value">{d.value}</span>
              </div>
              {!d.noCopy && (
                <Button
                  variant="secondary"
                  className="about-wizard-dummy-copy-btn"
                  onClick={(e) => { e.preventDefault(); navigator.clipboard.writeText(d.value); }}
                >
                  {t('about.docs_wizard.copy') || 'Copy'}
                </Button>
              )}
            </div>
          ))}
        </div>
      );
    }
  },
  {
    title: t('about.docs_wizard.tmdb.step_access') || 'Access API Key Details',
    description: t('about.docs_wizard.tmdb.step_access_desc') || 'Click on the highlighted link...',
    image: '/documentations/apis/tmdb8.PNG'
  },
  {
    title: t('about.docs_wizard.tmdb.step_save') || 'Save to SWAYA',
    description: t('about.docs_wizard.tmdb.step_save_desc') || 'Copy your API key...',
    image: '/documentations/apis/tmdb9.PNG',
    renderInputs: () => (
      <div className="about-wizard-inputs-container">
        <div className="about-wizard-input-group">
          <label className="about-wizard-input-label">
            {t('about.docs_wizard.tmdb.label_key') || 'TMDb API Key'}
          </label>
          <input
            type="text"
            value={getWizardInputValue('tmdb_api_key')}
            onChange={(e) => handleInputChange('tmdb_api_key', e.target.value)}
            className="about-wizard-input-text"
            placeholder={t('about.docs_wizard.tmdb.placeholder_key') || 'API Key...'}
          />
        </div>
        <div className="about-wizard-input-group">
          <label className="about-wizard-input-label">
            {t('about.docs_wizard.tmdb.label_token') || 'TMDb Read Access Token'}
          </label>
          <textarea
            value={getWizardInputValue('tmdb_bearer_token')}
            onChange={(e) => handleInputChange('tmdb_bearer_token', e.target.value)}
            className="about-wizard-input-textarea"
            placeholder={t('about.docs_wizard.tmdb.placeholder_token') || 'Long bearer token...'}
          />
        </div>
      </div>
    ),
    onSave: () => handleSaveSetting({ tmdb_api_key: 'tmdb_api_key', tmdb_bearer_token: 'tmdb_bearer_token' })
  }
];

export const getOmdbWizardSteps = (t, getWizardInputValue, handleInputChange, handleSaveSetting) => [
  {
    title: t('about.docs_wizard.omdb.title') || 'OMDb API Integration',
    description: t('about.docs_wizard.omdb.desc') || 'OMDb API allows SWAYA to download...'
  },
  {
    title: t('about.docs_wizard.omdb.step_req') || 'Request an API Key',
    description: t('about.docs_wizard.omdb.step_req_desc') || 'Go to the OMDb request page...',
    links: [{ label: t('about.docs_wizard.omdb.step_req_btn') || 'Open OMDb API Key Request Page', url: 'http://www.omdbapi.com/apikey.aspx' }],
    image: '/documentations/apis/omdb1.PNG',
    renderInputs: () => {
      const dummyData = [
        { label: 'First Name', value: 'Movie' },
        { label: 'Last Name', value: 'Maniac' },
        { label: 'Email', value: 'Use your registered email', noCopy: true },
        { label: 'Use', value: 'Checking imdb, rotten, and meta movie ratings.' }
      ];

      return (
        <div className="about-wizard-dummy-grid">
          {dummyData.map((d, idx) => (
            <div key={idx} className={`about-wizard-dummy-item ${d.label === 'Use' ? 'about-wizard-dummy-span-2' : ''}`}>
              <div className="about-wizard-dummy-text">
                <strong className="about-wizard-dummy-label">{d.label}</strong>
                <span className="about-wizard-dummy-value">{d.value}</span>
              </div>
              {!d.noCopy && (
                <Button
                  variant="secondary"
                  className="about-wizard-dummy-copy-btn"
                  onClick={(e) => { e.preventDefault(); navigator.clipboard.writeText(d.value); }}
                >
                  {t('about.docs_wizard.copy') || 'Copy'}
                </Button>
              )}
            </div>
          ))}
        </div>
      );
    }
  },
  {
    title: t('about.docs_wizard.omdb.step_email') || 'Receive Activation Email',
    description: t('about.docs_wizard.omdb.step_email_desc') || 'Check your inbox...',
    image: '/documentations/apis/omdb2.PNG'
  },
  {
    title: t('about.docs_wizard.omdb.step_save') || 'Activate & Save',
    description: t('about.docs_wizard.omdb.step_save_desc') || 'Open your email...',
    image: '/documentations/apis/omdb3.PNG',
    renderInputs: () => (
      <div className="about-wizard-inputs-container">
        <div className="about-wizard-input-group">
          <label className="about-wizard-input-label">
            {t('about.docs_wizard.omdb.label_key') || 'OMDb API Key'}
          </label>
          <input
            type="text"
            value={getWizardInputValue('omdb_api_key')}
            onChange={(e) => handleInputChange('omdb_api_key', e.target.value)}
            className="about-wizard-input-text"
            placeholder={t('about.docs_wizard.omdb.placeholder_key') || 'OMDb API Key...'}
          />
        </div>
      </div>
    ),
    onSave: () => handleSaveSetting({ omdb_api_key: 'omdb_api_key' })
  }
];

export const getStashdbWizardSteps = (t, getWizardInputValue, handleInputChange, handleSaveSetting) => [
  {
    title: t('about.docs_wizard.stashdb.step_intro') || 'StashDB Integration',
    description: t('about.docs_wizard.stashdb.step_intro_desc') || 'StashDB is a community adult metadata database...'
  },
  {
    title: t('about.docs_wizard.stashdb.step_register') || 'Create an Account',
    description: t('about.docs_wizard.stashdb.step_register_desc') || 'Register a new account at StashDB...',
    links: [
      { label: t('about.docs_wizard.stashdb.step_register_btn') || 'Open StashDB Registration', url: 'https://stashdb.org/register' },
      { label: t('about.docs_wizard.stashdb.step_register_admins') || 'Contact StashDB Admins', url: 'https://discourse.stashapp.cc/g/stashdb_admins' }
    ],
    renderInputs: () => {
      const inviteCodes = [
        { label: 'Invite Code A', value: 'dd9e5e76-fbd4-466c-ad96-296803275bb6' },
        { label: 'Invite Code B', value: '268df3a7-87cb-45bd-9ccf-d9a8bf2fee93' }
      ];

      return (
        <div className="about-wizard-dummy-grid">
          {inviteCodes.map((c, idx) => (
            <div key={idx} className="about-wizard-dummy-item">
              <div className="about-wizard-dummy-text">
                <strong className="about-wizard-dummy-label">{c.label}</strong>
                <span className="about-wizard-dummy-value">{c.value}</span>
              </div>
              <Button
                variant="secondary"
                className="about-wizard-dummy-copy-btn"
                onClick={(e) => { e.preventDefault(); navigator.clipboard.writeText(c.value); }}
              >
                {t('about.docs_wizard.copy') || 'Copy'}
              </Button>
            </div>
          ))}
        </div>
      );
    }
  },
  {
    title: t('about.docs_wizard.stashdb.step_activate') || 'Activate Your Profile',
    description: t('about.docs_wizard.stashdb.step_activate_desc') || 'Open the verification email...'
  },
  {
    title: t('about.docs_wizard.stashdb.step_save') || 'Retrieve your API Key',
    description: t('about.docs_wizard.stashdb.step_save_desc') || 'Log in and copy API key...',
    renderInputs: () => (
      <div className="about-wizard-inputs-container">
        <div className="about-wizard-input-group">
          <label className="about-wizard-input-label">
            {t('about.docs_wizard.stashdb.label_endpoint') || 'StashDB API Endpoint'}
          </label>
          <input
            type="text"
            value={getWizardInputValue('stashdb_endpoint')}
            onChange={(e) => handleInputChange('stashdb_endpoint', e.target.value)}
            className="about-wizard-input-text"
            placeholder={t('about.docs_wizard.stashdb.placeholder_endpoint') || 'API Endpoint...'}
          />
        </div>
        <div className="about-wizard-input-group">
          <label className="about-wizard-input-label">
            {t('about.docs_wizard.stashdb.label_key') || 'StashDB API Key'}
          </label>
          <input
            type="text"
            value={getWizardInputValue('stashdb_api_key')}
            onChange={(e) => handleInputChange('stashdb_api_key', e.target.value)}
            className="about-wizard-input-text"
            placeholder={t('about.docs_wizard.stashdb.placeholder_key') || 'StashDB API Key...'}
          />
        </div>
      </div>
    ),
    onSave: () => handleSaveSetting({ stashdb_api_key: 'stashdb_api_key', stashdb_endpoint: 'stashdb_endpoint' })
  }
];

export const getFansdbWizardSteps = (t, getWizardInputValue, handleInputChange, handleSaveSetting) => [
  {
    title: t('about.docs_wizard.fansdb.step_intro') || 'FansDB Integration',
    description: t('about.docs_wizard.fansdb.step_intro_desc') || 'FansDB is an invite-only crowdsourced metadata database...'
  },
  {
    title: t('about.docs_wizard.fansdb.step_apply') || 'Apply for Membership',
    description: t('about.docs_wizard.fansdb.step_apply_desc') || 'FansDB is currently invite-only...',
    links: [{ label: t('about.docs_wizard.fansdb.step_apply_btn') || 'Open FansDB Application Form', url: 'https://cryptpad.fr/form/#/2/form/view/qsc+HomZkJmjfQp0QRTDhN8JHgVt35pl1tG2n06Gy5o/embed/' }]
  },
  {
    title: t('about.docs_wizard.fansdb.step_register') || 'Register on FansDB',
    description: t('about.docs_wizard.fansdb.step_register_desc') || 'Once you receive your invite code...',
    links: [{ label: t('about.docs_wizard.fansdb.step_register_btn') || 'Open FansDB Registration', url: 'https://fansdb.cc/register' }]
  },
  {
    title: t('about.docs_wizard.fansdb.step_save') || 'Retrieve your API Key',
    description: t('about.docs_wizard.fansdb.step_save_desc') || 'Log in and copy API key...',
    renderInputs: () => (
      <div className="about-wizard-inputs-container">
        <div className="about-wizard-input-group">
          <label className="about-wizard-input-label">
            {t('about.docs_wizard.fansdb.label_endpoint') || 'FansDB API Endpoint'}
          </label>
          <input
            type="text"
            value={getWizardInputValue('fansdb_endpoint')}
            onChange={(e) => handleInputChange('fansdb_endpoint', e.target.value)}
            className="about-wizard-input-text"
            placeholder={t('about.docs_wizard.fansdb.placeholder_endpoint') || 'API Endpoint...'}
          />
        </div>
        <div className="about-wizard-input-group">
          <label className="about-wizard-input-label">
            {t('about.docs_wizard.fansdb.label_key') || 'FansDB API Key'}
          </label>
          <input
            type="text"
            value={getWizardInputValue('fansdb_api_key')}
            onChange={(e) => handleInputChange('fansdb_api_key', e.target.value)}
            className="about-wizard-input-text"
            placeholder={t('about.docs_wizard.fansdb.placeholder_key') || 'FansDB API Key...'}
          />
        </div>
      </div>
    ),
    onSave: () => handleSaveSetting({ fansdb_api_key: 'fansdb_api_key', fansdb_endpoint: 'fansdb_endpoint' })
  }
];

export const getPorndbWizardSteps = (t, getWizardInputValue, handleInputChange, handleSaveSetting) => [
  {
    title: t('about.docs_wizard.porndb.step_intro') || 'ThePornDB Integration',
    description: t('about.docs_wizard.porndb.step_intro_desc') || 'ThePornDB integration lets you fetch studio scene metadata...'
  },
  {
    title: t('about.docs_wizard.porndb.step_register') || 'Create an Account',
    description: t('about.docs_wizard.porndb.step_register_desc') || 'Go to the registration page...',
    links: [{ label: t('about.docs_wizard.porndb.step_register_btn') || 'Open PornDB Registration', url: 'https://theporndb.net/register' }]
  },
  {
    title: t('about.docs_wizard.porndb.step_token') || 'Generate API Token',
    description: t('about.docs_wizard.porndb.step_token_desc') || 'Navigate to the API Tokens page...',
    links: [{ label: t('about.docs_wizard.porndb.step_token_btn') || 'Open PornDB API Tokens Page', url: 'https://theporndb.net/user/api-tokens' }]
  },
  {
    title: t('about.docs_wizard.porndb.step_save') || 'Copy Token & Save',
    description: t('about.docs_wizard.porndb.step_save_desc') || 'A popup window will display your new token...',
    renderInputs: () => (
      <div className="about-wizard-inputs-container">
        <div className="about-wizard-input-group">
          <label className="about-wizard-input-label">
            {t('about.docs_wizard.porndb.label_endpoint') || 'ThePornDB API Endpoint'}
          </label>
          <input
            type="text"
            value={getWizardInputValue('porndb_endpoint')}
            onChange={(e) => handleInputChange('porndb_endpoint', e.target.value)}
            className="about-wizard-input-text"
            placeholder={t('about.docs_wizard.porndb.placeholder_endpoint') || 'API Endpoint...'}
          />
        </div>
        <div className="about-wizard-input-group">
          <label className="about-wizard-input-label">
            {t('about.docs_wizard.porndb.label_key') || 'ThePornDB API Key'}
          </label>
          <input
            type="text"
            value={getWizardInputValue('porndb_api_key')}
            onChange={(e) => handleInputChange('porndb_api_key', e.target.value)}
            className="about-wizard-input-text"
            placeholder={t('about.docs_wizard.porndb.placeholder_key') || 'ThePornDB API Key...'}
          />
        </div>
      </div>
    ),
    onSave: () => handleSaveSetting({ porndb_api_key: 'porndb_api_key', porndb_endpoint: 'porndb_endpoint' })
  }
];

export const getOfflineWizardSteps = (t) => [
  {
    title: t('about.docs_wizard.offline.step_single_title') || 'Local Offline Scan Capabilities',
    description: t('about.docs_wizard.offline.step_single_desc') || 'SWAYA works fully offline without any API keys...'
  }
];

export const getFeaturesTourData = (t) => [
  {
    id: 'general_layout',
    icon: <BookOpen size={16} />,
    title: t('about.docs_wizard.features_tour.general_layout_title') || 'Interface & Navigation',
    description: t('about.docs_wizard.features_tour.general_layout_desc') || 'Get familiar with the general layout of SWAYA, including the sidebar navigation, session mode controls, and real-time background task monitors.',
    image: '/documentations/interface/interface1.png',
    details: [
      {
        title: t('about.docs_wizard.features_tour.general_layout_details.navigation_title') || 'Sidebar Navigation',
        description: t('about.docs_wizard.features_tour.general_layout_details.navigation_desc') || 'Allows navigating between core features of SWAYA. The sidebar can be expanded or collapsed to maximize screen space for content browsing.',
        image: '/documentations/interface/interface1.png'
      },
      {
        title: t('about.docs_wizard.features_tour.general_layout_details.session_modes_title') || 'SFW / NSFW Modes (Flame Icon)',
        description: t('about.docs_wizard.features_tour.general_layout_details.session_modes_desc') || 'Located in the top header. Toggles the global session context between SFW and NSFW. NSFW mode reveals adult-oriented categories, unblurs explicit media posters, and adapts greeting titles.',
        image: '/documentations/interface/interface2.png',
        nsfw: true
      },
      {
        title: t('about.docs_wizard.features_tour.general_layout_details.background_tasks_title') || 'Background Tasks & Scanning',
        description: t('about.docs_wizard.features_tour.general_layout_details.background_tasks_desc') || 'Displays scanning status, metadata fetching, and image processing jobs in progress with live progress bars at the top of the application.',
        image: '/documentations/interface/interface3.png'
      },
      {
        title: t('about.docs_wizard.features_tour.general_layout_details.history_nav_title') || 'History Navigation (Back & Forward)',
        description: t('about.docs_wizard.features_tour.general_layout_details.history_nav_desc') || 'Located in the top header. Allows you to easily navigate back and forward through your recently visited pages, similar to a web browser.',
        image: '/documentations/interface/interface4.png'
      },
      {
        title: t('about.docs_wizard.features_tour.general_layout_details.global_search_title') || 'Global Search',
        description: t('about.docs_wizard.features_tour.general_layout_details.global_search_desc') || 'Located in the top header. Allows you to search your entire media library, performers, studios, and categories instantly from anywhere in the application.',
        image: '/documentations/interface/interface5.png'
      }
    ]
  },
  {
    id: 'dashboard',
    icon: <Home size={16} />,
    title: t('about.docs_wizard.features_tour.dashboard_title') || 'Dashboard',
    description: t('about.docs_wizard.features_tour.dashboard_desc') || 'Your library landing page and central hub. Features clean widgets showing continue watching, recently added videos, spotlight items, and database counts.',
    image: '/documentations/dashboard/dashboard1.png',
    details: [
      {
        title: t('about.docs_wizard.features_tour.dashboard_details.greeting_title') || 'Dynamic Greeting',
        description: t('about.docs_wizard.features_tour.dashboard_details.greeting_desc') || 'Greets you contextually based on the time of day, onboarding status, and SFW/NSFW session modes.',
        image: '/documentations/dashboard/dashboard1.png'
      },
      {
        title: t('about.docs_wizard.features_tour.dashboard_details.customizer_title') || 'Dashboard Customizer',
        description: t('about.docs_wizard.features_tour.dashboard_details.customizer_desc') || 'A drawer widget that allows toggling visibility and drag-and-drop reordering of widgets, persisting settings to local storage.',
        image: '/documentations/dashboard/dashboard2.png'
      },
      {
        title: t('about.docs_wizard.features_tour.dashboard_details.error_boundary_title') || 'Modular Widget System & Error Boundaries',
        description: t('about.docs_wizard.features_tour.dashboard_details.error_boundary_desc') || 'Each widget runs within its own boundary (WidgetErrorBoundary), preventing a crash in one widget from bringing down the entire dashboard.',
        image: '/documentations/dashboard/dashboard3.png'
      },
      {
        title: t('about.docs_wizard.features_tour.dashboard_details.widgets_title') || 'Context-Sensitive Content Widgets',
        description: t('about.docs_wizard.features_tour.dashboard_details.widgets_desc') || 'Includes Continue Watching, Trending (Spotlight), Fresh Arrivals, lately tracked artists, and recommendations.',
        description_nsfw: (t('about.docs_wizard.features_tour.dashboard_details.widgets_desc') || 'Includes Continue Watching, Trending (Spotlight), Fresh Arrivals, lately tracked artists, and recommendations.') + '\n\nIn NSFW mode, SFW widgets are updated to show adult stars, and recommendations are adjusted accordingly.',
        image: '/documentations/dashboard/dashboard4.png',
        image_nsfw: '/documentations/dashboard/dashboard4_nsfw.png'
      },
      {
        title: t('about.docs_wizard.features_tour.dashboard_details.adult_widget_title') || 'Adult Recommendations',
        description: t('about.docs_wizard.features_tour.dashboard_details.adult_widget_desc') || 'Exclusively displays personalized adult recommendations when the application is toggled to NSFW session mode.',
        image: '/documentations/dashboard/dashboard5.png',
        nsfw: true
      }
    ]
  },
  {
    id: 'organizer',
    icon: <FolderSync size={16} />,
    title: t('about.docs_wizard.features_tour.organizer_title') || 'Organizer',
    description: t('about.docs_wizard.features_tour.organizer_desc') || 'The control center for scanning and sorting. Input folder paths to parse video metadata, index files offline, check collisions, and match videos with online databases.',
    image: '/documentations/features/organizer.png',
    details: [
      {
        title: t('about.docs_wizard.features_tour.organizer_details.modes_title') || 'Scan Modes',
        description: t('about.docs_wizard.features_tour.organizer_details.modes_desc') || 'Run directory scans across Movies & TV Shows (TMDb) or Offline lists depending on your library setup. In SFW mode, the Offline scan organizes files under a general \'Videos\' tab, which dynamically converts to a \'Scenes\' tab when the application\'s global NSFW toggle is active.',
        description_nsfw: t('about.docs_wizard.features_tour.organizer_details.modes_desc_nsfw') || 'Run directory scans across Movies & TV Shows (TMDb) or Offline lists depending on your library setup. In SFW mode, the Offline scan organizes files under a general \'Videos\' tab, which dynamically converts to a \'Scenes\' tab when the application\'s global NSFW toggle is active.\n\nIn NSFW mode, the Movies & TV Shows scan can also query adult movies from PornDB and TMDb (including adult TV shows from TMDb). Adult matches are completely filtered out from TMDb in SFW mode, whereas in NSFW mode, the resolver specifically targets adult entries. Additionally, you can unlock the Scenes scan mode to parse performer and studio metadata using StashDB, FansDB, or PornDB.',
        image: '/documentations/features/organizer_modes.png',
        image_nsfw: '/documentations/features/organizer_modes_nsfw.png'
      },
      {
        title: t('about.docs_wizard.features_tour.organizer_details.statuses_title') || 'Statuses, Overrides & Extras',
        description: t('about.docs_wizard.features_tour.organizer_details.statuses_desc') || 'Track scan results using color-coded match statuses (Matched, Unmatched, Manual, Collision). Set custom overrides to lock matches, and let the parser automatically catalog media Extras like trailers, deleted scenes, or featurettes.',
        image: '/documentations/features/organizer_statuses.png'
      },
      {
        title: t('about.docs_wizard.features_tour.organizer_details.renaming_title') || 'Automated Renaming & In-Place Indexing',
        description: t('about.docs_wizard.features_tour.organizer_details.renaming_desc') || 'Customize your library naming layouts and automatically rename or reorganize files. For torrent seeders or users with pre-arranged collections, you can disable folder organization completely in settings, letting the program index the files in-place without moving or renaming them.',
        image: '/documentations/features/organizer_rename.png'
      },
      {
        title: t('about.docs_wizard.features_tour.organizer_details.matching_title') || 'Manual Match & Bulk Resolving',
        description: t('about.docs_wizard.features_tour.organizer_details.matching_desc') || 'Manually query and link metadata using the Match Resolver. For TV Shows, resolve matching conflicts in bulk at the series level to link entire seasons or show runs at once.',
        image: '/documentations/features/organizer_match.png'
      },
      {
        title: t('about.docs_wizard.features_tour.organizer_details.context_title') || 'Context Menus & File Deletion',
        description: t('about.docs_wizard.features_tour.organizer_details.context_desc') || 'Quickly trigger actions via right-click context menus or hover action overlay shortcuts. Manage unwanted files safely with 3 deletion levels: remove item only from database, move file to system Recycle Bin, or delete file permanently from disk.',
        image: '/documentations/features/organizer_context.png'
      },
      {
        title: t('about.docs_wizard.features_tour.organizer_details.scenes_title') || 'NSFW Scenes Scan',
        description: t('about.docs_wizard.features_tour.organizer_details.scenes_desc') || 'Retrieve performers, studio details, categories, and high-quality scene covers automatically.',
        image: '/documentations/features/organizer_scenes.png',
        nsfw: true
      }
    ]
  },
  {
    id: 'library',
    icon: <Library size={16} />,
    title: t('about.docs_wizard.features_tour.library_title') || 'Media Library',
    description: t('about.docs_wizard.features_tour.library_desc') || 'Browse and filter your entire collection. Filter by performers, studios, release year, tags, resolution, or type. Edit video settings, change posters, and add custom details.',
    image: '/documentations/features/library.png',
    details: [
      {
        title: t('about.docs_wizard.features_tour.library_details.browsing_title') || 'Library Browsing & Filtering',
        description: t('about.docs_wizard.features_tour.library_details.browsing_desc') || 'Navigate through your collection using dedicated tabs for Movies, TV Shows, and People. Find files instantly with live search, sorting criteria, and advanced filtering options.',
        image: '/documentations/features/library_browsing.png'
      },
      {
        title: t('about.docs_wizard.features_tour.library_details.movie_detail_title') || 'Movie Details',
        description: t('about.docs_wizard.features_tour.library_details.movie_detail_desc') || 'Explore comprehensive film profiles featuring box office financial statistics, production companies, critical rating matrices, cast listings, and detailed playback stats.',
        image: '/documentations/features/library_detail.png'
      },
      {
        title: t('about.docs_wizard.features_tour.library_details.tv_detail_title') || 'TV Show Details',
        description: t('about.docs_wizard.features_tour.library_details.tv_detail_desc') || 'Navigate unified seasons and episodes browsers with progressive metadata caching, next-up episode suggestion, and watch counters across individual series.',
        image: '/documentations/features/library_detail.png'
      },
      {
        title: t('about.docs_wizard.features_tour.library_details.collection_detail_title') || 'Collection Details',
        description: t('about.docs_wizard.features_tour.library_details.collection_detail_desc') || 'Browse movie/TV show groupings with integrated horizontal scroll rows and ownership badges to quickly view what items are already owned or missing from your library.',
        image: '/documentations/features/library.png'
      },
      {
        title: t('about.docs_wizard.features_tour.library_details.scene_detail_title') || 'Scene / Video Details',
        description: t('about.docs_wizard.features_tour.library_details.scene_detail_desc') || 'Immersion-first scene profiles equipped with direct 1080p streamable video previews, explicit performer/studio credits, critical network scores, and interactive watch histories.',
        description_nsfw: (t('about.docs_wizard.features_tour.library_details.scene_detail_desc') || 'Immersion-first scene profiles equipped with direct 1080p streamable video previews, explicit performer/studio credits, critical network scores, and interactive watch histories.') + '\n\nIn NSFW mode, Scenes detail pages are enriched with technical video stream specifications, explicit category tag lists, and an interactive Peaks panel. The Peaks panel displays player heatmaps showing crowd-sourced high-activity points of the video, letting you skip directly to the highlights of any matched scene.',
        image: '/documentations/features/library_detail_nsfw.png',
        nsfw: true
      },
      {
        title: t('about.docs_wizard.features_tour.library_details.people_detail_title') || 'People & Stars',
        description: t('about.docs_wizard.features_tour.library_details.people_detail_desc') || 'Dive into performer biographic entries showing anatomical measurements, career information, and dynamic grids highlighting all matching media items in your local storage.',
        description_nsfw: (t('about.docs_wizard.features_tour.library_details.people_detail_desc') || 'Dive into performer biographic entries showing anatomical measurements, career information, and dynamic grids highlighting all matching media items in your local storage.') + '\n\nIn NSFW mode, Performer profiles expand to display detailed adult profiles, including aliases, body measurements, height, weight, career spans, and interactive links to official platforms (such as Twitter/X, Instagram, and OnlyFans) to easily browse their online catalogs.',
        image: '/documentations/features/library_people.png',
        image_nsfw: '/documentations/features/library_people_nsfw.png'
      },
      {
        title: t('about.docs_wizard.features_tour.library_details.people_edit_title') || 'Performer Editor',
        description: t('about.docs_wizard.features_tour.library_details.people_edit_desc') || 'A comprehensive editor featuring linked profile registries search, data routing priority grids, manual value overrides with computed measurements generator, and age restriction validations.',
        image: '/documentations/features/library_people.png'
      },
      {
        title: t('about.docs_wizard.features_tour.library_details.tagging_title') || 'Tagging, Playlists & Watch History',
        description: t('about.docs_wizard.features_tour.library_details.tagging_desc') || 'Manage and organize cataloged files on-the-fly. Edit tags, add items to custom lists/playlists, and keep track of your watch counts and play history.',
        description_nsfw: t('about.docs_wizard.features_tour.library_details.tagging_desc_nsfw') || 'Manage and organize cataloged files on-the-fly. Edit tags, add items to custom lists/playlists, and keep track of your watch counts and play history.\n\nIn NSFW mode, you can also track interactive player peaks, video markers, and customize a distinct "Finish Count" widget on the activity panel.',
        image: '/documentations/features/library_tagging.png',
        image_nsfw: '/documentations/features/library_tagging_nsfw.png'
      }
    ]
  },
  {
    id: 'lists',
    icon: <Bookmark size={16} />,
    title: t('about.docs_wizard.features_tour.lists_title') || 'Lists',
    description: t('about.docs_wizard.features_tour.lists_desc') || 'Organize your videos into custom playlists or watch lists. Perfect for cataloguing files by genre, custom series, performer playlists, or personal favorites.',
    image: '/documentations/features/lists.png'
  },
  {
    id: 'ratings',
    icon: <Star size={16} />,
    title: t('about.docs_wizard.features_tour.ratings_title') || 'Ratings',
    description: t('about.docs_wizard.features_tour.ratings_desc') || 'Rate your videos using a clean star system. Sort your media library by rating to quickly locate your top-rated films and media.',
    image: '/documentations/features/ratings.png'
  },
  {
    id: 'statistics',
    icon: <BarChart2 size={16} />,
    title: t('about.docs_wizard.features_tour.statistics_title') || 'Statistics',
    description: t('about.docs_wizard.features_tour.statistics_desc') || 'Analyze your collection. View size breakdowns, distribution by resolution, performer/studio counts, and total library duration.',
    image: '/documentations/features/statistics.png'
  },
  {
    id: 'history',
    icon: <History size={16} />,
    title: t('about.docs_wizard.features_tour.history_title') || 'History',
    description: t('about.docs_wizard.features_tour.history_desc') || 'Track your watching habits. See what files you watched, how many times they were played, and resume from exactly where you left off.',
    image: '/documentations/features/history.png'
  },
  {
    id: 'settings',
    icon: <Settings size={16} />,
    title: t('about.docs_wizard.features_tour.settings_title') || 'Settings & Presets',
    description: t('about.docs_wizard.features_tour.settings_desc') || 'Configure the core application. Customize file naming patterns, target directories, metadata providers priority, and cache maintenance.',
    image: '/documentations/features/settings.png'
  }
];
