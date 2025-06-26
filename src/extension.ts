import * as vscode from 'vscode';
import axios from 'axios';

// DIRECT API KEY (⚠️ not secure for public extensions)
const OPENROUTER_API_KEY = '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';

type WebviewMessage =
  | { type: 'chat'; content: string }
  | { type: 'file-request'; filename: string; content?: string };

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('chat-webview.startChat', () => {
    const panel = vscode.window.createWebviewPanel(
      'chatAssistant',
      'Chat with AI',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, 'media', 'assets')
        ]
      }
    );

    panel.webview.html = getWebviewContent(panel.webview, context.extensionUri);

    panel.webview.onDidReceiveMessage(async (msg: WebviewMessage) => {
      if (msg.type === 'chat') {
        try {
          const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
              model: 'openai/gpt-4o',
              messages: [{ role: 'user', content: msg.content }],
              max_tokens: 1000
            },
            {
              headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json'
              }
            }
          );

          const aiReply = response.data.choices?.[0]?.message?.content || '⚠️ No response';
          panel.webview.postMessage({ type: 'response', content: aiReply });
        } catch (error: any) {
          panel.webview.postMessage({
            type: 'response',
            content: `❌ Error: ${error.response?.data?.error?.message || error.message}`
          });
        }
      }

      if (msg.type === 'file-request') {
        if (!vscode.workspace.workspaceFolders) {
          panel.webview.postMessage({
            type: 'file-error',
            filename: msg.filename,
            error: 'No workspace is open.'
          });
          return;
        }

        // If content is provided, treat as upload and save to workspace
        if (msg.content) {
          try {
            const fileUri = vscode.Uri.joinPath(
              vscode.workspace.workspaceFolders[0].uri,
              msg.filename
            );
            const buffer = Buffer.from(msg.content, 'base64');
            await vscode.workspace.fs.writeFile(fileUri, buffer);
            panel.webview.postMessage({
              type: 'file-response',
              filename: msg.filename,
              content: msg.content // echo back the base64 for preview
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            panel.webview.postMessage({
              type: 'file-error',
              filename: msg.filename,
              error: message
            });
          }
          return;
        }

        // Otherwise, read file from workspace as before
        try {
          const fileUri = vscode.Uri.joinPath(
            vscode.workspace.workspaceFolders[0].uri,
            msg.filename
          );
          const fileData = await vscode.workspace.fs.readFile(fileUri);
          const base64 = Buffer.from(fileData).toString('base64');

          panel.webview.postMessage({
            type: 'file-response',
            filename: msg.filename,
            content: base64
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          panel.webview.postMessage({
            type: 'file-error',
            filename: msg.filename,
            error: message
          });
        }
      }
    });
  });

  context.subscriptions.push(disposable);
}

function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'media', 'assets', 'index.js')
  );
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'media', 'assets', 'index.css')
  );

  const nonce = getNonce();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chat Assistant</title>
  <link rel="stylesheet" href="${styleUri}">
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}">window.vscode = acquireVsCodeApi();</script>
  <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}

function getNonce(): string {
  return [...Array(32)].map(() => Math.floor(Math.random() * 36).toString(36)).join('');
}

export function deactivate() {}