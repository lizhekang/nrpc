"use strict";

//获取配置
let mcfg = require('./config/master');
let scfg = require('./config/slave');

let Core = require('../index');

class tpl {
    static test() {
        return Promise.all([123]);
    }
}

let c1 = new Core(tpl, mcfg);

setTimeout(() => {
    c1.init();
}, 2000);


let c2 = new Core(tpl, scfg);
setTimeout(() => {
    c2.init();
}, 500);

let c3 = new Core(tpl, scfg);
setTimeout(() => {
    c3.init();
}, 1000);

process.on('SIGINT', () => {
    console.log('Received SIGINT. Press Control-D to exit.');
    c1.destroy();
    c2.destroy();
    c3.destroy();
});