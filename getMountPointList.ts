import { execAsync } from "./execAsync.js";

/**
 * マウントポイントのリストを取得します。
 * @param showAll デバイス名が /dev で始まらないマウントポイントも含める場合は true を指定します。
 * @returns マウントポイントのリストを含むオブジェクトの配列
 */
export async function getMountPointList(showAll: boolean = false): Promise<{ device: string; mountpoint: string; type: string; options: string; }[]> {
    const stdout = await execAsync("mount");
    return stdout.split("\n").map(line => {
        const parts = line.split(" ");
        return {
            device: parts[0],
            mountpoint: parts[2],
            type: parts[4],
            options: parts.slice(5).join(" ")
        };
    }).filter(entry => {
        if (!entry.device || !entry.mountpoint || !entry.type) {
            return false;
        }
        if (!showAll && !entry.device.startsWith("/dev")) {
            return false;
        }
        return true;
    });
}
