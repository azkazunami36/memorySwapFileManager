import readline from "readline";
import fs from "fs";
import { memoryStatusGet } from "./memoryStatusGet.js";
import { swapStatusGet } from "./swapStatusGet.js";
import { execAsync } from "./execAsync.js";
import { MemorySwapFileManager } from "./memorySwapFileManager.js";

async function question(text: string): Promise<string> {
    const iface = readline.createInterface({ input: process.stdin, output: process.stdout })
    return await new Promise(resolve => iface.question(text + "> ", answer => { iface.close(); resolve(answer) }))
}

(async () => {
    console.log("メモリスワップファイルマネージャーのアンインストーラーが起動しています。");
    console.log("この操作を続行するとシステムに操作が加えられます。一時的にメモリスワップファイルマネージャーのシステムを実行します。");
    console.log("注意：メモリの空き容量をチェックしてください。もし空き容量が不足している場合、アンインストーラーは続行されません。");
    const agree = await question("メモリスワップファイルマネージャーのアンインストールを実行してもよろしいですか？(y/n)");
    if (agree.toLowerCase() !== "y" && agree.toLowerCase() !== "yes") {
        console.log("操作は中断されました。");
        process.exit(0);
    }
    try {
        if (fs.existsSync("/swapFolder")) {
            try {
                console.log("サービスを停止します。");
                await execAsync("systemctl disable memorySwapFilemanager");
                await execAsync("systemctl stop memorySwapFilemanager");
                console.log("サービスは停止しました。");
            } catch {
                console.log("サービスを停止しようとしましたが、エラーが発生しました。権限がない可能性があります。");
                console.log("操作は中断されました。");
                process.exit(1);
            }
            console.log("アンインストールの前にスワップファイルの開放を行います。そのためには一度メモリスワップファイルマネージャーを起動します。");
            try {
                await new Promise<void>(async (resolve, reject) => {
                    try {
                        const msfm = new MemorySwapFileManager({ ...console, fatal(message) { console.error(message) }, });
                        await msfm.ready();
                        await msfm.stop();
                        const memoryStatus = await memoryStatusGet();
                        if (!memoryStatus) return reject("メモリ状況を取得できませんでした。権限が足りないか、コマンドがありません。");
                        if ((memoryStatus.Swap.free + memoryStatus.Mem.free) > 1000) {
                            let falied = 0;
                            while (true) {
                                if (falied > 30) {
                                    return reject("スワップ開放が正しく実行できていません。30回以上失敗しています。")
                                }
                                const swap = await swapStatusGet();
                                if (!swap) return reject("スワップ状況を取得できませんでした。権限が足りないか、コマンドがありません。");
                                if (swap.length <= 0) {
                                    await msfm.swapFile.cleanup();
                                    resolve();
                                    break;
                                }
                                const result = await msfm.swapFile.release();
                                if (!result) falied++
                                await new Promise<void>(resolve => { setTimeout(() => { resolve() }, 1000) });
                            }
                            return;
                        } else {
                            reject("メモリの空き容量が不足しているため、動作を続行できません。");
                        }
                    } catch (e) {
                        console.log(e);
                        reject("何らかのエラーが発生し、正常に動作を続行できません。");
                    }
                });
                console.log("スワップファイルの削除処理が完了しました。スワップフォルダの削除を試みます。");
                try {
                    await execAsync("rm -rf /swapFolder");
                    console.log("スワップフォルダの削除が完了しました。続いてサービスのクリーンアップを行います。")
                } catch {
                    console.log("削除を試みましたが、何らかの理由で削除ができませんでした。有効なスワップファイルがまだ存在しているか、権限がない可能性があります。");
                    console.log("操作は中断されました。");
                    process.exit(1);
                }
            } catch (e) {
                console.log(e);
                console.log("操作は中断されました。");
                process.exit(1);
            }
        } else {
            console.log("スワップフォルダが存在しないため、このままクリーンアップ操作を開始します。")
        }
        try {
            if (fs.existsSync("/etc/systemd/system/memorySwapFilemanager.service")) {
                fs.rmSync("/etc/systemd/system/memorySwapFilemanager.service")
            }
        } catch {
            console.log("サービスファイルを削除しようとしましたが、削除できませんでした。");
            console.log("操作は中断されました。");
            process.exit(1);
        }
        try {
            await execAsync("systemctl daemon-reload");
        } catch {
            console.log("サービスを再読込しようとしましたが、失敗しました。しかし、ほとんどの操作が完了しました。");
        }
        try {
            if (fs.existsSync("/var/log/MemSwapMgr.log")) {
                fs.rmSync("/var/log/MemSwapMgr.log");
            }
        } catch {
            console.log("ログファイルを削除しようとしましたが、削除できませんでした。しかし、ほとんどの操作が完了しました。");
        }
    } catch {
        console.log("何らかのエラーが発生し、正常に動作を続行できません。");
        console.log("操作は中断されました。");
        process.exit(1);
    }
    console.log("メモリスワップファイルマネージャーのアンインストールが完了しました。必要に応じて、リポジトリの削除が可能です。");
})();
