'use strict';
const { ipcRenderer } = require('electron');
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('main_proccess_proxy', {
    getExpressServerAddress: () => ipcRenderer.invoke('express_server_address'),
    getClipbaordData: () => ipcRenderer.invoke('get_clipboard_data'),
    setClipbaordData: (data) => ipcRenderer.invoke('set_clipboard_data', data),
    getExpressServerUploadedList: () => ipcRenderer.invoke('express_server_uploaded_list'),
    getExpressServerSharedList: () => ipcRenderer.invoke('express_server_shared_list'),
    getExpressServerFoldersPath: () => ipcRenderer.invoke('express_server_folders_path'),
});