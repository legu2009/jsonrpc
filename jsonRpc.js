var JsonRpc = (function (undefined) {
    var toString = Object.prototype.toString;
    function isFunction(obj) {
        return toString.call(obj) === '[object Function]';
    }
    function isArrary(obj) {
        return toString.call(obj) === '[object Array]';
    }
    function isObject(obj) {
        return toString.call(obj) === '[object Object]';
    }
    function aryMap(ary, fn) {
        var res = [];
        for (var i = 0, len = ary.length; i < len; i++) {
            res[i] = fn(ary[i], i, ary);
        }
        return res;
    }
    var noop = function () {};
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

    function getCommand() {
        var map = {};
        var paramsMap = {};
        var syncMap = {};
        var alwaysMap = {};
        var getParamsFromObj = function (method, params) {
            return aryMap(paramsMap[method], function (key) {
                return params[key];
            })
        }
        return {
            exec: function (method, params, success, fail, mess) {
                var res;
                if (!map[method])
                    return fail(ERROR_MAP.Method_not_found);
                if (alwaysMap[method]) {
                    mess._always = 1;
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
                } else if (syncMap[method]) {//同步方法，undefined也返回
                    success(res)
                }
            },
            remove: function (method) {
                alwaysMap[method] = syncMap[method] = paramsMap[method] = map[method] = null;
            },
            add: function (method, fun, opt) {
                if (opt) {
                    if (opt.sync === true) {
                        syncMap[method] = true;
                    }
                    if (opt.always === true) {
                        alwaysMap[method] = true;
                    }
                }
                map[method] = fun;
                paramsMap[method] = getFunParamsName(fun);
            }
        }
    }

    var id = 1;
    var getId = function () {
        return id++;
    };

    return function (useUUID) {
        var command = getCommand();
        var cbMap = {};
        var alwaysMap = {};
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
                var ck = cbMap[mess.id];
                if (ck) {
                    if (!isError) {
                        ck(mess.result);
                    }
                    if (!mess._always && !alwaysMap[mess.id]) {
                        cbMap[mess.id] = null;
                    }
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
                    if (mess.id) {//需要回调
                        var self = this;
                        JsonRpc.running = {
                            success: function (res) {
                                self.success(res, mess);
                            },
                            fail: function (res) {
                                self.fail(res, mess);
                            }
                        }
                    } else {
                        JsonRpc.running = {
                            success: noop,
                            fail: noop
                        }
                    }
                    command.exec(mess.method, mess.params, JsonRpc.running.success, JsonRpc.running.fail, mess);
                } else {
                    if (this.onResult(mess) !== false) {
                        this.result(mess, !!mess.error);
                    }
                }
            },
            exec: function (extend, method, params, callback) {
                if (!isObject(extend)) {
                    callback = params;
                    params = method;
                    method = extend;
                    extend = {};
                }
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
                for (var key in extend) {
                    if (key !== 'always') {
                        obj[key] = extend[key];
                    }
                }
                if (callback) {
                    obj.id = getId();
                    cbMap[obj.id] = callback;
                    if (extend.always) {
                        alwaysMap[obj.id] = 1;
                    }
                }
                this.sendMessage(obj);
            },
            sendMessage: function (obj, mess) {
                obj.jsonrpc = '2.0';
                if (mess) {
                    if (mess.id) {
                        obj.id = mess.id;
                    }
                    if (mess._always) {
                        obj._always = mess._always;
                    }
                }    
                this._send(obj, mess);
            },
            addCommand: command.add,
            removeCommand: command.remove
        }
    }
})();

exports.JsonRpc = JsonRpc;