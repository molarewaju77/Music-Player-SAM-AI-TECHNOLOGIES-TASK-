/**
 * AURA — Premium Music Player
 * script.js — Clean, modular ES6 JavaScript
 */

'use strict';

/* ═══════════════════════════════════════════
   TRACK DATA
═══════════════════════════════════════════ */
const TRACKS = [
  {
    id: 1,
    title:    'Celestial Drift',
    artist:   'Nova Collective',
    genre:    'Electronic',
    duration: '3:42',
    art:      'assets/images/album1.png',
    src:      'assets/songs/song1.mp3',
  },
  {
    id: 2,
    title:    'Midnight Reverie',
    artist:   'Auric & The Silence',
    genre:    'Ambient',
    duration: '4:15',
    art:      'assets/images/album2.png',
    src:      'assets/songs/song2.mp3',
  },
  {
    id: 3,
    title:    'Silver Shoreline',
    artist:   'Pale Wave',
    genre:    'Indie Pop',
    duration: '3:28',
    art:      'assets/images/album3.png',
    src:      'assets/songs/song3.mp3',
  },
  {
    id: 4,
    title:    'Cognac Evenings',
    artist:   'Lena Moiré',
    genre:    'Jazz',
    duration: '5:07',
    art:      'assets/images/album4.png',
    src:      'assets/songs/song4.mp3',
  },
  {
    id: 5,
    title:    'Aurora Protocol',
    artist:   'Terraforma',
    genre:    'Ambient',
    duration: '6:02',
    art:      'assets/images/album5.png',
    src:      'assets/songs/song5.mp3',
  },
  {
    id: 6,
    title:    'Rose Quartz',
    artist:   'SONÉ',
    genre:    'Indie Pop',
    duration: '3:55',
    art:      'assets/images/album6.png',
    src:      'assets/songs/song6.mp3',
  },
];

/* ═══════════════════════════════════════════
   STATE
═══════════════════════════════════════════ */
const state = {
  currentIndex: 0,
  isPlaying:    false,
  isShuffle:    false,
  isRepeat:     false,
  volume:       0.8,
  isMuted:      false,
  prevVolume:   0.8,
  isDraggingProgress: false,
  isDraggingVolume:   false,
};

/* ═══════════════════════════════════════════
   DOM REFERENCES
═══════════════════════════════════════════ */
const $ = id => document.getElementById(id);

const dom = {
  audio:          $('audio-player'),
  albumArt:       $('album-art'),
  albumContainer: $('album-art-container'),
  trackTitle:     $('track-title'),
  trackArtist:    $('track-artist'),
  trackGenre:     $('track-genre'),
  trackIndex:     $('track-index'),
  trackInfo:      document.querySelector('.track-info'),
  currentTime:    $('current-time'),
  totalDuration:  $('total-duration'),
  progressBar:    $('progress-bar'),
  progressFill:   $('progress-fill'),
  progressThumb:  $('progress-thumb'),
  progressBuffer: $('progress-buffer'),
  btnPlay:        $('btn-play'),
  btnPrev:        $('btn-prev'),
  btnNext:        $('btn-next'),
  btnShuffle:     $('btn-shuffle'),
  btnRepeat:      $('btn-repeat'),
  btnMute:        $('btn-mute'),
  volIcon:        $('vol-icon'),
  volumeTrack:    $('volume-track'),
  volumeFill:     $('volume-fill'),
  volumeThumb:    $('volume-thumb'),
  volumeValue:    $('volume-value'),
  playlist:       $('playlist'),
  visualizer:     $('visualizer'),
};

/* ═══════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════ */

/**
 * Format seconds -> "M:SS"
 */
