interface AddDirectoryButtonProps {
  onClick: () => void;
}

export default function AddDirectoryButton({ onClick }: AddDirectoryButtonProps) {
  return (
    <button
      onClick={onClick}
      className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
    >
      <span className="text-lg">+</span>
      <span>Add Directory</span>
    </button>
  );
}
