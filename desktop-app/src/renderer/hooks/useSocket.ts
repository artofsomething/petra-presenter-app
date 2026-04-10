// src/renderer/hooks/useSocket.ts
import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import usePresentationStore from '../store/usePresentation';
import { uploadPresentationAssets } from '../utils/assetUploader';
import { rewriteAssetUrls } from '../utils/rewriteAssetUrls';

interface UseSocketOptions {
  role:       string;
  name:       string;
  serverUrl?: string;
}

function resolveServerUrl(): string {
  const hostname = window.location.hostname;
  if ((window as any).electronAPI) return 'http://localhost:8765';
  if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return `http://${hostname}:8765`;
  }
  return 'http://localhost:8765';
}

export function useSocket({ role, name, serverUrl }: UseSocketOptions) {
  const socketRef           = useRef<Socket | null>(null);
  const reconnectTimerRef   = useRef<number | null>(null);
  const initTimerRef        = useRef<number | null>(null);
  const mountedRef          = useRef(true);
  const retryCountRef       = useRef(0);

  const roleRef = useRef(role);
  const nameRef = useRef(name);
  const urlRef  = useRef(serverUrl ?? resolveServerUrl());

  roleRef.current = role;
  nameRef.current = name;
  urlRef.current  = serverUrl ?? resolveServerUrl();

  const [connected, setConnected] = useState(false);

  // ── URL rewrite helper ────────────────────────────────────────────────────
  // On Electron:  rewrites any <ip>:8765 → localhost:8765
  // On mobile:    rewrites localhost:8765 → real server IP
  // Always safe to call — no-op when URLs already correct
  const safeRewrite = useCallback(<T extends object>(data: T): T => {
    try {
      return rewriteAssetUrls(data);
    } catch (err) {
      console.error('[useSocket] rewriteAssetUrls failed:', err);
      return data;
    }
  }, []);

  // ── Shared upload helper ──────────────────────────────────────────────────
  const uploadAndGetPresentation = useCallback(async (
    presentation: any,
  ): Promise<any> => {
    try {
      console.log('[useSocket] Uploading assets to shared folder...');
      const uploaded = await uploadPresentationAssets(presentation);
      console.log('[useSocket] ✅ Assets uploaded');
      return uploaded;
    } catch (err) {
      console.error('[useSocket] Asset upload failed — sending raw:', err);
      return presentation;
    }
  }, []);

  // ── Core connect ──────────────────────────────────────────────────────────
  const connectRef = useRef<() => void>(() => {});

  connectRef.current = () => {
    if (!mountedRef.current)          return;
    if (socketRef.current?.connected) return;

    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const url  = urlRef.current;
    const role = roleRef.current;
    const name = nameRef.current;

    console.log(`[useSocket] Connecting to ${url} as "${role}"...`);

    const socket = io(url, {
      transports:   ['websocket', 'polling'],
      reconnection: false,
      timeout:      10000,
      forceNew:     true,
    });

    socketRef.current = socket;

    // ── connect ───────────────────────────────────────────────────────────
    socket.on('connect', () => {
      if (!mountedRef.current) return;
      console.log(`[useSocket] ✅ Connected as "${roleRef.current}" — ${socket.id}`);
      setConnected(true);
      retryCountRef.current = 0;

      socket.emit('register', {
        name: nameRef.current,
        role: roleRef.current,
      });

      if (roleRef.current === 'editor') {
        setTimeout(async () => {
          if (!socket.connected) return;
          const state = usePresentationStore.getState();
          if (state.presentation) {
            const uploaded = await uploadPresentationAssets(state.presentation);
            socket.emit('update-presentation', {
              presentation:      uploaded,
              currentSlideIndex: state.currentSlideIndex,
            });
          }
          socket.emit('request-sync');
        }, 600);
      } else {
        setTimeout(() => {
          if (!socket.connected) return;
          socket.emit('request-sync');
        }, 300);
      }
    });

    // ── sync-state ────────────────────────────────────────────────────────
   socket.on('sync-state', (data: any) => {
      if (!mountedRef.current) return;

      const store = usePresentationStore.getState();

      if (roleRef.current === 'editor') {
        if (data.currentSlideIndex != null) {
          store.setCurrentSlideIndex(data.currentSlideIndex);
        }
        return;
      }

      // ✅ Rewrite URLs for non-editor clients
      if (data.presentation) {
        const safe = safeRewrite(data.presentation);
        store.setPresentation(safe);
      }

      if (data.currentSlideIndex != null) {
        const freshState = usePresentationStore.getState();
        const slideCount = freshState.presentation?.slides.length ?? 1;
        const safeIndex  = Math.max(0, Math.min(data.currentSlideIndex, slideCount - 1));
        store.setCurrentSlideIndex(safeIndex);

        // ✅ Also update stage store for stage-display
        if (roleRef.current === 'stage-display') {
          const { stage } = usePresentationStore.getState();
          if (stage.presentingFileId) {
            store.stageSetSlide(stage.presentingFileId, safeIndex);
            store.stageSetPresentingFile(stage.presentingFileId, safeIndex);
          }
        }
      }

      if (data.isBlackScreen != null) {
        if (store.isBlackScreen !== data.isBlackScreen) store.toggleBlackScreen();
      }

      // ✅ Sync presenting state for stage-display
      if (roleRef.current === 'stage-display' && data.isPresenting != null) {
        if (store.isPresenting !== data.isPresenting) {
          store.setIsPresenting(data.isPresenting);
        }
      }
    });

    // ── push-presentation-request ─────────────────────────────────────────
    socket.on('push-presentation-request', async () => {
      if (roleRef.current !== 'editor') return;

      const state = usePresentationStore.getState();
      if (!state.presentation) return;

      console.log('[useSocket] push-presentation-request — uploading + pushing');
      const uploaded = await uploadPresentationAssets(state.presentation);

      socket.emit('update-presentation', {
        presentation:      uploaded,
        currentSlideIndex: state.currentSlideIndex,
      });
    });

    // ── presentation-updated ──────────────────────────────────────────────
    socket.on('presentation-updated', (data: any) => {
      if (!mountedRef.current) return;

      const store = usePresentationStore.getState();

      if (roleRef.current === 'editor') {
        // ✅ FIX: Accept mobile push and rewrite real IP → localhost
        if (data.source === 'mobile-editor' && data.presentation) {
          console.log('[useSocket] Desktop: received mobile push — rewriting URLs');

          console.group('[DEBUG] Mobile → Desktop: RAW payload URLs');
          data.presentation.slides?.forEach((slide: any, si: number) => {
            if (slide.backgroundImage) 
              console.log(`  Slide[${si}] bgImage:`, slide.backgroundImage);
            if (slide.backgroundVideo) 
              console.log(`  Slide[${si}] bgVideo:`, slide.backgroundVideo);
            slide.elements?.forEach((el: any, ei: number) => {
              if (el.src)      console.log(`  Slide[${si}] El[${ei}] src:`,      el.src);
              if (el.videoSrc) console.log(`  Slide[${si}] El[${ei}] videoSrc:`, el.videoSrc);
            });
          });
          console.groupEnd();

          const safe = safeRewrite(data.presentation);

          // ── TRACE every asset URL after rewrite ───────────────────────────────
          console.group('[DEBUG] Mobile → Desktop: AFTER safeRewrite URLs');
          safe.slides?.forEach((slide: any, si: number) => {
            if (slide.backgroundImage) 
              console.log(`  Slide[${si}] bgImage:`, slide.backgroundImage);
            if (slide.backgroundVideo) 
              console.log(`  Slide[${si}] bgVideo:`, slide.backgroundVideo);
            slide.elements?.forEach((el: any, ei: number) => {
              if (el.src)      console.log(`  Slide[${si}] El[${ei}] src:`,      el.src);
              if (el.videoSrc) console.log(`  Slide[${si}] El[${ei}] videoSrc:`, el.videoSrc);
            });
          });
          console.groupEnd();
          store.setPresentation(safe);

          if (data.currentSlideIndex != null) {
            store.setCurrentSlideIndex(data.currentSlideIndex);
          }
          window.dispatchEvent(new CustomEvent('mobile-pushed-presentation', {
            detail: safe,
          }));
        }
        // Ignore all other echoes
        return;
      }

      // ✅ Non-editor clients: rewrite URLs before loading
      console.log(
        '[useSocket] presentation-updated →',
        `${data.presentation?.slides?.length ?? 0} slides`,
      );

      if (data.presentation) {
        const safe = safeRewrite(data.presentation);
        store.setPresentation(safe);
      }

      if (data.currentSlideIndex != null) {
        store.setCurrentSlideIndex(data.currentSlideIndex);
      }
    });

    // ── slide-changed ─────────────────────────────────────────────────────
    socket.on('slide-changed', (data: { index: number; senderId?: string }) => {
      if (!mountedRef.current) return;
      console.log(`[useSocket] slide-changed → ${data.index}`);

      // ✅ Always update the main store
      usePresentationStore.getState().setCurrentSlideIndex(data.index);

      // ✅ If stage-display, ALSO update the stage store
      if (roleRef.current === 'stage-display') {
        const store = usePresentationStore.getState();
        const { stage } = store;

        // Only update if we're presenting and have a presenting file
        if (stage.presentingFileId) {
          store.stageSetSlide(stage.presentingFileId, data.index);
          store.stageSetPresentingFile(stage.presentingFileId, data.index);
          console.log(`[useSocket] stage-display: stageSetSlide → ${data.index}`);
        }
      }
    });

    // ── black-screen-toggled ──────────────────────────────────────────────
    socket.on('black-screen-toggled', (data: any) => {
      if (!mountedRef.current) return;

      // ✅ Handle both old (bool) and new ({value, senderId}) format
      const value = typeof data === 'boolean' ? data : data?.value;
      if (typeof value !== 'boolean') return;

      console.log(`[useSocket] black-screen-toggled → ${value}`);
      const store = usePresentationStore.getState();
      if (store.isBlackScreen !== value) store.toggleBlackScreen();
    });

    // ── presentation-started ──────────────────────────────────────────────
    socket.on('presentation-started', (data: any) => {
      if (!mountedRef.current) return;
      console.log('[useSocket] presentation-started received');

      if (data?.index != null) {
        usePresentationStore.getState().setCurrentSlideIndex(data.index);
      }

      // ✅ Update stage-display presenting state
      if (roleRef.current === 'stage-display') {
        const store = usePresentationStore.getState();
        store.setIsPresenting(true);

        if (data?.index != null && store.stage.presentingFileId) {
          store.stageSetSlide(store.stage.presentingFileId, data.index);
          store.stageSetPresentingFile(store.stage.presentingFileId, data.index);
        }
        console.log('[useSocket] stage-display: setIsPresenting(true)');
      }
    });

    // ── presentation-stopped ──────────────────────────────────────────────
    socket.on('presentation-stopped', (data?: any) => {
      if (!mountedRef.current) return;
      console.log('[useSocket] presentation-stopped received');

      // ✅ Update stage-display presenting state
      if (roleRef.current === 'stage-display') {
        usePresentationStore.getState().setIsPresenting(false);
        console.log('[useSocket] stage-display: setIsPresenting(false)');
      }
    });

    // ── pull-presentation ─────────────────────────────────────────────────
    socket.on('pull-presentation', async (data?: { requesterId?: string }) => {
      if (!mountedRef.current)          return;
      if (roleRef.current !== 'editor') return;

      const state = usePresentationStore.getState();
      if (!state.presentation) {
        console.warn('[useSocket] pull-presentation: no presentation to send');
        return;
      }

      console.log(
        '[useSocket] Editor: uploading assets for pull response',
        data?.requesterId ? `→ ${data.requesterId}` : '',
      );

      const uploaded = await uploadPresentationAssets(state.presentation);

      socket.emit('presentation-pulled-response', {
        presentation:      uploaded,
        requesterId:       data?.requesterId,
        currentSlideIndex: state.currentSlideIndex,
      });

      console.log('[useSocket] ✅ pull-response sent with uploaded assets');
    });

    // ── presentation-pulled ───────────────────────────────────────────────
    socket.on('presentation-pulled', (data: {
      presentation?: any;
      error?:        string;
    }) => {
      if (!mountedRef.current)          return;
      if (roleRef.current === 'editor') return;

      if (data.error) {
        console.warn('[useSocket] presentation-pulled error:', data.error);
        window.dispatchEvent(new CustomEvent('presentation-pulled', {
          detail: { error: data.error },
        }));
        return;
      }

      if (!data.presentation) {
        console.warn('[useSocket] presentation-pulled: empty payload');
        window.dispatchEvent(new CustomEvent('presentation-pulled', {
          detail: { error: 'Empty response from Desktop' },
        }));
        return;
      }

      console.log(
        '[useSocket] presentation-pulled →',
        `"${data.presentation.name}"`,
        `(${data.presentation.slides?.length ?? 0} slides)`,
      );

      // ✅ Rewrite localhost → real server IP for mobile
      const safe = safeRewrite(data.presentation);

      console.log('[useSocket] presentation-pulled: URLs rewritten for this client');

      usePresentationStore.getState().loadPresentation(safe);

      window.dispatchEvent(new CustomEvent('presentation-pulled', {
        detail: safe,
      }));
    });

    // ── disconnect + exponential back-off ─────────────────────────────────
    socket.on('disconnect', (reason: string) => {
      if (!mountedRef.current) return;
      console.log(`[useSocket] Disconnected: ${reason}`);
      setConnected(false);

      if (reason === 'io client disconnect') return;

      const delay = Math.min(
        2000 * Math.pow(1.5, retryCountRef.current),
        30000,
      );
      retryCountRef.current += 1;
      console.log(
        `[useSocket] Retry in ${Math.round(delay / 1000)}s`,
        `(attempt ${retryCountRef.current})`,
      );

      reconnectTimerRef.current = window.setTimeout(() => {
        if (mountedRef.current) connectRef.current?.();
      }, delay);
    });

    socket.on('connect_error', (err: Error) => {
      if (!mountedRef.current) return;
      console.warn(`[useSocket] Connect error: ${err.message}`);
      socket.disconnect();
    });
  };

  // ── Mount / unmount ───────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current    = true;
    retryCountRef.current = 0;

    const initDelay = roleRef.current === 'editor' ? 1500 : 300;
    initTimerRef.current = window.setTimeout(() => {
      if (mountedRef.current) connectRef.current?.();
    }, initDelay);

    return () => {
      mountedRef.current = false;
      if (initTimerRef.current      !== null) window.clearTimeout(initTimerRef.current);
      if (reconnectTimerRef.current !== null) window.clearTimeout(reconnectTimerRef.current);
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // ── Emit helpers ──────────────────────────────────────────────────────────
  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn(`[useSocket] Cannot emit "${event}" — not connected`);
    }
  }, []);

  const emitNextSlide = useCallback(() => {
    usePresentationStore.getState().nextSlide();
    emit('next-slide');
  }, [emit]);

  const emitPrevSlide = useCallback(() => {
    usePresentationStore.getState().prevSlide();
    emit('prev-slide');
  }, [emit]);

  const emitGoToSlide = useCallback((index: number) => {
    usePresentationStore.getState().setCurrentSlideIndex(index);
    emit('go-to-slide', index);
  }, [emit]);

  const emitSyncSlideIndex = useCallback((index: number) => {
    emit('update-slide-index', index);
  }, [emit]);

  const emitUpdatePresentation = useCallback(async (
    pres:       any,
    slideIndex: number | null,
  ) => {
    if (!socketRef.current?.connected) {
      console.warn('[useSocket] Cannot emit update — not connected');
      return;
    }
    console.log('[useSocket] emitUpdatePresentation — uploading assets...');
    const uploaded = await uploadPresentationAssets(pres);
    socketRef.current.emit('update-presentation', {
      presentation: uploaded,
      ...(slideIndex !== null && { currentSlideIndex: slideIndex }),
    });
  }, []);

  const emitToggleBlackScreen = useCallback(() => emit('toggle-black-screen'), [emit]);
  const emitStartPresentation  = useCallback(() => emit('start-presentation'),  [emit]);
  const emitStopPresentation   = useCallback(() => emit('stop-presentation'),   [emit]);

  const emitPullPresentation = useCallback(() => {
    if (!socketRef.current?.connected) {
      console.warn('[useSocket] Cannot pull — not connected');
      return;
    }
    console.log('[useSocket] Emitting pull-presentation');
    socketRef.current.emit('pull-presentation');
  }, []);

  const emitPushPresentation = useCallback(async () => {
    if (!socketRef.current?.connected) {
      console.warn('[useSocket] Cannot push — not connected');
      return;
    }
    const state = usePresentationStore.getState();
    if (!state.presentation) {
      console.warn('[useSocket] Cannot push — no presentation');
      return;
    }
    console.log('[useSocket] emitPushPresentation — uploading assets...');
    const uploaded = await uploadPresentationAssets(state.presentation);
    console.group('[DEBUG] Mobile emitPush: URLs being sent to Desktop');
    uploaded.slides?.forEach((slide: any, si: number) => {
      if (slide.backgroundImage) 
        console.log(`  Slide[${si}] bgImage:`, slide.backgroundImage);
      slide.elements?.forEach((el: any, ei: number) => {
        if (el.src)      console.log(`  Slide[${si}] El[${ei}] src:`,      el.src);
        if (el.videoSrc) console.log(`  Slide[${si}] El[${ei}] videoSrc:`, el.videoSrc);
      });
    });
    console.groupEnd();
    console.log('[useSocket] ✅ Pushing uploaded presentation');
    socketRef.current.emit('update-presentation', {
      presentation:      uploaded,
      currentSlideIndex: state.currentSlideIndex,
      source:            'mobile-editor',
    });
  }, []);

  return {
    connected,
    isConnected:             connected,
    socket:                  socketRef,
    emit,
    emitNextSlide,
    emitPrevSlide,
    emitGoToSlide,
    emitSyncSlideIndex,
    emitUpdatePresentation,
    emitToggleBlackScreen,
    emitStartPresentation,
    emitStopPresentation,
    emitPullPresentation,
    emitPushPresentation,
  };
}

export default useSocket;