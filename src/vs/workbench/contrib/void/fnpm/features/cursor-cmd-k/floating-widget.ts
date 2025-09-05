import * as vscode from 'vscode';

export class FloatingWidget {
    private panel: vscode.WebviewPanel | undefined;
    private responseText: string = '';
    private resolveAction?: (accepted: boolean) => void;

    constructor(private options: FloatingWidgetOptions) {}

    show() {
        // Create webview panel
        this.panel = vscode.window.createWebviewPanel(
            'voidCmdK',
            'AI Edit',
            {
                viewColumn: vscode.ViewColumn.Active,
                preserveFocus: true
            },
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        // Position near cursor (VSCode limitation: can't position precisely)
        this.panel.webview.html = this.getHtml();

        // Handle messages from webview
        this.panel.webview.onDidReceiveMessage(
            message => this.handleMessage(message),
            undefined,
            []
        );

        // Auto-focus input
        this.panel.webview.postMessage({ command: 'focus' });
    }

    showLoading(message: string) {
        this.panel?.webview.postMessage({
            command: 'showLoading',
            text: message
        });
    }

    updateDiffPreview(diff: DiffResult) {
        this.responseText = diff.newText;
        this.panel?.webview.postMessage({
            command: 'updateDiff',
            diff: this.formatDiffForDisplay(diff)
        });
    }

    showDiffPreview(diff: DiffResult) {
        this.responseText = diff.newText;
        this.panel?.webview.postMessage({
            command: 'showDiff',
            diff: this.formatDiffForDisplay(diff)
        });
    }

    getCurrentResponse(): string {
        return this.responseText;
    }

    getFinalText(): string {
        return this.responseText;
    }

    async waitForUserAction(): Promise<boolean> {
        return new Promise((resolve) => {
            this.resolveAction = resolve;
        });
    }

    dispose() {
        this.panel?.dispose();
        this.panel = undefined;
        if (this.resolveAction) {
            this.resolveAction(false);
        }
    }

    private handleMessage(message: any) {
        switch (message.command) {
            case 'submit':
                this.options.onSubmit(message.text);
                break;
            case 'cancel':
                if (this.resolveAction) {
                    this.resolveAction(false);
                }
                this.dispose();
                break;
            case 'accept':
                if (this.resolveAction) {
                    this.resolveAction(true);
                }
                this.dispose();
                break;
        }
    }

    private formatDiffForDisplay(diff: DiffResult): any {
        // Convert diff to HTML-friendly format
        return {
            changes: diff.changes.map(change => ({
                type: change.type,
                value: change.value,
                lineNumber: change.lineNumber
            }))
        };
    }

    private getHtml(): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        padding: 16px;
                        font-family: var(--vscode-editor-font-family);
                    }
                    
                    .input-container {
                        display: flex;
                        align-items: center;
                        background: var(--vscode-input-background);
                        border: 1px solid var(--vscode-input-border);
                        border-radius: 4px;
                        padding: 8px;
                        margin-bottom: 16px;
                    }
                    
