import { exec } from "child_process";

export async function execAsync(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                if (stderr) {
                    console.log(stderr);
                } else {
                    resolve(stdout);
                }
            }
        });
    });
}
