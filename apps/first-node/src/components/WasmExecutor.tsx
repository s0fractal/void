import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useWasmStore } from '../stores/wasmStore';
import { PlayIcon, StopIcon, RefreshIcon } from './icons';

interface ExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
  gas_used?: number;
  duration?: number;
  logs?: string[];
}

export function WasmExecutor() {
  const { code, language, compiledCID, setCompiledCID } = useWasmStore();
  const [output, setOutput] = useState<string>('');
  const [inputs, setInputs] = useState<string>('[]');
  const [isCompiling, setIsCompiling] = useState(false);

  // Compile mutation
  const compileMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/wasm/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language,
          options: {
            optimize: true,
            target: 'wasm32-unknown-unknown',
          },
        }),
      });
      
      if (!response.ok) {
        throw new Error('Compilation failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setCompiledCID(data.cid);
      setOutput(`✅ Compiled successfully!\nCID: ${data.cid}\nSize: ${data.size} bytes`);
    },
    onError: (error) => {
      setOutput(`❌ Compilation error:\n${error.message}`);
    },
  });

  // Execute mutation
  const executeMutation = useMutation({
    mutationFn: async () => {
      if (!compiledCID) {
        throw new Error('No compiled WASM module');
      }

      const response = await fetch('/intent/execute-wasm', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'user_id': 'first-node-user',
          'session_id': 'first-node-session',
        },
        body: JSON.stringify({
          cid: compiledCID,
          inputs: JSON.parse(inputs),
          policy: {
            max_memory: 1024 * 1024, // 1MB
            max_gas: 1000000,
            max_time: 5000, // 5s
          },
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Execution failed');
      }
      
      return response.json() as Promise<ExecutionResult>;
    },
    onSuccess: (data) => {
      const logs = data.logs?.join('\n') || '';
      const result = data.success 
        ? `✅ Execution successful!\n\nOutput: ${JSON.stringify(data.output, null, 2)}\nGas used: ${data.gas_used}\nDuration: ${data.duration}ms${logs ? '\n\nLogs:\n' + logs : ''}`
        : `❌ Execution failed:\n${data.error}`;
      setOutput(result);
    },
    onError: (error) => {
      setOutput(`❌ Execution error:\n${error.message}`);
    },
  });

  const handleCompile = async () => {
    setIsCompiling(true);
    await compileMutation.mutateAsync();
    setIsCompiling(false);
  };

  const handleExecute = () => {
    executeMutation.mutate();
  };

  const handleClear = () => {
    setOutput('');
    setCompiledCID(null);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-white">WASM Executor</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCompile}
            disabled={isCompiling || !code}
            className="flex items-center space-x-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-sm transition-colors"
          >
            {isCompiling ? (
              <RefreshIcon className="w-4 h-4 animate-spin" />
            ) : (
              <PlayIcon className="w-4 h-4" />
            )}
            <span>Compile</span>
          </button>
          
          <button
            onClick={handleExecute}
            disabled={!compiledCID || executeMutation.isPending}
            className="flex items-center space-x-1 px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-sm transition-colors"
          >
            <PlayIcon className="w-4 h-4" />
            <span>Execute</span>
          </button>
          
          <button
            onClick={handleClear}
            className="flex items-center space-x-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
          >
            <StopIcon className="w-4 h-4" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Inputs (JSON array or object)
        </label>
        <input
          type="text"
          value={inputs}
          onChange={(e) => setInputs(e.target.value)}
          placeholder='[1, 2] or {"a": 1, "b": 2}'
          className="w-full px-3 py-1 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
        />
      </div>

      <div className="flex-1 bg-gray-800 rounded p-3 overflow-auto">
        <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap">
          {output || 'Output will appear here...'}
        </pre>
      </div>

      {compiledCID && (
        <div className="mt-2 text-xs text-gray-500">
          Module CID: {compiledCID.slice(0, 20)}...
        </div>
      )}
    </div>
  );
}