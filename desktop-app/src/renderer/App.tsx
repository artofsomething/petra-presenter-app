// src/renderer/App.tsx
import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';

const Editor            = lazy(() => import('./pages/EditorPage'));
const Presentation      = lazy(() => import('./pages/PresentationPage'));
const Controller        = lazy(() => import('./components/Controller/ControllerPage'));
const ViewerView        = lazy(() => import('./components/Presenter/ViewerView'));
const MobileEditorPage  = lazy(()=> import('./pages/MobileEditorPage'));
const MainMenu          = lazy(()=> import('./pages/MainMenu'));
const StageDisplayPage  = lazy(()=> import('./pages/StageDisplayPage'));


// ✅ Simple loading fallback
function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-900">
      <div className="text-white text-xl">Loading...</div>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/"               element={<MainMenu />} />
          <Route path="/editor"         element={<Editor/>}/>
          <Route path="/stage"          element={<StageDisplayPage/>}/>
          <Route path="/presentation"   element={<Presentation />} />
          <Route path="/controller"     element={<Controller />} />
          <Route path="/viewer"         element={<ViewerView />} />
          <Route path="/mobile-editor"  element={<MobileEditorPage/>}/>
        </Routes>
      </Suspense>
    </HashRouter>
  );
}