import { memoryStatusGet } from "./memoryStatusGet.js";
import { execAsync } from "./execAsync.js";
import * as fs from "fs";
import { swapStatusGet } from "./swapStatusGet.js";

class MemorySwapFileManager {
    constructor() { this.init(); }
    busy = false; // メモリの操作中かどうか

    /**
     * 初期化関数
     * OSが管理しているスワップファイルをすべて削除し、クラスが管理するスワップファイルをOSが利用するように設定します。
     * スワップフォルダの作成、不要なスワップファイルの削除、最初のスワップファイルの作成と有効化、不正なスワップファイルのマークを行います。
     */
    async init() {
        console.info(
            "【MemorySwapFileManager v1.0(2024/12)】\n" +
            "メモリの状況を監視し、スワップファイルを調整します。\n" +
            "情報や警告でプログラムの動作を届けます。異常等はwarnログで出力します。\n" +
            "\nこのプログラムはバグが含まれている可能性があります。十分注意してこのプログラムをご利用ください。" +
            "\n---------------------------------------------------------------------------------------\n"
        )
        console.info("【初期化】初期化を開始します。");
        // スワップフォルダが存在しない場合は作成
        if (!this.isSwapFolderExists()) {
            console.info("スワップファイルを保存するフォルダを「/swapFolder」として作成しました。");
            fs.mkdirSync("/swapFolder");
        }

        // 利用されていないスワップファイルを削除
        await this.swapFile.cleanup();

        // 最初のスワップファイルが存在しない場合は作成して有効化
        if (!fs.existsSync("/swapFolder/swapfile0")) {
            console.info("スワップファイルの0番を作成します。");
            await this.swapFile.create("swapfile0");
        }
        await this.swapFile.activate("swapfile0");

        // 不正なスワップファイルをマーク
        const invalidSwapFiles: string[] = [];
        const { swapfiles, other } = await this.swapFile.getPaths();
        for (const file of swapfiles) {
            const filePath = `/swapFolder/${file}`;
            const stats = fs.statSync(filePath);
            // 1.2GB以上、800MB以下のファイルは不正なスワップファイルとしてマーク
            if (stats.size > 1.2 * 1024 * 1024 * 1024 || stats.size < 800 * 1024 * 1024) invalidSwapFiles.push(filePath);
        }
        // スワップフォルダ以外にあるファイルは不正なスワップファイルとしてマーク
        for (const filePath of other) invalidSwapFiles.push(filePath);

        // 不正なスワップファイルに使用されているメモリを確認する
        let totalSize = 0; // 単位はMB
        const swapStatus = await swapStatusGet(); // スワップファイルの状態を取得
        if (swapStatus) {
            for (const file of invalidSwapFiles) {
                const swapFile = swapStatus.find(swap => swap.name === file);
                if (swapFile) totalSize += swapFile.used;
            }
        }
        // スワップファイルが使用されているメモリの分だけ新しいスワップファイルを作成
        if (totalSize > 0) console.info("このプログラムで管理されていないファイル、このプログラムの規格外の容量で作成されたファイルがありました。" + totalSize + "MB 分のスワップファイルを作成します。");
        for (let i = 0; i < Math.ceil(totalSize / 1024); i++) {
            const fileName = this.swapFile.getNextName();
            await this.swapFile.create(fileName);
            await this.swapFile.activate(fileName);
        }
        // 不正なスワップファイルを削除
        for (const file of invalidSwapFiles) {
            console.info("規格外のスワップファイルを削除します。: " + file);
            await execAsync("sudo swapoff " + file);
            await execAsync("sudo rm " + file);
        }

        // メモリの状況を一定間隔で監視
        console.info("【完了】初期化が完了しました。メモリの状況を一定間隔で監視します。");
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

            console.info("次のスワップファイルを開放します: " + filename);
            const swapFile = swapStatus.find(swap => swap.name === "/swapFolder/" + filename);
            if (swapFile) {
                // メモリが不足する場合は新しいスワップファイルを作成して有効化
                if (memoryStatus.Mem.free + memoryStatus.Swap.free - swapFile.used < 0) {
                    console.warn("スワップファイルを開放しようとしましたが、メモリが不足したため、新しくスワップファイルを割り当てます。");
                    const newFileName = this.swapFile.getNextName();
                    await this.swapFile.create(newFileName);
                    await this.swapFile.activate(newFileName);
                }
                await execAsync("sudo swapoff /swapFolder/" + filename);
            }
        },
        /**
         * スワップファイルを作成します。
         * @param fileName スワップファイルのファイル名
         */
        create: async (fileName: string) => {
            console.info("スワップファイルを作成します。: " + fileName);
            // ディスクの空き容量を確認
            const freeOutput = await execAsync("df -k /swapFolder | tail -1 | awk '{print $4}'");
            const free = parseInt(freeOutput.trim(), 10);
            const diskSpace = parseInt(free.toString(), 10) * 1024; // KBからバイトに変換
            if (diskSpace < 2 * 1024 * 1024 * 1024) { // 空き容量が2GB未満の場合の処理
                console.warn("空き容量が不足しているため、スワップファイルを開放します。");
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
                    console.warn("【警告！！】メモリ・ディスク領域が不足し、スワップファイルを開放できません。ディスクの状態や、アプリの状態を確認してください。");
                    return;
                }
            }

