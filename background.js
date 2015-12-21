chrome.app.runtime.onLaunched.addListener(function () {
    chrome.app.window.create('index.html', {
        'id': "indexWindow",
        'outerBounds': {
            'width': 400,
            'height': 500
        }
    });
});