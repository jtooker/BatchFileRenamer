/// @file
/// @author John Tooker
/// @license MIT, see `LICENSE.txt`
///
/// The "view" (and "controller") of this app

/*global model, chrome, console*/

(function () {
    "use strict";

    // HTML elements
    var m_chooseDirectoryButton = document.querySelector("#chooseDirectoryButton");
    var m_filePathInput = document.querySelector("#filePathInput");
    var m_fileListDiv = document.querySelector("#fileListDiv");
    var m_fileTable = document.querySelector("#fileTable");
    var m_masterCheckbox = document.querySelector("#masterCheckbox");
    var m_fileSelectDiv = document.querySelector("#fileButtonDiv");
    var m_extFilterTextInput = document.querySelector("#extFilter");
    var m_prefixCheckbox = document.querySelector("#prefixCheckbox");
    var m_prefixTextInput = document.querySelector("#prefix");
    var m_postfixCheckbox = document.querySelector("#postfixCheckbox");
    var m_postfixTextInput = document.querySelector("#postfix");
    var m_findTextInput = document.querySelector("#find");
    var m_replaceTextInput = document.querySelector("#replace");
    var m_caseComboBox = document.querySelector("#caseComboBox");
    var m_lowerExtCheckbox = document.querySelector("#lowerExtCheckbox");
    var m_upperExtCheckbox = document.querySelector("#upperExtCheckbox");
    var m_extensionToCheckbox = document.querySelector("#extensionToCheckbox");
    var m_extensionsToTextInput = document.querySelector("#extensionsToTextInput");
    var m_renameButton = document.querySelector("#renameButton");

    var m_model;

    // private -----------------------------------------------------------------
    function reportError(errorMessage) {
        var loadingP = document.querySelector("#optionsLoadingP");
        loadingP.innerHTML = errorMessage;
    }

    // private -----------------------------------------------------------------
    function populateLoading() {
        var loadingP = document.querySelector("#optionsLoadingP");
        if (loadingP && !m_model.areLoading()) {
            loadingP.parentElement.removeChild(loadingP);
        }
    }

    // private -----------------------------------------------------------------
    function calculatePreviewRowStyle(fileInfo) {
        function calculateColor() {
            if (fileInfo.error !== undefined) {
                return "red";
            }
            if (fileInfo.fileName === fileInfo.newName) {
                return "gray";
            }
        }
        var color = calculateColor();

        return color === undefined
            ? ""
            : "color: " + color;
    }

    // private -----------------------------------------------------------------
    function createFileEntryRow(fileInfo, row) {
        var cell;
        var checkbox;

        function toggleRow() {
            // delay as the event has not finished
            setTimeout(function () {
                m_model.toggleSelection(fileInfo.fileName);
            });
        }

        row.style = calculatePreviewRowStyle(fileInfo); // TODO: replace by css class
        row.title = fileInfo.error || "";

        checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = fileInfo.fileName + ".checkbox";
        checkbox.checked = fileInfo.checked;
        cell = row.insertCell();
        cell.appendChild(checkbox);

        cell = row.insertCell();
        cell.appendChild(document.createTextNode(fileInfo.fileName));

        cell = row.insertCell();
        cell.appendChild(document.createTextNode(fileInfo.newName));

        row.addEventListener("click", toggleRow);
    }

    // private -----------------------------------------------------------------
    function populateMasterCheckbox(fileInfos) {
        function isFileChecked(fileInfo) {
            return fileInfo.checked;
        }
        var allChecked = fileInfos.every(isFileChecked);
        var someChecked = fileInfos.some(isFileChecked);

        m_masterCheckbox.checked = allChecked;
        m_masterCheckbox.indeterminate = someChecked && !allChecked;
    }

    // private -----------------------------------------------------------------
    function populateFilesArea(fileState) {
        var displayStyle = fileState.files.length > 0
            ? "block"
            : "none";
        var showRenameButton = true;
        var renameCount = fileState.files.filter(function (fileInfo) {
            return fileInfo.checked && fileInfo.error === undefined;
        }).length > 0;
        var oldTBody = m_fileTable.getElementsByTagName("tbody")[0];
        var newTBody = document.createElement("tbody");
        var row;

        populateMasterCheckbox(fileState.files);

        m_filePathInput.value = fileState.directoryPath;

        fileState.files.forEach(function (fileInfo) {
            row = newTBody.insertRow();
            createFileEntryRow(fileInfo, row);
        });

        m_fileTable.replaceChild(newTBody, oldTBody);
        m_fileListDiv.style.display = displayStyle;
        m_fileSelectDiv.style.display = displayStyle;

        showRenameButton = showRenameButton &&
                fileState.files.every(function (fileInfo) {
            return fileInfo.error === undefined;
        });
        showRenameButton = showRenameButton &&
                fileState.files.some(function (fileInfo) {
            return fileInfo.fileName !== fileInfo.newName;
        });
        showRenameButton = showRenameButton && renameCount > 0;
        m_renameButton.disabled = !showRenameButton;
    }

    // private -----------------------------------------------------------------
    function populateOptionsArea(options) {
        if (!options) {
            return;
        }
        m_extFilterTextInput.value = options.extFilter;
        m_prefixCheckbox.checked = options.usePrefix;
        m_prefixTextInput.disabled = !options.usePrefix;
        m_prefixTextInput.value = options.prefix;
        m_postfixCheckbox.checked = options.usePostfix;
        m_postfixTextInput.disabled = !options.usePostfix;
        m_postfixTextInput.value = options.postfix;
        if (options.findAndReplaces.length > 0) {
            m_findTextInput.value = options.findAndReplaces[0].find;
            m_replaceTextInput.value = options.findAndReplaces[0].replace;
        }
        m_caseComboBox.value = options.changeCase;
        m_lowerExtCheckbox.checked = options.lowercaseExtensions;
        m_upperExtCheckbox.checked = options.uppercaseExtensions;
        m_extensionToCheckbox.checked = options.haveCustomExtensions;
        m_extensionsToTextInput.value = options.customExtension;
        m_extensionsToTextInput.disabled = !options.haveCustomExtensions;
    }

    // private -----------------------------------------------------------------
    function refresh(what) {
        if (what && what.errorMessage) {
            reportError(what.errorMessage);
            return;
        }

        populateLoading();

        if (!what || what.files) {
            populateFilesArea(m_model.getFileInfo());
        }
        if (!what || what.options) {
            populateOptionsArea(m_model.getOptions());
        }
    }

    // private -----------------------------------------------------------------
    function storeFindReplace() {
        m_model.setFindReplace({
            find: m_findTextInput.value,
            replace: m_replaceTextInput.value
        });
    }

    // private -----------------------------------------------------------------
    function storeExtensionOptions(a_event) {
        if (a_event.target === m_lowerExtCheckbox) {
            setTimeout(m_model.toggleLowerExtension);
        } else if (a_event.target === m_upperExtCheckbox) {
            setTimeout(m_model.toggleUpperExtension);
        } else if (a_event.target === m_extensionToCheckbox) {
            setTimeout(m_model.toggleCustomExtension);
        }
    }

    // private -----------------------------------------------------------------
    function toggleSelectAll() {
        m_model.setSelection(m_masterCheckbox.checked);
    }

    // private -----------------------------------------------------------------
    function setWidgetListeners() {
        m_chooseDirectoryButton.addEventListener("click", function () {
            chrome.fileSystem.chooseEntry(
                {type: "openDirectory"},
                function (entry) {
                    if (chrome.runtime.lastError) {
                        console.log(chrome.runtime.lastError.message);
                        return;
                    }

                    m_model.setDirectory(entry);
                }
            );
        });

        m_masterCheckbox.addEventListener("click", function () {
            // delay as the event has not finished
            setTimeout(toggleSelectAll);
        });

        m_extFilterTextInput.onchange = function () {
            m_model.setExtensionFilter(m_extFilterTextInput.value);
        };

        m_prefixCheckbox.addEventListener("click", function () {
            // delay as the event has not finished
            setTimeout(m_model.toggleUsePrefix);
        });
        m_prefixTextInput.onchange = function () {
            m_model.setPrefix(m_prefixTextInput.value);
        };

        m_postfixCheckbox.addEventListener("click", function () {
            // delay as the event has not finished
            setTimeout(m_model.toggleUsePostfix);
        });
        m_postfixTextInput.onchange = function () {
            m_model.setPostfix(m_postfixTextInput.value);
        };

        m_findTextInput.onchange = storeFindReplace;
        m_replaceTextInput.onchange = storeFindReplace;

        m_caseComboBox.onchange = function () {
            m_model.setChangeCase(m_caseComboBox.value);
        };

        m_lowerExtCheckbox.addEventListener("click", storeExtensionOptions);
        m_upperExtCheckbox.addEventListener("click", storeExtensionOptions);
        m_extensionToCheckbox.addEventListener("click", storeExtensionOptions);
        m_extensionsToTextInput.onchange = function () {
            setTimeout(function () {
                m_model.setExtensionToUse(m_extensionsToTextInput.value);
            });
        };

        m_renameButton.onclick = m_model.executeRename;
    }

    ////////////////////////////////////////////////////////////////////////////
    // Start of code that is executed upon inclusion
    ////////////////////////////////////////////////////////////////////////////

    m_model = model(refresh);
    refresh();
    setWidgetListeners();
}());