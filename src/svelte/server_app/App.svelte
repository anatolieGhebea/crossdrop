<script>

    import { onMount } from 'svelte';

    let clipboard_data = '';
    let current_address = false;
    let log_msg = 'The application is beeing initialised, please wait...';
    let refreshRequest = false;

    let uploadedFiles = [];
    let sharedFiles = [];
    let folderUploaded = '__folder-name___';
    let folderShared = '__folder-name___';
    let force_update = false;

    const main_proxy_proccess = window.main_proccess_proxy ? true: false;

    onMount( () => {
        getServerAddress();

        // force folder rescan
        const updateShared = setInterval( () => {
            if( current_address )
                updateSharedList();
        }, 5000 );
    });

    $: updateLists(current_address, force_update);

    function getServerAddress(){
        if ( !main_proxy_proccess ) {
            refreshRequest = false;
            log_msg = "Main process not detected, please restart the application";
            return;
         }

        refreshRequest = true;
        window
        .main_proccess_proxy
        .getExpressServerAddress()
        .then( res => {
            refreshRequest = false;
            console.log(res);
            if( res ) {
                current_address = res;
                log_msg = "Application ready";
                generateQRCode();
            } else {
                log_msg = "Some error occured, please restart the application";    
            }
        });
    }

    function updateLists( Addr, Force) {
        if( !Addr && !Force )
            return;
        
        force_update = false; // reset force update
        
        getFoldersPath();
        updateUploadedList();
        updateSharedList();

    }

    
    function updateUploadedList(){
        if ( !main_proxy_proccess ) {
            log_msg = "Main process not detected, please restart the application";
            return;
        }

        window
        .main_proccess_proxy
        .getExpressServerUploadedList()
        .then( res => {
            console.log(res);
            if( res ) {
                uploadedFiles = res;
            } 
        })
        .catch(e => {
            console.log(e);
        });
        
    }

    function updateSharedList(){
     if ( !main_proxy_proccess ) {
            log_msg = "Main process not detected, please restart the application";
            return;
        }

        window
        .main_proccess_proxy
        .getExpressServerSharedList()
        .then( res => {
            console.log(res);
            if( res ) {
                sharedFiles = res;
            } 
        })
        .catch(e => {
            console.log(e);
        });
    }

    function getFoldersPath(){
         if ( !main_proxy_proccess ) {
            log_msg = "Main process not detected, please restart the application";
            return;
        }

        window
        .main_proccess_proxy
        .getExpressServerFoldersPath()
        .then( res => {
            console.log(res);
            if( res ) {
                folderUploaded = res.forUploads;
                folderShared = res.forShared;
            } 
        })
        .catch(e => {
            console.log(e);
        });

        
    }
   
    function generateQRCode(){
        console.log('qr');
        // from https://davidshimjs.github.io/qrcodejs/ 
        // dom might be slow, wai a few milliseconds before updating...
        const wait = setTimeout( () => {
            // new QRCode(document.getElementById("qrcode"), `http://${current_address}`);
            new QRCode("qrcode", {
                text: `http://${current_address}`,
                width: 128,
                height: 128
            });
            clearTimeout(wait);
        }, 200 );
    }
</script>

