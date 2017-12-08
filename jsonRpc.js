var jsonRpc = (function (undefined) {
    function isFunction(obj) {
        return Object.prototype.toString.call(obj) === '[object Function]';
    }
    function isArrary(obj) {
        return Object.prototype.toString.call(obj) === '[object Array]';
    }

    function aryMap(ary, fn) {
        var res = [];
        for (var i = 0, len = ary.length; i < len; i++) {
            res[i] = fn(ary[i], i, ary);
        }
        return res;
    }
    var regBlank = /\s+/g;
    var regParams = /^function[^\()]*\(([^\)]*)/
    var regParamsName = /^[^=]+/;
    function getFunParamsName(fn) {
        var str = fn.toString().replace(regBlank, '');
        var m = str.match(regParams);
        if (m[1] === '') {
            return [];
        }
        return aryMap(m[1].split(','), function (str) {
            return str.match(regParamsName)[0];
        });
    }
    var ERROR_MAP = {
        'Invalid_Request': {
            "code": -32600,
            "message": "Invalid Request"
        },
        'Method_not_found': {
            "code": -32601,
            "message": "Method not found"
        },
        'Parse_Error': {
            "code": -32700,
            "message": "Parse error"
        }
    };
    var command = (function () {
        var map = {};
        var paramsMap = {};
        var syncMap = {};
        var getParamsFromObj = function (method, params) {
            return aryMap(paramsMap[method], function (key) {
                return params[key];
            })
        }
        return {
            exec: function (method, params, success, fail) {
                var res;
                if (!map[method])
                    return fail(ERROR_MAP.Method_not_found);
                jsonRpc.running = {
                    success: success,
                    fail: fail
                }
                if (isArrary(params)) {
                    res = map[method].apply(null, params);
                } else {
                    res = map[method].apply(null, getParamsFromObj(method, params));
                }
                if (res && res.then) {
                    res.then(success, function (m) {
                        fail({
                            "code": -32001,
                            "message": m
                        })
                    })
                } else if (res !== undefined) {
                    success(res)
                } else if (syncMap[method]) {
                    success(res)
                }
            },
            remove: function (method) {
                syncMap[method] = paramsMap[method] = map[method] = null;
            },
            add: function (method, fun, isSync) {
                if (isSync === true) {
                    syncMap[method] = true;
                }
                map[method] = fun;
                paramsMap[method] = getFunParamsName(fun);
            }
        }
    })();

    var noop = function () {};
    var _cbMap = {};
    var id = 1;
    var _getId = function () {
        return id++;
    };

    return {
        _send: function (obj, mess) {
            this._onMessage(JSON.stringify(obj));
        },
        _onMessage: function (str) {
            this.onMessage(JSON.parse(str));
        },
        onCall: function (mess) {

        },
        onResult: function (mess) {
            
        },
        fail: function (res, mess) {
            this.sendMessage({error: res}, mess);
        },
        success: function (res, mess) {
            this.sendMessage({result: res}, mess);
        },
        result: function (mess, isError) {
            var _ck = _cbMap[mess.id];
            if (_ck) {
                if (!isError) {
                    _ck(mess.result);
                }
                _cbMap[mess.id] = null;
            }
        },
        onMessage: function (mess) {
            if (mess.jsonrpc !== "2.0")
                return this.fail(ERROR_MAP.Invalid_Request, mess);
            if (mess.method) {
                mess.params = mess.params || [];
                if (this.onCall(mess) === false) {
                    return
                }
                if (mess.id) {
                    command.exec(mess.method, mess.params, function (res) {
                        jsonRpc.success(res, mess);
                    }, function (res) {
                        jsonRpc.fail(res, mess);
                    })
                } else {
                    command.exec(mess.method, mess.params, noop, noop);
                }
            } else {
                if (this.onResult(mess) !== false) {
                    this.result(mess, !!mess.error);
                }
            }
        },
        exec: function (method, params, callback) {
            if (params === undefined && callback === undefined) {
                callback = false;
            } else if (callback === undefined) {
                if (isFunction(params)) {
                    callback = params;
                    params = undefined;
                } else {
                    callback = false;
                }
            }
            var obj = {method: method, params: params};
            if (callback) {
                obj.id = _getId();
                _cbMap[obj.id] = callback;
            }
            this.sendMessage(obj);
        },
        sendMessage: function (obj, mess) {
            obj.jsonrpc = '2.0';
            if (mess && mess.id) {
                obj.id = mess.id;
            }      
            this._send(obj, mess);
        },
        addCommand: command.add,
        removeCommand: command.remove
    };
})();