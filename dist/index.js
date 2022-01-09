#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ora_1 = __importDefault(require("ora"));
const cac_1 = __importDefault(require("cac"));
const util_1 = require("util");
const path_1 = require("path");
const process_1 = require("process");
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const promises_1 = require("fs/promises");
const prompts_1 = __importDefault(require("prompts"));
const { version } = require('../package.json');
const work_path = (0, process_1.cwd)();
const config_path = (0, path_1.resolve)(work_path, 'kkrconfig.json');
const cli = (0, cac_1.default)('kokkoro').help().version(version);
const questions = [
    {
        type: 'number',
        name: 'uin',
        message: 'Your bot QQ number',
        validate: value => /^[1-9][0-9]{4,12}$/.test(value) ? true : `The QQ number is not compliant`
    },
    {
        type: 'list',
        name: 'masters',
        message: 'Your master\'s QQ number'
    },
    {
        type: 'number',
        name: 'port',
        message: 'Kokkoro serve port',
        initial: 2333,
        validate: value => value < 1 || value > 65535 ? `Please enter a number between 1-65535` : true
    },
    {
        type: 'multiselect',
        name: 'plugins',
        message: 'Select the plugins to load',
        choices: [
            { title: 'kokkoro-bilibili', value: 'kokkoro-bilibili', description: '哔哩哔哩 (゜-゜)つロ 干杯~-bilibili', disabled: true },
            { title: 'kokkoro-gobang', value: 'kokkoro-gobang', description: '五子棋小游戏', disabled: true },
            { title: 'kokkoro-guild', value: 'kokkoro-guild', description: '公会插件（我不想打公会战）' },
            { title: 'kokkoro-hitokoto', value: 'kokkoro-hitokoto', description: '每日一言（才不是网抑云）' },
            { title: 'kokkoro-og', value: 'kokkoro-og', description: '发送网页 html 的 og 信息', disabled: true },
            { title: 'kokkoro-setu', value: 'kokkoro-setu', description: 'hso，我都不看这些的' },
            { title: 'kokkoro-sendbox', value: 'kokkoro-sendbox', description: '将收到的消息当做代码在沙盒中执行，并返回结果', disabled: true },
            { title: 'kokkoro-web', value: 'kokkoro-web', description: '为 kokkoro 提供 web 及路由支持' },
        ],
        warn: '- 近期移植中，当前插件暂时不可用',
    }
];
//#region colorful
/**
 * @description 控制台彩色打印
 * @param code - ANSI escape code
 * @returns - function
 */
function colorful(code) {
    return (msg) => `\u001b[${code}m${msg}\u001b[0m`;
}
//#endregion
const colors = {
    red: colorful(31), green: colorful(32), yellow: colorful(33),
    blue: colorful(34), magenta: colorful(35), cyan: colorful(36), white: colorful(37),
};
const info = colors.cyan('Info:');
const error = colors.red('Error:');
const warn = colors.yellow('Warn:');
const success = colors.green('Success:');
(function init(cli) {
    cli
        .command('init', 'initialize kokkoro config file')
        .option('-f, --forced', 'overwrite config file if it exists')
        .action(async (options) => {
        if (!options.forced && (0, fs_1.existsSync)(config_path)) {
            console.warn(`${error} config file already exists. If you want to overwrite the current file, use ${colors.cyan('kokkoro init -f')}`);
            process.exit(1);
        }
        const response = await prompts_1.default.prompt(questions, {
            onCancel: () => {
                console.log(`\n${info} config file generation has been aborted\n`);
                process.exit(1);
            },
        });
        const { uin, masters, port, plugins } = response;
        const kkrconfig = {
            port,
            bots: {
                [uin]: {
                    prefix: '>',
                    auto_login: true,
                    login_mode: 'qrcode',
                    masters: masters.map(Number),
                    config: {
                        platform: 5,
                        log_level: 'info',
                    }
                }
            }
        };
        try {
            await (0, promises_1.writeFile)(`kkrconfig.json`, `${JSON.stringify(kkrconfig, null, 2)}`);
            await (0, promises_1.writeFile)(`index.js`, `const { linkStart } = require('kokkoro-core');\nlinkStart();`);
            !(0, fs_1.existsSync)((0, path_1.join)(work_path, `/plugins`)) && await (0, promises_1.mkdir)((0, path_1.join)(work_path, `/plugins`));
            console.log(`\n${success} created config file ${colors.cyan(`'${config_path}'`)}`);
            const promiseExec = (0, util_1.promisify)(child_process_1.exec);
            const all_plugin = ['kokkoro-core', ...plugins];
            const plugin_length = all_plugin.length;
            for (let i = 0; i < plugin_length; i++) {
                const plugin = all_plugin[i];
                const spinner = (0, ora_1.default)(`Install ${plugin}`).start();
                try {
                    await promiseExec(`npm i ${plugin} --registry=https://registry.npm.taobao.org`);
                    spinner.succeed();
                    i === plugin_length - 1 && console.log(`\n${success} project is initialized successfully`);
                }
                catch (error) {
                    spinner.fail();
                    i === plugin_length - 1 && console.warn(`\n${warn} npm package was not installed successfully`);
                }
            }
        }
        catch (err) {
            console.warn(`\n${error} ${err}`);
            process.exit(0);
        }
    });
})(cli);
(function start(cli) {
    cli
        .command('start', 'kokkoro bot link start')
        .action(() => {
        if (!(0, fs_1.existsSync)(config_path)) {
            console.warn(`${error} config file is not exists. If you want to create the file, use ${colors.cyan('kokkoro init')}\n`);
            process.exit(1);
        }
        const node = (0, child_process_1.spawn)('node', ['index.js'], { stdio: 'inherit' });
        node.stdout?.on('data', data => {
            console.log(data.toString());
        });
        node.stderr?.on('data', data => {
            console.error(data.toString());
        });
        node.on('close', code => {
            console.log(`child process exited with code ${code}`);
        });
    });
})(cli);
cli.parse();
!cli.matchedCommand && cli.outputHelp();
