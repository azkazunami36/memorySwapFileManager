import log4js from "log4js";
import { MemorySwapFileManager } from "./memorySwapFileManager.js";

/** ログ管理の設定をセット */
log4js.configure({
    appenders: {
        out: { type: "stdout" },
        app: { type: "file", filename: "/var/log/MemSwapMgr.log", maxLogSize: 10485760, backups: 10 },
    },
    categories: {
        default: { appenders: ["out"], level: "INFO" },
        save: { appenders: ["app"], level: "ALL" },
    },
});

const defaultLogger = log4js.getLogger();
const saveLogger = log4js.getLogger("save");

const consol = {
    trace: (message: string) => {
        defaultLogger.trace(message);
        saveLogger.trace(message);
    },
    debug: (message: string) => {
        defaultLogger.debug(message);
        saveLogger.debug(message);
    },
    info: (message: string) => {
        defaultLogger.info(message);
        saveLogger.info(message);
    },
    warn: (message: string) => {
        defaultLogger.warn(message);
        saveLogger.warn(message);
    },
    error: (message: string) => {
        defaultLogger.error(message);
        saveLogger.error(message);
    },
    fatal: (message: string) => {
        defaultLogger.fatal(message);
        saveLogger.fatal(message);
    },
}


new MemorySwapFileManager(consol);
