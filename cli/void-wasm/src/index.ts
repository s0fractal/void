#!/usr/bin/env node

import { Command } from 'commander';
import { execCommand } from './cmd.exec.js';

const program = new Command();

program
  .name('void-wasm')
  .description('CLI for WASM execution in Void')
  .version('0.1.0');

program.addCommand(execCommand());

program.parse(process.argv);