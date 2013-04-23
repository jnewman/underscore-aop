define([
    'mocha', 'chai',
    'lodash',
    'underscore-aop'
], function (
    mocha, chai,
    _,
    aop
) {
    'use strict';
    var assert = chai.assert;
    var ASPECT_ITERATIONS = 100;
    // NOTE: chromium tends to overflow at ~10000, so exceed, but not so much that the test
    // takes forever..
    var LARGER_THAN_STACK = 12000;

    describe('underscore-aop', function () {
        var subject = null;
        var descendant = null;

        beforeEach(function () {
            function Subject (props) {
                _.extend(this, props);
                this._cid = Subject.prototype._cidCounter++;
            }

            _.extend(Subject.prototype, {
                idAttr: 'id',
                _cidCounter: 0,
                getId: function () {
                    var realId = this[this.idAttr];
                    return !_.isUndefined(realId) ? realId : this._cid;
                },
                setId: function (id) {
                    this[this.idAttr] = id;
                    return this;
                },
                /**
                 *
                 * @param {number...} number
                 * @returns {number}
                 */
                sum: function (number) {
                    //noinspection JSValidateTypes
                    return _.reduce(arguments, function (total, current) {
                        return total + Number(current);
                    }, 0);
                },

                other: function () {}
            });

            subject = new Subject();

            function Descendant () {}
            Descendant.prototype = new Subject();
            descendant = new Descendant();
        });

        afterEach(function () {
            subject = null;
            descendant = null;
        });

        it('can wrap a method', function () {
            subject.setId(99);
            assert.equal(subject.getId(), 99);

            var handle = aop.around(subject, 'getId', function (orig) {
                return function () {
                    return 42 + orig.call(this);
                };
            });

            assert.equal(subject.getId(), 141);
            handle.remove();
            assert.equal(subject.getId(), 99);
        });

        it('can inject functionality before a method is executed', function () {
            assert.equal(subject.sum(1, 1), 2);
            var handle = aop.before(subject, 'sum', function (number) {
                var args = _.toArray(arguments);
                args[0]++;
                return args;
            });

            assert.equal(subject.sum(1, 1), 3);
            handle.remove();
            assert.equal(subject.sum(1, 1), 2);
        });

        it('can inject functionality after a method is executed', function () {
            assert.equal(subject.sum(1, 1), 2);
            var handle = aop.after(subject, 'sum', function (total) {
                return total + 1;
            });

            assert.equal(subject.sum(1, 1), 3);
            handle.remove();
            assert.equal(subject.sum(1, 1), 2);
        });

        // Around is exempt from this.
        // TODO: See if I can get this test to run in a reasonable amount of time.
        it('does not crash when aspecting the same method many times', function () {
            assert.equal(subject.sum(1, 1), 2);
            var afterSum = function (total) {
                return total + 1;
            };

            var handles = [];
            var i = 0;

            while (i++ < LARGER_THAN_STACK) {
                //noinspection JSHint
                handles.push(aop.after(subject, 'sum', afterSum));
            }

            assert.equal(subject.sum(1, 1), 2 + LARGER_THAN_STACK);
            _.invoke(handles, 'remove');
            assert.equal(subject.sum(1, 1), 2);
        });

        it('aspects a bound method', function () {
            var getId = _.bind(subject.getId, subject);
            assert.equal(subject.getId(), 0);

            var handle = aop.after(subject, 'getId', function (id) {
                return id + 1;
            });

            assert.equal(getId(), 1);
            handle.remove();
            assert.equal(getId(), 0);
        });

        it('reliably looks up a method in the cache', function () {
            var getId = _.bind(subject.getId, subject);

            var assertAspectIncrements = function (shouldBe) {
                aop.after(subject, 'getId', function (id) {
                    return id + 1;
                });
                assert.equal(getId(), shouldBe);
            };

            var i = 0;
            while (i < ASPECT_ITERATIONS) {
                // Initial should be 1, since 0 + 1.
                assertAspectIncrements(++i);
            }
        });

        it('finds methods in the cache even if they\'re bound many times', function () {
            // Initial bind, just cause.
            var getId = _.bind(subject.getId, subject);

            var assertBindThenAspectIncrements = function (shouldBe) {
                getId = _.bind(subject.getId, subject);
                aop.after(subject, 'getId', function (id) {
                    return id + 1;
                });
                assert.equal(getId(), shouldBe);
            };

            var i = 0;
            while (i < ASPECT_ITERATIONS) {
                assertBindThenAspectIncrements(++i);
            }
        });

        it('doesn\'t care if the method is inherited', function () {
            var getId = _.bind(descendant.getId, descendant);
            var assertBindThenAspectIncrements = function (shouldBe) {
                getId = _.bind(descendant.getId, descendant);
                aop.after(descendant, 'getId', function (id) {
                    return id + 1;
                });

                assert.equal(getId(), shouldBe);
            };

            // IDs start one higher for the descendant.
            var i = 1;
            while (i < (ASPECT_ITERATIONS + 1)) {
                assertBindThenAspectIncrements(++i);
            }
        });

        it('cleans up after itself', function () {
            var i = 0,
                originalSize = _.size(aop._dispatchers),
                aopMethod = '',
                genMethod = '',
                handle = null,
                noopA = function () {},
                noopB = function () {};

            while (i++ < ASPECT_ITERATIONS) {
                descendant[(genMethod = 'other' + String(i))] = noopB;
                aopMethod = i % 3 === 0 ? 'after' : i % 2 === 0 ? 'before' : 'around';
                handle = aop[aopMethod](descendant, genMethod, noopA);
                handle.remove();
                delete noopB._uaopId;
            }

            assert.equal(_.size(aop._dispatchers), originalSize);
        });
    });
});
