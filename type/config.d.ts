declare interface config {
    type: string,
    server: {
        name: string,
        ip: string,
        port: number,
        timeout: number,
        retry?: boolean,
        maxRetryTimes?: number
    }
}