<div class="main_containerr">
    
    {#if !current_address }
        <div class="application_not_ready">
            <div class="log__msg">
                {log_msg}
            </div> 
            {#if !refreshRequest }
                <div>
                    <button class="btn-refresh" on:click="{ () => getServerAddress() }">
                        Refresh <i class="fa fa-refresh" aria-hidden="true"></i>
                    </button>
                </div>
            {/if}
        </div>
    {:else}
        <div class="header">    
            <div class="d-flex items-center">
                <div class="qrcode_wrapper">
                    <div id="qrcode"></div>
                </div>
                <div class="flex-expand">
                    <h1>Crossdrop server</h1>
                    <p>
                        This server application is running.<br>
                        You can scan the qrcode on the left side of this message or navigate <b>http://{current_address}</b> with your favorite browser.
                    </p>
                    <p>
                        <b>Note:</b> the devices must be connected to the same local network/wifi. 
                    </p>
                </div>
                
            </div>
        </div>
    
        <div class="content">
            <div class="d-flex " style="flex-wrap: wrap;">
                <div class="side_sx">
                    <div class="macro_area macro_area__uploaded">
                        <h2 class="title"> Uploaded <span on:click="{ () => updateUploadedList() }"><i class="fa fa-refresh" aria-hidden="true"></i></span></h2>
                        <p>Files that are currently present in the folder <b>{folderUploaded}</b> </p>

                        <div>
                            {#each uploadedFiles as uf }
                                <div class="card">
                                    <div class="card__icon">
                                        <i class="fa fa-file" aria-hidden="true"></i>
                                    </div>
                                    <div class="card__content">
                                        <p class="title">{uf.name}</p>
                                    </div>
                                    <div class="card__status">
                                        <div class="meta">
                                            <span class="size">{uf.size_formated}</span>
                                        </div>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </div>
                    <div class="macro_area macro_area__available">
                        <h2 class="title">Shared</h2>
                        <p>Files that are currently present in the folder <b>{folderShared}</b>  and can be downloaded by the connected devices.</p>
                        <div>
                            {#each sharedFiles as uf }
                                <div class="card">
                                    <div class="card__icon">
                                        <i class="fa fa-file" aria-hidden="true"></i>
                                    </div>
                                    <div class="card__content">
                                        <p class="title">{uf.name}</p>
                                    </div>
                                    <div class="card__status">
                                        <div class="meta">
                                            <span class="size">{uf.size_formated}</span>
                                        </div>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </div>
                
                </div>

                <div class="side_dx">
                    <div class="macro_area macro_area__clipboard">
                        <h2 class="title">Clipboard</h2>
                        <textarea name="clip" rows="10" class="clipboard_input" bind:value="{clipboard_data}" placeholder="Paste or Write your text here"></textarea>
                        <button class="btn-clearclipboard" on:click="{ () => clipboard_data = '' }">clear clipboard</button>
                    </div>
                </div>
            </div>
        </div>
    {/if}
</div>

<style>
    /* Not ready  */
    .application_not_ready {
        width: 70%;
        margin: 0 auto;
    }   

    .application_not_ready > div {
        padding: 1rem;
    }

    .log__msg {
        font-size: 16px;
    }

    .btn-refresh {
        display: block;
        background: #E55812;
        color:#fff;
        border: 0;
        border-radius: 5px;
        padding: .5rem 0;
        width: 100%;
    }


    /* */
    /* main container */
    /* */
    /* Header */
    .header {
        /* height: 20vh; */
        width: 100%;
    }

    .qrcode_wrapper {
        padding: 1rem;
    }

    /* */
    /* Content */
    /* */
    .content {
        padding: 0;
    }

    .macro_area {
        /* min-width: 300px;
        width: 100%; */
        padding: 0 1rem;
    }

    .side_sx {
        width: 100%;
    }
    .side_dx {
        width: 100%;
    }

    @media screen and (min-width: 650px){
        .macro_area {
            /* min-width: 300px;
            max-width: calc( (100% / 2 ) - 5px ); */
        }   
        .side_sx {
            width: 65%;
        }
        .side_dx {
            width: 35%;
        }
    }

    .macro_area > .title {
        border-bottom: 2px solid #38369A;
        color: #38369A;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    /* Upload download sections */
     .card {
        display: flex;
        justify-content: flex-start;
        align-items: center;
        padding: .5rem;
        background: #E5E5F5;
        color: #38369a;
        margin: 0 .25rem;
        border-radius: 10px;
        margin-bottom: .5rem;
    }

    .card .card__icon {
        width: 30px;
        text-align: center;
        font-size: 15px
    }
    .card .card__content {
        flex-grow: 1;
    }

    .card .card__content .title {
        margin: .25rem 0 .5rem 0;
    }

    .card .card__status {
        /* width: 150px; */
        text-align: center;
    }

    /* Clipboard section */
    
    .clipboard_input {
        width: 99%;
    }

    .btn-clearclipboard {
        display: block;
        background: #E55812;
        color:#fff;
        border: 0;
        border-radius: 5px;
        padding: .5rem 0;
        width: 100%;
    }


    /* */
    /* Util*/
    /* */
    .d-flex {
        display: flex;
    }
    .items-center {
        align-items: center;
    }
    .justify-center {
        justify-content: center;
    }

    .justify-between {
        justify-content: space-between;
    }
    .flex-expand {
        flex-grow: 1;
    }
</style>
