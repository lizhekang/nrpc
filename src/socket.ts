"use strict";
import * as net from 'net';

const ALIVE_TIME = 2000;    //2 second
const KEEP_ALIVE_TIME = ALIVE_TIME + 3000;

abstract class Socket {
    protected _name;    //name for socket
    protected _option;
    protected _cbMap;

    constructor(name: string, option: object) {
        this._name = name;
        this._option = option;
        this._cbMap = {};
    }

    public on(action: string, callback: Function) {
        if (!this._cbMap[action]) {
            this._cbMap[action] = [];
        }
        this._cbMap[action].push(callback);
    }

    /**
     * listen event once
     * @param {string} action
     * @param {Function} callback
     */
    public once(action: string, callback: Function) {
        if (!this._cbMap[action]) {
            this._cbMap[action] = [];
            this._cbMap[action].push(callback);
        }
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

class socketWriter {
    private _socket;
    private _queue;
    private _isUsed;

    constructor(socket) {
        this._socket = socket;
        this._queue = [];
        this._isUsed = false;
    }

    public write(data) {
        this._queue.push(data);

        if(!this._isUsed) {
            this._write();
        }
    }

    private _write() {
        let _d =this._queue.pop();

        if(_d) {
            this._isUsed = true;
            this._socket.write(_d, () => {
                this._isUsed = false;
                this._write();
            });
        }
    }
}

class Server extends Socket {

    private _server: net.Server;
    private _clientMap;

    public constructor(name, option) {
        super(name, option);
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
                let writeHelper = new socketWriter(c);

                c.setNoDelay(true);  //disable tcp buffer

                //ask client to reg
                //handle get reg msg
                let regKey = 'reg' + key;
                this.on(regKey, (msg) => {
                    let data = msg.data;
                    let name = data.name;

                    c['_name'] = name;
                    this._clientMap[key] = c;
                    console.log('reg:', key, name);
                });
                let regMsg = new Message('reg', 0, {
                    regKey: regKey
                });
                writeHelper.write(JSON.stringify(regMsg.getMessage()));

                //handle data input
                c.on('data', (data) => {
                    //data handler
                    let msg: message = DataHelper.getJSON(data);

                    this.handlerMessage(msg).then((res: any) => {
                        //if data is msg, pass toward the target
                        if (res && typeof res == 'object' && res.action) {
                            writeHelper.write(DataHelper.getString(res));
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

    private _socket;
    private _writeHelper;
    private _retryTime;
    private _timer;

    constructor(name, option) {
        super(name, option);

        this._socket = null;
        this._retryTime = this._option.maxRetryTimes;
    }

    public start() {
        this._initClientHandler();
    }

    private _initClientHandler() {
        if (!this._socket) {
            let name = this._name;
            let cfg = this._option;
            this.once('reg', this._reg.bind(this));

            this._socket = net.createConnection({port: cfg.port}, () => {
                let that = this;

                this._timer = setInterval(tick, ALIVE_TIME);

                function tick() {
                    let msg = new Message('tick', 0, {
                        name: name    //tell server the name
                    });

                    that.write(msg.getMessage());
                };

                this._socket.on('data', (data) => {
                    //data handler
                    let msg: message = DataHelper.getJSON(data);

                    this.handlerMessage(msg).then((res: any) => {
                        //if data is msg, pass toward the target
                        if (res && typeof res == 'object' && res.action) {
                            that.write(res);
                        }
                    }).catch((err) => {
                        console.log(err);
                    });
                })
            });

            this._socket.setNoDelay(true);  //disable tcp buffer

            this._socket.on('error', (err) => {
                console.log(err.code);

                if (err.code == 'ECONNREFUSED' && this._option.retry && this._retryTime > 0) {
                    this._retryTime--;
                    console.log('Retry to connect after 1 sec!');
                    setTimeout(() => {
                        this._socket = null;
                        this._initClientHandler();
                    }, 1000);

                    return;
                } else {
                    throw err;
                }
            })
        }
        this._retryTime = this._option.maxRetryTimes;
    }

    public write(msg: any) {
        if(this._socket) {
            if(!this._writeHelper) {
                this._writeHelper = new socketWriter(this._socket);
            }
            if(msg instanceof Message) {    //check msg's type
                this._writeHelper.write(DataHelper.getString(msg.getMessage()));
            }else {
                this._writeHelper.write(DataHelper.getString(msg));
            }
        }
        //this._socket && this._socket.write(DataHelper.getString(msg.getMessage()));
    }

    private _reg(msg) {
        let data = msg.data;
        let regMsg = new Message(data.regKey, 0, {
            name: this._name
        });

        this.write(regMsg.getMessage());
    }

    public destroy() {
        this._socket.end();
        this._socket = null;
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