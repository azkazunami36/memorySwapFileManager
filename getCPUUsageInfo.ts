import { execAsync } from "./execAsync.js";

export interface CPUUsageInfo {
    /** 現在時刻 */
    time: string;
    /** システムの稼働時間 */
    uptime: string;
    /** ユーザー数 */
    users: number;
    /** CPU の平均負荷 */
    loadAverage: {
        /** 直近1分の平均負荷 */
        oneMinute: number;
        /** 直近5分の平均負荷 */
        fiveMinutes: number;
        /** 直近15分の平均負荷 */
        fifteenMinutes: number;
    };
    /** タスクの状態 */
    tasks: {
        /** タスクの総数 */
        total: number;
        /** 実行中のタスク数 */
        running: number;
        /** スリープ中のタスク数 */
        sleeping: number;
        /** 停止中のタスク数 */
        stopped: number;
        /** ゾンビタスク数 */
        zombie: number;
    };
    /** CPU 使用率 */
    cpu: {
        /** ユーザー空間でのCPU使用率 */
        us: number;
        /** システム空間でのCPU使用率 */
        sy: number;
        /** ユーザー空間でのニース値のCPU使用率 */
        ni: number;
        /** アイドル状態のCPU使用率 */
        id: number;
        /** I/O待ち状態のCPU使用率 */
        wa: number;
        /** ハードウェア割り込みによるCPU使用率 */
        hi: number;
        /** ソフトウェア割り込みによるCPU使用率 */
        si: number;
        /** 仮想化環境によるCPU使用率 */
        st: number;
    };
}

export async function getCPUUsageInfo(): Promise<CPUUsageInfo | undefined> {
    try {
        const output = await execAsync("top -bn1 | head -n 3");
        const lines = output.split("\n");

        // 1行目の解析
        const timeLine = lines[0].match(/top - (\d+:\d+:\d+) up (.*),\s+(\d+) users,\s+load average: ([\d.]+), ([\d.]+), ([\d.]+)/);
        if (!timeLine) throw new Error("Failed to parse time line");
        const time = timeLine[1];
        const uptime = timeLine[2];
        const users = parseInt(timeLine[3], 10);
        const loadAverage = {
            oneMinute: parseFloat(timeLine[4]),
            fiveMinutes: parseFloat(timeLine[5]),
            fifteenMinutes: parseFloat(timeLine[6])
        };

        // 2行目の解析
        const tasksLine = lines[1].match(/Tasks:\s+(\d+) total,\s+(\d+) running,\s+(\d+) sleeping,\s+(\d+) stopped,\s+(\d+) zombie/);
        if (!tasksLine) throw new Error("Failed to parse tasks line");
        const tasks = {
            total: parseInt(tasksLine[1], 10),
            running: parseInt(tasksLine[2], 10),
            sleeping: parseInt(tasksLine[3], 10),
            stopped: parseInt(tasksLine[4], 10),
            zombie: parseInt(tasksLine[5], 10),
        };

        // 3行目の解析
        const cpuLine = lines[2].match(/%Cpu\(s\):\s+([\d.]+) us,\s+([\d.]+) sy,\s+([\d.]+) ni,\s+([\d.]+) id,\s+([\d.]+) wa,\s+([\d.]+) hi,\s+([\d.]+) si,\s+([\d.]+) st/);
        if (!cpuLine) throw new Error("Failed to parse CPU line");
        const cpu = {
            us: parseFloat(cpuLine[1]),
            sy: parseFloat(cpuLine[2]),
            ni: parseFloat(cpuLine[3]),
            id: parseFloat(cpuLine[4]),
            wa: parseFloat(cpuLine[5]),
            hi: parseFloat(cpuLine[6]),
            si: parseFloat(cpuLine[7]),
            st: parseFloat(cpuLine[8]),
        };

        return { time, uptime, users, loadAverage, tasks, cpu };
    } catch (error) {
        console.error('Error:', error);
        return undefined;
    }
}
