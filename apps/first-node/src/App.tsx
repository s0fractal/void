import React, { useState, useEffect } from 'react';
import { LiveKitRoom, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';
import { Room, RoomEvent } from 'livekit-client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CodeEditor } from './components/CodeEditor';
import { WasmExecutor } from './components/WasmExecutor';
import { GabberOverlay } from './components/GabberOverlay';
import { useWasmStore } from './stores/wasmStore';
import { useCollabStore } from './stores/collabStore';
import './App.css';

const queryClient = new QueryClient();

// LiveKit server URL from env
const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || 'ws://localhost:7880';

function App() {
  const [token, setToken] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [showGabber, setShowGabber] = useState(true);
  const { code, setCode } = useWasmStore();
  const { roomName, userName, setRoomName, setUserName } = useCollabStore();

  // Generate LiveKit token
  const generateToken = async () => {
    try {
      const response = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName,
          participantName: userName,
          metadata: {
            role: 'developer',
            canExecuteWasm: true,
          },
        }),
      });
      const data = await response.json();
      setToken(data.token);
    } catch (error) {
      console.error('Failed to generate token:', error);
    }
  };

  const handleConnect = async () => {
    if (roomName && userName) {
      await generateToken();
      setIsConnected(true);
    }
  };

  // Room connection handler
  const handleRoomConnected = (room: Room) => {
    console.log('Connected to room:', room.name);
    
    // Listen for data messages (code sync)
    room.on(RoomEvent.DataReceived, (payload, participant) => {
      const data = JSON.parse(new TextDecoder().decode(payload));
      if (data.type === 'code-update' && participant?.sid !== room.localParticipant?.sid) {
        setCode(data.code);
      }
    });
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full">
          <h1 className="text-3xl font-bold mb-6 text-center">🌀 First Node</h1>
          <p className="text-gray-400 mb-6 text-center">
            Live collaborative WASM coding with video chat
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Your Name</label>
              <input
                type="text"
                className="w-full px-4 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Room Name</label>
              <input
                type="text"
                className="w-full px-4 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Enter room name"
              />
            </div>
            
            <button
              onClick={handleConnect}
              disabled={!roomName || !userName}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded font-medium transition-colors"
            >
              Join Room
            </button>
          </div>
          
          <div className="mt-6 text-center text-sm text-gray-500">
            Powered by LiveKit + WASM + 432Hz resonance
          </div>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <LiveKitRoom
        serverUrl={LIVEKIT_URL}
        token={token}
        onConnected={handleRoomConnected}
        className="h-screen"
      >
        <div className="h-screen flex flex-col bg-gray-900">
          {/* Header */}
          <header className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-white">🌀 First Node</h1>
              <span className="text-sm text-gray-400">Room: {roomName}</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowGabber(!showGabber)}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
              >
                {showGabber ? 'Hide' : 'Show'} Gabber
              </button>
            </div>
          </header>

          {/* Main content */}
          <div className="flex-1 flex">
            {/* Code editor section */}
            <div className="flex-1 flex flex-col">
              <div className="flex-1 p-4">
                <CodeEditor />
              </div>
              <div className="border-t border-gray-700 p-4">
                <WasmExecutor />
              </div>
            </div>

            {/* Gabber overlay */}
            {showGabber && (
              <div className="w-80 border-l border-gray-700">
                <GabberOverlay />
              </div>
            )}
          </div>
        </div>
      </LiveKitRoom>
    </QueryClientProvider>
  );
}

export default App;