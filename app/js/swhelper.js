function IndexController() {
    this._registerServiceWorker();
}

IndexController.prototype._registerServiceWorker = function () {
    if (!navigator.serviceWorker) return;

    var indexController = this;

    navigator.serviceWorker.register('sw.js').then(function (reg) {
        if (!navigator.serviceWorker.controller) {
            return;
        }

        if (reg.waiting) {
            indexController._updateReady(reg.waiting);
            return;
        }

        if (reg.installing) {
            indexController._trackInstalling(reg.installing);
            return;
        }

        reg.addEventListener('updatefound', function () {
            indexController._trackInstalling(reg.installing);
        });
    });

    // Ensure refresh is only called once.
    // This works around a bug in "force update on reload".
    var refreshing;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
        if (refreshing) return;
        window.location.reload();
        refreshing = true;
    });
    navigator.serviceWorker.addEventListener('message', event => {
        console.log(event.data.msg, event.data.url);
    });
};

IndexController.prototype._trackInstalling = function (worker) {
    var indexController = this;
    worker.addEventListener('statechange', function () {
        if (worker.state == 'installed') {
            indexController._updateReady(worker);
        }
    });
};

IndexController.prototype._updateReady = function (worker) {

    var toast = confirm("New version available, do you want to upate ?");

    if (toast != null) {
        worker.postMessage({
            action: 'skipWaiting'
        });
    }

};

//initialize sw
let swController = new IndexController();
