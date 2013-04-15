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

    describe('underscore-aop', function () {
        var subject = null;

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
                }
            });

            subject = new Subject();
        });

        afterEach(function () {
            subject = null;
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
        it.skip('does not crash when aspecting the same method many times', function () {
            // NOTE: chromium tends to overflow at ~10000, so massively exceeding.
            var NUM_ASPECTS = 20000;

            assert.equal(subject.sum(1, 1), 2);
            var afterSum = function (total) {
                return total + 1;
            };

            var handles = [];
            var i = 0;

            while (i++ < NUM_ASPECTS) {
                //noinspection JSHint
                handles.push(aop.after(subject, 'sum', afterSum));
            }

            assert.equal(subject.sum(1, 1), 2 + ITERS);
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
    });
});
