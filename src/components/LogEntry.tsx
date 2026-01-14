import type { ChangeLog } from '../types';
import { formatTime } from '../utils/formatTime';

interface LogEntryProps {
  log: ChangeLog;
}

const eventTypeStyles = {
  create: 'text-green-600 bg-green-50',
  modify: 'text-yellow-600 bg-yellow-50',
  delete: 'text-red-600 bg-red-50',
};

const eventTypeLabels = {
  create: 'NEW',
  modify: 'MOD',
  delete: 'DEL',
};

export default function LogEntry({ log }: LogEntryProps) {
  return (
    <div className="flex items-center gap-3 py-1.5 px-2 hover:bg-gray-50 rounded text-sm font-mono">
      <span className="text-gray-400 flex-shrink-0">{formatTime(log.timestamp)}</span>
      <span
        className={`px-2 py-0.5 rounded text-xs font-semibold flex-shrink-0 ${eventTypeStyles[log.eventType]}`}
      >
        {eventTypeLabels[log.eventType]}
      </span>
      <span className="text-gray-700 truncate" title={log.filePath}>
        {log.filePath}
      </span>
    </div>
  );
}
