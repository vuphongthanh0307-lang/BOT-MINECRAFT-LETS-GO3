const express = require('express');
const mineflayer = require('mineflayer');
const readline = require('readline');

const RECONNECT_DELAY = 240000;

const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot đang Farm VIP Pro!'));
app.listen(port, () => console.log(`[Web] Server đang chạy trên port ${port}`));

process.on('uncaughtException', (err) => console.log('[Khiên Bất Tử] Chặn lỗi:', err.message));
process.on('unhandledRejection', (err) => console.log('[Khiên Bất Tử] Lỗi Promise:', err.message));

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const randomSleep = (min, max) => sleep(Math.floor(Math.random() * (max - min + 1) + min));

// 3 TRẠNG THÁI RÕ RÀNG
let botState = 'FIRST_LOGIN'; 
let currentBot; 
let isLoggingIn = false; 
let isComboRunning = false; 
let isGUIOpen = false; 

function createBot() {
    const bot = mineflayer.createBot({
        host: 'aemine.vn',
        port: 25565,
        username: 'winlxag5554', 
        version: '1.12.2',
        viewDistance: 'tiny', 
        checkTimeoutInterval: 90000,
        respawn: false 
    });

    currentBot = bot; 

    // ==========================================
    // MẮT THẦN ĐỌC LOG: ĐÃ GẮN LẠI "MỒM" CHO BOT
    // ==========================================
    bot.on('message', (jsonMsg) => {
        // In ra log màu mè y hệt game
        if (jsonMsg.toAnsi) console.log(jsonMsg.toAnsi());
        else console.log(jsonMsg.toString());
    });

    bot.on('spawn', async () => {
        if (!isLoggingIn) { 
            isLoggingIn = true;
            console.log('[Hub] Đã kết nối, đang đăng nhập...');
            await sleep(2000);
            bot.chat('/l Windvu2193'); 
        }
    });

    // Xử lý sự kiện Server Kick/Bảo trì
    bot.on('messagestr', (message) => {
        const lowerMsg = message.toLowerCase();
        if (lowerMsg.includes('kicked from') || lowerMsg.includes('bảo trì') || lowerMsg.includes('đã đóng')) {
            console.log('[Hệ Thống] Phát hiện Bảo Trì! Đang nằm chờ...');
            botState = 'MAINTENANCE'; 
            isComboRunning = false;
        }
    });

    // ==========================================
    // MẮT THẦN ĐỌC TÚI ĐỒ (BẢN TỰ RESET KHI VÀO LẠI)
    // ==========================================
    setInterval(() => {
        if (!currentBot || !currentBot.inventory) return;
        const itemCount = currentBot.inventory.items().length;

        // 1. Vô cụm Farm: Đồ nhiều (>= 8 món)
        if (itemCount >= 8) {
            // Nếu trước đó đang ở Hub hoặc vừa reset, cho phép múa lại
            if (botState !== 'FARMING') {
                botState = 'FARMING';
                isComboRunning = false; // MỞ KHÓA MÚA
                console.log('[Mắt Thần] Thấy thanh đồ FULL! Xác nhận đã vào Cụm Farm. Bắt đầu múa!');
                startFarmingProcess(currentBot);
            }
        }
        // 2. Ở Hub: Đồ ít (<= 3 món, có la bàn)
        else if (itemCount > 0 && itemCount <= 3) {
            // Nếu đang ở trạng thái FARMING mà mất đồ -> Reset về HUB
            if (botState === 'FARMING') {
                botState = 'FIRST_LOGIN'; 
                isComboRunning = false;
            }

            if (botState === 'FIRST_LOGIN') {
                if (!isGUIOpen) {
                    console.log('[Hub] Đang ở sảnh! Cầm la bàn đục lỗ...');
                    currentBot.setQuickBarSlot(4);
                    currentBot.activateItem();
                }
            } 
        }
    }, 3000); 

    bot.on('windowOpen', async (window) => {
        if (isGUIOpen) return; 
        isGUIOpen = true; 
        try {
            console.log('[Menu] Đang mở GUI...');
            await sleep(2000);
            await bot.clickWindow(20, 0, 0); 
            await sleep(2000);
            await bot.clickWindow(14, 0, 0); 
            console.log('[Menu] Đã click xong!');
        } catch (err) {
            console.log('Lỗi click GUI:', err.message);
        } finally {
            isGUIOpen = false; 
        }
    });

    bot.on('death', () => {
        bot.clearControlStates();
        if (botState !== 'FARMING') setTimeout(() => bot.respawn(), 2000);
    });

    bot.on('end', () => {
        isLoggingIn = false;
        botState = 'FIRST_LOGIN';
        setTimeout(createBot, RECONNECT_DELAY);
    });
}

// KỊCH BẢN DI CHUYỂN (GIỮ NGUYÊN 100%)
async function startFarmingProcess(bot) {
    if (isComboRunning) return; 
    isComboRunning = true;

    try {
        bot.setQuickBarSlot(0); 
        await randomSleep(100, 110);

        // BAY ĐẾN BÃI
        await sleep(25000);
        bot.chat('/spawn');
        await randomSleep(5000, 6000); 

        // CHẠY + NHẢY 3 PHÁT
        bot.setControlState('forward', true);
        bot.setControlState('sprint', true);
        for(let i=0; i<3; i++) {
            bot.setControlState('jump', true);
            await sleep(400);
            bot.setControlState('jump', false);
            await sleep(1100);
        }
        await sleep(1600);
        bot.clearControlStates(); 
        
        bot.setControlState('sneak', true); await randomSleep(100, 110); 
        bot.swingArm('right'); await randomSleep(100, 110);
        bot.activateItem(); await randomSleep(100, 110);
        bot.activateItem(); await randomSleep(100, 110);
        bot.activateItem(); await randomSleep(100, 110);
        bot.setControlState('sneak', false); 

        await sleep(2000);
        bot.setControlState('forward', true);
        await sleep(500);
        bot.clearControlStates();
        await sleep(2000);
        bot.chat('/home'); 
        await randomSleep(5000, 6000); 
        
        bot.chat('/lay');
        console.log('[Farm] Đã đến bãi, nằm nghỉ!');

    } catch (err) {
        console.log('[Farm] Lỗi:', err.message);
        isComboRunning = false; 
    }
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.on('line', (input) => { if (currentBot) currentBot.chat(input); });

createBot();
