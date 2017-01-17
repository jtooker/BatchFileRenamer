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
    var m_fileSelectDiv = document.querySelector("#fileButtonDiv");
    var m_selectAllButton = document.querySelector("#selectAllButton");
    var m_selectNoneButton = document.querySelector("#selectNoneButton");
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
    var m_previewDiv = document.querySelector("#previewDiv");
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
    function createFileEntryDiv(fileInfo) {
        var checkbox;
        var fileNameLabel;
        var div;

        div = document.createElement("div");
        div.id = fileInfo.fileName + ".div";
        div.className = "fileEntry";

        checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = fileInfo.fileName + ".checkbox";
        checkbox.checked = fileInfo.checked;
        checkbox.addEventListener("click", function () {
            // delay as the event has not finished
            setTimeout(function () {
                m_model.toggleSelection(fileInfo.fileName);
            });
        });

        fileNameLabel = document.createElement("label");
        fileNameLabel.htmlFor = checkbox.id;
        fileNameLabel.appendChild(document.createTextNode(fileInfo.fileName));

        div.appendChild(checkbox);
        div.appendChild(fileNameLabel);
        return div;
    }

    // private -----------------------------------------------------------------
    function populateInputFilesArea(fileInfo) {
        m_filePathInput.value = fileInfo.directoryPath;

        m_fileListDiv.innerHTML = "";
        fileInfo.files.forEach(function (fileInfo) {
            var div = createFileEntryDiv(fileInfo);
            m_fileListDiv.appendChild(div);
        });

        m_fileSelectDiv.style.display = fileInfo.files.length > 0
            ? "block"
            : "none";
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
    function calculatePreviewRowStyle(fileInfo) {
        function calculateColor() {
            if (fileInfo.error !== undefined) {
                return "red";
            }
            if (fileInfo.oldName === fileInfo.newName) {
                return "gray";
            }
        }
        var color = calculateColor();

        return color === undefined
            ? ""
            : " style=\"color: " + color + "\"";
    }

    // private -----------------------------------------------------------------
    function populatePreviewArea(previewData) {
        var rowStyle = "";
        var rowTitle = "";
        var showRenameButton = true;
        var html = "<table>";

        previewData.forEach(function (fileInfo) {
            showRenameButton = showRenameButton && fileInfo.error === undefined;
            rowStyle = calculatePreviewRowStyle(fileInfo); // TODO: replace by css class
            rowTitle = fileInfo.error === undefined
                ? ""
                : " title=\"" + fileInfo.error + "\"";

            html += "<tr" + rowStyle + rowTitle + "><td>";
            html += fileInfo.oldName;
            html += "</td><td>";
            html += fileInfo.newName;
            html += "</td></tr>";
        });

        html += "</table>";

        m_previewDiv.innerHTML = html;

        showRenameButton = showRenameButton && previewData.length > 0;
        m_renameButton.disabled = !showRenameButton;
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
    function selectAll() {
        m_model.setSelection(true);
    }

    // private -----------------------------------------------------------------
    function selectNone() {
        m_model.setSelection(false);
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

        m_selectAllButton.addEventListener("click", selectAll);
        m_selectNoneButton.addEventListener("click", selectNone);

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