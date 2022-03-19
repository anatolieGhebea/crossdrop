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
const express_app = express();
const port = 3000;

// check the available memory
const userHomeDir = os.homedir();

// 
// prepare directory
// 
let crossdrop_dir_exists_uploads = false;
let crossdrop_dir_exists_shared = false;
if( fs.existsSync(userHomeDir+'/crossdrop') ){
  intCrossdropSubfolders();
} else {
  fs.mkdir(userHomeDir+'/crossdrop', err => {
    if( err ) {
      console.log(err);
    } else {
      crossdrop_dir_exists_uploads = true;
      intCrossdropSubfolders();
    }
  });
}

function intCrossdropSubfolders(){
  if( fs.existsSync(userHomeDir+'/crossdrop/uploads') ){
    crossdrop_dir_exists_uploads = true;
  } else {
    fs.mkdir(userHomeDir+'/crossdrop/uploads', err => {
      if( err ) {
        console.log(err);
      } else {
        crossdrop_dir_exists_uploads = true;
      }
    });
  }

  if( fs.existsSync(userHomeDir+'/crossdrop/shared') ){
    crossdrop_dir_exists_shared = true;
  } else {
    fs.mkdir(userHomeDir+'/crossdrop/shared', err => {
      if( err ) {
        console.log(err);
      } else {
        crossdrop_dir_exists_shared = true;
      }
    });
  }
}
// 

// 
// Init server 
// 
express_app.use(express.static(path.join(__dirname, '../public')) );
express_app.use(fileUpload());
express_app.use(express.json());
// 


// 
// Electron process
// 

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}
let mainWindow;
const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 920,
    x: 50,
    y: 50,
    webPreferences: {
      preload: path.join(__dirname, 'js_server/preload.js'),
      nodeIntegration: true,
      enableRemoteModule: false,
      contextIsolation: true
    },
    backgroundColor: '#f5f5f5'
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, '../public/server.html'));

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

  mainWindow = null;
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});


// 
// IPC  
// 

ipcMain.handle("express_server_address", (event) => {
  return getFullAddr()
})

ipcMain.handle("get_clipboard_data", (event) => {
  return getClipboardData()
})

ipcMain.handle("set_clipboard_data", (event, data) => {
  //
  if( data.hasOwnProperty('data') )
    setClipboardData(data.data);
  
  return true;
})

ipcMain.handle("express_server_folders_path", (event) => {

  return {
    forUploads: getUplodsFolderPath(),
    forShared: getSharedFolderPath()
  } 
    
})


ipcMain.handle("express_server_uploaded_list", (event) => {
  return getUploadedFiles();
})

ipcMain.handle("express_server_shared_list", (event) => {
  return getSharedFiles();
})






//
//  Express server API
//

// home page
express_app.get('/', (req, res) => {
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

express_app.get('/shared_files', (req, res) => {
  res.json( { list: getSharedFiles() } );
})

express_app.get('/getClipboardData', (req, res) => {
  res.json( { data: getClipboardData() } );
})
express_app.post('/setClipboardData', (req, res) => {
  if( req.body && req.body.hasOwnProperty('data') ){
    setClipboardData(req.body.data)
    return res.json( { status: true } );
  }

  return res.json( { status: false } );
})

express_app.get('/shared_files_download/:file_name', (req, res) => {
  
  let fname = req.params.file_name;
  console.log(fname);
  if( !fname ) {
    res.json({ error: 'no file name'});
  }

  // check if file exists
  if( !fs.existsSync(userHomeDir+'/crossdrop/shared/'+fname) ){
    res.json({ error: 'file not found'});
  }

  res.download( userHomeDir+'/crossdrop/shared/'+fname )
})

// ulpoad a file
express_app.post('/upload', function(req, res) {
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
  if( crossdrop_dir_exists_uploads ){
    uploadPath = userHomeDir + '/crossdrop/uploads/' + selectedFile.name;
  }

  // Use the mv() method to place the file somewhere on your express_app
  selectedFile.mv(uploadPath, function(err) {
    if (err)
      return res.status(500).send(err);

    res.send('File uploaded!');
    // res.redirect('/');
  });
});


express_app.listen(port, () => {
  console.log(`Example server listening at ${getFullAddr()}`);
})


// 
// Util
// 
let clipboard_data = '';
//
// get device IP
//
function getFullAddr() {
	let ip_addr = ip.address();
	// the addres is combination ip:port
	let fullAddr = ip_addr + ':' + port;
	return fullAddr;
}

function getClipboardData() {
	return clipboard_data;
}

function setClipboardData(data) {
	clipboard_data = data;
}

function getUplodsFolderPath(){
  return userHomeDir+'/crossdrop/uploads';
}

function getSharedFolderPath(){
  return userHomeDir+'/crossdrop/shared';
}

// scan the uploads folder 
function getUploadedFiles(){
  if( !crossdrop_dir_exists_uploads )
    return [];
   
  let detected_files = [];
  fs.readdirSync(userHomeDir+'/crossdrop/uploads').forEach(file => {
    // console.log(file);
    detected_files = [...detected_files, file ];
  });

  return filesAddMeta(filterOutFiles(detected_files), 'uploads');
}

// scan the shared folder
function getSharedFiles(){
  if( !crossdrop_dir_exists_shared )
   return [];
 
  let detected_files = [];
  fs.readdirSync(userHomeDir+'/crossdrop/shared').forEach(file => {
    // console.log(file);
    detected_files = [ ...detected_files, file ];
  });

  return filesAddMeta(filterOutFiles(detected_files), 'shared');
}

function filterOutFiles(files){
    let excluded = [ '.DS_Store' ];
    files = files.filter( (f) => {
      return !excluded.includes(f);
    });

    return files;
}

function filesAddMeta(files, sub_dir){
    if(!sub_dir)
      return false;

    let sub_path = userHomeDir+'/crossdrop/'+sub_dir+'/';

    files = files.map( (f) => {
      let s = fs.statSync(sub_path+f).size;
      return {
        name: f, 
        size: s,
        size_formated: s < 1024 ? s+" KB": ( s / ( 1024 * 1024 ) ).toFixed(2) + " MB"
      }
    });

    return files;
}
