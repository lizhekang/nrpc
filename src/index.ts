"use strict";
import TaskHandler from './taskHandler';
import Master from './master';
import Slave from './slave';

class Main {
    private _object;
    private _config;
    private _taskHandler: TaskHandler;

    public constructor(object, config) {
        this._object = object;
        this._config = config;
        this._taskHandler = config.type == 'master' ? new Master(object, config) : new Slave(object, config);
    }

    public init() {
        this._taskHandler.init();
    }

    public call(name: string, params: Array<any>, cb: Function, errCb: Function) {
        return this._taskHandler.call(name, params, cb, errCb);
    }

    public destory() {
        this._taskHandler.destory();
    }
}

export default Main;