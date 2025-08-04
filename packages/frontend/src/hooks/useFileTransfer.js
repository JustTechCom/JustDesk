import { useState, useEffect, useRef, useCallback } from 'react';
import { EVENTS } from '@justdesk/shared';

const CHUNK_SIZE = 16 * 1024; // 16KB

export default function useFileTransfer(socket, peers = {}) {
  const [progress, setProgress] = useState(0);
  const [receivedFiles, setReceivedFiles] = useState([]);
  const incomingFiles = useRef({});

  const processMessage = useCallback((message) => {
    const { type, id, name, size, data } = message;
    if (type === 'meta') {
      incomingFiles.current[id] = { name, size, chunks: [] };
    } else if (type === 'chunk') {
      if (incomingFiles.current[id]) {
        incomingFiles.current[id].chunks.push(data);
      }
    } else if (type === 'complete') {
      const fileData = incomingFiles.current[id];
      if (fileData) {
        const binaryString = atob(fileData.chunks.join(''));
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const url = URL.createObjectURL(new Blob([bytes]));
        setReceivedFiles((prev) => [...prev, { id, name: fileData.name, url }]);
        delete incomingFiles.current[id];
      }
    }
  }, []);

  // handle incoming messages via socket
  useEffect(() => {
    if (!socket) {
      return;
    }
    const handleMessage = (message) => {
      processMessage(message);
    };
    socket.on(EVENTS.FILE_META, handleMessage);
    socket.on(EVENTS.FILE_CHUNK, handleMessage);
    socket.on(EVENTS.FILE_COMPLETE, handleMessage);
    return () => {
      socket.off(EVENTS.FILE_META, handleMessage);
      socket.off(EVENTS.FILE_CHUNK, handleMessage);
      socket.off(EVENTS.FILE_COMPLETE, handleMessage);
    };
  }, [socket, processMessage]);

  // handle incoming messages via data channels
  useEffect(() => {
    const peersArray = Object.values(peers || {});
    if (peersArray.length === 0) {
      return;
    }
    const handlers = [];
    peersArray.forEach((peer) => {
      const handler = (data) => {
        try {
          const message =
            typeof data === 'string'
              ? JSON.parse(data)
              : JSON.parse(new TextDecoder().decode(data));
          processMessage(message);
        } catch (e) {
          // ignore parse errors
        }
      };
      peer.on('data', handler);
      handlers.push({ peer, handler });
    });
    return () => {
      handlers.forEach(({ peer, handler }) => peer.off('data', handler));
    };
  }, [peers, processMessage]);

  const broadcast = useCallback(
    (message) => {
      const payload = JSON.stringify(message);
      const peersArray = Object.values(peers || {});
      if (peersArray.length > 0) {
        peersArray.forEach((peer) => {
          try {
            peer.send(payload);
          } catch (e) {
            // ignore send errors
          }
        });
      } else if (socket) {
        const event =
          message.type === 'meta'
            ? EVENTS.FILE_META
            : message.type === 'chunk'
              ? EVENTS.FILE_CHUNK
              : EVENTS.FILE_COMPLETE;
        socket.emit(event, message);
      }
    },
    [peers, socket]
  );

  const sendFile = useCallback(
    (file) => {
      const id = Date.now().toString();
      setProgress(0);
      broadcast({ type: 'meta', id, name: file.name, size: file.size });

      let offset = 0;
      const reader = new FileReader();
      reader.onload = (e) => {
        const chunk = Array.from(new Uint8Array(e.target.result));
        const base64 = btoa(String.fromCharCode.apply(null, chunk));
        offset += e.target.result.byteLength;
        broadcast({ type: 'chunk', id, data: base64 });
        setProgress(Math.round((offset / file.size) * 100));
        if (offset < file.size) {
          readSlice();
        } else {
          broadcast({ type: 'complete', id });
          setProgress(100);
        }
      };
      const readSlice = () => {
        const slice = file.slice(offset, offset + CHUNK_SIZE);
        reader.readAsArrayBuffer(slice);
      };
      readSlice();
    },
    [broadcast]
  );

  return { sendFile, progress, receivedFiles };
}
