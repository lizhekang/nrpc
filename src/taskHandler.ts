"use strict";

abstract class TaskHandler {
    protected _object;
    protected _config;

    public constructor(object, config) {
        this._object = object;
        this._config = config;
    }

    public abstract init();

    public abstract call(name: string, params: Array<any>, cb: Function, errCb: Function);

    public abstract destory();
}

export default TaskHandler;