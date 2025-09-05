import * as vscode from 'vscode';
import { FloatingWidget } from './floating-widget';
import { AIProviderInterface } from '../ai/provider-interface';
import { DiffEngine } from '../diff/engine';

export class CursorCmdKFeature {
    private static instance: CursorCmdKFeature;
    private aiProvider: AIProviderInterface;
    private diffEngine: DiffEngine;
    private activeWidget?: FloatingWidget;

    private constructor(
        private context: vscode.ExtensionContext
    ) {
        this.aiProvider = AIProviderInterface.getInstance();
        this.diffEngine = new DiffEngine();
    }

    static activate(context: vscode.ExtensionContext): CursorCmdKFeature {
        if (!this.instance) {
            this.instance = new CursorCmdKFeature(context);
            this.instance.registerCommands();
        }
        return this.instance;
    }

    private registerCommands() {
        // Main command
        const cmdKDisposable = vscode.commands.registerCommand(
            'void.aiInlineEdit',
            () => this.handleInlineEdit()
        );

        // Register text editor command for better integration
        const editorCmdDisposable = vscode.commands.registerTextEditorCommand(
            'void.aiInlineEditWithSelection',
            (editor, edit) => this.handleInlineEdit(editor)
        );

        this.context.subscriptions.push(cmdKDisposable, editorCmdDisposable);
    }

    private async handleInlineEdit(editor?: vscode.TextEditor) {
        editor = editor || vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor');
            return;
        }

        // Dispose any existing widget
        this.activeWidget?.dispose();

        const selection = editor.selection;
        const position = selection.active;

        // Gather context
        const context = this.gatherContext(editor, selection);

        // Create and show floating widget
        this.activeWidget = new FloatingWidget({
            editor,
            position,
            placeholder: 'Describe how to modify this code...',
            onSubmit: async (instruction) => this.processInstruction(instruction, editor, selection, context),
            onCancel: () => this.activeWidget?.dispose()
        });

        this.activeWidget.show();
    }

    private gatherContext(editor: vscode.TextEditor, selection: vscode.Selection): EditContext {
        const document = editor.document;
        const selectedText = document.getText(selection);
        
        // Get configurable context size
        const contextLines = vscode.workspace.getConfiguration('void.cmdK').get('contextLines', 10);
        
        // Calculate context range
        const lineStart = Math.max(0, selection.start.line - contextLines);
        const lineEnd = Math.min(document.lineCount - 1, selection.end.line + contextLines);
        
        // Get full lines for context
        const contextRange = new vscode.Range(
            lineStart, 0,
            lineEnd, document.lineAt(lineEnd).text.length
        );
        const contextText = document.getText(contextRange);

        // Get imports for better AI understanding
        const imports = this.extractImports(document);

        return {
            selectedText,
            contextText,
            language: document.languageId,
            fileName: vscode.workspace.asRelativePath(document.fileName),
            selection,
            imports,
            indentation: this.detectIndentation(document, selection.start.line)
        };
    }

    private async processInstruction(
        instruction: string,
        editor: vscode.TextEditor,
        selection: vscode.Selection,
        context: EditContext
    ) {
        try {
            this.activeWidget?.showLoading('Thinking...');

            // Get AI suggestion
            const streamResponse = vscode.workspace.getConfiguration('void.cmdK').get('streamResponse', true);
            
            if (streamResponse) {
                // Stream the response
                await this.aiProvider.streamInlineEdit(
                    context,
                    instruction,
                    (chunk) => {
                        // Update diff preview as response streams
                        if (this.activeWidget) {
                            const currentText = this.activeWidget.getCurrentResponse();
                            const diff = this.diffEngine.computeDiff(
                                context.selectedText,
                                currentText + chunk
                            );
                            this.activeWidget.updateDiffPreview(diff);
                        }
                    }
                );
            } else {
                // Get complete response
                const suggestion = await this.aiProvider.getInlineEdit(context, instruction);
                const diff = this.diffEngine.computeDiff(context.selectedText, suggestion);
                this.activeWidget?.showDiffPreview(diff);
            }

            // Wait for user action
            const accepted = await this.activeWidget?.waitForUserAction();
            
            if (accepted) {
                const finalText = this.activeWidget?.getFinalText() || '';
                await this.applyEdit(editor, selection, finalText);
                
                // Track telemetry
                this.trackUsage('accepted', instruction);
            } else {
                this.trackUsage('cancelled', instruction);
            }

        } catch (error) {
            vscode.window.showErrorMessage(`AI Edit failed: ${error.message}`);
            this.trackUsage('error', instruction, error);
        } finally {
            this.activeWidget?.dispose();
            this.activeWidget = undefined;
        }
    }

    private async applyEdit(
        editor: vscode.TextEditor,
        selection: vscode.Selection,
        newText: string
    ) {
        const success = await editor.edit(editBuilder => {
            editBuilder.replace(selection, newText);
        });

        if (success) {
            // Flash the changed region for visual feedback
            const decoration = vscode.window.createTextEditorDecorationType({
                backgroundColor: 'rgba(0, 255, 0, 0.1)',
                isWholeLine: false
            });

            editor.setDecorations(decoration, [selection]);
            
            setTimeout(() => {
                decoration.dispose();
            }, 300);
        }
    }

    private extractImports(document: vscode.TextDocument): string[] {
        const imports: string[] = [];
        const text = document.getText();
        
        // Match various import patterns
        const importRegex = /^(?:import|const|let|var).*(?:from|require).*['"`](.+?)['"`]/gm;
        let match;
        
        while ((match = importRegex.exec(text)) !== null) {
            imports.push(match[0]);
        }

        return imports;
    }

    private detectIndentation(document: vscode.TextDocument, line: number): string {
        const lineText = document.lineAt(Math.max(0, line)).text;
        const match = lineText.match(/^(\s*)/);
        return match ? match[1] : '';
    }

    private trackUsage(action: string, instruction: string, error?: Error) {
        // Telemetry for improving the feature
        console.log(`[CmdK] ${action}:`, {
            instruction: instruction.substring(0, 50),
            timestamp: Date.now(),
            error: error?.message
        });
    }
}

interface EditContext {
    selectedText: string;
    contextText: string;
    language: string;
    fileName: string;
    selection: vscode.Selection;
    imports: string[];
    indentation: string;
}