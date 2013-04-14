var chai = require('chai');
var assert = chai.assert;
var chaiAsPromised = require('chai-as-promised');
var _ = require('underscore');
var aop = require('../src/aop').aop;


chai.use(chaiAsPromised);

describe('Undescore AOP', function () {
    var tested = null;

    beforeEach(function () {
        function Tested (props) {
            _.extend(this, props);
            this._cid = Tested.prototype._cidCounter++;
        }

        _.extend(Tested.prototype, {
            idAttr: 'id',
            _cidCounter: 0,
            getId: function () {
                var realId = this[this.idAttr];
                return !_.isUndefined(realId) ? realId : this._cid;
            },
            setId: function (id) {
                this[this.idAttr] = id;
                return this;
            }
        });

        tested = new Tested();
    });

    it('Can wrap a single method.', function () {
        tested.setId(99);

        var handle = aop.around(tested, 'getId', function (orig) {
            return 42 + orig.call(this);
        });

        assert.equal(tested.getId(), 141);
        handle.remove();
        assert.equal(tested.getId(), 99);
    });
});
