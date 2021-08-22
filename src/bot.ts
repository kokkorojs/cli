import { join } from 'path'
import crypto from 'crypto'
import { writeFile, readFile } from 'fs/promises'
import { Client, ConfBot, createClient, PrivateMessageEventData } from 'oicq'

import { cwd } from './util'
import { getConfig } from './config'

// 写入 ConfBot
function writeConfBot(bot: Client) {
  return writeFile(join(bot.dir, 'confbot'), JSON.stringify(bot.config, null, 2));
}

// 读取 ConfBot
async function genConfBot(uin: number) {
  const file = join(cwd, '/data', String(uin), 'confbot');

  try {
    const raw = await readFile(file, { encoding: 'utf-8' });

    return Object.assign(JSON.parse(raw), { data_dir: join(cwd, '/data') }) as ConfBot
  } catch {
    return {
      platform: 5,
      log_level: 'info',
      data_dir: join(cwd, '/data/bots')
    } as ConfBot
  }
}

// 登录 bot
async function linkStart() {
  const all_bot: Client[] = [];
  const bots = getConfig().bots;

  for (const key in bots) {
    // 是否自动登录
    const autologin = bots[key].autologin;

    if (!autologin) break

    const uin = Number(key);
    const bot = createClient(uin, await genConfBot(uin));

    bot.logger.mark(`正在登录账号: ${uin}`);

    bot.on('system.login.slider', function () {
      bot.logger.mark(`取 ticket 教程：https://github.com/takayama-lily/oicq/wiki/01.滑动验证码和设备锁`);

      process.stdout.write('ticket: ');
      process.stdin.once('data', this.sliderLogin.bind(this));
    })

    bot.on('system.login.device', function () {
      bot.logger.mark(`验证完成后敲击 Enter 继续...`);

      process.stdin.once('data', () => this.login());
    })

    bot.on('system.login.error', function (data) {
      if (data.message.includes('密码错误')) {
        inputPassword();
      } else {
        bot.logger.error(`当前账号无法登录，按 Enter 键退出程序...`);
        this.terminate();
        process.stdin.once('data', process.exit);
      }
    });

    function inputPassword() {
      bot.logger.mark(`首次登录请输入密码：`);

      process.stdin.once('data', async (data) => {
        const input = String(data).trim();

        if (!input.length) return inputPassword();

        const password = crypto.createHash('md5').update(input).digest();

        await writeFile(join(bot.dir, 'password'), password, { mode: 0o600 });
        bot.login(password);
      })
    }

    try {
      bot.login(await readFile(join(bot.dir, 'password')));
    } catch {
      inputPassword();
    }

    all_bot.push(bot);
  }

  return all_bot
}

// 创建 bot
async function createBot(uin: number, delegate: PrivateMessageEventData, eins: Client) {
  let bot: Client;

  try {
    bot = createClient(uin, await genConfBot(uin));
  } catch (e) {
    delegate.reply(`Error：账号输入错误`);
    return
  }

  // 滑动验证码事件
  bot.on('system.login.slider', function (data) {
    delegate.reply(`>登录流程：收到滑动验证码，请前往 ${data.url} 完成滑动并取出ticket输入。\n>取消登录输入：'cancel'
>取ticket教程：https://github.com/takayama-lily/oicq/wiki/01.滑动验证码和设备锁`);
    eins.on('message.private', function slider(data) {
      if (data.user_id === delegate.user_id) {
        this.off('message.private', slider);

        if (data.raw_message === 'cancel') {
          delegate.reply(`>登录流程：已取消`);
          bot.terminate();
        } else {
          bot.sliderLogin(data.raw_message);
        }
      }
    })
  });

  // 设备锁事件
  bot.on('system.login.device', function (data) {
    delegate.reply(`>登录流程：需要验证设备锁，请前往 ${data.url} 完成验证后输入'ok'。\n>取消登录输入：'cancel'`)
    eins.on('message.private', function device(data) {
      if (data.user_id === delegate.user_id) {
        this.off('message.private', device);

        if (data.raw_message === 'cancel') {
          delegate.reply(`>登录流程：已取消`);
          bot.terminate();
        } else {
          bot.login();
          delegate.reply(`>登录流程完成，可使用 >bot 命令查看是否登录成功`);
        }
      }
    })
  });

  bot.on('system.login.error', function (data) {
    if (data.message.includes('密码错误')) {
      delegate.reply(`>登录流程：密码错误！`);
      inputPassword();
    } else {
      this.terminate();
      delegate.reply(`>登录流程遇到错误：${data.message}\n>登录已取消`);
    }
  });

  function inputPassword() {
    delegate.reply(`>登录流程：首次登录请输入密码\n>取消登录输入："cancel"`);

    eins.on('message.private', async function login(data) {
      if (data.user_id === delegate.user_id) {
        this.off('message.private', login);

        if (data.raw_message === 'cancel') {
          delegate.reply('>登录流程：已取消');
        } else {
          const password = crypto.createHash('md5').update(data.raw_message).digest();

          await writeFile(join(bot.dir, 'password'), password, { mode: 0o600 });
          bot.login(password);
        }
      }
    })
  }

  try {
    bot.login(await readFile(join(bot.dir, 'password')));
  } catch {
    inputPassword();
  }

  return bot
}

export {
  writeConfBot, linkStart, createBot
}