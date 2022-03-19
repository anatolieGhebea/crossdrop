<script>
    import { onMount } from 'svelte';

    const action = "/upload";
    const shared_endpoint = "/shared_files";
    const shared_endpoint_download = "/shared_files_download";
    const enctype = "multipart/form-data";
    const get_clipboard = "/getClipboardData";
    const set_clipboard = "/setClipboardData";
    let msg = "";
    let uploading = false;
    let clipboard_data = '';
    let sharedFiles = [];

    const PENDING = 2;
    const UPLOADED = 1;
    const FAILED = 3;

    let selectedFiles = [];
    let toUpload = [
        // {file_name: 'test3', status: PENDING, progress: 0, size: 0},
        // {file_name: 'test4', status: PENDING}
    ];
    let upLoaded = [
        // {file_name: 'test1', status: UPLOADED},
        // {file_name: 'test2', status: UPLOADED}
    ];

    let selectedTab = 'clipboard';
    // let selectedTab = 'upload';
    // let selectedTab = 'download';
    let dragOverActive = false;


    onMount( () => {
        getSharedFilesList();

        const updateShared = setInterval( () => {
            getSharedFilesList();
        }, 2000 );

        let lp = setInterval( checkClipboard, 500);
    } );
    
    $: sendClipboardData(clipboard_data);

    function sendClipboardData(data) {
    
        fetch( set_clipboard, {
            method: 'POST',
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            },
            body: JSON.stringify({ data: data })
        }).then(res => {
            // console.log(res);
        }).catch(e => {
            console.log(e);
        })
       
    }
    function checkClipboard() {
        fetch( get_clipboard, {
            method: 'GET'
        }).then( res => {
            return res.json();
        }).then(res => {
            // console.log(res);
            if(res.hasOwnProperty('data'))
                clipboard_data = res.data;
        }).catch(e => {
            console.log(e);
        })
    }

    function setactiveTab(tabname){
        selectedTab = tabname;
    }

    function browseFiles(event){
        console.log(event);
        document.getElementById('selectedFiles').click();
    }

    $: updatedUploadList(selectedFiles);

    function updatedUploadList(selectedFiles) {
        console.log(selectedFiles);
        
        if( selectedFiles.length <= 0 )
            return;

        Object.keys(selectedFiles).forEach( (key) => {

            toUpload = [...toUpload, 
                {
                    file_name: selectedFiles[key].name,
                    status: PENDING,
                    size: 0,
                    progress: 0
                }
            ];
        });

        console.log(toUpload);
    }

    
    function uploadSelectedFiles() {
        console.log('clikced');
        if(selectedFiles.length < 1){
            return;
        }

        uploading = true;
        let currentUpploadsCount = selectedFiles.length;
        for (let i = 0; i < selectedFiles.length; i++) {
            let formData = new FormData();

            formData.append("selectedFile", selectedFiles[i]);

            let xhr = new XMLHttpRequest();
            xhr.open("POST", action);
            xhr.upload.addEventListener("progress", function(e) {
                // console.log('progress update....');
                // console.log(e);
                let loaded = parseInt((e.loaded * 100) / e.total);
                toUpload[i].progress = loaded;
                if( loaded >= 100 ){
                    toUpload[i].status = UPLOADED;
                    toUpload[i].size = e.total < 1024 ? e.total+" KB": ( e.total / ( 1024 * 1024 ) ).toFixed(2) + " MB";
                    upLoaded = [...upLoaded, toUpload[i]];

                    currentUpploadsCount--;
                    if (currentUpploadsCount == 0) {
                        uploading = false;
                        clearInput();
                    }
                }
                // console.log(loaded);
                // console.log(toUpload[i].progress);
            })
            xhr.send(formData);

        }
    }

    function getSharedFilesList(){

        fetch( shared_endpoint, {
            method: 'GET'
        }).then(res => {
            return res.json();
        }).then(res => {
            // console.log(res);
            if( res.list && res.list.length > 0 ){
                sharedFiles = res.list;
            }
        }).catch(e => {
            console.log(e);
        })
    }

    function downlaodAllFiles(){
        sharedFiles.forEach( file => {
            downlaodFile(file.name);
        });
    }

    function downlaodFile(fileName){

        fetch( shared_endpoint_download + '/'+fileName, {
            method: 'GET'
        }).then(res => {
            return res.blob();
        }).then( b => {
            // var file = window.URL.createObjectURL(blob);
            // window.location.assign(file);
             var a = document.createElement("a");
            a.href = URL.createObjectURL(b);
            a.setAttribute("download", fileName);
            a.click();
        }).catch(e => {
            console.log(e);
        });
    }

    function clearInput() {
        toUpload = [];
        selectedFiles = [];
        dragOverActive = false;
        console.log("clear input");
    }

    function addFilesToSelection(e){
        e.preventDefault();
        // console.log(e);
        // console.log(e.dataTransfer.files);
        selectedFiles = e.dataTransfer.files;
    }
