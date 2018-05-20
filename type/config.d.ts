declare interface config {
    type: string,
    name: string,
    server: {
        ip: string,
        port: number,
        timeout: number,
        retry?: boolean,
        maxRetryTimes?: number
    }
}