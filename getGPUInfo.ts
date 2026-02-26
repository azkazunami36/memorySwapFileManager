import { execAsync } from "./execAsync.js";

interface IntelGPUData {
    /** 測定期間 */
    period: {
        /** 測定期間の長さ (ミリ秒) */
        duration: number;
    };
    /** 周波数情報 */
    frequency: {
        /** 要求された周波数 (MHz) */
        requested: number;
        /** 実際の周波数 (MHz) */
        actual: number;
    };
    /** 割り込み情報 */
    interrupts: {
        /** 割り込み回数 (irq/s) */
        count: number;
    };
    /** RC6状態 */
    rc6: {
        /** RC6状態の値、アイドル時間？ (%) */
        value: number;
    };
    /** 電力情報 */
    power: {
        /** GPUの消費電力 (W) */
        GPU: number;
        /** パッケージ全体の消費電力 (W) */
        Package: number;
    };
    /** IMC帯域幅 */
    "imc-bandwidth": {
        /** 読み取り帯域幅 (MiB/s) */
        reads: number;
        /** 書き込み帯域幅 (MiB/s) */
        writes: number;
    };
    /** エンジン情報 */
    engines: {
        "Render/3D": {
            /** ビジー率 (%) */
            busy: number;
            /** セマフォ待ち時間 (%) */
            sema: number;
            /** 待機時間 (%) */
            wait: number;
        };
        "Blitter": {
            /** ビジー率 (%) */
            busy: number;
            /** セマフォ待ち時間 (%) */
            sema: number;
            /** 待機時間 (%) */
            wait: number;
        };
        "Video": {
            /** ビジー率 (%) */
            busy: number;
            /** セマフォ待ち時間 (%) */
            sema: number;
            /** 待機時間 (%) */
            wait: number;
        };
        "VideoEnhance": {
            /** ビジー率 (%) */
            busy: number;
            /** セマフォ待ち時間 (%) */
            sema: number;
            /** 待機時間 (%) */
            wait: number;
        };
    };
    /** クライアント情報 */
    clients: {
        [key: string]: {
            /** クライアント名 */
            name: string;
            /** プロセスID */
            pid: string;
            /** エンジンクラス情報 */
            "engine-classes": {
                /** 3Dの使用率 (%) */
                "Render/3D": {
                    /** ビジー率 (%) */
                    busy: string;
                };
                /** ビデオブリッターの使用率 (%) */
                "Blitter": {
                    /** ビジー率 (%) */
                    busy: string;
                };
                /** ビデオの使用率 (%) */
                "Video": {
                    /** ビジー率 (%) */
                    busy: string;
                };
                /** ビデオエンハンスの使用率 (%) */
                "VideoEnhance": {
                    /** ビジー率 (%) */
                    busy: string;
                };
            };
        };
    };
}

export interface GPUInfo {
    intel: { 
        /** カード名 */
        card: string; 
        /** デバイス名 */
        model: string; 
        /** デバイスID */
        deviceId: string; 
        /** 測定期間 */
        period: { duration: number }; 
        /** 周波数情報 */
        frequency: { requested: number; actual: number }; 
        /** 割り込み情報 */
        interrupts: { count: number }; 
        /** RC6状態 */
        rc6: { value: number }; 
        /** 電力情報 */
        power: { GPU: number; Package: number }; 
        /** IMC帯域幅 */
        imcBandwidth: { reads: number; writes: number }; 
        /** エンジン情報 */
        engines: { "Render/3D": { busy: number; sema: number; wait: number }; "Blitter": { busy: number; sema: number; wait: number }; "Video": { busy: number; sema: number; wait: number }; "VideoEnhance": { busy: number; sema: number; wait: number }; }; 
        /** クライアント情報 */
        clients: { [key: string]: { name: string; pid: string; "engine-classes": { "Render/3D": { busy: string }; "Blitter": { busy: string }; "Video": { busy: string }; "VideoEnhance": { busy: string }; }; }; }; 
    }[];
    nvidia: { 
        /** GPUのUUID */
        uuid: string; 
        /** GPUの名前 */
        name: string; 
        /** ドライバーバージョン */
        driverVersion: string; 
        /** 総メモリ量 (MB) */
        memoryTotal: number; 
        /** 使用中のメモリ量 (MB) */
        memoryUsed: number; 
        /** 空きメモリ量 (MB) */
        memoryFree: number; 
        /** GPU使用率 (%) */
        utilizationGpu: number; 
        /** GPU温度 (℃) */
        temperatureGpu: number; 
        /** 消費電力 (W) */
        powerDraw: number; 
    }[];
    amd: { 
        /** GPUのモデル名 */
        model: string; 
        /** 総メモリ量 (MB) */
        memoryTotal: number; 
        /** 使用中のメモリ量 (MB) */
        memoryUsed: number; 
        /** 空きメモリ量 (MB) */
        memoryFree: number; 
        /** GPU使用率 (%) */
        utilizationGpu: number; 
        /** GPU温度 (℃) */
        temperature: number; 
        /** 消費電力 (W) */
        powerDraw: number; 
    }[];
}

/**
 * GPU情報を取得します。現在Intel GPUのみ対応しています。それ以外のGPUは未検証です。
 * @returns NVIDIA、AMD、IntelのGPU情報を含むオブジェクト
 */
