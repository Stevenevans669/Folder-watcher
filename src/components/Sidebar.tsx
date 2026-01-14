import { useWatcherStore } from '../store/watcherStore';
import DirectoryItem from './DirectoryItem';
import AddDirectoryButton from './AddDirectoryButton';

export default function Sidebar() {
  const { directories, addDirectory, removeDirectory } = useWatcherStore();

  return (
    <div className="w-[30%] min-w-[200px] h-full flex flex-col border-r border-gray-200 bg-white">
      <div className="p-4 border-b border-gray-200">
        <AddDirectoryButton onClick={addDirectory} />
      </div>
      <div className="flex-1 overflow-y-auto">
        {directories.length === 0 ? (
          <div className="p-4 text-center text-gray-400 text-sm">
            No directories watched.
            <br />
            Click the button above to add one.
          </div>
        ) : (
          directories.map((dir) => (
            <DirectoryItem
              key={dir.id}
              directory={dir}
              onRemove={removeDirectory}
            />
          ))
        )}
      </div>
    </div>
  );
}
