import { useEffect } from 'react';
import { useWatcherStore } from './store/watcherStore';
import Sidebar from './components/Sidebar';
import ChangeLogPanel from './components/ChangeLogPanel';
import ErrorToast from './components/ErrorToast';

function App() {
  const { initSidecarListener, status } = useWatcherStore();

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    initSidecarListener().then((unlistenFn) => {
      unlisten = unlistenFn;
    });

    return () => {
      unlisten?.();
    };
  }, [initSidecarListener]);

  if (status === 'starting') {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Starting watcher...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-white">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <ChangeLogPanel />
      </div>
      <ErrorToast />
    </div>
  );
}

export default App;
