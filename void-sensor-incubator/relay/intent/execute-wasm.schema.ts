import { z } from 'zod';

// Policy schema
const PolicySchema = z.object({
  max_memory: z.number().min(1024).max(1024 * 1024 * 1024).optional(), // 1KB to 1GB
  max_gas: z.number().min(1000).max(1e9).optional(),
  max_time: z.number().min(100).max(60000).optional(), // 100ms to 60s
  allowed_syscalls: z.array(z.string()).optional(),
  denied_syscalls: z.array(z.string()).optional(),
  rate_limit: z.object({
    requests_per_minute: z.number().min(1).max(1000).optional(),
    burst_size: z.number().min(1).max(100).optional(),
  }).optional(),
});

// Input value schema - supports various types
const InputValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.lazy(() => InputValueSchema)),
  z.record(z.lazy(() => InputValueSchema)),
]);

// Main request schema
const ExecuteWasmRequestSchema = z.object({
  // Required fields
  cid: z.string()
    .min(1)
    .regex(/^(Qm[a-zA-Z0-9]{44}|bafy[a-zA-Z0-9]+|glyph:\/\/.+)$/, 
      'Invalid CID format. Must be IPFS CID or glyph:// URL'),
  
  // Inputs can be array (positional) or object (named)
  inputs: z.union([
    z.array(InputValueSchema),
    z.record(InputValueSchema),
  ]),
  
  // Optional fields
  policy: PolicySchema.optional(),
  
  idempotency_key: z.string()
    .min(8)
    .max(128)
    .regex(/^[a-zA-Z0-9-_]+$/)
    .optional(),
  
  metadata: z.object({
    function_name: z.string().optional(),
    version: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }).optional(),
  
  // Advanced options
  options: z.object({
    return_logs: z.boolean().default(false),
    return_gas_profile: z.boolean().default(false),
    trace_execution: z.boolean().default(false),
    timeout_ms: z.number().min(100).max(60000).optional(),
  }).optional(),
});

// Response schemas
const ExecutionResultSchema = z.object({
  success: z.boolean(),
  request_id: z.string(),
  
  // Success case
  output: z.any().optional(),
  gas_used: z.number().optional(),
  duration: z.number().optional(),
  logs: z.array(z.string()).optional(),
  
  // Error case
  error: z.string().optional(),
  error_type: z.enum(['timeout', 'out_of_gas', 'out_of_memory', 'runtime_error', 'policy_violation']).optional(),
  
  // Metadata
  executed_at: z.string().datetime(),
  executor_node: z.string().optional(),
  
  // Gas profile (if requested)
  gas_profile: z.object({
    instruction_counts: z.record(z.number()),
    memory_usage: z.number(),
    syscall_counts: z.record(z.number()),
  }).optional(),
  
  // Execution trace (if requested)
  trace: z.array(z.object({
    pc: z.number(),
    op: z.string(),
    gas: z.number(),
    memory_size: z.number(),
    stack: z.array(z.any()).optional(),
  })).optional(),
});

// SSE event schemas
const ExecutionEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('execution_queued'),
    request_id: z.string(),
    cid: z.string(),
    position: z.number(),
  }),
  z.object({
    type: z.literal('execution_started'),
    request_id: z.string(),
    cid: z.string(),
    executor_node: z.string(),
  }),
  z.object({
    type: z.literal('execution_progress'),
    request_id: z.string(),
    progress: z.number().min(0).max(100),
    message: z.string().optional(),
  }),
  z.object({
    type: z.literal('execution_complete'),
    request_id: z.string(),
    cid: z.string(),
    success: z.boolean(),
    duration: z.number(),
    gas_used: z.number().optional(),
  }),
  z.object({
    type: z.literal('execution_error'),
    request_id: z.string().optional(),
    error: z.string(),
    error_type: z.string().optional(),
    cid: z.string().optional(),
  }),
]);

// Validation functions
export function validateExecuteWasmRequest(data: unknown): {
  valid: boolean;
  data?: z.infer<typeof ExecuteWasmRequestSchema>;
  errors?: z.ZodError['errors'];
} {
  try {
    const parsed = ExecuteWasmRequestSchema.parse(data);
    return { valid: true, data: parsed };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, errors: error.errors };
    }
    throw error;
  }
}

export function validateExecutionEvent(data: unknown): boolean {
  try {
    ExecutionEventSchema.parse(data);
    return true;
  } catch {
    return false;
  }
}

// Type exports
export type ExecuteWasmRequest = z.infer<typeof ExecuteWasmRequestSchema>;
export type ExecutionResult = z.infer<typeof ExecutionResultSchema>;
export type ExecutionEvent = z.infer<typeof ExecutionEventSchema>;
export type Policy = z.infer<typeof PolicySchema>;

// Schema exports for external use
export {
  ExecuteWasmRequestSchema,
  ExecutionResultSchema,
  ExecutionEventSchema,
  PolicySchema,
  InputValueSchema,
};