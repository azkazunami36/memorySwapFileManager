import { execAsync } from "./execAsync.js";

/**
 * ディスク使用量情報を取得します。
 * @returns ディスク使用量情報を含むオブジェクトの配列、またはエラーが発生した場合は undefined を返します。
 */
export async function getDiskUsageInfo(): Promise<{
    /**
     * ファイルシステムのデバイス名
     */
    filesystem: string;
    /**
     * ファイルシステムの種類
     */
    type: string;
    /**
     * ファイルシステムのサイズ (単位: バイト)
     */
    size: number;
    /**
     * 使用中の容量 (単位: バイト)
     */
    used: number;
    /**
     * 使用可能な容量 (単位: バイト)
     */
    avail: number;
    /**
     * 使用率 (単位: %)
     */
    use: number;
    /**
     * マウントポイント
     */
    mounted_on: string;
}[] | undefined> {
    try {
        const stdout = await execAsync("df -B1 --output=source,fstype,size,used,avail,pcent,target");
        const lines = stdout.split("\n").slice(1); // ヘッダー行をスキップ
        const diskUsageInfo = lines.map(line => {
            if (!line) return {
                filesystem: "",
                type: "",
                size: 0,
                used: 0,
                avail: 0,
                use: 0,
                mounted_on: "",
            };
            const [filesystem, type, size, used, avail, use, mounted_on] = line.trim().split(/\s+/);
            return {
                filesystem,
                type,
                size: parseInt(size),
                used: parseInt(used),
                avail: parseInt(avail),
                use: parseInt(use.replace('%', '')),
                mounted_on,
            };
        }).filter(entry => entry.filesystem); // 空行を除外
        return diskUsageInfo;
    } catch {
        return undefined;
    }
}
