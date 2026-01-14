import type { WatchedDir } from '../types';

interface DirectoryItemProps {
  directory: WatchedDir;
  onRemove: (id: string) => void;
}

export default function DirectoryItem({ directory, onRemove }: DirectoryItemProps) {
  // Extract just the folder name for display
  const folderName = directory.path.split('/').pop() || directory.path;

  return (
    <div className="group flex items-center justify-between px-4 py-3 hover:bg-gray-50 border-b border-gray-100">
      <div className="flex-1 min-w-0 mr-2">
        <div className="font-medium text-gray-800 truncate" title={directory.path}>
          {folderName}
        </div>
        <div className="text-xs text-gray-500 truncate" title={directory.path}>
          {directory.path}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onRemove(directory.id)}
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all p-1"
          title="Remove directory"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
