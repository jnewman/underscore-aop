/**
 * @license
 * Underscore-AOP
 *
 * Available under BSD3 license <https://github.com/jnewman/underscore-aop/blob/master/LICENSE.txt>
 */
//noinspection ThisExpressionReferencesGlobalObjectJS
(function (factory, global) {
    'use strict';
    var amd = typeof define === 'function' && define.amd;

    // Determine if we're running server side.
    var freeExports = typeof exports == 'object' && exports;
    var freeModule = typeof module == 'object' && module && module.exports == freeExports && module;

    var findUnderscoreLike = function () {
        var underscoreLike;
        try {
            underscoreLike = require('underscore');
        }
        catch (e) {
            try {
                underscoreLike = require('lodash');
            } catch (e) {
                underscoreLike = global._;
            }
        }

        if (typeof underscoreLike !== 'function')  {
            throw new TypeError('underscoreLike function not found.');
        }

        return underscoreLike;
    };

    var exported = null;
    if (amd) {
        define(['underscore'], function () {
            return factory(findUnderscoreLike());
        });
    }
    else if (freeExports && !freeExports.nodeType) {
        exported = factory(findUnderscoreLike());
        // in Node.js or RingoJS v0.8.0+
        if (freeModule) {
            (freeModule.exports = exported).aop = exported;
        }
        // in Narwhal or RingoJS v0.7.0-
        else {
            freeExports.aop = exported;
        }
    }
    else {
        var _ = findUnderscoreLike();
        _.aop = factory(_);
    }
})(function (_) {
    'use strict';

    var slice = Array.prototype.slice;
    var dispatchers = {};
    var dispatcherId = 0;
    var advisorId = 0;

    function advise (dispatcher, type, advice, receiveArguments) {
        var previous = dispatcher[type];
        var around = type === 'around';
        var signal;
        if (around) {
            var advised = advice(function () {
                return previous.advice(this, arguments);
            });
            signal = {
                remove: function () {
                    signal.cancelled = true;
                    // Keep the cache clean
                    delete dispatchers[dispatcher._uaopId];
                },
                advice: function (target, args) {
                    return signal.cancelled ?
                        previous.advice(target, args) : // cancelled, skip to next one
                        advised.apply(target, args);    // called the advised function
                }
            };
        } else {
            // create the remove handler
            signal = {
                remove: function () {
                    var previous = signal.previous;
                    var next = signal.next;
                    if (!next && !previous) {
                        delete dispatcher[type];
                        // Keep the cache clean
                        delete dispatchers[dispatcher._uaopId];
                    } else {
                        if (previous) {
                            previous.next = next;
                        } else {
                            dispatcher[type] = next;
                        }
                        if (next) {
                            next.previous = previous;
                        }
                    }
                },
                id: advisorId++,
                advice: advice,
                receiveArguments: receiveArguments
            };
        }
        if (previous && !around) {
            if (type === 'after') {
                // add the listener to the end of the list
                // note that we had to change this loop a little bit to workaround a bizarre IE10
                // JIT bug

                while (previous.next && (previous = previous.next)) {}
                previous.next = signal;
                signal.previous = previous;
            } else if (type === 'before') {
                // add to beginning
                dispatcher[type] = signal;
                signal.next = previous;
                previous.previous = signal;
            }
        } else {
            // around or first one just replaces
            dispatcher[type] = signal;
        }
        return signal;
    }

    function aspect(type) {
        return function (target, methodName, advice, receiveArguments) {
            var existing = target[methodName], dispatcher;
            if (!existing || existing.target !== target) {
                // no dispatcher in place
                target[methodName] = dispatcher = function () {
                    // before advice
                    var args = arguments;
                    var before = dispatcher.before;
                    while (before) {
                        args = before.advice.apply(this, args) || args;
                        before = before.next;
                    }
                    var results;
                    // around advice
                    if (dispatcher.around) {
                        results = dispatcher.around.advice(this, args);
                    }
                    // after advice
                    var after = dispatcher.after;
                    var newResults;
                    while (after && after.id < advisorId) {
                        if (after.receiveArguments) {
                            newResults = after.advice.apply(this, args);
                            // change the return value only if a new value was returned
                            results = newResults === void 0 ? results : newResults;
                        } else {
                            results = after.advice.call(this, results, args);
                        }
                        after = after.next;
                    }
                    return results;
                };
                if (existing) {
                    dispatcher.around = {advice: function (target, args) {
                        return existing.apply(target, args);
                    }};
                }
                // Tag the disatcher as a reference.
                dispatcher._uaopId = existing._uaopId ?
                    existing._uaopId :
                    existing._uaopId = dispatcherId++;
                if (dispatcher._uaopId) {
                    dispatchers[dispatcher._uaopId] = dispatcher;
                }
                dispatcher.target = target;
            }
            var results = advise((dispatcher || existing), type, advice, receiveArguments);
            advice = null;
            return results;
        };
    }

    var bindHandles = [];
    var wrapBind = function (lib) {
        // Wrap _.bind, so we can find the right method later.
        var handle = aspect('before')(lib, 'bind', function (func) {
            var args = slice.call(arguments, 0);
            var id = func._uaopId;
            if (!id) {
                id = func._uaopId = dispatcherId++;
            }

            var advisor = args[0] = function advisor () {
                return (dispatchers[id] || func).apply(this, arguments);
            };

            // Keep a reference to the original function, so we can find it later.
            advisor._uaopId = id;
            return args;
        });
        bindHandles.push(handle);
        return handle;
    };

    /**
     * @param {string} type E.g., before.
     * @param {...} args Depends on type. See methods below.
     * @returnss {Object.<{remove: Function, advice: Function}>}
     */
    var unTypedAspect = function (type, args) {
        return aspect(type).apply(this, slice.call(arguments, 1));
    };

    var methods = {
        /**
         * @param {Object} target
         * @param {string} methodName
         * @param {Function.<Function>} advise
         * @returns {Object.<{remove: Function, advice: Function}>}
         */
        before: aspect('before'),

        /**
         * @param {Object} target
         * @param {string} methodName
         * @param {Function.<Function>} advise
         * @returns {Object.<{remove: Function, advice: Function}>}
         */
        around: aspect('around'),

        /**
         * @param {Object} target
         * @param {string} methodName
         * @param {Function.<Function>} advise
         * @returns {Object.<{remove: Function, advice: Function}>}
         */
        after: aspect('after'),

        /**
         * Wraps the bind method of another library. The lib must work like underscore and methods
         * cannot be bound by more than one lib, otherwise the stack gets lost.
         *
         * @param {Function} lib A library that works like underscore or lodash.
         * @returns {{remove: Function}} A remover in cas ethe library needs to be unwrapped.
         */
        wrapLib: function (lib) {
            return wrapBind(lib);
        },

        _dispatchers: dispatchers
    };

    // Save some cycles by only taking one src.
    var mixin = function (target, src) {
        for (var name in src) {
            if (src.hasOwnProperty(name)) {
                target[name] = src[name];
            }
        }
        return target;
    };

    return mixin(unTypedAspect, methods);
}, this);
