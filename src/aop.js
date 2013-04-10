/*global _:true,window:true*/
//noinspection JSCheckFunctionSignatures
(function (define, undef) {
    'use strict';

    var id = 0;
    define(function () {
        var nextId = 0;

        function advise (dispatcher, type, advice, receiveArguments) {
            var previous = dispatcher[type];
            var around = type == "around";
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
                            advised.apply(target, args);	// called the advised function
                    }
                };
            } else {
                // create the remove handler
                signal = {
                    remove: function () {
                        if (this.advice) {
                            // remove the advice to signal that this signal has been removed
                            this.advice = null;
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
                        }
                    },
                    id: nextId++,
                    advice: advice,
                    receiveArguments: receiveArguments
                };
            }
            if (previous && !around) {
                if (type == "after") {
                    // add the listener to the end of the list
                    // note that we had to change this loop a little bit to workaround a bizarre IE10 JIT bug
                    while (previous.next && (previous = previous.next)) {
                    }
                    previous.next = signal;
                    signal.previous = previous;
                } else if (type == "before") {
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

        function aspect (type) {
            return function (target, methodName, advice, receiveArguments) {
                var existing = target[methodName], dispatcher;
                if (!existing || existing.target != target) {
                    // no dispatcher in place
                    target[methodName] = dispatcher = function () {
                        var executionId = nextId;
                        // before advice
                        var args = arguments;
                        var before = dispatcher.before;
                        while (before) {
                            args = before.advice.apply(this, args) || args;
                            before = before.next;
                        }
                        // around advice
                        if (dispatcher.around) {
                            var results = dispatcher.around.advice(this, args);
                        }
                        // after advice
                        var after = dispatcher.after;
                        while (after && after.id < executionId) {
                            if (after.receiveArguments) {
                                var newResults = after.advice.apply(this, args);
                                // change the return value only if a new value was returned
                                results = newResults === undefined ? results : newResults;
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
                    dispatcher.target = target;
                }
                var results = advise((dispatcher || existing), type, advice, receiveArguments);
                advice = null;
                return results;
            };
        }

        var after = aspect("after");
        var before = aspect("before");
        var around = aspect("around");

        return {
            before: before,
            around: around,
            after: after
        };
    });


// Use AMD if possible, else set a global if in a browser.
})(typeof define === 'function' ? define : function (factory) {
        return typeof window !== 'undefined' ? window.aop = factory() : this.aop = factory();
});
