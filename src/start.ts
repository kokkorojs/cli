import { exit } from 'process';
import { existsSync } from 'fs';
import { Command } from 'commander';
import { spawn } from 'child_process';

import { colors, config_path, TIP_ERROR, TIP_INFO } from '.';

export default function (program: Command) {
  program
    .command('start')
    .description('kokkoro bot startup')
    .action(() => {
      if (!existsSync(config_path)) {
        console.error(`${TIP_ERROR} config file is not exists. If you want to create the file, use ${colors.cyan('kokkoro init')}\n`);
        exit(1);
      }

      const node = spawn('node', ['main.js'], { stdio: 'inherit' });

      node.stdout?.on('data', data => console.log(data.toString()));
      node.stderr?.on('data', data => console.error(data.toString()));
      node.on('close', code => console.log(`${TIP_INFO} child process exited with code ${code}\n`));
    })
}
