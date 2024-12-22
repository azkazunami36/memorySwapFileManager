import { execAsync } from "./execAsync.js";

/** 
 * スワップファイルのステータスを取得します。
 * @return スワップファイルのステータスを含むオブジェクトの配列、またはエラーが発生した場合は undefined を返します。
 */
export async function swapStatusGet(): Promise<{
    /** スワップファイルの名前(パス) */
    name: string;
    /** スワップファイルのタイプ */
    type: string;
    /** スワップファイルのサイズ (MB) */
    size: number;
    /** 使用中のスワップサイズ (MB) */
    used: number;
    /** スワップファイルの優先度 */
    prio: number;
}[] | undefined> {
    try {
        const output = await execAsync("swapon --show --bytes");
        const lines = output.split("\n").slice(1); // ヘッダー行をスキップ
        const swapStatus = lines.map(line => {
            const [name, type, size, used, prio] = line.trim().split(/\s+/);
            return {
                name,
                type,
                size: parseFloat(String(parseInt(size) / (1024 * 1024))), // MBに変換
                used: parseFloat(String(parseInt(used) / (1024 * 1024))), // MBに変換
                prio: parseInt(prio),
            };
        }).filter(entry => entry.name); // 空行を除外
        return swapStatus.length > 0 ? swapStatus : undefined;
    } catch {
        return undefined;
    }
}
