import fs from "fs";
import readline from "readline";

import { memoryStatusGet } from "./memoryStatusGet.js";
import { execAsync } from "./execAsync.js";
import { swapStatusGet } from "./swapStatusGet.js";

async function question(text: string): Promise<string> {
    const iface = readline.createInterface({ input: process.stdin, output: process.stdout })
    return await new Promise(resolve => iface.question(text + "> ", answer => { iface.close(); resolve(answer) }))
}

(async () => {
    console.log("メモリスワップファイルマネージャーのインストーラーが起動しています。");
    console.log("この操作を続行するとシステムに操作が加えられます。注意事項を理解した上で続行してください。");
    const agree = await question("メモリスワップファイルマネージャーのインストールを実行してもよろしいですか？(y/n)");
    if (agree.toLowerCase() !== "y" && agree.toLowerCase() !== "yes") {
        console.log("操作は中断されました。");
        process.exit(0);
    }
    console.log("メモリスワップファイルマネージャーのインストールを開始します。");

    // アクセス先の権限が全て有しているかをチェックします。

    try {
        if (!fs.existsSync("/etc/systemd/system")) {
            console.log("'/etc/systemd/system'にアクセスできません。フォルダが存在しません。systemdが利用できない可能性があります。インストールに失敗しました。");
            process.exit(1);
        }
        fs.accessSync("/etc/systemd/system", fs.constants.W_OK);
    } catch {
        console.log("'/etc/systemd/system'にアクセスできません。権限が不足しています。インストールに失敗しました。");
        process.exit(1);
    }
    const cwd = process.cwd();
    try {
        if (!fs.existsSync(cwd + "/main.js")) {
            console.log("'" + cwd + "/main.js'にアクセスできません。ファイルが存在しません。インストールに失敗しました。");
            process.exit(1);
        }
        fs.accessSync(cwd + "/main.js", fs.constants.W_OK);
    } catch {
        console.log("'" + cwd + "/main.js'にアクセスできません。権限が不足しています。インストールに失敗しました。");
        process.exit(1);
    }

    try {
        if (!fs.existsSync("/swapFolder")) fs.mkdirSync("/swapFolder");
    } catch {
        console.log("スワップファイルを保存するためのフォルダ'swapFolder'をルートに配置しようとしましたが、エラーが発生しました。インストールに失敗しました。")
    }

    try {
        const status = await memoryStatusGet();
        if (!status) throw "";
    } catch (e) {
        const errorText = String(e);
        if (errorText.match("Command failed") && errorText.match("not found")) {
            console.log("コマンド「free」が存在しませんでした。このコマンドはメモリスワップファイルマネージャーを正常に動作させるために必要です。");
        }
        console.log("メモリステータスを取得する権限またはコマンドがありません。インストールに失敗しました。");
        process.exit(1);
    }
    try {
        const status = await swapStatusGet();
        if (!status) throw "";
    } catch (e) {
        const errorText = String(e);
        if (errorText.match("Command failed") && errorText.match("not found")) {
            console.log("コマンド「swapon」が存在しませんでした。このコマンドはメモリスワップファイルマネージャーを正常に動作させるために必要です。");
        }
        console.log("スワップステータスを取得する権限またはコマンドがありません。インストールに失敗しました。");
        process.exit(1);
    }
    try {
        await execAsync("df");
    } catch (e) {
        const errorText = String(e);
        if (errorText.match("Command failed") && errorText.match("not found")) {
            console.log("コマンド「df」が存在しませんでした。このコマンドはメモリスワップファイルマネージャーを正常に動作させるために必要です。");
        }
        console.log("ディスク空き容量を取得する権限またはコマンドがありません。インストールに失敗しました。");
        process.exit(1);
    }
    try {
        await execAsync("df -k /swapFolder | tail -1");
        await execAsync("df -k /swapFolder | tail -1 | awk '{print $4}'");
    } catch (e) {
        const errorText = String(e);
        if (errorText.match("Command failed") && errorText.match("not found")) {
            console.log("コマンド「tail」または「awk」が存在しませんでした。このコマンドはメモリスワップファイルマネージャーを正常に動作させるために必要です。");
        }
        console.log("ディスク空き容量情報を整理する権限またはコマンドがありません。インストールに失敗しました。");
        process.exit(1);
    }
    try {
        await execAsync("fallocate -l 1 /swapFolder/test");
        await execAsync("chmod 600 /swapFolder/test");
        await execAsync("rm -r /swapFolder/test");
    } catch (e) {
        const errorText = String(e);
        if (errorText.match("Command failed") && errorText.match("not found")) {
            console.log("コマンド「fallocate」または「chmod」または「rm」が存在しませんでした。このコマンドはメモリスワップファイルマネージャーを正常に動作させるために必要です。");
        }
        console.log("スワップファイルを作成・削除する権限またはコマンドがありません。インストールに失敗しました。");
        process.exit(1);
    }
    try {
        await execAsync("systemctl");
    } catch (e) {
        const errorText = String(e);
        if (errorText.match("Command failed") && errorText.match("not found")) {
            console.log("コマンド「systemctl」が存在しませんでした。このコマンドはメモリスワップファイルマネージャーをインストールさせるために必要です。");
        }
        console.log("systemctlを操作する権限またはコマンドがありません。インストールに失敗しました。");
        process.exit(1);
    }
    try {
        await execAsync("which npm");
    } catch (e) {
        const errorText = String(e);
        if (errorText.match("Command failed") && errorText.match("not found")) {
            console.log("コマンド「which」が存在しませんでした。このコマンドはメモリスワップファイルマネージャーをインストールさせるために必要です。");
        }
        console.log("npmのインストール先をチェックする権限・コマンドがありません。インストールに失敗しました。");
        process.exit(1);
    }
    try {
        await execAsync("whoami");
    } catch (e) {
        const errorText = String(e);
        if (errorText.match("Command failed") && errorText.match("not found")) {
            console.log("コマンド「whoami」が存在しませんでした。このコマンドはメモリスワップファイルマネージャーをインストールさせるために必要です。");
        }
        console.log("ユーザー名をチェックする権限・コマンドがありません。インストールに失敗しました。");
        process.exit(1);
    }
    console.log("権限・コマンド・書き込みテストでエラーが発生しませんでした。systemdにサービスを登録し、インストールを試みます。");
    if (fs.existsSync("/etc/systemd/system/memorySwapFilemanager.service")) {
        fs.rmSync("/etc/systemd/system/memorySwapFilemanager.service")
    }
    try {
        const npmPath = (await execAsync("which npm")).split("\n")[0];
        const nowUserName = (await execAsync("whoami")).split("\n")[0];
        const text = `[Unit]
Description=Music Library

[Service]
Type=simple
AmbientCapabilities=CAP_SYS_ADMIN
NoNewPrivileges=false
Environment=PATH=/usr/local/bin:/usr/bin:/usr/sbin:/bin
User=${nowUserName}
WorkingDirectory=${cwd}
ExecStart=${npmPath} run start
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target`;
        fs.writeFileSync("/etc/systemd/system/memorySwapFilemanager.service", text);
        await execAsync("systemctl daemon-reload");
        try {
            await execAsync("systemctl start memorySwapFilemanager");
        } catch { }
        await execAsync("systemctl enable memorySwapFilemanager");
        await execAsync("systemctl start memorySwapFilemanager");
        console.log("メモリスワップファイルマネージャーのインストールに成功しました。すでにあなたのデバイスのスワップファイルは管理されています。再起動後も有効です。");
        console.log("アンインストールをするには`npm run uninstall`を実行してください。");
    } catch {
        console.log("サービスファイルのコピー・セット・起動を行おうとしましたが、エラーが発生しました。何らかの理由でセットアップができませんでした。");
        console.log("インストール時に操作したファイルのクリーンアップを試行します。");
        try {
            await execAsync("rm -r /etc/systemd/system/memorySwapFilemanager.service");
            if (false) await execAsync("rm -rf /swapFolder");
        } catch (e) {
            console.log("クリーンアップに失敗しました。削除権限がなかったか、操作中のファイルである可能性があります。");
        }
        console.log("インストールに失敗しました。");
    }
})()

/*
AmbientCapabilities=CAP_SYS_ADMIN
CapabilityBoundingSet=CAP_SYS_ADMIN
NoNewPrivileges=false
*/

