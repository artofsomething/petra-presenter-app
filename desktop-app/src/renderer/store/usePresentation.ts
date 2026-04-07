// src/renderer/store/usePresentation.ts
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
    Presentation,
    Slide,
    SlideElement,
    AnimatedBackground,
    StageDisplay,
    StageFile
} from '../../server/types';


interface PresentationState {
  presentation: Presentation | null;
  currentSlideIndex: number;
  selectedElementId: string | null;
  isPresenting: boolean;
  isBlackScreen: boolean;

  // Actions
  createNewPresentation: (name: string) => void;
  setPresentation: (presentation: Presentation) => void;
  setCurrentSlideIndex: (index: number) => void;
  setSelectedElementId: (id: string | null) => void;
  nextSlide: () => void;
  prevSlide: () => void;
  goToSlide: (index: number) => void;
  addSlide: (index?: number) => void;
  deleteSlide: (index: number) => void;
  duplicateSlide: (index: number) => void;
  updateSlide: (index: number, slide: Partial<Slide>) => void;
  addElement: (slideIndex: number, element: SlideElement) => void;
  updateElement: (
    slideIndex: number,
    elementId: string,
    updates: Partial<SlideElement>
  ) => void;
  deleteElement: (slideIndex: number, elementId: string) => void;
  reorderSlides: (fromIndex: number, toIndex: number) => void;
  setIsPresenting: (value: boolean) => void;
  toggleBlackScreen: () => void;
  saveToJSON: () => string;
  loadFromJSON: (json: string) => void;

  // Layer ordering actions
  bringToFront: (slideIndex: number, elementId: string) => void;
  sendToBack: (slideIndex: number, elementId: string) => void;
  moveLayerUp: (slideIndex: number, elementId: string) => void;
  moveLayerDown: (slideIndex: number, elementId: string) => void;
  moveToLayer: (slideIndex: number, elementId: string, newIndex: number) => void;
  updatePresentationName:(name:string)=>void;
  copyElement: (elementId:string)=>void;
  toggleLockElement: (elementId:string)=>void;
  loadPresentation: (presentation: Presentation) => void;
  updateSlideBackground: (updates : {backgroundColor?:string, backgroundGradient?:any; backgroundImage?:string, backgroundVideo?:string;animatedBackground?:AnimatedBackground|undefined})=>void;

  //Stage Display
  stage: StageDisplay;
  stageLoadFile: (file:StageFile)=>void;
  stageRemoveFile: (fileId:string)=>void;
  stageSetActiveFile: (fileId:string)=>void;
  stageSetSlide: (fileId:string, slideIndex: number)=>void;
  stageClear: ()=>void;
  stageSetPresentingFile: (fileId: string | null,slideIndex?:number) => void; // ✅ 
}