</script>

<div class="main_container">
    

    <div class="main_wrapper">

        <div class="macro_area macro_area__upload { selectedTab == 'upload' ? 'show_area':'hide_area' }">
            <h2 class="area_title">Upload Area</h2>
            
            <div class="area_content">
                <div class="form-upload" class:form-upload__active="{dragOverActive}">
                    <div 
                        class="form-upload__overlay" 
                        on:click="{ (event) => browseFiles(event) }" 
                        on:dragover|preventDefault="{ (e) => dragOverActive = true }" 
                        on:dragleave|preventDefault="{ (e) => dragOverActive = false }" 
                        on:drop|preventDefault="{ (e) => addFilesToSelection(e) }">
                    </div>
                    <form on:submit={(event) => event.preventDefault()}>
                        <div class="upload_area">
                            <i class="fa fa-cloud-upload" aria-hidden="true"></i>
                            <p>
                                Drag & Drop to uplaod files <br>
                                OR <br>
                                Clik to Browse files
                            </p>
                            <input
                                class="default_input"
                                type="file"
                                name="selectedFiles"
                                id="selectedFiles"
                                multiple
                                bind:files="{selectedFiles}"
                            />
                        </div>
                    </form>
                </div>
                <div class="text-center">
                    <button class="btn-upload" class:disabled="{uploading}" disabled="{uploading}"
                        on:click={() => uploadSelectedFiles()}>
                            Upload &nbsp;
                            <i class="fa fa-upload" aria-hidden="true"></i>
                    </button>
                </div>


                <section class="upload_buffer">
                    {#each toUpload as uf }
                        {#if uf.status == PENDING}
                        <div class="card">
                            <div class="card__icon">
                                <i class="fa fa-file" aria-hidden="true"></i>
                            </div>
                            <div class="card__content">
                                <p class="title">{uf.file_name} </p>

                                <div class="progress-area">
                                    <div class="progress-bar">
                                        <div class="progress" style="width: {uf.progress}%;"></div>
                                    </div>
                                </div>
                            </div>
                            <div class="card__status">
                                <span class="percent">{uf.progress}%</span>
                            </div>
                        </div>
                        {/if}
                    {/each}
                    <!-- <div class="card">
                        <div class="card__icon">
                            <i class="fa fa-file" aria-hidden="true"></i>
                        </div>
                        <div class="card__content">
                            <p class="title">Test.png</p>
                            <div class="progress-bar">
                                <div class="progress"></div>
                            </div>
                        </div>
                        <div class="card__status">
                            <span class="percent">34%</span>
                        </div>
                    </div> -->
                </section>

                {#if toUpload.length > 0 }
                    <hr>
                {/if}

                <section class="uploaded_list">
                
                    {#each upLoaded as uf }
                        <div class="card">
                            <div class="card__icon">
                                <i class="fa fa-file" aria-hidden="true"></i>
                            </div>
                            <div class="card__content">
                                <p class="title">{uf.file_name}</p>
                                <div class="meta">
                                    <span class="size">{uf.size}</span>
                                </div>
                            </div>
                            <div class="card__status text-success">
                                <i class="fa fa-check" aria-hidden="true"></i>
                            </div>
                        </div>
                    {/each}
                    <!-- <div class="card">
                        <div class="card__icon">
                            <i class="fa fa-file" aria-hidden="true"></i>
                        </div>
                        <div class="card__content">
                            <p class="title">Test.png</p>
                            <div class="meta">
                                <span class="size">70 KB</span>
                            </div>
                        </div>
                        <div class="card__status text-success">
                            <i class="fa fa-check" aria-hidden="true"></i>
                        </div>
                    </div> -->
                </section>
            </div>

        </div>

        <div class="macro_area macro_area__download { selectedTab == 'download' ? 'show_area':'hide_area' }">
            <h2 class="area_title">Download Area <span on:click="{ () => downlaodAllFiles() }"><i class="fa fa-download" aria-hidden="true"></i></span></h2>
            <div class="area_content">
                 {#each sharedFiles as uf }
                    <div class="card">
                        <div class="card__icon">
                            <i class="fa fa-file" aria-hidden="true"></i>
                        </div>
                        <div class="card__content">
                            <p class="title">{uf.name}</p>
                            <div class="meta">
                                <span class="size">{uf.size_formated}</span>
                            </div>
                        </div>
                        <div class="card__status c__pointer" on:click="{ () => downlaodFile(uf.name) }" >
                            <i class="fa fa-download" aria-hidden="true"></i>
                        </div>
                    </div>
                {/each}
            </div>
        </div>

        <div class="macro_area macro_area__cplipboard { selectedTab == 'clipboard' ? 'show_area':'hide_area' }">
            <h2 class="area_title">Clipboard</h2>
            <div class="area_content">
                <textarea name="clip" rows="10" class="clipboard_input" bind:value="{clipboard_data}" placeholder="Paste or Write your text here"></textarea>
                <button class="btn-clearclipboard" on:click="{ () => clipboard_data = '' }">clear clipboard</button>
            </div>
        </div>

    </div>

    <div class="nav_bar">
        <div on:click="{ () => setactiveTab('upload') }" class:active="{selectedTab == 'upload'}" class="nav_item"><i class="fa fa-cloud-upload" aria-hidden="true"></i></div>
        <div on:click="{ () => setactiveTab('download') }" class:active="{selectedTab == 'download'}" class="nav_item"><i class="fa fa-cloud-download" aria-hidden="true"></i></div>
        <div on:click="{ () => setactiveTab('clipboard') }" class:active="{selectedTab == 'clipboard'}" class="nav_item"><i class="fa fa-clipboard" aria-hidden="true"></i></div>
    </div>

</div>

<style>
    .main_container {
        width: 100%;
        min-height: 100%;
        display: flex;
        justify-content: flex-start;
        align-items: center;
        flex-direction: column;
        background: #fefefe;

    }
    .main_wrapper {
        padding: 0;
        flex-grow: 1;
        min-width: 350px;
        max-width: 600px;
        width: 100%;
        position: relative;
    }

    .macro_area {
        /* background: #f5f5f5; */
        padding: .5rem 1rem;
        /* width: 100%; */
        margin-bottom: 2rem;
        border-radius: 15px;

    }
    .macro_area.show_area {
        display: block;
        opacity: 1;
        transition: all ease-in-out .5s
    }
    .macro_area.hide_area {
        display: none;
        opacity: 0;
        transition: all ease-in-out .5s
    }

    .area_title {
        border-bottom: 2px solid #38369A;
        color: #38369A;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .area_content {
        padding: 0 .25rem;
        padding-bottom: 5rem;
    }

    .form-upload {
        border: 1px dashed #38369A;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 1rem 0rem;
        text-align: center;
        border-radius: 5px;
        margin-bottom: 1rem;
        cursor: pointer;
        color: #38369a;
        position: relative;
    }
    .form-upload__active {
        border: 1px solid #38369A;
        background: #E5E5F5;
    }

    .form-upload .form-upload__overlay {
        width: 100%;
        height: 100%;
        background: transparent !important;
        position: absolute;
        top:0;
        left:0;
    }

    .btn-upload {
        display: inline-block;
        padding: .5rem 0;
        width: 150px;
        text-align: center;
        font-size: 20px;
        background: #2e9937;
        color:#E5E5F5;
        border: 0px;
        border-radius: 10px;
        cursor: pointer;
    }

    .btn-upload.disabled {
        background: #6c996f;
    }

    .form-upload .default_input {
        display: none;

    }

    .form-upload i {
        font-size: 30px;
    }

    .upload_buffer {
        margin-top: 1rem;
    }

    .uploaded_list {
        margin-top: 1rem;
        /* max-height: 50vh; */
        overflow: auto;
    }

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
        width: 50px;
        text-align: center;
        font-size: 22px
    }
    .card .card__content {
        flex-grow: 1;
    }

    .card .card__content .title {
        margin: .25rem 0 .5rem 0;
    }

    .card .card__status {
        width: 50px;
        text-align: center;
    }

    .progress-area .progress-bar {
        height: 6px;
        width: 80%;
        background: #fff;
        margin-bottom: 4px;
        border-radius: 30px;
        overflow: hidden;
    }

    .progress-bar .progress {
        height: 100%;
        /* width: 50%; */
        background: #38369a;
        
    }

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

    .nav_bar {
        position: fixed;
        bottom: 0;
        display: flex;
        justify-content: space-around;
        align-items: stretch;
        width: 100%;
        min-width: 350px;
        max-width: 600px;
        z-index: 100;
    }
    .nav_item {
        padding: 1.5rem .25rem;
        background: #000000;
        color: #EFE7DA;
        flex-grow: 1;
        text-align: center;
        cursor: pointer;
    }
    .nav_item.active {
        background: #38369A;
    }

    .text-center {
        text-align: center !important;
    }

    .text-success {
        color: #2e9937;
    }

    .c__pointer {
        cursor: pointer;
    }
</style>
