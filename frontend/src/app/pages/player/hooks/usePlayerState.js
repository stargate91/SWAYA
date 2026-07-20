import { useState, useRef, useEffect } from 'react';
import { useLibraryModeStore } from '@/stores/useLibraryModeStore';

export default function usePlayerState(isTrailer, queryTitle) {
  const [isPlaying, setIsPlaying] = useState(isTrailer);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('player_volume');
    return saved !== null ? parseInt(saved, 10) : 50;
  });
  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem('player_mute');
    return saved === 'true';
  });
  const [title, setTitle] = useState(isTrailer ? (queryTitle || 'Trailer') : 'Loading...');
  const [logoUrl, setLogoUrl] = useState(null);
  const [mediaImage, setMediaImage] = useState(null);
  const [showControls, setShowControls] = useState(true);
  const [isPip, setIsPip] = useState(false);

  // Ending Overlay States
  const [showEndOverlay, setShowEndOverlay] = useState(false);
  const [userRating, setUserRating] = useState(null);
  const [hoverRating, setHoverRating] = useState(null);
  const [nextEpisode, setNextEpisode] = useState(null);
  const [firstEpisode, setFirstEpisode] = useState(null);
  const [episodeNumber, setEpisodeNumber] = useState(null);
  const [countdown, setCountdown] = useState(10);
  const [speed, setSpeed] = useState(1.0);
  const [isAdult, setIsAdult] = useState(() => {
    try {
      const mode = useLibraryModeStore.getState().sessionMode;
      return mode === 'nsfw';
    } catch {
      return false;
    }
  });
  const [mediaType, setMediaType] = useState(null);
  const [justAddedPeak, setJustAddedPeak] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [chapters, setChapters] = useState([]);
  const [clockTime, setClockTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [trackList, setTrackList] = useState([]);
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [showSubMenu, setShowSubMenu] = useState(false);
  const [videoParams, setVideoParams] = useState(null);
  const [bottomOffset, setBottomOffset] = useState(0);
  const [osdMessage, setOsdMessage] = useState('');

  // Delay states
  const [subDelay, setSubDelay] = useState(0);
  const [audioDelay, setAudioDelay] = useState(0);

  // Discovery / End Overlay states
  const [peaksCount, setPeaksCount] = useState(0);
  const [collectionNext, setCollectionNext] = useState(null);
  const [performerUnwatched, setPerformerUnwatched] = useState(null);
  const [studioUnwatched, setStudioUnwatched] = useState(null);
  const [surpriseMe, setSurpriseMe] = useState(null);
  const [tvShowId, setTvShowId] = useState(null);
  const [tvShowTitle, setTvShowTitle] = useState(null);
  const [tvShowPoster, setTvShowPoster] = useState(null);
  const [tvShowRating, setTvShowRating] = useState(null);
  const [seasonNumber, setSeasonNumber] = useState(null);
  const [seasonPoster, setSeasonPoster] = useState(null);

  // Sync menu state when controls hide during render
  if (!showControls) {
    if (showAudioMenu) setShowAudioMenu(false);
    if (showSubMenu) setShowSubMenu(false);
  }

  // Sync logo error reset during render
  const [prevLogoUrl, setPrevLogoUrl] = useState(null);
  if (logoUrl !== prevLogoUrl) {
    setPrevLogoUrl(logoUrl);
    setLogoError(false);
  }

  const currentTimeRef = useRef(currentTime);
  const durationRef = useRef(duration);
  const volumeRef = useRef(volume);
  const isMutedRef = useRef(isMuted);
  const chaptersRef = useRef(chapters);
  const videoParamsRef = useRef(videoParams);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    chaptersRef.current = chapters;
  }, [chapters]);

  useEffect(() => {
    videoParamsRef.current = videoParams;
  }, [videoParams]);

  return {
    isPlaying, setIsPlaying,
    isPaused, setIsPaused,
    currentTime, setCurrentTime,
    duration, setDuration,
    volume, setVolume,
    isMuted, setIsMuted,
    title, setTitle,
    logoUrl, setLogoUrl,
    mediaImage, setMediaImage,
    showControls, setShowControls,
    isPip, setIsPip,
    showEndOverlay, setShowEndOverlay,
    userRating, setUserRating,
    hoverRating, setHoverRating,
    nextEpisode, setNextEpisode,
    firstEpisode, setFirstEpisode,
    episodeNumber, setEpisodeNumber,
    countdown, setCountdown,
    speed, setSpeed,
    isAdult, setIsAdult,
    mediaType, setMediaType,
    justAddedPeak, setJustAddedPeak,
    logoError, setLogoError,
    chapters, setChapters,
    clockTime, setClockTime,
    endTime, setEndTime,
    trackList, setTrackList,
    showAudioMenu, setShowAudioMenu,
    showSubMenu, setShowSubMenu,
    videoParams, setVideoParams,
    bottomOffset, setBottomOffset,
    osdMessage, setOsdMessage,
    subDelay, setSubDelay,
    audioDelay, setAudioDelay,
    peaksCount, setPeaksCount,
    collectionNext, setCollectionNext,
    performerUnwatched, setPerformerUnwatched,
    studioUnwatched, setStudioUnwatched,
    surpriseMe, setSurpriseMe,
    tvShowId, setTvShowId,
    tvShowTitle, setTvShowTitle,
    tvShowPoster, setTvShowPoster,
    tvShowRating, setTvShowRating,
    seasonNumber, setSeasonNumber,
    seasonPoster, setSeasonPoster,

    // Refs
    currentTimeRef,
    durationRef,
    volumeRef,
    isMutedRef,
    chaptersRef,
    videoParamsRef,
  };
}
