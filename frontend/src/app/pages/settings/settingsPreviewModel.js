import { EXTRAS_FOLDER_MODES } from './settingsConstants.js';
import { generatePreview } from './settingsPreview.js';

const FOLDER_ICON = '\uD83D\uDCC1';
const FILE_ICON = '\uD83D\uDCC4';
const RENAME_ARROW = '\u2192';

const formatScenePreviewDate = (format) => String(format || '%Y-%m-%d')
  .replaceAll('%Y', '2024')
  .replaceAll('%m', '06')
  .replaceAll('%d', '14');

function createFolderNode(label, options = {}) {
  return {
    kind: 'folder',
    label,
    tone: options.tone || 'folder',
    topSpacing: Boolean(options.topSpacing),
    children: options.children || [],
  };
}

function getFolderLabel(path) {
  if (!path) return '';
  const cleanPath = path.replace(/\\/g, '/');
  const parts = cleanPath.split('/').filter(Boolean);
  if (parts.length > 0) {
    const lastPart = parts[parts.length - 1];
    if (/\.(mp4|mkv|avi|m4v|mov|wmv|mpg|mpeg|srt|sub|ass|vtt|ac3|dts|mp3|flac|wav|m4a|jpg|jpeg|png|gif|bmp|webp|nfo|xml|txt)$/i.test(lastPart)) {
      parts.pop();
    }
  }
  return parts[0] || '';
}

function createFileNode(label, options = {}) {
  return {
    kind: 'file',
    label,
    tone: options.tone || 'success',
    topSpacing: Boolean(options.topSpacing),
    strike: Boolean(options.strike),
  };
}

function getScenePreviewContext(form) {
  const squeezeStudios = Boolean(form.naming_squeeze_studio_names);
  const parentStudio = squeezeStudios ? 'Brazzers' : 'Brazzers';
  const studio = squeezeStudios ? 'BrazzersNetwork' : 'Brazzers Network';
  const separator = form.naming_performer_splitchar || ' & ';
  const blacklist = new Set(
    String(form.scene_tag_blacklist || '')
      .split(',')
      .map((tag) => tag.trim().toLocaleLowerCase())
      .filter(Boolean)
  );
  const tagLimit = Math.max(0, Number.parseInt(form.scene_tag_limit, 10) || 0);
  let tags = ['Audition', 'Brunette', 'Couples', 'Feature', 'HD', 'Roleplay']
    .filter((tag) => !blacklist.has(tag.toLocaleLowerCase()))
    .sort((left, right) => left.localeCompare(right));
  tags = tagLimit > 0 ? tags.slice(0, tagLimit) : [];
  return {
    date: formatScenePreviewDate(form.naming_scene_date_format),
    studio,
    parent_studio: parentStudio,
    studio_family: parentStudio,
    performers: ['Abella Danger', 'Jordi El Nino Polla'].join(separator),
    performer: ['Abella Danger', 'Jordi El Nino Polla'].join(separator),
    tags: tags.join(form.scene_tag_separator || ' '),
  };
}

