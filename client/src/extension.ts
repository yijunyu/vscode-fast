import * as vscode from 'vscode';
import * as path from 'path';
import { workspace, ExtensionContext, commands, Uri, window } from 'vscode';
import { execSync } from 'child_process';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient';

function getWebviewContent3(context: vscode.ExtensionContext, doc: String, message: any) {
	var fs = require("fs");
	var path = require('path');
	var dirname = path.dirname(doc);
	var filename = path.basename(doc, '.cpp');
	var pb_filename = path.join(dirname, filename + '.pb');
	var html_filename = path.join(dirname, filename + '.html');
	var csv_filename = path.join(dirname, filename + "_" + message.weight + "_attention_" + message.node + ".csv");
	vscode.window.showErrorMessage("model: " + message.model + " csv: " + csv_filename);
	var accumulated = "0";
	if (message.attention === "accumulation") 
		accumulated = "1";
	execSync('fast -p ' + doc + ' ' + pb_filename);
	execSync('fast -H 0 -a ' + accumulated + ' -x ' + csv_filename + ' ' + pb_filename + '> ' + html_filename);
	var text = fs.readFileSync(html_filename);
	return text;
}

function getWebviewContent(context: vscode.ExtensionContext) {
	var fs = require("fs");
	var files = fs.readdirSync(path.join(vscode.workspace.rootPath,'./model'));
	var models = "";
	for (var i=0; i <files.length; i++) {
		models = models + `<option value="`+ files[i] + `">` + files[i] + `</option>`;
	}
	var text = `<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>Cat Coding</title>
	</head>
	<body>
		<form id="form">
		Model: 
		<select id="model" name="model">`
		+ models +
		`</select>
		<fieldset>
			<legend>Attention:</legend>
			<input type="radio" id="att0" name="attention" value="normal" checked> Normal<br>
			<input type="radio" id="att1" name="attention" value="accumulation"> Accumulation<br>
		</fieldset>
		<fieldset>
			<legend>Weights:</legend>
			<input type="radio" id="raw" name="weight" value="raw" checked> Raw<br>
			<input type="radio" id="scaled" name="weight" value="scaled"> Scaled<br>
		</fieldset>
		<fieldset>
			<legend>With Node Type:</legend>
			<input type="radio" id="yes" name="node" value="with_node_type" checked> Yes<br>
			<input type="radio" id="no" name="node" value="without_node_type"> No<br>
		</fieldset>
		</form>
		<div id="message"></div>
		<script>
			const vscode = acquireVsCodeApi();
			function post() {
				var model_value = model.value;
				var node_value = (yes.checked? yes.value: (no.checked? no.value : "none"));
				var attention_value = (att0.checked? att0.value : (att1.checked? att1.value: "none"));
				var weight_value = (raw.checked? raw.value : (scaled.checked? scaled.value: "none"));
				vscode.postMessage({
					attention: attention_value,
					weight: weight_value,
					node: node_value,
					model: model_value
				});
			}
			const att0 = document.getElementById('att0');
			const att1 = document.getElementById('att1');
			const raw = document.getElementById('raw');
			const scaled = document.getElementById('scaled');
			const yes = document.getElementById('yes');
			const no = document.getElementById('no');
			const model = document.getElementById('model');
			const message = document.getElementById('message');
			yes.onchange = (event) => {post();};
			no.onchange = (event) => {post();};
			att0.onchange = (event) => {post();};
			att1.onchange = (event) => {post();};
			raw.onchange = (event) => {post();};
			scaled.onchange = (event) => {post();};
			model.onchange = (event) => {post();};
		</script>
	</body>
	</html>`;
	return text;
}

let client: LanguageClient;

export function activate(context: ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('bigCoding.start', () => {
			var doc = vscode.window.activeTextEditor.document.fileName;
			// vscode.window.showErrorMessage(doc);

			// Create and show panel
			const panel = vscode.window.createWebviewPanel(
				'Attention to Code: Configuration',
				'Configuration',
				vscode.ViewColumn.Two,
				{	enableScripts: true,
					retainContextWhenHidden: true,
				}
			);
			// And set its HTML content
			panel.webview.html = getWebviewContent(context);

			// Handle messages from the webview
			panel.webview.onDidReceiveMessage(
				message => {
					const panel = vscode.window.createWebviewPanel(
						'Attention to Code: View',
						path.basename(doc) + "(" 
							+ message.attention + ","
							+ message.weight + "," 
							+ message.node + "," 
							+ message.model + ")",
						vscode.ViewColumn.One,
						{	enableScripts: true,
							retainContextWhenHidden: true,
						}
					);
					panel.webview.html = getWebviewContent3(context, doc, message);
				},
				undefined,
				context.subscriptions
			);
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
		documentSelector: [{ scheme: 'file', language: 'cpp' }, { scheme: 'file', language: 'java' }, ],
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
