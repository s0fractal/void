import React, { useState } from 'react';
import {
  ControlBar,
  GridLayout,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
  VideoConference,
  Chat,
  ChatToggle,
} from '@livekit/components-react';
import { Track } from 'livekit-client';

export function GabberOverlay() {
  const [showChat, setShowChat] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  return (
    <div className="h-full flex flex-col bg-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <h3 className="text-sm font-semibold text-white">Gabber UI</h3>
        <button
          onClick={() => setIsMinimized(!isMinimized)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          {isMinimized ? '◀' : '▶'}
        </button>
      </div>

      {!isMinimized && (
        <>
          {/* Video grid */}
          <div className="flex-1 p-2">
            <GridLayout tracks={tracks} className="h-full">
              <ParticipantTile />
            </GridLayout>
          </div>

          {/* Controls */}
          <div className="border-t border-gray-700 p-3">
            <ControlBar variation="minimal" />
          </div>

          {/* Chat section */}
          {showChat && (
            <div className="border-t border-gray-700 h-64 flex flex-col">
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
                <span className="text-sm font-medium text-white">Chat</span>
                <button
                  onClick={() => setShowChat(false)}
                  className="text-gray-400 hover:text-white transition-colors text-xs"
                >
                  Hide
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <Chat />
              </div>
            </div>
          )}

          {/* Show chat button */}
          {!showChat && (
            <div className="border-t border-gray-700 p-2">
              <button
                onClick={() => setShowChat(true)}
                className="w-full py-1 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Show Chat
              </button>
            </div>
          )}
        </>
      )}

      {/* Audio renderer - always active */}
      <RoomAudioRenderer />

      {/* Status bar */}
      <div className="border-t border-gray-700 px-3 py-2 text-xs text-gray-500">
        <div className="flex items-center justify-between">
          <span>🟢 Connected</span>
          <span>432Hz resonance active</span>
        </div>
      </div>
    </div>
  );
}