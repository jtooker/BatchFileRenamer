/// @file
/// @author John Tooker
/// @license MIT, see `LICENSE.txt`
///
/// The 'view' (and 'controller') of this app

/*global model, chrome, console*/

(function () {
    "use strict";

    // HTML elements
    var m_chooseDirectoryButton = document.querySelector('#chooseDirectoryButton');
    var m_filePathInput = document.querySelector('#filePathInput');
    var m_fileListDiv = document.querySelector('#fileListDiv');
    var m_extFilterTextInput = document.querySelector('#extFilter');
    var m_prefixTextInput = document.querySelector('#prefix');
    var m_postfixTextInput = document.querySelector('#postfix');
    var m_findTextInput = document.querySelector('#find');
    var m_replaceTextInput = document.querySelector('#replace');
    var m_previewDiv = document.querySelector('#previewDiv');
    var m_renameButton = document.querySelector('#renameButton');

    var m_model;

    // private -----------------------------------------------------------------
    function reportError(errorMessage) {
        var loadingP = document.querySelector('#optionsLoadingP');
        loadingP.innerHTML = errorMessage;
    }

    // private -----------------------------------------------------------------
    function populateLoading() {
        var loadingP = document.querySelector('#optionsLoadingP');
        if (loadingP && !m_model.areLoading()) {
            loadingP.parentElement.removeChild(loadingP);
        }
    }

    // private -----------------------------------------------------------------
    function createFileEntryDiv(fileInfo) {
        var checkbox;
        var fileNameLabel;
        var div;

        div = document.createElement('div');
        div.id = fileInfo.fileName + '.div';
        div.className = 'fileEntry';

        checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = fileInfo.fileName + '.checkbox';
        checkbox.checked = fileInfo.checked;
        // no on click listener needed (yet?)
        fileNameLabel = document.createElement('label');
        fileNameLabel.htmlFor = checkbox.id;
        fileNameLabel.appendChild(document.createTextNode(fileInfo.fileName));

        div.appendChild(checkbox);
        div.appendChild(fileNameLabel);
        return div;
    }

    // private -----------------------------------------------------------------
    function populateInputFilesArea(fileInfo) {
        m_filePathInput.value = fileInfo.directoryPath;

        m_fileListDiv.innerHTML = '';
        fileInfo.files.forEach(function (fileInfo) {
            var div = createFileEntryDiv(fileInfo);
            m_fileListDiv.appendChild(div);
        });
    }

    // private -----------------------------------------------------------------
    function populateOptionsArea(options) {
        if (!options) {
            return;
        }
        m_extFilterTextInput.value = options.extFilter;
        m_prefixTextInput.value = options.prefix;
        m_postfixTextInput.value = options.postfix;
        if (options.findAndReplaces.length > 0) {
            m_findTextInput.value = options.findAndReplaces[0].find;
            m_replaceTextInput.value = options.findAndReplaces[0].replace;
        }
    }

    // private -----------------------------------------------------------------
    function populatePreviewArea(previewData) {
        var html = '<table>';

        previewData.forEach(function (fileInfo) {
            html += '<tr><td>';
            html += fileInfo.oldName;
            html += '</td><td>';
            html += fileInfo.newName;
            html += '</td></tr>';
        });

        html += '</table>';

        m_previewDiv.innerHTML = html;
    }

    // private -----------------------------------------------------------------
    function refresh(what) {
        if (what && what.errorMessage) {
            reportError(what.errorMessage);
            return;
        }

        populateLoading();

        if (!what || what.inputFiles) {
            populateInputFilesArea(m_model.getFileInfo());
        }
        if (!what || what.options) {
            populateOptionsArea(m_model.getOptions());
        }
        if (!what || what.preview) {
            populatePreviewArea(m_model.getPreview());
        }
    }


    /*

    // private -----------------------------------------------------------------
    function updateFileEntriesWidget() {
        fileListDiv.innerHTML = '';
        console.log("Entered `updateFileEntriesWidget`");

        m_fileInfos.forEach(function (fileInfo) {
            var div = createFileEntryDiv(fileInfo);
            fileListDiv.appendChild(div);
        });
    }

    // private -----------------------------------------------------------------
    function isFileTypeEnabled(fileName) {
        var found = false;

        if (m_extFilter.length === 0) {
            return true;
        }

        m_extFilter.forEach(function (ext) {
            found = found || fileName.endsWith("." + ext);
        });

        return found;
    }

    // private -----------------------------------------------------------------
    function createFileInfo(fileEntry) {
        return {'fileEntry': fileEntry,
                'fileName': fileEntry.name,
                'newName': fileEntry.name,
                'fullPath': fileEntry.fullPath,
                'enabled': isFileTypeEnabled(fileEntry.name)};
    }

    // private -----------------------------------------------------------------
    function loadDirectory(directoryEntry) {
        var directoryReader;

        if (!directoryEntry.isDirectory) {
            return;
        }

        m_directoryEntry = directoryEntry;
        filePathInput.value = m_directoryEntry.fullPath;

        m_fileInfos = [];
        directoryReader = directoryEntry.createReader();
        function readEntries() {
            directoryReader.readEntries(
                function (results) {
                    if (!results.length) {
                        updateFileEntriesWidget();
                        return;
                    }

                    results.forEach(function (fileEntry) {
                        if (fileEntry.isFile) {
                            m_fileInfos.push(createFileInfo(fileEntry));
                        }
                    });
                    readEntries();
                },
                function (error) {
                    console.error(error);
                }
            );
        }
        readEntries();
    }

    // private -----------------------------------------------------------------
    function setExtensionFilter(filterText) {
        m_extFilter = [];

        filterText = filterText.trim();

        if (filterText === "" || filterText === "*.*") {
            return;
        }

        m_extFilter = filterText.split(',');
        m_extFilter.forEach(function (value, i) {
            value = value.trim();
            value = value.replace("*.", "");
            m_extFilter[i] = value;
        });
    }

    // private -----------------------------------------------------------------
    function populateFindAndReplace() {
        var json = m_settings.findReplace;
        m_findAndReplaces = JSON.parse(json || '[{"find": "", "replace": ""}]');

        findTextInput.value = m_findAndReplaces[0].find;
        replaceTextInput.value = m_findAndReplaces[0].replace;
    }
    */

    // private -----------------------------------------------------------------
    function storeFindReplace() {
        m_model.setFindReplace({
            find: m_findTextInput.value,
            replace: m_replaceTextInput.value
        });
    }

    // private -----------------------------------------------------------------
    function setWidgetListeners() {
        m_chooseDirectoryButton.addEventListener('click', function () {
            chrome.fileSystem.chooseEntry(
                {type: 'openDirectory'},
                function (entry) {
                    if (chrome.runtime.lastError) {
                        console.log(chrome.runtime.lastError.message);
                        return;
                    }

                    m_model.setDirectory(entry);
                }
            );
        });

        m_extFilterTextInput.onchange = function () {
            m_model.setExtensionFilter(m_extFilterTextInput.value);
        };

        m_prefixTextInput.onchange = function () {
            m_model.setPrefix(m_prefixTextInput.value);
        };

        m_postfixTextInput.onchange = function () {
            m_model.setPostfix(m_postfixTextInput.value);
        };

        m_findTextInput.onchange = storeFindReplace;
        m_replaceTextInput.onchange = storeFindReplace;
        m_renameButton.onclick = m_model.executeRename;
    }
    /*

    // private -----------------------------------------------------------------
    function calculateName(name) {
        var parts;

        m_findAndReplaces.forEach(function (fr) {
            name = name.replace(fr.find, fr.replace);
        });

        name = m_settings.prefix + name;
        if (m_settings.postfix) {
            parts = name.split('.');
            parts[parts.length - 2] += m_settings.postfix;
            name = parts.join('.');
        }

        return name;
    }

    // private -----------------------------------------------------------------
    function calculateNames() {
        m_fileInfos.forEach(function (fileInfo) {
            if (fileInfo.enabled) {
                fileInfo.newName = calculateName(fileInfo.fileName);
            }
        });
    }

    // private -----------------------------------------------------------------
    function populatePreviewDiv() {
        var html = '<table>';

        m_fileInfos.forEach(function (fileInfo) {
            if (fileInfo.enabled) {
                html += '<tr><td>';
                html += fileInfo.fileName;
                html += '</td><td>';
                html += fileInfo.newName;
                html += '</td></tr>';
            }
        });

        html += '</table>';

        previewDiv.innerHTML = html;
    }

    // private -----------------------------------------------------------------
    function preview() {
        calculateNames();
        populatePreviewDiv();

        previewDiv.style.display = 'block';
        renameDiv.style.display = 'block';
    }

    // private -----------------------------------------------------------------
    function onRenameFailure(fileError) {
        console.log(
            "ERROR: Could not rename: " +
            (fileError.message || fileError.name)
        );
    }

    // private -----------------------------------------------------------------
    function executeRename() {
        m_fileInfos.forEach(function (fileInfo) {
            if (fileInfo.enabled && fileInfo.fileName !== fileInfo.newName) {
                fileInfo.fileEntry.moveTo(
                    m_directoryEntry,
                    fileInfo.newName,
                    undefined,
                    onRenameFailure
                );
            }
        });
    }

    // private -----------------------------------------------------------------
    function populateOptions() {
        var loadingP = document.querySelector('#optionsLoadingP');

        console.log("Entered `populateOptions`");

        if (chrome.runtime.lastError) {
            loadingP.innerHTML = chrome.runtime.lastError.message;
            return;
        }

        setWidgetListeners();

        extFilterTextInput.value = m_settings.extFilter || "*.*";
        setExtensionFilter(extFilterTextInput.value);

        prefixTextInput.value = m_settings.prefix || "";
        postfixTextInput.value = m_settings.postfix || "";

        populateFindAndReplace();

        loadingP.parentElement.removeChild(loadingP);
        updateFileEntriesWidget();

        previewButton.onclick = preview;
        renameButton.onclick = executeRename;
    }

    ////////////////////////////////////////////////////////////////////////////
    // Start of code that is executed upon inclusion
    ////////////////////////////////////////////////////////////////////////////

    */

    m_model = model(refresh);
    refresh();
    setWidgetListeners();
}());