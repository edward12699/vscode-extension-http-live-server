// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as express from 'express';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
const WebSocket = require('ws');
const cheerio = require('cheerio');

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "http-live-server" is now active!');

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand('http-live-server.launch', () => {
    console.log(22222);
    const app = express();
    const server = http.createServer(app);
    const wss = new WebSocket.Server({ server });
    let modifiedData;
    const injectedScript = `<script>
    var protocol = window.location.protocol === 'http:' ? 'ws://' : 'wss://';
    var address = protocol + window.location.host + window.location.pathname + '/ws';
    var socket = new WebSocket(address);
    socket.onmessage = function (msg) {
      if (msg.data == 'reload') window.location.reload();
      else if (msg.data == 'refreshcss') refreshCSS();
    };
  </script>`;
    wss.on('connection', (ws) => {
      console.log('New client connected');

      // 监听文件变更
      fs.watch(path.join(vscode.workspace.rootPath || '', 'index.html'), (event, filename) => {
        if (filename) {
          fs.readFile(path.join(vscode.workspace.rootPath || '', 'index.html'), 'utf8', (err, data) => {
            if (err) {
              console.error(`Error reading the file: ${err}`);
              return;
            }
            modifiedData = data.replace('</body>', `${injectedScript}\n</body>`);
            ws.send('reload');
          });
        }
      });

      ws.on('close', () => {
        console.log('Client disconnected');
      });
    });

    const classifyFile = (ws?: any) => {
      fs.readFile(path.join(vscode.workspace.rootPath || '', 'index.html'), 'utf8', (err, data) => {
        if (err) {
          console.error(`Error reading the file: ${err}`);
          return;
        }
        const $ = cheerio.load(data);
        // 提取CSS和JS链接
        const cssLinks = [];
        const jsLinks = [];

        $('link[rel="stylesheet"]').each((i, element) => {
          cssLinks.push($(element).attr('href'));
        });

        $('script[src]').each((i, element) => {
          jsLinks.push($(element).attr('src'));
        });

        modifiedData = data.replace('</body>', `${injectedScript}\n</body>`);
        app.get('/', (req, res) => {
          res.send(modifiedData);
        });

        cssLinks.forEach((link, index) => {
          // 这里仅作为示例，你可能需要更精细的处理
          app.get('/' + link, (req, res) => {
            res.setHeader('Content-Type', 'text/css');
            res.sendFile(path.join(vscode.workspace.rootPath || '', link));
          });
        });

        jsLinks.forEach((link, index) => {
          app.get('/' + link, (req, res) => {
            res.setHeader('Content-Type', 'application/javascript');
            res.sendFile(path.join(vscode.workspace.rootPath || '', link));
          });
        });
      });
    };

    classifyFile();
    server.listen(7000, () => {
      console.log('Server listening on port 7000');
    });



  });

  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() { }
