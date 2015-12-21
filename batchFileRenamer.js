/// @file
/// @author John Tooker
/// @license MIT, see `LICENSE.txt`
///
/// The 'model' of this app

(function () {
    "use strict";

    // HTML elements
    var chooseDirectoryButton = document.querySelector('#chooseDirectoryButton');
    var filePathInput = document.querySelector('#filePathInput');
    var fileListDiv = document.querySelector('#fileListDiv');
    var extFilterTextInput = document.querySelector('#extFilter');
    var prefixTextInput = document.querySelector('#prefix');
    var postfixTextInput = document.querySelector('#postfix');
    var findTextInput = document.querySelector('#find');
    var replaceTextInput = document.querySelector('#replace');
    var previewButton = document.querySelector('#previewButton');
    var previewDiv = document.querySelector('#previewDiv');
    var renameDiv = document.querySelector('#renameDiv');
    var renameButton = document.querySelector('#renameButton');

    // State
    var m_directoryEntry;
    var m_fileInfos = [];
    var m_extFilter = [];   /// [] means all are valid, else whitelist
    var m_findAndReplaces = [];
    var m_settings;

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
        checkbox.checked = fileInfo.enabled;
        // no on click listener needed (yet?)
        fileNameLabel = document.createElement('label');
        fileNameLabel.htmlFor = checkbox.id;
        fileNameLabel.appendChild(document.createTextNode(fileInfo.fileName));

        div.appendChild(checkbox);
        div.appendChild(fileNameLabel);
        return div;
    }

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
    function storeFindReplace() {
        m_findAndReplaces = [{
            find: findTextInput.value,
            replace: replaceTextInput.value
        }];
        m_settings.findReplace = JSON.stringify(m_findAndReplaces);
    }

    // private -----------------------------------------------------------------
    function populateFindAndReplace() {
        var json = m_settings.findReplace;
        m_findAndReplaces = JSON.parse(json || '[{"find": "", "replace": ""}]');

        findTextInput.value = m_findAndReplaces[0].find;
        replaceTextInput.value = m_findAndReplaces[0].replace;
    }

    // private -----------------------------------------------------------------
    function setWidgetListeners() {
        extFilterTextInput.onchange = function () {
            m_settings.extFilter = extFilterTextInput.value;
            setExtensionFilter(m_settings.extFilter);

            updateFileEntriesWidget();
        };

        prefixTextInput.onchange = function () {
            m_settings.prefix = prefixTextInput.value;
        };

        postfixTextInput.onchange = function () {
            m_settings.postfix = postfixTextInput.value;
        };

        findTextInput.onchange = storeFindReplace;
        replaceTextInput.onchange = storeFindReplace;
    }

    // private -----------------------------------------------------------------
    function calculateName(name) {
        var parts;

        m_findAndReplaces.forEach(function (fr) {
            name = name.replace(fr.find, fr.replace);
        });

        name = m_settings.prefix + name;
        if (m_settings.postfix) {
            parts = name.split('.');
            parts.splice(parts.length - 1, 0, m_settings.postfix);
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

    chooseDirectoryButton.addEventListener('click', function () {
        chrome.fileSystem.chooseEntry(
            {type: 'openDirectory'},
            function (entry) {
                if (chrome.runtime.lastError) {
                    console.log(chrome.runtime.lastError.message);
                    return;
                }

                if (!entry) {
                    return;
                }

                // use local storage to retain access to this file
                chrome.storage.local.set({'directory': chrome.fileSystem.retainEntry(entry)});
                loadDirectory(entry);
            }
        );
    });

    m_settings = settings(populateOptions);

}());