function buildPreviewAssets(form) {
  const sceneContext = getScenePreviewContext(form);
  const movieFile = generatePreview(form.naming_movie_template, 'movie', form.naming_filename_casing, form.naming_word_separator, form.naming_custom_tag, true);
  const movieNameNoExt = movieFile.replace(/\.mp4$/, '');

  const helper = (template, type, defaultTmpl, defaultExt) => {
    let result = generatePreview(
      template || defaultTmpl,
      type,
      form.naming_filename_casing,
      form.naming_word_separator,
      form.naming_custom_tag,
      true
    );
    if (result) {
      return result.replace('The Matrix (1999)', movieNameNoExt);
    }
    return `${movieNameNoExt}${defaultExt}`;
  };

  return {
    movieFile,
    movieSubtitle: helper(form.extras_sub_template, 'extraSub', '{parent_name} {sub_category}', '.en.srt'),
    movieExtraVideo: helper(form.extras_video_template, 'extraVideo', '{parent_name} {sub_category}', '-trailer.mp4'),
    movieExtraAudio: helper(form.extras_audio_template, 'extraAudio', '{parent_name} {sub_category}', '.commentary.ac3'),
    movieExtraImg: helper(form.extras_img_template, 'extraImg', '{parent_name} {sub_category}', '-poster.jpg'),
    movieExtraMeta: helper(form.extras_meta_template, 'extraMeta', '{parent_name} {sub_category}', '.nfo'),
    adultMovieFile: generatePreview(form.naming_movie_template, 'adultMovie', form.naming_filename_casing, form.naming_word_separator, form.naming_custom_tag, true),
    adultFolderMovie: generatePreview(form.folder_movie_template, 'adultMovie', form.naming_filename_casing, form.naming_word_separator, form.naming_custom_tag, false),
    adultSceneFile: generatePreview(
      form.naming_scene_template || '{studio} - {performers} - {date} - {title} [{resolution}]',
      'scene',
      form.naming_filename_casing,
      form.naming_word_separator,
      form.naming_custom_tag,
      true,
      null,
      sceneContext
    ),
    adultSceneFolder: (form.folder_create_scene_subdir && form.folder_scene_template)
      ? generatePreview(
          form.folder_scene_template,
          'scene',
          form.naming_filename_casing,
          form.naming_word_separator,
          form.naming_custom_tag,
          false,
          null,
          sceneContext
        )
      : '',
    episodeFile: generatePreview(form.naming_episode_template, 'episode', form.naming_filename_casing, form.naming_word_separator, form.naming_custom_tag, true),
    adultEpisodeFile: generatePreview(form.naming_episode_template, 'adultEpisode', form.naming_filename_casing, form.naming_word_separator, form.naming_custom_tag, true),
    folderMovie: generatePreview(form.folder_movie_template, 'movie', form.naming_filename_casing, form.naming_word_separator, form.naming_custom_tag, false),
    folderTv: generatePreview(form.folder_tv_template, 'tv', form.naming_filename_casing, form.naming_word_separator, form.naming_custom_tag, false),
    adultFolderTv: generatePreview(form.folder_tv_template, 'adultTv', form.naming_filename_casing, form.naming_word_separator, form.naming_custom_tag, false),
    folderSeason: generatePreview(form.folder_season_template, 'season', form.naming_filename_casing, form.naming_word_separator, form.naming_custom_tag, false),
    folderEpisode: generatePreview(form.folder_episode_template, 'episode', form.naming_filename_casing, form.naming_word_separator, form.naming_custom_tag, false),
    folderCollection: generatePreview(form.folder_collection_template || '{Collection}', 'collection', form.naming_filename_casing, form.naming_word_separator, form.naming_custom_tag, true),
    videoFile: 'Family Vacation 2024.mp4',
    adultVideoFile: 'HomeMade Private Tape.mp4',
  };
}

function buildMovieExtraNodes(form, assets) {
  if (!form.extras_enabled) {
    return [];
  }

  const types = [
    { key: 'video', action: form.extras_video_action, assetKey: 'movieExtraVideo', origName: 'original_trailer.mp4' },
    { key: 'sub', action: form.extras_sub_action, assetKey: 'movieSubtitle', origName: 'original_subtitle.srt' },
    { key: 'audio', action: form.extras_audio_action, assetKey: 'movieExtraAudio', origName: 'original_audio.ac3' },
    { key: 'img', action: form.extras_img_action, assetKey: 'movieExtraImg', origName: 'original_poster.jpg' },
    { key: 'meta', action: form.extras_meta_action, assetKey: 'movieExtraMeta', origName: 'original_metadata.nfo' },
  ];

  const fileNodes = [];
  for (const t of types) {
    const action = t.action || 'rename';
    if (action === 'ignore') {
      fileNodes.push(createFileNode(t.origName, { tone: 'muted' }));
    } else if (action === 'delete') {
      fileNodes.push(createFileNode(assets[t.assetKey] || t.origName, { tone: 'danger', strike: true }));
    } else {
      fileNodes.push(createFileNode(assets[t.assetKey], { tone: 'muted' }));
    }
  }

  if (form.extras_folder_mode === EXTRAS_FOLDER_MODES.SUBFOLDER) {
    return [createFolderNode(form.extras_subfolder_name, { topSpacing: true, children: fileNodes })];
  }

  if (fileNodes.length > 0) {
    fileNodes[0].topSpacing = true;
  }
  return fileNodes;
}

