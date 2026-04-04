// src/renderer/hooks/useSocket.ts

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import usePresentationStore from '../store/usePresentation';
import { uploadPresentationAssets } from '../utils/assetUploader';

interface UseSocketOptions {
  role:       string;
  name:       string;
  serverUrl?: string;
}

function resolveServerUrl(): string {
  const hostname = window.location.hostname;
  if ((window as any).electronAPI) {
    return 'http://localhost:8765';
  }
  if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return `http://${hostname}:8765`;
  }
  return 'http://localhost:8765';
}

export function useSocket2({ role, name, serverUrl }: UseSocketOptions) {
  const socketRef         = useRef<Socket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const initTimerRef      = useRef<number | null>(null);
  const mountedRef        = useRef(true);
  const retryCountRef     = useRef(0);

  // ✅ Store ALL options as refs immediately — never read from props/state again
  const roleRef      = useRef(role);
  const nameRef      = useRef(name);
  const urlRef       = useRef(serverUrl ?? resolveServerUrl());

  // Keep refs up to date without triggering re-renders
  roleRef.current = role;
  nameRef.current = name;
  urlRef.current  = serverUrl ?? resolveServerUrl();

  const [connected, setConnected] = useState(false);

  // ── Core connect ─────────────────────────────────────────────────────────
  // ✅ No deps at all — reads everything from refs at call time
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

    // ── connect ────────────────────────────────────────────────────────────
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
        setTimeout(() => {
          if (!socket.connected) return;
          // ✅ Always read from store directly — never from hook-level variables
          const state = usePresentationStore.getState();
          if (state.presentation) {
            socket.emit('update-presentation', {
              presentation:      state.presentation,
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

    // ── sync-state ─────────────────────────────────────────────────────────
    socket.on('sync-state', (data: any) => {
      if (!mountedRef.current) return;
      console.log(
        `[useSocket] sync-state →`,
        `${data.presentation?.slides?.length ?? 0} slides,`,
        `index: ${data.currentSlideIndex}`,
      );

      // ✅ Always use getState() — never store callbacks from hook render
      const store = usePresentationStore.getState();

      if (roleRef.current === 'editor') {
        if (data.currentSlideIndex != null) {
          store.setCurrentSlideIndex(data.currentSlideIndex);
        }
        return;
      }


      if (data.presentation)              store.setPresentation(data.presentation);
      if (data.currentSlideIndex != null){
        const freshState = usePresentationStore.getState();
        const slideCount = freshState.presentation?.slides.length ?? 1;
        const safeIndex  = Math.max(0, Math.min(data.currentSlideIndex, slideCount - 1));
        store.setCurrentSlideIndex(safeIndex);
      } 
      if (data.isBlackScreen     != null) {
        if (store.isBlackScreen !== data.isBlackScreen) {
          store.toggleBlackScreen();
        }
      }
    });

    // ── presentation-updated ───────────────────────────────────────────────
    // socket.on('presentation-updated', (data: any) => {
    //   if (!mountedRef.current)          return;
    //   if (roleRef.current === 'editor') return;

    //   console.log(
    //     `[useSocket] presentation-updated →`,
    //     `${data.presentation?.slides?.length ?? 0} slides`,
    //   );

    //   const store = usePresentationStore.getState();
    //   if (data.presentation)              store.setPresentation(data.presentation);
    //   if (data.currentSlideIndex != null) store.setCurrentSlideIndex(data.currentSlideIndex);
    // });

    socket.on('push-presentation-request', () => {
      if (roleRef.current !== 'editor') return;
      
      const state = usePresentationStore.getState();
      if (!state.presentation) return;

      console.log('[useSocket] Received push-presentation-request — pushing fresh data');
      
      socket.emit('update-presentation', {
        presentation:      state.presentation,
        currentSlideIndex: state.currentSlideIndex,
      });
    });


    socket.on('presentation-updated', (data: any) => {
      if (!mountedRef.current) return;

      const store = usePresentationStore.getState();

      if (roleRef.current === 'editor') {
        // ✅ Only accept pushes explicitly tagged from mobile editor
        if (data.source === 'mobile-editor' && data.presentation) {
          console.log('[useSocket] Desktop Editor received mobile push — loading presentation');
          store.setPresentation(data.presentation);
          if (data.currentSlideIndex != null) {
            store.setCurrentSlideIndex(data.currentSlideIndex);
          }
          window.dispatchEvent(new CustomEvent('mobile-pushed-presentation',{
            detail:data.presentation
          }));
        }
        // Ignore all other presentation-updated (normal broadcast echoes)
        return;
      }

      // Non-editor clients (display, controller)
      console.log(
        `[useSocket] presentation-updated →`,
        `${data.presentation?.slides?.length ?? 0} slides`,
      );
      if (data.presentation)              store.setPresentation(data.presentation);
      if (data.currentSlideIndex != null) store.setCurrentSlideIndex(data.currentSlideIndex);
    });

    // ── slide-changed ──────────────────────────────────────────────────────
    socket.on('slide-changed', (data: { index: number }) => {
      if (!mountedRef.current) return;
      console.log(`[useSocket] slide-changed → ${data.index}`);
      usePresentationStore.getState().setCurrentSlideIndex(data.index);
    });

    // ── black-screen-toggled ───────────────────────────────────────────────
    socket.on('black-screen-toggled', (value: boolean) => {
      if (!mountedRef.current) return;
      const store = usePresentationStore.getState();
      if (store.isBlackScreen !== value) {
        store.toggleBlackScreen();
      }
    });

    // ── presentation-started ───────────────────────────────────────────────
    socket.on('presentation-started', (data: any) => {
      if (!mountedRef.current) return;
      if (data?.index != null) {
        usePresentationStore.getState().setCurrentSlideIndex(data.index);
      }
    });

    // ── presentation-stopped ───────────────────────────────────────────────
    socket.on('presentation-stopped', () => {
      // handle if needed
    });

     // ── pull-presentation (editor receives this, responds with its data) ──────────
    socket.on('pull-presentation', (data?: { requesterId?: string }) => {
      if (!mountedRef.current)          return;
      if (roleRef.current !== 'editor') return;  // only editor responds

      const state = usePresentationStore.getState();
      if (!state.presentation) {
        console.warn('[useSocket] pull-presentation: no presentation to send');
        return;
      }

      console.log(
        '[useSocket] Editor responding to pull-presentation',
        data?.requesterId ? `for ${data.requesterId}` : '',
      );

      socket.emit('presentation-pulled-response', {
        presentation: state.presentation,   // ✅ full presentation with assets
        requesterId:  data?.requesterId,
        currentSlideIndex:state.currentSlideIndex
      });
    });

    // ── presentation-pulled (mobile receives editor's presentation) ───────────────
    socket.on('presentation-pulled', (data: { presentation?: any; error?: string }) => {
      if (!mountedRef.current)          return;
      if (roleRef.current === 'editor') return;  // editor never processes this

      if (data.error) {
        console.warn('[useSocket] presentation-pulled error:', data.error);
        // Fire event so MobileEditorPage can show the error toast
        window.dispatchEvent(
          new CustomEvent('presentation-pulled', {
            detail: { error: data.error },
          }),
        );
        return;
      }

      if (!data.presentation) {
        console.warn('[useSocket] presentation-pulled: no presentation in payload');
        window.dispatchEvent(
          new CustomEvent('presentation-pulled', {
            detail: { error: 'Empty response from Desktop' },
          }),
        );
        return;
      }

      console.log(
        '[useSocket] presentation-pulled →',
        `"${data.presentation.name}"`,
        `(${data.presentation.slides?.length ?? 0} slides)`,
      );

      // ✅ Load into store
      usePresentationStore.getState().loadPresentation(data.presentation);

      // ✅ Fire window event so MobileEditorPage can show success toast
      window.dispatchEvent(
        new CustomEvent('presentation-pulled', {
          detail: data.presentation,
        }),
      );
    });

    // ── disconnect + exponential back-off ──────────────────────────────────
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
  // ✅ Strict empty deps — this effect runs ONCE and never again
  useEffect(() => {
    mountedRef.current    = true;
    retryCountRef.current = 0;

    const initDelay = roleRef.current === 'editor' ? 1500 : 300;
    initTimerRef.current = window.setTimeout(() => {
      if (mountedRef.current) connectRef.current?.();
    }, initDelay);

    return () => {
      mountedRef.current = false;

      if (initTimerRef.current !== null) {
        window.clearTimeout(initTimerRef.current);
        initTimerRef.current = null;
      }
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []); // ✅ truly empty — will never re-run

  // ── Emit helpers ──────────────────────────────────────────────────────────
  // ✅ All emit helpers also have empty deps — they read from refs/getState()
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

  const emitUpdatePresentation = useCallback((
    pres: any,
    slideIndex: number | null,
  ) => {

    emit('update-presentation', {
      presentation: pres,
      ...(slideIndex !== null && { currentSlideIndex: slideIndex }),
    });
  }, [emit]);

  const emitToggleBlackScreen = useCallback(
    () => emit('toggle-black-screen'), [emit],
  );
  const emitStartPresentation = useCallback(
    () => emit('start-presentation'),  [emit],
  );
  const emitStopPresentation = useCallback(
    () => emit('stop-presentation'),   [emit],
  );

  const emitPullPresentation = useCallback(() => {
    if (!socketRef.current?.connected) {
      console.warn('[useSocket] Cannot pull — not connected');
      return;
    }
    console.log('[useSocket] Emitting pull-presentation');
    socketRef.current.emit('pull-presentation');
  }, []);

  const emitPushPresentation = useCallback(() => {
    if (!socketRef.current?.connected) {
      console.warn('[useSocket] Cannot push — not connected');
      return;
    }
    const state = usePresentationStore.getState();
    if (!state.presentation) {
      console.warn('[useSocket] Cannot push — no presentation');
      return;
    }
    console.log('[useSocket] Emitting push (update-presentation)');
    socketRef.current.emit('update-presentation', {
      presentation:      state.presentation,
      currentSlideIndex: state.currentSlideIndex,
      source:     'mobile-editor'
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
    emitPushPresentation
  };
}

export default useSocket2;
// import { useEffect, useRef, useCallback, useState } from 'react';
// import { io, Socket } from 'socket.io-client';
// import usePresentationStore from '../store/usePresentation';

// interface UseSocketOptions {
//   role: 'editor' | 'controller' | 'display';
//   name?: string;
//   serverUrl?: string;
// }

// export function useSocket({
//   role,
//   name = 'Desktop',
//   serverUrl = 'http://localhost:8765',
// }: UseSocketOptions) {
//   const socketRef = useRef<Socket | null>(null);
//   const [isConnected, setIsConnected] = useState(false);

//   useEffect(() => {
//     const socket = io(serverUrl, {
//       transports: ['websocket', 'polling'],
//       reconnection: true,
//       reconnectionAttempts: 50,
//       reconnectionDelay: 1000,
//       // *** Match server max payload ***
//       // (client side doesn't need maxHttpBufferSize, but set timeout)
//       timeout: 30000,
//     });

//     socketRef.current = socket;

//     socket.on('connect', () => {
//       console.log(`✅ [${role}] Connected: ${socket.id}`);
//       setIsConnected(true);
//       socket.emit('register', { name, role });

//       // Editor sends current presentation on connect
//       if (role === 'editor') {
//         const state = usePresentationStore.getState();
//         if (state.presentation) {
//           console.log('📤 [editor] Sending presentation to server');
//           socket.emit('update-presentation', state.presentation);
//           // Also sync current slide index
//           socket.emit('sync-slide-index', state.currentSlideIndex);
//         }
//       }
//     });

//     socket.on('reconnect', () => {
//       console.log(`🔄 [${role}] Reconnected`);
//       socket.emit('register', { name, role });

//       if (role === 'editor') {
//         const state = usePresentationStore.getState();
//         if (state.presentation) {
//           socket.emit('update-presentation', state.presentation);
//           socket.emit('sync-slide-index', state.currentSlideIndex);
//         }
//       }
//     });

//     // ===== SYNC STATE (from server) =====
//     socket.on('sync-state', (state) => {
//       console.log(`📥 [${role}] sync-state:`, {
//         hasPresentation: !!state.presentation,
//         slideCount: state.presentation?.slides?.length,
//         serverSlideIndex: state.currentSlideIndex,
//       });

//       const store = usePresentationStore.getState();

//       if (role === 'editor') {
//         // *** BUG 2 FIX: Editor is SOURCE OF TRUTH ***
//         // Editor does NOT accept presentation or slideIndex from server
//         // Editor only accepts presenting/black screen state
//         if (state.isPresenting !== undefined) {
//           store.setIsPresenting(state.isPresenting);
//         }
//         // Don't touch currentSlideIndex or presentation!
//       } else {
//         // Controllers and displays accept everything from server
//         if (state.presentation) {
//           store.setPresentation(state.presentation);
//         }
//         if (state.currentSlideIndex !== undefined) {
//           store.setCurrentSlideIndex(state.currentSlideIndex);
//         }
//         if (state.isPresenting !== undefined) {
//           store.setIsPresenting(state.isPresenting);
//         }
//       }
//     });

//     // ===== SLIDE CHANGED =====
//     socket.on('slide-changed', (data) => {
//       if (role === 'editor') {
//         // *** BUG 2 FIX: Editor ignores slide-changed from server ***
//         // Editor manages its own slide index
//         // Only accept if it was triggered by a remote controller
//         // We know it's remote if it's different from our current index
//         // Actually, just ignore it for editor - editor is source of truth
//         return;
//       }
//       usePresentationStore.getState().setCurrentSlideIndex(data.index);
//     });

//     // ===== PRESENTATION UPDATED =====
//     socket.on('presentation-updated', (presentation) => {
//       if (role !== 'editor') {
//         usePresentationStore.getState().setPresentation(presentation);
//       }
//     });

//     socket.on('slide-updated', (data) => {
//       if (role !== 'editor') {
//         usePresentationStore.getState().updateSlide(data.index, data.slide);
//       }
//     });

//     // ===== PRESENTATION CONTROL =====
//     socket.on('presentation-started', (data) => {
//       usePresentationStore.getState().setIsPresenting(true);
//       if (data?.index !== undefined && role !== 'editor') {
//         usePresentationStore.getState().setCurrentSlideIndex(data.index);
//       }
//     });

//     socket.on('presentation-stopped', () => {
//       usePresentationStore.getState().setIsPresenting(false);
//     });

//     socket.on('black-screen-toggled', (value) => {
//       const store = usePresentationStore.getState();
//       if (value !== store.isBlackScreen) {
//         store.toggleBlackScreen();
//       }
//     });

//     socket.on('disconnect', () => {
//       console.log(`❌ [${role}] Disconnected`);
//       setIsConnected(false);
//     });

//     return () => {
//       socket.disconnect();
//     };
//   }, [serverUrl, role, name]);

//   // ===== EMIT FUNCTIONS =====
//   const emitGoToSlide = useCallback((index: number) => {
//     socketRef.current?.emit('go-to-slide', index);
//   }, []);

//   const emitNextSlide = useCallback(() => {
//     socketRef.current?.emit('next-slide');
//   }, []);

//   const emitPrevSlide = useCallback(() => {
//     socketRef.current?.emit('prev-slide');
//   }, []);

//   const emitUpdatePresentation = useCallback((presentation: any) => {
//     if (socketRef.current?.connected) {
//       socketRef.current.emit('update-presentation', presentation);
//     }
//   }, []);

//   // *** NEW: Sync just the slide index (lightweight) ***
//   const emitSyncSlideIndex = useCallback((index: number) => {
//     if (socketRef.current?.connected) {
//       socketRef.current.emit('sync-slide-index', index);
//     }
//   }, []);

//   const emitStartPresentation = useCallback(() => {
//     socketRef.current?.emit('start-presentation');
//   }, []);

//   const emitStopPresentation = useCallback(() => {
//     socketRef.current?.emit('stop-presentation');
//   }, []);

//   const emitToggleBlackScreen = useCallback(() => {
//     socketRef.current?.emit('toggle-black-screen');
//   }, []);

//   return {
//     socket: socketRef.current,
//     isConnected,
//     emitGoToSlide,
//     emitNextSlide,
//     emitPrevSlide,
//     emitUpdatePresentation,
//     emitSyncSlideIndex,
//     emitStartPresentation,
//     emitStopPresentation,
//     emitToggleBlackScreen,
//   };
// }