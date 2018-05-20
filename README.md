# wrpc

简单的远程函数调用框架。

## log

- v0.0.1 基本的远程调用能力。
- v0.0.2 客户端掉线重连能力。
- v0.0.3 添加错误码字段。

## 使用

调用方：

```javascript
let rpc = require('wrpc');

let funcDef = {
    add: (a, b) => {return a+b;}
};

let cfg = {
  "type": "master", //本地
  "name": "master",
  "server": {
    "ip": "127.0.0.1",
    "port": 10001
  }
};

let m = new rpc(funcDef, cfg);
m.init();

//执行远程调用
m.call('add', [1, 2], (res) => {
    console.log(res);
}, (err) => {
    console.log(err);
})
```

被调用方（远程）：


```javascript
let rpc = require('wrpc');

let funcDef = {
    add: (a, b) => {return a+b;}
};

let cfg = {
  "type": "slave",  //远程
  "name": "worker1",
  "server": {
    "ip": "127.0.0.1",
    "port": 10001
  }
};

let s = new rpc(funcDef, cfg);
s.init();
```

## 配置说明

```json

{
  "type": "slave",
  "name": "worker1",
  "server": {
    "ip": "127.0.0.1",
    "port": 10001,
    "retry": true,
    "maxRetryTimes": 10
  }
}

```

| 字段 | 类型 | 必须 | 说明 |
| ---- | ----- | ---- | ---- |
| type | string | 是 | master 或 slave，用于表示调用方与被调用方 |
| name | string | 是 | 服务名 |
| server | object | 是 | 服务配置 |
| server --> ip | string | 是 | 服务地址 |
| server --> port | number | 是 | 服务端口 |
| server --> retry | boolean | 否 | 是否尝试重连，只对于被调用方服务生效 |
| server --> maxRetryTimes | number | 否 | 最大重试次数，只对于开启了尝试重连的被调用方服务生效 |