function buildMovieNodes(form, assets) {
  let nodes;
  if (form.folder_create_movie_subdir) {
    nodes = [
      createFolderNode(getFolderLabel(assets.folderMovie), {
        children: [createFileNode(assets.movieFile), ...buildMovieExtraNodes(form, assets)],
      }),
    ];
  } else {
    nodes = [createFileNode(assets.movieFile), ...buildMovieExtraNodes(form, assets)];
  }

  if (form.folder_create_collection_dir) {
    return [createFolderNode(getFolderLabel(assets.folderCollection), { children: nodes })];
  }

  return nodes;
}

function buildAdultMovieNodes(form, assets) {
  return form.folder_create_movie_subdir
    ? [createFolderNode(getFolderLabel(assets.adultFolderMovie), { tone: 'adult', children: [createFileNode(assets.adultMovieFile, { tone: 'adult' })] })]
    : [createFileNode(assets.adultMovieFile, { tone: 'adult' })];
}

function buildAdultTvNodes(form, assets) {
  return [
    createFolderNode(getFolderLabel(assets.adultFolderTv), {
      tone: 'adult',
      children: [createFileNode(assets.adultEpisodeFile, { tone: 'adult' })],
    }),
  ];
}

function buildAdultSceneNodes(form, assets) {
  let sceneNodes = [createFileNode(assets.adultSceneFile, { tone: 'adult' })];
  if (assets.adultSceneFolder) {
    sceneNodes = [createFolderNode(getFolderLabel(assets.adultSceneFolder), { tone: 'adult', children: sceneNodes })];
  }
  if (form.scene_grouping_mode === 'studio') {
    sceneNodes = [createFolderNode(getScenePreviewContext(form).studio, { tone: 'adult', children: sceneNodes })];
  } else if (form.scene_grouping_mode === 'parent_studio') {
    sceneNodes = [createFolderNode(getScenePreviewContext(form).parent_studio, { tone: 'adult', children: sceneNodes })];
  } else if (form.scene_grouping_mode === 'parent_studio_studio') {
    sceneNodes = [
      createFolderNode(getScenePreviewContext(form).parent_studio, {
        tone: 'adult',
        children: [createFolderNode(getScenePreviewContext(form).studio, { tone: 'adult', children: sceneNodes })],
      }),
    ];
  }
  return sceneNodes;
}

function buildAdultVideoNodes(form, assets) {
  return form.folder_create_video_subdir
    ? [createFolderNode(assets.adultVideoFile.replace(/\.mp4$/, ''), { tone: 'adult', children: [createFileNode(assets.adultVideoFile, { tone: 'adult' })] })]
    : [createFileNode(assets.adultVideoFile, { tone: 'adult' })];
}

function buildAdultNodes(form, assets) {
  const movieNodes = buildAdultMovieNodes(form, assets);
  const tvNodes = buildAdultTvNodes(form, assets);
  const sceneNodes = buildAdultSceneNodes(form, assets);
  const videoNodes = buildAdultVideoNodes(form, assets);

  if (!form.naming_adult_subfolders_enabled) {
    return [...movieNodes, ...tvNodes, ...sceneNodes, ...videoNodes];
  }

  return [
    createFolderNode(form.folder_adult_movies_name, { tone: 'adult', children: movieNodes }),
    createFolderNode(form.folder_adult_tv_name, { tone: 'adult', children: tvNodes }),
    createFolderNode(form.folder_adult_scenes_name, { tone: 'adult', children: sceneNodes }),
    createFolderNode(form.folder_adult_videos_name, { tone: 'adult', children: videoNodes }),
  ];
}

function buildEpisodeFileNode(assets) {
  return createFileNode(assets.episodeFile);
}

function buildShowNodes(form, assets, options = {}) {
  if (!form.folder_create_show_dir) {
    return [createFileNode(assets.episodeFile, { topSpacing: Boolean(options.topSpacing) })];
  }

  if (!form.folder_create_season_dir) {
    return [createFolderNode(getFolderLabel(assets.folderTv), { topSpacing: Boolean(options.topSpacing), children: [buildEpisodeFileNode(assets)] })];
  }

  const seasonChildren = form.folder_create_episode_dir
    ? [createFolderNode(getFolderLabel(assets.folderEpisode), { children: [buildEpisodeFileNode(assets)] })]
    : [buildEpisodeFileNode(assets)];

  return [
    createFolderNode(getFolderLabel(assets.folderTv), {
      topSpacing: Boolean(options.topSpacing),
      children: [createFolderNode(getFolderLabel(assets.folderSeason), { children: seasonChildren })],
    }),
  ];
}

