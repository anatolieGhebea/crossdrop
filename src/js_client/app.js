'use strict';

(function() {

    console.log('server side application is running');
    const main_proxy_proccess = window.main_proccess_proxy ? true: false;
    let current_address = '';
    const main_wrapper = document.getElementById('main_wrapper');
    
    function getServerAddress(){
        if( !main_wrapper ){
            return alert('No main wrapper detected, please reload the application.');
        }

        main_wrapper.innerHTML = noAddressTemplate();
    
        if ( main_proxy_proccess ) {
            window
            .main_proccess_proxy
            .getExpressServerAddress()
            .then( res => {
                console.log(res);
                if( res ) {
                    current_address = res;
                    main_wrapper.innerHTML = presentAddressTemplate();
                    generateQRCode();
                } else {
                    main_wrapper.innerHTML = errorAddressTemplate();
                }
            })
            .catch(e => {
                console.log(e);
                main_wrapper.innerHTML = errorAddressTemplate();
            });
        }
    }
    
    function noAddressTemplate(){
        return `<p>The application is beeing initialised, please wait...</p>`;
    }
    
    function errorAddressTemplate(){
        return `<p>Some error occured, please restart the application.</p>`;
    }
    
    function presentAddressTemplate(){
        return `<p>The current url for the server is http://${current_address}</p><p>scan the following qr code or enter the ip address in the device you wish to connect with.</p><div id="qrcode"></div>`;
    }

    function generateQRCode(){
        // dom might be slow, wai a few milliseconds before updating...
        new QRCode(document.getElementById("qrcode"), `http://${current_address}`);
    }


    getServerAddress();
})();

