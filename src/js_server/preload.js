'use strict';
const { ipcRenderer } = require('electron');
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('main_proccess_proxy', {
    getExpressServerAddress: () => ipcRenderer.invoke('express_server_address'),
});