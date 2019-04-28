import * as vscode from 'vscode';
import { workspace, ExtensionContext, commands, Uri, window } from 'vscode';
import { spawnSync, execSync } from 'child_process';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient';

const fs = require("fs");
const path = require('path');
const tempfile = require('tempfile');
const fastCmd = 'fast ';

function testProgram(message, doc) {
	var model = message.model.replace(/[\n\r]/g,"");
	// var d = vscode.workspace.asRelativePath(""+doc) + path.; 
	var d = path.dirname(doc);
	model = model.split(")")[1];
	var cmd = fastCmd + " " + 'live_test' + " " + '--model_path=/model/' + model + " " + path.basename(doc);
	var out = execSync(cmd, {
		cwd: d,
		timeout: 15000,
		stdio: "inherit"
	});
	console.log("DONE!" + out);
}

function getWebviewContent3(context: vscode.ExtensionContext, doc: String, message: any) {
	testProgram(message, doc);
	var dirname = path.dirname(doc);
	var ext = path.extname(doc);
	var filename = path.basename(doc, ext);
	var html_filename = path.join(dirname, filename + ".html");		
	var text = fs.readFileSync(html_filename).toString();
	return text;	
}

function updateView(model_dir) {
	var models = "";
	var out = execSync(fastCmd + ' model');
	var files = out.toString().split("\n");
	for (var i=0; i <files.length; i++) {
		if (files[i] != "")
			models = models + `<option value="(`+ i + ")" + files[i] + `"> (` + i + "): " + files[i] + `</option>`;
	}	
	var text = `<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>Interpreting the algorithm classification results</title>
	</head>
	<body>
		<form id="form">
		Model: 
		<select id="model" name="model">`
		+ models +
		`</select>
		</form>
		<div id="message"></div>
		<script>
			const vscode = acquireVsCodeApi();
			function get_value(name) {
				var value = "";
				var x = document.getElementsByName(name);
				for (var i = 0; i < x.length; i++) {
					if (x[i].type == "radio" && x[i].checked) {
						value = x[i].value;
					}
				}
				return value;
			}

			function post(event) {
				var model_value = model.value;
				vscode.postMessage({
					model: model_value
				});
			}
			var x = document.getElementsByTagName('input');
			var i;
			for (i = 0; i < x.length; i++) {
				if (x[i].type == "radio") {
					x[i].onchange = (event) => {post(event)};
				}
			}
			const model = document.getElementById('model');
			const message = document.getElementById('message');
			model.onchange = (event) => {post(event);};
		</script>
	</body>
	</html>`;
	return text;
}

function getWebviewContent(context: vscode.ExtensionContext) {
	var model_dir = vscode.workspace.rootPath + "/model";
	return updateView(model_dir);
}

let client: LanguageClient;

export function activate(context: ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('BigCode.Classify', async () => {
			var doc = vscode.window.activeTextEditor.document.fileName;
			// Create and show panel
			const panel = vscode.window.createWebviewPanel(
				'GGNN: Configuration',
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
						path.basename(doc) + message.model.split(")")[0] + ")",
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
