import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('🧬 Cursor Cmd+K Gene activated!');

    const disposable = vscode.commands.registerCommand('cursorGene.inlineEdit', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor');
            return;
        }

        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);
        const hasSelection = !selection.isEmpty;

        // Get instruction from user
        const instruction = await vscode.window.showInputBox({
            prompt: hasSelection ? 'How should I modify this code?' : 'What code should I write?',
            placeHolder: 'e.g., add error handling, convert to TypeScript, make it async...',
            ignoreFocusOut: true
        });

        if (!instruction) {
            return;
        }

        // Show progress
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "AI thinking...",
            cancellable: false
        }, async (progress) => {
            // Simulate AI processing
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Get AI response (mock for demo)
            const aiResponse = await mockAI(selectedText, instruction, editor.document.languageId);

            // Create a preview
            const quickPick = vscode.window.createQuickPick();
            quickPick.title = '🤖 AI Suggestion';
            quickPick.placeholder = 'Press Enter to accept, Escape to cancel';
            
            // Show diff-style preview
            const originalLines = selectedText.split('\n');
            const newLines = aiResponse.split('\n');
            
            quickPick.items = [
                { label: '$(check) Accept changes', description: 'Replace selection with AI suggestion' },
                { label: '$(close) Cancel', description: 'Keep original code' },
                { label: '', kind: vscode.QuickPickItemKind.Separator },
                { label: 'Preview:', kind: vscode.QuickPickItemKind.Separator }
            ];

            // Add diff preview items
            const maxLines = Math.max(originalLines.length, newLines.length);
            for (let i = 0; i < maxLines; i++) {
                if (originalLines[i] !== newLines[i]) {
                    if (originalLines[i] !== undefined) {
                        quickPick.items = [...quickPick.items, {
                            label: `$(remove) ${originalLines[i]}`,
                            description: 'removed'
                        }];
                    }
                    if (newLines[i] !== undefined) {
                        quickPick.items = [...quickPick.items, {
                            label: `$(add) ${newLines[i]}`,
                            description: 'added'
                        }];
                    }
                } else if (newLines[i] !== undefined) {
                    quickPick.items = [...quickPick.items, {
                        label: `  ${newLines[i]}`,
                        description: ''
                    }];
                }
            }

            quickPick.onDidChangeSelection(async (items) => {
                if (items[0]?.label.includes('Accept')) {
                    // Apply the change
                    await editor.edit(editBuilder => {
                        if (hasSelection) {
                            editBuilder.replace(selection, aiResponse);
                        } else {
                            editBuilder.insert(selection.active, aiResponse);
                        }
                    });
                    
                    // Flash the changed region
                    const newSelection = new vscode.Selection(
                        selection.start,
                        selection.start.translate(aiResponse.split('\n').length - 1)
                    );
                    
                    const decoration = vscode.window.createTextEditorDecorationType({
                        backgroundColor: 'rgba(0, 255, 0, 0.2)'
                    });
                    
                    editor.setDecorations(decoration, [newSelection]);
                    setTimeout(() => decoration.dispose(), 500);
                    
                    vscode.window.showInformationMessage('✅ AI edit applied!');
                }
                quickPick.hide();
            });

            quickPick.show();
        });
    });

    context.subscriptions.push(disposable);
}

async function mockAI(code: string, instruction: string, language: string): Promise<string> {
    const instructionLower = instruction.toLowerCase();

    // Handle empty selection (generation)
    if (!code) {
        if (instructionLower.includes('function') || instructionLower.includes('method')) {
            return `function ${extractFunctionName(instruction)}() {
    // TODO: Implement ${instruction}
    throw new Error('Not implemented yet');
}`;
        }
        
        if (instructionLower.includes('class')) {
            return `class ${extractClassName(instruction)} {
    constructor() {
        // Initialize
    }
    
    // TODO: Add methods
}`;
        }

        // Default
        return `// TODO: ${instruction}`;
    }

    // Handle code transformation
    if (instructionLower.includes('typescript') || instructionLower.includes('types')) {
        return addTypeScriptTypes(code);
    }

    if (instructionLower.includes('async') || instructionLower.includes('await')) {
        return makeAsync(code);
    }

    if (instructionLower.includes('error') || instructionLower.includes('try')) {
        return addErrorHandling(code);
    }

    if (instructionLower.includes('modern') || instructionLower.includes('es6')) {
        return modernize(code);
    }

    // Default: add a comment
    return `// AI: ${instruction}\n${code}`;
}

function extractFunctionName(instruction: string): string {
    const match = instruction.match(/function\s+(\w+)|(\w+)\s+function/i);
    return match ? match[1] || match[2] : 'newFunction';
}

function extractClassName(instruction: string): string {
    const match = instruction.match(/class\s+(\w+)|(\w+)\s+class/i);
    return match ? match[1] || match[2] : 'NewClass';
}

function addTypeScriptTypes(code: string): string {
    // Simple type inference
    return code
        .replace(/function\s+(\w+)\s*\((.*?)\)/g, (match, name, params) => {
            const typedParams = params.split(',').map((p: string) => {
                const param = p.trim();
                if (!param) return '';
                return `${param}: any`;
            }).join(', ');
            return `function ${name}(${typedParams}): any`;
        })
        .replace(/const\s+(\w+)\s*=\s*\[(.*?)\]/g, 'const $1: any[] = [$2]')
        .replace(/const\s+(\w+)\s*=\s*{/g, 'const $1: Record<string, any> = {');
}

function makeAsync(code: string): string {
    return code
        .replace(/function\s+(\w+)/g, 'async function $1')
        .replace(/=>\s*{/g, '=> {')
        .replace(/return\s+(.*);/g, 'return await $1;');
}

function addErrorHandling(code: string): string {
    const lines = code.split('\n');
    const functionStart = lines.findIndex(line => line.includes('function') || line.includes('=>'));
    
    if (functionStart >= 0) {
        const indentation = lines[functionStart].match(/^\s*/)?.[0] || '';
        const functionBody = lines.slice(functionStart + 1).join('\n');
        
        return `${lines[functionStart]}
${indentation}try {
${functionBody.split('\n').map(line => '    ' + line).join('\n')}
${indentation}} catch (error) {
${indentation}    console.error('Error:', error);
${indentation}    throw error;
${indentation}}`;
    }
    
    return `try {
${code.split('\n').map(line => '    ' + line).join('\n')}
} catch (error) {
    console.error('Error:', error);
    throw error;
}`;
}

function modernize(code: string): string {
    return code
        .replace(/var\s+/g, 'const ')
        .replace(/function\s*\(/g, '(')
        .replace(/\)\s*{/g, ') => {')
        .replace(/for\s*\(let\s+(\w+)\s*=\s*0;\s*\1\s*<\s*(.*?)\.length;\s*\1\+\+\)\s*{/g, 
                'for (const $1 of $2) {');
}

export function deactivate() {
    console.log('🧬 Cursor Cmd+K Gene deactivated');
}