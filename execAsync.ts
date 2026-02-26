import { exec } from "child_process";

export async function execAsync(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error && stderr && stderr.length > 0) {
                reject(error);
            } else {
                resolve(stdout);
            }
        });
    });
}
