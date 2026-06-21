from enum import Enum
from dataclasses import dataclass
from typing import Any
from app.core.constants import DEFAULT_FALLBACK_LANGUAGE

class Casing(Enum):
    LOWER = "lower"
    UPPER = "upper"
    TITLE = "title"
    DEFAULT = "default"

class Separator(Enum):
    SPACE = " "
    DOT = "."
    DASH = "-"
    UNDERSCORE = "_"

class ExtraOrg(Enum):
    SAME_FOLDER = "same_folder"
    SUBFOLDER = "subfolder"
    CATEGORY_FOLDERS = "category_folders"

@dataclass
class FormatterConfig:
    casing: Casing = Casing.DEFAULT
    separator: Separator = Separator.SPACE
    zero_pad: bool = True
    custom_text: str = ""

    # Naming Templates
    movie_file: str = "{title} ({year}) {resolution}"
    episode_file: str = "{tv_title} - S{season}E{episode} - {episode_title}"
    scene_file: str = "{studio} {performers} {date} {title} [{resolution}]"
    scene_date_format: str = "%Y-%m-%d"
    scene_prevent_title_performer: bool = True
    scene_tag_limit: int = 0
    scene_tag_separator: str = " "
    scene_tag_blacklist: str = ""
    
    # Part Naming
    part_keyword: str = "Part"
    part_numbering: str = "numeric"
    part_separator: Separator = Separator.SPACE

    # Performer Settings (Adult)
    naming_squeeze_studio_names: bool = True
    naming_performer_limit: int = 3
    naming_performer_limit_keep: bool = False
    naming_performer_splitchar: str = " & "
    naming_performer_gender_filter: str = "all"
    naming_performer_sort: str = "order"

    # Folder Organization
    org_enabled: bool = True
    move_to_library: bool = True
    library_path: str = ""
    sort_by_type: bool = True
    movies_dir_name: str = "Movies"
    tv_dir_name: str = "TV Shows"
    adult_dir_name: str = "Adult"
    adult_movies_dir_name: str = "Movies"
    adult_tv_dir_name: str = "TV Shows"
    adult_scenes_dir_name: str = "Scenes"
    adult_jav_dir_name: str = "JAV"
    scenes_dir_name: str = "Scenes"
    naming_adult_subfolders_enabled: bool = True
    scene_grouping_mode: str = "none"
    jav_grouping_mode: str = "parent_studio_studio"
    folder_scene_template: str = ""
    folder_jav_template: str = ""
    naming_jav_template: str = "{studio} - {date} - {performers} - {title} [{resolution}]"
    collision_strategy: str = "keep_both"
    collision_duration_tolerance_seconds: int = 10
    
    # Folder Templates
    create_movie_subdir: bool = True
    movie_folder: str = "{title} ({year})"
    create_collection_dir: bool = True
    collection_folder_mode: str = "threshold"
    collection_folder_threshold: int = 3
    collection_folder: str = "{collection}"
    create_tv_dir: bool = True
    tv_folder: str = "{tv_title} ({year_range})"
    create_season_dir: bool = True
    season_folder: str = "Season {season}"
    create_episode_dir: bool = False
    episode_folder: str = "{tv_title} - {season}{episode}"
    
    remove_empty: bool = True
    
    # Extras Naming & Actions
    extras_enabled: bool = True
    extra_video_action: str = "rename"
    extra_sub_action: str = "rename"
    extra_audio_action: str = "rename"
    extra_img_action: str = "rename"
    extra_meta_action: str = "rename"
    
    # Extras Templates
    extra_video_template: str = "{parent_name}-{sub_category}"
    extra_sub_template: str = "{parent_name}.{language}"
    extra_audio_template: str = "{parent_name}.{language}"
    extra_img_template: str = "{sub_category}"
    extra_meta_template: str = "{parent_name}"
    
    # Extras Folder Placement
    extras_folder_mode: str = "subfolder"
    extras_subfolder_name: str = "Extras"
    
    # Target Language / Naming language settings
    default_target_language: str = "en"
    follow_app_language_for_naming: bool = True
    
    db_session: Any = None

    @staticmethod
    def from_db(db_session) -> 'FormatterConfig':
        from app.domains.settings.models import UserSetting, SystemSetting
        config = FormatterConfig()
        config.db_session = db_session
        try:
            settings = {}
            for s in db_session.query(SystemSetting).all():
                settings[s.key] = s.value
            for s in db_session.query(UserSetting).filter(UserSetting.user_id == 1).all():
                settings[s.key] = s.value

            config.follow_app_language_for_naming = settings.get("follow_app_language_for_naming", True)
            if config.follow_app_language_for_naming:
                config.default_target_language = settings.get("ui_language", "en")
            else:
                config.default_target_language = settings.get("default_target_language", "en")

            def localize_builtin_folder_name(setting_key: str, current_value: str):
                if not settings.get("follow_app_language_for_naming", True):
                    return current_value

                ui_lang = str(settings.get("ui_language", DEFAULT_FALLBACK_LANGUAGE) or DEFAULT_FALLBACK_LANGUAGE).lower()
                localized_aliases = {
                    "folder_movies_name": {
                        "en": {"Movies"},
                        "hu": {"Movies", "Filmek"},
                    },
                    "folder_tv_name": {
                        "en": {"TV Shows", "Shows", "TV"},
                        "hu": {"TV Shows", "Shows", "TV", "Sorozatok"},
                    },
                    "folder_adult_name": {
                        "en": {"Adult"},
                        "hu": {"Adult", "Felnőtt"},
                    },
                    "folder_adult_movies_name": {
                        "en": {"Movies"},
                        "hu": {"Movies", "Filmek"},
                    },
                    "folder_adult_tv_name": {
                        "en": {"TV Shows", "Shows", "TV"},
                        "hu": {"TV Shows", "Shows", "TV", "Sorozatok"},
                    },
                    "folder_adult_scenes_name": {
                        "en": {"Scenes"},
                        "hu": {"Scenes", "Jelenetek"},
                    },
                    "folder_adult_jav_name": {
                        "en": {"JAV"},
                        "hu": {"JAV", "JAW"},
                    },
                    "folder_scenes_name": {
                        "en": {"Scenes"},
                        "hu": {"Scenes", "Jelenetek"},
                    },
                    "extras_subfolder_name": {
                        "en": {"Extras", "extras"},
                        "hu": {"Extras", "extras", "Extrák", "extrák"},
                    },
                }
                localized_targets = {
                    "en": {
                        "folder_movies_name": "Movies",
                        "folder_tv_name": "TV Shows",
                        "folder_adult_name": "Adult",
                        "folder_adult_movies_name": "Movies",
                        "folder_adult_tv_name": "TV Shows",
                        "folder_adult_scenes_name": "Scenes",
                        "folder_adult_jav_name": "JAV",
                        "folder_scenes_name": "Scenes",
                        "extras_subfolder_name": "Extras",
                    },
                    "hu": {
                        "folder_movies_name": "Filmek",
                        "folder_tv_name": "Sorozatok",
                        "folder_adult_name": "Felnőtt",
                        "folder_adult_movies_name": "Filmek",
                        "folder_adult_tv_name": "Sorozatok",
                        "folder_adult_scenes_name": "Jelenetek",
                        "folder_adult_jav_name": "JAW",
                        "folder_scenes_name": "Jelenetek",
                        "extras_subfolder_name": "Extrák",
                    },
                }

                target_lang = "hu" if ui_lang == "hu" else "en"
                if current_value in localized_aliases.get(setting_key, {}).get(target_lang, set()):
                    return localized_targets[target_lang][setting_key]
                return current_value
            
            # Casing
            c_val = settings.get("naming_filename_casing", "default")
            if c_val == "lower": config.casing = Casing.LOWER
            elif c_val == "upper": config.casing = Casing.UPPER
            elif c_val == "title": config.casing = Casing.TITLE
            else: config.casing = Casing.DEFAULT
            
            # Separator
            s_val = settings.get("naming_word_separator", "space")
            if s_val == "dot": config.separator = Separator.DOT
            elif s_val == "dash": config.separator = Separator.DASH
            elif s_val == "underscore": config.separator = Separator.UNDERSCORE
            else: config.separator = Separator.SPACE

            # Templates (Files)            config.movie_file = settings.get("naming_movie_template", config.movie_file).replace("{{", "{").replace("}}", "}")
            config.episode_file = settings.get("naming_episode_template", config.episode_file).replace("{{", "{").replace("}}", "}")
            config.scene_file = settings.get("naming_scene_template", config.scene_file).replace("{{", "{").replace("}}", "}")
            config.scene_date_format = settings.get("naming_scene_date_format", config.scene_date_format)
            config.scene_prevent_title_performer = settings.get("naming_scene_prevent_title_performer", config.scene_prevent_title_performer)
            try:
                config.scene_tag_limit = max(0, int(settings.get("scene_tag_limit", config.scene_tag_limit)))
            except (TypeError, ValueError):
                pass
            config.scene_tag_separator = settings.get("scene_tag_separator", config.scene_tag_separator)
            config.scene_tag_blacklist = settings.get("scene_tag_blacklist", config.scene_tag_blacklist)

            # Performer Settings
            config.naming_squeeze_studio_names = settings.get("naming_squeeze_studio_names", config.naming_squeeze_studio_names)
            try:
                config.naming_performer_limit = int(settings.get("naming_performer_limit", config.naming_performer_limit))
            except (TypeError, ValueError):
                pass
            config.naming_performer_limit_keep = settings.get("naming_performer_limit_keep", config.naming_performer_limit_keep)
            config.naming_performer_splitchar = settings.get("naming_performer_splitchar", config.naming_performer_splitchar)
            config.naming_performer_gender_filter = settings.get("naming_performer_gender_filter", config.naming_performer_gender_filter)
            config.naming_performer_sort = settings.get("naming_performer_sort", config.naming_performer_sort)
            
            # Templates (Folders)
            config.movie_folder = settings.get("folder_movie_template", config.movie_folder).replace("{{", "{").replace("}}", "}")
            config.collection_folder = settings.get("folder_collection_template", config.collection_folder).replace("{{", "{").replace("}}", "}")
            config.tv_folder = settings.get("folder_show_template", config.tv_folder).replace("{{", "{").replace("}}", "}")
            config.season_folder = settings.get("folder_season_template", config.season_folder).replace("{{", "{").replace("}}", "}")
            config.episode_folder = settings.get("folder_episode_template", config.episode_folder).replace("{{", "{").replace("}}", "}")

            # Templates (Extras)
            config.extra_video_template = settings.get("extras_video_template", config.extra_video_template).replace("{{", "{").replace("}}", "}")
            config.extra_sub_template = settings.get("extras_sub_template", config.extra_sub_template).replace("{{", "{").replace("}}", "}")
            config.extra_audio_template = settings.get("extras_audio_template", config.extra_audio_template).replace("{{", "{").replace("}}", "}")
            config.extra_img_template = settings.get("extras_img_template", config.extra_img_template).replace("{{", "{").replace("}}", "}")
            config.extra_meta_template = settings.get("extras_meta_template", config.extra_meta_template).replace("{{", "{").replace("}}", "}")

            # Folder Switches
            config.org_enabled = settings.get("folder_organization_enabled", True)
            config.move_to_library = settings.get("folder_move_to_library", True)
            config.library_path = settings.get("folder_library_path", "")
            config.sort_by_type = settings.get("folder_sort_by_type", True)
            config.movies_dir_name = localize_builtin_folder_name("folder_movies_name", settings.get("folder_movies_name", "Movies"))
            config.tv_dir_name = localize_builtin_folder_name("folder_tv_name", settings.get("folder_tv_name", "TV Shows"))
            config.adult_dir_name = localize_builtin_folder_name("folder_adult_name", settings.get("folder_adult_name", "Adult"))
            config.adult_movies_dir_name = localize_builtin_folder_name("folder_adult_movies_name", settings.get("folder_adult_movies_name", "Movies"))
            config.adult_tv_dir_name = localize_builtin_folder_name("folder_adult_tv_name", settings.get("folder_adult_tv_name", "TV Shows"))
            config.adult_scenes_dir_name = localize_builtin_folder_name("folder_adult_scenes_name", settings.get("folder_adult_scenes_name", "Scenes"))
            config.adult_jav_dir_name = localize_builtin_folder_name("folder_adult_jav_name", settings.get("folder_adult_jav_name", "JAV"))
            config.scenes_dir_name = localize_builtin_folder_name("folder_scenes_name", settings.get("folder_scenes_name", "Scenes"))
            config.naming_adult_subfolders_enabled = settings.get("naming_adult_subfolders_enabled", config.naming_adult_subfolders_enabled)
            grouping_mode = settings.get("scene_grouping_mode", config.scene_grouping_mode)
            config.scene_grouping_mode = grouping_mode if grouping_mode in {"none", "studio", "parent_studio", "parent_studio_studio"} else "none"
            jav_group_mode = settings.get("jav_grouping_mode", config.jav_grouping_mode)
            config.jav_grouping_mode = jav_group_mode if jav_group_mode in {"none", "studio", "parent_studio", "parent_studio_studio"} else "none"
            config.folder_scene_template = settings.get("folder_scene_template", config.folder_scene_template).replace("{{", "{").replace("}}", "}")
            config.folder_jav_template = settings.get("folder_jav_template", config.folder_jav_template).replace("{{", "{").replace("}}", "}")
            config.naming_jav_template = settings.get("naming_jav_template", config.naming_jav_template).replace("{{", "{").replace("}}", "}")
            config.collision_strategy = settings.get("collision_strategy", "keep_both")
            config.collision_duration_tolerance_seconds = int(settings.get("collision_duration_tolerance_seconds", 10) or 10)
            
            config.create_movie_subdir = settings.get("folder_create_movie_subdir", True)
            config.create_collection_dir = settings.get("folder_create_collection_dir", True)
            raw_collection_mode = settings.get("folder_collection_mode")
            if isinstance(raw_collection_mode, str) and raw_collection_mode in {"never", "always", "threshold", "complete_only"}:
                config.collection_folder_mode = raw_collection_mode
            else:
                config.collection_folder_mode = "threshold" if config.create_collection_dir else "never"
            try:
                config.collection_folder_threshold = max(1, int(settings.get("folder_collection_threshold", 3) or 3))
            except (TypeError, ValueError):
                config.collection_folder_threshold = 3
            config.create_tv_dir = settings.get("folder_create_show_dir", True)
            config.create_season_dir = settings.get("folder_create_season_dir", True)
            config.create_episode_dir = settings.get("folder_create_episode_dir", False)
            config.remove_empty = settings.get("folder_remove_empty", True)

            # Extras Switches & Actions
            config.extras_enabled = settings.get("extras_enabled", True)
            config.extra_video_action = settings.get("extras_video_action", "rename")
            config.extra_sub_action = settings.get("extras_sub_action", "rename")
            config.extra_audio_action = settings.get("extras_audio_action", "rename")
            config.extra_img_action = settings.get("extras_img_action", "rename")
            config.extra_meta_action = settings.get("extras_meta_action", "rename")
            config.extras_folder_mode = settings.get("extras_folder_mode", "subfolder")
            config.extras_subfolder_name = localize_builtin_folder_name(
                "extras_subfolder_name",
                settings.get("extras_subfolder_name", config.extras_subfolder_name)
            )

            config.custom_text = settings.get("naming_custom_tag", "default")
            
        except Exception as e:
            print(f"Error loading FormatterConfig from DB: {e}")
        return config
