import * as vscode from 'vscode';
import * as path from 'path';
import { workspace, ExtensionContext, commands, Uri, window } from 'vscode';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient';

function getWebviewContent(context: vscode.ExtensionContext) {
	var fs = require("fs");
	var text = fs.readFileSync(path.join(vscode.workspace.rootPath, "./file_" 
		+ workspace.getConfiguration('bigcoding.model') + ".html"));
	return text;
}

let client: LanguageClient;

export function activate(context: ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('bigCoding.start', () => {
			// Create and show panel
			const panel = vscode.window.createWebviewPanel(
				'Attention to Code: Interpreting Big Code Classification Decisions',
				'Big Coding',
				vscode.ViewColumn.One,
				{}
			);
			// And set its HTML content
			panel.webview.html = getWebviewContent(context);
		})
	);

	// The server is implemented in node
	let serverModule = context.asAbsolutePath(
		path.join('server', 'out', 'server.js')
	);
	// The debug options for the server
	// --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
	let debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

	// If the extension is launched in debug mode then the debug server options are used
	// Otherwise the run options are used
	let serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.ipc },
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
			options: debugOptions
		}
	};

	// Options to control the language client
	let clientOptions: LanguageClientOptions = {
		// Register the server for plain text documents
		documentSelector: [{ scheme: 'file', language: 'cpp' }],
		synchronize: {
			// Notify the server about file changes to '.clientrc files contained in the workspace
			fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
		}
	};

	// Create the language client and start the client.
	client = new LanguageClient(
		'languageServerExample',
		'Language Server Example',
		serverOptions,
		clientOptions
	);

	// Start the client. This will also launch the server
	client.start();
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}