            // 新しいスワップファイルを作成
            await execAsync("sudo fallocate -l 1G /swapFolder/" + fileName);
            await execAsync("sudo chmod 600 /swapFolder/" + fileName);
            await execAsync("sudo mkswap /swapFolder/" + fileName);
        },
        /**
         * スワップファイルを有効にします。既に有効な場合は何もしません。
         * @param fileName スワップファイルのファイル名
         */
        activate: async (fileName: string) => {
            console.info("次のスワップファイルを有効にします。: " + fileName);
            const swapStatus = await swapStatusGet();
            if (swapStatus && !swapStatus.some(swap => swap.name === "/swapFolder/" + fileName)) {
                await execAsync("sudo swapon /swapFolder/" + fileName);
            }
        },
        /**
         * スワップファイルの保存場所を取得します。
         * @returns スワップファイルのファイル名一覧と、スワップフォルダではない場所に保存されたファイルのフルパス一覧
         */
        getPaths: async (): Promise<{ swapfiles: string[]; other: string[]; }> => {
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
        },
        /**
         * 不要になったスワップファイルをクリーンアップします。
         */
        cleanup: async () => {
            const swapStatus = await swapStatusGet();
            const files = fs.readdirSync("/swapFolder");
            for (const file of files) {
                const filePath = `/swapFolder/${file}`;
                // スワップフォルダに入っていて、スワップオンに登録されていないフォルダを削除
                if (swapStatus && !swapStatus.some(swap => swap.name === filePath) || fs.lstatSync(filePath).isDirectory()) {
                    console.info("次の不要なスワップファイルを削除します。: " + filePath);
                    await execAsync("sudo rm -r " + filePath);
                }
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
        const memoryStatus = await memoryStatusGet();
        if (!memoryStatus) return;
        if (memoryStatus.Swap.free > 2000) { // スワップの空き容量が2GB以上の場合の処理
            console.info("スワップの空き容量が2GB以上になりました。");
            await this.swapFile.release(); // スワップファイルを削除
            await this.swapFile.cleanup();
            return;
        }
        if (memoryStatus.Swap.free < 500) { // スワップの空き容量が500MB未満の場合の処理
            console.info("スワップの空き容量が減り、500MB未満になりました。");
            // スワップファイルを１つ作成
            const fileName = this.swapFile.getNextName();
            await this.swapFile.create(fileName);
            await this.swapFile.activate(fileName);
            return;
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
