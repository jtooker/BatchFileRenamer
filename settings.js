/// @file
/// @author John Tooker
/// @license MIT, see `LICENSE.txt`
///
/// A synchronous interface to the chrome sync storage
///
/// Usage
/// -----
///     var sPersist;
///
///     function onLoad() {
///         console.log(sPersist.extFilter);
///     }
///     sPersist = settings(onLoad);
///
///     // later
///     sPersist.extFilter = "*.*";
///
/// For a list of supported settings, see `supported` in the code below.

/*global chrome, console*/

function settings(onLoad) {
    "use strict";

    var self = {};
    var supported = [
        "extFilter",
        "usePrefix",
        "usePostfix",
        "prefix",
        "postfix",
        "findReplace"
    ];
    var cache = {};

    function addSetting(settingName) {
        Object.defineProperty(self, settingName, {
            get: function () {
                return cache[settingName];
            },
            set: function (value) {
                var toStore = {};
                if (value === cache[settingName]) {
                    return;
                }

                toStore[settingName] = value;
                cache[settingName] = value;
                chrome.storage.sync.set(toStore, function () {
                    if (chrome.runtime.error) {
                        console.log(chrome.runtime.error);
                    } else {
                        console.log("Saved {" + settingName + ": " +
                                value + "}");
                    }
                });
            },
            enumerable: true,
            configurable: true
        });
    }

    function initializeCache(items) {
        cache = items;

        console.log(cache);

        if (onLoad) {
            onLoad();
        }
    }

    // TODO: listen for setting change events (and test on two machines
    // at the same time!)

    chrome.storage.sync.get(supported, initializeCache);
    supported.forEach(addSetting);
    return self;
}