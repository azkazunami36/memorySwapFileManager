import { execAsync } from "./execAsync.js";

/**
 * ディスクの読み書きに関する使用率を取得します。
 * @returns ディスクの読み書きに関する使用率を含むオブジェクト、またはエラーが発生した場合は undefined を返します。
 */
export async function getDiskIOUsageInfo(): Promise<{
    /** デバイス名 */
    device: string;
    /** 秒あたりの読み取り回数 */
    r_s: number;
    /** 秒あたりの読み取りキロバイト数 */
    rkB_s: number;
    /** 秒あたりの読み取り要求のマージ数 */
    rrqm_s: number;
    /** 読み取り要求のマージ率 */
    percent_rrqm: number;
    /** 読み取り要求の平均待ち時間 (ミリ秒) */
    r_await: number;
    /** 読み取り要求の平均サイズ (キロバイト) */
    rareq_sz: number;
    /** 秒あたりの書き込み回数 */
    w_s: number;
    /** 秒あたりの書き込みキロバイト数 */
    wkB_s: number;
    /** 秒あたりの書き込み要求のマージ数 */
    wrqm_s: number;
    /** 書き込み要求のマージ率 */
    percent_wrqm: number;
    /** 書き込み要求の平均待ち時間 (ミリ秒) */
    w_await: number;
    /** 書き込み要求の平均サイズ (キロバイト) */
    wareq_sz: number;
    /** 秒あたりのディスクI/O回数 */
    d_s: number;
    /** 秒あたりのディスクI/Oキロバイト数 */
    dkB_s: number;
    /** 秒あたりのディスクI/O要求のマージ数 */
    drqm_s: number;
    /** ディスクI/O要求のマージ率 */
    percent_drmq: number;
    /** ディスクI/O要求の平均待ち時間 (ミリ秒) */
    d_await: number;
    /** ディスクI/O要求の平均サイズ (キロバイト) */
    dareq_sz: number;
    /** 秒あたりのフラッシュ回数 */
    f_s: number;
    /** フラッシュ要求の平均待ち時間 (ミリ秒) */
    f_await: number;
    /** 平均キューサイズ */
    aqu_sz: number;
    /** ディスク使用率 */
    percent_util: number;
    /** 秒あたりのトランザクション数 */
    tps: number;
    /** 秒あたりの読み取りキロバイト数 */
    kB_read_s: number;
    /** 秒あたりの書き込みキロバイト数 */
    kB_wrtn_s: number;
    /** 秒あたりの破棄キロバイト数 */
    kB_dscd_s: number;
    /** 読み取りキロバイト数 */
    kB_read: number;
    /** 書き込みキロバイト数 */
    kB_wrtn: number;
    /** 破棄キロバイト数 */
    kB_dscd: number;
}[] | undefined> {
    try {
        const outputDx = await execAsync("iostat -dx");
        const outputDk = await execAsync("iostat -d -k");
        
        const linesDx = outputDx.split("\n").slice(3); // ヘッダー行をスキップ
        const linesDk = outputDk.split("\n").slice(3); // ヘッダー行をスキップ

        const diskIOUsageInfoDx = linesDx.map(line => {
            if (!line) return null;
            const [
                device, r_s, rkB_s, rrqm_s, percent_rrqm, r_await, rareq_sz,
                w_s, wkB_s, wrqm_s, percent_wrqm, w_await, wareq_sz,
                d_s, dkB_s, drqm_s, percent_drmq, d_await, dareq_sz,
                f_s, f_await, aqu_sz, percent_util
            ] = line.trim().split(/\s+/);
            return {
                device,
                r_s: parseFloat(r_s),
                rkB_s: parseFloat(rkB_s),
                rrqm_s: parseFloat(rrqm_s),
                percent_rrqm: parseFloat(percent_rrqm),
                r_await: parseFloat(r_await),
                rareq_sz: parseFloat(rareq_sz),
                w_s: parseFloat(w_s),
                wkB_s: parseFloat(wkB_s),
                wrqm_s: parseFloat(wrqm_s),
                percent_wrqm: parseFloat(percent_wrqm),
                w_await: parseFloat(w_await),
                wareq_sz: parseFloat(wareq_sz),
                d_s: parseFloat(d_s),
                dkB_s: parseFloat(dkB_s),
                drqm_s: parseFloat(drqm_s),
                percent_drmq: parseFloat(percent_drmq),
                d_await: parseFloat(d_await),
                dareq_sz: parseFloat(dareq_sz),
                f_s: parseFloat(f_s),
                f_await: parseFloat(f_await),
                aqu_sz: parseFloat(aqu_sz),
                percent_util: parseFloat(percent_util),
            };
        }).filter(entry => entry !== null);

        const diskIOUsageInfoDk = linesDk.map(line => {
            if (!line) return null;
            const [
                device, tps, kB_read_s, kB_wrtn_s, kB_dscd_s, kB_read, kB_wrtn, kB_dscd
            ] = line.trim().split(/\s+/);
            return {
                device,
                tps: parseFloat(tps),
                kB_read_s: parseFloat(kB_read_s),
                kB_wrtn_s: parseFloat(kB_wrtn_s),
                kB_dscd_s: parseFloat(kB_dscd_s),
                kB_read: parseFloat(kB_read),
                kB_wrtn: parseFloat(kB_wrtn),
                kB_dscd: parseFloat(kB_dscd),
            };
        }).filter(entry => entry !== null);

        const diskIOUsageInfo = diskIOUsageInfoDx.map(dx => {
            const dk = diskIOUsageInfoDk.find(d => d.device === dx.device);
            return dk ? { ...dx, ...dk } : null;
        }).filter(entry => entry !== null);

        return diskIOUsageInfo;
    } catch {
        return undefined;
    }
}
