import { NodeSSH } from 'node-ssh';

export async function writeFileOverSSH(
  auth: { host: string; username: string; password: string },
  remotePath: string,
  content: string,
): Promise<void> {
  const ssh = new NodeSSH();
  try {
    await ssh.connect({
      host: auth.host,
      username: auth.username,
      password: auth.password,
      port: 22,
    });

    const sftp = await ssh.requestSFTP();
    await new Promise<void>((resolve, reject) => {
      sftp.writeFile(remotePath, Buffer.from(content, 'utf8'), (err: any) =>
        err ? reject(err) : resolve(),
      );
    });
  } finally {
    ssh.dispose();
  }
}

export async function runSSHCommand(
  auth: { host: string; username: string; password: string },
  cmd: string,
): Promise<string> {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: auth.host,
    username: auth.username,
    password: auth.password,
    port: 22,
  });

  const fullCmd = `printf '%s\\n' '${auth.password}' | ${cmd}`;
  const { stdout, stderr } = await ssh.execCommand(fullCmd);
  if (stderr && stderr.includes('sudo:')) throw new Error(stderr);
  return stdout;
} 