export async function getGPUInfo(): Promise<GPUInfo> {
    const intelGPUs: { 
        card: string; 
        model: string; 
        deviceId: string; 
        period: { duration: number }; 
        frequency: { requested: number; actual: number }; 
        interrupts: { count: number }; 
        rc6: { value: number }; 
        power: { GPU: number; Package: number }; 
        imcBandwidth: { reads: number; writes: number }; 
        engines: { "Render/3D": { busy: number; sema: number; wait: number }; "Blitter": { busy: number; sema: number; wait: number }; "Video": { busy: number; sema: number; wait: number }; "VideoEnhance": { busy: number; sema: number; wait: number }; }; 
        clients: { [key: string]: { name: string; pid: string; "engine-classes": { "Render/3D": { busy: string }; "Blitter": { busy: string }; "Video": { busy: string }; "VideoEnhance": { busy: string }; }; }; }; 
    }[] = [];
    const nvidiaGPUs: { 
        uuid: string; 
        name: string; 
        driverVersion: string; 
        memoryTotal: number; 
        memoryUsed: number; 
        memoryFree: number; 
        utilizationGpu: number; 
        temperatureGpu: number; 
        powerDraw: number; 
    }[] = [];
    const amdGPUs: { 
        model: string; 
        memoryTotal: number; 
        memoryUsed: number; 
        memoryFree: number; 
        utilizationGpu: number; 
        temperature: number; 
        powerDraw: number; 
    }[] = [];

    try {
        // Intel GPUデバイス一覧を取得
        const intelDevicesOutput = await execAsync("intel_gpu_top -L");
        const intelDevices = intelDevicesOutput.split("\n").filter(line => line && !line.startsWith("└─")).map(line => {
            const [card, model, deviceId] = line.trim().split(/\s{2,}/);
            return { card, model, deviceId };
        });

        // 各Intel GPUデバイスの情報を取得
        for (const device of intelDevices) {
            let intelOutput = (await execAsync(`timeout 0.5 intel_gpu_top -d ${device.deviceId} -J -s 1000`)).replaceAll("\n", "").replaceAll("\t", "");
            intelOutput = intelOutput.slice(1);

            const intelData: IntelGPUData = JSON.parse(intelOutput);
            if (intelData) intelGPUs.push({
                card: device.card,
                model: device.model,
                deviceId: device.deviceId,
                period: { duration: intelData.period.duration },
                frequency: { requested: intelData.frequency.requested, actual: intelData.frequency.actual },
                interrupts: { count: intelData.interrupts.count },
                rc6: { value: intelData.rc6.value },
                power: { GPU: intelData.power.GPU, Package: intelData.power.Package },
                imcBandwidth: { reads: intelData["imc-bandwidth"].reads, writes: intelData["imc-bandwidth"].writes },
                engines: {
                    "Render/3D": { busy: intelData.engines["Render/3D"].busy, sema: intelData.engines["Render/3D"].sema, wait: intelData.engines["Render/3D"].wait },
                    "Blitter": { busy: intelData.engines.Blitter.busy, sema: intelData.engines.Blitter.sema, wait: intelData.engines.Blitter.wait },
                    "Video": { busy: intelData.engines.Video.busy, sema: intelData.engines.Video.sema, wait: intelData.engines.Video.wait },
                    "VideoEnhance": { busy: intelData.engines.VideoEnhance.busy, sema: intelData.engines.VideoEnhance.sema, wait: intelData.engines.VideoEnhance.wait }
                },
                clients: Object.fromEntries(Object.entries(intelData.clients).map(([key, client]) => [
                    key,
                    {
                        name: client.name,
                        pid: client.pid,
                        "engine-classes": {
                            "Render/3D": { busy: client["engine-classes"]["Render/3D"].busy },
                            "Blitter": { busy: client["engine-classes"].Blitter.busy },
                            "Video": { busy: client["engine-classes"].Video.busy },
                            "VideoEnhance": { busy: client["engine-classes"].VideoEnhance.busy }
                        }
                    }
                ]))
            });
        }
    } catch (error) {
        if ((error as Error).message.endsWith("not found")) console.log(error);
    }

    try {
        // NVIDIA GPU情報を取得
        const nvidiaOutput = await execAsync("nvidia-smi --query-gpu=uuid,name,driver_version,memory.total,memory.used,memory.free,utilization.gpu,temperature.gpu,power.draw --format=csv,noheader,nounits");
        nvidiaOutput.split("\n").forEach(line => {
            if (line) {
                const [uuid, name, driverVersion, memoryTotal, memoryUsed, memoryFree, utilizationGpu, temperatureGpu, powerDraw] = line.split(", ");
                nvidiaGPUs.push({
                    uuid,
                    name,
                    driverVersion,
                    memoryTotal: parseInt(memoryTotal),
                    memoryUsed: parseInt(memoryUsed),
                    memoryFree: parseInt(memoryFree),
                    utilizationGpu: parseInt(utilizationGpu),
                    temperatureGpu: parseInt(temperatureGpu),
                    powerDraw: parseFloat(powerDraw)
                });
            }
        });
    } catch (error) {
    }

    try {
        // AMD GPU情報を取得
        const amdOutput = await execAsync("rocm-smi --json");
        const amdData = JSON.parse(amdOutput);
        amdData.forEach((gpu: any) => {
            amdGPUs.push({
                model: gpu.ProductName,
                memoryTotal: gpu.VRAM.Total,
                memoryUsed: gpu.VRAM.Used,
                memoryFree: gpu.VRAM.Free,
                utilizationGpu: gpu.GPU_Utilization,
                temperature: gpu.Temperature,
                powerDraw: gpu.Power
            });
        });
    } catch (error) {
    }

    return { intel: intelGPUs, nvidia: nvidiaGPUs, amd: amdGPUs };
}
