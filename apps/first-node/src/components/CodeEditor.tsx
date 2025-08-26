import React, { useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { rust } from '@codemirror/lang-rust';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { useWasmStore } from '../stores/wasmStore';
import { useRoom } from '@livekit/components-react';
import { DataPacket_Kind } from 'livekit-client';

export function CodeEditor() {
  const { code, setCode, language, setLanguage } = useWasmStore();
  const room = useRoom();

  const handleCodeChange = useCallback((value: string) => {
    setCode(value);
    
    // Broadcast code changes to other participants
    if (room) {
      const data = JSON.stringify({
        type: 'code-update',
        code: value,
        language,
        timestamp: Date.now(),
      });
      
      room.localParticipant?.publishData(
        new TextEncoder().encode(data),
        DataPacket_Kind.RELIABLE
      );
    }
  }, [setCode, room, language]);

  const getLanguageExtension = () => {
    switch (language) {
      case 'rust':
        return rust();
      case 'javascript':
      case 'typescript':
      default:
        return javascript({ typescript: language === 'typescript' });
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-white">Code Editor</h2>
        <div className="flex items-center space-x-2">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as any)}
            className="px-3 py-1 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
          >
            <option value="typescript">TypeScript</option>
            <option value="javascript">JavaScript</option>
            <option value="rust">Rust</option>
          </select>
          <span className="text-xs text-gray-500">
            {room?.participants.size || 0} participants
          </span>
        </div>
      </div>
      
      <div className="flex-1 border border-gray-700 rounded overflow-hidden">
        <CodeMirror
          value={code}
          height="100%"
          theme={vscodeDark}
          extensions={[getLanguageExtension()]}
          onChange={handleCodeChange}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            rectangularSelection: true,
            highlightSelectionMatches: true,
            searchKeymap: true,
          }}
        />
      </div>
      
      <div className="mt-2 text-xs text-gray-500">
        Live collaborative editing • Changes sync automatically
      </div>
    </div>
  );
}