function buildVideoNodes(form, assets) {
  if (form.folder_create_video_subdir) {
    return [
      createFolderNode(assets.videoFile.replace(/\.mp4$/, ''), {
        children: [createFileNode(assets.videoFile)],
      }),
    ];
  }
  return [createFileNode(assets.videoFile)];
}

function buildOrganizedNodes(form, assets, filterType) {
  const isSort = form.folder_sort_by_type;
  const movieNodes = buildMovieNodes(form, assets);
  const tvNodes = buildShowNodes(form, assets);
  const videoNodes = buildVideoNodes(form, assets);
  const adultNodes = form.include_adult ? buildAdultNodes(form, assets) : [];

  if (filterType === 'movies') {
    const result = [];
    if (isSort) {
      result.push(createFolderNode(form.folder_movies_name, { children: movieNodes }));
    } else {
      result.push(...movieNodes);
    }

    if (form.include_adult) {
      const adultMovieNodes = buildAdultMovieNodes(form, assets);
      const innerNodes = form.naming_adult_subfolders_enabled
        ? [createFolderNode(form.folder_adult_movies_name, { tone: 'adult', children: adultMovieNodes })]
        : adultMovieNodes;

      if (form.folder_adult_library_path) {
        const adultRootLabel = `➔ ${form.folder_adult_library_path}`;
        result.push(createFolderNode(adultRootLabel, { tone: 'adult', topSpacing: true, children: innerNodes }));
      } else if (isSort) {
        result.push(createFolderNode(form.folder_adult_name, { tone: 'adult', topSpacing: true, children: innerNodes }));
      } else {
        result.push(...innerNodes.map(node => ({ ...node, tone: 'adult', topSpacing: true })));
      }
    }

    return result;
  }

  if (filterType === 'tv') {
    const result = [];
    if (isSort) {
      result.push(createFolderNode(form.folder_tv_name, { children: tvNodes }));
    } else {
      result.push(...tvNodes);
    }

    if (form.include_adult) {
      const adultTvNodes = buildAdultTvNodes(form, assets);
      const innerNodes = form.naming_adult_subfolders_enabled
        ? [createFolderNode(form.folder_adult_tv_name, { tone: 'adult', children: adultTvNodes })]
        : adultTvNodes;

      if (form.folder_adult_library_path) {
        const adultRootLabel = `➔ ${form.folder_adult_library_path}`;
        result.push(createFolderNode(adultRootLabel, { tone: 'adult', topSpacing: true, children: innerNodes }));
      } else if (isSort) {
        result.push(createFolderNode(form.folder_adult_name, { tone: 'adult', topSpacing: true, children: innerNodes }));
      } else {
        result.push(...innerNodes.map(node => ({ ...node, tone: 'adult', topSpacing: true })));
      }
    }

    return result;
  }

  if (filterType === 'scenes') {
    const adultSceneNodes = buildAdultSceneNodes(form, assets);
    const innerNodes = form.naming_adult_subfolders_enabled
      ? [createFolderNode(form.folder_adult_scenes_name, { tone: 'adult', children: adultSceneNodes })]
      : adultSceneNodes;

    if (form.folder_adult_library_path) {
      const adultRootLabel = `➔ ${form.folder_adult_library_path}`;
      return [createFolderNode(adultRootLabel, { tone: 'adult', children: innerNodes })];
    }
    if (isSort) {
      return [createFolderNode(form.folder_adult_name, { tone: 'adult', children: innerNodes })];
    }
    return innerNodes.map(node => ({ ...node, tone: 'adult' }));
  }

  const sfwNodes = [
    createFolderNode(form.folder_movies_name, { children: movieNodes }),
    createFolderNode(form.folder_tv_name, { topSpacing: true, children: tvNodes }),
    createFolderNode(form.folder_videos_name, { topSpacing: true, children: videoNodes }),
  ];

  if (isSort) {
    if (form.include_adult) {
      if (form.folder_adult_library_path) {
        const adultRootLabel = `${form.folder_adult_name} ➔ ${form.folder_adult_library_path}`;
        sfwNodes.push(createFolderNode(adultRootLabel, { tone: 'adult', topSpacing: true, children: adultNodes }));
      } else {
        sfwNodes.push(createFolderNode(form.folder_adult_name, { tone: 'adult', topSpacing: true, children: adultNodes }));
      }
    }
    return sfwNodes;
  }

  const flatNodes = [
    ...movieNodes,
    ...tvNodes.map((node, index) => ({ ...node, topSpacing: index === 0 })),
    ...videoNodes.map((node, index) => ({ ...node, topSpacing: index === 0 })),
  ];

  if (form.include_adult) {
    if (form.folder_adult_library_path) {
      const adultRootLabel = `➔ ${form.folder_adult_library_path}`;
      flatNodes.push(createFolderNode(adultRootLabel, { tone: 'adult', topSpacing: true, children: adultNodes }));
    } else {
      flatNodes.push(...adultNodes.map((node) => ({ ...node, tone: 'adult' })));
    }
  }

  return flatNodes;
}

