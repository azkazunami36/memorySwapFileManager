import { getDiskUsageInfo } from "./getDiskUsageInfo.js";
import { getMountPointList } from "./getMountPointList.js";
import { getDiskIOUsageInfo } from "./getDiskIOUsageInfo.js";

export interface DiskInfo {
    /** デバイス名 */
    device: string;
    /** 秒あたりの読み取り回数 */
    readPerSecond: number;
    /** 秒あたりの読み取りキロバイト数 */
    readKBytesPerSecond: number;
    /** 秒あたりの読み取り要求のマージ数 */
    readRequestsMergedPerSecond: number;
    /** 読み取り要求のマージ率 */
    percentReadRequestsMerged: number;
    /** 読み取り要求の平均待ち時間 (ミリ秒) */
    readAwait: number;
    /** 読み取り要求の平均サイズ (キロバイト) */
    readAverageSize: number;
    /** 秒あたりの書き込み回数 */
    writePerSecond: number;
    /** 秒あたりの書き込みキロバイト数 */
    writeKBytesPerSecond: number;
    /** 秒あたりの書き込み要求のマージ数 */
    writeRequestsMergedPerSecond: number;
    /** 書き込み要求のマージ率 */
    percentWriteRequestsMerged: number;
    /** 書き込み要求の平均待ち時間 (ミリ秒) */
    writeAwait: number;
    /** 書き込み要求の平均サイズ (キロバイト) */
    writeAverageSize: number;
    /** 秒あたりのディスクI/O回数 */
    ioPerSecond: number;
    /** 秒あたりのディスクI/Oキロバイト数 */
    ioKBytesPerSecond: number;
    /** 秒あたりのディスクI/O要求のマージ数 */
    ioRequestsMergedPerSecond: number;
    /** ディスクI/O要求のマージ率 */
    percentIoRequestsMerged: number;
    /** ディスクI/O要求の平均待ち時間 (ミリ秒) */
    ioAwait: number;
    /** ディスクI/O要求の平均サイズ (キロバイト) */
    ioAverageSize: number;
    /** 秒あたりのフラッシュ回数 */
    flushPerSecond: number;
    /** フラッシュ要求の平均待ち時間 (ミリ秒) */
    flushAwait: number;
    /** 平均キューサイズ */
    averageQueueSize: number;
    /** ディスク使用率 */
    percentUtil: number;
    /** 秒あたりのトランザクション数 */
    transactionsPerSecond: number;
    /** 秒あたりの破棄キロバイト数 */
    discardKBytesPerSecond: number;
    /** 読み取りキロバイト数 */
    totalReadKBytes: number;
    /** 書き込みキロバイト数 */
    totalWriteKBytes: number;
    /** 破棄キロバイト数 */
    totalDiscardKBytes: number;
    /** マウントポイント情報 */
    mountpoints: {
        /** デバイス名 */
        device: string;
        /** マウントポイント */
        mountpoint: string;
        /** ファイルシステムの種類 */
        type: string;
        /** ファイルシステムのオプション */
        options: string;
        /** ファイルシステムのサイズ (単位: バイト) */
        size: number;
        /** 使用中の容量 (単位: バイト) */
        used: number;
        /** 使用可能な容量 (単位: バイト) */
        available: number;
        /** 使用率 (単位: %) */
        percentUsed: number;
    }[];
}

export async function getDiskInfo(showAll: boolean = false): Promise<DiskInfo[]> {
    const mountPointsInfo = await getMountPointList(showAll);
    const diskUsageInfo = await getDiskUsageInfo();
    const diskIOUsageInfo = await getDiskIOUsageInfo();
    if (!mountPointsInfo || !diskUsageInfo || !diskIOUsageInfo) return [];

    const diskInfo: DiskInfo[] = [];

    for (const diskIO of diskIOUsageInfo) {
        const relatedMountPoints = mountPointsInfo.filter(mountPoint => mountPoint.device.startsWith(`/dev/${diskIO.device}`));
        const relatedDiskUsage = relatedMountPoints.map(mountPoint => {
            const disk = diskUsageInfo.find(disk => disk.mounted_on === mountPoint.mountpoint);
            return disk ? {
                device: mountPoint.device,
                mountpoint: mountPoint.mountpoint,
                type: mountPoint.type,
                options: mountPoint.options,
                size: disk.size,
                used: disk.used,
                available: disk.avail,
                percentUsed: disk.use,
            } : null;
        }).filter(entry => entry !== null);
        if (relatedDiskUsage.length > 0) {
            diskInfo.push({
                device: diskIO.device,
                readPerSecond: diskIO.r_s,
                readKBytesPerSecond: diskIO.rkB_s,
                readRequestsMergedPerSecond: diskIO.rrqm_s,
                percentReadRequestsMerged: diskIO.percent_rrqm,
                readAwait: diskIO.r_await,
                readAverageSize: diskIO.rareq_sz,
                writePerSecond: diskIO.w_s,
                writeKBytesPerSecond: diskIO.wkB_s,
                writeRequestsMergedPerSecond: diskIO.wrqm_s,
                percentWriteRequestsMerged: diskIO.percent_wrqm,
                writeAwait: diskIO.w_await,
                writeAverageSize: diskIO.wareq_sz,
                ioPerSecond: diskIO.d_s,
                ioKBytesPerSecond: diskIO.dkB_s,
                ioRequestsMergedPerSecond: diskIO.drqm_s,
                percentIoRequestsMerged: diskIO.percent_drmq,
                ioAwait: diskIO.d_await,
                ioAverageSize: diskIO.dareq_sz,
                flushPerSecond: diskIO.f_s,
                flushAwait: diskIO.f_await,
                averageQueueSize: diskIO.aqu_sz,
                percentUtil: diskIO.percent_util,
                transactionsPerSecond: diskIO.tps,
                discardKBytesPerSecond: diskIO.kB_dscd_s,
                totalReadKBytes: diskIO.kB_read,
                totalWriteKBytes: diskIO.kB_wrtn,
                totalDiscardKBytes: diskIO.kB_dscd,
                mountpoints: relatedDiskUsage
            });
        }
    }
    return diskInfo;
}
