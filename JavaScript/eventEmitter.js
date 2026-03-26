"use strict";

const EventEmitter = (() => {
    const _listeners = {};

    return {
        on(event, callback) {
            if (!_listeners[event]) _listeners[event] = [];
            _listeners[event].push(callback);
        },

        emit(event, data) {
            (_listeners[event] || []).forEach(cb => cb(data));
        },
    };
})();