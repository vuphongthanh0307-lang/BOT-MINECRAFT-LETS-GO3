const express = require('express');
const mineflayer = require('mineflayer');

// TẠO WEB SERVER (CHỐNG SLEEP)
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot của Wind đang Farm VIP Pro!'));
app.listen(port, () => console.log(`[Web] Server đang chạy trên port ${port}`));

// KHIÊN BẤT TỬ
process.on('uncaughtException', (err) => console.log('[Khiên Bất Tử] Chặn lỗi:', err.message));
process.on('unhandledRejection', (err) => console.log('[Khiên Bất Tử] Lỗi Promise:', err.message));

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const randomSleep = (min, max) => sleep(Math.floor(Math.random() * (max - min + 1) + min));

// BIẾN TRẠNG THÁI & NGỦ ĐÔNG
let botState = 'HUB'; 
let clickLoop; 
let antiAfkLoop; 
let isLoggingIn = false; 
let isComboRunning = false; 
let shouldReconnect = true; 
let failCount = 0; 

function createBot() {
    const bot = mineflayer.createBot({
        host: 'aemine.vn',
        port: 25565,
        username: 'winlxag5554', // <--- NHỚ ĐỔI TÊN NICK 
        version: '1.12.2',
        viewDistance: 'tiny', 
        checkTimeoutInterval: 90000 
    });

    bot.on('spawn', async () => {
        if (botState === 'HUB' && !isLoggingIn) {
            isLoggingIn = true;
            console.log('[Hub] Đã vào sảnh, chuẩn bị đăng nhập...');
            await sleep(2000);
            bot.chat('/l Windvu2193'); 
            await sleep(6000); 

            console.log('[Hub] Cầm La bàn lên tay...');
            bot.setQuickBarSlot(4); 
            await sleep(1000);
            
            if (clickLoop) clearInterval(clickLoop);
            clickLoop = setInterval(() => {
                if (botState === 'HUB') {
                    console.log(`[Hub] Đang click La bàn...`);
                    bot.activateItem(); 
                } else {
                    clearInterval(clickLoop);
                }
            }, 2500); 
        }
    });

    bot.on('messagestr', (message) => {
        if (message.includes('/pt join')) {
            const match = message.match(/\/pt join (\S+)/);
            if (match) {
                bot.chat(`/party join ${match[1]}`);
            }
        }

        const isKilledByPlayer = message.includes(bot.username) && 
                                 (message.toLowerCase().includes('slain by') || 
                                  message.toLowerCase().includes('slained by') || 
                                  message.toLowerCase().includes('giết'));
        
        if (isKilledByPlayer) {
            console.log('[RÚT LUI KHẨN CẤP] Bị KS! Tắt bot ngay!');
            shouldReconnect = false; 
            bot.quit(); 
        }

        if (message.includes('không thể ngồi trong không khí')) {
            setTimeout(() => { if (botState === 'FARMING') bot.chat('/sit'); }, 3000);
        }
    });

    // === ĐÂY LÀ NƠI VÁ CÁI LỖI REJECTED TRANSACTION ===
    bot.on('windowOpen', async (window) => {
        // Nếu không phải ở Sảnh thì cấm không cho làm gì hết
        if (botState !== 'HUB') return; 
        
        // Vừa vào sự kiện là ĐỔI TRẠNG THÁI NGAY LẬP TỨC để KHÓA CỬA
        botState = 'CLICKING_MENU'; 
        
        if (clickLoop) clearInterval(clickLoop);

        try {
            await sleep(3000); 
            console.log(`[Menu 1] Nhấp slot 20...`);
            await bot.clickWindow(20, 0, 0); 

            await sleep(2500); 
            console.log(`[Menu 2] Nhấp slot 14...`);
            await bot.clickWindow(14, 0, 0); 
            
            // Xong xuôi hết mới mở khóa sang FARMING
            botState = 'FARMING'; 
            console.log('[Menu] Thành công! Đợi 15s load map...');
            setTimeout(() => startFarmingProcess(bot), 15000); 
        } catch (err) {
            console.log('Lỗi click GUI:', err.message);
            // Bị lỗi thì mở khóa về lại HUB để thử lại
            botState = 'HUB'; 
        }
    });

    bot.on('death', async () => {
        if (!shouldReconnect) return; 
        isComboRunning = false; 
        bot.clearControlStates(); 
        await sleep(5000); 
        startFarmingProcess(bot);
    });

    bot.on('end', () => {
        if (!shouldReconnect) {
            console.log('[SHUTDOWN] Đã rút điện bot vì bị KS!');
            if (antiAfkLoop) clearInterval(antiAfkLoop); 
            if (clickLoop) clearInterval(clickLoop);
            return; 
        }

        botState = 'HUB'; 
        isLoggingIn = false;
        isComboRunning = false;
        if (antiAfkLoop) clearInterval(antiAfkLoop); 
        if (clickLoop) clearInterval(clickLoop);

        failCount++; 
        
        if (failCount >= 5) {
            console.log(`[BÁO ĐỘNG] Rớt mạng ${failCount} lần! Ngủ đông 1 tiếng tránh bị Ban...`);
            failCount = 0; 
            setTimeout(createBot, 3600000); 
            return;
        }

        console.log(`[Mất mạng] Lần rớt thứ ${failCount}. Đợi 2 phút...`);
        setTimeout(createBot, 120000); 
    });

    bot.on('error', err => {});
}

async function startFarmingProcess(bot) {
    if (isComboRunning) return; 
    isComboRunning = true;

    try {
        bot.chat('/party quit'); 
        await randomSleep(1500, 2000);

        bot.chat('/party join 18110998125');
        await randomSleep(2000, 3000); 
        
        bot.setQuickBarSlot(0); 
        await randomSleep(1000, 1500);

        bot.chat('/spawn');
        await randomSleep(6000, 8000); 

        bot.setControlState('sneak', true); 
        await randomSleep(800, 1200); 
        bot.swingArm('right'); 
        await randomSleep(600, 1000);
        bot.activateItem(); 
        await randomSleep(600, 1000);
        bot.activateItem(); 
        await randomSleep(600, 1000);
        bot.activateItem(); 
        await randomSleep(1000, 1500);

        bot.clearControlStates(); 
        await randomSleep(2000, 3000); 

        bot.chat('/home');
        await randomSleep(5000, 7000); 
        bot.chat('/sit');

        failCount = 0; 

        if (antiAfkLoop) clearInterval(antiAfkLoop);
        antiAfkLoop = setInterval(() => {
            if (botState === 'FARMING' && !isComboRunning) {
                bot.swingArm('right'); 
                setTimeout(() => { if (bot.chat) bot.chat('/sit'); }, 1000);
            }
        }, 120000); 
        
    } catch (err) {
        console.log('[Farm] Lỗi:', err.message);
    } finally {
        isComboRunning = false; 
    }
}

createBot();
