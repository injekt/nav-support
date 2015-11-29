(function() {

  //constants
  var MSG_TYPE_REQ = 1;
  var MSG_TYPE_RES = 2;

  var STATUS_LOAD_START = 0;
  var STATUS_LOAD_FINISH = 1;
  var STATUS_LOAD_ERROR = -1;

  //req callbacks
  var ReqIdGen = 0;
  var callbacks = {};

  //global error handler
  var preloadingIds = {};

  var processingGo = false;

  var isFirstRun = true;

  var drawerId;

  var logger = {
    LEVEL: {
      INFO: 0,
      WARNING: 1
    },
    level: 1,
    i: function(msg) {
      console.log(msg);
    },
    w: function(msg) {
      if (this.level > this.LEVEL.INFO) {
        alert(msg);
      }
      else {
        this.i(msg);
      }
    }
  };

  if (!window.onerror) {
    window.onerror = function (msg, url, line, column, errObj) {
      logger.w('Oops!\n' + msg + '\nhappened at ' + url + ' [line ' + line + ', column ' + column + ']')
    };
  }


  document.addEventListener('runtimeready', function() {
    if (dd) dd.on = document.addEventListener;
  });

  var errorHandler =  function(err) {
    logger.w('[nav error] ' + JSON.stringify(err));
  };

  var invokeHandler = function(data, cb) {
    logger.i('[nav invoke] ' + JSON.stringify(data));
  }

  var initNav = function(p) {
    checkEnv();

    if (p) {
      if (p.onError && 'function' === p.onError) errorHandler = p.onError;
      if (p.onInvoke && 'function' === p.onInvoke) invokeHandler = p.onInvoke;
    }

    var resumeHandler = function(event) {
      var once = true;
      dd.runtime.message.fetch({
        onSuccess: function(data) {
          //alert('messages: ' + JSON.stringify(data));
          if (data && data.length > 0) {
            data.forEach(function(message) {
              if (message.content) {
                var msgType = message.content._type;
                if (!once && (msgType === MSG_TYPE_REQ || msgType === MSG_TYPE_RES)) {
                  logger.w('Warning: more than one REQ or RES message are post to this frame: ' +
                      JSON.stringify(message.content));
                  return;
                }
                if (MSG_TYPE_REQ === msgType) {
                  once = false;
                  var reqId = message.content._reqId;
                  var handle = invokeHandler;
                  var _h = message.content._handler;
                  if (_h && 'string' === typeof _h && window[_h]) handle = window[_h];

                  handle(message.content._value, function(response) {
                    dd.runtime.message.post({
                      to: [message.from],
                      content: {
                        _type: MSG_TYPE_RES,
                        _reqId: reqId,
                        _value: response
                      },
                      onSuccess: function() {

                      },
                      onFail: function(err) {
                        errorHandler(err);
                      }
                    });
                  });
                }
                else if (MSG_TYPE_RES === msgType) {
                  once = false;
                  var reqId = message.content._reqId;
                  if (reqId !== undefined && callbacks[reqId]) {
                    var callback = callbacks[reqId];
                    delete callbacks[reqId];
                    if (typeof callback === 'function') {
                      callback(message.content._value);
                    }
                  }
                }
              }
            });
          }
        },
        onFail: function(err) {
          console.log('resume handler fetching messages: ' +
              JSON.stringify(err));
        }
      });
    };

    /*for first run*/
    resumeHandler();

    dd.on('resume', resumeHandler);
  };

  var preload = function(p) {
    checkEnv();
    if (!p) throw 'parameter for preload() is missing';
    if (!p.pages) throw 'pages is missing';
    if (!(p.pages instanceof Array)) throw 'invalid pages: not an array';
    var ids = [];
    p.pages.forEach(function(page) {
      if (page.id && 'string' === typeof page.id) ids.push(page.id);
    });

    ids.forEach(function(id) {
      var cnt = preloadingIds[p.id];
      preloadingIds[id] = cnt !== undefined ? ++cnt : 0;
      if (cnt > 1) {
        logger.w('Warning: preload id[' + id + '] too frequently');
      }
    });

    var flag = true;

    dd.ui.nav.preload({
      pages: p.pages,
      onSuccess: function(data) {
        if (flag && data && data.id && data.status === STATUS_LOAD_START) {
          flag = false;
          var cnt = preloadingIds[p.id];
          if (cnt > 0) preloadingIds[p.id] = cnt - 1;
        }
        if (p.onSuccess) p.onSuccess(data);
      },
      onFail: function(err) {
        ids.forEach(function(id) {
          var cnt = preloadingIds[p.id];
          if (cnt > 0) preloadingIds[p.id] = cnt - 1;
        });
        if (p.onFail) p.onFail(err);
      }
    });
  };

  var go = function(p) {
    checkEnv();

    if (processingGo) {
      throw 'calling go() for id['+ p.id +'] at ' + location.href + ' too frequently';
    }
    processingGo = true;

    if (!p) throw 'parameter for go() is missing';
    if (!p.id) throw 'id is missing';
    if (p.handler && typeof p.handler !== 'string') throw 'handler is supposed to be a string';

    var id = p.id;
    var params = p.params || {};
    var handler = p.handler;
    var win = p.onSuccess;
    var fail = function(err) {
      processingGo = false;
      var f = p.onFail ? p.onFail : errorHandler;
      f(err);
    };

    var reqId = ReqIdGen++;
    if (callbacks[reqId]) throw 'fatal: reqId[' + reqId + '] is existed';
    callbacks[reqId] = win;

    var args = {
      id: id,
      onSuccess: function() {
        processingGo = false;
      },
      onFail: fail
    };
    if (p.anim !== undefined) args.anim = p.anim;

    var postMessageAndGo = function() {
      dd.runtime.message.post({
        to: [id],
        content: {
          _type: MSG_TYPE_REQ,
          _reqId: reqId,
          _handler: handler,
          _value: params
        },
        onSuccess: function() {
          dd.ui.nav.go(args);
        },
        onFail: fail
      });
    }

    if (p.createIfNeeded) {
      if (!p.url || typeof p.url !== 'string') throw 'url of go() is missing or invalid';

      var flag = true;

      preload({
        pages: [{
          id: id,
          url: p.url
        }],
        onSuccess: function(data) {
          if (flag && data && data.id === id && data.status === STATUS_LOAD_START) {
            flag = false;
            /*black magic*/
            setTimeout(postMessageAndGo, 0);
          }
        },
        onFail: fail
      });
    }
    else {
      postMessageAndGo();
    }
  };

  /**
   * @param p
   * {
   *  id: 'id',
   *  params: {},
   *  handler: 'fn',
   *  onSuccess: function(res) {},
   *  onFail: function(err) {}
   * }
   */
  var call = function(p) {
    checkEnv();

    if (!p) throw 'parameter for call() is missing';
    if (!p.id) throw 'id is missing';
    if (p.handler && typeof p.handler !== 'string') throw 'handler is supposed to be a string';

    var id = p.id;
    var params = p.params || {};
    var handler = p.handler;
    var win = p.onSuccess;
    var fail = function(err) {
      var f = p.onFail ? p.onFail : errorHandler;
      f(err);
    };

    var reqId = ReqIdGen++;
    if (callbacks[reqId]) throw 'fatal: reqId[' + reqId + '] is existed';
    callbacks[reqId] = win;

    dd.runtime.message.post({
      to: [id],
      content: {
        _type: MSG_TYPE_REQ,
        _reqId: reqId,
        _handler: handler,
        _value: params
      },
      onSuccess: function() {
        logger.i('call id[' + id + '] with params [' + JSON.stringify(params) + ']');
      },
      onFail: fail
    });
  };


  var initDrawer = function(p) {
    if (!p) throw 'parameter for init() is missing';
    if (!p.id) throw 'id is missing';

    drawerId = p.id;
    dd.ui.drawer.init(p);
  };


  /**
   * @param p
   * {
   *  params: {},
   *  handler: 'fn',
   *  onSuccess: function(res) {},
   *  onFail: function(err) {}
   * }
   */
  var openDrawer = function(p) {
    checkEnv();

    if (!drawerId) throw 'drawer id is undefined. Has drawer been initialized?';
    if (!p) p = {};
    p.id = drawerId;

    call(p);

    dd.ui.drawer.open({
      onSuccess: function() {},
      onFail: p.onFail ? p.onFail : errorHandler
    });
  };


  function checkEnv() {
  	if (!window.nuva) throw 'dd is not ready';
  }


  if (dd.support) throw 'dd.support is already defined';

  dd.support = {};

  dd.support.logger = logger;

  dd.support.call = call;

  dd.support.nav = {
    init: initNav,
    preload: preload,
    go: go,
    recycle: dd.ui.nav.recycle,
    close: dd.ui.nav.close,
    getCurrentId: dd.ui.nav.getCurrentId
  };

  dd.support.drawer = {
    init: initDrawer,
    config: dd.ui.drawer.config,
    enable: dd.ui.drawer.enable,
    disable: dd.ui.drawer.disable,
    open: openDrawer,
    close: dd.ui.drawer.close,
  };
}) ();