import { useEffect, useRef } from 'react';
import { useWatcherStore } from '../store/watcherStore';
import LogEntry from './LogEntry';

export default function ChangeLogPanel() {
  const { logs, clearLogs } = useWatcherStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex-1 h-full flex flex-col bg-gray-50">
      <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-gray-800">Change Log</h2>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {logs.length} events
          </span>
        </div>
        <button
          onClick={clearLogs}
          disabled={logs.length === 0}
          className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          Clear
        </button>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2">
        {logs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm">
            No file changes detected yet.
            <br />
            Changes will appear here in real-time.
          </div>
        ) : (
          logs.map((log) => <LogEntry key={log.id} log={log} />)
        )}
      </div>
    </div>
  );
}
