import { useState, useEffect } from 'react';

export default function ChatPanel({ socket }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    if (!socket) return;

    const handleMessage = ({ message, from }) => {
      setMessages((prev) => [...prev, { message, from }]);
    };

    socket.on('chat-message', handleMessage);
    return () => {
      socket.off('chat-message', handleMessage);
    };
  }, [socket]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim() || !socket) return;

    socket.emit('chat-message', input);
    setInput('');
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 flex flex-col h-64">
      <div className="flex-1 overflow-y-auto mb-4">
        {messages.map((msg, idx) => (
          <div key={idx} className="mb-2">
            <span className="text-xs text-gray-400 mr-2">
              {msg.from === socket?.id ? 'You' : msg.from}
            </span>
            <span className="text-white">{msg.message}</span>
          </div>
        ))}
      </div>
      <form onSubmit={sendMessage} className="flex">
        <input
          className="flex-1 px-2 py-1 rounded-l bg-gray-700 text-white focus:outline-none"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
        />
        <button type="submit" className="px-4 py-1 bg-blue-600 rounded-r text-white">
          Send
        </button>
      </form>
    </div>
  );
}
