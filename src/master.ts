"use strict";

import TaskHandler from './taskHandler';
import {DataHelper, Message, Server} from './socket';
import {NOREMOTECLIENT, REMOTEFUNCISNOTDEFINE, NOREMOTECLIENTAVAIL, CALLTIMEOUT} from './error'

/**
 * rpc framework master part
 * @author: lizhekang
 */
class Master extends TaskHandler {
    private _server;
    private _cbMap;
    private _timer;
    private _name;
    private _baseCounter;

    /**
     * Master constructor
     * @param object obj with functions
     * @param config Master config
     */
    public constructor(object, config: config) {
        super(object, config);

        this._cbMap = {};
        this._baseCounter = new Number(100000, 5);  //max call deep
        this._name = config.name;
    }

    public init() {
        let cfg = this._config;

        this._timer = setInterval(this._checkCbMap.bind(this), 1000);  //every second.

        this._server = new Server(cfg.server);
        this._server.start();
        this._server.on('rpc', this._rpc.bind(this));
    }

    /**
     * core call function
     * @param {string} name
     * @param {Array<any>} params
     * @returns {Promise}
     */
    public call(name: string, params: Array<any>, cb: Function, errCb: Function): void {
        if (typeof this._object[name] != 'function') {
            let res = new Result(REMOTEFUNCISNOTDEFINE.result, REMOTEFUNCISNOTDEFINE.msg);
            errCb(res.getResult());

            return;
        }

        let map = this._getValCbMap();
        let keys = Object.keys(map);

        if (keys.length > 0) {
            let index = Math.floor(Math.random() * keys.length);
            let key = keys[index];
            let client = map[keys[index]];  //choose socket client

            let rpcMsg = new Message('rpc', 0, {
                name: name,
                params: params,
                callback: this._register(name, key, cb, errCb)  //register random cb function
            });

            client.write(DataHelper.getString(rpcMsg.getMessage()));
        } else {
            let map = this._server.getClientMap();
            let keys = Object.keys(map);
            let res;

            if (keys.length > 0) {
                res = new Result(NOREMOTECLIENTAVAIL.result, NOREMOTECLIENTAVAIL.msg);
            } else {
                res = new Result(NOREMOTECLIENT.result, NOREMOTECLIENT.msg);
            }
            errCb(res.getResult());
        }
    }

    private _rpc(msg) {
        let data: rpcResp = msg.data;

        if (this._cbMap[data.callback] && typeof this._cbMap[data.callback].cb == 'function') {
            this._cbMap[data.callback].cb(data.result);

            delete this._cbMap[data.callback];
        }
    }

    /**
     * register the callback function
     * @param {string} name
     * @param {Function} callback
     * @private
     */
    private _register(name: string, clientKey: string, cb: Function, errCb: Function) {
        let number = this._baseCounter.getNext();
        let timeStamp = Date.now();
        let cbName = name + '_' + number;

        this._cbMap[cbName] = {
            timeStamp: timeStamp,
            clientKey: clientKey,
            cb: cb,
            errCb: errCb
        };

        return cbName;
    }

    /**
     * check the queue and remove callbacks
     * @private
     */
    private _checkCbMap() {
        let keys = Object.keys(this._cbMap);
        let timeStamp = new Date().getTime();
        let timeout = this._config.timeout || 10 * 1000;    //default timeout 10 sec

        for (let i in keys) {
            let key = keys[i];
            let info = this._cbMap[key];

            if (timeStamp - info.timeStamp >= timeout) {
                let res = new Result(CALLTIMEOUT.result, CALLTIMEOUT.msg);

                info.errCb(res.getResult());
                delete this._cbMap[key];
            }
        }

    }

    private _getValCbMap() {
        let keys = Object.keys(this._cbMap);
        let occupy = {};
        let res = {};
        let map = this._server.getClientMap();

        for (let i in keys) {
            let key = keys[i];
            let info = this._cbMap[key];
            if (info) {
                occupy[info.clientKey] = true;
            }
        }

        for (let key in map) {
            if (!occupy[key]) {
                res[key] = map[key];
            }
        }

        return res;
    }

    public destroy() {
        this._server && this._server.destroy();
        this._timer && clearInterval(this._timer);
    }
}

class Result {
    private _result: number;
    private _msg: string;
    private _data: any;

    constructor(result, msg, data = {}) {
        this._result = result;
        this._msg = msg;
        this._data = data;
    }

    getResult() {
        let res: result = {
            result: this._result,
            msg: this._msg,
            data: this._data
        };

        return JSON.parse(JSON.stringify(res));
    }

    set result(result) {
        this._result = result;
    }

    set msg(msg) {
        this._msg = msg;
    }

    set data(data) {
        this._data = data;
    }
}

class Number {
    private _max;
    private _base;
    private _len;

    public constructor(max, len) {
        this._max = max;
        this._base = 0;
        this._len = len;
    }

    public getNext() {
        let result = Math.floor((++this._base) % this._max);

        return this._pad(result, this._len);
    }

    private _pad(num, n) {
        return Array(n > num ? (n - ('' + num).length + 1) : 0).join('0') + num;
    }
}

export default Master;