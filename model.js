/// @file
/// @author John Tooker
/// @license MIT, see `LICENSE.txt`
///
/// The "model" of this app

/*global chrome, console, settings*/

function model(callback) {
    "use strict";

    // State
    var m_loading = true;
    var m_directoryEntry;
    var m_fileInfos = [];
    var m_extFilter = [];   /// [] means all are valid, else whitelist
    var m_usePrefix = true;
    var m_usePostfix = true;
    var m_prefix = "";
    var m_postfix = "";
    var m_findAndReplaces = [];
    var m_settings;
    var m_onStaleData;      /// @see setOnRefresh

    // private -----------------------------------------------------------------
    function isFunction(f) {
        return typeof f === "function";
    }

    // private -----------------------------------------------------------------
    function calculateName(name) {
        var parts;

        m_findAndReplaces.forEach(function (fr) {
            name = name.replace(fr.find, fr.replace);
        });

        if (m_usePrefix) {
            name = m_prefix + name;
        }
        if (m_usePostfix && m_postfix) {
            parts = name.split(".");
            parts[parts.length - 2] += m_postfix;
            name = parts.join(".");
        }

        return name;
    }

    // private -----------------------------------------------------------------
    function incrementKey(object, key) {
        if (object[key] > 0) {
            object[key] += 1;
        } else {
            object[key] = 1;
        }
    }

    // private -----------------------------------------------------------------
    function calculateNames() {
        var usedNames = {};

        m_fileInfos.forEach(function (fileInfo) {
            fileInfo.newName = fileInfo.enabled
                ? calculateName(fileInfo.fileName)
                : fileInfo.fileName;

            if (fileInfo.fileName !== fileInfo.newName) {
                // otherwise it may be overwritten
                incrementKey(usedNames, fileInfo.fileName);
            }
            incrementKey(usedNames, fileInfo.newName);
        });

        m_fileInfos.forEach(function (fileInfo) {
            fileInfo.error = usedNames[fileInfo.newName] > 1
                ? "Another file has this name"
                : undefined;
        });
    }

    // private -----------------------------------------------------------------
    function refresh(staleParts) {
        calculateNames();

        if (isFunction(m_onStaleData)) {
            m_onStaleData(staleParts);
        }
    }

    // public ------------------------------------------------------------------
    function areLoading() {
        return m_loading;
    }

    // private -----------------------------------------------------------------
    function reportError(message) {
        refresh({errorMessage: message});
    }

    // private -----------------------------------------------------------------
    function getExtFilterString() {
        if (m_extFilter.length === 0) {
            return "*.*";
        }

        return "*." + m_extFilter.join(", *.");
    }

    // private -----------------------------------------------------------------
    function getDirectoryPath() {
        return (m_directoryEntry && m_directoryEntry.fullPath) || "";
    }

    // private -----------------------------------------------------------------
    function translateFileInfoForView() {
        var simpleInfos = [];

        m_fileInfos.forEach(function (fileInfo) {
            simpleInfos.push({
                checked: fileInfo.enabled,
                fileName: fileInfo.fileName
            });
        });

        return Object.freeze(simpleInfos);
    }

    // pubic -------------------------------------------------------------------
    function getFileInfo() {
        return Object.freeze({
            directoryPath: getDirectoryPath(),
            files: translateFileInfoForView()
        });
    }

    // pubic -------------------------------------------------------------------
    function getOptions() {
        return Object.freeze({
            extFilter: getExtFilterString(),
            usePrefix: m_usePrefix,
            prefix: m_prefix,
            usePostfix: m_usePostfix,
            postfix: m_postfix,
            findAndReplaces: m_findAndReplaces
        });
    }

    // pubic -------------------------------------------------------------------
    function getPreview() {
        var changes = [];

        m_fileInfos.forEach(function (fileInfo) {
            if (fileInfo.enabled) {
                changes.push({
                    oldName: fileInfo.fileName,
                    newName: fileInfo.newName,
                    error: fileInfo.error
                });
            }
        });

        return changes;
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
    function refilterFiles() {
        m_fileInfos.forEach(function (fileInfo) {
            fileInfo.enabled = isFileTypeEnabled(fileInfo.fileName);
        });
    }

    // private -----------------------------------------------------------------
    function createFileInfo(fileEntry) {
        return {"fileEntry": fileEntry,
                "fileName": fileEntry.name,
                "newName": fileEntry.name,
                "enabled": isFileTypeEnabled(fileEntry.name)};
    }

    // private -----------------------------------------------------------------
    function loadDirectory(directoryEntry) {
        var directoryReader;

        if (!directoryEntry.isDirectory) {
            return;
        }

        m_directoryEntry = directoryEntry;

        m_fileInfos = [];
        directoryReader = directoryEntry.createReader();
        function readEntries() {
            directoryReader.readEntries(
                function (results) {
                    if (!results.length) {
                        refresh();
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

        // refresh is done on the last `readEntries`
    }

    // pubic -------------------------------------------------------------------
    function setDirectory(entry) {
        if (!entry) {
            return;
        }

        // use local storage to retain access to this file
        chrome.storage.local.set({"directory": chrome.fileSystem.retainEntry(entry)});
        loadDirectory(entry);
    }

    ////////////////////////////////////////////////////////////////////////////

    // public ------------------------------------------------------------------
    function setExtensionFilter(filterText) {
        filterText = filterText || "";

        m_settings.extFilter = filterText;
        m_extFilter = [];

        filterText = filterText.trim();

        if (filterText === "" || filterText === "*.*") {
            return;
        }

        m_extFilter = filterText.split(",");
        m_extFilter.forEach(function (value, i) {
            value = value.trim();
            value = value.replace("*.", "");
            m_extFilter[i] = value;
        });

        refilterFiles();
        refresh();
    }

    // public ------------------------------------------------------------------
    function toggleUsePrefix() {
        m_usePrefix = !m_usePrefix;
        m_settings.usePrefix = m_usePrefix;
        refresh();
    }

    // public ------------------------------------------------------------------
    function toggleUsePostfix() {
        m_usePostfix = !m_usePostfix;
        m_settings.usePostfix = m_usePostfix;
        refresh();
    }

    // public ------------------------------------------------------------------
    function setPrefix(prefix) {
        m_settings.prefix = prefix;
        m_prefix = prefix;
        refresh();
    }

    // public ------------------------------------------------------------------
    function setPostfix(postfix) {
        m_settings.postfix = postfix;
        m_postfix = postfix;
        refresh();
    }

    // private -----------------------------------------------------------------
    function setFindReplace(pair) {
        // pair.find and pair.replace are strings
        m_findAndReplaces = [pair];
        m_settings.findReplace = JSON.stringify(m_findAndReplaces);
        refresh();
    }

    // public ------------------------------------------------------------------
    function executeRename() {
        m_fileInfos.forEach(function (fileInfo) {
            if (fileInfo.enabled && fileInfo.fileName !== fileInfo.newName &&
                    fileInfo.error === undefined) {
                fileInfo.fileEntry.moveTo(
                    m_directoryEntry,
                    fileInfo.newName,
                    function (fileEntry) {
                        fileInfo.enabled = false;
                        fileInfo.fileName = fileEntry.name;
                        fileInfo.fileEntry = fileEntry;
                        refresh();
                    },
                    function (fileError) {
                        fileInfo.error = fileError.message;
                        refresh();
                    }
                );
            } else {
                fileInfo.enabled = false;
            }
        });

        refresh();  // for the non-callback changes
    }

    // public ------------------------------------------------------------------
    function setSelection(selectAll) {
        m_fileInfos.forEach(function (fileInfo) {
            fileInfo.enabled = selectAll;
        });

        refresh();
    }

    // public ------------------------------------------------------------------
    function toggleSelection(filename) {
        m_fileInfos.forEach(function (fileInfo) {
            if (fileInfo.fileName === filename) {
                fileInfo.enabled = !fileInfo.enabled;
            }
        });

        refresh();
    }

    // private -----------------------------------------------------------------
    function populateState() {
        console.log("Entered `populateOptions`");

        if (chrome.runtime.lastError) {
            reportError(chrome.runtime.lastError.message);
            return;
        }

        setExtensionFilter(m_settings.extFilter);

        m_usePrefix = m_settings.usePrefix === undefined
            ? true
            : m_settings.usePrefix;
        m_usePostfix = m_settings.usePostfix === undefined
            ? true
            : m_settings.usePostfix;
        m_prefix = m_settings.prefix || "";
        m_postfix = m_settings.postfix || "";

        m_findAndReplaces = JSON.parse(m_settings.findReplace ||
                "[{\"find\": \"\", \"replace\": \"\"}]");

        m_loading = false;
        refresh();
    }

    ////////////////////////////////////////////////////////////////////////////
    // Start of code that is executed upon inclusion
    ////////////////////////////////////////////////////////////////////////////

    m_onStaleData = callback;
    m_settings = settings(populateState);

    return Object.freeze({
        areLoading: areLoading,
        getFileInfo: getFileInfo,
        getOptions: getOptions,
        getPreview: getPreview,
        setDirectory: setDirectory,
        setExtensionFilter: setExtensionFilter,
        toggleUsePrefix: toggleUsePrefix,
        toggleUsePostfix: toggleUsePostfix,
        setPrefix: setPrefix,
        setPostfix: setPostfix,
        setFindReplace: setFindReplace,
        executeRename: executeRename,
        setSelection: setSelection,
        toggleSelection: toggleSelection
    });
}