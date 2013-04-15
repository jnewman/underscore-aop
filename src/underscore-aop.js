/**
 * @license
 * Underscore-AOP 0.1.0
 *
 * Available under BSD3 license <https://github.com/jnewman/underscore-aop/blob/master/LICENSE.txt>
 */
(function (factory) {
    'use strict';
    var amd = typeof define === 'function' && define.amd;
    /** Detect free variable `exports` */
    var freeExports = typeof exports == 'object' && exports;

    /** Detect free variable `module` */
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
                underscoreLike = window._;
            }
        }

        if (typeof underscoreLike !== 'function')  {
            throw new TypeError('underscoreLike function not found.');
        }

        return underscoreLike;
    };

    var exported = null;
    if (amd) {
        define(function () {
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
    var nextId = 0;

    function advise (dispatcher, type, advice, receiveArguments) {
        var previous = dispatcher[type];
        var around = type == 'around';
        var signal;
        if (around) {
            var advised = advice(function () {
                return previous.advice(this, arguments);
            });
            signal = {
                remove: function () {
                    signal.cancelled = true;
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
                id: nextId++,
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
                    while (after && after.id < nextId) {
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
                dispatcher._unboundPointer = existing;
                dispatcher.target = target;
            }
            var results = advise((dispatcher || existing), type, advice, receiveArguments);
            advice = null;
            return results;
        };
    }

    aspect('before')(_, 'bind', function (func) {
        var args = _.toArray(arguments);
        var advisor = args[0] = function advisor () {
            var cache = advisor.cache = advisor.cache || {};
            var dispatcher = cache[func];
            if (!dispatcher) {
                dispatcher = cache[func] = _.find(this, function (value) {
                    return value._unboundPointer && value._unboundPointer === func;
                });
            }
            return (dispatcher || func).apply(this, arguments);
        };

        // Keep a reference to the original function, so we can find it later.
        advisor._unboundPointer = func._unboundPointer = func._unboundPointer || func;
        return args;
    });

    // Leave the API open to either apsect(type, )
    return _.extend(function (type) {
        return aspect(type).apply(this, arguments);
    }, {

        /**
         * @param {Object} target
         * @param {string} methodName
         * @param {Function.<Array|Arguments|undefined>} advice
         * @return {Object.<{remove: Function, advice: Function}>}
         */
        before: aspect('before'),

        /**
         * @param {Object} target
         * @param {string} methodName
         * @param {Function.<Array|Arguments|undefined>} advice
         * @return {Object.<{remove: Function, advice: Function}>}
         */
        around: aspect('around'),

        /**
         * @param {Object} target
         * @param {string} methodName
         * @param {Function.<Function>} advice
         * @return {Object.<{remove: Function, advice: Function}>}
         */
        after: aspect('after')
    });
});
