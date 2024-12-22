import { execAsync } from "./execAsync.js";

/**
 * メモリとスワップのステータスを取得します。
 * @returns メモリとスワップのステータスを含むオブジェクト、またはエラーが発生した場合は undefined を返します。
 */
export async function memoryStatusGet(): Promise<{
    /** メモリのステータス */
    Mem: {
        /** 総メモリ量 (MB) */
        total: number;
        /** 使用中のメモリ量 (MB) */
        used: number;
        /** 空きメモリ量 (MB) */
        free: number;
        /** 共有メモリ量 (MB) */
        shared: number;
        /** バッファキャッシュメモリ量 (MB) */
        buff_cache: number;
        /** 利用可能なメモリ量 (MB) */
        available: number;
    };
    /** スワップのステータス */
    Swap: {
        /** 総スワップ量 (MB) */
        total: number;
        /** 使用中のスワップ量 (MB) */
        used: number;
        /** 空きスワップ量 (MB) */
        free: number;
    };
} | undefined> {
    try {
        const o = (await execAsync("free")).split("\n").map(l => l.trim().split(/\s+/));
        const t = (v: string) => parseInt(v) / 1000;
        let m: any, s: any;
        o.forEach(l => {
            if (l[0] === "Mem:" && l.length >= 7) {
                const p = { total: t(l[1]), used: t(l[2]), free: t(l[3]), shared: t(l[4]), buff_cache: t(l[5]), available: t(l[6]), };
                if (Object.values(p).some(v => isNaN(v))) return undefined;
                m = p;
            } else if (l[0] === "Swap:" && l.length >= 4) {
                const p = { total: t(l[1]), used: t(l[2]), free: t(l[3]), };
                if (Object.values(p).some(v => isNaN(v))) return undefined;
                s = p;
            }
        });
        return m && s ? { Mem: m, Swap: s } : undefined;
    } catch {
        return undefined;
    }
}
