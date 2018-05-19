"use strict";
let test = require('ava');
//获取配置
let mcfg = require('./config/master');
let scfg = require('./config/slave');
let error = require('../dist/error');

let Core = require('../index');

function pTimeout(time) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve(true);
        }, time);
    });
}

class tpl {
    static test(a, b) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve(a + b);
            }, 9000)
        });
    }

    static add(a, b) {
        return a + b;
    }

    static addP(a, b) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve(a + b);
            }, 200)
        });
    }

    static timeout(a, b) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve(a + b);
            }, 12000)
        });
    }
}

test.serial('call add function.', async t => {
    let c1 = new Core(tpl, mcfg);
    let c2 = new Core(tpl, scfg);
    let c3 = new Core(tpl, scfg);

    c1.init();
    c2.init();
    c3.init();

    await pTimeout(100);

    await new Promise((resolve, reject) => {
        c1.call('add', [1, 2], (result) => {
            if (result == 3) {
                t.pass();
            } else {
                t.fail();
            }
            resolve(true);
        }, (err) => {
            t.fail(err);
            resolve(true);
        });
    });

    c1.destroy();
    c2.destroy();
    c3.destroy();
});

test.serial('call function not exist.', async t => {
    let c1 = new Core(tpl, mcfg);
    let c2 = new Core(tpl, scfg);
    let c3 = new Core(tpl, scfg);

    await pTimeout(1000);

    c1.init();
    c2.init();
    c3.init();

    await pTimeout(100);

    await new Promise((resolve, reject) => {
        c1.call('plus', [1, 2], (result) => {
            t.fail();
            resolve(true);
        }, (err) => {
            if (error.REMOTEFUNCISNOTDEFINE.result == err.result) {
                t.pass(error.REMOTEFUNCISNOTDEFINE.msg);
            } else {
                t.fail(err);
            }
            resolve(true);
        });
    });

    c1.destroy();
    c2.destroy();
    c3.destroy();
});

test.serial('test client retry.', async t => {
    let c1 = new Core(tpl, mcfg);
    let c2 = new Core(tpl, scfg);
    let c3 = new Core(tpl, scfg);

    await pTimeout(1000);

    c2.init();
    c3.init();

    await pTimeout(500);

    c1.init();

    await pTimeout(2000);

    await new Promise((resolve, reject) => {
        c1.call('add', [1, 2], (result) => {
            if (result == 3) {
                t.pass();
            } else {
                t.fail();
            }
            resolve(true);
        }, (err) => {
            t.fail(err.msg);
            resolve(true);
        });
    });

    c1.destroy();
    c2.destroy();
    c3.destroy();
});

test.serial('remote call timeout.', async t => {
    let c1 = new Core(tpl, mcfg);
    let c2 = new Core(tpl, scfg);
    let c3 = new Core(tpl, scfg);

    await pTimeout(1000);

    c1.init();
    c2.init();
    c3.init();

    await pTimeout(500);

    await new Promise((resolve, reject) => {
        c1.call('timeout', [1, 2], (result) => {
            t.fail();
            resolve(true);
        }, (err) => {
            if (err.result == error.CALLTIMEOUT.result) {
                t.pass();
            } else {
                t.fail(err.msg);
            }
            resolve(true);
        });
    });

    c1.destroy();
    c2.destroy();
    c3.destroy();
});

test.serial('remote much call in a time.', async t => {
    let c1 = new Core(tpl, mcfg);
    let c2 = new Core(tpl, scfg);
    let c3 = new Core(tpl, scfg);

    await pTimeout(1000);

    c1.init();
    c2.init();
    c3.init();

    await pTimeout(500);

    await new Promise((resolve, reject) => {
        c1.call('addP', [1, 1], (result) => {

        }, (err) => {
            t.fail(err.msg);
        });

        c1.call('addP', [1, 3], (result) => {

        }, (err) => {
            t.fail(err.msg);
        });

        c1.call('add', [1, 4], (result) => {
            t.fail();
            resolve(true);
        }, (err) => {
            if (err.result == error.NOREMOTECLIENTAVAIL.result) {
                t.pass();
            } else {
                t.fail(err.msg);
            }
            resolve(true);
        });
    });

    c1.destroy();
    c2.destroy();
    c3.destroy();
});

test.serial('end no test.', async t => {
    await pTimeout(1000);
    t.pass();
});