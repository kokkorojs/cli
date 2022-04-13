#!/usr/bin/env node

import { join } from 'path';
import { cwd } from 'process';
import { resolve } from 'path';
import { program } from 'commander';

import init from './init';
import start from './start';
import create from './create';

export const work_path = cwd();
export const plugins_path = join(work_path, `/plugins`);
export const config_path = resolve(work_path, 'kokkoro.yml');

export const colors = {
  red: colorful(31), green: colorful(32), yellow: colorful(33),
  blue: colorful(34), magenta: colorful(35), cyan: colorful(36), white: colorful(37),
};
export const TIP_INFO = colors.cyan('Info:');
export const TIP_ERROR = colors.red('Error:');
export const TIP_WARN = colors.yellow('Warn:');
export const TIP_SUCCESS = colors.green('Success:');

init(program);
start(program);
create(program);

const version = require('../package.json').version;
program
  .name('kokkoro')
  .version(version, '-v, --version')
  .parse()

/**
 * 控制台彩色打印
 * 
 * @param {number} code - ANSI escape code
 * @returns {Function} 
 */
function colorful(code: number): Function {
  return (msg: string) => `\u001b[${code}m${msg}\u001b[0m`
}