function buildUnorganizedNodes(form, assets, filterType) {
  const extraNodes = [];
  if (form.extras_enabled) {
    const types = [
      { action: form.extras_video_action, assetKey: 'movieExtraVideo', origName: 'original_trailer.mp4' },
      { action: form.extras_sub_action, assetKey: 'movieSubtitle', origName: 'original_subtitle.srt' },
      { action: form.extras_audio_action, assetKey: 'movieExtraAudio', origName: 'original_audio.ac3' },
      { action: form.extras_img_action, assetKey: 'movieExtraImg', origName: 'original_poster.jpg' },
      { action: form.extras_meta_action, assetKey: 'movieExtraMeta', origName: 'original_metadata.nfo' },
    ];
    for (const t of types) {
      const action = t.action || 'rename';
      const node = action === 'ignore'
        ? createFileNode(t.origName, { tone: 'muted' })
        : action === 'delete'
          ? createFileNode(assets[t.assetKey] || t.origName, { tone: 'danger', strike: true })
          : createFileNode(assets[t.assetKey], { tone: 'muted' });
      extraNodes.push(node);
    }
    if (extraNodes.length > 0) {
      extraNodes[0].topSpacing = true;
    }
  }

  if (filterType === 'movies') {
    const result = [createFileNode(assets.movieFile), ...extraNodes];
    if (form.include_adult) {
      if (form.folder_adult_library_path) {
        const adultRootLabel = `➔ ${form.folder_adult_library_path}`;
        result.push(createFolderNode(adultRootLabel, { tone: 'adult', topSpacing: true, children: [createFileNode(assets.adultMovieFile, { tone: 'adult' })] }));
      } else {
        result.push(createFileNode(assets.adultMovieFile, { tone: 'adult', topSpacing: true }));
      }
    }
    return result;
  }

  if (filterType === 'tv') {
    const result = [createFileNode(assets.episodeFile)];
    if (form.include_adult) {
      if (form.folder_adult_library_path) {
        const adultRootLabel = `➔ ${form.folder_adult_library_path}`;
        result.push(createFolderNode(adultRootLabel, { tone: 'adult', topSpacing: true, children: [createFileNode(assets.adultEpisodeFile, { tone: 'adult' })] }));
      } else {
        result.push(createFileNode(assets.adultEpisodeFile, { tone: 'adult', topSpacing: true }));
      }
    }
    return result;
  }

  if (filterType === 'scenes') {
    if (form.folder_adult_library_path) {
      const adultRootLabel = `➔ ${form.folder_adult_library_path}`;
      return [createFolderNode(adultRootLabel, { tone: 'adult', children: [createFileNode(assets.adultMovieFile, { tone: 'adult' })] })];
    }
    return [createFileNode(assets.adultMovieFile, { tone: 'adult' })];
  }

  const nodes = [
    createFileNode(assets.movieFile),
    ...extraNodes,
    createFileNode(assets.episodeFile),
    createFileNode(assets.videoFile, { topSpacing: true }),
  ];

  if (form.include_adult) {
    if (form.folder_adult_library_path) {
      const adultRootLabel = `➔ ${form.folder_adult_library_path}`;
      nodes.push(createFolderNode(adultRootLabel, { tone: 'adult', topSpacing: true, children: [createFileNode(assets.adultMovieFile, { tone: 'adult' })] }));
    } else {
      nodes.push(createFileNode(assets.adultMovieFile, { tone: 'adult', topSpacing: true }));
    }
  }

  return nodes;
}

