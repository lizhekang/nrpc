"use strict";

import TaskHandler from './taskHandler';
import {DataHelper, Message, Server} from './socket';

/**
 * rpc framework master part
 * @author: lizhekang
 */
class Master extends TaskHandler {
    private _server;
    private _cbMap;

    /**
     * Master constructor
     * @param object obj with functions
     * @param config Master config
     */
    public constructor(object, config: config) {
        super(object, config);

        this._cbMap = {};
    }

    public init() {
        let cfg = this._config;

        this._server = new Server(cfg.server);
        this._server.start();
        this._server.on('rpc', this._rpc.bind(this));
    }

    /**
     *
     * @param {string} name
     * @param {Array<any>} params
     * @returns {Promise}
     */
    public call(name: string, params: Array<any>, cb: Function, errCb: Function): void {
        if (typeof this._object[name] != 'function') {
            let res = new Result(-1, 'Function was not defined.');
            errCb(res.getResult());
        }

        //random
        //TODO: change to something new
        let map = this._server.getClientMap();
        let keys = Object.keys(map);

        if (keys.length > 0) {
            let index = Math.floor(Math.random() * keys.length);

            let client = map[keys[index]];  //choose socket client

            let rpcMsg = new Message('rpc', 0, {
                name: name,
                params: params,
                callback: this._register(name, cb)  //register random cb function
            });

            client.write(DataHelper.getString(rpcMsg.getMessage()));

        } else {
            let res = new Result(-1, 'Not remote client is available.');
            errCb(res.getResult());
        }

    }

    private _rpc(msg) {
        let data: rpcResp = msg.data;

        if(typeof this._cbMap[data.callback] == 'function') {
            this._cbMap[data.callback](data.result);
        }
    }

    /**
     * register the callback function
     * @param {string} name
     * @param {Function} callback
     * @private
     */
    private _register(name: string, callback: Function) {
        let cbName = name + '_' + new Date().getTime();

        this._cbMap[cbName] = callback;

        return cbName;
    }

    public destroy() {
        this._server && this._server.destroy();
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

export default Master;