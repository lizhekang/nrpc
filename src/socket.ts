"use strict";
import * as net from 'net';

const ALIVE_TIME = 2000;    //2 second
const KEEP_ALIVE_TIME = ALIVE_TIME + 3000;

abstract class Socket {
    protected _option;
    protected _cbMap;

    constructor(option) {
        this._option = option;
        this._cbMap = {};
    }

    public on(action: string, callback: Function) {
        if (!this._cbMap[action]) {
            this._cbMap[action] = [];
        }
        this._cbMap[action].push(callback);
    }

    protected handlerMessage(msg) {
        return new Promise((resolve, reject) => {
            if (this._cbMap[msg.action]) {
                let cbList = this._cbMap[msg.action];

                cbList.forEach((cb) => {
                    let res = cb(msg);
                    if (res && res.toString() == '[object Promise]') {
                        res.then((data) => {
                            resolve(data);
                        }).catch((e) => {
                            reject(e);
                        })
                    } else {
                        resolve(res);
                    }
                });
            }
        });

    }

    public remove(action) {
        this._cbMap[action] && delete this._cbMap[action];
    }

    abstract start();

    abstract destroy();
}

class DataHelper {
    static getJSON(data) {
        return JSON.parse(data.toString());
    }

    static getString(data) {
        return JSON.stringify(data);
    }
}

class Server extends Socket {

    private _server: net.Server;
    private _clientMap;

    public constructor(option) {
        super(option);
        this._server = null;
        this._clientMap = {};
    }

    public getClientMap() {
        return this._clientMap;
    }

    public start() {
        if (!this._server) {
            let cfg = this._option;
            this.on('tick', this._tock);

            this._server = net.createServer((c) => {
                console.log('connection:' + c.remoteAddress, c.remotePort);
                let key = c.remoteAddress + '_' + c.remotePort;
                this._clientMap[key] = c;

                //handle data input
                c.on('data', (data) => {
                    //data handler
                    let msg: message = DataHelper.getJSON(data);

                    this.handlerMessage(msg).then((res: any) => {
                        //if data is msg, pass toward the target
                        if (res && typeof res == 'object' && res.action) {
                            c.write(DataHelper.getString(res));
                        }
                    }).catch((err) => {
                        console.log(err);
                    });
                });

                //handle close and end event
                c.on('end', () => {
                    console.log('end:' + c.remoteAddress, c.remotePort);
                });
                c.on('close', () => {
                    console.log('close:' + c.remoteAddress, c.remotePort);
                    //remove worker
                    delete this._clientMap[key];
                });

                //timeout handler
                c.setTimeout(cfg.timeout || KEEP_ALIVE_TIME, () => {
                    c.destroy();
                });
            });

            this._server.on('error', (err) => {
                console.log(err);
            });

            this._server.listen(cfg.port, () => {
                console.log('Master Server up. Listening on %d.', cfg.port);
            })
        }
    }

    private _tock() {
        let msg = new Message('tock', 0, '');
        return Promise.resolve(msg.getMessage());
    }

    public destroy() {
        this._server.close(() => {
            console.log('Master Server close');
        });

        this._server = null;
    }
}

class Client extends Socket {

    private _client;
    private _retryTime;
    private _timer;

    constructor(option) {
        super(option);
        this._client = null;
        this._retryTime = this._option.maxRetryTimes;
    }

    start() {
        this._initClientHandler();
    }

    private _initClientHandler() {
        if (!this._client) {
            let cfg = this._option;
            this._client = net.createConnection({port: cfg.port}, () => {
                let that = this;

                this._timer = setInterval(tick, ALIVE_TIME);

                function tick() {
                    let msg = new Message('tick', 0, '');

                    that._client && that._client.write(JSON.stringify(msg.getMessage()));
                };

                this._client.on('data', (data) => {
                    //data handler
                    let msg: message = DataHelper.getJSON(data);

                    this.handlerMessage(msg).then((res: any) => {
                        //if data is msg, pass toward the target
                        if (res && typeof res == 'object' && res.action) {
                            that._client && this._client.write(DataHelper.getString(res));
                        }
                    }).catch((err) => {
                        console.log(err);
                    });
                })
            });

            this._client.on('error', (err) => {
                console.log(err.code);

                if (err.code == 'ECONNREFUSED' && this._option.retry && this._retryTime > 0) {
                    this._retryTime--;
                    console.log('Retry to connect after 1 sec!');
                    setTimeout(() => {
                        this._client = null;
                        this._initClientHandler();
                        //this._client.connect();
                    }, 1000);

                    return;
                } else {
                    throw err;
                }
            })
        }
        this._retryTime = this._option.maxRetryTimes;
    }

    write(msg: Message) {
        this._client && this._client.write(DataHelper.getString(msg.getMessage()));
    }

    public destroy() {
        this._client.end();
        this._client = null;
        this._timer && clearInterval(this._timer);
    }
}

class Message {
    private _action;
    private _result;
    private _data;

    constructor(action: string, result: number = 0, data: any = "") {
        this._action = action;
        this._result = result;
        this._data = data;
    }

    getMessage() {
        let msg: message = {
            action: this._action,
            result: this._result,
            data: this._data
        };

        return JSON.parse(JSON.stringify(msg)); //immutable
    }

    set action(action) {
        this._action = action;
    }

    set result(result) {
        this._result = result;
    }

    set data(data) {
        this._data = data;
    }
}

export {
    Server,
    Client,
    Message,
    DataHelper
};