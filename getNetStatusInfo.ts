import { execAsync } from './execAsync.js';

/**
 * ifconfigコマンドの出力をJSON形式で取得します。
 * @param filePath ifconfigコマンドの出力が保存されたファイルのパス
 * @returns ネットワークインターフェース情報の配列
 */
export interface NetStatusInfo {
    /** インターフェース名 */
    interface: string;
    /** フラグ */
    flags: string;
    /** MTUサイズ */
    mtu: number;
    /** IPv4アドレス */
    inet?: string;
    /** ネットマスク */
    netmask?: string;
    /** IPv6アドレスの配列 */
    inet6?: string[];
    /** MACアドレス */
    ether?: string;
    /** 送信キューの長さ */
    txqueuelen?: number;
    /** 受信パケット情報 */
    RX?: {
        /** 受信パケット数 */
        packets: number;
        /** 受信バイト数 */
        bytes: string;
        /** 受信エラー数 */
        errors: number;
        /** ドロップされた受信パケット数 */
        dropped: number;
        /** オーバーラン数 */
        overruns: number;
        /** フレームエラー数 */
        frame: number;
    };
    /** 送信パケット情報 */
    TX?: {
        /** 送信パケット数 */
        packets: number;
        /** 送信バイト数 */
        bytes: string;
        /** 送信エラー数 */
        errors: number;
        /** ドロップされた送信パケット数 */
        dropped: number;
        /** オーバーラン数 */
        overruns: number;
        /** キャリアエラー数 */
        carrier: number;
        /** 衝突数 */
        collisions: number;
    };
    /** 受信パケット数 (パケット/秒) */
    rxpck_s?: number;
    /** 送信パケット数 (パケット/秒) */
    txpck_s?: number;
    /** 受信データ量 (kB/秒) */
    rxkB_s?: number;
    /** 送信データ量 (kB/秒) */
    txkB_s?: number;
    /** 受信圧縮パケット数 (パケット/秒) */
    rxcmp_s?: number;
    /** 送信圧縮パケット数 (パケット/秒) */
    txcmp_s?: number;
    /** 受信マルチキャストパケット数 (パケット/秒) */
    rxmcst_s?: number;
    /** インターフェース使用率 (%) */
    ifutil?: number;
}

export async function getNetStatusInfo(): Promise<NetStatusInfo[]> {
    try {
        const output = await execAsync("ifconfig");
        const sarOutput = await execAsync("sar -n DEV 1 1");
        const interfaces = output.split('\n\n').filter(Boolean).map(block => {
            const lines = block.split('\n');
            const iface = lines[0].split(':')[0];
            const flagsMatch = lines[0].match(/flags=\d+<(.+)>/);
            const mtuMatch = lines[0].match(/mtu (\d+)/);
            const flags = flagsMatch ? flagsMatch[1] : '';
            const mtu = mtuMatch ? parseInt(mtuMatch[1]) : 0;
            const inetMatch = lines.find(line => line.includes('inet '))?.match(/inet (\d+\.\d+\.\d+\.\d+)/);
            const netmaskMatch = lines.find(line => line.includes('netmask '))?.match(/netmask (\d+\.\d+\.\d+\.\d+)/);
            const inet = inetMatch ? inetMatch[1] : undefined;
            const netmask = netmaskMatch ? netmaskMatch[1] : undefined;
            const inet6 = lines.filter(line => line.includes('inet6 ')).map(line => {
                const match = line.match(/inet6 ([\da-f:]+)/);
                return match ? match[1] : '';
            }).filter(Boolean);
            const etherMatch = lines.find(line => line.includes('ether '))?.match(/ether ([\da-f:]+)/);
            const txqueuelenMatch = lines.find(line => line.includes('txqueuelen '))?.match(/txqueuelen (\d+)/);
            const ether = etherMatch ? etherMatch[1] : undefined;
            const txqueuelen = txqueuelenMatch ? parseInt(txqueuelenMatch[1]) : undefined;
            const RXLine = lines.find(line => line.includes('RX packets '));
            const TXLine = lines.find(line => line.includes('TX packets '));
            const RX = RXLine ? {
                packets: parseInt(RXLine.match(/RX packets (\d+)/)?.[1] || '0'),
                bytes: RXLine.match(/bytes ([\d.]+ .B)/)?.[1] || '',
                errors: parseInt(RXLine.match(/RX errors (\d+)/)?.[1] || '0'),
                dropped: parseInt(RXLine.match(/dropped (\d+)/)?.[1] || '0'),
                overruns: parseInt(RXLine.match(/overruns (\d+)/)?.[1] || '0'),
                frame: parseInt(RXLine.match(/frame (\d+)/)?.[1] || '0'),
            } : undefined;
            const TX = TXLine ? {
                packets: parseInt(TXLine.match(/TX packets (\d+)/)?.[1] || '0'),
                bytes: TXLine.match(/bytes ([\d.]+ .B)/)?.[1] || '',
                errors: parseInt(TXLine.match(/TX errors (\d+)/)?.[1] || '0'),
                dropped: parseInt(TXLine.match(/dropped (\d+)/)?.[1] || '0'),
                overruns: parseInt(TXLine.match(/overruns (\d+)/)?.[1] || '0'),
                carrier: parseInt(TXLine.match(/carrier (\d+)/)?.[1] || '0'),
                collisions: parseInt(TXLine.match(/collisions (\d+)/)?.[1] || '0'),
            } : undefined;

            return { interface: iface, flags, mtu, inet, netmask, inet6, ether, txqueuelen, RX, TX };
        });

        const sarLines = sarOutput.split('\n').slice(3, -1); // ヘッダー行とフッター行をスキップ
        const sarData: { [key: string]: any } = {};
        sarLines.forEach(line => {
            const [time, iface, rxpck_s, txpck_s, rxkB_s, txkB_s, rxcmp_s, txcmp_s, rxmcst_s, ifutil] = line.trim().split(/\s+/);
            if (!sarData[iface]) {
                sarData[iface] = {
                    rxpck_s: parseFloat(rxpck_s),
                    txpck_s: parseFloat(txpck_s),
                    rxkB_s: parseFloat(rxkB_s),
                    txkB_s: parseFloat(txkB_s),
                    rxcmp_s: parseFloat(rxcmp_s),
                    txcmp_s: parseFloat(txcmp_s),
                    rxmcst_s: parseFloat(rxmcst_s),
                    ifutil: parseFloat(ifutil)
                };
            }
        });

        interfaces.forEach(iface => {
            if (sarData[iface.interface]) {
                Object.assign(iface, sarData[iface.interface]);
            }
        });

        return interfaces;
    } catch (error) {
        console.error('Error:', error);
        return [];
    }
}
