// expect(myFunc).to.emit.from(obj);
// expect(myFunc).to.emit.from(obj, 'event', value);
// expect(myFunc).to.emit('event', value).from(obj);
// expect(myFunc).to.emit.from(obj, 'event').an.instanceof(TypeError);
// expect(myFunc).to.emit.an.instanceof(TypeError).from(obj, 'event');
export function chaiEE (chai, utils) {
  const Assertion = chai.Assertion;

  const propertyNames = Object.getOwnPropertyNames(Assertion.prototype);

  const propertyDescs = {};
  propertyNames.forEach(function (name) {
    propertyDescs[name] =
      Object.getOwnPropertyDescriptor(Assertion.prototype, name);
  });

  const methodNames = propertyNames.filter(function (name) {
    return name !== 'assert' && typeof propertyDescs[name].value === 'function';
  });

  Assertion.addChainableMethod('emit', assertEmit, chainEmit);

  methodNames.forEach(function (methodName) {
    Assertion.overwriteMethod(methodName, function (originalMethod) {
      return function (...args) {
        enqueueMethod(originalMethod, this, ...args);
      };
    });
  });

  function enqueueMethod (asserter, assertion, ...args) {
    if (!utils.flag(assertion, 'ee.emit')) {
      return asserter.call(assertion, ...args);
    }
    if (utils.flag(assertion, 'ee.emitted')) {
      const result = utils.flag(assertion, 'ee.result');
      const newAssertion = new Assertion(result);
      utils.transferFlags(assertion, newAssertion, false);
      return asserter.call(newAssertion, ...args);
    }
    utils.flag(assertion, 'ee.queue')
      .push(asserter.bind(assertion, ...args));
  }

  function assertFrom (eventEmitter, eventName, ...eventValues) {
    new Assertion(utils.flag(
      'ee.emit'), 'Assertion missing "emit" chainable property').to.be.true;
    new Assertion(this._obj).to.be.a('function');
    new Assertion(eventEmitter).to.respondTo('once');

    eventEmitter.once(eventName, (...args) => {
      utils.flag(this, 'ee.emitted', true);
      utils.flag(this, 'ee.result', args);
    });

    this._obj();

    new Assertion(utils.flag(this, 'ee.emitted')).to.be.true;

    utils.flag(this, 'ee.queue').forEach(doAssertion => doAssertion());
  }

  function assertEmit (eventName, ...eventValues) {
    new Assertion(this._obj).to.be.a('function');
    utils.flag(this, 'ee.eventName', eventName);
    utils.flag(this, 'ee.eventValues', eventValues);
    utils.flag(this, 'ee.emit', true);
    utils.flag(this, 'ee.queue', []);
  }

  function chainEmit () {
    new Assertion(this._obj).to.be.a('function');
    utils.flag(this, 'ee.emit', true);
    utils.flag(this, 'ee.queue', []);
  }

  Assertion.addMethod('from', assertFrom);
}

