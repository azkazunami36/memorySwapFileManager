import { memoryStatusGet } from "./memoryStatusGet.js";
import { execAsync } from "./execAsync.js";
import { swapStatusGet } from "./swapStatusGet.js";

import log4js from "log4js";
import * as fs from "fs";

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

class MemorySwapFileManager {
    constructor() { this.init(); }
    busy = false; // メモリの操作中かどうか
    memoryStatusOutputCycle = Date.now(); // メモリの状況を出力した時間

    /**
     * 初期化関数
     * OSが管理しているスワップファイルをすべて削除し、クラスが管理するスワップファイルをOSが利用するように設定します。
     * スワップフォルダの作成、不要なスワップファイルの削除、最初のスワップファイルの作成と有効化、不正なスワップファイルのマークを行います。
     */
    async init() {
        console.info(
            "【MemorySwapFileManager v1.0(2024/12)】\n" +
            "メモリの状況を監視し、スワップファイルを調整します。\n" +
            "情報や警告でプログラムの動作を届けます。異常等はすべてログで出力します。\n" +
            "\nこのプログラムはバグが含まれている可能性があります。十分注意してこのプログラムをご利用ください。" +
            "\n---------------------------------------------------------------------------------------\n"
        )
        consol.info("初期化を開始します。");
        // スワップフォルダが存在しない場合は作成
        if (!this.isSwapFolderExists()) {
            consol.info("スワップファイルを保存するフォルダを「/swapFolder」として作成しました。");
            fs.mkdirSync("/swapFolder");
        }

        // 利用されていないスワップファイルを削除
        await this.swapFile.cleanup();

        // 最初のスワップファイルが存在しない場合は作成して有効化
        if (!fs.existsSync("/swapFolder/swapfile0")) {
            consol.warn("スワップファイルの0番が存在しませんでした。新しく作成します。");
            await this.swapFile.create("swapfile0");
        }
        // swapfile0が有効じゃなかったら有効化
        try {
            const swapStatus = await swapStatusGet();
            if (swapStatus && !swapStatus.some(swap => swap.name === "/swapFolder/swapfile0")) {
                consol.warn("swapfile0が有効ではありません。新しく有効化します。");
                await this.swapFile.activate("swapfile0");
            }
        } catch (e) {
            consol.error("swapfile0の有効化に失敗しました。エラー理由: " + e);
        }

        // 不正なスワップファイルをマーク
        const invalidSwapFiles: string[] = [];
        const { swapfiles, other } = await this.swapFile.getPaths();
        for (const file of swapfiles) {
            const filePath = `/swapFolder/${file}`;
            const stats = fs.statSync(filePath);
            // 1GBではないファイルは不正なスワップファイルとしてマーク(10バイトの差異を許容)
            if (stats.size > 1000000010 || stats.size < 999999990) invalidSwapFiles.push(filePath);
        }
        // スワップフォルダ以外にあるファイルは不正なスワップファイルとしてマーク
        for (const filePath of other) invalidSwapFiles.push(filePath);

        // 不正なスワップファイルに使用されているメモリを確認する
        let totalSize = 0; // 単位はMB
        try {
            const swapStatus = await swapStatusGet(); // スワップファイルの状態を取得
            if (swapStatus) {
                for (const file of invalidSwapFiles) {
                    const swapFile = swapStatus.find(swap => swap.name === file);
                    if (swapFile) totalSize += swapFile.used;
                }
            }
        } catch (e) {
            consol.error("不正なスワップファイルに使用されているメモリを取得できませんでした。エラー理由: " + e);
        }
        // スワップファイルが使用されているメモリの分だけ新しいスワップファイルを作成
        if (totalSize > 0) consol.info("このプログラムで管理されていないファイル、このプログラムの規格外の容量で作成されたファイルがありました。" + totalSize + "MB 分のスワップファイルを作成します。");
        for (let i = 0; i < Math.ceil(totalSize / 1024); i++) {
            const fileName = this.swapFile.getNextName();
            await this.swapFile.create(fileName);
            await this.swapFile.activate(fileName);
        }
        // 不正なスワップファイルを削除
        for (const file of invalidSwapFiles) {
            consol.info("規格外のスワップファイルを削除します。: " + file);
            await execAsync("swapoff " + file);
            await execAsync("rm " + file);
        }

        // メモリの状況を一定間隔で監視
        consol.info("初期化が完了しました。メモリの状況を一定間隔で監視します。");
        setInterval(async () => {
            if (this.busy) return;
            this.busy = true;
            await this.checkMemoryStatus();
            this.busy = false;
        }, 500);
    }

