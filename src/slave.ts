"use strict";
import TaskHandler from './taskHandler';
import {Client, DataHelper, Message} from './socket';

/**
 * rpc framework slave part
 * @author: lizhekang
 */
class Slave extends TaskHandler {
    private _client;

    /**
     * Master constructor
     * @param object obj with functions
     * @param config Master config
     */
    public constructor(object, config) {
        super(object, config);
    }

    public init() {
        let cfg = this._config;

        this._client = new Client(cfg.server);
        this._client.start();
        this._client.on('rpc', this._rpc.bind(this));
    }

    public call(name: string, params: Array<any>, cb: Function, errCb: Function) {
        cb({})
    }

    private _rpc(msg) {
        let data: rpcReq = msg.data;
        let msgResp = new Message('rpc', 0);
        let rpcData: rpcResp = JSON.parse(JSON.stringify({
            callback: data.callback,
            result: ""
        }));

        if (typeof this._object[data.name] == 'function') {
            let res = this._object[data.name].apply(this, data.params);

            if (res && res.toString() == '[object Promise]') {
                res.then((data) => {
                    rpcData.result = data;
                    msgResp.data = rpcData;

                    this._client.write(msgResp);
                }).catch((err) => {
                    rpcData.result = data;
                    msgResp.data = rpcData;

                    this._client.write(msgResp);
                })
            } else {
                rpcData.result = res;
                msgResp.data = rpcData;

                this._client.write(msgResp);
            }


        }


    }

    public destory() {
        this._client.destroy();
    }
}

export default Slave;