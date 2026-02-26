import { CPUUsageInfo, getCPUUsageInfo } from "./getCPUUsageInfo.js";
import { DiskInfo, getDiskInfo } from "./getDiskInfo.js";
import { getGPUInfo, GPUInfo } from "./getGPUInfo.js";
import { getNetStatusInfo, NetStatusInfo } from "./getNetStatusInfo.js";
import { MemoryStatus, memoryStatusGet } from "./memoryStatusGet.js";

const cpuUsageHistory: { timestamp: Date; data: CPUUsageInfo | undefined }[] = [];
const diskInfoHistory: { timestamp: Date; data: DiskInfo[] }[] = [];
const gpuInfoHistory: { timestamp: Date; data: GPUInfo }[] = [];
const netStatusHistory: { timestamp: Date; data: NetStatusInfo[] }[] = [];
const memoryStatusHistory: { timestamp: Date; data: MemoryStatus | undefined }[] = [];

function alignColumns(menu: string) {
    // メニューの各行を取得
    const rows = menu.split('\n');
    
    // 左側の最大長を取得
    const leftMaxLength = Math.max(...rows.map(row => getTrueLength(row.split('|')[0].trim())));

    // 各行を整列
    const alignedMenu = rows.map(row => {
        const [left, right] = row.split('|');
        if (!left || !right) return;
        const leftTrimmed = left.trim();
        const rightTrimmed = right.trim();
        
        const spaceToAdd = leftMaxLength - getTrueLength(leftTrimmed);
        const leftAligned = leftTrimmed + ' '.repeat(spaceToAdd);
        
        return `  ${leftAligned}  ${rightTrimmed}`;
    });

    return alignedMenu.join('\n');
}

// 文字列の全角と半角を識別して長さを計算する関数
function getTrueLength(str: string) {
    let length = 0;
    for (let char of str) {
        if (char.match(/[^\x01-\x7E]/)) {
            length += 2; // 全角文字は2文字分の長さとしてカウント
        } else {
            length += 1; // 半角文字は1文字分の長さとしてカウント
        }
    }
    return length;
}


async function collectResourceData() {
    const cpuTimestamp = new Date();
    const cpuUsage = await getCPUUsageInfo();
    cpuUsageHistory.push({ timestamp: cpuTimestamp, data: cpuUsage });

    const diskTimestamp = new Date();
    const diskInfo = await getDiskInfo();
    diskInfoHistory.push({ timestamp: diskTimestamp, data: diskInfo });

    const gpuTimestamp = new Date();
    const gpuInfo = await getGPUInfo();
    gpuInfoHistory.push({ timestamp: gpuTimestamp, data: gpuInfo });

    const netTimestamp = new Date();
    const netStatus = await getNetStatusInfo();
    netStatusHistory.push({ timestamp: netTimestamp, data: netStatus });

    const memoryTimestamp = new Date();
    const memoryStatus = await memoryStatusGet();
    memoryStatusHistory.push({ timestamp: memoryTimestamp, data: memoryStatus });
    const outputText = alignColumns(`
    CPU使用率: | ${(cpuUsage ? 100 - cpuUsage.cpu.id : "取得エラー")} %
    メモリ使用率: | ${memoryStatus ? Math.floor(memoryStatus.Mem.used / 10) / 100 : 0} GB (搭載メモリ量: ${memoryStatus ? Math.floor(memoryStatus.Mem.total / 10) / 100 : 0} GB)
    スワップ使用量: | ${memoryStatus ? Math.floor(memoryStatus.Swap.used / 10) / 100 : 0} GB (スワップ割り当て: ${memoryStatus ? Math.floor(memoryStatus.Swap.total / 10) / 100 : 0} GB)${(() => {
        let output = ""
        diskInfo.forEach((disk) => {
            output += `\nディスク ${disk.device} 使用率: | ${Math.floor(disk.readKBytesPerSecond / 10) / 100} MB/s (読み込み) ${Math.floor(disk.writeKBytesPerSecond / 10) / 100} MB/s (書き込み)`;
            disk.mountpoints.forEach((mountpoint) => {
                output += `\n\\  パーティション ${mountpoint.device} 使用率: | ${Math.floor(mountpoint.used / 10000000) / 100} GB (使用中) ${Math.floor(mountpoint.size / 10000000) / 100} GB (合計)`;
            });
        })
        return output
    })()}
    ${(() => {
        let output = ""
        diskInfo.forEach((disk) => {
        });
    })()}
    ${(() => {
        let output = ""
        gpuInfo.intel.forEach((gpu) => {
            output += `\nGPU Intel ${gpu.model} 使用率: | ${gpu.engines["Render/3D"].busy} %`
        });
    })()}

    `);

    console.clear();
    console.log(outputText);
}

setInterval(collectResourceData, 1000);


