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
server.use(express.static(path.join(__dirname, '../public')) );
server.use(fileUpload());
// 


// 
// Electron process
// 

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

server.get('/shared_files', (req, res) => {
  res.json( { list: getSharedFiles() } );
})

server.get('/shared_files_download/:file_name', (req, res) => {
  
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
  if( crossdrop_dir_exists_uploads ){
    uploadPath = userHomeDir + '/crossdrop/uploads/' + selectedFile.name;
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


// 
// Util
// 

//
// get device IP
//
function getFullAddr() {
	let ip_addr = ip.address();
	// the addres is combination ip:port
	let fullAddr = ip_addr + ':' + port;
	return fullAddr;
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