    swapFile = {
        /**
         * スワップファイルを開放します。
         * @param fileName スワップファイルのファイル名（省略可能）
         */
        release: async (fileName?: string) => {
            let filename = fileName;
            try {
                const swapStatus = await swapStatusGet();
                const memoryStatus = await memoryStatusGet();
                if (!swapStatus || !memoryStatus) return;

                // ファイル名が指定されていない場合は最もスワップサイズが小さいファイルを選択
                if (!filename) {
                    const smallestSwapFile = swapStatus.reduce((prev, curr) => {
                        return prev.size < curr.size ? prev : curr;
                    });
                    if (smallestSwapFile) filename = smallestSwapFile.name.replace("/swapFolder/", "");
                }

                consol.info("次のスワップファイルを開放します: " + filename);
                const swapFile = swapStatus.find(swap => swap.name === "/swapFolder/" + filename);
                if (swapFile) {
                    // メモリが不足する場合は新しいスワップファイルを作成して有効化
                    if (memoryStatus.Mem.free + memoryStatus.Swap.free - swapFile.used < 0) {
                        consol.warn("スワップファイルを開放しようとしましたが、メモリが不足したため、新しくスワップファイルを割り当てます。");
                        const newFileName = this.swapFile.getNextName();
                        await this.swapFile.create(newFileName);
                        await this.swapFile.activate(newFileName);
                    }
                    await execAsync("swapoff /swapFolder/" + filename);
                }
            } catch (e) {
                consol.error("スワップファイルの開放に失敗しました。エラー理由: " + e);
            }
        },
        /**
         * スワップファイルを作成します。
         * @param fileName スワップファイルのファイル名
         */
        create: async (fileName: string) => {
            consol.info("スワップファイルを作成します。: " + fileName);
            // ディスクの空き容量を確認
            const diskSpace = await (async () => {
                try {
                    const freeOutput = await execAsync("df -k /swapFolder | tail -1 | awk '{print $4}'");
                    const free = parseInt(freeOutput.trim(), 10);
                    return parseInt(free.toString(), 10) * 1024; // KBからバイトに変換
                } catch {
                    return
                }
            })();
            if (!diskSpace) return consol.warn("ディスクの空き容量を取得できませんでした。");
            try {
                if (diskSpace < 2 * 1024 * 1024 * 1024) { // 空き容量が2GB未満の場合の処理
                    consol.warn("空き容量が不足しているため、スワップファイルを開放します。");
                    const swapStatus = await swapStatusGet();
                    const memoryStatus = await memoryStatusGet();
                    if (!swapStatus || !memoryStatus) return;

                    // 最大のスワップファイルを取得
                    const largestSwapFile = swapStatus.reduce((prev, curr) => {
                        return prev.size > curr.size && curr.used < prev.used ? prev : curr; // 未使用のスワップファイルを優先
                    });

                    // メモリが不足しない場合はスワップファイルを開放
                    if (largestSwapFile && memoryStatus.Swap.free >= largestSwapFile.used) {
                        await this.swapFile.release(largestSwapFile.name.replace("/swapFolder/", ""));
                    } else {
                        consol.fatal("メモリ・ディスク領域が不足し、スワップファイルを開放できません。ディスクの状態や、アプリの状態を確認してください。");
                        return;
                    }
                }
            } catch (e) {
                consol.error("ディスクの空き容量の確認に失敗しました。エラー理由: " + e);
            }

            // 新しいスワップファイルを作成
            try {
                await execAsync("fallocate -l 1000000000 /swapFolder/" + fileName);
                await execAsync("chmod 600 /swapFolder/" + fileName);
                await execAsync("mkswap /swapFolder/" + fileName);
                console.log("作成結果: " + fs.existsSync("/swapFolder/" + fileName));
            } catch (e) {
                consol.error("スワップファイルの作成に失敗しました。エラー理由: " + e);
            }
        },
        /**
         * スワップファイルを有効にします。既に有効な場合は何もしません。
         * @param fileName スワップファイルのファイル名
         */
        activate: async (fileName: string) => {
            consol.info("次のスワップファイルを有効にします。: " + fileName);
            try {
                const swapStatus = await swapStatusGet();
                if (swapStatus && !swapStatus.some(swap => swap.name === "/swapFolder/" + fileName))
                    await execAsync("swapon /swapFolder/" + fileName);
            } catch (e) {
                consol.error("スワップファイルの有効化に失敗しました。エラー理由: " + e);
            }
        },
        /**
         * スワップファイルの保存場所を取得します。
         * @returns スワップファイルのファイル名一覧と、スワップフォルダではない場所に保存されたファイルのフルパス一覧
         */
        getPaths: async (): Promise<{ swapfiles: string[]; other: string[]; }> => {
            try {
                const swapStatus = await swapStatusGet();
                if (!swapStatus) return { swapfiles: [], other: [] };

                const swapFolderFiles: string[] = [];
                const otherFiles: string[] = [];

                for (const swap of swapStatus) {
                    if (swap.name.startsWith("/swapFolder/")) {
                        const relativePath = swap.name.replace("/swapFolder/", "");
                        if (!relativePath.includes("/")) {
                            swapFolderFiles.push(relativePath);
                        } else {
                            otherFiles.push(swap.name);
                        }
                    } else {
                        otherFiles.push(swap.name);
                    }
                }

                return { swapfiles: swapFolderFiles, other: otherFiles };
            } catch (e) {
                consol.error("スワップファイルの保存場所を取得できませんでした。エラー理由: " + e);
                return { swapfiles: [], other: [] };
            }
        },
        /**
         * 不要になったスワップファイルをクリーンアップします。
         */
        cleanup: async () => {
            try {
                const swapStatus = await swapStatusGet();
                const files = fs.readdirSync("/swapFolder");
                for (const file of files) {
                    const filePath = `/swapFolder/${file}`;
                    // スワップフォルダに入っていて、スワップオンに登録されていないフォルダを削除
                    if (swapStatus && !swapStatus.some(swap => swap.name === filePath) || fs.lstatSync(filePath).isDirectory()) {
                        consol.info("次の不要なスワップファイルを削除します。: " + filePath);
                        try {
                            await execAsync("rm -r " + filePath);
                        } catch (e) {
                            consol.error("スワップファイルの削除に失敗しました。エラー理由: " + e);
                        }
                    }
                }
            } catch (e) {
                consol.error("スワップファイルのクリーンアップに失敗しました。エラー理由: " + e);
            }
        },
        /**
         * 次のスワップファイル名を取得します。
         * @returns 次のスワップファイル名
         */
        getNextName: () => {
            let i = 0;
            while (fs.existsSync("/swapFolder/swapfile" + i)) {
                i++;
            }
            return "swapfile" + i;
        }
    }