function buildRenameItems(form, assets, filterType) {
  const isRegisterOnly = !form.folder_organization_enabled;

  const movieItems = [
    { 
      before: 'original_movie_file.mp4', 
      after: isRegisterOnly ? 'original_movie_file.mp4' : assets.movieFile, 
      afterTone: isRegisterOnly ? 'muted' : 'success',
      noStrikeBefore: isRegisterOnly,
      registered: isRegisterOnly
    }
  ];

  if (form.extras_enabled) {
    const types = [
      { action: form.extras_video_action, assetKey: 'movieExtraVideo', origName: 'original_trailer.mp4' },
      { action: form.extras_sub_action, assetKey: 'movieSubtitle', origName: 'original_subtitle.srt' },
      { action: form.extras_audio_action, assetKey: 'movieExtraAudio', origName: 'original_audio.ac3' },
      { action: form.extras_img_action, assetKey: 'movieExtraImg', origName: 'original_poster.jpg' },
      { action: form.extras_meta_action, assetKey: 'movieExtraMeta', origName: 'original_metadata.nfo' },
    ];

    for (const t of types) {
      const action = t.action || 'rename';
      if (action === 'delete') {
        if (isRegisterOnly) {
          movieItems.push({ 
            before: t.origName, 
            after: t.origName, 
            afterTone: 'muted',
            noStrikeBefore: true,
            registered: true
          });
        } else {
          movieItems.push({ before: t.origName, after: 'Deleted', afterTone: 'danger', strike: true });
        }
      } else if (action === 'ignore') {
        movieItems.push({ 
          before: t.origName, 
          after: t.origName, 
          afterTone: 'muted',
          noStrikeBefore: isRegisterOnly,
          registered: isRegisterOnly
        });
      } else {
        movieItems.push({ 
          before: t.origName, 
          after: isRegisterOnly ? t.origName : (assets[t.assetKey] || t.origName), 
          afterTone: 'muted',
          noStrikeBefore: isRegisterOnly,
          registered: isRegisterOnly
        });
      }
    }
  }

  const tvItems = [
    { 
      before: 'original_episode_file.mp4', 
      after: isRegisterOnly ? 'original_episode_file.mp4' : assets.episodeFile, 
      afterTone: isRegisterOnly ? 'muted' : 'success',
      noStrikeBefore: isRegisterOnly,
      registered: isRegisterOnly
    }
  ];

  const videoItems = [
    { 
      before: 'original_video_file.mp4', 
      after: isRegisterOnly ? 'original_video_file.mp4' : assets.videoFile, 
      afterTone: isRegisterOnly ? 'muted' : 'success',
      noStrikeBefore: isRegisterOnly,
      registered: isRegisterOnly
    }
  ];

  const adultItems = [];
  if (form.include_adult) {
    adultItems.push({ 
      before: 'original_adult_movie_file.mp4', 
      after: isRegisterOnly ? 'original_adult_movie_file.mp4' : assets.adultMovieFile, 
      afterTone: isRegisterOnly ? 'muted' : 'adult',
      noStrikeBefore: isRegisterOnly,
      registered: isRegisterOnly
    });
  }

  if (filterType === 'movies') {
    return movieItems;
  }
  if (filterType === 'tv') {
    return tvItems;
  }
  if (filterType === 'scenes') {
    return adultItems;
  }

  return [...movieItems, ...tvItems, ...videoItems, ...adultItems];
}

export function buildStructurePreviewModel(form, t, filterType) {
  const assets = buildPreviewAssets(form);

  if (!form.folder_move_to_library) {
    return {
      mode: 'rename',
      rootIcon: FOLDER_ICON,
      fileIcon: FILE_ICON,
      arrow: RENAME_ARROW,
      rootLabel: t('settingsPage.sections.organization.previewScanFolderPlaceholder'),
      items: buildRenameItems(form, assets, filterType),
    };
  }

  let rootLabel = (form.folder_library_path || '').trim() || t('settingsPage.sections.organization.previewTargetFolderPlaceholder');
  if (filterType === 'scenes' && form.folder_adult_library_path) {
    rootLabel = form.folder_adult_library_path;
  }

  return {
    mode: 'tree',
    rootIcon: FOLDER_ICON,
    fileIcon: FILE_ICON,
    folderIcon: FOLDER_ICON,
    rootLabel,
    nodes: form.folder_organization_enabled
      ? buildOrganizedNodes(form, assets, filterType)
      : buildUnorganizedNodes(form, assets, filterType),
  };
}