function formatTime(seconds) {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Clamp value between min and max
 */
function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

/**
 * Get a random integer in [0, n-1] excluding current
 */
function randomIndexExcluding(n, exclude) {
  if (n <= 1) return 0;
  let r;
  do { r = Math.floor(Math.random() * n); } while (r === exclude);
  return r;
}

/* ═══════════════════════════════════════════
   PLAYLIST RENDERING
═══════════════════════════════════════════ */
function renderPlaylist() {
  dom.playlist.innerHTML = '';
  TRACKS.forEach((track, index) => {
    const li = document.createElement('li');
    li.className = 'playlist-item';
    li.setAttribute('role', 'listitem');
    li.dataset.index = index;
    li.setAttribute('aria-label', `${track.title} by ${track.artist}`);

    li.innerHTML = `
      <img class="playlist-item__thumb" src="${track.art}" alt="${track.title} album art" draggable="false" />
      <div class="playlist-item__info">
        <div class="playlist-item__title">${track.title}</div>
        <div class="playlist-item__artist">${track.artist}</div>
      </div>
      <div class="playlist-item__playing" aria-hidden="true">
        <span></span><span></span><span></span>
      </div>
      <span class="playlist-item__duration">${track.duration}</span>
    `;

    li.addEventListener('click', () => loadTrack(index, true));
    dom.playlist.appendChild(li);
  });

  updatePlaylistActive();
}

function updatePlaylistActive() {
  document.querySelectorAll('.playlist-item').forEach((item, i) => {
    item.classList.toggle('is-active', i === state.currentIndex);
    item.classList.toggle('is-playing', i === state.currentIndex && state.isPlaying);
  });

  // Scroll active item into view (desktop)
  const activeItem = dom.playlist.querySelector('.playlist-item.is-active');
  if (activeItem) {
    activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

/* ═══════════════════════════════════════════
   TRACK LOADING
═══════════════════════════════════════════ */
function loadTrack(index, autoPlay = false) {
  const track = TRACKS[index];
  state.currentIndex = index;

  // Animate track info out
  dom.trackInfo.classList.add('is-switching');
  dom.albumArt.classList.add('is-switching');

  setTimeout(() => {
    // Update DOM info
    dom.trackTitle.textContent  = track.title;
    dom.trackArtist.textContent = track.artist;
    dom.trackGenre.textContent  = track.genre;
    dom.trackIndex.textContent  = `${index + 1} / ${TRACKS.length}`;
    dom.albumArt.src            = track.art;
    dom.albumArt.alt            = `${track.title} — Album Art`;

    // Reset progress
    dom.progressFill.style.width  = '0%';
    dom.progressThumb.style.left  = '0%';
    dom.progressBuffer.style.width = '0%';
    dom.currentTime.textContent   = '0:00';
    dom.totalDuration.textContent = track.duration;

    // Load audio
    dom.audio.src = track.src;
    dom.audio.load();

    // Animate back in
    dom.trackInfo.classList.remove('is-switching');
    dom.albumArt.classList.remove('is-switching');

    if (autoPlay) {
      playAudio();
    } else if (state.isPlaying) {
      playAudio();
    }
  }, 280);

  updatePlaylistActive();
  updateProgressAriaMax();
}

/* ═══════════════════════════════════════════
   PLAYBACK
═══════════════════════════════════════════ */
function playAudio() {
  const playPromise = dom.audio.play();
  if (playPromise !== undefined) {
    playPromise
      .then(() => setPlayState(true))
      .catch(err => {
        console.warn('Playback prevented:', err);
        setPlayState(false);
      });
  }
}

function pauseAudio() {
  dom.audio.pause();
  setPlayState(false);
}

function togglePlay() {
  if (state.isPlaying) {
    pauseAudio();
  } else {
    playAudio();
  }
}

function setPlayState(playing) {
  state.isPlaying = playing;
  dom.btnPlay.setAttribute('aria-pressed', playing);
  dom.btnPlay.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  dom.albumContainer.classList.toggle('is-playing', playing);
  dom.visualizer.classList.toggle('is-playing', playing);
  updatePlaylistActive();
}

function playNext() {
  let nextIndex;
  if (state.isShuffle) {
    nextIndex = randomIndexExcluding(TRACKS.length, state.currentIndex);
  } else {
    nextIndex = (state.currentIndex + 1) % TRACKS.length;
  }
  loadTrack(nextIndex, true);
}

function playPrev() {
  // If we're more than 3s in, restart current track; else go to previous
  if (dom.audio.currentTime > 3) {
    dom.audio.currentTime = 0;
    return;
  }
  const prevIndex = state.isShuffle
    ? randomIndexExcluding(TRACKS.length, state.currentIndex)
    : (state.currentIndex - 1 + TRACKS.length) % TRACKS.length;
  loadTrack(prevIndex, true);
}

/* ═══════════════════════════════════════════
   PROGRESS BAR
═══════════════════════════════════════════ */
function updateProgressAriaMax() {
  dom.progressBar.setAttribute('aria-valuemax', dom.audio.duration || 100);
}

function updateProgress() {
  if (state.isDraggingProgress) return;

  const { currentTime, duration } = dom.audio;
  if (!isFinite(duration) || duration === 0) return;

  const pct = (currentTime / duration) * 100;
  dom.progressFill.style.width = `${pct}%`;
  dom.progressThumb.style.left = `${pct}%`;
  dom.currentTime.textContent  = formatTime(currentTime);
  dom.progressBar.setAttribute('aria-valuenow', Math.round(pct));
}

function seekFromEvent(e, rect) {
  const x   = clamp((e.clientX - rect.left) / rect.width, 0, 1);
  const dur = dom.audio.duration;
  if (!isFinite(dur)) return;

  dom.audio.currentTime = x * dur;
  dom.progressFill.style.width = `${x * 100}%`;
  dom.progressThumb.style.left = `${x * 100}%`;
  dom.currentTime.textContent  = formatTime(x * dur);
  dom.progressBar.setAttribute('aria-valuenow', Math.round(x * 100));
}

function setupProgressBar() {
  const track = dom.progressBar.querySelector('.progress-bar__track');

  // Mouse events
  dom.progressBar.addEventListener('mousedown', e => {
    state.isDraggingProgress = true;
    dom.progressBar.classList.add('is-dragging');
    seekFromEvent(e, track.getBoundingClientRect());
  });

  document.addEventListener('mousemove', e => {
    if (!state.isDraggingProgress) return;
    seekFromEvent(e, track.getBoundingClientRect());
  });

  document.addEventListener('mouseup', () => {
    if (!state.isDraggingProgress) return;
    state.isDraggingProgress = false;
    dom.progressBar.classList.remove('is-dragging');
  });

  // Touch events
  dom.progressBar.addEventListener('touchstart', e => {
    state.isDraggingProgress = true;
    dom.progressBar.classList.add('is-dragging');
    seekFromEvent(e.touches[0], track.getBoundingClientRect());
  }, { passive: true });

  document.addEventListener('touchmove', e => {
    if (!state.isDraggingProgress) return;
    seekFromEvent(e.touches[0], track.getBoundingClientRect());
  }, { passive: true });

  document.addEventListener('touchend', () => {
    state.isDraggingProgress = false;
    dom.progressBar.classList.remove('is-dragging');
  });

  // Keyboard access
  dom.progressBar.addEventListener('keydown', e => {
    const dur = dom.audio.duration;
    if (!isFinite(dur)) return;
    if (e.key === 'ArrowRight') dom.audio.currentTime = clamp(dom.audio.currentTime + 5, 0, dur);
    if (e.key === 'ArrowLeft')  dom.audio.currentTime = clamp(dom.audio.currentTime - 5, 0, dur);
  });
}

/* ═══════════════════════════════════════════
   VOLUME CONTROL
═══════════════════════════════════════════ */
function setVolume(vol) {
  const v = clamp(vol, 0, 1);
  state.volume = v;
  dom.audio.volume = v;
  state.isMuted = v === 0;

  const pct = v * 100;
  dom.volumeFill.style.width  = `${pct}%`;
  dom.volumeThumb.style.left  = `${pct}%`;
  dom.volumeValue.textContent = Math.round(pct);
  dom.volumeTrack.setAttribute('aria-valuenow', Math.round(pct));

  updateVolumeIcon(v);
}

function updateVolumeIcon(vol) {
  const wave2 = dom.volIcon.querySelector('.vol-wave--2');
  if (vol === 0) {
    // Muted — show X
    dom.volIcon.innerHTML = `
      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63z"/>
      <path d="M19 12c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71z"/>
      <path d="M4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
    `;
  } else if (vol < 0.5) {
    dom.volIcon.innerHTML = `
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
    `;
  } else {
    dom.volIcon.innerHTML = `
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
      <path class="vol-wave vol-wave--2" d="M14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
    `;
  }
}

function toggleMute() {
  if (state.isMuted) {
    setVolume(state.prevVolume || 0.8);
    state.isMuted = false;
  } else {
    state.prevVolume = state.volume;
    setVolume(0);
    state.isMuted = true;
  }
}

function setupVolumeControl() {
  function setVolumeFromEvent(e, rect) {
    const x = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    setVolume(x);
  }

  dom.volumeTrack.addEventListener('mousedown', e => {
    state.isDraggingVolume = true;
    dom.volumeTrack.classList.add('is-dragging');
    setVolumeFromEvent(e, dom.volumeTrack.getBoundingClientRect());
  });

  document.addEventListener('mousemove', e => {
    if (!state.isDraggingVolume) return;
    setVolumeFromEvent(e, dom.volumeTrack.getBoundingClientRect());
  });

  document.addEventListener('mouseup', () => {
    if (!state.isDraggingVolume) return;
    state.isDraggingVolume = false;
    dom.volumeTrack.classList.remove('is-dragging');
  });

  // Touch
  dom.volumeTrack.addEventListener('touchstart', e => {
    state.isDraggingVolume = true;
    setVolumeFromEvent(e.touches[0], dom.volumeTrack.getBoundingClientRect());
  }, { passive: true });

  document.addEventListener('touchmove', e => {
    if (!state.isDraggingVolume) return;
    setVolumeFromEvent(e.touches[0], dom.volumeTrack.getBoundingClientRect());
  }, { passive: true });

  document.addEventListener('touchend', () => {
    state.isDraggingVolume = false;
    dom.volumeTrack.classList.remove('is-dragging');
  });

  // Keyboard
  dom.volumeTrack.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') setVolume(state.volume + 0.05);
    if (e.key === 'ArrowLeft')  setVolume(state.volume - 0.05);
  });

  dom.btnMute.addEventListener('click', toggleMute);
}

/* ═══════════════════════════════════════════
   SHUFFLE & REPEAT
═══════════════════════════════════════════ */
function toggleShuffle() {
  state.isShuffle = !state.isShuffle;
  dom.btnShuffle.classList.toggle('is-active', state.isShuffle);
  dom.btnShuffle.setAttribute('aria-pressed', state.isShuffle);
}

function toggleRepeat() {
  state.isRepeat = !state.isRepeat;
  dom.btnRepeat.classList.toggle('is-active', state.isRepeat);
  dom.btnRepeat.setAttribute('aria-pressed', state.isRepeat);
  dom.audio.loop = state.isRepeat;
}

/* ═══════════════════════════════════════════
   AUDIO EVENTS
═══════════════════════════════════════════ */
function setupAudioEvents() {
  // Metadata loaded — update duration
  dom.audio.addEventListener('loadedmetadata', () => {
    dom.totalDuration.textContent = formatTime(dom.audio.duration);
    updateProgressAriaMax();
    // Buffer simulation
    dom.progressBuffer.style.width = '15%';
  });

  // Progress update
  dom.audio.addEventListener('timeupdate', updateProgress);

  // Track ended
  dom.audio.addEventListener('ended', () => {
    if (state.isRepeat) return; // loop handles it
    setPlayState(false);
    playNext();
  });

  // Buffering progress
  dom.audio.addEventListener('progress', () => {
    const dur = dom.audio.duration;
    if (!isFinite(dur) || dom.audio.buffered.length === 0) return;
    const buffered = dom.audio.buffered.end(dom.audio.buffered.length - 1);
    dom.progressBuffer.style.width = `${(buffered / dur) * 100}%`;
  });

  // Error handling
  dom.audio.addEventListener('error', () => {
    console.warn('Audio error, skipping to next track.');
    setTimeout(playNext, 800);
  });
}

/* ═══════════════════════════════════════════
   KEYBOARD SHORTCUTS
═══════════════════════════════════════════ */
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    // Avoid conflicts with input fields
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        togglePlay();
        break;
      case 'ArrowRight':
        if (!e.target.closest('[role="slider"]')) {
          e.preventDefault();
          playNext();
        }
        break;
      case 'ArrowLeft':
        if (!e.target.closest('[role="slider"]')) {
          e.preventDefault();
          playPrev();
        }
        break;
      case 'KeyM':
        toggleMute();
        break;
      case 'KeyS':
        toggleShuffle();
        break;
      case 'KeyR':
        toggleRepeat();
        break;
    }
  });
}

