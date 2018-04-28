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
c1.init();

let c2 = new Core(tpl, scfg);
setTimeout(() => {
    c2.init();
}, 500);

let c3 = new Core(tpl, scfg);
setTimeout(() => {
    c3.init();
}, 500);

setTimeout(() => {
    //c3.destory()
    c1.call('test', [], (data) => {
        console.log(11, data);
    }, (data) => {
        console.log(11, data);
    })

}, 1000);
