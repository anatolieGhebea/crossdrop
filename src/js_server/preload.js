'use strict';
const { ipcRenderer } = require('electron');
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('main_proccess_proxy', {
    getExpressServerAddress: () => ipcRenderer.invoke('express_server_address'),
    getExpressServerUploadedList: () => ipcRenderer.invoke('express_server_uploaded_list'),
    getExpressServerSharedList: () => ipcRenderer.invoke('express_server_shared_list'),
    getExpressServerFoldersPath: () => ipcRenderer.invoke('express_server_folders_path'),
});