/* ═══════════════════════════════════════════
   VISUALIZER BAR DELAYS
═══════════════════════════════════════════ */
function setupVisualizer() {
  const bars = dom.visualizer.querySelectorAll('.bar');
  bars.forEach((bar, i) => {
    bar.style.animationDelay = `${(i * 0.05).toFixed(2)}s`;
  });
}

/* ═══════════════════════════════════════════
   INIT
═══════════════════════════════════════════ */
function init() {
  // Render playlist
  renderPlaylist();

  // Load first track (don't auto-play on init)
  const first = TRACKS[0];
  dom.trackTitle.textContent  = first.title;
  dom.trackArtist.textContent = first.artist;
  dom.trackGenre.textContent  = first.genre;
  dom.trackIndex.textContent  = `1 / ${TRACKS.length}`;
  dom.albumArt.src            = first.art;
  dom.totalDuration.textContent = first.duration;
  dom.audio.src               = first.src;

  // Set initial volume
  setVolume(state.volume);

  // Wire up controls
  dom.btnPlay.addEventListener('click', togglePlay);
  dom.btnPrev.addEventListener('click', playPrev);
  dom.btnNext.addEventListener('click', playNext);
  dom.btnShuffle.addEventListener('click', toggleShuffle);
  dom.btnRepeat.addEventListener('click', toggleRepeat);

  // Setup interactive systems
  setupProgressBar();
  setupVolumeControl();
  setupAudioEvents();
  setupKeyboardShortcuts();
  setupVisualizer();

  // Update playlist count
  $('playlist-count').textContent = `${TRACKS.length} tracks`;

  console.log('🎵 Aura Music Player initialized. Keyboard shortcuts: Space=Play/Pause, ←/→=Prev/Next, M=Mute, S=Shuffle, R=Repeat');
}

// Kick off
document.addEventListener('DOMContentLoaded', init);
