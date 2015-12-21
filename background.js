chrome.app.runtime.onLaunched.addListener(function() {
    chrome.app.window.create('index.html', {
        'id': "indexWindow",
        'outerBounds': {
            'width': 400,
            'height': 500
        }
    });
});

chrome.runtime.onSuspend.addListener(function() {
    // TODO: save data (settings)
    // https://developer.chrome.com/apps/storage#property-sync
});