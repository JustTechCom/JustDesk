import { useState } from 'react';
import { Upload, File as FileIcon } from 'lucide-react';
import useFileTransfer from '../hooks/useFileTransfer';

export default function FileTransfer({ socket, peers }) {
  const { sendFile, progress, receivedFiles } = useFileTransfer(socket, peers);
  const [selected, setSelected] = useState(null);

  const handleSend = () => {
    if (selected) {
      sendFile(selected);
      setSelected(null);
    }
  };

  return (
    <div className="bg-black/40 backdrop-blur rounded-lg p-4 mt-4 text-white">
      <div className="flex items-center space-x-2 mb-4">
        <input type="file" onChange={(e) => setSelected(e.target.files[0])} className="text-sm" />
        <button
          onClick={handleSend}
          disabled={!selected}
          className="px-3 py-1 bg-blue-600 disabled:opacity-50 rounded flex items-center"
        >
          <Upload className="w-4 h-4 mr-1" /> Send
        </button>
      </div>
      {progress > 0 && progress < 100 && (
        <div className="w-full bg-gray-700 rounded h-2 mb-4">
          <div className="bg-blue-500 h-2 rounded" style={{ width: `${progress}%` }} />
        </div>
      )}
      {receivedFiles.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Received Files</h3>
          <ul className="space-y-1">
            {receivedFiles.map((file) => (
              <li key={file.id} className="flex items-center space-x-2">
                <FileIcon className="w-4 h-4" />
                <a href={file.url} download={file.name} className="text-blue-300 underline">
                  {file.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
