// electron proccess
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// import os module
const os = require("os");
// server
const express = require('express');
const fileUpload = require('express-fileupload');
const ip = require('ip');
const server = express();
const port = 3000;
// check the available memory
const userHomeDir = os.homedir();

// prepare directory
let crossdrop_dir_exists = false;
if( fs.existsSync(userHomeDir+'/crossdrop') ){
  crossdrop_dir_exists = true;
} else {
  fs.mkdir(userHomeDir+'/crossdrop', err => {
    if( err ) {
      console.log(err);
    } else {
      crossdrop_dir_exists = true;
    }
  });
}


server.use(express.static(path.join(__dirname, '../public')) );
server.use(fileUpload());

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1240,
    height: 920,
    webPreferences: {
      preload: path.join(__dirname, 'js_server/preload.js'),
      nodeIntegration: true,
      contextIsolation: true
    }
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'server_ui.html'));

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});


// IPC 
ipcMain.handle("express_server_address", (event) => {
  return getFullAddr()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.



//
//  Express server API
//

// home page
server.get('/', (req, res) => {
  // res.send('Hello World!');
  var options = {
      root: path.join(__dirname)
  };
  
  var fileName = '../public/index.html';
  res.sendFile(fileName, options, function (err) {
      if (err) {
          next(err);
      } else {
          console.log('Sent:', fileName);
      }
  });
})

// ulpoad a file
server.post('/upload', function(req, res) {
  let selectedFile;
  let uploadPath;

  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No files were uploaded.');
  }

  console.log(`Next use home_dir at: ${userHomeDir}`);
  
  // The name of the input field (i.e. "selectedFile") is used to retrieve the uploaded file
  selectedFile = req.files.selectedFile;
  // uploadPath = __dirname + '/uploads/' + selectedFile.name;

  uploadPath = userHomeDir + '/' + selectedFile.name;
  if( crossdrop_dir_exists ){
    uploadPath = userHomeDir + '/crossdrop/' + selectedFile.name;
  }

  // Use the mv() method to place the file somewhere on your server
  selectedFile.mv(uploadPath, function(err) {
    if (err)
      return res.status(500).send(err);

    res.send('File uploaded!');
    // res.redirect('/');
  });
});

// server.get('/server_address', (req, resp) => {
//   resp.send(getFullAddr());
// });

server.listen(port, () => {
  console.log(`Example server listening at ${getFullAddr()}`);
})


// Util

//
// get device IP
//
function getFullAddr() {
	let ip_addr = ip.address();
	// the addres is combination ip:port
	let fullAddr = ip_addr + ':' + port;
	return fullAddr;
}