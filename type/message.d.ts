declare interface message {
    action: string,
    result: number,
    data: any
}

declare interface rpcReq {
    name: string,
    params: Array<any>,
    callback: string
}

declare interface rpcResp {
    callback: string,
    result: any
}