    /**
     * メモリの状態をチェックし、必要に応じてスワップファイルを調整します。
     */
    async checkMemoryStatus() {
        try {
            const memoryStatus = await memoryStatusGet();
            if (!memoryStatus) return;
            if (this.memoryStatusOutputCycle + 60000 < Date.now()) {
                consol.debug("メモリの状況を取得しました。: " + memoryStatus.Mem.free + " MB");
                this.memoryStatusOutputCycle = Date.now();
            }
            if (memoryStatus.Swap.free > 2000) { // スワップの空き容量が2GB以上の場合の処理
                consol.info("スワップの空き容量が2GB以上になりました。: " + memoryStatus.Swap.free + "MB");
                await this.swapFile.release(); // スワップファイルを削除
                await this.swapFile.cleanup();
                return;
            }
            if (memoryStatus.Swap.total < 2500 && memoryStatus.Swap.total > 999 && memoryStatus.Swap.used < 500) { // スワップの総容量が2GB未満で、使用量が500MB未満の場合の処理
                consol.info("スワップの総容量が2GB付近で、使用量が500MB未満になりました。: " + memoryStatus.Swap.total + "MB, " + memoryStatus.Swap.used + "MB Used");
                await this.swapFile.release(); // スワップファイルを削除
                await this.swapFile.cleanup();
                return;
            }
            if (memoryStatus.Swap.free < 500) { // スワップの空き容量が500MB未満の場合の処理
                consol.info("スワップの空き容量が減り、500MB未満になりました。: " + memoryStatus.Swap.free + "MB");
                // スワップファイルを１つ作成
                const fileName = this.swapFile.getNextName();
                await this.swapFile.create(fileName);
                await this.swapFile.activate(fileName);
                return;
            }
        } catch (e) {
            consol.error("メモリの状況のチェックに失敗しました。エラー理由: " + e);
        }
    }

    /**
     * スワップフォルダが存在するかどうかを返します。
     * @returns スワップフォルダが存在するかどうか
     */
    isSwapFolderExists() {
        return fs.existsSync("/swapFolder") && fs.lstatSync("/swapFolder").isDirectory();
    }
}

new MemorySwapFileManager();