                    #promptInput {
                        flex: 1;
                        background: transparent;
                        border: none;
                        outline: none;
                        color: var(--vscode-input-foreground);
                        font-size: 14px;
                    }
                    
                    .loading {
                        display: none;
                        color: var(--vscode-descriptionForeground);
                        margin: 8px 0;
                    }
                    
                    .diff-container {
                        display: none;
                        background: var(--vscode-editor-background);
                        border: 1px solid var(--vscode-widget-border);
                        border-radius: 4px;
                        padding: 12px;
                        margin: 16px 0;
                        max-height: 400px;
                        overflow-y: auto;
                    }
                    
                    .diff-line {
                        font-family: var(--vscode-editor-font-family);
                        font-size: var(--vscode-editor-font-size);
                        line-height: 1.5;
                        white-space: pre-wrap;
                    }
                    
                    .diff-added {
                        background: rgba(0, 255, 0, 0.1);
                        color: var(--vscode-gitDecoration-addedResourceForeground);
                    }
                    
                    .diff-removed {
                        background: rgba(255, 0, 0, 0.1);
                        color: var(--vscode-gitDecoration-deletedResourceForeground);
                        text-decoration: line-through;
                    }
                    
                    .actions {
                        display: none;
                        margin-top: 12px;
                        text-align: right;
                    }
                    
                    button {
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        border-radius: 4px;
                        padding: 6px 14px;
                        margin-left: 8px;
                        cursor: pointer;
                        font-size: 13px;
                    }
                    
                    button:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                    
                    .secondary {
                        background: var(--vscode-button-secondaryBackground);
                        color: var(--vscode-button-secondaryForeground);
                    }
                    
                    .hint {
                        color: var(--vscode-descriptionForeground);
                        font-size: 12px;
                        margin-top: 4px;
                    }
                </style>
            </head>
            <body>
                <div class="input-container">
                    <input 
                        type="text" 
                        id="promptInput" 
                        placeholder="${this.options.placeholder}"
                        autofocus
                    />
                </div>
                
                <div class="hint">Press Enter to submit, Esc to cancel</div>
                
                <div class="loading" id="loading">Thinking...</div>
                
                <div class="diff-container" id="diffContainer"></div>
                
                <div class="actions" id="actions">
                    <button class="secondary" onclick="cancel()">Cancel (Esc)</button>
                    <button onclick="accept()">Accept (Tab)</button>
                </div>
                
                <script>
                    const vscode = acquireVsCodeApi();
                    const input = document.getElementById('promptInput');
                    const loading = document.getElementById('loading');
                    const diffContainer = document.getElementById('diffContainer');
                    const actions = document.getElementById('actions');
                    
                    input.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            vscode.postMessage({
                                command: 'submit',
                                text: input.value
                            });
                            input.disabled = true;
                        } else if (e.key === 'Escape') {
                            cancel();
                        }
                    });
                    
                    window.addEventListener('message', event => {
                        const message = event.data;
                        switch (message.command) {
                            case 'focus':
                                input.focus();
                                break;
                            case 'showLoading':
                                loading.style.display = 'block';
                                loading.textContent = message.text;
                                break;
                            case 'updateDiff':
                            case 'showDiff':
                                showDiff(message.diff);
                                break;
                        }
                    });
                    
                    function showDiff(diff) {
                        loading.style.display = 'none';
                        diffContainer.style.display = 'block';
                        actions.style.display = 'block';
                        
                        diffContainer.innerHTML = diff.changes.map(change => {
                            const className = change.type === 'added' ? 'diff-added' : 
                                            change.type === 'removed' ? 'diff-removed' : '';
                            return \`<div class="diff-line \${className}">\${escapeHtml(change.value)}</div>\`;
                        }).join('');
                        
                        // Keyboard shortcuts
                        document.addEventListener('keydown', handleDiffKeyboard);
                    }
                    
                    function handleDiffKeyboard(e) {
                        if (e.key === 'Tab') {
                            e.preventDefault();
                            accept();
                        } else if (e.key === 'Escape') {
                            cancel();
                        }
                    }
                    
                    function accept() {
                        vscode.postMessage({ command: 'accept' });
                    }
                    
                    function cancel() {
                        vscode.postMessage({ command: 'cancel' });
                    }
                    
                    function escapeHtml(text) {
                        const div = document.createElement('div');
                        div.textContent = text;
                        return div.innerHTML;
                    }
                </script>
            </body>
            </html>
        `;
    }
}

interface FloatingWidgetOptions {
    editor: vscode.TextEditor;
    position: vscode.Position;
    placeholder: string;
    onSubmit: (instruction: string) => void;
    onCancel: () => void;
}

interface DiffResult {
    changes: Array<{
        type: 'added' | 'removed' | 'unchanged';
        value: string;
        lineNumber?: number;
    }>;
    newText: string;
}