const createDefaultSlide = (order: number): Slide => ({
  id: uuidv4(),
  order,
  backgroundColor: '#ffffff',
  backgroundImage: undefined,
  backgroundVideo: undefined,
  backgroundVideoLoop: true,
  backgroundVideoMuted: true,
  animatedBackground:undefined,
  elements: [],
  notes: '',
});
const usePresentationStore = create<PresentationState>((set, get) => ({
  presentation: null,
  currentSlideIndex: 0,
  selectedElementId: null,
  isPresenting: false,
  isBlackScreen: false,

  createNewPresentation: (name: string) => {
    const presentation: Presentation = {
      id: uuidv4(),
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      slides: [createDefaultSlide(0)],
      settings: {
        width: 1920,
        height: 1080,
        defaultTransition: 'fade',
      },
    };
    set({ presentation, currentSlideIndex: 0 });
  },

updateSlideBackground: (updates: {
  backgroundColor?:    string;
  backgroundGradient?: any;
  backgroundImage?:    string;
  backgroundVideo?:    string;
  animatedBackground?: AnimatedBackground | undefined;
}) => {
  set((state) => {
    if (!state.presentation) return state;

    const slides = state.presentation.slides.map((slide, i) => {
      if (i !== state.currentSlideIndex) return slide;

      // ✅ When setting animatedBackground, clear static backgrounds
      // When setting a static background, clear animatedBackground
      const isSettingAnimated =
        updates.animatedBackground !== undefined;

      const isSettingStatic =
        updates.backgroundColor    !== undefined ||
        updates.backgroundGradient !== undefined ||
        updates.backgroundImage    !== undefined ||
        updates.backgroundVideo    !== undefined;

      return {
        ...slide,
        ...updates,
        // ✅ Mutually exclusive: animated vs static
        ...(isSettingAnimated && isSettingStatic === false ? {
          backgroundColor:    undefined,
          backgroundGradient: undefined,
          backgroundImage:    undefined,
        } : {}),
        ...(isSettingStatic ? {
          animatedBackground: undefined,
        } : {}),
      };
    });

    return {
      presentation: {
        ...state.presentation,
        slides,
        updatedAt: new Date().toISOString(),
      },
    };
  });
},
copyElement: (elementId: string) => {
  set((state) => {
    if (!state.presentation) return state;

    const slide = state.presentation.slides[state.currentSlideIndex];
    const element = slide?.elements.find((el) => el.id === elementId);
    if (!element) return state;

    // ✅ Clone with new ID + slight offset so it's visible
    const copied: SlideElement = {
      ...element,
      id: crypto.randomUUID(),
      x: element.x + 20,
      y: element.y + 20,
    };

    const updatedSlides = state.presentation.slides.map((s, i) => {
      if (i !== state.currentSlideIndex) return s;
      return { ...s, elements: [...s.elements, copied] };
    });

    return {
      presentation: { ...state.presentation, slides: updatedSlides },
      selectedElementId: copied.id, // ✅ Auto-select the new copy
    };
  });
},

toggleLockElement: (elementId: string) => {
  set((state) => {
    if (!state.presentation) return state;

    const updatedSlides = state.presentation.slides.map((s, i) => {
      if (i !== state.currentSlideIndex) return s;
      return {
        ...s,
        elements: s.elements.map((el) =>
          el.id === elementId
            ? { ...el, isLocked: !el.isLocked }
            : el
        ),
      };
    });

    return {
      presentation: { ...state.presentation, slides: updatedSlides },
    };
  });
},
  setPresentation: (presentation) => set({ presentation }),
  setCurrentSlideIndex: (index) => set((state)=>
    { if(!state.presentation)return {};
  const maxIndex = state.presentation.slides.length -1 ;
  const safeIndex = Math.max(0, Math.min(index, maxIndex));
  return {currentSlideIndex:safeIndex};
}),
  setSelectedElementId: (id) => set({ selectedElementId: id }),

  nextSlide: () => {
    const { presentation, currentSlideIndex } = get();
    if (
      presentation &&
      currentSlideIndex < presentation.slides.length - 1
    ) {
      set({ currentSlideIndex: currentSlideIndex + 1 });
    }
  },

  prevSlide: () => {
    const { currentSlideIndex } = get();
    if (currentSlideIndex > 0) {
      set({ currentSlideIndex: currentSlideIndex - 1 });
    }
  },

  goToSlide: (index) => {
    const { presentation } = get();
    if (
      presentation &&
      index >= 0 &&
      index < presentation.slides.length
    ) {
      set({ currentSlideIndex: index });
    }
  },

  addSlide: (index?: number) => {
    const { presentation } = get();
    if (!presentation) return;

    const newSlide = createDefaultSlide(presentation.slides.length);
    const insertIndex = index ?? presentation.slides.length;
    const updatedSlides = [...presentation.slides];
    updatedSlides.splice(insertIndex, 0, newSlide);

    set({
      presentation: {
        ...presentation,
        slides: updatedSlides,
        updatedAt: new Date().toISOString(),
      },
    });
  },

  deleteSlide: (index) => {
    const { presentation, currentSlideIndex } = get();
    if (!presentation || presentation.slides.length <= 1) return;

    const updatedSlides = presentation.slides.filter(
      (_, i) => i !== index
    );
    const newIndex = Math.min(
      currentSlideIndex,
      updatedSlides.length - 1
    );

    set({
      presentation: {
        ...presentation,
        slides: updatedSlides,
        updatedAt: new Date().toISOString(),
      },
      currentSlideIndex: newIndex,
    });
  },

 duplicateSlide: (index) => {
  const { presentation } = get();
  if (!presentation) return;

  // ✅ Deep clone preserves animatedBackground config
  const duplicated: Slide = {
    ...JSON.parse(JSON.stringify(presentation.slides[index])),
    id:    uuidv4(),
    order: index + 1,
  };

  const updatedSlides = [...presentation.slides];
  updatedSlides.splice(index + 1, 0, duplicated);

  set({
      presentation: {
        ...presentation,
        slides:    updatedSlides,
        updatedAt: new Date().toISOString(),
      },
      currentSlideIndex: index + 1, // ✅ navigate to the new duplicate
    });
  },
  updatePresentationName: (name: string) => {
    set((state) => ({
      presentation: state.presentation
        ? { ...state.presentation, name }
        : null,
    }));
  },

  loadPresentation: (presentation: Presentation) => {
    set({
      presentation,
      currentSlideIndex: 0,
      selectedElementId: null,
    });
  },
  updateSlide: (index, slideUpdate) => {
    const { presentation } = get();
    if (!presentation) return;

    const updatedSlides = [...presentation.slides];
    updatedSlides[index] = {
      ...updatedSlides[index],
      ...slideUpdate,
    };

    set({
      presentation: {
        ...presentation,
        slides: updatedSlides,
        updatedAt: new Date().toISOString(),
      },
    });
  },

  addElement: (slideIndex, element) => {
    const { presentation } = get();
    if (!presentation) return;

    const updatedSlides = [...presentation.slides];
    updatedSlides[slideIndex] = {
      ...updatedSlides[slideIndex],
      elements: [...updatedSlides[slideIndex].elements, element],
    };

    set({
      presentation: {
        ...presentation,
        slides: updatedSlides,
        updatedAt: new Date().toISOString(),
      },
    });
  },

  updateElement: (slideIndex, elementId, updates) => {
    const { presentation } = get();
    if (!presentation) return;

    const updatedSlides = [...presentation.slides];
    updatedSlides[slideIndex] = {
      ...updatedSlides[slideIndex],
      elements: updatedSlides[slideIndex].elements.map((el) =>
        el.id === elementId ? { ...el, ...updates } : el
      ),
    };

    set({
      presentation: {
        ...presentation,
        slides: updatedSlides,
        updatedAt: new Date().toISOString(),
      },
    });
  },

  deleteElement: (slideIndex, elementId) => {
    const { presentation } = get();
    if (!presentation) return;

    const updatedSlides = [...presentation.slides];
    updatedSlides[slideIndex] = {
      ...updatedSlides[slideIndex],
      elements: updatedSlides[slideIndex].elements.filter(
        (el) => el.id !== elementId
      ),
    };

    set({
      presentation: {
        ...presentation,
        slides: updatedSlides,
        updatedAt: new Date().toISOString(),
      },
      selectedElementId: null,
    });
  },


  reorderSlides: (fromIndex: number, toIndex: number) => {
    set((state) => {
      if (!state.presentation) return state;
      if (fromIndex === toIndex)  return state;

      const slides     = [...state.presentation.slides];
      const [moved]    = slides.splice(fromIndex, 1);   // remove from old spot
      slides.splice(toIndex, 0, moved);                  // insert at new spot

      // Keep currentSlideIndex pointing at the same slide after reorder
      let newIndex = state.currentSlideIndex;
      if (state.currentSlideIndex === fromIndex) {
        newIndex = toIndex;
      } else if (fromIndex < toIndex) {
        // moved down: slides above shift up
        if (state.currentSlideIndex > fromIndex && state.currentSlideIndex <= toIndex) {
          newIndex = state.currentSlideIndex - 1;
        }
      } else {
        // moved up: slides below shift down
        if (state.currentSlideIndex >= toIndex && state.currentSlideIndex < fromIndex) {
          newIndex = state.currentSlideIndex + 1;
        }
      }

      return {
        presentation: { ...state.presentation, slides },
        currentSlideIndex: newIndex,
      };
    });
  },

  setIsPresenting: (value) => set({ isPresenting: value }),

  toggleBlackScreen: () =>
    set((state) => ({ isBlackScreen: !state.isBlackScreen })),

  saveToJSON: () => {
    const { presentation } = get();
    return JSON.stringify(presentation, null, 2);
  },

  loadFromJSON: (json: string) => {
    try {
      const presentation = JSON.parse(json) as Presentation;
      set({ presentation, currentSlideIndex: 0 });
    } catch (error) {
      console.error('Failed to parse JSON:', error);
    }
  },
  bringToFront: (slideIndex, elementId) => {
    const { presentation } = get();
    if (!presentation) return;

    const updatedSlides = [...presentation.slides];
    const slide = { ...updatedSlides[slideIndex] };
    const elements = [...slide.elements];

    const currentIndex = elements.findIndex((el) => el.id === elementId);
    if (currentIndex === -1 || currentIndex === elements.length - 1) return;

    const [element] = elements.splice(currentIndex, 1);
    elements.push(element);

    slide.elements = elements;
    updatedSlides[slideIndex] = slide;

    set({
      presentation: {
        ...presentation,
        slides: updatedSlides,
        updatedAt: new Date().toISOString(),
      },
    });
  },

  
  sendToBack: (slideIndex, elementId) => {
    const { presentation } = get();
    if (!presentation) return;

    const updatedSlides = [...presentation.slides];
    const slide = { ...updatedSlides[slideIndex] };
    const elements = [...slide.elements];

    const currentIndex = elements.findIndex((el) => el.id === elementId);
    if (currentIndex === -1 || currentIndex === 0) return;

    const [element] = elements.splice(currentIndex, 1);
    elements.unshift(element);

    slide.elements = elements;
    updatedSlides[slideIndex] = slide;

    set({
      presentation: {
        ...presentation,
        slides: updatedSlides,
        updatedAt: new Date().toISOString(),
      },
    });
  },

  moveLayerUp: (slideIndex, elementId) => {
    const { presentation } = get();
    if (!presentation) return;

    const updatedSlides = [...presentation.slides];
    const slide = { ...updatedSlides[slideIndex] };
    const elements = [...slide.elements];

    const currentIndex = elements.findIndex((el) => el.id === elementId);
    if (currentIndex === -1 || currentIndex === elements.length - 1) return;

    // Swap with the element above (higher index = visually on top in Konva)
    [elements[currentIndex], elements[currentIndex + 1]] = 
      [elements[currentIndex + 1], elements[currentIndex]];

    slide.elements = elements;
    updatedSlides[slideIndex] = slide;

    set({
      presentation: {
        ...presentation,
        slides: updatedSlides,
        updatedAt: new Date().toISOString(),
      },
    });
  },

  moveLayerDown: (slideIndex, elementId) => {
    const { presentation } = get();
    if (!presentation) return;

    const updatedSlides = [...presentation.slides];
    const slide = { ...updatedSlides[slideIndex] };
    const elements = [...slide.elements];

    const currentIndex = elements.findIndex((el) => el.id === elementId);
    if (currentIndex === -1 || currentIndex === 0) return;

    // Swap with the element below (lower index = visually behind)
    [elements[currentIndex], elements[currentIndex - 1]] = 
      [elements[currentIndex - 1], elements[currentIndex]];

    slide.elements = elements;
    updatedSlides[slideIndex] = slide;

    set({
      presentation: {
        ...presentation,
        slides: updatedSlides,
        updatedAt: new Date().toISOString(),
      },
    });
  },

  moveToLayer: (slideIndex, elementId, newIndex) => {
    const { presentation } = get();
    if (!presentation) return;

    const updatedSlides = [...presentation.slides];
    const slide = { ...updatedSlides[slideIndex] };
    const elements = [...slide.elements];

    const currentIndex = elements.findIndex((el) => el.id === elementId);
    if (currentIndex === -1) return;

    const clampedIndex = Math.max(0, Math.min(newIndex, elements.length - 1));
    const [element] = elements.splice(currentIndex, 1);
    elements.splice(clampedIndex, 0, element);

    slide.elements = elements;
    updatedSlides[slideIndex] = slide;

    set({
      presentation: {
        ...presentation,
        slides: updatedSlides,
        updatedAt: new Date().toISOString(),
      },
    });
  },

  //Stage Display
  stage:{
    files : [],
    activeFileId: null,
    presentingFileId:null,
    presentingSlideIndex:0
  },

  stageLoadFile: (file) => {
    set((state) => {
      // ✅ prevent duplicate
      const exists = state.stage.files.find(f => f.id === file.id);
      if (exists) return state;
      const fileWithIndex:StageFile = {
        ...file, activeSlideIndex:0
      };

      return {
        stage: {
          ...state.stage,
          files:        [...state.stage.files, fileWithIndex],
          activeFileId: state.stage.activeFileId ?? file.id,
        },
      };
    });
  },

  // ── remove a file from stage ─────────────────────────────
  stageRemoveFile: (fileId) => {
    set((state) => {
      const remaining = state.stage.files.filter(f => f.id !== fileId);

      // if we removed the active file, fall back to first remaining
      const newActiveId =
        state.stage.activeFileId === fileId
          ? (remaining[0]?.id ?? null)
          : state.stage.activeFileId;

      return {
        stage: {
          ...state.stage,
          files:            remaining,
          activeFileId:     newActiveId,
          activeSlideIndex: 0,
        },
      };
    });
  },

  // ── switch active file ────────────────────────────────────
  stageSetActiveFile: (fileId) => {
    set((state) => ({
      stage: {
        ...state.stage,
        activeFileId:     fileId,
      },
    }));
  },

  // ── change slide within a file ───────────────────────────
  stageSetSlide: (fileId, slideIndex) => {
  set((state) => ({
    stage: {
      ...state.stage,
      activeFileId: fileId,
      files: state.stage.files.map(f =>
        f.id === fileId
          ? { ...f, activeSlideIndex: slideIndex } // ✅ per-file
          : f
      ),
    },
  }));
},

  // Add action implementation:
  stageSetPresentingFile: (fileId,slideIndex=0) => {
    set((state) => ({
      stage: {
        ...state.stage,
        presentingFileId: fileId,
        presentingSlideIndex:slideIndex
      },
    }));
  },

  // ── clear stage ───────────────────────────────────────────
  stageClear: () => {
    set({
      stage: {
        files:            [],
        activeFileId:     null,
        presentingFileId:null,
        presentingSlideIndex:0
      },
    });
  },

}));

export default usePresentationStore;